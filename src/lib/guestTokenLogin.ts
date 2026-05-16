import { getBrowserSupabase, isSupabaseConfigured } from "./supabase/browser";
import { parseApiErrorCode } from "./api/json";
import { apiErrorMessage } from "../i18n/en";

export type TokenLoginResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

export async function signInWithGuestToken(token: string): Promise<TokenLoginResult> {
  const trimmed = String(token ?? "").trim();
  if (!trimmed || !isSupabaseConfigured()) {
    return { ok: false, message: apiErrorMessage("invalid_token") };
  }

  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, message: apiErrorMessage("server_misconfigured") };

  const res = await fetch("/api/auth/token-login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: trimmed }),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const code = parseApiErrorCode(j);
    return {
      ok: false,
      code,
      message: code ? apiErrorMessage(code) : "Sign-in failed.",
    };
  }

  const access_token = String(j.access_token ?? "");
  const refresh_token = String(j.refresh_token ?? "");
  if (!access_token || !refresh_token) {
    return { ok: false, message: "Sign-in failed." };
  }

  const { error } = await sb.auth.setSession({ access_token, refresh_token });
  if (error) return { ok: false, message: error.message };

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.hash + (url.search || ""));
  } catch {
    /* ignore */
  }

  return { ok: true };
}

export function readTokenFromLocation(): string | null {
  try {
    const t = new URLSearchParams(window.location.search).get("token");
    return t?.trim() || null;
  } catch {
    return null;
  }
}
