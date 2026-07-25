import { lazy, Suspense } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { isSafeHttpsAssetUrl } from "../../lib/mapAssetUrl";
import {
  extractMapTilerMapIdFromEmbedSrc,
  isAllowedMapEmbedUrl,
  isMapTilerCloudMapUrl,
  normalizeMapEmbedUrl,
} from "../../lib/mapEmbed";
import { parseCoord } from "../../lib/mapCoords";
import { EditableText } from "../editable/EditableText";

const DetailsVenueLeaflet = lazy(() =>
  import("./DetailsVenueLeaflet").then((m) => ({ default: m.DetailsVenueLeaflet }))
);

type VenueDirectionsMapProps = {
  className?: string;
};

/** Interactive ceremony + reception map (Leaflet) or fallbacks from site content `details`. */
export function VenueDirectionsMap({ className = "" }: VenueDirectionsMapProps) {
  const { content, patchContent } = useWeddingContent();
  const d = content.details || {};

  const mapImg = (d.mapImageUrl || "").trim();
  const hasMapImage = isSafeHttpsAssetUrl(mapImg);
  const mapLink = (d.mapImageLinkUrl || "").trim();
  const hasMapLink = isSafeHttpsAssetUrl(mapLink);
  const mapSrc = normalizeMapEmbedUrl(d.mapEmbedUrl);
  const hasMapEmbed = isAllowedMapEmbedUrl(mapSrc);
  const mapTilerIdFromEmbed = extractMapTilerMapIdFromEmbedSrc(mapSrc);
  const mapTilerIdFromContent = (d.mapTilerMapId || "").trim();
  const mapTilerId = mapTilerIdFromEmbed || mapTilerIdFromContent || null;
  const mapTilerKey = (import.meta.env.PUBLIC_MAPTILER_API_KEY as string | undefined)?.trim();
  const cerLat = parseCoord(d.ceremonyLat);
  const cerLng = parseCoord(d.ceremonyLng);
  const coordsOk = cerLat != null && cerLng != null;
  /** Custom map image overrides interactive pins. Leaflet when coords exist. */
  const useVenueLeaflet = !hasMapImage && coordsOk;
  const venueBasemap: "maptiler" | "osm" = mapTilerId && mapTilerKey ? "maptiler" : "osm";
  const mapTilerTrueColor = isMapTilerCloudMapUrl(mapSrc);

  const wrapClass = ["venue-map", className].filter(Boolean).join(" ");

  if (hasMapImage) {
    return (
      <div className={`${wrapClass} details__map-frame details__map-frame--custom`}>
        <div className="details__map-frame__inner">
          {hasMapLink ? (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="details__map-frame__img-link"
              aria-label={d.mapImageAlt || "Open full map"}
            >
              <img src={mapImg} alt={d.mapImageAlt || ""} loading="lazy" decoding="async" />
            </a>
          ) : (
            <img
              className="details__map-frame__img"
              src={mapImg}
              alt={d.mapImageAlt || ""}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <div className="details__map-frame__wash" aria-hidden="true" />
      </div>
    );
  }

  if (useVenueLeaflet) {
    return (
      <div
        className={`${wrapClass} details__map-frame details__map-frame--leaflet${
          venueBasemap === "osm" ? " details__map-frame--venue-osm" : ""
        }${venueBasemap === "maptiler" ? " details__map-frame--true-color" : ""}`}
      >
        <div className="details__map-frame__inner">
          <Suspense>
            <DetailsVenueLeaflet
              basemap={venueBasemap}
              mapTilerMapId={mapTilerId ?? ""}
              mapTilerApiKey={mapTilerKey ?? ""}
              ceremonyLat={cerLat!}
              ceremonyLng={cerLng!}
              ceremonyTooltip={d.mapPinCeremony || "Ceremony"}
              guestTooltip={d.mapYouTooltip || "You"}
              useLocationLabel={d.mapUseLocationLabel || "Use my location"}
              locatingLabel={d.mapLocatingLabel || "Locating…"}
              clickHintLabel={d.mapClickHintLabel || "Click the map to drop your pin"}
              clearPinLabel={d.mapClearPinLabel || "Remove my pin"}
              deniedBody={d.mapGeoDeniedBody}
              unavailableBody={d.mapGeoErrorBody}
              ariaLabel={d.mapEmbedTitle || "Venue map"}
              toCeremonyGoogleLabel={d.mapDirCeremonyGoogleLabel || "Google · to ceremony"}
              directionsMenuLabel={d.mapDirectionsMenuLabel || "Directions"}
            />
          </Suspense>
        </div>
        <div className="details__map-frame__wash" aria-hidden="true" />
      </div>
    );
  }

  if (hasMapEmbed) {
    return (
      <div className={`${wrapClass} details__map-frame${mapTilerTrueColor ? " details__map-frame--true-color" : ""}`}>
        <div className="details__map-frame__inner">
          <iframe
            title={d.mapEmbedTitle || "Venue map"}
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="details__map-frame__wash" aria-hidden="true" />
      </div>
    );
  }

  if (!coordsOk) return null;

  return (
    <div className={`${wrapClass} details__map`} aria-label="Venue map">
      <svg viewBox="0 0 1200 360" preserveAspectRatio="none">
        <defs>
          <pattern id="venue-map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(26,23,20,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1200" height="360" fill="url(#venue-map-grid)" />
        <path d="M 0 220 Q 240 180 480 200 T 920 230 T 1200 200" stroke="rgba(26,23,20,0.18)" strokeWidth="1.5" fill="none" />
        <path d="M 0 80 Q 300 110 600 90 T 1200 120" stroke="rgba(26,23,20,0.12)" strokeWidth="1" fill="none" strokeDasharray="3 6" />
        <path d="M 380 360 Q 420 240 520 180 T 720 100" stroke="rgba(201,169,97,0.6)" strokeWidth="1.5" fill="none" strokeDasharray="2 4" />
        <circle cx="160" cy="220" r="3" fill="rgba(26,23,20,0.3)" />
        <circle cx="380" cy="190" r="3" fill="rgba(26,23,20,0.3)" />
        <circle cx="900" cy="240" r="3" fill="rgba(26,23,20,0.3)" />
      </svg>
      <div className="pin" style={{ left: "50%", top: "50%" }}>
        <EditableText value={d.mapPinCeremony} onChange={v => patchContent({ details: { mapPinCeremony: v } })} />
      </div>
    </div>
  );
}
