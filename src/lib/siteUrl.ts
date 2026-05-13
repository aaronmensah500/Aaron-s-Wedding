/** Client-only: canonical base for QR payloads (no trailing slash). */
export function getPublicSiteBase(): string {
  if (typeof window === "undefined") return "";
  const fromEnv = (import.meta.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
}

/** Full URL for QR codes: explicit https URL from CMS, else this origin + hash. */
export function buildSiteDeepLink(opts: { explicitUrl?: string; hash: "rsvp" | "registry" }): string {
  const e = (opts.explicitUrl || "").trim();
  if (e) return e;
  const base = getPublicSiteBase();
  if (!base) return "";
  const clean = base.replace(/#.*$/, "");
  return `${clean}#${opts.hash}`;
}
