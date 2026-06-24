import type { APIRoute } from "astro";
import { getServiceSupabase } from "../../lib/supabase/service";
import { jsonError, jsonOk } from "../../lib/api/json";
import { rateLimitConsume } from "../../lib/rate-limit";
import { getClientIp } from "../../lib/api/request-meta";
import { serverLog } from "../../lib/server-log";
import { apiErrorMessage, type ApiErrorCode } from "../../i18n/en";
import { WEDDING_SLUG } from "../../lib/guest-access";
import { fetchExistingRsvpStatus, upsertRsvpRow } from "../../lib/rsvp-db";

export const prerender = false;

const RSVP_WINDOW_MS = 15 * 60 * 1000;
const RSVP_MAX_PER_WINDOW = 24;
const MAX_PARTY_SIZE = 5; // lead guest + up to 4 others

type RsvpBody = {
  email?: string;
  full_name?: string;
  attendance?: string;
  events?: string[];
  guests?: number;
  party_names?: string[];
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
  const song = String(body.song || "").slice(0, 500);
  const note = String(body.note || "").slice(0, 4000);

  // Party size only applies when attending. Clamp the headcount to a safe range
  // and keep only the names of the ADDITIONAL guests (lead guest excluded).
  let guests = 1;
  let party_names: string[] = [];
  if (attendance === "yes") {
    const raw = Number(body.guests);
    guests = Number.isFinite(raw) ? Math.min(MAX_PARTY_SIZE, Math.max(1, Math.floor(raw))) : 1;
    party_names = (Array.isArray(body.party_names) ? body.party_names : [])
      .map(n => String(n || "").trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, guests - 1);
  }

  let existingStatus: "pending" | "approved" | "rejected" | null = null;
  try {
    existingStatus = await fetchExistingRsvpStatus(admin, WEDDING_SLUG, email);
  } catch (selErr) {
    serverLog("error", "rsvp_select_failed", {
      ip,
      message: selErr instanceof Error ? selErr.message : String(selErr),
    });
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  const status = existingStatus === "approved" ? "approved" : "pending";

  const saved = await upsertRsvpRow(admin, {
    wedding_slug: WEDDING_SLUG,
    email,
    full_name,
    attendance,
    events,
    guests,
    party_names,
    diet,
    song,
    note,
    status,
    updated_at: new Date().toISOString(),
  });

  if (!saved.ok) {
    serverLog("error", "rsvp_upsert_failed", {
      ip,
      code: saved.error.code,
      message: saved.error.message,
    });
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  if (!saved.hasStatusColumn) {
    serverLog("warn", "rsvp_status_column_missing", {
      ip,
      hint: "Run supabase/migrations/20260517120000_rsvp_approval_status.sql for guest approval workflow",
    });
  }

  return jsonOk({ status: saved.hasStatusColumn ? status : "approved" });
};
