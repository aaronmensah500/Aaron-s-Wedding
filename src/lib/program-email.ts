import type { SupabaseClient } from "@supabase/supabase-js";
import { WEDDING_SLUG } from "./weddingSlug";

/**
 * Programme email — rendered from the LIVE published site content, so whatever
 * the couple edits in the site editor is exactly what guests receive.
 */

export type ProgramLead = { role?: string; name?: string };
export type ProgramServiceRow = { item?: string; by?: string };

export type ProgramContent = {
  heading?: string;
  betweenLabel?: string;
  coupleNames?: string;
  dateLabel?: string;
  dateValue?: string;
  timeLabel?: string;
  timeValue?: string;
  venueLabel?: string;
  venueValue?: string;
  leads?: ProgramLead[];
  serviceTitle?: string;
  service?: ProgramServiceRow[];
  ministersTitle?: string;
  ministers?: string[];
  supportTitle?: string;
  support?: string[];
  photoTitle?: string;
  photoLede?: string;
  photography?: string[];
  closingNote?: string;
};

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function esc(v: unknown): string {
  return s(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Read the published programme from Supabase. Returns null when unpublished. */
export async function fetchPublishedProgram(
  service: SupabaseClient
): Promise<ProgramContent | null> {
  const { data, error } = await service
    .from("wedding_site_content")
    .select("content")
    .eq("wedding_slug", WEDDING_SLUG)
    .maybeSingle();

  if (error || !data?.content) return null;
  const content = data.content as Record<string, unknown>;
  const program = content.program;
  if (!program || typeof program !== "object") return null;
  return program as ProgramContent;
}

const GOLD = "#B8964B";
const INK = "#2A0A0E";
const PAPER = "#F6ECD8";
const SHELL = "#EFE2C9";

function factCell(label: string, value: string): string {
  if (!value) return "";
  return `<td align="center" style="padding:0 10px;">
    <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:rgba(42,10,14,0.5);">${esc(label)}</p>
    <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:${INK};">${esc(value)}</p>
  </td>`;
}

function serviceRows(rows: ProgramServiceRow[]): string {
  return rows
    .map((r, i) => {
      const item = esc(r.item);
      if (!item) return "";
      const by = esc(r.by);
      return `<tr>
        <td width="26" valign="top" style="padding:9px 0;font-family:'Courier New',monospace;font-size:10px;color:${GOLD};">${String(i + 1).padStart(2, "0")}</td>
        <td style="padding:9px 0;border-bottom:1px solid rgba(42,10,14,0.08);">
          <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:${INK};">${item}</p>
          ${by ? `<p style="margin:3px 0 0;font-family:Arial,sans-serif;font-size:12px;color:rgba(42,10,14,0.6);">${by}</p>` : ""}
        </td>
      </tr>`;
    })
    .join("");
}

function nameList(title: string, names: string[]): string {
  const items = names.map(esc).filter(Boolean);
  if (!items.length) return "";
  return `<tr><td style="padding:26px 40px 0;">
    <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:${GOLD};">${esc(title)}</p>
    ${items
      .map(
        n =>
          `<p style="margin:0;padding:6px 0;border-bottom:1px solid rgba(42,10,14,0.08);font-family:Georgia,serif;font-size:15px;color:${INK};">${n}</p>`
      )
      .join("")}
  </td></tr>`;
}

export function programHtml(p: ProgramContent, siteUrl: string): string {
  const leads = arr<ProgramLead>(p.leads)
    .map(l => {
      const role = esc(l.role);
      const name = esc(l.name);
      if (!role && !name) return "";
      return `<td align="center" style="padding:0 10px;">
        <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.24em;text-transform:uppercase;color:${GOLD};">${role}</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:${INK};">${name}</p>
      </td>`;
    })
    .join("");

  const photos = arr<string>(p.photography).map(esc).filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Order of Service — Aaron &amp; Princess</title></head>
<body style="margin:0;padding:0;background:${SHELL};font-family:Georgia,serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${SHELL};padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:600px;background:${PAPER};border:1px solid rgba(42,10,14,0.12);">

  <tr><td align="center" style="padding:44px 40px 0;">
    <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(42,10,14,0.5);">The Programme</p>
    <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:300;font-size:26px;line-height:1.3;color:${INK};">${esc(p.heading) || "The Celebration of Holy Matrimony"}</h1>
    <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:${GOLD};">${esc(p.betweenLabel) || "Between"}</p>
    <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:20px;line-height:1.35;color:${INK};">${esc(p.coupleNames)}</p>
  </td></tr>

  <tr><td style="padding:0 40px;">
    <table role="presentation" width="100%" style="border-top:1px solid rgba(217,178,107,0.45);border-bottom:1px solid rgba(217,178,107,0.45);"><tr>
      ${factCell(s(p.dateLabel) || "Date", s(p.dateValue))}
      ${factCell(s(p.timeLabel) || "Time", s(p.timeValue))}
    </tr></table>
    ${s(p.venueValue) ? `<p style="margin:14px 0 0;text-align:center;font-family:Georgia,serif;font-size:16px;color:${INK};">${esc(p.venueValue)}</p>` : ""}
  </td></tr>

  ${leads ? `<tr><td style="padding:22px 40px 0;"><table role="presentation" width="100%"><tr>${leads}</tr></table></td></tr>` : ""}

  <tr><td style="padding:30px 40px 0;">
    <h2 style="margin:0 0 8px;text-align:center;font-family:Georgia,serif;font-weight:300;font-size:22px;color:${INK};">${esc(p.serviceTitle) || "Order of Service"}</h2>
    <table role="presentation" width="100%">${serviceRows(arr<ProgramServiceRow>(p.service))}</table>
  </td></tr>

  ${nameList(s(p.ministersTitle) || "Officiating Ministers", arr<string>(p.ministers))}
  ${nameList(s(p.supportTitle) || "Supported by", arr<string>(p.support))}

  ${
    photos.length
      ? `<tr><td style="padding:26px 40px 0;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:${GOLD};">${esc(p.photoTitle) || "Order of Photography"}</p>
          ${s(p.photoLede) ? `<p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:12px;color:rgba(42,10,14,0.6);">${esc(p.photoLede)}</p>` : ""}
          ${photos
            .map(
              (n, i) =>
                `<p style="margin:0;padding:5px 0;font-family:Arial,sans-serif;font-size:13px;color:${INK};"><span style="color:${GOLD};font-family:'Courier New',monospace;font-size:10px;">${i + 1}.</span>&nbsp; ${n}</p>`
            )
            .join("")}
        </td></tr>`
      : ""
  }

  ${
    s(p.closingNote)
      ? `<tr><td align="center" style="padding:26px 40px 0;">
          <p style="margin:0;padding-top:20px;border-top:1px solid rgba(42,10,14,0.08);font-family:Georgia,serif;font-size:16px;line-height:1.55;color:${INK};">${esc(p.closingNote)}</p>
        </td></tr>`
      : ""
  }

  ${
    siteUrl
      ? `<tr><td align="center" style="padding:30px 40px;">
          <a href="${esc(siteUrl)}/program" style="display:inline-block;padding:13px 32px;background:${INK};color:${PAPER};font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;text-decoration:none;">View online →</a>
        </td></tr>`
      : `<tr><td style="padding:0 0 30px;"></td></tr>`
  }

  <tr><td align="center" style="padding:20px 40px 34px;border-top:1px solid rgba(217,178,107,0.4);">
    <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:rgba(42,10,14,0.4);">Aaron &amp; Princess · 29 · 08 · 2026 · Accra</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function programText(p: ProgramContent, siteUrl: string): string {
  const L: string[] = [];
  L.push(s(p.heading) || "The Celebration of Holy Matrimony");
  if (s(p.coupleNames)) L.push(s(p.coupleNames));
  L.push("");
  if (s(p.dateValue)) L.push(`${s(p.dateLabel) || "Date"}: ${s(p.dateValue)}`);
  if (s(p.timeValue)) L.push(`${s(p.timeLabel) || "Time"}: ${s(p.timeValue)}`);
  if (s(p.venueValue)) L.push(`${s(p.venueLabel) || "Venue"}: ${s(p.venueValue)}`);

  for (const l of arr<ProgramLead>(p.leads)) {
    if (s(l.role) || s(l.name)) L.push(`${s(l.role)}: ${s(l.name)}`);
  }

  const service = arr<ProgramServiceRow>(p.service).filter(r => s(r.item));
  if (service.length) {
    L.push("", (s(p.serviceTitle) || "ORDER OF SERVICE").toUpperCase());
    service.forEach((r, i) => {
      L.push(`${String(i + 1).padStart(2, "0")}. ${s(r.item)}${s(r.by) ? ` — ${s(r.by)}` : ""}`);
    });
  }

  const push = (title: string, names: string[]) => {
    const items = names.map(s).filter(Boolean);
    if (!items.length) return;
    L.push("", title.toUpperCase(), ...items);
  };
  push(s(p.ministersTitle) || "Officiating Ministers", arr<string>(p.ministers));
  push(s(p.supportTitle) || "Supported by", arr<string>(p.support));

  const photos = arr<string>(p.photography).map(s).filter(Boolean);
  if (photos.length) {
    L.push("", (s(p.photoTitle) || "ORDER OF PHOTOGRAPHY").toUpperCase());
    photos.forEach((n, i) => L.push(`${i + 1}. ${n}`));
  }

  if (s(p.closingNote)) L.push("", s(p.closingNote));
  if (siteUrl) L.push("", `View online: ${siteUrl}/program`);
  L.push("", "With love,", "Aaron & Princess · 29 · 08 · 2026 · Accra");
  return L.join("\n");
}

export const PROGRAM_SUBJECT = "The order of service — Aaron & Princess · 29 Aug 2026";
