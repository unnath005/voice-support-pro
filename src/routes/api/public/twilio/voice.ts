import { createFileRoute } from "@tanstack/react-router";
import { twimlResponse, verifyWebhookToken, xml } from "@/lib/twilio.server";

const HOLD_MUSIC = "http://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3";

/**
 * Twilio calls this when someone dials the support number.
 * The caller is matched against the customer database, put into the live
 * agent queue, and held with music until an agent bridges the call.
 */
export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyWebhookToken(request)) return new Response("Forbidden", { status: 403 });
        const form = await request.formData();
        const callSid = String(form.get("CallSid") ?? "");
        const from = String(form.get("From") ?? "").slice(0, 32);
        const to = String(form.get("To") ?? "").slice(0, 32);
        if (!callSid) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id, name")
          .eq("phone", from)
          .maybeSingle();

        const { data: session } = await supabaseAdmin
          .from("handoff_sessions")
          .insert({
            customer_name: customer?.name ?? "Unknown caller",
            customer_phone: from,
            customer_id: customer?.id ?? null,
            issue: "Inbound phone call to the support line",
            channel: "phone",
            twilio_call_sid: callSid,
            state: "handoff_requested",
            transcript: [{ role: "system", text: `Phone call from ${from}` }],
          })
          .select("id")
          .single();

        await supabaseAdmin.from("phone_calls").upsert(
          {
            direction: "inbound",
            kind: "inbound",
            from_number: from,
            to_number: to,
            customer_id: customer?.id ?? null,
            session_id: session?.id ?? null,
            twilio_call_sid: callSid,
            status: "queued",
          },
          { onConflict: "twilio_call_sid" },
        );

        const greeting = customer
          ? `Hello ${customer.name}. Thanks for calling. Connecting you to a support specialist now.`
          : "Thanks for calling customer support. Connecting you to a support specialist now.";
        return twimlResponse(
          `<Say voice="Polly.Aditi">${xml(greeting)}</Say><Play loop="0">${HOLD_MUSIC}</Play>`,
        );
      },
    },
  },
});
