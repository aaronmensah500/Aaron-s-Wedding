import { useEffect, useRef, useState } from "react";
import L, { type LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapTiler256RasterUrlTemplate } from "../../lib/mapCoords";
import { buildGoogleDirectionsUrl } from "../../lib/directionsLinks";

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Label above dot; map coordinate = center of dot. */
function venuePinIcon(kind: "ceremony" | "reception", label: string): L.DivIcon {
  const safe = escapeHtmlText(label);
  const lineChars = 22;
  const lines = Math.max(1, Math.min(4, Math.ceil(label.length / lineChars)));
  const labelH = 10 + lines * 15;
  const gap = 5;
  const dotD = 18;
  const W = 248;
  const H = labelH + gap + dotD;
  const ax = W / 2;
  const ay = labelH + gap + dotD / 2;
  const k = kind === "ceremony" ? "ceremony" : "reception";
  return L.divIcon({
    className: "details-venue-div-icon details-venue-div-icon--pinmark",
    html: `<div class="details-venue-pinmark details-venue-pinmark--${k}" style="width:${W}px;height:${H}px">
      <div class="details-venue-pinmark__dot" role="presentation"></div>
      <span class="details-venue-pinmark__label">${safe}</span>
    </div>`,
    iconSize: [W, H],
    iconAnchor: [ax, ay],
  });
}

