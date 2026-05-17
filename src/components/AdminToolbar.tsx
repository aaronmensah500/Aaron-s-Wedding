import { useRef, useState } from "react";
import { useWeddingContent, WEDDING_CONTENT_DEFAULT, validateSiteContentImport } from "../lib/weddingContent";
import { useSiteEditor } from "../lib/siteEditor";
import {
  PAGE_EDITOR_LABELS,
  PAGE_SECTION_KEYS,
  SECTION_TOGGLE_LABELS,
  SITE_PATHS,
  type SitePageId,
} from "../lib/sitePages";
import { AdminImageUpload } from "./AdminImageUpload";
import { AdminPinSaveModal } from "./AdminPinSaveModal";
import { AdminWeddingDateSettings } from "./AdminWeddingDateSettings";

type SheetId = null | "sections" | "site" | "backup" | "advanced" | "arrays";

function AdminTextField({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const str = value ?? "";
  return (
    <label className="adm-field">
      <span className="adm-field__lbl">{label}</span>
      {multiline ? (
        <textarea className="adm-field__input" rows={rows} value={str} onChange={e => onChange(e.target.value)} />
      ) : (
        <input className="adm-field__input" type="text" value={str} onChange={e => onChange(e.target.value)} />
      )}
    </label>
  );
}

function AdminSectionToggles({ currentPage }: { currentPage: SitePageId }) {
  const { content, patchContent } = useWeddingContent();
  const pageLabel = PAGE_EDITOR_LABELS[currentPage];
  const pagePath = SITE_PATHS[currentPage];
  const onPage = PAGE_SECTION_KEYS[currentPage];
  const onPageSet = new Set(onPage);
  const otherKeys = (
    Object.keys(SECTION_TOGGLE_LABELS) as (keyof typeof SECTION_TOGGLE_LABELS)[]
  ).filter(k => !onPageSet.has(k));

  const renderToggle = (k: keyof typeof content.sections) => (
    <label key={k} className="adm-check">
      <input
        type="checkbox"
        checked={content.sections[k] !== false}
        onChange={e => patchContent({ sections: { [k]: e.target.checked } })}
      />
      <span>{SECTION_TOGGLE_LABELS[k]}</span>
    </label>
  );

  return (
    <div className="adm-stack">
      <p className="adm-hint">
        On <strong>{pageLabel}</strong> (<code className="adm-code">{pagePath}</code>). Uncheck to hide a section from
        this page and navigation.
      </p>
      {onPage.map(k => renderToggle(k))}
      {otherKeys.length > 0 ? (
        <fieldset className="adm-fieldset adm-fieldset--spaced">
          <legend>Other pages</legend>
          <p className="adm-hint">These sections do not appear on the page you are editing.</p>
          {otherKeys.map(k => renderToggle(k))}
        </fieldset>
      ) : null}
    </div>
  );
}

function slugifyAlbumId(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "album";
}

function AdminArraysPanel() {
  const { content, patchContent } = useWeddingContent();
  const storyDefault = WEDDING_CONTENT_DEFAULT.story.chapters[0];
  const galleryDefault = WEDDING_CONTENT_DEFAULT.gallery.items[0];
  const albumDefault = WEDDING_CONTENT_DEFAULT.gallery.albums[0];
  const partyDefault = WEDDING_CONTENT_DEFAULT.party.members[0];
  const itineraryDefault = WEDDING_CONTENT_DEFAULT.details.itinerary[0];
  const albums = content.gallery?.albums || [];
  const galleryItems = content.gallery?.items || [];

  return (
    <div className="adm-stack">
      <p className="adm-hint">Add or remove repeating blocks. Edit text on the page by tapping it.</p>
      <fieldset className="adm-fieldset">
        <legend>Story chapters</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() =>
              patchContent({
                story: { chapters: [...(content.story?.chapters || []), { ...storyDefault }] },
              })
            }
          >
            Add chapter
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={(content.story?.chapters?.length || 0) <= 1}
            onClick={() => {
              const chapters = [...(content.story?.chapters || [])];
              chapters.pop();
              patchContent({ story: { chapters } });
            }}
          >
            Remove last
          </button>
        </div>
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Gallery albums</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() => {
              const title = `Album ${albums.length + 1}`;
              let id = slugifyAlbumId(title);
              const ids = new Set(albums.map((a: { id?: string }) => a.id));
              let n = 2;
              while (ids.has(id)) {
                id = `${slugifyAlbumId(title)}-${n}`;
                n += 1;
              }
              patchContent({
                gallery: {
                  albums: [...albums, { ...albumDefault, id, title, description: "" }],
                },
              });
            }}
          >
            Add album
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={albums.length <= 1}
            onClick={() => {
              const nextAlbums = [...albums];
              const removed = nextAlbums.pop();
              const fallbackId = nextAlbums[0]?.id || "general";
              const items = galleryItems.map((item: { albumId?: string }) => ({
                ...item,
                albumId: item.albumId === removed?.id ? fallbackId : item.albumId,
              }));
              patchContent({ gallery: { albums: nextAlbums, items } });
            }}
          >
            Remove last album
          </button>
        </div>
        {albums.map((album: { id: string; title: string; description?: string }, ai: number) => (
          <div key={album.id} className="adm-stack adm-stack--tight">
            <AdminTextField
              label={`Album ${ai + 1} title`}
              value={album.title}
              onChange={v => {
                const next = [...albums];
                next[ai] = { ...next[ai], title: v };
                patchContent({ gallery: { albums: next } });
              }}
            />
            <AdminTextField
              label="Description"
              value={album.description}
              onChange={v => {
                const next = [...albums];
                next[ai] = { ...next[ai], description: v };
                patchContent({ gallery: { albums: next } });
              }}
            />
            <p className="adm-hint">
              ID: <code className="adm-code">{album.id}</code>
            </p>
          </div>
        ))}
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Gallery photos</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() =>
              patchContent({
                gallery: {
                  items: [
                    ...galleryItems,
                    {
                      ...galleryDefault,
                      albumId: albums[0]?.id || galleryDefault.albumId || "general",
                    },
                  ],
                },
              })
            }
          >
            Add photo
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={galleryItems.length <= 1}
            onClick={() => {
              const items = [...galleryItems];
              items.pop();
              patchContent({ gallery: { items } });
            }}
          >
            Remove last
          </button>
        </div>
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Bridal party</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() =>
              patchContent({
                party: { members: [...(content.party?.members || []), { ...partyDefault }] },
              })
            }
          >
            Add member
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={(content.party?.members?.length || 0) <= 1}
            onClick={() => {
              const members = [...(content.party?.members || [])];
              members.pop();
              patchContent({ party: { members } });
            }}
          >
            Remove last
          </button>
        </div>
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Itinerary rows</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() =>
              patchContent({
                details: { itinerary: [...(content.details?.itinerary || []), { ...itineraryDefault }] },
              })
            }
          >
            Add row
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={(content.details?.itinerary?.length || 0) <= 1}
            onClick={() => {
              const itinerary = [...(content.details?.itinerary || [])];
              itinerary.pop();
              patchContent({ details: { itinerary } });
            }}
          >
            Remove last
          </button>
        </div>
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Stream schedule</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() =>
              patchContent({
                stream: {
                  schedule: [
                    ...(content.stream?.schedule || []),
                    { label: "New item", time: "00:00" },
                  ],
                },
              })
            }
          >
            Add item
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={(content.stream?.schedule?.length || 0) <= 1}
            onClick={() => {
              const schedule = [...(content.stream?.schedule || [])];
              schedule.pop();
              patchContent({ stream: { schedule } });
            }}
          >
            Remove last
          </button>
        </div>
      </fieldset>
    </div>
  );
}

