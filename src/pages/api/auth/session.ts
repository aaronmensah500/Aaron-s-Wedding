import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { isAllowlistedAdminEmail } from "../../../lib/adminAuthServer";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { resolveSessionRole, getRsvpRecord, WEDDING_SLUG } from "../../../lib/guest-access";
import { jsonError, jsonOk } from "../../../lib/api/json";
import { apiErrorMessage } from "../../../i18n/en";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const raw = request.headers.get("Authorization") ?? "";
  if (!raw.startsWith("Bearer ")) {
    return jsonError("unauthorized", 401, apiErrorMessage("unauthorized"));
  }
  const token = raw.slice(7).trim();
  if (!token) {
    return jsonError("unauthorized", 401, apiErrorMessage("unauthorized"));
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) {
    return jsonError("unauthorized", 401, apiErrorMessage("unauthorized"));
  }

  const email = data.user.email.trim().toLowerCase();
  if (isAllowlistedAdminEmail(email)) {
    return jsonOk({ role: "host" as const, email });
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  const rsvp = await getRsvpRecord(service, email, WEDDING_SLUG);
  if (rsvp?.status === "pending") {
    return jsonOk({ role: "pending" as const, email });
  }

  const role = await resolveSessionRole(service, email, WEDDING_SLUG);
  if (role === "host") {
    return jsonOk({ role: "host" as const, email });
  }

  return jsonOk({ role: "guest" as const, email });
};
