import type { APIRoute } from "astro";
import { authorizeAdminRequest } from "../../../lib/adminAuthServer";
import { WEDDING_SLUG } from "../../../lib/guest-access";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../lib/api/json";
import { apiErrorMessage } from "../../../i18n/en";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization") ?? "";
  if (!(await authorizeAdminRequest(auth))) {
    return jsonError("unauthorized", 403, apiErrorMessage("unauthorized"));
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  const { data, error } = await service
    .from("rsvps")
    .select(
      "id,email,full_name,attendance,events,guests,diet,song,note,status,created_at,updated_at,login_token_hash"
    )
    .eq("wedding_slug", WEDDING_SLUG)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  const guests = (data ?? []).map(row => {
    const { login_token_hash, ...rest } = row as Record<string, unknown> & { login_token_hash?: string | null };
    return { ...rest, has_login_token: Boolean(login_token_hash) };
  });

  return jsonOk({ guests });
};
