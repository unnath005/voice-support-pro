import { z } from "zod";
import { tool } from "ai";
import { STATUS_LABEL, type Order } from "./orders.data";

export type AgentAction = {
  type: "cancel" | "return" | "escalate" | "reschedule";
  orderId: string;
  note: string;
};

export type ToolTrace = { name: string; label: string; detail: string };

export const SYSTEM_PROMPT = `You are "Vera", an autonomous voice agent for a retail brand's customer support line.
You speak to customers over the phone, so your replies are SHORT (1-3 sentences), warm, natural and free of markdown, bullet points, emoji or special characters.

You can act on the customer's behalf: look up orders, track deliveries, cancel orders, start returns, reschedule deliveries and escalate to a human.
Always resolve the order yourself using the tools before answering. If the customer is vague ("where is my stuff"), look up their orders and pick the most likely one, then confirm it out loud by naming the item.
Before a destructive action (cancel or return) you must have a clear yes from the customer in the conversation; if you do not have it, ask one short confirming question instead of calling the tool.
Speak amounts in rupees naturally. Never invent tracking data. If a tool says something is not possible, explain the reason simply and offer the next best option.`;

function find(orders: Order[], id?: string) {
  if (!id) return undefined;
  const needle = id.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return orders.find((o) => o.id.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(needle));
}

function summarize(o: Order) {
  return {
    id: o.id,
    item: o.item,
    qty: o.qty,
    amount: o.amount,
    status: STATUS_LABEL[o.status],
    eta: o.eta,
    courier: o.courier,
    trackingId: o.trackingId,
    placedAt: o.placedAt,
  };
}

export function buildTools(
  orders: Order[],
  actions: AgentAction[],
  trace: ToolTrace[],
) {
  const push = (name: string, label: string, detail: string) => trace.push({ name, label, detail });

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
          orders.find((x) => q.split(" ").some((w) => w.length > 3 && x.item.toLowerCase().includes(w)));
        push("lookup_order", "Looking up order", o ? `${o.id} · ${o.item}` : `No match for "${query}"`);
        return o ? summarize(o) : { error: "No matching order found." };
      },
    }),
    track_delivery: tool({
      description: "Get the live delivery timeline and ETA for an order.",
      inputSchema: z.object({ orderId: z.string() }),
      execute: async ({ orderId }) => {
        const o = find(orders, orderId);
        push("track_delivery", "Tracking shipment", o ? `${o.id} · ${STATUS_LABEL[o.status]}` : "Order not found");
        if (!o) return { error: "Order not found." };
        return {
          ...summarize(o),
          timeline: o.timeline.map((e) => ({ step: e.label, at: e.at, completed: e.done })),
        };
      },
    }),
    cancel_order: tool({
      description: "Cancel an order. Only after the customer clearly confirms.",
      inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
      execute: async ({ orderId, reason }) => {
        const o = find(orders, orderId);
        if (!o) return { error: "Order not found." };
        if (o.status === "delivered" || o.status === "cancelled") {
          push("cancel_order", "Cancellation blocked", `${o.id} is ${STATUS_LABEL[o.status]}`);
          return { error: `Cannot cancel: order is ${STATUS_LABEL[o.status]}.` };
        }
        actions.push({ type: "cancel", orderId: o.id, note: reason });
        push("cancel_order", "Cancelling order", `${o.id} · refund ${o.amount}`);
        return { ok: true, refund: o.amount, refundEta: "3-5 business days" };
      },
    }),
    initiate_return: tool({
      description: "Start a return for a delivered order. Only after the customer confirms.",
      inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
      execute: async ({ orderId, reason }) => {
        const o = find(orders, orderId);
        if (!o) return { error: "Order not found." };
        if (o.status !== "delivered") {
          push("initiate_return", "Return blocked", `${o.id} is ${STATUS_LABEL[o.status]}`);
          return { error: "Returns are only possible after delivery." };
        }
        actions.push({ type: "return", orderId: o.id, note: reason });
        push("initiate_return", "Creating return", `${o.id} · pickup scheduled`);
        return { ok: true, pickup: "Tomorrow, 10 AM - 6 PM", refund: o.amount };
      },
    }),
    reschedule_delivery: tool({
      description: "Reschedule the delivery date of an order that is not yet delivered.",
      inputSchema: z.object({ orderId: z.string(), date: z.string() }),
      execute: async ({ orderId, date }) => {
        const o = find(orders, orderId);
        if (!o) return { error: "Order not found." };
        actions.push({ type: "reschedule", orderId: o.id, note: date });
        push("reschedule_delivery", "Rescheduling delivery", `${o.id} → ${date}`);
        return { ok: true, newEta: date };
      },
    }),
    escalate_to_human: tool({
      description: "Hand the call to a human agent when the request is out of scope or the customer insists.",
      inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
      execute: async ({ orderId, reason }) => {
        actions.push({ type: "escalate", orderId, note: reason });
        push("escalate_to_human", "Escalating to human", reason);
        return { ok: true, waitTime: "under 2 minutes" };
      },
    }),
  };
}
