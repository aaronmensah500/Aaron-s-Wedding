/**
 * Decimal coordinates from site JSON (editor strings).
 * @see https://docs.maptiler.com/cloud/api/maps/#raster-xyz-tiles
 */
export function parseCoord(raw: string | undefined): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function mapTiler256RasterUrlTemplate(mapId: string, apiKey: string): string {
  const id = mapId.trim();
  const key = apiKey.trim();
  return `https://api.maptiler.com/maps/${encodeURIComponent(id)}/256/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
}

/**
 * When MapTiler id + key are not set, Leaflet needs a raster basemap.
 * `tile.openstreetmap.org` often responds **403** to embedded production sites (tile usage policy);
 * Carto’s CDN is the usual Leaflet-friendly alternative (OSM data + Carto hosting).
 * @see https://wiki.openstreetmap.org/wiki/Blocked_applications
 */
export const LEAFLET_FALLBACK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

export const LEAFLET_FALLBACK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
