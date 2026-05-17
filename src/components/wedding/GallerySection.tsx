import { useState, useEffect, useCallback } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { useGalleryAlbumCounts, useGalleryAlbumMedia } from "../../lib/galleryMediaApi";
import { Ph } from "./Core";
import { EditableText } from "../editable/EditableText";
import { EditableImage } from "../editable/EditableImage";
import { SectionHead } from "../editable/SectionTitle";

type GalleryAlbum = { id: string; title: string; description?: string; coverImageUrl?: string };
type GalleryCmsItem = { albumId?: string; ratio: string; caption: string; imageUrl: string };

type GallerySlide =
  | { kind: "cms"; cmsIndex: number; caption: string; imageUrl: string; ratio: string }
  | { kind: "guest"; id: string; caption: string; imageUrl: string | null; isVideo: boolean };

function normAlbumId(id: string | undefined): string {
  return String(id || "general").trim().toLowerCase();
}

function itemInAlbum(item: GalleryCmsItem, albumId: string): boolean {
  return normAlbumId(item.albumId) === normAlbumId(albumId);
}

function albumCoverUrl(album: GalleryAlbum, cmsItems: GalleryCmsItem[]): string {
  const fromAlbum = String(album.coverImageUrl || "").trim();
  if (fromAlbum) return fromAlbum;
  const first = cmsItems.find(i => itemInAlbum(i, album.id) && String(i.imageUrl || "").trim());
  return first?.imageUrl ? String(first.imageUrl) : "";
}

