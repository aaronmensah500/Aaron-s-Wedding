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

  const baseCols =
    "id,email,full_name,attendance,events,guests,diet,song,note,status,created_at,updated_at,login_token_hash";
  const selectGuests = (cols: string) =>
    service
      .from("rsvps")
      .select(cols)
      .eq("wedding_slug", WEDDING_SLUG)
      .order("updated_at", { ascending: false });

  // party_names and program_sent_at are newer columns — degrade one at a time so
  // the panel keeps working when a migration is still pending.
  const attempts = [
    `${baseCols},party_names,program_sent_at`,
    `${baseCols},party_names`,
    baseCols,
  ];
  let data: unknown = null;
  let error: { message: string } | null = null;
  for (const cols of attempts) {
    ({ data, error } = (await selectGuests(cols)) as { data: unknown; error: { message: string } | null });
    if (!error) break;
  }
  if (error) {
    return jsonError("save_failed", 500, apiErrorMessage("save_failed"));
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown> & { login_token_hash?: string | null }>;
  const guests = rows.map(row => {
    const { login_token_hash, ...rest } = row;
    return { ...rest, has_login_token: Boolean(login_token_hash) };
  });

  return jsonOk({ guests });
};
