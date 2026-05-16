import { createHmac, timingSafeEqual } from "node:crypto";

export type PaystackVerifyData = {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer?: { email?: string };
  metadata?: Record<string, unknown>;
};

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string
): boolean {
  if (!signatureHeader?.trim() || !secretKey.trim()) return false;
  const hash = createHmac("sha512", secretKey.trim()).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(hash, "utf8");
    const b = Buffer.from(signatureHeader.trim(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function fetchPaystackTransaction(
  reference: string,
  secretKey: string
): Promise<{ ok: true; data: PaystackVerifyData } | { ok: false; message: string }> {
  const ref = reference.trim();
  if (!ref) return { ok: false, message: "missing_reference" };

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${secretKey.trim()}` },
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, message: "invalid_paystack_response" };
  }

  if (!res.ok || body.status !== true) {
    return { ok: false, message: "verify_failed" };
  }

  const data = body.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") {
    return { ok: false, message: "missing_transaction_data" };
  }

  const status = String(data.status || "");
  if (status !== "success") {
    return { ok: false, message: "payment_not_successful" };
  }

  const customer = data.customer as { email?: string } | undefined;
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : undefined;

  return {
    ok: true,
    data: {
      reference: String(data.reference || ref),
      amount: Number(data.amount) || 0,
      currency: String(data.currency || "GHS").toUpperCase(),
      status,
      customer,
      metadata,
    },
  };
}

export function giftEmailFromTransaction(tx: PaystackVerifyData, fallbackEmail?: string): string {
  const fromCustomer = tx.customer?.email?.trim().toLowerCase();
  if (fromCustomer && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromCustomer)) return fromCustomer;
  const fb = fallbackEmail?.trim().toLowerCase();
  if (fb && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fb)) return fb;
  return "";
}

export function giftNameFromTransaction(tx: PaystackVerifyData): string {
  const meta = tx.metadata;
  if (!meta) return "";
  const name = meta.guest_name ?? meta.guestName;
  return typeof name === "string" ? name.trim().slice(0, 200) : "";
}
