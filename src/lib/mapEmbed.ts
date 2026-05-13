/**
 * Sanitize editable map iframe `src` values: trim, decode common HTML entities,
 * extract `src="..."` when the editor pastes a full iframe tag.
 */
export function normalizeMapEmbedUrl(raw: string | undefined): string {
  let s = (raw ?? "").trim();
  if (!s) return "";
  s = s.replace(/&amp;/gi, "&").replace(/&#38;/g, "&");
  const m = s.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (m) s = m[1].trim();
  return s.replace(/&amp;/gi, "&").replace(/&#38;/g, "&");
}

function isGoogleMapsEmbedUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    const okHost =
      host === "maps.google.com" ||
      host === "www.google.com" ||
      host === "google.com";
    if (!okHost) return false;
    return u.pathname.startsWith("/maps/embed");
  } catch {
    return false;
  }
}

/** OSM “Export” embed (no API key). Host/path allowlist only. */
function isOpenStreetMapEmbedUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host !== "www.openstreetmap.org") return false;
    if (u.pathname !== "/export/embed.html") return false;
    return u.searchParams.has("bbox");
  } catch {
    return false;
  }
}

/** uMap (draw your own map on OSM) — Share → embed iframe `src`. */
function isUmapEmbedUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (!h.endsWith("umap.openstreetmap.fr")) return false;
    return u.pathname.includes("/map/");
  } catch {
    return false;
  }
}

function isWazeEmbedUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    return u.hostname.toLowerCase() === "embed.waze.com";
  } catch {
    return false;
  }
}

function isBingMapsEmbedUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h !== "www.bing.com" && h !== "bing.com") return false;
    return u.pathname.toLowerCase().startsWith("/maps/embed");
  } catch {
    return false;
  }
}

/** MapTiler Cloud viewer / embed (`api.maptiler.com/maps/…`). */
export function isMapTilerCloudMapUrl(raw: string | undefined): boolean {
  const s = normalizeMapEmbedUrl(raw);
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    if (u.hostname.toLowerCase() !== "api.maptiler.com") return false;
    return u.pathname.startsWith("/maps/");
  } catch {
    return false;
  }
}

/** Map id segment from `/maps/{id}/…` (UUID style map or preset id like `streets`). */
export function extractMapTilerMapIdFromEmbedSrc(raw: string | undefined): string | null {
  const s = normalizeMapEmbedUrl(raw);
  if (!isMapTilerCloudMapUrl(s)) return null;
  try {
    const u = new URL(s);
    const m = u.pathname.match(/^\/maps\/([^/]+)/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function isMapTilerEmbedUrl(s: string): boolean {
  return isMapTilerCloudMapUrl(s);
}

/** True when the URL may be used as an iframe `src` (curated map providers only). */
export function isAllowedMapEmbedUrl(raw: string | undefined): raw is string {
  const s = normalizeMapEmbedUrl(raw);
  if (!s) return false;
  return (
    isGoogleMapsEmbedUrl(s) ||
    isOpenStreetMapEmbedUrl(s) ||
    isUmapEmbedUrl(s) ||
    isWazeEmbedUrl(s) ||
    isBingMapsEmbedUrl(s) ||
    isMapTilerEmbedUrl(s)
  );
}
