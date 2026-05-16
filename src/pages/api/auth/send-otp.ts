import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { canRequestMagicLink, isHostEmail } from "../../../lib/guest-access";
import { provisionAuthUserForEmail } from "../../../lib/provisionAuthUser";
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
  const rl = rateLimitConsume(`send-otp:${ip}`, OTP_MAX_PER_WINDOW, OTP_WINDOW_MS);
  if (!rl.ok) {
    return jsonError("rate_limited", 429, apiErrorMessage("rate_limited"), {
      "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
    });
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    serverLog("error", "send_otp_misconfigured", { ip });
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

  const eligibility = await canRequestMagicLink(service, email);
  if (!eligibility.ok) {
    if (eligibility.reason === "rsvp_pending") {
      return jsonError("rsvp_pending", 403, apiErrorMessage("rsvp_pending"));
    }
    if (eligibility.reason === "rsvp_rejected") {
      return jsonError("rsvp_rejected", 403, apiErrorMessage("rsvp_rejected"));
    }
    return jsonError("not_on_guest_list", 404, apiErrorMessage("not_on_guest_list"));
  }

  const isHost = isHostEmail(email);
  if (!isHost) {
    await provisionAuthUserForEmail(service, email);
  }

  const pub = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const preferCreate = isHost;
  let signErr = (
    await pub.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: preferCreate,
      },
    })
  ).error;

  if (signErr && !preferCreate) {
    const msg = signErr.message?.toLowerCase() || "";
    if (msg.includes("not found") || msg.includes("signup") || msg.includes("user")) {
      const retry = await pub.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      signErr = retry.error;
    }
  }

  if (signErr) {
    serverLog("warn", "send_otp_failed", { ip, message: signErr.message });
    return jsonError("otp_send_failed", 400, apiErrorMessage("otp_send_failed"));
  }

  return jsonOk({ email });
};
