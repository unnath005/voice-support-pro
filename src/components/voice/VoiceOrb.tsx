import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  listening: boolean;
  thinking: boolean;
  speaking: boolean;
  level: number;
  disabled?: boolean;
  onToggle: () => void;
};

export function VoiceOrb({ listening, thinking, speaking, level, disabled, onToggle }: Props) {
  const active = listening || thinking || speaking;
  const state = listening
    ? "Listening"
    : thinking
      ? "Thinking"
      : speaking
        ? "Speaking"
        : "Tap to talk";

  return (
    <div className="relative flex flex-col items-center gap-5">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div
          className={cn("absolute inset-0 orb-halo transition-opacity duration-500", active ? "opacity-90" : "opacity-40")}
          style={{ transform: `scale(${1 + (listening ? level * 0.18 : 0.02)})` }}
        />
        {active && (
          <>
            <span className="absolute h-36 w-36 rounded-full border border-primary/40 animate-ring" />
            <span
              className="absolute h-36 w-36 rounded-full border border-primary/30 animate-ring"
              style={{ animationDelay: "0.8s" }}
            />
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={listening ? "Stop listening" : "Start talking"}
          className={cn(
            "group relative flex h-32 w-32 items-center justify-center rounded-full border transition-all duration-300",
            "border-primary/50 bg-surface-2/80 backdrop-blur-xl animate-drift",
            "hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
            active && "border-primary shadow-[var(--shadow-glow)]",
          )}
        >
          <span className="absolute inset-2 rounded-full bg-primary/10" />
          {thinking ? (
            <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
          ) : speaking ? (
            <Volume2 className="relative h-10 w-10 text-primary" />
          ) : listening ? (
            <Square className="relative h-8 w-8 fill-primary text-primary" />
          ) : (
            <Mic className="relative h-10 w-10 text-primary" />
          )}
        </button>
      </div>

      <div className="flex items-end gap-[3px] h-8">
        {Array.from({ length: 21 }).map((_, i) => {
          const center = 1 - Math.abs(i - 10) / 11;
          const h = active ? 4 + center * 26 * (listening ? level : speaking ? 0.75 : 0.35) : 4;
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all duration-150",
                active ? "bg-primary/80" : "bg-border",
              )}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>

      <p className="font-display text-sm uppercase tracking-[0.28em] text-muted-foreground">{state}</p>
    </div>
  );
}
