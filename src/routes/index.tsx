import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, PhoneCall, PhoneOff, Sparkle, ShieldCheck, Zap, LayoutDashboard, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { OrderCard } from "@/components/voice/OrderCard";
import { OrderDetail } from "@/components/voice/OrderDetail";
import { Transcript, type Turn } from "@/components/voice/Transcript";
import { ProductCatalogDrawer } from "@/components/voice/ProductCatalogDrawer";
import { OTPVerificationModal, type PendingVerification } from "@/components/voice/OTPVerificationModal";
import { SentimentHeader, type Sentiment } from "@/components/voice/SentimentHeader";
import { HandoffDashboard } from "@/components/voice/HandoffDashboard";
import { useSpeech, type VoiceMode } from "@/hooks/useSpeech";
import { runAgentTurn } from "@/lib/agent.functions";
import {
  SEED_ORDERS,
  addItemToOrder,
  cancelOrder,
  processReturn,
  rescheduleDelivery,
  updateShippingAddress,
  REFUND_OTP_THRESHOLD,
  type Order,
} from "@/lib/orders.data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vera · Voice Agent for Retail Order Support" },
      {
        name: "description",
        content:
          "An autonomous voice AI agent that tracks orders, edits carts, cancels orders, starts returns and hands off to humans — no IVR menus.",
      },
      { property: "og:title", content: "Vera · Voice Agent for Retail Order Support" },
      {
        property: "og:description",
        content:
          "Speak naturally and let an agentic AI resolve order tracking, modifications, cancellations and returns autonomously.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Console,
});

const SUGGESTIONS = [
  "Where is my headphones order?",
  "Add a carry case to my sneakers order",
  "Cancel the sneakers order, I changed my mind",
  "Change the delivery address for my shirts order",
  "This is the third time, get me a human",
];

type AgentAction = {
  type: string;
  orderId: string;
  note: string;
  productId?: string;
  qty?: number;
  address?: string;
  highRisk?: boolean;
};

const ACTION_LABEL: Record<string, string> = {
  cancel: "Order cancelled",
  return: "Return created",
  reschedule: "Delivery rescheduled",
  add_item: "Item added to order",
  address: "Shipping address updated",
  escalate: "Escalated to a human agent",
};

