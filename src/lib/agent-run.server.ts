import { generateText, stepCountIs } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { buildTools, SYSTEM_PROMPT, type AgentAction, type ToolTrace } from "./agent.server";
import type { Order } from "./orders.data";

export async function handleAgentTurn(
  messages: { role: "user" | "assistant"; content: string }[],
  orders: Order[],
) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const gateway = createLovableAiGatewayProvider(key);
  const actions: AgentAction[] = [];
  const trace: ToolTrace[] = [];

  const result = await generateText({
    model: gateway("google/gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages,
    tools: buildTools(orders, actions, trace),
    stopWhen: stepCountIs(12),
  });

  const text =
    result.text?.trim() ||
    "Sorry, I did not catch that. Could you say it once more?";

  return { text, actions, trace };
}
