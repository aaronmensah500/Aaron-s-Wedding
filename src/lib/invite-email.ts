import { Resend } from "resend";
import { serverLog } from "./server-log";

const CEREMONY_TIME = "11:30 AM";
const WEDDING_DATE = "Saturday, 29th August 2026";
const CEREMONY_VENUE = "Agape House, Pawpaw Street, East Legon, Accra";

function partyLine(guests: number): string {
  if (!guests || guests <= 1) return "";
  return `Your party of ${guests} is confirmed. `;
}

function inviteHtml(name: string, siteUrl: string, guests: number): string {
  const firstName = name.split(" ")[0];
  const party = partyLine(guests);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>You're Invited — Aaron & Princess</title>
</head>
<body style="margin:0;padding:0;background:#EFE2C9;font-family:Georgia,serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EFE2C9;padding:48px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#F6ECD8;border:1px solid rgba(42,10,14,0.12);">

      <!-- Header ornament -->
      <tr><td align="center" style="padding:48px 40px 0;border-bottom:1px solid rgba(217,178,107,0.35);">
        <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(42,10,14,0.5);">AN INVITATION</p>
        <h1 style="margin:0 0 4px;font-family:Georgia,serif;font-weight:300;font-size:42px;line-height:1;color:#2A0A0E;letter-spacing:-0.01em;">Aaron</h1>
        <p style="margin:0 0 4px;font-family:Georgia,serif;font-style:italic;font-size:28px;color:#D9B26B;">&amp;</p>
        <h1 style="margin:0 0 32px;font-family:Georgia,serif;font-weight:300;font-size:42px;line-height:1;color:#2A0A0E;letter-spacing:-0.01em;">Princess</h1>
      </td></tr>

      <!-- Personal greeting -->
      <tr><td style="padding:36px 40px 0;">
        <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#6B0F18;">Your place is confirmed</p>
        <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;font-weight:300;color:#2A0A0E;">Dear ${firstName},</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:rgba(42,10,14,0.75);">
          It's official — we would be honoured to have you celebrate with us. ${party}Your invitation is confirmed, and your full details for the day are below. We can't wait to see you there.
        </p>
      </td></tr>

      <!-- Date -->
      <tr><td style="padding:32px 40px 0;">
        <table role="presentation" width="100%" style="border-top:1px solid rgba(217,178,107,0.35);padding-top:24px;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#D9B26B;">The Date</p>
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:300;color:#2A0A0E;">${WEDDING_DATE}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Ceremony -->
      <tr><td style="padding:24px 40px 0;">
        <table role="presentation" width="100%" style="border-top:1px solid rgba(42,10,14,0.08);padding-top:20px;">
          <tr>
            <td width="90" valign="top">
              <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(42,10,14,0.45);">Ceremony</p>
              <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:14px;font-weight:bold;color:#2A0A0E;">${CEREMONY_TIME}</p>
            </td>
            <td style="padding-left:24px;border-left:1px solid rgba(217,178,107,0.4);">
              <p style="margin:0;font-family:Georgia,serif;font-size:16px;font-weight:300;color:#2A0A0E;">${CEREMONY_VENUE}</p>
              <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:13px;color:rgba(42,10,14,0.55);">Formal attire · Please arrive from 11:00 AM</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Dress code -->
      <tr><td style="padding:20px 40px 0;">
        <table role="presentation" width="100%" style="border-top:1px solid rgba(42,10,14,0.08);padding-top:20px;">
          <tr>
            <td width="90" valign="top">
              <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(42,10,14,0.45);">Attire</p>
            </td>
            <td style="padding-left:24px;border-left:1px solid rgba(217,178,107,0.4);">
              <p style="margin:0;font-family:Georgia,serif;font-size:16px;font-weight:300;color:#2A0A0E;">Formal</p>
              <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:13px;color:rgba(42,10,14,0.55);">Wedding colours: Burgundy, Ivory &amp; Champagne</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td align="center" style="padding:36px 40px;">
        <a href="${siteUrl}" style="display:inline-block;padding:14px 36px;background:#2A0A0E;color:#F6ECD8;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;text-decoration:none;">View full details →</a>
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:24px 40px 36px;border-top:1px solid rgba(217,178,107,0.35);">
        <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(42,10,14,0.4);">Aaron &amp; Princess · 29 · 08 · 2026 · Accra</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function declineHtml(name: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>We'll miss you — Aaron & Princess</title></head>
<body style="margin:0;padding:0;background:#EFE2C9;font-family:Georgia,serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EFE2C9;padding:48px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#F6ECD8;border:1px solid rgba(42,10,14,0.12);">
      <tr><td align="center" style="padding:48px 40px 32px;">
        <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(42,10,14,0.5);">RSVP Received</p>
        <h1 style="margin:0 0 28px;font-family:Georgia,serif;font-weight:300;font-size:36px;color:#2A0A0E;">We'll miss you, ${firstName}.</h1>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:rgba(42,10,14,0.75);max-width:400px;">
          Thank you for letting us know. We will be thinking of you on the day — ${WEDDING_DATE} in Accra.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:0 40px 40px;border-top:1px solid rgba(217,178,107,0.35);padding-top:28px;">
        <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(42,10,14,0.4);">Aaron &amp; Princess · 29 · 08 · 2026 · Accra</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function inviteText(name: string, siteUrl: string, guests: number): string {
  const firstName = name.split(" ")[0];
  const party = partyLine(guests);
  return [
    `Dear ${firstName},`,
    ``,
    `Your place at our wedding is confirmed — we would be honoured to have you celebrate with us.${party ? ` ${party.trim()}` : ""}`,
    ``,
    `THE DATE`,
    `${WEDDING_DATE}`,
    ``,
    `CEREMONY · ${CEREMONY_TIME}`,
    `${CEREMONY_VENUE}`,
    `Formal attire · Please arrive from 11:00 AM`,
    ``,
    `Wedding colours: Burgundy, Ivory & Champagne`,
    ``,
    `Full details: ${siteUrl}`,
    ``,
    `With love,`,
    `Aaron & Princess · 29 · 08 · 2026 · Accra`,
  ].join("\n");
}

