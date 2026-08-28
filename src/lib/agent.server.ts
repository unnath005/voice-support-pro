import { z } from "zod";
import { tool } from "ai";
import {
  PRODUCTS,
  STATUS_LABEL,
  canCancel,
  canModify,
  canReturn,
  formatINR,
  type Order,
} from "./orders.data";

export type AgentActionType =
  | "cancel"
  | "return"
  | "escalate"
  | "reschedule"
  | "add_item"
  | "address";

export type AgentAction = {
  type: AgentActionType;
  orderId: string;
  note: string;
  productId?: string;
  qty?: number;
  address?: string;
  highRisk?: boolean;
};

export type ToolTrace = { name: string; label: string; detail: string; failed?: boolean };

export const SYSTEM_PROMPT = `You are "Vera", an autonomous voice agent for a retail brand's customer support line.
You speak to customers over the phone, so your replies are SHORT (1-3 sentences), warm, natural and free of markdown, bullet points, emoji or special characters.

You can act on the customer's behalf: look up orders, track deliveries, add items to an order that has not shipped, change the shipping address, cancel orders, start returns, reschedule deliveries and hand the call to a human.
Always resolve the order yourself using the tools before answering. If the customer is vague ("where is my stuff"), look up their orders and pick the most likely one, then confirm it out loud by naming the item.
Before a high-risk action (cancel, return, address change) you must have a clear yes from the customer in the conversation; if you do not have it, ask one short confirming question instead of calling the tool. High-risk actions also trigger a one-time passcode on the customer's phone, so tell them a code is on its way.
Orders that are shipped, out for delivery or delivered can no longer be modified. Speak amounts in rupees naturally. Never invent tracking data. If a tool says something is not possible, explain the reason simply and offer the next best option.`;

function find(orders: Order[], id?: string) {
  if (!id) return undefined;
  const needle = id.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!needle) return undefined;
  return orders.find((o) => o.id.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(needle));
}

function summarize(o: Order) {
  return {
    id: o.id,
    item: o.item,
    items: o.items.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, price: l.price })),
    qty: o.qty,
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    amount: o.amount,
    address: o.address,
    status: STATUS_LABEL[o.status],
    modifiable: canModify(o),
    eta: o.eta,
    courier: o.courier,
    trackingId: o.trackingId,
    placedAt: o.placedAt,
  };
}