export function Gallery() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const gz = content.gallery || {};
  const albums = (gz.albums || []) as GalleryAlbum[];
  const items = (gz.items || []) as GalleryCmsItem[];
  const [activeAlbumId, setActiveAlbumId] = useState(null as string | null);
  const [open, setOpen] = useState(-1);
  const { counts: guestCountsByAlbum } = useGalleryAlbumCounts();
  const { items: guestItems, loading: guestLoading, error: guestError } = useGalleryAlbumMedia(
    activeAlbumId && !editor?.isEditing ? activeAlbumId : null
  );

  const photoCountLabel = (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`;
  const albumPhotoCount = (albumId: string) => {
    const cms = items.filter(i => itemInAlbum(i, albumId)).length;
    const guest = editor?.isEditing ? 0 : guestCountsByAlbum[normAlbumId(albumId)] ?? 0;
    return cms + guest;
  };

  const cmsInAlbum = activeAlbumId
    ? items.map((g, cmsIndex) => ({ g, cmsIndex })).filter(({ g }) => itemInAlbum(g, activeAlbumId))
    : [];

  const slides: GallerySlide[] = [
    ...cmsInAlbum.map(({ g, cmsIndex }) => ({
      kind: "cms" as const,
      cmsIndex,
      caption: g.caption,
      imageUrl: g.imageUrl,
      ratio: g.ratio,
    })),
    ...guestItems.map(g => ({
      kind: "guest" as const,
      id: g.id,
      caption: g.original_name,
      imageUrl: g.signedUrl,
      isVideo: /\.(mp4|webm|mov)$/i.test(g.original_name),
    })),
  ];

  const n = Math.max(1, slides.length);
  const close = useCallback(() => setOpen(-1), []);
  const next = useCallback(() => setOpen(o => (o + 1) % n), [n]);
  const prev = useCallback(() => setOpen(o => (o - 1 + n) % n), [n]);

  const patchItem = (i: number, partial: Record<string, string>) => {
    const updated = [...items];
    updated[i] = { ...updated[i], ...partial };
    patchContent({ gallery: { items: updated } });
  };

  useEffect(() => {
    if (open < 0) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, next, prev]);

  const activeAlbum = albums.find(a => a.id === activeAlbumId);

  return (
    <section id="gallery" className="section section--beige">
      <SectionHead
        eyebrow={gz.eyebrow}
        eyebrowLabel={gz.eyebrowLabel}
        titleLine1={gz.titleLine1}
        titleEm={gz.titleEm}
        lede={gz.lede}
        onPatch={p => patchContent({ gallery: p })}
      />

      {!activeAlbumId ? (
        <div className="gallery-albums">
          {albums.length === 0 ? (
            <p className="gallery-albums__hint">No albums yet. Add albums in the editor under Lists.</p>
          ) : null}
          {albums.map(album => {
            const cover = albumCoverUrl(album, items);
            return (
              <button
                key={album.id}
                type="button"
                className="gallery-albums__card"
                onClick={() => {
                  setActiveAlbumId(album.id);
                  setOpen(-1);
                }}
              >
                <div className="gallery-albums__cover">
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" />
                  ) : (
                    <Ph label={album.title} src="" style={{ aspectRatio: "4/3" }} />
                  )}
                </div>
                <div className="gallery-albums__meta">
                  <h3 className="gallery-albums__title">{album.title}</h3>
                  {album.description ? <p className="gallery-albums__desc">{album.description}</p> : null}
                  <span className="gallery-albums__count">{photoCountLabel(albumPhotoCount(album.id))}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="gallery-albums__hd">
            <button
              type="button"
              className="gallery-albums__back"
              onClick={() => {
                setActiveAlbumId(null);
                setOpen(-1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              ← All albums
            </button>
            <h3 className="gallery-albums__view-title">{activeAlbum?.title}</h3>
            {activeAlbum?.description ? (
              <p className="gallery-albums__view-desc">{activeAlbum.description}</p>
            ) : null}
            <p className="gallery-albums__view-count">
              {photoCountLabel(
                cmsInAlbum.length + (editor?.isEditing || guestLoading ? 0 : guestItems.length)
              )}
            </p>
          </div>
          {guestError ? <p className="gallery-albums__err">{guestError}</p> : null}
          {guestLoading ? <p className="gallery-albums__hint">Loading guest photos…</p> : null}
          <div className="gallery gallery--album">
            {cmsInAlbum.map(({ g, cmsIndex }, i) => (
              <figure
                key={`cms-${cmsIndex}`}
                className="gallery__item"
                onClick={editor?.isEditing ? undefined : () => setOpen(i)}
              >
                <EditableImage
                  label={g.caption}
                  src={g.imageUrl}
                  variant={i % 3 === 1 ? "blush" : i % 3 === 2 ? "dark" : "default"}
                  style={{ aspectRatio: g.ratio }}
                  onChange={url => patchItem(cmsIndex, { imageUrl: url })}
                />
                <figcaption className="gallery__cap">
                  <EditableText value={g.caption} onChange={v => patchItem(cmsIndex, { caption: v })} />
                </figcaption>
              </figure>
            ))}
            {!editor?.isEditing
              ? guestItems.map((g, gi) => {
                  const slideIndex = cmsInAlbum.length + gi;
                  return (
                    <figure
                      key={`guest-${g.id}`}
                      className="gallery__item"
                      onClick={() => setOpen(slideIndex)}
                    >
                      {g.signedUrl && /\.(mp4|webm|mov)$/i.test(g.original_name) ? (
                        <video src={g.signedUrl} className="gallery__guest-media" controls />
                      ) : g.signedUrl ? (
                        <img src={g.signedUrl} alt="" className="gallery__guest-media" loading="lazy" />
                      ) : (
                        <Ph label={g.original_name} src="" style={{ aspectRatio: "4/3" }} />
                      )}
                      <figcaption className="gallery__cap">{g.original_name}</figcaption>
                    </figure>
                  );
                })
              : null}
          </div>
          {!guestLoading && slides.length === 0 ? (
            <p className="gallery-albums__hint">No photos in this album yet.</p>
          ) : null}
        </>
      )}

      {open >= 0 && slides[open] ? (
        <div className="lightbox" onClick={close}>
          <div className="lightbox__img" onClick={e => e.stopPropagation()}>
            {slides[open].kind === "guest" && slides[open].isVideo && slides[open].imageUrl ? (
              <video src={slides[open].imageUrl} controls className="lightbox__video" />
            ) : (
              <Ph
                label={slides[open].caption}
                src={slides[open].imageUrl || ""}
                variant={open % 3 === 1 ? "blush" : open % 3 === 2 ? "dark" : "default"}
                style={{ height: "100%" }}
              />
            )}
          </div>
          <button
            type="button"
            className="lightbox__close"
            onClick={e => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={e => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={e => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
          >
            ›
          </button>
          <div className="lightbox__meta" onClick={e => e.stopPropagation()}>
            {String(open + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")} · {slides[open].caption}
          </div>
        </div>
      ) : null}
    </section>
  );
}
