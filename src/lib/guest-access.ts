import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowlistedAdminEmail } from "./adminAuthServer";
import { WEDDING_SLUG } from "./weddingConstants";

export { WEDDING_SLUG };

export type RsvpStatus = "pending" | "approved" | "rejected";

export type RsvpRecord = {
  id: string;
  email: string;
  full_name: string;
  attendance: string;
  events: string[];
  guests: number;
  diet: string[];
  song: string;
  note: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
};

export type MagicLinkEligibility =
  | { ok: true; reason: "host" | "approved_rsvp" | "gift" }
  | { ok: false; reason: "not_found" | "rsvp_pending" | "rsvp_rejected" };

export function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isHostEmail(email: string): boolean {
  return isAllowlistedAdminEmail(email);
}

export async function getRsvpRecord(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<RsvpRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data, error } = await service
    .from("rsvps")
    .select(
      "id,email,full_name,attendance,events,guests,diet,song,note,status,created_at,updated_at"
    )
    .eq("wedding_slug", weddingSlug)
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data as RsvpRecord;
}

async function hasGiftRecord(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const { data, error } = await service
    .from("gifts")
    .select("id")
    .eq("wedding_slug", weddingSlug)
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

/** Whether this email may receive a Supabase magic link. */
export async function canRequestMagicLink(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<MagicLinkEligibility> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, reason: "not_found" };

  if (isHostEmail(normalized)) {
    return { ok: true, reason: "host" };
  }

  if (await hasGiftRecord(service, normalized, weddingSlug)) {
    return { ok: true, reason: "gift" };
  }

  const rsvp = await getRsvpRecord(service, normalized, weddingSlug);
  if (!rsvp) return { ok: false, reason: "not_found" };

  if (rsvp.status === "approved") {
    return { ok: true, reason: "approved_rsvp" };
  }
  if (rsvp.status === "pending") {
    return { ok: false, reason: "rsvp_pending" };
  }
  return { ok: false, reason: "rsvp_rejected" };
}

/** @deprecated Use canRequestMagicLink instead. */
export async function isEmailOnGuestList(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<boolean> {
  const result = await canRequestMagicLink(service, email, weddingSlug);
  return result.ok;
}

export async function resolveSessionRole(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<"host" | "guest" | "gift_only"> {
  const normalized = normalizeEmail(email);
  if (isHostEmail(normalized)) return "host";

  const rsvp = await getRsvpRecord(service, normalized, weddingSlug);
  if (rsvp?.status === "approved") return "guest";

  if (await hasGiftRecord(service, normalized, weddingSlug)) return "gift_only";

  return "guest";
}
