import { Check, Clock, Truck, Ban, RotateCcw, MapPin, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, canCancel, canModify, canReturn, formatINR, type Order } from "@/lib/orders.data";
import { OrderBadges } from "./OrderBadges";

export function OrderDetail({
  order,
  onCancel,
  onReturn,
  onAddItems,
  onChangeAddress,
}: {
  order: Order;
  onCancel: () => void;
  onReturn: () => void;
  onAddItems: () => void;
  onChangeAddress: () => void;
}) {
  const locked = !canModify(order);

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">{order.id}</p>
          <h3 className="mt-1 text-lg font-semibold">{order.item}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Qty {order.qty} · {formatINR(order.amount)} · placed {order.placedAt}
          </p>
          <OrderBadges badges={order.badges} className="mt-2" />
        </div>
        <div className="panel-inset px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">ETA</p>
          <p className="mt-0.5 font-display text-sm text-primary">{order.eta}</p>
        </div>
      </div>

      <div className="my-5 hairline" />

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div className="panel-inset p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Items</p>
              <button
                type="button"
                onClick={onAddItems}
                disabled={locked}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
              >
                {locked ? <Lock className="h-3 w-3" /> : <Plus className="h-3 w-3" />} Add item
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {order.items.map((l) => (
                <li
                  key={l.productId}
                  className="flex animate-in fade-in slide-in-from-left-1 items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-[11px] text-muted-foreground">×{l.qty}</span> {l.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-foreground/80">{formatINR(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="my-3 hairline" />
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono">{formatINR(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="font-mono">{order.shippingFee ? formatINR(order.shippingFee) : "Free"}</dd>
              </div>
              <div className="flex justify-between pt-1 text-sm">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono text-primary">{formatINR(order.amount)}</dd>
              </div>
            </dl>
          </div>

          <ol className="relative space-y-4 pl-6">
            <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {order.timeline.map((e, i) => (
              <li key={`${e.label}-${i}`} className="relative">
                <span
                  className={cn(
                    "absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
                    e.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  {e.done ? <Check className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                </span>
                <p className={cn("text-sm", e.done ? "text-foreground" : "text-muted-foreground")}>{e.label}</p>
                <p className="text-[11px] text-muted-foreground">{e.at}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <div className="panel-inset p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Carrier</p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-accent" /> {order.courier}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{order.trackingId}</p>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">Status</p>
            <p className="text-sm text-primary">{STATUS_LABEL[order.status]}</p>
          </div>

          <div className="panel-inset p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ship to</p>
                <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0">{order.address}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onChangeAddress}
              disabled={locked}
              className="mt-3 w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
            >
              {locked ? "Address locked after dispatch" : "Change address"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={!canCancel(order)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs font-medium transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
            >
              <Ban className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={onReturn}
              disabled={!canReturn(order)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs font-medium transition-colors hover:border-warning/50 hover:text-warning disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
