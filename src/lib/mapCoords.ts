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
