import type { APIRoute } from "astro";
import { authorizeAdminJwt } from "../../../lib/adminAuthServer";
import { jsonError, jsonOk } from "../../../lib/api/json";
import { apiErrorMessage } from "../../../i18n/en";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization") ?? "";
  if (!(await authorizeAdminJwt(auth))) {
    return jsonError("unauthorized", 403, apiErrorMessage("unauthorized"));
  }
  return jsonOk({ ok: true });
};
