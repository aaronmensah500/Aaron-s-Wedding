import { createClient } from '@supabase/supabase-js';
import { g as getClientIp, r as rateLimitConsume, j as jsonError, a as apiErrorMessage, b as getServiceSupabase, s as serverLog, c as jsonOk } from './en_DciYQDF_.mjs';

const prerender = false;
const OTP_WINDOW_MS = 15 * 60 * 1e3;
const OTP_MAX_PER_WINDOW = 8;
const POST = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = rateLimitConsume(`magic:${ip}`, OTP_MAX_PER_WINDOW, OTP_WINDOW_MS);
  if (!rl.ok) {
    return jsonError("rate_limited", 429, apiErrorMessage("rate_limited"), {
      "Retry-After": String(Math.ceil(rl.retryAfterMs / 1e3))
    });
  }
  const url = "https://quazpjqzegbikljabkwx.supabase.co";
  const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1YXpwanF6ZWdiaWtsamFia3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTkwOTgsImV4cCI6MjA5NDE3NTA5OH0.xmjbKJ1R2eMLMf8_EB8D8NbrqlyqJgJYf1QgVMXO-JU";
  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_json", 400, apiErrorMessage("invalid_json"));
  }
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("invalid_email", 400, apiErrorMessage("invalid_email"));
  }
  const { data, error } = await service.from("rsvps").select("id").eq("email", email).maybeSingle();
  if (error || !data) {
    return jsonError("not_on_guest_list", 404, apiErrorMessage("not_on_guest_list"));
  }
  const siteUrl = [
    "https://aprincess4aaron.com",
    "https://aprincess4aaron.com"
  ].map((s) => String(s || "").trim().replace(/\/$/, "")).find(Boolean) ?? "";
  const redirect = siteUrl ? `${siteUrl}/` : void 0;
  const pub = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error: signErr } = await pub.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirect
    }
  });
  if (signErr) {
    serverLog("warn", "magic_link_otp_failed", { ip, message: signErr.message });
    return jsonError("otp_send_failed", 400, apiErrorMessage("otp_send_failed"));
  }
  return jsonOk();
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
