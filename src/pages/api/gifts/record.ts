import type { APIRoute } from "astro";
import { jsonError, jsonOk } from "../../../lib/api/json";
import { getClientIp } from "../../../lib/api/request-meta";
import { giftRowFromPaystackTransaction, upsertGiftRow } from "../../../lib/gifts-db";
import { provisionAuthUserForEmail } from "../../../lib/provisionAuthUser";
import { fetchPaystackTransaction } from "../../../lib/paystack-server";
import { rateLimitConsume } from "../../../lib/rate-limit";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { serverLog } from "../../../lib/server-log";
import { apiErrorMessage } from "../../../i18n/en";

export const prerender = false;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 30;

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = rateLimitConsume(`gift-record:${ip}`, MAX_PER_WINDOW, WINDOW_MS);
  if (!rl.ok) {
    return jsonError("rate_limited", 429, apiErrorMessage("rate_limited"), {
      "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
    });
  }

  const secret = (import.meta.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!secret) {
    serverLog("error", "gift_record_misconfigured", { ip });
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  let body: { email?: string; reference?: string };
  try {
    body = (await request.json()) as { email?: string; reference?: string };
  } catch {
    return jsonError("invalid_json", 400, apiErrorMessage("invalid_json"));
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const reference = String(body.reference || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("invalid_email", 400, apiErrorMessage("invalid_email"));
  }
  if (!reference) {
    return jsonError("invalid_reference", 400, apiErrorMessage("invalid_reference"));
  }

  const verified = await fetchPaystackTransaction(reference, secret);
  if (!verified.ok) {
    serverLog("warn", "gift_record_verify_failed", { ip, reference, message: verified.message });
    return jsonError("payment_not_verified", 400, apiErrorMessage("payment_not_verified"));
  }

  const row = giftRowFromPaystackTransaction(verified.data, email);
  if (!row || row.email !== email) {
    return jsonError("payment_email_mismatch", 400, apiErrorMessage("payment_email_mismatch"));
  }

  const saved = await upsertGiftRow(service, row);
  if (!saved.ok) {
    serverLog("error", "gift_record_save_failed", { ip, reference, message: saved.message });
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  const provisioned = await provisionAuthUserForEmail(service, email, {
    full_name: row.guestName || "",
  });
  if (!provisioned.ok) {
    serverLog("warn", "gift_auth_provision_failed", { ip, email, message: provisioned.message });
  }

  return jsonOk({ reference: row.reference });
};
