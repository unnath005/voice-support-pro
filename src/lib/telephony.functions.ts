import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAgent(supabase: any, userId: string) {
  const { data: isAgent } = await supabase.rpc("has_role", { _user_id: userId, _role: "agent" });
  if (!isAgent) throw new Error("Only support agents can place calls.");
  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("display_name, phone")
    .eq("user_id", userId)
    .maybeSingle();
  return profile as { display_name: string; phone: string | null } | null;
}

/** Dial the agent's phone, then connect them to the customer who asked for a callback. */
export const startCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ callbackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { twilioEnv, twilioRequest, statusCallbackUrl, toE164, xml } = await import("./twilio.server");
    const profile = await requireAgent(context.supabase, context.userId);
    if (!profile?.phone) throw new Error("Add your phone number in Settings first.");

    const { data: cb, error } = await context.supabase
      .from("callback_requests")
      .select("*")
      .eq("id", data.callbackId)
      .single();
    if (error || !cb) throw new Error("Callback request not found.");
    if (cb.status === "dialing") throw new Error("This callback is already being dialled.");

    const { from } = twilioEnv();
    const customerPhone = toE164(cb.phone);
    const twiml = `<Response><Say>Connecting you to ${xml(cb.customer_name)}.</Say><Dial callerId="${from}" timeout="30">${xml(customerPhone)}</Dial></Response>`;
    try {
      const call = await twilioRequest("/Calls.json", {
        To: toE164(profile.phone),
        From: from,
        Twiml: twiml,
        StatusCallback: statusCallbackUrl(),
        StatusCallbackEvent: "initiated ringing answered completed",
      });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("phone_calls").insert({
        direction: "outbound",
        kind: "callback",
        from_number: from,
        to_number: customerPhone,
        callback_id: cb.id,
        session_id: cb.session_id,
        agent_id: context.userId,
        twilio_call_sid: call.sid,
        status: call.status ?? "queued",
      });
      await context.supabase
        .from("callback_requests")
        .update({ status: "dialing", agent_id: context.userId, twilio_call_sid: call.sid, last_error: null })
        .eq("id", cb.id);
      return { ok: true, sid: call.sid as string };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Call failed";
      await context.supabase.from("callback_requests").update({ status: "failed", last_error: message }).eq("id", cb.id);
      throw new Error(message);
    }
  });

/** Bridge a caller who is on hold on the support line to the agent's phone. */
export const answerPhoneCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { twilioEnv, twilioRequest, statusCallbackUrl, toE164 } = await import("./twilio.server");
    const profile = await requireAgent(context.supabase, context.userId);
    if (!profile?.phone) throw new Error("Add your phone number in Settings first.");
    const { data: session } = await context.supabase
      .from("handoff_sessions")
      .select("id, twilio_call_sid")
      .eq("id", data.sessionId)
      .single();
    if (!session?.twilio_call_sid) throw new Error("This is not a phone call.");
    const { from } = twilioEnv();
    await twilioRequest(`/Calls/${encodeURIComponent(session.twilio_call_sid)}.json`, {
      Twiml: `<Response><Say>Connecting you now.</Say><Dial callerId="${from}" timeout="30">${toE164(profile.phone)}</Dial><Say>Sorry, the agent could not be reached. Please call again.</Say></Response>`,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("handoff_sessions")
      .update({ state: "human_connected", agent_name: profile.display_name, connected_at: new Date().toISOString() })
      .eq("id", session.id);
    await supabaseAdmin
      .from("phone_calls")
      .update({ agent_id: context.userId, status: "bridging" })
      .eq("twilio_call_sid", session.twilio_call_sid);
    void statusCallbackUrl;
    return { ok: true };
  });

/** Hang up a live phone call from the dashboard. */
export const hangUpPhoneCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ callSid: z.string().min(10).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { twilioRequest } = await import("./twilio.server");
    await requireAgent(context.supabase, context.userId);
    await twilioRequest(`/Calls/${encodeURIComponent(data.callSid)}.json`, { Status: "completed" });
    return { ok: true };
  });

/** Show the support number and point its incoming-call webhook at this app. */
export const getTelephonyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAgent(context.supabase, context.userId);
    try {
      const { twilioEnv, twilioRequest } = await import("./twilio.server");
      const { from, appUrl } = twilioEnv();
      const list = await twilioRequest(
        `/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(from)}`,
        {},
        "GET",
      );
      const num = list.incoming_phone_numbers?.[0];
      const wired = typeof num?.voice_url === "string" && num.voice_url.startsWith(`${appUrl}/api/public/twilio/voice`);
      return { ok: true as const, number: from, wired, appUrl };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Telephony unavailable" };
    }
  });

export const wireSupportNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAgent(context.supabase, context.userId);
    const { twilioEnv, twilioRequest, statusCallbackUrl } = await import("./twilio.server");
    const { from, appUrl, token } = twilioEnv();
    const list = await twilioRequest(`/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(from)}`, {}, "GET");
    const num = list.incoming_phone_numbers?.[0];
    if (!num?.sid) throw new Error("The support number was not found on the Twilio account.");
    await twilioRequest(`/IncomingPhoneNumbers/${num.sid}.json`, {
      VoiceUrl: `${appUrl}/api/public/twilio/voice?key=${encodeURIComponent(token)}`,
      VoiceMethod: "POST",
      StatusCallback: statusCallbackUrl(),
      StatusCallbackMethod: "POST",
    });
    return { ok: true };
  });
