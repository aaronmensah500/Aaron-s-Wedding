import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type RsvpUpsertRow = {
  wedding_slug: string;
  email: string;
  full_name: string;
  attendance: "yes" | "no";
  events: string[];
  guests: number;
  diet: string[];
  song: string;
  note: string;
  updated_at: string;
  status?: "pending" | "approved" | "rejected";
};

function isMissingStatusColumn(error: PostgrestError | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    (msg.includes("status") && (msg.includes("column") || msg.includes("schema cache")))
  );
}

/** Read RSVP status when the approval migration has been applied. */
export async function fetchExistingRsvpStatus(
  service: SupabaseClient,
  weddingSlug: string,
  email: string
): Promise<"pending" | "approved" | "rejected" | null> {
  const { data, error } = await service
    .from("rsvps")
    .select("status")
    .eq("wedding_slug", weddingSlug)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    if (isMissingStatusColumn(error)) return null;
    throw error;
  }

  const s = data?.status;
  if (s === "approved" || s === "pending" || s === "rejected") return s;
  return null;
}

export async function upsertRsvpRow(
  service: SupabaseClient,
  row: RsvpUpsertRow
): Promise<{ ok: true; hasStatusColumn: boolean } | { ok: false; error: PostgrestError }> {
  const withStatus = { ...row };
  let result = await service.from("rsvps").upsert(withStatus, { onConflict: "wedding_slug,email" });

  if (!result.error) return { ok: true, hasStatusColumn: true };

  if (!isMissingStatusColumn(result.error) || row.status === undefined) {
    return { ok: false, error: result.error };
  }

  const { status: _s, ...withoutStatus } = withStatus;
  result = await service.from("rsvps").upsert(withoutStatus, { onConflict: "wedding_slug,email" });
  if (result.error) return { ok: false, error: result.error };

  return { ok: true, hasStatusColumn: false };
}
