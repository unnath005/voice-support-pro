import { useEffect, useRef } from "react";
import { Wrench, User, Headset } from "lucide-react";
import { cn } from "@/lib/utils";

export type Turn =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "tool"; label: string; detail: string };

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
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent/10">
              <Wrench className="h-3 w-3 text-accent" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent">{t.label}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{t.detail}</p>
            </div>
          </div>
        ) : t.kind === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="flex max-w-[85%] items-start gap-2">
              <p className="rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">{t.text}</p>
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
            <p className="max-w-[88%] text-sm leading-relaxed text-foreground/90">{t.text}</p>
          </div>
        ),
      )}

      {interim && (
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-primary/30 px-4 py-2 text-sm italic text-muted-foreground">
            {interim}
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
