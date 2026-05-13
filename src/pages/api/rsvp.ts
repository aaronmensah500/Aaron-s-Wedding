import type { APIRoute } from "astro";
import { getServiceSupabase } from "../../lib/supabase/service";
import { jsonError, jsonOk } from "../../lib/api/json";
import { rateLimitConsume } from "../../lib/rate-limit";
import { getClientIp } from "../../lib/api/request-meta";
import { serverLog } from "../../lib/server-log";
import { apiErrorMessage, type ApiErrorCode } from "../../i18n/en";

export const prerender = false;

const RSVP_WINDOW_MS = 15 * 60 * 1000;
const RSVP_MAX_PER_WINDOW = 24;

type RsvpBody = {
  email?: string;
  full_name?: string;
  attendance?: string;
  events?: string[];
  guests?: number;
  diet?: string[];
  song?: string;
  note?: string;
};

function validate(body: RsvpBody): ApiErrorCode | null {
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid_email";
  const name = String(body.full_name || "").trim();
  if (name.length < 2) return "invalid_name";
  if (body.attendance !== "yes" && body.attendance !== "no") return "invalid_attendance";
  const guests = Number(body.guests);
  if (!Number.isFinite(guests) || guests < 1 || guests > 20) return "invalid_guests";
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = rateLimitConsume(`rsvp:${ip}`, RSVP_MAX_PER_WINDOW, RSVP_WINDOW_MS);
  if (!rl.ok) {
    return jsonError("rate_limited", 429, apiErrorMessage("rate_limited"), {
      "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
    } as HeadersInit);
  }

  let admin;
  try {
    admin = getServiceSupabase();
  } catch {
    serverLog("error", "rsvp_misconfigured", { ip });
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  let body: RsvpBody;
  try {
    body = (await request.json()) as RsvpBody;
  } catch {
    return jsonError("invalid_json", 400, apiErrorMessage("invalid_json"));
  }

  const err = validate(body);
  if (err) {
    return jsonError(err, 400, apiErrorMessage(err));
  }

  const email = String(body.email).trim().toLowerCase();
  const full_name = String(body.full_name).trim();
  const attendance = body.attendance as "yes" | "no";
  const events = Array.isArray(body.events) ? body.events.map(String) : [];
  const diet = Array.isArray(body.diet) ? body.diet.map(String) : [];
  const guests = Math.min(20, Math.max(1, Number(body.guests)));
  const song = String(body.song || "").slice(0, 500);
  const note = String(body.note || "").slice(0, 4000);

  const row = {
    wedding_slug: "primary",
    email,
    full_name,
    attendance,
    events,
    guests,
    diet,
    song,
    note,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await admin.from("rsvps").upsert(row, { onConflict: "wedding_slug,email" });
  if (upErr) {
    serverLog("error", "rsvp_upsert_failed", { ip, code: upErr.code, message: upErr.message });
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  const { error: authErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name },
  });

  if (authErr) {
    const msg = authErr.message?.toLowerCase() || "";
    if (!msg.includes("already") && !msg.includes("registered")) {
      serverLog("error", "rsvp_auth_provision_failed", { ip, email, message: authErr.message });
      return jsonError("auth_provision_failed", 500, apiErrorMessage("auth_provision_failed"));
    }
  }

  return jsonOk();
};
