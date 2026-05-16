import type { APIRoute } from "astro";
import { jsonError } from "../../../lib/api/json";
import { apiErrorMessage } from "../../../i18n/en";

export const prerender = false;

/** @deprecated Couple sign-in uses POST /api/auth/magic-link on /guest. */
export const POST: APIRoute = async () => {
  return jsonError(
    "use_guest_login",
    410,
    apiErrorMessage("use_guest_login")
  );
};
