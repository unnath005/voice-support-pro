import { generateText, stepCountIs } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { buildTools, SYSTEM_PROMPT, type AgentAction, type ToolTrace } from "./agent.server";
import type { Order } from "./orders.data";

const MODEL = "google/gemini-3.7-flash";

function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

export async function handleAgentTurn(
  messages: { role: "user" | "assistant"; content: string }[],
  orders: Order[],
) {
  const actions: AgentAction[] = [];
  const trace: ToolTrace[] = [];

  const result = await generateText({
    model: gateway()(MODEL),
    system: SYSTEM_PROMPT,
    messages,
    tools: buildTools(orders, actions, trace),
    stopWhen: stepCountIs(12),
  });

  const text =
    result.text?.trim() || "Sorry, I did not catch that. Could you say it once more?";

  const last = messages[messages.length - 1]?.content ?? "";
  const sentiment = scoreSentiment(last);

  return { text, actions, trace, sentiment };
}

const NEGATIVE =
  /(angry|furious|ridiculous|useless|worst|terrible|awful|frustrat|annoy|unacceptable|complain|refund now|speak to (a )?(human|manager|supervisor)|third time|still not|never again|scam|cheat|pathetic|horrible|late again|waste)/i;
const POSITIVE = /(thank|thanks|great|perfect|awesome|appreciate|lovely|amazing|brilliant|nice one|super)/i;

export function scoreSentiment(text: string): "positive" | "neutral" | "frustrated" {
  if (NEGATIVE.test(text) || /[A-Z]{6,}/.test(text) || (text.match(/!/g)?.length ?? 0) >= 2) return "frustrated";
  if (POSITIVE.test(text)) return "positive";
  return "neutral";
}

export async function handleCallSummary(transcript: { role: "user" | "assistant"; content: string }[]) {
  const body = transcript.map((m) => `${m.role === "user" ? "Customer" : "Vera"}: ${m.content}`).join("\n");

  const result = await generateText({
    model: gateway()(MODEL),
    system:
      "You write concise handoff notes for a human retail support supervisor taking over a live call. Return plain text: one sentence on why they called, one sentence on what the AI agent already did, and one sentence on what the human should do next. No markdown, no bullets.",
    prompt: body,
  });

  return { summary: result.text?.trim() || "No summary available for this call yet." };
}
