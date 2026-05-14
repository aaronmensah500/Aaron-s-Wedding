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
 * OSM and Carto tile servers block production embedded sites via referrer policy.
 * Esri’s ArcGIS Online tiles are free and don’t restrict by referrer.
 */
export const LEAFLET_FALLBACK_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

export const LEAFLET_FALLBACK_TILE_ATTRIBUTION =
  ‘Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>’;
