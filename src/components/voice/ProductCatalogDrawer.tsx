import { useMemo, useState } from "react";
import { Search, Plus, Minus, ShoppingBag, PackagePlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PRODUCTS, formatINR, type Order } from "@/lib/orders.data";

export function ProductCatalogDrawer({
  open,
  onOpenChange,
  order,
  onRequestAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onRequestAdd: (productName: string, qty: number) => void;
}) {
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});

  const categories = useMemo(() => Array.from(new Set(PRODUCTS.map((p) => p.category))), []);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return PRODUCTS;
    return PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle),
    );
  }, [q]);

  const bump = (id: string, d: number) =>
    setQty((prev) => ({ ...prev, [id]: Math.min(9, Math.max(1, (prev[id] ?? 1) + d)) }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-border bg-surface p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-base">
            <ShoppingBag className="h-4 w-4 text-primary" /> Product catalog
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pick an item and Vera will add it to <span className="font-mono text-primary">{order.id}</span> during the
            call.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border/70 px-5 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setQ(q === c ? "" : c)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                  q === c ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {results.map((p) => {
            const n = qty[p.id] ?? 1;
            return (
              <div key={p.id} className="panel-inset p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {p.category} · <span className="font-mono">{p.id}</span>
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-primary">{formatINR(p.price)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      p.inStock
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                    )}
                  >
                    {p.inStock ? "In stock" : "Out of stock"}
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${p.name}`}
                        onClick={() => bump(p.id, -1)}
                        className="px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-mono text-xs">{n}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${p.name}`}
                        onClick={() => bump(p.id, 1)}
                        className="px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!p.inStock}
                      onClick={() => {
                        onRequestAdd(p.name, n);
                        onOpenChange(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      <PackagePlus className="h-3 w-3" /> Ask Vera
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!results.length && <p className="py-8 text-center text-sm text-muted-foreground">No products match that.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
