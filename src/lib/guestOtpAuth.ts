import { getBrowserSupabase, isSupabaseConfigured } from "./supabase/browser";
import { parseApiErrorCode } from "./api/json";
import { apiErrorMessage } from "../i18n/en";

export type SendOtpResult = { ok: true; email: string } | { ok: false; message: string; code?: string };

export async function requestGuestOtp(email: string): Promise<SendOtpResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !isSupabaseConfigured()) {
    return { ok: false, message: apiErrorMessage("invalid_email") };
  }

  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: normalized }),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const code = parseApiErrorCode(j);
    return {
      ok: false,
      code,
      message: code ? apiErrorMessage(code) : "Could not send code.",
    };
  }

  return { ok: true, email: normalized };
}

export type VerifyOtpResult = { ok: true } | { ok: false; message: string };

export async function verifyGuestOtp(email: string, token: string): Promise<VerifyOtpResult> {
  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, message: apiErrorMessage("server_misconfigured") };

  const code = String(token ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, message: apiErrorMessage("invalid_otp") };
  }

  const { error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: "email",
  });

  if (error) {
    return { ok: false, message: apiErrorMessage("otp_verify_failed") };
  }

  return { ok: true };
}
