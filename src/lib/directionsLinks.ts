/** Google Maps directions (no API key) — opens the app or web with turn-by-turn. */
export function buildGoogleDirectionsUrl(
  destLat: number,
  destLng: number,
  originLat?: number,
  originLng?: number
): string {
  const dest = `destination=${destLat},${destLng}`;
  if (originLat != null && originLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&${dest}`;
  }
  return `https://www.google.com/maps/dir/?api=1&${dest}`;
}
