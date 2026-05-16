import { Fragment, useState, useEffect, useRef, useMemo, useCallback, useId, type CSSProperties } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { EditableText } from "../editable/EditableText";
import { EditableImage } from "../editable/EditableImage";
import { SectionHead } from "../editable/SectionTitle";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { IMAGE_UPLOAD_ACCEPT, useAdminImageUpload } from "../../lib/useAdminImageUpload";
import { downloadWeddingIcs } from "../../lib/calendar";
import { heroDateDisplay, navMonoId } from "../../lib/weddingDateFormats";
import { isSafeHttpsAssetUrl } from "../../lib/mapAssetUrl";
import {
  extractMapTilerMapIdFromEmbedSrc,
  isAllowedMapEmbedUrl,
  isMapTilerCloudMapUrl,
  normalizeMapEmbedUrl,
} from "../../lib/mapEmbed";
import { parseCoord } from "../../lib/mapCoords";
import { buildNavLinks, SITE_PATHS, type SitePageId } from "../../lib/sitePages";
import { DetailsVenueLeaflet } from "./DetailsVenueLeaflet";

// ============================================================
// Hooks & helpers
// ============================================================
export const WEDDING_DATE = new Date("2026-12-12T16:30:00+00:00");

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function useReveal(contentRevision: number) {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(".reveal, .reveal-stagger").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [contentRevision]);
}

function useScrolled(threshold = 80) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

// ============================================================
// Placeholder image — striped, with monospace caption
// ============================================================
export function Ph({ label, src, variant = "default", className = "", style }: { label?: string; src?: string; variant?: string; className?: string; style?: CSSProperties }) {
  const hasImg = src && String(src).trim();
  const base = variant === "dark" ? "ph ph--dark" : variant === "blush" ? "ph ph--blush" : "ph";
  const cls = `${base}${hasImg ? " ph--has-img" : ""} ${className}`.trim();
  return (
    <div className={cls} style={style}>
      {hasImg ? (
        <>
          <img className="ph__img" src={src} alt={label || ""} loading="lazy" decoding="async" />
          {label ? <div className="ph__cap">{label}</div> : null}
        </>
      ) : (
        <div className="ph__cap">{label}</div>
      )}
    </div>
  );
}

