import { PackagePlus, RotateCcw, MapPin, Ban, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGE_LABEL, type OrderBadge } from "@/lib/orders.data";

const STYLE: Record<OrderBadge, string> = {
  item_added: "border-accent/40 bg-accent/10 text-accent",
  return_pending: "border-warning/40 bg-warning/10 text-warning",
  address_updated: "border-primary/40 bg-primary/10 text-primary",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
  rescheduled: "border-border bg-surface-2/60 text-muted-foreground",
};

const ICON: Record<OrderBadge, typeof MapPin> = {
  item_added: PackagePlus,
  return_pending: RotateCcw,
  address_updated: MapPin,
  cancelled: Ban,
  rescheduled: CalendarClock,
};

export function OrderBadges({ badges, className }: { badges: OrderBadge[]; className?: string }) {
  if (!badges.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((b) => {
        const Icon = ICON[b];
        return (
          <span
            key={b}
            className={cn(
              "inline-flex animate-in fade-in slide-in-from-bottom-1 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              STYLE[b],
            )}
          >
            <Icon className="h-3 w-3" />
            {BADGE_LABEL[b]}
          </span>
        );
      })}
    </div>
  );
}
