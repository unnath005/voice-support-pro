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

export type Order = {
  id: string;
  customer: string;
  phone: string;
  item: string;
  image?: string;
  qty: number;
  amount: number;
  placedAt: string;
  eta: string;
  courier: string;
  trackingId: string;
  city: string;
  status: OrderStatus;
  timeline: OrderEvent[];
};

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

export const SEED_ORDERS: Order[] = [
  {
    id: "RTL-48291",
    customer: "Ananya Rao",
    phone: "+91 98••• ••432",
    item: "Aurora Noise-Cancelling Headphones",
    qty: 1,
    amount: 12499,
    placedAt: "Aug 21, 2026",
    eta: "Aug 26, 2026 · by 7 PM",
    courier: "SwiftEx Logistics",
    trackingId: "SWX9920481123",
    city: "Bengaluru",
    status: "out_for_delivery",
    timeline: [
      t("Order placed", "Aug 21, 10:12", true),
      t("Packed at Hosur hub", "Aug 22, 08:40", true),
      t("Shipped", "Aug 23, 19:05", true),
      t("Out for delivery", "Aug 25, 07:55", true),
      t("Delivered", "Expected Aug 26", false),
    ],
  },
  {
    id: "RTL-48355",
    customer: "Ananya Rao",
    phone: "+91 98••• ••432",
    item: "Linen Weekend Shirt · Sand",
    qty: 2,
    amount: 3598,
    placedAt: "Aug 23, 2026",
    eta: "Aug 28, 2026",
    courier: "BlueDart",
    trackingId: "BD771209934",
    city: "Bengaluru",
    status: "shipped",
    timeline: [
      t("Order placed", "Aug 23, 16:44", true),
      t("Packed", "Aug 24, 09:10", true),
      t("Shipped", "Aug 24, 22:30", true),
      t("Out for delivery", "Expected Aug 28", false),
      t("Delivered", "Expected Aug 28", false),
    ],
  },
  {
    id: "RTL-47810",
    customer: "Ananya Rao",
    phone: "+91 98••• ••432",
    item: "Cast Iron Skillet 12in",
    qty: 1,
    amount: 2299,
    placedAt: "Aug 12, 2026",
    eta: "Delivered Aug 16, 2026",
    courier: "SwiftEx Logistics",
    trackingId: "SWX9911002233",
    city: "Bengaluru",
    status: "delivered",
    timeline: [
      t("Order placed", "Aug 12, 11:02", true),
      t("Packed", "Aug 13, 07:30", true),
      t("Shipped", "Aug 14, 18:15", true),
      t("Out for delivery", "Aug 16, 08:02", true),
      t("Delivered", "Aug 16, 13:47", true),
    ],
  },
  {
    id: "RTL-48402",
    customer: "Ananya Rao",
    phone: "+91 98••• ••432",
    item: "Trail Runner Sneakers · 42",
    qty: 1,
    amount: 6799,
    placedAt: "Aug 24, 2026",
    eta: "Aug 30, 2026",
    courier: "Delhivery",
    trackingId: "DLV5566120099",
    city: "Bengaluru",
    status: "packed",
    timeline: [
      t("Order placed", "Aug 24, 21:18", true),
      t("Packed", "Aug 25, 06:12", true),
      t("Shipped", "Expected Aug 26", false),
      t("Out for delivery", "Expected Aug 30", false),
      t("Delivered", "Expected Aug 30", false),
    ],
  },
];

export function canCancel(o: Order) {
  return ["placed", "packed", "shipped"].includes(o.status);
}

export function canReturn(o: Order) {
  return o.status === "delivered";
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
