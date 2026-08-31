import { useEffect, useRef } from "react";
import { Headset, Loader2, Mic, MicOff, PhoneOff, PhoneMissed, RotateCcw, Bot, PhoneIncoming } from "lucide-react";
import { CallStateBadge } from "./CallStateBadge";
import { RemoteAudio } from "./RemoteAudio";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { formatDuration, type CallState } from "@/lib/handoff";
import { cn } from "@/lib/utils";

const WAIT_TIMEOUT_MS = 45_000;

export function HumanHandoffPanel({
  sessionId,
  state,
  reason,
  connectedSeconds,
  onStateChange,
  onStayWithVera,
  onRequestCallback,
  onRetry,
}: {
  sessionId: string | null;
  state: CallState;
  reason: string;
  connectedSeconds: number;
  onStateChange: (s: CallState) => void;
  onStayWithVera: () => void;
  onRequestCallback: () => void;
  onRetry: () => void;
}) {
  const { status, error, muted, remoteStream, start, hangUp, toggleMute } = useWebRTCCall(sessionId, "customer");
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId || started.current === sessionId) return;
    if (state !== "handoff_requested" && state !== "connecting") return;
    started.current = sessionId;
    void start();
  }, [sessionId, state, start]);

  useEffect(() => {
    if (status === "connected") onStateChange("human_connected");
    if (status === "ended") onStateChange("call_ended");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (state !== "handoff_requested" && state !== "connecting") return;
    const id = setTimeout(() => {
      if (status !== "connected") onStateChange("no_agents");
    }, WAIT_TIMEOUT_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, status]);

  const waiting = state === "handoff_requested" || state === "connecting";

  return (
    <section className="panel mt-6 overflow-hidden border-warning/30">
      <RemoteAudio stream={remoteStream} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
        <div className="flex items-center gap-2">
          <Headset className="h-4 w-4 text-warning" />
          <p className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">Human support line</p>
        </div>
        <div className="flex items-center gap-2">
          {state === "human_connected" && (
            <span className="font-mono text-xs text-muted-foreground">{formatDuration(connectedSeconds)}</span>
          )}
          <CallStateBadge state={state} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        {waiting && (
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-warning" />
            <div>
              <p className="font-medium">Connecting to Human Support…</p>
              <p className="text-xs text-muted-foreground">
                {reason} · Vera is muted while we page an available representative.
              </p>
            </div>
          </div>
        )}

        {state === "human_connected" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-success/40 bg-success/10">
                <PhoneIncoming className="h-4 w-4 text-success" />
              </span>
              <div>
                <p className="font-medium">You are live with a human support agent</p>
                <p className="text-xs text-muted-foreground">Real-time audio · speak normally</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  muted ? "border-warning/50 bg-warning/10 text-warning" : "border-border text-muted-foreground",
                )}
              >
                {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={hangUp}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground"
              >
                <PhoneOff className="h-3.5 w-3.5" /> End call
              </button>
            </div>
          </div>
        )}

        {(state === "no_agents" || status === "failed") && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <PhoneMissed className="h-4 w-4" />
              {status === "failed" ? (error ?? "The audio connection failed.") : "No agents available right now."}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
              <button
                type="button"
                onClick={onStayWithVera}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary"
              >
                <Bot className="h-3.5 w-3.5" /> Continue with Vera
              </button>
              <button
                type="button"
                onClick={onRequestCallback}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                Request a callback
              </button>
            </div>
          </div>
        )}

        {state === "callback_requested" && (
          <p className="text-sm text-accent">
            Callback logged. A representative will call you back on the number on file.
          </p>
        )}

        {state === "call_ended" && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            Call ended.
            <button
              type="button"
              onClick={onStayWithVera}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary"
            >
              <Bot className="h-3.5 w-3.5" /> Resume with Vera
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