function AdminAdvancedPanel() {
  const { content, patchContent } = useWeddingContent();
  const d = content.details || {};
  const reg = content.registry || {};
  return (
    <div className="adm-stack">
      <p className="adm-hint">Technical fields not shown as plain copy on the page.</p>
      <h4 className="adm-subhd">Registry</h4>
      <AdminTextField
        label="Amount presets (comma-separated)"
        value={reg.amountPresetCsv}
        onChange={v => patchContent({ registry: { amountPresetCsv: v } })}
      />
      <AdminTextField
        label="Pay currency code"
        value={reg.payCurrencyCode}
        onChange={v => patchContent({ registry: { payCurrencyCode: v } })}
      />
      <AdminTextField label="QR deep link URL" value={reg.qrUrl} onChange={v => patchContent({ registry: { qrUrl: v } })} />
      <h4 className="adm-subhd">Map</h4>
      <AdminImageUpload label="Custom map image" value={d.mapImageUrl} onChange={v => patchContent({ details: { mapImageUrl: v } })} />
      <AdminTextField
        label="Embed URL or iframe HTML"
        value={d.mapEmbedUrl}
        onChange={v => patchContent({ details: { mapEmbedUrl: v } })}
        multiline
        rows={2}
      />
      <AdminTextField label="MapTiler map id" value={d.mapTilerMapId} onChange={v => patchContent({ details: { mapTilerMapId: v } })} />
      <AdminTextField label="Ceremony latitude" value={d.ceremonyLat} onChange={v => patchContent({ details: { ceremonyLat: v } })} />
      <AdminTextField label="Ceremony longitude" value={d.ceremonyLng} onChange={v => patchContent({ details: { ceremonyLng: v } })} />
      <AdminTextField label="Reception latitude" value={d.receptionLat} onChange={v => patchContent({ details: { receptionLat: v } })} />
      <AdminTextField label="Reception longitude" value={d.receptionLng} onChange={v => patchContent({ details: { receptionLng: v } })} />
      <AdminTextField label="Map image alt" value={d.mapImageAlt} onChange={v => patchContent({ details: { mapImageAlt: v } })} />
      <AdminTextField label="Map image link URL" value={d.mapImageLinkUrl} onChange={v => patchContent({ details: { mapImageLinkUrl: v } })} />
    </div>
  );
}

