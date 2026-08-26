import type { APIRoute } from "astro";
import { Resend } from "resend";
import { authorizeAdminRequest } from "../../../../lib/adminAuthServer";
import { WEDDING_SLUG, normalizeEmail, isHostEmail } from "../../../../lib/guest-access";
import { getServiceSupabase } from "../../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../../lib/api/json";
import { apiErrorMessage } from "../../../../i18n/en";
import { serverLog } from "../../../../lib/server-log";
import {
  fetchPublishedProgram,
  programHtml,
  programText,
  PROGRAM_SUBJECT,
} from "../../../../lib/program-email";

export const prerender = false;

/** Resend accepts up to 100 messages per batch call. */
const BATCH_SIZE = 100;
/**
 * Guests handled per HTTP request. Keeping this to one batch means the request
 * finishes well inside the serverless time limit no matter how large the guest
 * list is — the client simply calls again while `remaining > 0`.
 */
const MAX_PER_REQUEST = BATCH_SIZE;

type Body = { mode?: "test" | "send"; testEmail?: string; resendAll?: boolean };

type GuestRow = { id: string; email: string; full_name: string | null };

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization") ?? "";
  if (!(await authorizeAdminRequest(auth))) {
    return jsonError("unauthorized", 403, apiErrorMessage("unauthorized"));
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError("invalid_json", 400, apiErrorMessage("invalid_json"));
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonError("server_misconfigured", 503, "RESEND_API_KEY is not set.");
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  // Render from the PUBLISHED programme so guests get exactly what is live.
  const program = await fetchPublishedProgram(service);
  if (!program) {
    return jsonError(
      "save_failed",
      409,
      "No published programme found. Open the site editor and publish before sending."
    );
  }

  const siteUrl = (import.meta.env.PUBLIC_SITE_URL || import.meta.env.DOMAIN || "").replace(/\/$/, "");
  const from = import.meta.env.RESEND_FROM_EMAIL || "Aaron & Princess <onboarding@resend.dev>";
  const replyTo = import.meta.env.RESEND_REPLY_TO || undefined;
  const html = programHtml(program, siteUrl);
  const text = programText(program, siteUrl);
  const resend = new Resend(apiKey);

  const payload = (to: string) => ({
    from,
    to,
    subject: PROGRAM_SUBJECT,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  // ---- Test mode: a single message to a host address only ----
  if (body.mode === "test") {
    const testEmail = normalizeEmail(String(body.testEmail || ""));
    if (!testEmail || !isHostEmail(testEmail)) {
      return jsonError("unauthorized", 400, "Test sends are only allowed to an editor email.");
    }
    const { error } = await resend.emails.send(payload(testEmail));
    if (error) {
      serverLog("error", "program_test_send_failed", { message: error.message });
      return jsonError("save_failed", 502, error.message);
    }
    serverLog("info", "program_test_sent", { to: testEmail });
    return jsonOk({ mode: "test", sent: 1, to: testEmail });
  }

  // ---- Broadcast: approved guests, skipping anyone already sent ----
  let query = service
    .from("rsvps")
    .select("id,email,full_name")
    .eq("wedding_slug", WEDDING_SLUG)
    .eq("status", "approved")
    .order("updated_at", { ascending: true })
    .limit(MAX_PER_REQUEST);

  if (!body.resendAll) query = query.is("program_sent_at", null);

  const { data, error: selErr } = await query;
  if (selErr) {
    // program_sent_at missing → migration not applied yet.
    const msg = (selErr.message || "").toLowerCase();
    if (msg.includes("program_sent_at")) {
      return jsonError(
        "save_failed",
        409,
        "Run the migration supabase/migrations/20260625120000_rsvp_program_sent.sql first."
      );
    }
    return jsonError("save_failed", 500, selErr.message);
  }

  const rows = (data ?? []) as unknown as GuestRow[];
  // De-duplicate by address so a guest never receives it twice in one run.
  const seen = new Set<string>();
  const targets = rows.filter(r => {
    const e = normalizeEmail(r.email);
    if (!e || seen.has(e)) return false;
    seen.add(e);
    return true;
  });

  if (targets.length === 0) {
    return jsonOk({ mode: "send", sent: 0, failed: 0, remaining: 0, done: true });
  }

  // One message per guest — never CC/BCC, so the guest list is never exposed.
  const { data: batchData, error: batchErr } = await resend.batch.send(
    targets.map(t => payload(normalizeEmail(t.email)))
  );

  if (batchErr) {
    serverLog("error", "program_batch_failed", { count: targets.length, message: batchErr.message });
    return jsonError("save_failed", 502, batchErr.message);
  }

  const sentAt = new Date().toISOString();
  const ids = targets.map(t => t.id);
  const { error: stampErr } = await service
    .from("rsvps")
    .update({ program_sent_at: sentAt })
    .in("id", ids);

  if (stampErr) {
    // Mail went out; failing to stamp would cause duplicates on a re-run, so surface it.
    serverLog("error", "program_stamp_failed", { count: ids.length, message: stampErr.message });
    return jsonError(
      "save_failed",
      500,
      `Sent ${targets.length} email(s) but could not record them. Do not re-run: ${stampErr.message}`
    );
  }

  // How many approved guests are still waiting?
  let remaining = 0;
  if (!body.resendAll) {
    const { count } = await service
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("wedding_slug", WEDDING_SLUG)
      .eq("status", "approved")
      .is("program_sent_at", null);
    remaining = count ?? 0;
  }

  serverLog("info", "program_batch_sent", {
    sent: targets.length,
    remaining,
    batchIds: (batchData as { data?: { id: string }[] } | null)?.data?.length ?? 0,
  });

  return jsonOk({
    mode: "send",
    sent: targets.length,
    failed: 0,
    remaining,
    done: remaining === 0,
  });
};
