// Server-only Twilio helpers. All credentials stay in environment variables.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export function twilioEnv() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const token = process.env.TWILIO_WEBHOOK_TOKEN;
  const appUrl = (process.env.PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!twilioKey) throw new Error("TWILIO_API_KEY is not configured (connect Twilio)");
  if (!from) throw new Error("TWILIO_PHONE_NUMBER is not configured");
  if (!token) throw new Error("TWILIO_WEBHOOK_TOKEN is not configured");
  if (!appUrl) throw new Error("PUBLIC_APP_URL is not configured");
  return { lovableKey, twilioKey, from, token, appUrl };
}

export async function twilioRequest(path: string, params: Record<string, string>, method = "POST") {
  const { lovableKey, twilioKey } = twilioEnv();
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : new URLSearchParams(params),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Twilio request failed [${res.status}]: ${text}`);
    let msg = text;
    try {
      msg = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* not json */
    }
    throw new Error(`Twilio error ${res.status}: ${msg}`);
  }
  return JSON.parse(text) as Record<string, any>;
}

export function xml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export function twimlResponse(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

/** Constant-time check of the shared token Twilio sends back in webhook URLs. */
export function verifyWebhookToken(request: Request) {
  const expected = process.env.TWILIO_WEBHOOK_TOKEN ?? "";
  const got = new URL(request.url).searchParams.get("key") ?? "";
  if (!expected || got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function statusCallbackUrl() {
  const { appUrl, token } = twilioEnv();
  return `${appUrl}/api/public/twilio/status?key=${encodeURIComponent(token)}`;
}

/** Normalise to E.164; Indian 10-digit numbers get +91. */
export function toE164(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}