function declineText(name: string): string {
  const firstName = name.split(" ")[0];
  return [
    `Dear ${firstName},`,
    ``,
    `Thank you for letting us know. We will be thinking of you on the day — ${WEDDING_DATE} in Accra.`,
    ``,
    `With love,`,
    `Aaron & Princess`,
  ].join("\n");
}

export async function sendRsvpEmail(opts: {
  name: string;
  email: string;
  attendance: "yes" | "no";
  siteUrl: string;
  guests?: number;
}): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    serverLog("warn", "invite_email_skipped", { reason: "RESEND_API_KEY not set", email: opts.email });
    return;
  }

  const from =
    import.meta.env.RESEND_FROM_EMAIL || "Aaron & Princess <onboarding@resend.dev>";
  const replyTo = import.meta.env.RESEND_REPLY_TO || undefined;

  serverLog("info", "invite_email_sending", { to: opts.email, from, attendance: opts.attendance });

  const resend = new Resend(apiKey);

  // Multipart (html + text) improves deliverability — HTML-only mail scores as spam.
  const guests = Math.max(1, Number(opts.guests) || 1);
  const payload = opts.attendance === "yes"
    ? {
        subject: "You're invited — Aaron & Princess · 29 Aug 2026",
        html: inviteHtml(opts.name, opts.siteUrl, guests),
        text: inviteText(opts.name, opts.siteUrl, guests),
      }
    : {
        subject: "We'll miss you — Aaron & Princess",
        html: declineHtml(opts.name),
        text: declineText(opts.name),
      };

  const { data, error } = await resend.emails.send({
    from,
    to: opts.email,
    ...(replyTo ? { replyTo } : {}),
    ...payload,
  });

  if (error) {
    serverLog("error", "invite_email_resend_error", { to: opts.email, error: JSON.stringify(error) });
    throw new Error(error.message);
  }

  serverLog("info", "invite_email_sent", { to: opts.email, id: data?.id });
}
