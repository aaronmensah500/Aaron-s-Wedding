/** Download a single-event .ics for the wedding (Apple Calendar, Google import, Outlook). */
export function downloadWeddingIcs(
  filename = "aaron-princess-wedding.ics",
  startInput?: Date | string | null
) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const now = new Date();
  const parsed =
    startInput instanceof Date
      ? startInput
      : typeof startInput === "string"
        ? new Date(startInput)
        : null;
  const start =
    parsed && !Number.isNaN(parsed.getTime())
      ? new Date(
          Date.UTC(
            parsed.getUTCFullYear(),
            parsed.getUTCMonth(),
            parsed.getUTCDate(),
            parsed.getUTCHours(),
            parsed.getUTCMinutes(),
            0
          )
        )
      : new Date(Date.UTC(2026, 11, 12, 16, 30, 0));
  const end = new Date(start.getTime() + 11.5 * 60 * 60 * 1000);
  const fmt = (d: Date) => stamp(d);
  const ymd =
    `${start.getUTCFullYear()}${pad(start.getUTCMonth() + 1)}${pad(start.getUTCDate())}`;
  const uid = `aaron-princess-${ymd}@${typeof window !== "undefined" ? window.location.hostname || "wedding" : "wedding"}`;
  const siteLink =
    (import.meta.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aaron & Princess//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Aaron & Princess — Wedding",
    `DESCRIPTION:Agape House East Legon · Ceremony 11:00 AM GMT\\, reception at El-Wak Sports Stadium.${siteLink ? `\\n${siteLink}` : ""}`,
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
