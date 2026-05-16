import type { SupabaseClient } from "@supabase/supabase-js";
import { serverLog } from "./server-log";

/** Ensure a Supabase Auth user exists for guest magic-link sign-in. */
export async function provisionAuthUserForEmail(
  admin: SupabaseClient,
  email: string,
  metadata?: { full_name?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: metadata ?? {},
  });
  if (!error) return { ok: true };
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("already") || msg.includes("registered")) return { ok: true };
  serverLog("error", "auth_provision_failed", { email, message: error.message });
  return { ok: false, message: error.message };
}
