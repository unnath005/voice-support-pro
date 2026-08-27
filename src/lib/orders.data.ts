export type OrderStatus =
  | "placed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned";

export type OrderEvent = {
  label: string;
  at: string;
  done: boolean;
};

export type OrderLine = {
  productId: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderBadge = "item_added" | "return_pending" | "address_updated" | "cancelled" | "rescheduled";

export const BADGE_LABEL: Record<OrderBadge, string> = {
  item_added: "Item Added",
  return_pending: "Return Pending",
  address_updated: "Address Updated",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export type Order = {
  id: string;
  customer: string;
  phone: string;
  item: string;
  items: OrderLine[];
  image?: string;
  qty: number;
  subtotal: number;
  shippingFee: number;
  amount: number;
  address: string;
  placedAt: string;
  eta: string;
  courier: string;
  trackingId: string;
  city: string;
  status: OrderStatus;
  badges: OrderBadge[];
  timeline: OrderEvent[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
};

export const PRODUCTS: Product[] = [
  { id: "P-1001", name: "Aurora Noise-Cancelling Headphones", price: 12499, category: "Audio", inStock: true },
  { id: "P-1002", name: "Aurora Carry Case", price: 1299, category: "Audio", inStock: true },
  { id: "P-1003", name: "Linen Weekend Shirt · Sand", price: 1799, category: "Apparel", inStock: true },
  { id: "P-1004", name: "Merino Crew Socks (3 pack)", price: 899, category: "Apparel", inStock: true },
  { id: "P-1005", name: "Cast Iron Skillet 12in", price: 2299, category: "Kitchen", inStock: true },
  { id: "P-1006", name: "Skillet Care Kit", price: 749, category: "Kitchen", inStock: true },
  { id: "P-1007", name: "Trail Runner Sneakers · 42", price: 6799, category: "Footwear", inStock: true },
  { id: "P-1008", name: "Performance Insoles", price: 999, category: "Footwear", inStock: false },
  { id: "P-1009", name: "Everyday Tote · Charcoal", price: 2499, category: "Accessories", inStock: true },
  { id: "P-1010", name: "Smart Mug Warmer", price: 3199, category: "Kitchen", inStock: true },
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
};

const t = (label: string, at: string, done: boolean): OrderEvent => ({ label, at, done });

function line(productId: string, qty: number): OrderLine {
  const p = PRODUCTS.find((x) => x.id === productId)!;
  return { productId: p.id, name: p.name, price: p.price, qty };
}

/** Recomputes derived money/title fields after any line-item change. */
export function recalcOrder(order: Order): Order {
  const subtotal = order.items.reduce((s, l) => s + l.price * l.qty, 0);
  const qty = order.items.reduce((s, l) => s + l.qty, 0);
  const shippingFee = subtotal > 5000 || subtotal === 0 ? 0 : 99;
  const head = order.items[0];
  return {
    ...order,
    subtotal,
    qty,
    shippingFee,
    amount: subtotal + shippingFee,
    item: head ? (order.items.length > 1 ? `${head.name} +${order.items.length - 1} more` : head.name) : order.item,
  };
}

function seed(o: Omit<Order, "subtotal" | "shippingFee" | "amount" | "qty" | "item"> & { item?: string }): Order {
  return recalcOrder({
    ...(o as unknown as Order),
    subtotal: 0,
    shippingFee: 0,
    amount: 0,
    qty: 0,
    item: o.item ?? "",
  });
}

export const SEED_ORDERS: Order[] = [
  seed({
    id: "RTL-48291",
    customer: "REDACTED",
    phone: "+91 98••• ••432",
    items: [line("P-1001", 1)],
    address: "REDACTED, Indiranagar, Bengaluru 560038",
    placedAt: "Aug 21, 2026",
    eta: "Aug 26, 2026 · by 7 PM",
    courier: "SwiftEx Logistics",
    trackingId: "SWX9920481123",
    city: "Bengaluru",
    status: "out_for_delivery",
    badges: [],
    timeline: [
      t("Order placed", "Aug 21, 10:12", true),
      t("Packed at Hosur hub", "Aug 22, 08:40", true),
      t("Shipped", "Aug 23, 19:05", true),
      t("Out for delivery", "Aug 25, 07:55", true),
      t("Delivered", "Expected Aug 26", false),
    ],
  }),
  seed({
    id: "RTL-48355",
    customer: "REDACTED",
    phone: "+91 98••• ••432",
    items: [line("P-1003", 2)],
    address: "REDACTED, Indiranagar, Bengaluru 560038",
    placedAt: "Aug 23, 2026",
    eta: "Aug 28, 2026",
    courier: "BlueDart",
    trackingId: "BD771209934",
    city: "Bengaluru",
    status: "shipped",
    badges: [],
    timeline: [
      t("Order placed", "Aug 23, 16:44", true),
      t("Packed", "Aug 24, 09:10", true),
      t("Shipped", "Aug 24, 22:30", true),
      t("Out for delivery", "Expected Aug 28", false),
      t("Delivered", "Expected Aug 28", false),
    ],
  }),
  seed({
    id: "RTL-47810",
    customer: "REDACTED",
    phone: "+91 98••• ••432",
    items: [line("P-1005", 1)],
    address: "REDACTED, Indiranagar, Bengaluru 560038",
    placedAt: "Aug 12, 2026",
    eta: "Delivered Aug 16, 2026",
    courier: "SwiftEx Logistics",
    trackingId: "SWX9911002233",
    city: "Bengaluru",
    status: "delivered",
    badges: [],
    timeline: [
      t("Order placed", "Aug 12, 11:02", true),
      t("Packed", "Aug 13, 07:30", true),
      t("Shipped", "Aug 14, 18:15", true),
      t("Out for delivery", "Aug 16, 08:02", true),
      t("Delivered", "Aug 16, 13:47", true),
    ],
  }),
  seed({
    id: "RTL-48402",
    customer: "REDACTED",
    phone: "+91 98••• ••432",
    items: [line("P-1007", 1)],
    address: "REDACTED, Indiranagar, Bengaluru 560038",
    placedAt: "Aug 24, 2026",
    eta: "Aug 30, 2026",
    courier: "Delhivery",
    trackingId: "DLV5566120099",
    city: "Bengaluru",
    status: "packed",
    badges: [],
    timeline: [
      t("Order placed", "Aug 24, 21:18", true),
      t("Packed", "Aug 25, 06:12", true),
      t("Shipped", "Expected Aug 26", false),
      t("Out for delivery", "Expected Aug 30", false),
      t("Delivered", "Expected Aug 30", false),
    ],
  }),
];

export function canCancel(o: Order) {
  return ["placed", "packed", "shipped"].includes(o.status);
}

export function canReturn(o: Order) {
  return o.status === "delivered";
}

/** Orders that have shipped or been delivered are locked for modification. */
export function canModify(o: Order) {
  return !["shipped", "out_for_delivery", "delivered", "cancelled", "returned"].includes(o.status);
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export type MutationResult = { ok: boolean; orders: Order[]; message: string; order?: Order };

function withBadge(o: Order, badge: OrderBadge): Order {
  return { ...o, badges: [badge, ...o.badges.filter((b) => b !== badge)].slice(0, 3) };
}

function apply(orders: Order[], orderId: string, fn: (o: Order) => Order) {
  return orders.map((o) => (o.id === orderId ? fn(o) : o));
}

function get(orders: Order[], orderId: string) {
  return orders.find((o) => o.id === orderId);
}

export function addItemToOrder(
  orderId: string,
  productId: string,
  quantity: number,
  orders: Order[],
): MutationResult {
  const o = get(orders, orderId);
  if (!o) return { ok: false, orders, message: `Order ${orderId} was not found.` };
  if (!canModify(o))
    return { ok: false, orders, message: `Order ${o.id} is ${STATUS_LABEL[o.status]} and can no longer be modified.` };
  const p = PRODUCTS.find((x) => x.id === productId || x.name.toLowerCase() === productId.toLowerCase());
  if (!p) return { ok: false, orders, message: `That product is not in the catalog.` };
  if (!p.inStock) return { ok: false, orders, message: `${p.name} is out of stock right now.` };
  const qty = Math.max(1, Math.round(quantity || 1));

  const next = apply(orders, o.id, (curr) => {
    const items = curr.items.some((l) => l.productId === p.id)
      ? curr.items.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + qty } : l))
      : [...curr.items, { productId: p.id, name: p.name, price: p.price, qty }];
    const updated = recalcOrder({
      ...curr,
      items,
      timeline: [...curr.timeline, t(`Added ${qty} × ${p.name}`, "Just now", true)],
    });
    return withBadge(updated, "item_added");
  });

  const after = get(next, o.id)!;
  return {
    ok: true,
    orders: next,
    order: after,
    message: `Added ${qty} × ${p.name}. New order total is ${formatINR(after.amount)}.`,
  };
}

export function cancelOrder(orderId: string, orders: Order[], reason = "Customer request"): MutationResult {
  const o = get(orders, orderId);
  if (!o) return { ok: false, orders, message: `Order ${orderId} was not found.` };
  if (!canCancel(o))
    return { ok: false, orders, message: `Order ${o.id} is ${STATUS_LABEL[o.status]} and cannot be cancelled.` };

  const next = apply(orders, o.id, (curr) =>
    withBadge(
      {
        ...curr,
        status: "cancelled",
        eta: "Refund in 3-5 business days",
        timeline: [...curr.timeline.filter((e) => e.done), t(`Cancelled · ${reason}`, "Just now", true)],
      },
      "cancelled",
    ),
  );
  return { ok: true, orders: next, order: get(next, o.id)!, message: `Order ${o.id} is cancelled. ${formatINR(o.amount)} will be refunded in 3 to 5 business days.` };
}

export function updateShippingAddress(orderId: string, newAddress: string, orders: Order[]): MutationResult {
  const o = get(orders, orderId);
  if (!o) return { ok: false, orders, message: `Order ${orderId} was not found.` };
  if (!canModify(o))
    return { ok: false, orders, message: `Order ${o.id} is ${STATUS_LABEL[o.status]}, so the address is locked.` };

  const next = apply(orders, o.id, (curr) =>
    withBadge(
      {
        ...curr,
        address: newAddress,
        timeline: [...curr.timeline, t("Shipping address updated", "Just now", true)],
      },
      "address_updated",
    ),
  );
  return { ok: true, orders: next, order: get(next, o.id)!, message: `Shipping address updated for ${o.id}.` };
}

export function processReturn(orderId: string, reason: string, orders: Order[]): MutationResult {
  const o = get(orders, orderId);
  if (!o) return { ok: false, orders, message: `Order ${orderId} was not found.` };
  if (!canReturn(o))
    return { ok: false, orders, message: `Returns are only possible after delivery. ${o.id} is ${STATUS_LABEL[o.status]}.` };

  const next = apply(orders, o.id, (curr) =>
    withBadge(
      {
        ...curr,
        status: "return_requested",
        eta: "Pickup tomorrow, 10 AM - 6 PM",
        timeline: [...curr.timeline, t(`Return requested · ${reason}`, "Just now", true)],
      },
      "return_pending",
    ),
  );
  return {
    ok: true,
    orders: next,
    order: get(next, o.id)!,
    message: `Return started for ${o.id}. Pickup is tomorrow between 10 AM and 6 PM, refund ${formatINR(o.amount)}.`,
  };
}

export function rescheduleDelivery(orderId: string, date: string, orders: Order[]): MutationResult {
  const o = get(orders, orderId);
  if (!o) return { ok: false, orders, message: `Order ${orderId} was not found.` };
  const next = apply(orders, o.id, (curr) =>
    withBadge({ ...curr, eta: date, timeline: [...curr.timeline, t(`Delivery rescheduled to ${date}`, "Just now", true)] }, "rescheduled"),
  );
  return { ok: true, orders: next, order: get(next, o.id)!, message: `Delivery for ${o.id} moved to ${date}.` };
}

/** Actions that must pass OTP identity verification before executing. */
export const HIGH_RISK_ACTIONS = ["cancel", "return", "address"] as const;
export const REFUND_OTP_THRESHOLD = 4000; // ≈ $50
