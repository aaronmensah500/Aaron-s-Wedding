import type { APIRoute } from "astro";
import { authorizeAdminRequest } from "../../../../lib/adminAuthServer";
import { WEDDING_SLUG, normalizeEmail } from "../../../../lib/guest-access";
import { getServiceSupabase } from "../../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../../lib/api/json";
import { apiErrorMessage } from "../../../../i18n/en";

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

  let query = service.from("rsvps").update({
    status: "rejected",
    updated_at: new Date().toISOString(),
  }).eq("wedding_slug", WEDDING_SLUG);

  if (id) query = query.eq("id", id);
  else query = query.eq("email", email);

  const { error } = await query;
  if (error) {
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  return jsonOk({ status: "rejected" });
};
