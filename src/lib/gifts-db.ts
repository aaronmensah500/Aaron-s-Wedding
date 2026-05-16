import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaystackVerifyData } from "./paystack-server";
import { giftEmailFromTransaction, giftNameFromTransaction } from "./paystack-server";
import { WEDDING_SLUG } from "./guest-access";

export type GiftUpsertInput = {
  email: string;
  reference: string;
  amountSubunit: number;
  currency: string;
  guestName?: string;
  status?: "success" | "pending" | "failed";
};

export async function upsertGiftRow(
  service: SupabaseClient,
  input: GiftUpsertInput,
  weddingSlug = WEDDING_SLUG
): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = input.email.trim().toLowerCase();
  const reference = input.reference.trim();
  if (!email || !reference || input.amountSubunit < 1) {
    return { ok: false, message: "invalid_gift_row" };
  }

  const { error } = await service.from("gifts").upsert(
    {
      wedding_slug: weddingSlug,
      email,
      reference,
      amount_subunit: input.amountSubunit,
      currency: input.currency.toUpperCase(),
      guest_name: (input.guestName || "").slice(0, 200),
      status: input.status || "success",
    },
    { onConflict: "wedding_slug,reference" }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export function giftRowFromPaystackTransaction(
  tx: PaystackVerifyData,
  fallbackEmail?: string
): GiftUpsertInput | null {
  const email = giftEmailFromTransaction(tx, fallbackEmail);
  if (!email) return null;
  return {
    email,
    reference: tx.reference,
    amountSubunit: Math.max(1, Math.round(tx.amount)),
    currency: tx.currency,
    guestName: giftNameFromTransaction(tx),
    status: "success",
  };
}