function Console() {
  const callAgent = useServerFn(runAgentTurn);
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [selected, setSelected] = useState(SEED_ORDERS[0]!.id);
  const [turns, setTurns] = useState<Turn[]>([
    { kind: "agent", text: "Hi, this is Vera from support. What can I help you with today?" },
  ]);
  const [thinking, setThinking] = useState(false);
  const [live, setLive] = useState(true);
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<VoiceMode>("webrtc");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [takenOver, setTakenOver] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");
  const [toolFailures, setToolFailures] = useState(0);
  const [transferring, setTransferring] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [verification, setVerification] = useState<PendingVerification | null>(null);
  const queue = useRef<PendingVerification[]>([]);

  useEffect(() => {
    const id = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const history = useMemo(
    () =>
      turns
        .filter((t): t is Extract<Turn, { kind: "user" | "agent" }> => t.kind === "user" || t.kind === "agent")
        .map((t) => ({ role: t.kind === "user" ? ("user" as const) : ("assistant" as const), content: t.text })),
    [turns],
  );

  const escalate = useCallback((reason: string) => {
    setTransferring(true);
    setHandoffOpen(true);
    setTurns((p) => [...p, { kind: "system", text: `Transferring to Human Support… ${reason}` }]);
    toast.warning("Transferring to Human Support…", { description: reason });
  }, []);

  const runAction = useCallback((a: AgentAction) => {
    setOrders((prev) => {
      let res;
      if (a.type === "cancel") res = cancelOrder(a.orderId, prev, a.note);
      else if (a.type === "return") res = processReturn(a.orderId, a.note, prev);
      else if (a.type === "reschedule") res = rescheduleDelivery(a.orderId, a.note, prev);
      else if (a.type === "add_item") res = addItemToOrder(a.orderId, a.productId ?? "", a.qty ?? 1, prev);
      else if (a.type === "address") res = updateShippingAddress(a.orderId, a.address ?? a.note, prev);
      else return prev;

      if (res.ok) toast.success(ACTION_LABEL[a.type] ?? "Action executed", { description: res.message });
      else toast.error("Action blocked", { description: res.message });
      return res.orders;
    });
    if (a.orderId) setSelected(a.orderId);
  }, []);

  const nextVerification = useCallback(() => {
    const next = queue.current.shift() ?? null;
    setVerification(next);
  }, []);

  const enqueueVerification = useCallback(
    (v: PendingVerification) => {
      setVerification((curr) => {
        if (curr) {
          queue.current.push(v);
          return curr;
        }
        return v;
      });
    },
    [],
  );

  const applyActions = useCallback(
    (actions: AgentAction[]) => {
      for (const a of actions) {
        if (a.type === "escalate") {
          escalate(a.note || "Customer requested a human agent.");
          continue;
        }
        const order = orders.find((o) => o.id === a.orderId);
        const highRisk =
          a.highRisk ||
          a.type === "cancel" ||
          a.type === "return" ||
          a.type === "address" ||
          (order ? order.amount >= REFUND_OTP_THRESHOLD && (a.type === "cancel" || a.type === "return") : false);

        if (highRisk) {
          enqueueVerification({
            title: ACTION_LABEL[a.type] ?? "This action",
            detail: `${a.orderId} · ${a.note}`,
            code: "428193",
            channel: a.type === "address" ? "email" : "sms",
            onVerified: () => runAction(a),
          });
          setTurns((p) => [
            ...p,
            { kind: "tool", label: "Identity verification", detail: `OTP sent for ${a.orderId}` },
          ]);
        } else {
          runAction(a);
        }
      }
    },
    [orders, escalate, enqueueVerification, runAction],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || thinking) return;
      setTurns((p) => [...p, { kind: "user", text }]);
      setThinking(true);
      try {
        const res = await callAgent({
          data: { messages: [...history, { role: "user" as const, content: text }], orders },
        });
        setTurns((p) => [
          ...p,
          ...res.trace.map((t) => ({ kind: "tool" as const, label: t.label, detail: t.detail, failed: !!t.failed })),
          { kind: "agent" as const, text: res.text },
        ]);

        const failures = res.trace.filter((t) => t.failed).length;
        if (failures) {
          setToolFailures((prev) => {
            const total = prev + failures;
            if (total >= 2 && !transferring) escalate("Two tool calls failed in a row.");
            return total;
          });
        }

        const s = (res.sentiment ?? "neutral") as Sentiment;
        setSentiment(s);
        if (s === "frustrated" && !transferring) escalate("Customer sentiment dropped to frustrated.");

        applyActions(res.actions as AgentAction[]);
        if (live && !takenOver) speak(res.text);
      } catch (e) {
        setToolFailures((prev) => {
          const total = prev + 1;
          if (total >= 2 && !transferring) escalate("The agent failed to complete two requests.");
          return total;
        });
        toast.error("The agent could not complete that", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
        setTurns((p) => [...p, { kind: "agent", text: "Sorry, I hit a problem on my end. Could you try again?" }]);
      } finally {
        setThinking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, orders, thinking, live, takenOver, transferring, applyActions, escalate],
  );

  const { supported, listening, interim, speaking, bargeIn, level, start, stop, speak, shutUp } = useSpeech(send, mode);

  const current = (orders.find((o) => o.id === selected) ?? orders[0])!;
  const stats = useMemo(
    () => [
      { label: "Calls handled", value: "1,248", icon: PhoneCall },
      { label: "Auto-resolved", value: "92%", icon: Zap },
      { label: "Avg handle time", value: "48s", icon: Activity },
      { label: "Escalations", value: "8%", icon: ShieldCheck },
    ],
    [],
  );

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      <OTPVerificationModal request={verification} onClose={nextVerification} />
      <ProductCatalogDrawer
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        order={current}
        onRequestAdd={(name, qty) => send(`Please add ${qty} ${name} to order ${current.id}.`)}
      />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/50 bg-primary/10">
              <Sparkle className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold tracking-tight">VERA · Agentic Voice Desk</p>
              <p className="text-[11px] text-muted-foreground">Retail order tracking & support automation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setLive((v) => !v);
                shutUp();
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                live ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {live ? <PhoneCall className="h-3.5 w-3.5" /> : <PhoneOff className="h-3.5 w-3.5" />}
              Voice reply {live ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={() => setHandoffOpen((v) => !v)}
              aria-pressed={handoffOpen}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                handoffOpen ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted-foreground",
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Supervisor
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-6">
        <SentimentHeader
          sentiment={sentiment}
          callSeconds={callSeconds}
          toolFailures={toolFailures}
          turns={history.length}
          transferring={transferring}
        />

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="panel relative overflow-hidden p-8">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              <span className="text-gradient">Talk once.</span>
              <br />
              The agent does the rest.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              No menus, no hold music. Vera understands intent, pulls live order data, edits carts, and executes
              cancellations, address changes and returns autonomously — with OTP verification on anything risky.
            </p>

            <div className="mt-8 flex justify-center">
              <VoiceOrb
                listening={listening}
                thinking={thinking}
                speaking={speaking}
                bargeIn={bargeIn}
                level={level}
                mode={mode}
                onModeChange={setMode}
                disabled={!supported || thinking}
                onToggle={() => (listening ? stop() : start())}
              />
            </div>

            {!supported && (
              <p className="mt-4 text-center text-xs text-warning">
                Speech capture is unavailable in this browser — use the text line below, replies still speak aloud.
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="panel-inset p-3">
                  <s.icon className="h-4 w-4 text-accent" />
                  <p className="mt-2 font-display text-lg">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel flex h-[620px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
              <p className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">Live transcript</p>
              <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-success" /> PII masked · {turns.length} events
              </span>
            </div>

            <div className="min-h-0 flex-1">
              <Transcript turns={turns} interim={interim} thinking={thinking} />
            </div>

            <div className="border-t border-border/70 p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={thinking}
                    className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = typed;
                  setTyped("");
                  send(v);
                }}
                className="flex gap-2"
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Or type what you'd say…"
                  className="flex-1 rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={thinking || !typed.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>

        <HandoffDashboard
          open={handoffOpen}
          onClose={() => setHandoffOpen(false)}
          turns={turns}
          orders={orders}
          sentiment={sentiment}
          takenOver={takenOver}
          onTakeOver={() => {
            setTakenOver(true);
            shutUp();
          }}
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-3">
            <h2 className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">Account orders</h2>
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} active={o.id === current.id} onSelect={() => setSelected(o.id)} />
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">Order workspace</h2>
            <OrderDetail
              order={current}
              onCancel={() => send(`Please cancel order ${current.id}. Yes, I confirm.`)}
              onReturn={() => send(`I want to return order ${current.id}. Yes, please go ahead.`)}
              onAddItems={() => setCatalogOpen(true)}
              onChangeAddress={() =>
                send(
                  `Please change the shipping address for order ${current.id} to 42 Church Street, Ashok Nagar, Bengaluru 560001. Yes, I confirm.`,
                )
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
