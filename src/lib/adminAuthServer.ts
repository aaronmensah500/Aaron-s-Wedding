import { createClient } from "@supabase/supabase-js";
import { authorizeAdminBearer } from "./adminPinServer";

export function parseAdminEditorEmails(): string[] {
  const raw = String(import.meta.env.ADMIN_EDITOR_EMAILS ?? "");
  return raw
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEditorEmailAuthEnabled(): boolean {
  return parseAdminEditorEmails().length > 0;
}

export function isAllowlistedAdminEmail(email: string): boolean {
  const list = parseAdminEditorEmails();
  if (!list.length) return false;
  return list.includes(String(email ?? "").trim().toLowerCase());
}

export async function authorizeAdminJwt(authHeader: string): Promise<boolean> {
  if (!isAdminEditorEmailAuthEnabled()) return false;
  const raw = authHeader.trim();
  if (!raw.startsWith("Bearer ")) return false;
  const token = raw.slice(7).trim();
  if (!token) return false;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) return false;
  return isAllowlistedAdminEmail(data.user.email);
}

/** JWT allowlist (production) or legacy PIN / env tokens (dev fallback). */
export async function authorizeAdminRequest(authHeader: string): Promise<boolean> {
  if (await authorizeAdminJwt(authHeader)) return true;
  return authorizeAdminBearer(authHeader);
}
