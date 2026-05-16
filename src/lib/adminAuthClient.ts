import { getBrowserSupabase, isSupabaseConfigured } from "./supabase/browser";
import { readUnlockedAdminPin } from "./siteEditor";

const legacyUploadToken = import.meta.env.PUBLIC_ADMIN_UPLOAD_TOKEN?.trim();
const legacySaveToken = import.meta.env.PUBLIC_SITE_CONTENT_SAVE_TOKEN?.trim();

export type AdminAuthConfig = {
  emailAuth: boolean;
};

export async function fetchAdminAuthConfig(): Promise<AdminAuthConfig> {
  try {
    const res = await fetch("/api/auth/admin-config", { headers: { Accept: "application/json" } });
    const json = (await res.json().catch(() => ({}))) as { emailAuth?: boolean };
    if (!res.ok) return { emailAuth: false };
    return { emailAuth: json.emailAuth === true };
  } catch {
    return { emailAuth: false };
  }
}

export async function verifyAdminSession(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/admin-me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Bearer value for upload / publish (JWT, legacy token, or editor PIN). */
export async function getAdminAuthHeader(): Promise<string | null> {
  if (legacyUploadToken) return `Bearer ${legacyUploadToken}`;
  if (legacySaveToken) return `Bearer ${legacySaveToken}`;

  if (isSupabaseConfigured()) {
    const sb = getBrowserSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const ok = await verifyAdminSession(token);
        if (ok) return `Bearer ${token}`;
      }
    }
  }

  const pin = readUnlockedAdminPin();
  if (pin !== null) return `Bearer ${pin}`;
  return null;
}

export function canAdminUploadSync(): boolean {
  if (legacyUploadToken) return true;
  return readUnlockedAdminPin() !== null;
}
