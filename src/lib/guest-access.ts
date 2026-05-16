import type { SupabaseClient } from "@supabase/supabase-js";

export const WEDDING_SLUG = "primary";

/** Email may sign in if they have RSVP'd or contributed a gift. */
export async function isEmailOnGuestList(
  service: SupabaseClient,
  email: string,
  weddingSlug = WEDDING_SLUG
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const { data: rsvp, error: rsvpErr } = await service
    .from("rsvps")
    .select("id")
    .eq("wedding_slug", weddingSlug)
    .eq("email", normalized)
    .maybeSingle();
  if (rsvpErr) return false;
  if (rsvp) return true;

  const { data: gift, error: giftErr } = await service
    .from("gifts")
    .select("id")
    .eq("wedding_slug", weddingSlug)
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();
  if (giftErr) return false;
  return Boolean(gift);
}
