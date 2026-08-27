import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, PhoneCall, PhoneOff, Sparkle, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { OrderCard } from "@/components/voice/OrderCard";
import { OrderDetail } from "@/components/voice/OrderDetail";
import { Transcript, type Turn } from "@/components/voice/Transcript";
import { useSpeech } from "@/hooks/useSpeech";
import { runAgentTurn } from "@/lib/agent.functions";
import { SEED_ORDERS, type Order } from "@/lib/orders.data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vera · Voice Agent for Retail Order Support" },
      {
        name: "description",
        content:
          "An autonomous voice AI agent that tracks orders, gives delivery updates, cancels orders and starts returns end-to-end — no IVR menus.",
      },
      { property: "og:title", content: "Vera · Voice Agent for Retail Order Support" },
      {
        property: "og:description",
        content:
          "Speak naturally and let an agentic AI resolve order tracking, cancellations and returns autonomously.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Console,
});

const SUGGESTIONS = [
  "Where is my headphones order?",
  "Cancel the sneakers order, I changed my mind",
  "I want to return the skillet, it arrived chipped",
  "Can you deliver the shirts on Saturday instead?",
];

function Console() {
  const callAgent = useServerFn(runAgentTurn);
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [selected, setSelected] = useState(SEED_ORDERS[0]!.id);
  const [turns, setTurns] = useState<Turn[]>([
    { kind: "agent", text: "Hi Ananya, this is Vera from support. What can I help you with today?" },
  ]);
  const [thinking, setThinking] = useState(false);
  const [live, setLive] = useState(true);
  const [typed, setTyped] = useState("");

  const history = useMemo(
    () =>
      turns
        .filter((t): t is Extract<Turn, { kind: "user" | "agent" }> => t.kind !== "tool")
        .map((t) => ({ role: t.kind === "user" ? ("user" as const) : ("assistant" as const), content: t.text })),
    [turns],
  );

  const applyActions = useCallback((actions: { type: string; orderId: string; note: string }[]) => {
    if (!actions.length) return;
    setOrders((prev) =>
      prev.map((o) => {
        const a = actions.find((x) => x.orderId === o.id);
        if (!a) return o;
        if (a.type === "cancel")
          return {
            ...o,
            status: "cancelled",
            eta: "Refund in 3-5 business days",
            timeline: [...o.timeline.filter((e) => e.done), { label: "Cancelled by voice agent", at: "Just now", done: true }],
          };
        if (a.type === "return")
          return {
            ...o,
            status: "return_requested",
            eta: "Pickup tomorrow, 10 AM - 6 PM",
            timeline: [...o.timeline, { label: "Return requested · " + a.note, at: "Just now", done: true }],
          };
        if (a.type === "reschedule") return { ...o, eta: a.note };
        return o;
      }),
    );
    for (const a of actions) {
      const map: Record<string, string> = {
        cancel: "Order cancelled",
        return: "Return created",
        reschedule: "Delivery rescheduled",
        escalate: "Escalated to a human agent",
      };
      toast.success(map[a.type] ?? "Action executed", { description: `${a.orderId} · ${a.note}` });
      if (a.orderId) setSelected(a.orderId);
    }
  }, []);

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
          ...res.trace.map((t) => ({ kind: "tool" as const, label: t.label, detail: t.detail })),
          { kind: "agent" as const, text: res.text },
        ]);
        applyActions(res.actions);
        if (live) speak(res.text);
      } catch (e) {
        toast.error("The agent could not complete that", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
        setTurns((p) => [...p, { kind: "agent", text: "Sorry, I hit a problem on my end. Could you try again?" }]);
      } finally {
        setThinking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, orders, thinking, live, applyActions],
  );

  const { supported, listening, interim, speaking, level, start, stop, speak, shutUp } = useSpeech(send);

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
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-[11px] text-success sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Agent online
            </span>
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="panel relative overflow-hidden p-8">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              <span className="text-gradient">Talk once.</span>
              <br />
              The agent does the rest.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              No menus, no hold music. Vera understands intent, pulls live order data, and executes cancellations,
              returns and reschedules autonomously — then confirms out loud.
            </p>

            <div className="mt-8 flex justify-center">
              <VoiceOrb
                listening={listening}
                thinking={thinking}
                speaking={speaking}
                level={level}
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

          <div className="panel flex h-[560px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
              <p className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">Live transcript</p>
              <span className="font-mono text-[11px] text-muted-foreground">{turns.length} events</span>
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
            />
          </div>
        </section>
      </main>
    </div>
  );
}
