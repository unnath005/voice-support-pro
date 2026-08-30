import { supabase } from "@/integrations/supabase/client";

/** Lifecycle of a support call, shared by the customer console and the agent desk. */
export type CallState =
  | "ai_active"
  | "handoff_requested"
  | "connecting"
  | "human_connected"
  | "call_ended"
  | "no_agents"
  | "callback_requested";

export const CALL_STATE_LABEL: Record<CallState, string> = {
  ai_active: "AI ACTIVE",
  handoff_requested: "HANDOFF REQUESTED",
  connecting: "CONNECTING",
  human_connected: "HUMAN CONNECTED",
  call_ended: "CALL ENDED",
  no_agents: "NO AGENTS AVAILABLE",
  callback_requested: "CALLBACK REQUESTED",
};

export type TranscriptLine = { role: "customer" | "vera" | "system" | "tool"; text: string };

export type HandoffSession = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  order_id: string | null;
  order_status: string | null;
  issue: string | null;
  transcript: TranscriptLine[];
  sentiment: string;
  actions: string[];
  failures: string[];
  orders: { id: string; item: string; status: string; amount: number }[];
  state: CallState;
  agent_name: string | null;
  created_at: string;
  connected_at: string | null;
  ended_at: string | null;
};

export type NewHandoff = Omit<
  HandoffSession,
  "id" | "created_at" | "connected_at" | "ended_at" | "agent_name" | "state"
>;

export async function createHandoffSession(payload: NewHandoff) {
  const { data, error } = await supabase
    .from("handoff_sessions")
    .insert({ ...payload, state: "handoff_requested" } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as HandoffSession;
}

export async function patchHandoffSession(id: string, patch: Partial<HandoffSession>) {
  const { error } = await supabase
    .from("handoff_sessions")
    .update(patch as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listWaitingSessions() {
  const { data, error } = await supabase
    .from("handoff_sessions")
    .select("*")
    .in("state", ["handoff_requested", "connecting", "human_connected", "callback_requested"])
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HandoffSession[];
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
