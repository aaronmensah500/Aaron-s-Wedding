/**
 * Temporary debug endpoint — remove after email is confirmed working.
 * GET /api/test-email?to=you@example.com
 * Requires admin PIN: ?pin=YOUR_PIN
 */
import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const pin = url.searchParams.get("pin") || "";
  const to = url.searchParams.get("to") || "";

  // Basic auth — require the admin PIN
  const expectedPin = import.meta.env.RESEND_API_KEY ? "ok" : "";
  const adminPin = "121226"; // fallback check
  if (pin !== adminPin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return new Response(JSON.stringify({ error: "Provide ?to=valid@email.com" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set on server" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Test email — Aaron & Princess wedding site",
    html: `<p>This is a test email sent from <strong>${from}</strong> to confirm Resend is working correctly.</p><p>If you received this, email sending is configured correctly. ✅</p>`,
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, from, to, error }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true, from, to, id: data?.id }), { status: 200, headers: { "Content-Type": "application/json" } });
};
