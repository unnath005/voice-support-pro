import { Smile, Meh, Frown, PhoneForwarded, Timer, Gauge, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type Sentiment = "positive" | "neutral" | "frustrated";

const TONE: Record<Sentiment, { label: string; cls: string; icon: typeof Smile }> = {
  positive: { label: "Positive", cls: "border-success/40 bg-success/10 text-success", icon: Smile },
  neutral: { label: "Neutral", cls: "border-border bg-surface-2/60 text-muted-foreground", icon: Meh },
  frustrated: { label: "Frustrated", cls: "border-destructive/40 bg-destructive/10 text-destructive", icon: Frown },
};

export function SentimentHeader({
  sentiment,
  callSeconds,
  toolFailures,
  turns,
  transferring,
}: {
  sentiment: Sentiment;
  callSeconds: number;
  toolFailures: number;
  turns: number;
  transferring: boolean;
}) {
  const tone = TONE[sentiment];
  const Icon = tone.icon;
  const mm = String(Math.floor(callSeconds / 60)).padStart(2, "0");
  const ss = String(callSeconds % 60).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 px-5 py-3">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Call live
        </span>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
            tone.cls,
          )}
        >
          <Icon className="h-3.5 w-3.5" /> Sentiment · {tone.label}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
          <Timer className="h-3.5 w-3.5" /> {mm}:{ss}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" /> {turns} turns
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]",
            toolFailures >= 2 ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-muted-foreground",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> {toolFailures} tool failures
        </span>
      </div>

      {transferring && (
        <div
          role="alert"
          className="flex animate-in fade-in slide-in-from-top-1 items-center gap-3 rounded-xl border border-warning/50 bg-warning/10 px-5 py-3 text-sm text-warning"
        >
          <PhoneForwarded className="h-4 w-4 shrink-0 animate-pulse" />
          <span>
            <strong className="font-semibold">Transferring to Human Support…</strong> A supervisor is joining this call.
            Estimated wait under 2 minutes.
          </span>
        </div>
      )}
    </div>
  );
}
