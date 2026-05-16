import { useState } from "react";
import { useWeddingContent, WEDDING_CONTENT_DEFAULT, validateSiteContentImport } from "../lib/weddingContent";
import { useSiteEditor } from "../lib/siteEditor";
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

function AdminSectionToggles() {
  const { content, patchContent } = useWeddingContent();
  const keys: [keyof typeof content.sections, string][] = [
    ["hero", "Hero"],
    ["story", "Love story"],
    ["details", "Details"],
    ["travel", "Travel"],
    ["rsvp", "RSVP"],
    ["party", "Bridal party"],
    ["gallery", "Gallery"],
    ["registry", "Registry"],
    ["stream", "Livestream"],
    ["invitation", "Guest experience"],
    ["footer", "Footer"],
  ];
  return (
    <div className="adm-stack">
      <p className="adm-hint">Uncheck to hide a section from the site and navigation.</p>
      {keys.map(([k, label]) => (
        <label key={k} className="adm-check">
          <input
            type="checkbox"
            checked={content.sections[k] !== false}
            onChange={e => patchContent({ sections: { [k]: e.target.checked } })}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function AdminArraysPanel() {
  const { content, patchContent } = useWeddingContent();
  const storyDefault = WEDDING_CONTENT_DEFAULT.story.chapters[0];
  const galleryDefault = WEDDING_CONTENT_DEFAULT.gallery.items[0];
  const partyDefault = WEDDING_CONTENT_DEFAULT.party.members[0];
  const itineraryDefault = WEDDING_CONTENT_DEFAULT.details.itinerary[0];

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
        <legend>Gallery photos</legend>
        <div className="editable-image__actions">
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() =>
              patchContent({
                gallery: { items: [...(content.gallery?.items || []), { ...galleryDefault }] },
              })
            }
          >
            Add photo
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--ghost"
            disabled={(content.gallery?.items?.length || 0) <= 1}
            onClick={() => {
              const items = [...(content.gallery?.items || [])];
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

export function AdminToolbar() {
  const { content, patchContent, replaceContent, resetToDefaults, publishStatus, publishError, publishForEveryone } =
    useWeddingContent();
  const { lock } = useSiteEditor();
  const [sheet, setSheet] = useState<SheetId>(null);
  const [importText, setImportText] = useState("");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalError, setSaveModalError] = useState("");

  const canPublish = Boolean(import.meta.env.PUBLIC_SUPABASE_URL?.trim());
  const requirePin = content.admin?.requirePin !== false;

  const handleSavePinSubmit = async (pin: string) => {
    setSaveModalError("");
    const result = await publishForEveryone(pin);
    if (!result.ok) {
      const msg = result.message.toLowerCase().includes("pin") ? result.message : "Incorrect PIN or publish failed.";
      setSaveModalError(msg);
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
      <div className="adm-toolbar" role="toolbar" aria-label="Site editor">
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
        onSubmit={pin => void handleSavePinSubmit(pin)}
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
            {sheet === "sections" ? <AdminSectionToggles /> : null}
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
                <AdminTextField label="Editor PIN" value={content.admin?.pin} onChange={v => patchContent({ admin: { pin: v } })} />
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
