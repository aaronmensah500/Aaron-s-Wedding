import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = "https://quazpjqzegbikljabkwx.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1YXpwanF6ZWdiaWtsamFia3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU5OTA5OCwiZXhwIjoyMDk0MTc1MDk4fQ.Prk56zq814cCGXv5y-c6eu53x1lJYs2KAEbxCjDTicw";
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

const jsonHeaders = { "Content-Type": "application/json" };
const apiSecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};
function jsonResponse(body, init) {
  const headers = new Headers(jsonHeaders);
  for (const [k, v] of Object.entries(apiSecurityHeaders)) {
    headers.set(k, v);
  }
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}
function jsonOk(data = {}) {
  return jsonResponse({ ok: true, ...data }, { status: 200 });
}
function jsonError(code, status, message, extraHeaders) {
  const body = { error: { code, message } };
  return jsonResponse(body, { status, headers: extraHeaders });
}

const buckets = /* @__PURE__ */ new Map();
function rateLimitConsume(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= max) {
    return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  b.count += 1;
  return { ok: true };
}

function getClientIp(request) {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const ips = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    const last = ips[ips.length - 1];
    if (last) return last;
  }
  return "unknown";
}

function serverLog(level, message, extra) {
  const line = JSON.stringify({
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    message,
    ...extra
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

const apiErrors = {
  server_misconfigured: "Server is not configured for this action.",
  invalid_json: "Request body must be valid JSON.",
  invalid_email: "Please enter a valid email address.",
  invalid_name: "Please enter your full name.",
  invalid_attendance: "Please choose whether you can attend.",
  invalid_guests: "Guest count must be between 1 and 20.",
  save_failed: "Could not save your RSVP. Please try again.",
  auth_provision_failed: "RSVP saved but sign-in could not be set up. Contact the hosts.",
  not_on_guest_list: "That email is not on the RSVP list yet. Complete your RSVP first.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  otp_send_failed: "Could not send the sign-in email. Try again later."
};
function apiErrorMessage(code) {
  if (code in apiErrors) return apiErrors[code];
  return code;
}

export { apiErrorMessage as a, getServiceSupabase as b, jsonOk as c, getClientIp as g, jsonError as j, rateLimitConsume as r, serverLog as s };
