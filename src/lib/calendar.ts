/** Download a single-event .ics for the wedding (Apple Calendar, Google import, Outlook). */
export function downloadWeddingIcs(filename = "aaron-adaeze-wedding.ics") {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const now = new Date();
  /* 4:30 PM local Accra (GMT / Africa/Accra) → 16:30 UTC */
  const start = new Date(Date.UTC(2026, 11, 12, 16, 30, 0));
  const end = new Date(Date.UTC(2026, 11, 13, 4, 0, 0));
  const fmt = (d: Date) => stamp(d);
  const uid = `aaron-adaeze-20261212@${typeof window !== "undefined" ? window.location.hostname || "wedding" : "wedding"}`;
  const siteLink =
    (import.meta.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aaron & Adaeze//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Aaron & Adaeze — Wedding",
    `DESCRIPTION:Agape House East Legon · Ceremony 4:30 PM GMT\\, reception at El-Wak Sports Stadium.${siteLink ? `\\n${siteLink}` : ""}`,
    "LOCATION:Agape House\\, Lagos Avenue\\, East Legon\\, Accra\\, Ghana",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
