import type { APIRoute } from "astro";
import { authorizeAdminRequest } from "../../../../lib/adminAuthServer";
import { WEDDING_SLUG, normalizeEmail } from "../../../../lib/guest-access";
import { provisionAuthUserForEmail } from "../../../../lib/provisionAuthUser";
import { getServiceSupabase } from "../../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../../lib/api/json";
import { apiErrorMessage } from "../../../../i18n/en";
import { sendRsvpEmail } from "../../../../lib/invite-email";
import { serverLog } from "../../../../lib/server-log";

export const prerender = false;

type Body = { email?: string; id?: string };

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization") ?? "";
  if (!(await authorizeAdminRequest(auth))) {
    return jsonError("unauthorized", 403, apiErrorMessage("unauthorized"));
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError("invalid_json", 400, apiErrorMessage("invalid_json"));
  }

  const id = String(body.id || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  if (!id && !email) {
    return jsonError("invalid_email", 400, apiErrorMessage("invalid_email"));
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  let query = service.from("rsvps").select("id,email,full_name,attendance,guests").eq("wedding_slug", WEDDING_SLUG);
  if (id) query = query.eq("id", id);
  else query = query.eq("email", email);

  const { data: row, error: fetchErr } = await query.maybeSingle();
  if (fetchErr || !row) {
    return jsonError("not_on_guest_list", 404, apiErrorMessage("not_on_guest_list"));
  }

  const { error: upErr } = await service
    .from("rsvps")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (upErr) {
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  const guestEmail = normalizeEmail(String(row.email));
  const provisioned = await provisionAuthUserForEmail(service, guestEmail, {
    full_name: String(row.full_name || ""),
  });
  if (!provisioned.ok) {
    return jsonError("auth_provision_failed", 500, apiErrorMessage("auth_provision_failed"));
  }

  // Send confirmation email after successful approval.
  // IMPORTANT: must be awaited — on serverless (Vercel) the function instance is
  // frozen the moment we return, so a fire-and-forget promise never reaches Resend.
  const siteUrl = (import.meta.env.PUBLIC_SITE_URL || import.meta.env.DOMAIN || "").replace(/\/$/, "");
  const attendance = (row.attendance === "yes" || row.attendance === "no") ? row.attendance : "yes";
  const guests = Math.max(1, Number((row as { guests?: number }).guests) || 1);
  let emailSent = false;
  try {
    await sendRsvpEmail({ name: String(row.full_name || ""), email: guestEmail, attendance, siteUrl, guests });
    emailSent = true;
  } catch (err) {
    // Approval already succeeded — don't fail the request, just log it.
    serverLog("warn", "invite_email_failed", {
      email: guestEmail,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return jsonOk({ email: guestEmail, status: "approved", emailSent });
};
