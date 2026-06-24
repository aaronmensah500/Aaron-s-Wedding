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
  party_names?: string[];
};

/**
 * True when the error is "column <name> does not exist / not in schema cache"
 * for the SPECIFIC column. PostgREST/Postgres always name the missing column in
 * the message, so we require that — checking the code alone would match any
 * missing column and confuse one optional column for another.
 */
function isMissingColumn(error: PostgrestError | null, column: string): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  if (!msg.includes(column.toLowerCase())) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("column") ||
    msg.includes("schema cache")
  );
}

function isMissingStatusColumn(error: PostgrestError | null): boolean {
  return isMissingColumn(error, "status");
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
  const conflict = { onConflict: "wedding_slug,email" } as const;
  const payload: Record<string, unknown> = { ...row };

  let result = await service.from("rsvps").upsert(payload, conflict);
  if (!result.error) return { ok: true, hasStatusColumn: true };

  // party_names is a newer column — if the migration hasn't run, drop it and retry.
  if (isMissingColumn(result.error, "party_names")) {
    delete payload.party_names;
    result = await service.from("rsvps").upsert(payload, conflict);
    if (!result.error) return { ok: true, hasStatusColumn: true };
  }

  // status is also optional on older schemas — drop it and retry.
  if (isMissingStatusColumn(result.error) && row.status !== undefined) {
    delete payload.status;
    result = await service.from("rsvps").upsert(payload, conflict);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, hasStatusColumn: false };
  }

  return { ok: false, error: result.error };
}
