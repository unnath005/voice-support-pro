import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

/* ---- Public tool/function schemas (shared contract with the voice agent) ---- */

export const AddItemToOrderSchema = z.object({
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number(),
});

export const UpdateShippingAddressSchema = z.object({
  orderId: z.string(),
  newAddress: z.string(),
});

export const ProcessReturnSchema = z.object({
  orderId: z.string(),
  reason: z.string(),
});

export const RequestHumanHandoffSchema = z.object({
  orderId: z.string(),
  reason: z.string(),
});

export type AddItemToOrderInput = z.infer<typeof AddItemToOrderSchema>;
export type UpdateShippingAddressInput = z.infer<typeof UpdateShippingAddressSchema>;
export type ProcessReturnInput = z.infer<typeof ProcessReturnSchema>;
export type RequestHumanHandoffInput = z.infer<typeof RequestHumanHandoffSchema>;

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  orders: z.array(z.any()),
});

export const runAgentTurn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { handleAgentTurn } = await import("./agent-run.server");
    return handleAgentTurn(data.messages, data.orders as never);
  });

const SummaryInputSchema = z.object({
  transcript: z.array(MessageSchema).min(1),
});

export const summarizeCall = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummaryInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { handleCallSummary } = await import("./agent-run.server");
    return handleCallSummary(data.transcript);
  });