function AdminPublishBanner({
  publishStatus,
  publishError,
  canPublish,
  onSaveForEveryone,
}: {
  publishStatus: string;
  publishError: string;
  canPublish: boolean;
  onSaveForEveryone: () => void;
}) {
  let statusLine = "Changes saved on this device only.";
  if (!canPublish) {
    statusLine = "Publishing needs Supabase (PUBLIC_SUPABASE_URL + service role on the server).";
  } else if (publishStatus === "saving") {
    statusLine = "Publishing…";
  } else if (publishStatus === "saved") {
    statusLine = "Published for all visitors.";
  } else if (publishStatus === "error") {
    statusLine = publishError || "Publish failed.";
  } else if (publishStatus === "local-only") {
    statusLine = "Changes saved on this device only.";
  }
  return (
    <p className="adm-toolbar__status" role="status">
      {statusLine}
      {canPublish && publishStatus !== "saving" ? (
        <>
          {" "}
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={onSaveForEveryone}>
            Save for everyone
          </button>
        </>
      ) : null}
    </p>
  );
}

const DRAG_POS_KEY = "adm-toolbar-pos";

function readDragPos(): { x: number; y: number } | null {
  try {
    const v = sessionStorage.getItem(DRAG_POS_KEY);
    if (!v) return null;
    const p = JSON.parse(v) as { x?: unknown; y?: unknown };
    if (typeof p.x !== "number" || typeof p.y !== "number") return null;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 40;
    return { x: Math.max(0, Math.min(maxX, p.x)), y: Math.max(0, Math.min(maxY, p.y)) };
  } catch {
    return null;
  }
}