// ============================================================
// NAV
// ============================================================
export function Nav({ currentPage }: { currentPage: SitePageId }) {
  const scrolled = useScrolled(80);
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const { content, patchContent } = useWeddingContent();
  const sec = content.sections || {};
  const h = content.hero || {};
  const brandLeft = (h.nameLine1 || "A").trim().charAt(0) || "A";
  const brandRight = (h.nameLine2 || "P").trim().charAt(0) || "P";
  const links = buildNavLinks(sec, content.travelLogistics?.navLabel);
  const navMono = navMonoId(content.site?.weddingDateIso, content.nav?.monoId);
  const onHome = currentPage === "home";

  useEffect(() => {
    setMenuOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <nav className={`nav ${scrolled || !onHome ? "nav--solid" : ""}${menuOpen ? " nav--menu-open" : ""}`}>
      <a href={SITE_PATHS.home} className="nav__brand">
        <span className="serif" style={{ fontSize: 22 }}>{brandLeft}<span style={{ fontFamily: "var(--script)", color: "var(--champagne)", margin: "0 4px" }}>&amp;</span>{brandRight}</span>
        <span className="mono-id">{navMono}</span>
      </a>
      <button
        type="button"
        className="nav__toggle"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen(o => !o)}
      >
        <span className="nav__toggle-label">{menuOpen ? "Close" : "Menu"}</span>
      </button>
      <div id={menuId} className="nav__menu">
        {links.map(l => (
          <a
            key={l.href}
            href={l.href}
            className={l.page === currentPage ? "nav__link--active" : undefined}
            aria-current={l.page === currentPage ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </a>
        ))}
      </div>
      {sec.rsvp !== false && (
        <div className="nav__cta">
          <a
            href={onHome ? "#rsvp" : SITE_PATHS.rsvp}
            className={`pill${currentPage === "rsvp" ? " pill--active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            RSVP
          </a>
        </div>
      )}
    </nav>
  );
}

// ============================================================
// HERO
// ============================================================
function Particles({ count = 24 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 14,
      dur: 12 + Math.random() * 16,
      dx: (Math.random() - 0.5) * 200,
      size: 2 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.6
    })), [count]);
  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p, i) => (
        <span key={i} className="particle"
          style={{
            left: `${p.left}%`,
            bottom: -10,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ...({ "--dx": `${p.dx}px` } as CSSProperties),
          }}
        />
      ))}
    </div>
  );
}

export function Countdown({ light = true, targetDate }: { light?: boolean; targetDate?: Date | null }) {
  const target = targetDate instanceof Date && !Number.isNaN(targetDate.getTime()) ? targetDate : WEDDING_DATE;
  const { days, hours, minutes, seconds } = useCountdown(target);
  const units = [
    { v: days,    l: "Days" },
    { v: hours,   l: "Hours" },
    { v: minutes, l: "Min" },
    { v: seconds, l: "Sec" },
  ];
  return (
    <div
      className="countdown"
      style={
        light
          ? undefined
          : {
              background: "transparent",
              border: "1px solid var(--hairline)",
              color: "var(--soft-black)",
            }
      }
    >
      {units.map((u, i) => (
        <Fragment key={u.l}>
          {i > 0 && <div className="countdown__sep" />}
          <div className="countdown__unit">
            <div className="countdown__num">{String(u.v).padStart(2, "0")}</div>
            <div className="countdown__label">{u.l}</div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function Hero({ countdownTarget }: { countdownTarget?: Date | null }) {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const h = content.hero || {};
  const dateLine = heroDateDisplay(content.site?.weddingDateIso, h.dateDisplay);
  const sec = content.sections || {};
  const bgRef = useRef<HTMLDivElement | null>(null);
  const bgUpload = useAdminImageUpload(url => patchContent({ hero: { bgImageUrl: url } }));
  const heroMediaStyle = h.bgImageUrl && String(h.bgImageUrl).trim()
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(42,10,14,0.45) 100%), url(${h.bgImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }
    : undefined;

  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + y * 0.0002})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="hero">
      <div className="hero__bg" ref={bgRef}>
        <div className="hero__media" style={heroMediaStyle} />
        <div className="hero__vignette" />
        <div className="hero__grain" />
        <Particles count={28} />
        {editor?.isEditing ? (
          <>
            <input
              ref={bgUpload.inputRef}
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              style={{ display: "none" }}
              onChange={bgUpload.onInputChange}
            />
            <button
              type="button"
              className="hero__bg-upload"
              disabled={bgUpload.busy || !bgUpload.canUpload}
              aria-label={bgUpload.canUpload ? "Upload hero background" : "Hero upload unavailable"}
              onClick={e => {
                e.stopPropagation();
                if (bgUpload.canUpload) bgUpload.pickFile();
              }}
            />
            {bgUpload.busy ? <span className="hero__bg-upload-busy" aria-hidden /> : null}
          </>
        ) : null}
      </div>

      <div className="hero__eyebrow-row">
        <EditableText value={h.eyebrowLeft} onChange={v => patchContent({ hero: { eyebrowLeft: v } })} />
        <span>
          <EditableText value={h.eyebrowRightBefore} onChange={v => patchContent({ hero: { eyebrowRightBefore: v } })} />
          <span style={{ fontFamily: "var(--script)", color: "var(--champagne)" }}>&amp;</span>
          <EditableText value={h.eyebrowRightAfter} onChange={v => patchContent({ hero: { eyebrowRightAfter: v } })} />
        </span>
      </div>

      <div className="hero__inner">
        <h1 className="hero__title">
          <span className="line">
            <span>
              <EditableText value={h.nameLine1} onChange={v => patchContent({ hero: { nameLine1: v } })} />
            </span>
          </span>
          <span className="line">
            <span>
              <i className="amp">&amp;</i>
              <EditableText value={h.nameLine2} onChange={v => patchContent({ hero: { nameLine2: v } })} />
            </span>
          </span>
        </h1>
        <div className="hero__meta">
          <div className="eyebrow">
            <span className="dot" />
            <EditableText value={h.savingTheDate} onChange={v => patchContent({ hero: { savingTheDate: v } })} />
          </div>
          <div className="hero__date">
            {dateLine}
          </div>
          <div className="hero__loc">
            <EditableText value={h.venueLine} onChange={v => patchContent({ hero: { venueLine: v } })} />
          </div>
          <Countdown targetDate={countdownTarget} />
          <div className="hero__actions">
            {sec.invitation !== false && (
              <a href={SITE_PATHS.guest} className="btn btn--primary" onClick={e => editor?.isEditing && e.preventDefault()}>
                <EditableText value={h.btnInvitation} onChange={v => patchContent({ hero: { btnInvitation: v } })} />{" "}
                <span className="arrow">→</span>
              </a>
            )}
            {sec.rsvp !== false && (
              <a href="#rsvp" className="btn" onClick={e => editor?.isEditing && e.preventDefault()}>
                <EditableText value={h.btnRsvp} onChange={v => patchContent({ hero: { btnRsvp: v } })} />
              </a>
            )}
            {sec.story !== false && (
              <a
                href="#story"
                className="btn btn--ghost"
                style={{ color: "var(--ivory)", borderColor: "rgba(255,255,255,0.3)" }}
                onClick={e => editor?.isEditing && e.preventDefault()}
              >
                <EditableText value={h.btnStory} onChange={v => patchContent({ hero: { btnStory: v } })} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="hero__scroll">
        <EditableText value={h.scrollLabel} onChange={v => patchContent({ hero: { scrollLabel: v } })} />
        <span className="line" />
      </div>
    </section>
  );
}

// ============================================================
// LOVE STORY
// ============================================================
export function LoveStory() {
  const { content, patchContent } = useWeddingContent();
  const s = content.story || {};
  const chapters = s.chapters || [];

  const patchChapter = (i: number, partial: Record<string, string>) => {
    const updated = [...chapters];
    updated[i] = { ...updated[i], ...partial };
    patchContent({ story: { chapters: updated } });
  };

  return (
    <section id="story" className="section">
      <SectionHead
        eyebrow={s.eyebrow}
        eyebrowLabel={s.eyebrowLabel}
        titleLine1={s.titleLine1}
        titleEm={s.titleEm}
        titleLine2={s.titleLine2}
        lede={s.lede}
        onPatch={p => patchContent({ story: p })}
      />

      <div className="story__rail">
        {chapters.map((c, i) => (
          <article key={i} className={`story__chapter reveal ${c.flip ? "story__chapter--flip" : ""}`}>
            <div className="story__media">
              <div className="stamp">
                <EditableText value={c.caption} onChange={v => patchChapter(i, { caption: v })} />
              </div>
              <EditableImage
                label={c.caption}
                src={c.imageUrl}
                variant={i % 2 === 1 ? "blush" : "default"}
                onChange={url => patchChapter(i, { imageUrl: url })}
              />
            </div>
            <div className="story__body">
              <div className="story__chapter-num">
                <EditableText value={c.chapter} onChange={v => patchChapter(i, { chapter: v })} />
              </div>
              <h3 className="story__title">
                <EditableText value={c.title} onChange={v => patchChapter(i, { title: v })} />
              </h3>
              <div className="story__date">
                <EditableText value={c.date} onChange={v => patchChapter(i, { date: v })} />
              </div>
              <p className="story__copy">
                <EditableText value={c.body} onChange={v => patchChapter(i, { body: v })} multiline />
              </p>
              <div className="story__handwritten">
                — <EditableText value={c.handwritten} onChange={v => patchChapter(i, { handwritten: v })} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// DETAILS
// ============================================================
export function Details() {
  const { content, patchContent } = useWeddingContent();
  const d = content.details || {};
  const cer = d.ceremonyCard || {};
  const rec = d.receptionCard || {};

  const patchCer = (partial: Record<string, string>) =>
    patchContent({ details: { ceremonyCard: { ...(cer as Record<string, unknown>), ...partial } } });
  const patchRec = (partial: Record<string, string>) =>
    patchContent({ details: { receptionCard: { ...(rec as Record<string, unknown>), ...partial } } });
  const patchItin = (i: number, partial: Record<string, string>) => {
    const updated = [...(d.itinerary || [])];
    updated[i] = { ...updated[i], ...partial };
    patchContent({ details: { itinerary: updated } });
  };
  const itinerary = d.itinerary || [];
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
  const recLat = parseCoord(d.receptionLat);
  const recLng = parseCoord(d.receptionLng);
  const coordsOk = cerLat != null && cerLng != null && recLat != null && recLng != null;
  /** Ceremony + reception pins; MapTiler style when id + PUBLIC_MAPTILER_API_KEY, else Esri fallback tiles. */
  const useVenueLeaflet = !hasMapImage && coordsOk && hasMapEmbed;
  const venueBasemap: "maptiler" | "osm" =
    Boolean(mapTilerId && mapTilerKey) ? "maptiler" : "osm";
  const mapTilerTrueColor = isMapTilerCloudMapUrl(mapSrc);
  return (
    <section id="details" className="section section--beige">
      <SectionHead
        eyebrow={d.eyebrow}
        eyebrowLabel={d.eyebrowLabel}
        titleLine1={d.titleLine1}
        titleEm={d.titleEm}
        titleLine2={d.titleLine2}
        lede={d.lede}
        onPatch={p => patchContent({ details: p })}
      />

      <div className="details__grid reveal-stagger">
        <article className="details__card">
          <EditableImage
            label={cer.imageLabel}
            src={cer.imageUrl}
            onChange={url => patchCer({ imageUrl: url })}
          />
          <div className="details__card-body">
            <div className="eyebrow">
              <EditableText value={cer.eyebrow} onChange={v => patchCer({ eyebrow: v })} />
            </div>
            <h3>
              <EditableText value={cer.title} onChange={v => patchCer({ title: v })} />
            </h3>
            <p className="addr">
              <EditableText value={cer.addrLine1} onChange={v => patchCer({ addrLine1: v })} />
              <br />
              <EditableText value={cer.addrLine2} onChange={v => patchCer({ addrLine2: v })} />
            </p>
            <div className="meta">
              <div>
                <span><EditableText value={cer.arrivalLabel || "Arrival"} onChange={v => patchCer({ arrivalLabel: v })} /></span>
                <strong><EditableText value={cer.arrivalTime} onChange={v => patchCer({ arrivalTime: v })} /></strong>
              </div>
              <div>
                <span><EditableText value={cer.vowsLabel || "Vows"} onChange={v => patchCer({ vowsLabel: v })} /></span>
                <strong><EditableText value={cer.vowsTime} onChange={v => patchCer({ vowsTime: v })} /></strong>
              </div>
              <div>
                <span><EditableText value={cer.attireLabel || "Attire"} onChange={v => patchCer({ attireLabel: v })} /></span>
                <strong><EditableText value={cer.attireValue} onChange={v => patchCer({ attireValue: v })} /></strong>
              </div>
            </div>
          </div>
        </article>

        <article className="details__card">
          <EditableImage
            label={rec.imageLabel}
            src={rec.imageUrl}
            variant="blush"
            onChange={url => patchRec({ imageUrl: url })}
          />
          <div className="details__card-body">
            <div className="eyebrow">
              <EditableText value={rec.eyebrow} onChange={v => patchRec({ eyebrow: v })} />
            </div>
            <h3>
              <EditableText value={rec.title} onChange={v => patchRec({ title: v })} />
            </h3>
            <p className="addr">
              <EditableText value={rec.addrLine1} onChange={v => patchRec({ addrLine1: v })} />
              <br />
              <EditableText value={rec.addrLine2} onChange={v => patchRec({ addrLine2: v })} />
            </p>
            <div className="meta">
              <div>
                <span><EditableText value={rec.dinnerLabel || "Dinner"} onChange={v => patchRec({ dinnerLabel: v })} /></span>
                <strong><EditableText value={rec.dinnerTime} onChange={v => patchRec({ dinnerTime: v })} /></strong>
              </div>
              <div>
                <span><EditableText value={rec.dancingLabel || "Dancing"} onChange={v => patchRec({ dancingLabel: v })} /></span>
                <strong><EditableText value={rec.dancingTime} onChange={v => patchRec({ dancingTime: v })} /></strong>
              </div>
              <div>
                <span><EditableText value={rec.attireLabel || "Attire"} onChange={v => patchRec({ attireLabel: v })} /></span>
                <strong><EditableText value={rec.attireValue} onChange={v => patchRec({ attireValue: v })} /></strong>
              </div>
            </div>
          </div>
        </article>
      </div>

      {hasMapImage ? (
        <div className="details__map-frame details__map-frame--custom">
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
      ) : useVenueLeaflet ? (
        <div
          className={`details__map-frame details__map-frame--leaflet${
            venueBasemap === "osm" ? " details__map-frame--venue-osm" : ""
          }${venueBasemap === "maptiler" ? " details__map-frame--true-color" : ""}`}
        >
          <div className="details__map-frame__inner">
            <DetailsVenueLeaflet
              basemap={venueBasemap}
              mapTilerMapId={mapTilerId ?? ""}
              mapTilerApiKey={mapTilerKey ?? ""}
              ceremonyLat={cerLat!}
              ceremonyLng={cerLng!}
              receptionLat={recLat!}
              receptionLng={recLng!}
              ceremonyTooltip={d.mapPinCeremony || "Ceremony"}
              receptionTooltip={d.mapPinReception || "Reception"}
              guestTooltip={d.mapYouTooltip || "You"}
              useLocationLabel={d.mapUseLocationLabel || "Use my location"}
              locatingLabel={d.mapLocatingLabel || "Locating…"}
              clickHintLabel={d.mapClickHintLabel || "Click the map to drop your pin"}
              clearPinLabel={d.mapClearPinLabel || "Remove my pin"}
              deniedBody={d.mapGeoDeniedBody}
              unavailableBody={d.mapGeoErrorBody}
              ariaLabel={d.mapEmbedTitle || "Venue map"}
              toCeremonyGoogleLabel={d.mapDirCeremonyGoogleLabel || "Google · to ceremony"}
              toReceptionGoogleLabel={d.mapDirReceptionGoogleLabel || "Google · to reception"}
            />
          </div>
          <div className="details__map-frame__wash" aria-hidden="true" />
        </div>
      ) : hasMapEmbed ? (
        <div
          className={`details__map-frame${mapTilerTrueColor ? " details__map-frame--true-color" : ""}`}
        >
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
      ) : (
        <div className="details__map" aria-label="Venue map">
          <svg viewBox="0 0 1200 360" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(26,23,20,0.06)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="1200" height="360" fill="url(#grid)" />
            <path d="M 0 220 Q 240 180 480 200 T 920 230 T 1200 200" stroke="rgba(26,23,20,0.18)" strokeWidth="1.5" fill="none" />
            <path d="M 0 80 Q 300 110 600 90 T 1200 120" stroke="rgba(26,23,20,0.12)" strokeWidth="1" fill="none" strokeDasharray="3 6" />
            <path d="M 380 360 Q 420 240 520 180 T 720 100" stroke="rgba(201,169,97,0.6)" strokeWidth="1.5" fill="none" strokeDasharray="2 4" />
            <circle cx="160" cy="220" r="3" fill="rgba(26,23,20,0.3)" />
            <circle cx="380" cy="190" r="3" fill="rgba(26,23,20,0.3)" />
            <circle cx="900" cy="240" r="3" fill="rgba(26,23,20,0.3)" />
          </svg>
          <div className="pin" style={{ left: "32%", top: "55%" }}>
            <EditableText value={d.mapPinCeremony} onChange={v => patchContent({ details: { mapPinCeremony: v } })} />
          </div>
          <div className="pin pin--gold" style={{ left: "62%", top: "38%" }}>
            <EditableText value={d.mapPinReception} onChange={v => patchContent({ details: { mapPinReception: v } })} />
          </div>
        </div>
      )}

      <div className="itinerary reveal">
        <div className="itinerary__head">
          <div>
            <div className="eyebrow">
              <EditableText value={d.itineraryEyebrow} onChange={v => patchContent({ details: { itineraryEyebrow: v } })} />
            </div>
            <h3 className="serif" style={{ fontSize: 36, fontWeight: 300, margin: "8px 0 0" }}>
              <EditableText value={d.itineraryTitle} onChange={v => patchContent({ details: { itineraryTitle: v } })} />
            </h3>
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => downloadWeddingIcs(undefined, content.site?.weddingDateIso)}
          >
            <EditableText value={d.addCalendarLabel || "Add to calendar"} onChange={v => patchContent({ details: { addCalendarLabel: v } })} />
            {" "}<span className="arrow">→</span>
          </button>
        </div>
        <div className="itinerary__list">
          {itinerary.map((row, i) => (
            <div className="itin-row" key={i}>
              <div className="itin-row__time">
                <EditableText value={row.time} onChange={v => patchItin(i, { time: v })} />
              </div>
              <div className="itin-row__title">
                <EditableText value={row.title} onChange={v => patchItin(i, { title: v })} />
                <small><EditableText value={row.sub} onChange={v => patchItin(i, { sub: v })} /></small>
              </div>
              <div className="itin-row__loc">
                <EditableText value={row.loc} onChange={v => patchItin(i, { loc: v })} />
              </div>
              <div className="itin-row__attire">
                <EditableText value={row.attire} onChange={v => patchItin(i, { attire: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
