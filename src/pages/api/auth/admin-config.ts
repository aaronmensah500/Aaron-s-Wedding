import type { APIRoute } from "astro";
import { isAdminEditorEmailAuthEnabled } from "../../../lib/adminAuthServer";
import { jsonOk } from "../../../lib/api/json";

export const prerender = false;

export const GET: APIRoute = async () => {
  return jsonOk({ emailAuth: isAdminEditorEmailAuthEnabled() });
};