export function AdminToolbar() {
  const { content, patchContent, replaceContent, resetToDefaults, publishStatus, publishError, publishForEveryone } =
    useWeddingContent();
  const { lock, currentPage, emailAuthEnabled } = useSiteEditor();
  const pageLabel = PAGE_EDITOR_LABELS[currentPage];
  const pagePath = SITE_PATHS[currentPage];
  const [sheet, setSheet] = useState<SheetId>(null);
  const [importText, setImportText] = useState("");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalError, setSaveModalError] = useState("");

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(readDragPos);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const onDragDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const el = toolbarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cur = dragPos ?? { x: rect.left, y: rect.top };
    drag.current = { px: e.clientX, py: e.clientY, ox: cur.x, oy: cur.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const el = toolbarRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, drag.current.ox + dx));
    const y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, drag.current.oy + dy));
    setDragPos({ x, y });
  };

  const onDragUp = () => {
    if (drag.current && dragPos) {
      try { sessionStorage.setItem(DRAG_POS_KEY, JSON.stringify(dragPos)); } catch { /* ignore */ }
    }
    drag.current = null;
  };

  const resetDragPos = () => {
    setDragPos(null);
    try { sessionStorage.removeItem(DRAG_POS_KEY); } catch { /* ignore */ }
  };

  const canPublish = Boolean(import.meta.env.PUBLIC_SUPABASE_URL?.trim());
  const requirePin = !emailAuthEnabled && content.admin?.requirePin !== false;

  const handleSaveSubmit = async () => {
    setSaveModalError("");
    const result = await publishForEveryone();
    if (!result.ok) {
      setSaveModalError(result.message);
      return;
    }
    setSaveModalOpen(false);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding-site-content.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(importText);
      const validated = validateSiteContentImport(parsed);
      if (!validated.ok) {
        alert(validated.message);
        return;
      }
      replaceContent(validated.value);
      setImportText("");
      alert("Imported successfully.");
    } catch (e: unknown) {
      alert("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const sheetTitle: Record<Exclude<SheetId, null>, string> = {
    sections: "Sections",
    site: "Site settings",
    backup: "Backup",
    advanced: "Advanced",
    arrays: "Lists & photos",
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className="adm-toolbar"
        role="toolbar"
        aria-label="Site editor"
        style={dragPos ? { left: dragPos.x, top: dragPos.y, bottom: "auto", transform: "none" } : undefined}
      >
        <button
          type="button"
          className="adm-toolbar__drag"
          aria-label="Drag to move toolbar — double-click to reset"
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onDoubleClick={resetDragPos}
        >
          ⠿
        </button>
        <p className="adm-toolbar__page" aria-live="polite">
          <strong>Editing: {pageLabel}</strong>
          <span className="adm-toolbar__page-hint">
            {" "}
            · tap text on this page · sheets affect the whole site ·{" "}
            <a className="adm-toolbar__page-link" href={pagePath}>
              {pagePath}
            </a>
          </span>
        </p>
        <AdminPublishBanner
          publishStatus={publishStatus}
          publishError={publishError}
          canPublish={canPublish}
          onSaveForEveryone={() => {
            setSaveModalError("");
            setSaveModalOpen(true);
          }}
        />
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSheet("sections")}>
          Sections
        </button>
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSheet("arrays")}>
          Lists
        </button>
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSheet("site")}>
          Site
        </button>
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSheet("advanced")}>
          Advanced
        </button>
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSheet("backup")}>
          Backup
        </button>
        <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={lock}>
          Lock
        </button>
      </div>

      <AdminPinSaveModal
        open={saveModalOpen}
        requirePin={requirePin}
        publishing={publishStatus === "saving"}
        error={saveModalError}
        onClose={() => {
          if (publishStatus !== "saving") {
            setSaveModalOpen(false);
            setSaveModalError("");
          }
        }}
        onSubmit={() => void handleSaveSubmit()}
      />

      {sheet ? (
        <div className="adm-sheet" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
          <div className="adm-sheet__panel" onClick={e => e.stopPropagation()}>
            <div className="adm-sheet__hd">
              <h2 className="adm-sheet__title">{sheetTitle[sheet]}</h2>
              <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setSheet(null)}>
                Close
              </button>
            </div>
            {sheet === "sections" ? <AdminSectionToggles currentPage={currentPage} /> : null}
            {sheet === "arrays" ? <AdminArraysPanel /> : null}
            {sheet === "site" ? (
              <div className="adm-stack">
                <AdminWeddingDateSettings />
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={content.admin?.requirePin !== false}
                    onChange={e => patchContent({ admin: { requirePin: e.target.checked } })}
                  />
                  <span>Require PIN</span>
                </label>
                {!emailAuthEnabled ? (
                  <AdminTextField
                    label="Editor PIN"
                    value={content.admin?.pin}
                    onChange={v => patchContent({ admin: { pin: v } })}
                  />
                ) : (
                  <p className="adm-hint">
                    Editor access uses allowlisted emails (<code className="adm-code">ADMIN_EDITOR_EMAILS</code> in
                    server env). No shared PIN.
                  </p>
                )}
              </div>
            ) : null}
            {sheet === "advanced" ? <AdminAdvancedPanel /> : null}
            {sheet === "backup" ? (
              <div className="adm-stack">
                <p className="adm-hint">Download JSON before big changes.</p>
                <button type="button" className="adm-btn" onClick={exportJson}>
                  Download JSON
                </button>
                <textarea
                  className="adm-field__input adm-json"
                  placeholder="Paste JSON to import…"
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  rows={8}
                />
                <button type="button" className="adm-btn" onClick={importJson}>
                  Import JSON
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--danger"
                  onClick={() => {
                    if (confirm("Reset all copy and images to originals?")) resetToDefaults();
                  }}
                >
                  Reset site
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
