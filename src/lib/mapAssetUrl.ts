/**
 * Safe https URL for <img src> / map link href from site editor (no scheme tricks, no credentials).
 */
export function isSafeHttpsAssetUrl(raw: string | undefined): boolean {
  const s = (raw ?? "").trim();
  if (!s || s.length > 4000) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    return Boolean(
      u.hostname && (u.hostname.includes(".") || u.hostname === "localhost")
    );
  } catch {
    return false;
  }
}
