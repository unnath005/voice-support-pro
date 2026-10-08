import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Headset,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Sparkle,
  User,
  Package,
  AlertTriangle,
  Wrench,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CallStateBadge } from "@/components/voice/CallStateBadge";
import { RemoteAudio } from "@/components/voice/RemoteAudio";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDuration,
  listWaitingSessions,
  patchHandoffSession,
  type CallState,
  type HandoffSession,
} from "@/lib/handoff";
import { formatINR } from "@/lib/orders.data";
import { redactPII } from "@/components/voice/Transcript";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Support Agent Desk · VERA Live Handoff" },
      {
        name: "description",
        content:
          "Live human support desk: pick up escalated VERA calls, see full AI context and order data, and talk to the customer in real time.",
      },
      { property: "og:title", content: "Support Agent Desk · VERA Live Handoff" },
      {
        property: "og:description",
        content: "Answer escalated voice calls with the complete AI transcript, sentiment and order history in view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentDesk,
});

function AgentDesk() {
  const [sessions, setSessions] = useState<HandoffSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [agentName] = useState("Riya · Support L2");
  const { status, error, muted, remoteStream, start, hangUp, toggleMute } = useWebRTCCall(activeId, "agent");
  const joined = useRef<string | null>(null);

  const refresh = useCallback(() => {
    listWaitingSessions()
      .then(setSessions)
      .catch((e) => toast.error("Could not load the call queue", { description: e.message }));
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("handoff-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "handoff_sessions" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    if (status !== "connected") return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === "connected" && activeId) {
      void patchHandoffSession(activeId, {
        state: "human_connected",
        agent_name: agentName,
        connected_at: new Date().toISOString(),
      });
    }
    if (status === "ended" && activeId) {
      void patchHandoffSession(activeId, { state: "call_ended", ended_at: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? null, [sessions, activeId]);
  const waiting = sessions.filter((s) => s.state === "handoff_requested" || s.state === "connecting");

  const join = useCallback(
    async (s: HandoffSession) => {
      setActiveId(s.id);
      joined.current = s.id;
      await patchHandoffSession(s.id, { state: "connecting", agent_name: agentName });
      setTimeout(() => void start(), 150);
    },
    [agentName, start],
  );

  const callState: CallState =
    status === "connected"
      ? "human_connected"
      : status === "ended"
        ? "call_ended"
        : status === "failed"
          ? "no_agents"
          : active
            ? "connecting"
            : "ai_active";

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      <RemoteAudio stream={remoteStream} />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/50 bg-accent/10">
              <Headset className="h-4 w-4 text-accent" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold tracking-tight">Support Agent Desk</p>
              <p className="text-[11px] text-muted-foreground">Live escalations from VERA · {agentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CallStateBadge state={callState} />
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkle className="h-3.5 w-3.5" /> Customer console
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 pt-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <h2 className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Incoming queue · {waiting.length}
          </h2>
          {sessions.length === 0 && (
            <div className="panel-inset flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <Inbox className="h-4 w-4" /> No escalations yet. Ask VERA for a human on the customer console.
            </div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "panel w-full p-4 text-left transition-colors",
                activeId === s.id ? "border-primary/60" : "hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{s.customer_name}</p>
                <CallStateBadge state={s.state} />
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{s.issue ?? "No issue captured"}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono">{s.order_id ?? "—"}</span>
                <span
                  className={cn(
                    s.sentiment === "frustrated" ? "text-destructive" : "text-muted-foreground",
                    "uppercase tracking-wider",
                  )}
                >
                  {s.sentiment}
                </span>
              </div>
              {(s.state === "handoff_requested" || s.state === "connecting") && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    void join(s);
                  }}
                  className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  <PhoneCall className="h-3.5 w-3.5" /> Join call
                </span>
              )}
            </button>
          ))}
        </aside>

        {!active ? (
          <div className="panel flex min-h-[420px] items-center justify-center p-10 text-sm text-muted-foreground">
            Select an escalated call to see the full AI context.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{active.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{active.customer_phone ?? "Number withheld"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {status === "connected" ? formatDuration(seconds) : "--:--"}
                  </span>
                  <button
                    type="button"
                    onClick={toggleMute}
                    disabled={status !== "connected"}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-40",
                      muted ? "border-warning/50 bg-warning/10 text-warning" : "border-border text-muted-foreground",
                    )}
                  >
                    {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {muted ? "Unmute" : "Mute"}
                  </button>
                  {status === "connected" ? (
                    <button
                      type="button"
                      onClick={hangUp}
                      className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground"
                    >
                      <PhoneOff className="h-3.5 w-3.5" /> End call
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void join(active)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                    >
                      <PhoneCall className="h-3.5 w-3.5" /> Join call
                    </button>
                  )}
                </div>
              </div>
              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="panel flex h-[460px] flex-col overflow-hidden">
                <p className="border-b border-border/70 px-5 py-3 font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Conversation before handoff
                </p>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {active.transcript.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-sm",
                        line.role === "customer" ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {line.role}
                      </span>
                      {redactPII(line.text)}
                    </div>
                  ))}
                </div>
              </section>

              <div className="space-y-4">
                <section className="panel p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Issue & sentiment</p>
                  <p className="mt-2 text-sm">{active.issue ?? "—"}</p>
                  <p
                    className={cn(
                      "mt-2 text-xs uppercase tracking-wider",
                      active.sentiment === "frustrated" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    sentiment · {active.sentiment}
                  </p>
                </section>

                <section className="panel p-4">
                  <p className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <Package className="h-3.5 w-3.5" /> Order in focus
                  </p>
                  <p className="mt-2 font-mono text-xs">{active.order_id ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{active.order_status ?? "—"}</p>
                  <div className="mt-3 space-y-2">
                    {active.orders.map((o) => (
                      <div key={o.id} className="panel-inset p-2 text-xs">
                        <p className="font-mono text-[10px] text-muted-foreground">{o.id}</p>
                        <p className="truncate">{o.item}</p>
                        <p className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{o.status}</span>
                          <span className="font-mono">{formatINR(o.amount)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel p-4">
                  <p className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" /> AI actions performed
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {active.actions.length ? (
                      active.actions.map((a, i) => <li key={i}>· {a}</li>)
                    ) : (
                      <li>No tools executed.</li>
                    )}
                  </ul>
                  {active.failures.length > 0 && (
                    <div className="mt-3 space-y-1 text-xs text-destructive">
                      <p className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" /> Tool failures
                      </p>
                      {active.failures.map((f, i) => (
                        <p key={i}>· {f}</p>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
