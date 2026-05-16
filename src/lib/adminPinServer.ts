import { timingSafeEqual } from "node:crypto";
import { DEFAULT_ADMIN_PIN, DEFAULT_ADMIN_REQUIRE_PIN } from "./adminDefaults";
import { getServiceSupabase } from "./supabase/service";
import { WEDDING_SLUG } from "./weddingSlug";

export type AdminGateConfig = {
  pin: string;
  requirePin: boolean | undefined;
};

export function isAdminPinRequired(requirePin: boolean | undefined): boolean {
  return requirePin !== false;
}

export function adminPinMatches(entered: string, config: AdminGateConfig): boolean {
  if (!isAdminPinRequired(config.requirePin)) return true;
  const a = Buffer.from(String(entered ?? "").trim());
  const b = Buffer.from(String(config.pin ?? "").trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function loadAdminGateConfig(): Promise<AdminGateConfig> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("wedding_site_content")
      .select("content")
      .eq("wedding_slug", WEDDING_SLUG)
      .maybeSingle();

    if (error || !data?.content || typeof data.content !== "object") {
      return { pin: DEFAULT_ADMIN_PIN, requirePin: DEFAULT_ADMIN_REQUIRE_PIN };
    }

    const admin = (data.content as { admin?: { pin?: unknown; requirePin?: unknown } }).admin;
    const requirePin =
      typeof admin?.requirePin === "boolean" ? admin.requirePin : DEFAULT_ADMIN_REQUIRE_PIN;
    return {
      pin: String(admin?.pin ?? DEFAULT_ADMIN_PIN).trim(),
      requirePin,
    };
  } catch {
    return { pin: DEFAULT_ADMIN_PIN, requirePin: DEFAULT_ADMIN_REQUIRE_PIN };
  }
}

/** Legacy env token or editor PIN (Bearer value). */
export async function authorizeAdminBearer(authHeader: string): Promise<boolean> {
  const legacy = import.meta.env.PUBLIC_ADMIN_UPLOAD_TOKEN?.trim();
  const raw = authHeader.trim();
  if (!raw.startsWith("Bearer ")) return false;
  const token = raw.slice(7).trim();

  if (legacy && token === legacy) return true;

  const config = await loadAdminGateConfig();
  return adminPinMatches(token, config);
}
