/** Formats derived from `site.weddingDateIso` (single source of truth). */

const ROMAN_ONES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const ROMAN_TENS = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"];
const ROMAN_HUNS = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"];
const ROMAN_THOUS = ["", "M", "MM", "MMM"];

const SPELLED_ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const SPELLED_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

export type WeddingDateFormats = {
  dateDisplayRoman: string;
  navMonoId: string;
  dotDateShort: string;
  spelledLine: string;
  yearRoman: string;
};

export function parseWeddingDateIso(iso: string | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toRomanNumeral(n: number): string {
  if (n <= 0 || n > 3999) return String(n);
  return (
    ROMAN_THOUS[Math.floor(n / 1000)] +
    ROMAN_HUNS[Math.floor((n % 1000) / 100)] +
    ROMAN_TENS[Math.floor((n % 100) / 10)] +
    ROMAN_ONES[n % 10]
  );
}

function spellUnder100(n: number): string {
  if (n < 20) return SPELLED_ONES[n] ?? String(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const base = SPELLED_TENS[tens] ?? String(n);
  return ones ? `${base} ${SPELLED_ONES[ones]}` : base;
}

export function deriveWeddingDateFormats(iso: string | undefined): WeddingDateFormats | null {
  const d = parseWeddingDateIso(iso);
  if (!d) return null;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const yearShort = year % 100;

  return {
    dateDisplayRoman: `${toRomanNumeral(month)} · ${toRomanNumeral(day)} · ${toRomanNumeral(year)}`,
    navMonoId: `No. ${day} · ${month} · ${String(yearShort).padStart(2, "0")}`,
    dotDateShort: `${day} · ${month} · ${String(yearShort).padStart(2, "0")}`,
    spelledLine: `${spellUnder100(month)} · ${spellUnder100(day)} · ${spellUnder100(yearShort)}`,
    yearRoman: toRomanNumeral(year),
  };
}

/** `yyyy-MM-dd` for `<input type="date">` (local calendar day). */
export function toDateInputValue(iso: string | undefined): string {
  const d = parseWeddingDateIso(iso);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `HH:mm` for `<input type="time">` (local time). */
export function toTimeInputValue(iso: string | undefined): string {
  const d = parseWeddingDateIso(iso);
  if (!d) return "16:30";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Build ISO string from local date + time, preserving seconds if `previousIso` had them. */
export function combineLocalDateAndTime(
  dateYmd: string,
  timeHm: string,
  previousIso?: string
): string | null {
  const parts = dateYmd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const [hh = 16, mm = 30] = (timeHm || "16:30").split(":").map(Number);
  if ([hh, mm].some(n => Number.isNaN(n))) return null;

  const prev = parseWeddingDateIso(previousIso);
  const next = new Date(y, m - 1, d, hh, mm, prev?.getSeconds() ?? 0, 0);
  if (Number.isNaN(next.getTime())) return null;
  return next.toISOString();
}

/** Content patches to keep hero/nav copy in sync with the wedding date. */
export function contentPatchesFromWeddingDate(iso: string): {
  site: { weddingDateIso: string };
  hero: { dateDisplay: string };
  nav: { monoId: string };
} | null {
  const formats = deriveWeddingDateFormats(iso);
  if (!formats) return null;
  return {
    site: { weddingDateIso: iso },
    hero: { dateDisplay: formats.dateDisplayRoman },
    nav: { monoId: formats.navMonoId },
  };
}

export function heroDateDisplay(iso: string | undefined, fallback?: string): string {
  return deriveWeddingDateFormats(iso)?.dateDisplayRoman ?? fallback ?? "";
}

export function navMonoId(iso: string | undefined, fallback?: string): string {
  return deriveWeddingDateFormats(iso)?.navMonoId ?? fallback ?? "";
}
