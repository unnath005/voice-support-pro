import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Headset, Loader2, PhoneForwarded, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Transcript, type Turn } from "./Transcript";
import { summarizeCall } from "@/lib/agent.functions";
import { STATUS_LABEL, formatINR, type Order } from "@/lib/orders.data";
import type { Sentiment } from "./SentimentHeader";
import { cn } from "@/lib/utils";

export function HandoffDashboard({
  open,
  onClose,
  turns,
  orders,
  sentiment,
  takenOver,
  onTakeOver,
}: {
  open: boolean;
  onClose: () => void;
  turns: Turn[];
  orders: Order[];
  sentiment: Sentiment;
  takenOver: boolean;
  onTakeOver: () => void;
}) {
  const summarize = useServerFn(summarizeCall);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const transcript = turns
      .filter((t): t is Extract<Turn, { kind: "user" | "agent" }> => t.kind === "user" || t.kind === "agent")
      .map((t) => ({ role: t.kind === "user" ? ("user" as const) : ("assistant" as const), content: t.text }));
    if (!transcript.length) return;
    setLoading(true);
    summarize({ data: { transcript } })
      .then((r) => setSummary(r.summary))
      .catch(() => setSummary("Summary unavailable — review the transcript directly."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <section className="panel mt-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
        <div className="flex items-center gap-2">
          <Headset className="h-4 w-4 text-primary" />
          <p className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Human handoff dashboard
          </p>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px]",
              sentiment === "frustrated"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground",
            )}
          >
            sentiment · {sentiment}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close handoff dashboard"
          className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <div className="flex h-[420px] flex-col border-b border-border/70 lg:border-b-0 lg:border-r">
          <p className="px-5 pt-4 text-[11px] uppercase tracking-widest text-muted-foreground">Live transcript</p>
          <div className="min-h-0 flex-1">
            <Transcript turns={turns} interim="" thinking={false} />
          </div>
        </div>

        <div className="space-y-4 border-b border-border/70 p-5 lg:border-b-0 lg:border-r">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">AI call summary</p>
          <div className="panel-inset min-h-[120px] p-4 text-sm leading-relaxed">
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating supervisor brief…
              </span>
            ) : (
              <span className="flex gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {summary || "No conversation yet."}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onTakeOver();
              toast.success("Call taken over", { description: "Vera is now muted; you are live with the customer." });
            }}
            disabled={takenOver}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <PhoneForwarded className="h-4 w-4" />
            {takenOver ? "You are on the call" : "Take over call"}
          </button>
        </div>

        <div className="space-y-2 p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Customer order history</p>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {orders.map((o) => (
              <div key={o.id} className="panel-inset p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{o.id}</p>
                <p className="mt-0.5 truncate text-xs">{o.item}</p>
                <p className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{STATUS_LABEL[o.status]}</span>
                  <span className="font-mono">{formatINR(o.amount)}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
