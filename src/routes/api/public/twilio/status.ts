import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookToken } from "@/lib/twilio.server";

const FINAL = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);

/** Twilio call progress updates for inbound calls, bridges and callbacks. */
export const Route = createFileRoute("/api/public/twilio/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyWebhookToken(request)) return new Response("Forbidden", { status: 403 });
        const form = await request.formData();
        const callSid = String(form.get("CallSid") ?? "");
        const status = String(form.get("CallStatus") ?? "").slice(0, 32);
        const duration = Number(form.get("CallDuration") ?? 0) || null;
        if (!callSid || !status) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("phone_calls")
          .update({ status, duration_seconds: duration })
          .eq("twilio_call_sid", callSid);

        if (FINAL.has(status)) {
          await supabaseAdmin
            .from("callback_requests")
            .update({
              status: status === "completed" ? "completed" : "failed",
              last_error: status === "completed" ? null : `Call ${status}`,
            })
            .eq("twilio_call_sid", callSid);
          await supabaseAdmin
            .from("handoff_sessions")
            .update({ state: "call_ended", ended_at: new Date().toISOString() })
            .eq("twilio_call_sid", callSid);
        }
        return new Response("ok");
      },
    },
  },
});
