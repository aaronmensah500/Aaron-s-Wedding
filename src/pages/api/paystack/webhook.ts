import type { APIRoute } from "astro";
import { giftRowFromPaystackTransaction, upsertGiftRow } from "../../../lib/gifts-db";
import { verifyPaystackWebhookSignature } from "../../../lib/paystack-server";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { serverLog } from "../../../lib/server-log";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = (import.meta.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!secret) {
    serverLog("error", "paystack_webhook_misconfigured", {});
    return new Response("misconfigured", { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!verifyPaystackWebhookSignature(rawBody, signature, secret)) {
    serverLog("warn", "paystack_webhook_bad_signature", {});
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown> };
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (payload.event !== "charge.success" || !payload.data) {
    return new Response("ok", { status: 200 });
  }

  const data = payload.data;
  const status = String(data.status || "");
  if (status !== "success") {
    return new Response("ok", { status: 200 });
  }

  const tx = {
    reference: String(data.reference || ""),
    amount: Number(data.amount) || 0,
    currency: String(data.currency || "GHS").toUpperCase(),
    status,
    customer:
      data.customer && typeof data.customer === "object"
        ? (data.customer as { email?: string })
        : undefined,
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  };

  const row = giftRowFromPaystackTransaction(tx);
  if (!row) {
    serverLog("warn", "paystack_webhook_no_email", { reference: tx.reference });
    return new Response("ok", { status: 200 });
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return new Response("misconfigured", { status: 503 });
  }

  const saved = await upsertGiftRow(service, row);
  if (!saved.ok) {
    serverLog("error", "paystack_webhook_save_failed", { reference: row.reference, message: saved.message });
    return new Response("save failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
};
