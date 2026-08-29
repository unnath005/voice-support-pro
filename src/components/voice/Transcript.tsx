import { useEffect, useRef } from "react";
import { Wrench, User, Headset, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type Turn =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "tool"; label: string; detail: string; failed?: boolean }
  | { kind: "system"; text: string };

const PII_PATTERNS: RegExp[] = [
  // credit / debit card numbers (13-16 digits, optional separators)
  /\b(?:\d[ -]?){13,16}\b/g,
  // phone numbers, incl. +91 style
  /(\+\d{1,3}[\s-]?)?\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  /\b\d{5}[\s-]?\d{5}\b/g,
  // CVV spoken alongside a card
  /\bcvv\s*(is\s*)?\d{3,4}\b/gi,
  // full street addresses
  /\b\d{1,5}[a-z]?[,\s]+(?:[A-Za-z0-9.'-]+\s){1,6}(street|st|road|rd|avenue|ave|lane|ln|cross|main|block|nagar|colony|apartment|apt|flat|sector|drive|dr)\b[^.,;]*/gi,
  // postal codes attached to a locality
  /\b\d{6}\b/g,
  // emails
  /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g,
];

export function redactPII(text: string) {
  let out = text;
  for (const re of PII_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out.replace(/(\[REDACTED\][\s,]*){2,}/g, "[REDACTED] ");
}

function Redacted({ text, className }: { text: string; className?: string }) {
  const safe = redactPII(text);
  const parts = safe.split(/(\[REDACTED\])/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p === "[REDACTED]" ? (
          <span
            key={i}
            title="Sensitive data masked before storage"
            className="mx-0.5 inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wider text-warning"
          >
            <ShieldCheck className="h-2.5 w-2.5" />
            redacted
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

export function Transcript({ turns, interim, thinking }: { turns: Turn[]; interim: string; thinking: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [turns, interim, thinking]);

  return (
    <div ref={ref} className="h-full space-y-4 overflow-y-auto px-5 py-5">
      {turns.map((t, i) =>
        t.kind === "tool" ? (
          <div key={i} className="flex items-start gap-3 pl-1">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                t.failed ? "border-destructive/40 bg-destructive/10" : "border-accent/40 bg-accent/10",
              )}
            >
              <Wrench className={cn("h-3 w-3", t.failed ? "text-destructive" : "text-accent")} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-xs font-medium", t.failed ? "text-destructive" : "text-accent")}>{t.label}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{t.detail}</p>
            </div>
          </div>
        ) : t.kind === "system" ? (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t.text}
          </div>
        ) : t.kind === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="flex max-w-[85%] items-start gap-2">
              <p className="rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                <Redacted text={t.text} />
              </p>
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2">
                <User className="h-3 w-3 text-muted-foreground" />
              </span>
            </div>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <Headset className="h-3 w-3 text-primary" />
            </span>
            <p className="max-w-[88%] text-sm leading-relaxed text-foreground/90">
              <Redacted text={t.text} />
            </p>
          </div>
        ),
      )}

      {interim && (
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-primary/30 px-4 py-2 text-sm italic text-muted-foreground">
            <Redacted text={interim} />
          </p>
        </div>
      )}

      {thinking && (
        <div className="flex items-center gap-2 pl-8 text-xs text-muted-foreground">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn("h-1.5 w-1.5 animate-bounce rounded-full bg-primary")}
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          Vera is working on it
        </div>
      )}
    </div>
  );
}
