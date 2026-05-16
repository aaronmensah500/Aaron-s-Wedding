import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { isEmailOnGuestList } from "../../../lib/guest-access";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../lib/api/json";
import { rateLimitConsume } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/api/request-meta";
import { serverLog } from "../../../lib/server-log";
import { apiErrorMessage } from "../../../i18n/en";

export const prerender = false;

const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_PER_WINDOW = 8;

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = rateLimitConsume(`magic:${ip}`, OTP_MAX_PER_WINDOW, OTP_WINDOW_MS);
  if (!rl.ok) {
    return jsonError("rate_limited", 429, apiErrorMessage("rate_limited"), {
      "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
    });
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    serverLog("error", "magic_link_misconfigured", { ip });
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return jsonError("invalid_json", 400, apiErrorMessage("invalid_json"));
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("invalid_email", 400, apiErrorMessage("invalid_email"));
  }

  const onList = await isEmailOnGuestList(service, email);
  if (!onList) {
    return jsonError("not_on_guest_list", 404, apiErrorMessage("not_on_guest_list"));
  }

  // Always use the configured site URL for the magic-link redirect.
  // Trusting the Origin header would let an attacker send a spoofed origin
  // and redirect the auth token to a site they control.
  const siteUrl = [
    import.meta.env.PUBLIC_SITE_URL,
    import.meta.env.DOMAIN,
  ]
    .map(s => String(s || "").trim().replace(/\/$/, ""))
    .find(Boolean) ?? "";
  const redirect = siteUrl ? `${siteUrl}/guest` : undefined;

  const pub = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signErr } = await pub.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirect,
    },
  });

  if (signErr) {
    serverLog("warn", "magic_link_otp_failed", { ip, message: signErr.message });
    return jsonError("otp_send_failed", 400, apiErrorMessage("otp_send_failed"));
  }

  return jsonOk();
};
