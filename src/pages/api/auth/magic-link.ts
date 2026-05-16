import type { APIRoute } from "astro";
import { POST as sendOtp } from "./send-otp";

export const prerender = false;

/** @deprecated Use POST /api/auth/send-otp */
export const POST: APIRoute = sendOtp;
