import { Package, Truck, CheckCircle2, XCircle, RotateCcw, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, formatINR, type Order, type OrderStatus } from "@/lib/orders.data";

const TONE: Record<OrderStatus, string> = {
  placed: "text-muted-foreground border-border",
  packed: "text-accent border-accent/40",
  shipped: "text-accent border-accent/40",
  out_for_delivery: "text-primary border-primary/50",
  delivered: "text-success border-success/40",
  cancelled: "text-destructive border-destructive/40",
  return_requested: "text-warning border-warning/40",
  returned: "text-warning border-warning/40",
};

function StatusIcon({ status }: { status: OrderStatus }) {
  if (status === "delivered") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "cancelled") return <XCircle className="h-4 w-4" />;
  if (status === "return_requested" || status === "returned") return <RotateCcw className="h-4 w-4" />;
  if (status === "out_for_delivery" || status === "shipped") return <Truck className="h-4 w-4" />;
  return <Package className="h-4 w-4" />;
}

export function OrderCard({
  order,
  active,
  onSelect,
}: {
  order: Order;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full panel-inset p-4 text-left transition-all duration-300 hover:border-primary/40",
        active && "border-primary/60 bg-surface-2/90 shadow-[var(--shadow-glow)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{order.id}</p>
          <p className="mt-1 truncate font-display text-sm font-medium">{order.item}</p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            TONE[order.status],
          )}
        >
          <StatusIcon status={order.status} />
          {STATUS_LABEL[order.status]}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> {order.city} · {order.courier}
        </span>
        <span className="font-mono text-foreground/80">{formatINR(order.amount)}</span>
      </div>
    </button>
  );
}
