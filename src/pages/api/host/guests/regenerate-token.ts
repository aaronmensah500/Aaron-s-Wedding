import type { APIRoute } from "astro";
import { jsonError } from "../../../../lib/api/json";
import { apiErrorMessage } from "../../../../i18n/en";

export const prerender = false;

/** @deprecated Guests sign in with Supabase email OTP. */
export const POST: APIRoute = async () => {
  return jsonError("use_otp_login", 410, apiErrorMessage("use_otp_login"));
};