const guestIcon = L.divIcon({
  className: "details-venue-div-icon",
  html: '<div class="details-venue-marker details-venue-marker--guest" role="presentation"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

export type DetailsVenueLeafletProps = {
  /** MapTiler raster style when key + id are set; otherwise standard OSM tiles (pins always show). */
  basemap: "maptiler" | "osm";
  mapTilerMapId: string;
  mapTilerApiKey: string;
  ceremonyLat: number;
  ceremonyLng: number;
  receptionLat: number;
  receptionLng: number;
  ceremonyTooltip: string;
  receptionTooltip: string;
  guestTooltip: string;
  useLocationLabel: string;
  locatingLabel: string;
  clickHintLabel: string;
  clearPinLabel: string;
  deniedBody?: string;
  unavailableBody?: string;
  ariaLabel: string;
  toCeremonyGoogleLabel: string;
  toReceptionGoogleLabel: string;
};

export function DetailsVenueLeaflet({
  basemap,
  mapTilerMapId,
  mapTilerApiKey,
  ceremonyLat,
  ceremonyLng,
  receptionLat,
  receptionLng,
  ceremonyTooltip,
  receptionTooltip,
  guestTooltip,
  useLocationLabel,
  locatingLabel,
  clickHintLabel,
  clearPinLabel,
  deniedBody,
  unavailableBody,
  ariaLabel,
  toCeremonyGoogleLabel,
  toReceptionGoogleLabel,
}: DetailsVenueLeafletProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guestMarkerRef = useRef<L.Marker | null>(null);

  const [guestPin, setGuestPin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "denied" | "error" | "ready">(
    "idle"
  );

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGuestPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ready");
      },
      err => {
        setGeoStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 22000, maximumAge: 0 }
    );
  };

  const clearPin = () => {
    setGuestPin(null);
    setGeoStatus("idle");
  };

  const oLat = guestPin?.lat;
  const oLng = guestPin?.lng;
  const gCer = buildGoogleDirectionsUrl(ceremonyLat, ceremonyLng, oLat, oLng);
  const gRec = buildGoogleDirectionsUrl(receptionLat, receptionLng, oLat, oLng);

  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    const map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: true,
    });
    mapRef.current = map;

    if (basemap === "maptiler" && mapTilerMapId && mapTilerApiKey) {
      L.tileLayer(mapTiler256RasterUrlTemplate(mapTilerMapId, mapTilerApiKey), {
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 22,
      }).addTo(map);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: "abc",
      }).addTo(map);
    }

    L.marker([ceremonyLat, ceremonyLng], {
      icon: venuePinIcon("ceremony", ceremonyTooltip),
      title: ceremonyTooltip,
    }).addTo(map);

    L.marker([receptionLat, receptionLng], {
      icon: venuePinIcon("reception", receptionTooltip),
      title: receptionTooltip,
    }).addTo(map);

    const onMapClick = (e: LeafletMouseEvent) => {
      setGuestPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on("click", onMapClick);

    const b0 = L.latLngBounds(L.latLng(ceremonyLat, ceremonyLng), L.latLng(receptionLat, receptionLng));
    map.fitBounds(b0, { padding: [44, 44], maxZoom: 14 });

    const t = window.setTimeout(() => map.invalidateSize(), 160);

    return () => {
      window.clearTimeout(t);
      map.off("click", onMapClick);
      guestMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [
    basemap,
    mapTilerMapId,
    mapTilerApiKey,
    ceremonyLat,
    ceremonyLng,
    receptionLat,
    receptionLng,
    ceremonyTooltip,
    receptionTooltip,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (guestMarkerRef.current) {
      map.removeLayer(guestMarkerRef.current);
      guestMarkerRef.current = null;
    }

    if (guestPin) {
      const m = L.marker([guestPin.lat, guestPin.lng], { icon: guestIcon })
        .addTo(map)
        .bindTooltip(guestTooltip, { direction: "top", offset: [0, -8] });
      guestMarkerRef.current = m;
      const b = L.latLngBounds(L.latLng(ceremonyLat, ceremonyLng), L.latLng(receptionLat, receptionLng)).extend(
        L.latLng(guestPin.lat, guestPin.lng)
      );
      map.fitBounds(b, { padding: [52, 52], maxZoom: 14 });
    } else {
      const b = L.latLngBounds(L.latLng(ceremonyLat, ceremonyLng), L.latLng(receptionLat, receptionLng));
      map.fitBounds(b, { padding: [44, 44], maxZoom: 14 });
    }
  }, [guestPin, ceremonyLat, ceremonyLng, receptionLat, receptionLng, guestTooltip]);

  return (
    <div className="details-venue-leaflet">
      <div
        ref={mapElRef}
        className="details-venue-leaflet__map"
        role="application"
        aria-label={ariaLabel}
      />
      <div className="details-venue-leaflet__chrome">
        {geoStatus === "denied" && deniedBody ? (
          <p className="details-venue-leaflet__msg">{deniedBody}</p>
        ) : geoStatus === "error" && unavailableBody ? (
          <p className="details-venue-leaflet__msg">{unavailableBody}</p>
        ) : !guestPin ? (
          <p className="details-venue-leaflet__hint" aria-live="polite">{clickHintLabel}</p>
        ) : null}
        <div className="details-venue-leaflet__btn-row">
          <button
            type="button"
            className="btn btn--ghost details-venue-leaflet__btn"
            onClick={requestLocation}
            disabled={geoStatus === "requesting"}
            aria-busy={geoStatus === "requesting"}
          >
            {geoStatus === "requesting" ? locatingLabel : useLocationLabel}
          </button>
          {guestPin && (
            <button
              type="button"
              className="btn btn--ghost details-venue-leaflet__btn details-venue-leaflet__btn--clear"
              onClick={clearPin}
              aria-label={clearPinLabel}
            >
              {clearPinLabel}
            </button>
          )}
          <div className="details-venue-leaflet__directions" role="group" aria-label="Google Maps directions">
            <div className="details-venue-leaflet__dir-block">
              <div className="details-venue-leaflet__dir-label">{ceremonyTooltip}</div>
              <a className="btn btn--ghost" href={gCer} target="_blank" rel="noopener noreferrer">
                {toCeremonyGoogleLabel}
              </a>
            </div>
            <div className="details-venue-leaflet__dir-block">
              <div className="details-venue-leaflet__dir-label">{receptionTooltip}</div>
              <a className="btn btn--ghost" href={gRec} target="_blank" rel="noopener noreferrer">
                {toReceptionGoogleLabel}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
