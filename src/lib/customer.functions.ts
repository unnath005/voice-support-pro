import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Exact-match phone lookup for the customer console.
 * Returns only the minimal profile a caller needs to see about themselves —
 * the full customer list stays behind agent-only RLS.
 */
export const getCustomerByPhone = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ phone: z.string().min(8).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("id, name, phone, city, tier, lifetime_value, notes")
      .eq("phone", data.phone.trim())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return customer;
  });
