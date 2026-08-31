import { CALL_STATE_LABEL, type CallState } from "@/lib/handoff";
import { cn } from "@/lib/utils";

const TONE: Record<CallState, string> = {
  ai_active: "border-primary/40 bg-primary/10 text-primary",
  handoff_requested: "border-warning/40 bg-warning/10 text-warning",
  connecting: "border-warning/40 bg-warning/10 text-warning",
  human_connected: "border-success/40 bg-success/10 text-success",
  call_ended: "border-border bg-surface-2 text-muted-foreground",
  no_agents: "border-destructive/40 bg-destructive/10 text-destructive",
  callback_requested: "border-accent/40 bg-accent/10 text-accent",
};

export function CallStateBadge({ state, className }: { state: CallState; className?: string }) {
  const pulsing = state === "connecting" || state === "handoff_requested" || state === "human_connected";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
        TONE[state],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", pulsing && "animate-pulse")} />
      {CALL_STATE_LABEL[state]}
    </span>
  );
}