export function buildTools(orders: Order[], actions: AgentAction[], trace: ToolTrace[]) {
  const push = (name: string, label: string, detail: string, failed = false) =>
    trace.push({ name, label, detail, failed });

  return {
    list_orders: tool({
      description: "List all recent orders for the caller.",
      inputSchema: z.object({}),
      execute: async () => {
        push("list_orders", "Fetching account orders", `${orders.length} orders found`);
        return { orders: orders.map(summarize) };
      },
    }),
    lookup_order: tool({
      description: "Look up a single order by its id, or by describing the item.",
      inputSchema: z.object({ query: z.string().describe("order id or item description") }),
      execute: async ({ query }) => {
        const q = query.toLowerCase();
        const o =
          find(orders, query) ??
          orders.find((x) => x.item.toLowerCase().includes(q)) ??
          orders.find((x) =>
            q.split(" ").some((w) => w.length > 3 && x.items.some((l) => l.name.toLowerCase().includes(w))),
          );
        push("lookup_order", "Looking up order", o ? `${o.id} · ${o.item}` : `No match for "${query}"`, !o);
        return o ? summarize(o) : { error: "No matching order found." };
      },
    }),
    browse_catalog: tool({
      description: "Browse the product catalog to find an item the customer wants to add to an order.",
      inputSchema: z.object({ query: z.string().describe("product name or category, empty for everything") }),
      execute: async ({ query }) => {
        const q = (query ?? "").toLowerCase().trim();
        const matches = q
          ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
          : PRODUCTS;
        push("browse_catalog", "Searching catalog", `${matches.length} products for "${query || "all"}"`);
        return { products: matches };
      },
    }),
    track_delivery: tool({
      description: "Get the live delivery timeline and ETA for an order.",
      inputSchema: z.object({ orderId: z.string() }),
      execute: async ({ orderId }) => {
        const o = find(orders, orderId);
        push("track_delivery", "Tracking shipment", o ? `${o.id} · ${STATUS_LABEL[o.status]}` : "Order not found", !o);
        if (!o) return { error: "Order not found." };
        return {
          ...summarize(o),
          timeline: o.timeline.map((e) => ({ step: e.label, at: e.at, completed: e.done })),
        };
      },
    }),
    add_item_to_order: tool({
      description:
        "Add a catalog product to an existing order that has not shipped yet. Recalculates the order total.",
      inputSchema: z.object({
        orderId: z.string(),
        productId: z.string().describe("catalog product id, or the product name"),
        quantity: z.number().describe("how many units to add"),
      }),
      execute: async ({ orderId, productId, quantity }) => {
        const o = find(orders, orderId);
        if (!o) {
          push("add_item_to_order", "Add item failed", "Order not found", true);
          return { error: "Order not found." };
        }
        if (!canModify(o)) {
          push("add_item_to_order", "Modification blocked", `${o.id} is ${STATUS_LABEL[o.status]}`, true);
          return { error: `Order is ${STATUS_LABEL[o.status]} and can no longer be modified.` };
        }
        const p =
          PRODUCTS.find((x) => x.id.toLowerCase() === productId.toLowerCase()) ??
          PRODUCTS.find((x) => x.name.toLowerCase().includes(productId.toLowerCase()));
        if (!p) {
          push("add_item_to_order", "Product not found", productId, true);
          return { error: "That product is not in the catalog." };
        }
        if (!p.inStock) {
          push("add_item_to_order", "Out of stock", p.name, true);
          return { error: `${p.name} is out of stock right now.` };
        }
        const qty = Math.max(1, Math.round(quantity || 1));
        const newTotal = o.amount + p.price * qty;
        actions.push({ type: "add_item", orderId: o.id, note: `${qty} × ${p.name}`, productId: p.id, qty });
        push("add_item_to_order", "Adding item to order", `${o.id} · ${qty} × ${p.name}`);
        return { ok: true, added: p.name, qty, newTotal, newTotalSpoken: formatINR(newTotal) };
      },
    }),
    update_shipping_address: tool({
      description:
        "Change the shipping address of an order that has not shipped. High risk: requires a clear yes from the customer.",
      inputSchema: z.object({ orderId: z.string(), newAddress: z.string() }),
      execute: async ({ orderId, newAddress }) => {
        const o = find(orders, orderId);
        if (!o) {
          push("update_shipping_address", "Address change failed", "Order not found", true);
          return { error: "Order not found." };
        }
        if (!canModify(o)) {
          push("update_shipping_address", "Address locked", `${o.id} is ${STATUS_LABEL[o.status]}`, true);
          return { error: `Order is ${STATUS_LABEL[o.status]}, so the address is locked.` };
        }
        actions.push({ type: "address", orderId: o.id, note: newAddress, address: newAddress, highRisk: true });
        push("update_shipping_address", "Updating shipping address", `${o.id} · verification sent`);
        return { ok: true, requiresOtp: true, note: "A one-time passcode was sent to the customer's phone." };
      },
    }),
    cancel_order: tool({
      description: "Cancel an order. High risk: only after the customer clearly confirms.",
      inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
      execute: async ({ orderId, reason }) => {
        const o = find(orders, orderId);
        if (!o) {
          push("cancel_order", "Cancellation failed", "Order not found", true);
          return { error: "Order not found." };
        }
        if (!canCancel(o)) {
          push("cancel_order", "Cancellation blocked", `${o.id} is ${STATUS_LABEL[o.status]}`, true);
          return { error: `Cannot cancel: order is ${STATUS_LABEL[o.status]}.` };
        }
        actions.push({ type: "cancel", orderId: o.id, note: reason, highRisk: true });
        push("cancel_order", "Cancelling order", `${o.id} · refund ${formatINR(o.amount)}`);
        return { ok: true, requiresOtp: true, refund: o.amount, refundEta: "3-5 business days" };
      },
    }),
    process_return: tool({
      description: "Start a return for a delivered order. High risk: only after the customer confirms.",
      inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
      execute: async ({ orderId, reason }) => {
        const o = find(orders, orderId);
        if (!o) {
          push("process_return", "Return failed", "Order not found", true);
          return { error: "Order not found." };
        }
        if (!canReturn(o)) {
          push("process_return", "Return blocked", `${o.id} is ${STATUS_LABEL[o.status]}`, true);
          return { error: "Returns are only possible after delivery." };
        }
        actions.push({ type: "return", orderId: o.id, note: reason, highRisk: true });
        push("process_return", "Creating return", `${o.id} · pickup scheduled`);
        return { ok: true, requiresOtp: true, pickup: "Tomorrow, 10 AM - 6 PM", refund: o.amount };
      },
    }),
    reschedule_delivery: tool({
      description: "Reschedule the delivery date of an order that is not yet delivered.",
      inputSchema: z.object({ orderId: z.string(), date: z.string() }),
      execute: async ({ orderId, date }) => {
        const o = find(orders, orderId);
        if (!o) {
          push("reschedule_delivery", "Reschedule failed", "Order not found", true);
          return { error: "Order not found." };
        }
        actions.push({ type: "reschedule", orderId: o.id, note: date });
        push("reschedule_delivery", "Rescheduling delivery", `${o.id} → ${date}`);
        return { ok: true, newEta: date };
      },
    }),
    request_human_handoff: tool({
      description:
        "Hand the call to a human supervisor when the request is out of scope, the customer is frustrated, or they insist.",
      inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
      execute: async ({ orderId, reason }) => {
        actions.push({ type: "escalate", orderId, note: reason });
        push("request_human_handoff", "Escalating to human", reason);
        return { ok: true, waitTime: "under 2 minutes" };
      },
    }),
  };
}
