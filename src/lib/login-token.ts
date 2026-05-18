import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowlistedAdminEmail, parseAdminEditorEmails } from "./adminAuthServer";
import { normalizeEmail, WEDDING_SLUG } from "./guest-access";
import { provisionAuthUserForEmail } from "./provisionAuthUser";

export function generateLoginToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashLoginToken(token: string): string {
  return createHash("sha256").update(String(token ?? "").trim()).digest("hex");
}

function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** `email:token` pairs for couple sign-in (server env only). */
export function parseHostLoginTokens(): Map<string, string> {
  const raw = String(import.meta.env.HOST_LOGIN_TOKENS ?? "");
  const map = new Map<string, string>();
  for (const part of raw.split(",")) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const email = normalizeEmail(part.slice(0, idx));
    const token = part.slice(idx + 1).trim();
    if (email && token) map.set(email, hashLoginToken(token));
  }
  return map;
}

export type TokenLoginMatch =
  | { ok: true; email: string; role: "host" | "guest"; fullName?: string }
  | { ok: false; reason: "invalid" | "rsvp_pending" | "rsvp_rejected" | "not_found" };

export async function resolveTokenLogin(
  service: SupabaseClient,
  rawToken: string,
  weddingSlug = WEDDING_SLUG
): Promise<TokenLoginMatch> {
  const trimmed = String(rawToken ?? "").trim();
  if (trimmed.length < 16) return { ok: false, reason: "invalid" };

  const tokenHash = hashLoginToken(trimmed);

  const hostTokens = parseHostLoginTokens();
  for (const [email, hash] of hostTokens) {
    if (tokensEqual(tokenHash, hash) && isAllowlistedAdminEmail(email)) {
      return { ok: true, email, role: "host" };
    }
  }

  const { data: rsvp } = await service
    .from("rsvps")
    .select("email,full_name,status")
    .eq("wedding_slug", weddingSlug)
    .eq("login_token_hash", tokenHash)
    .maybeSingle();

  if (rsvp) {
    const email = normalizeEmail(String(rsvp.email));
    if (rsvp.status === "pending") return { ok: false, reason: "rsvp_pending" };
    if (rsvp.status === "rejected") return { ok: false, reason: "rsvp_rejected" };
    if (rsvp.status === "approved") {
      return { ok: true, email, role: "guest", fullName: String(rsvp.full_name || "") };
    }
  }

  const { data: gift } = await service
    .from("gifts")
    .select("email,guest_name")
    .eq("wedding_slug", weddingSlug)
    .eq("login_token_hash", tokenHash)
    .maybeSingle();

  if (gift) {
    return {
      ok: true,
      email: normalizeEmail(String(gift.email)),
      role: "guest",
      fullName: String(gift.guest_name || ""),
    };
  }

  return { ok: false, reason: "not_found" };
}

export async function assignLoginTokenToRsvp(
  service: SupabaseClient,
  rsvpId: string
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const token = generateLoginToken();
  const { error } = await service
    .from("rsvps")
    .update({ login_token_hash: hashLoginToken(token), updated_at: new Date().toISOString() })
    .eq("id", rsvpId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, token };
}

export async function assignLoginTokenToGiftByEmail(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const token = generateLoginToken();
  const { error } = await service
    .from("gifts")
    .update({ login_token_hash: hashLoginToken(token) })
    .eq("wedding_slug", weddingSlug)
    .eq("email", normalizeEmail(email));
  if (error) return { ok: false, message: error.message };
  return { ok: true, token };
}

async function findUserIdByEmail(service: SupabaseClient, email: string): Promise<string | null> {
  const target = normalizeEmail(email);
  let page = 1;
  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const user = data.users.find(u => normalizeEmail(u.email ?? "") === target);
    if (user?.id) return user.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

export async function createSupabaseSessionForEmail(
  service: SupabaseClient,
  email: string,
  metadata?: { full_name?: string }
): Promise<
  | { ok: true; access_token: string; refresh_token: string; expires_in: number }
  | { ok: false; message: string }
> {
  await provisionAuthUserForEmail(service, email, metadata);

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return { ok: false, message: linkError?.message ?? "Could not generate login link" };
  }

  const { data: sessionData, error: sessionError } = await service.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (sessionError || !sessionData.session) {
    return { ok: false, message: sessionError?.message ?? "Could not create session" };
  }

  return {
    ok: true,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_in: sessionData.session.expires_in ?? 3600,
  };
}

export function hostTokensConfigured(): boolean {
  return parseHostLoginTokens().size > 0 || parseAdminEditorEmails().length > 0;
}
