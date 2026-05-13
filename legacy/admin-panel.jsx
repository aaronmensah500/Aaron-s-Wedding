/* global React */
const { useState, useEffect, useCallback } = React;
const { useWeddingContent, WEDDING_CONTENT_DEFAULT } = window;

const ADMIN_SESSION_KEY = "wedding_site_admin_unlocked";

function isAdminUrl() {
  try {
    return new URLSearchParams(window.location.search).get("admin") === "1";
  } catch {
    return false;
  }
}

function AdminTextField({ label, value, onChange, multiline, rows }) {
  return (
    <label className="adm-field">
      <span className="adm-field__lbl">{label}</span>
      {multiline ? (
        <textarea className="adm-field__input" rows={rows || 3} value={value || ""} onChange={e => onChange(e.target.value)} />
      ) : (
        <input className="adm-field__input" type="text" value={value || ""} onChange={e => onChange(e.target.value)} />
      )}
    </label>
  );
}

function AdminSectionToggles({ content, patchContent }) {
  const keys = [
    ["hero", "Hero"],
    ["story", "Love story"],
    ["details", "Details"],
    ["rsvp", "RSVP"],
    ["party", "Bridal party"],
    ["gallery", "Gallery"],
    ["registry", "Registry"],
    ["stream", "Livestream"],
    ["invitation", "Guest experience"],
    ["footer", "Footer"]
  ];
  return (
    <div className="adm-stack">
      <p className="adm-hint">Uncheck to hide a section from the page and navigation.</p>
      {keys.map(([k, label]) => (
        <label key={k} className="adm-check">
          <input
            type="checkbox"
            checked={content.sections[k] !== false}
            onChange={e => patchContent({ sections: { [k]: e.target.checked } } })}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function ClientAdmin() {
  const { content, patchContent, replaceContent, resetToDefaults } = useWeddingContent();
  const [hasSession, setHasSession] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [gateOpen, setGateOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState("sections");
  const [importText, setImportText] = useState("");

  useEffect(() => {
    if (isAdminUrl() && content.admin?.requirePin === false) {
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      } catch (e) { /* ignore */ }
      setHasSession(true);
      setEditorOpen(true);
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, [content.admin?.requirePin]);

  const tryUnlock = useCallback(
    pin => {
      const need = content.admin?.requirePin !== false;
      if (!need || pin === String(content.admin?.pin || "")) {
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        } catch (e) { /* ignore */ }
        setHasSession(true);
        setPinError("");
        setPinInput("");
        setGateOpen(false);
        setEditorOpen(true);
        if (isAdminUrl()) window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        return true;
      }
      setPinError("PIN incorrect.");
      return false;
    },
    [content.admin]
  );

  const lock = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (e) { /* ignore */ }
    setHasSession(false);
    setEditorOpen(false);
    setGateOpen(false);
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
      replaceContent(parsed);
      setImportText("");
      alert("Imported successfully.");
    } catch (e) {
      alert("Invalid JSON: " + (e && e.message));
    }
  };

  return (
    <>
      <button
        type="button"
        className={`adm-launcher ${hasSession ? "adm-launcher--on" : ""}`}
        onClick={() => {
          if (!hasSession) setGateOpen(true);
          else setEditorOpen(o => !o);
        }}
        aria-label={hasSession ? "Toggle site editor" : "Open site editor"}
      >
        {hasSession ? (editorOpen ? "Close editor" : "Edit site") : "Edit site"}
      </button>

      {gateOpen && !hasSession && (
        <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-pin-title">
          <div className="adm-modal__card">
            <h2 id="adm-pin-title" className="adm-modal__title">Site editor</h2>
            <p className="adm-hint">
              Default PIN is often the wedding date <code className="adm-code">121226</code>. Change it under Site &amp; admin. Or add{" "}
              <code className="adm-code">?admin=1</code> to the URL after turning off &quot;Require PIN&quot;.
            </p>
            {content.admin?.requirePin !== false && (
              <input
                className="adm-field__input"
                type="password"
                inputMode="numeric"
                placeholder="PIN"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") tryUnlock(pinInput);
                }}
              />
            )}
            {pinError ? <p className="adm-err">{pinError}</p> : null}
            <div className="adm-modal__actions">
              <button type="button" className="adm-btn" onClick={() => tryUnlock(pinInput)}>Unlock</button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => {
                  setGateOpen(false);
                  setPinInput("");
                  setPinError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {hasSession && editorOpen && (
        <div className="adm-shell" role="dialog" aria-label="Site content editor">
          <div className="adm-shell__hd">
            <strong>Site editor</strong>
            <div className="adm-shell__hd-actions">
              <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={lock}>Lock</button>
            </div>
          </div>
          <div className="adm-tabs">
            {[
              ["sections", "Sections"],
              ["site", "Site & admin"],
              ["hero", "Hero"],
              ["story", "Story"],
              ["details", "Details"],
              ["rsvp", "RSVP"],
              ["party", "Party"],
              ["gallery", "Gallery"],
              ["registry", "Registry"],
              ["stream", "Live"],
              ["invitation", "Guests"],
              ["footer", "Footer"],
              ["backup", "Backup"]
            ].map(([id, lbl]) => (
              <button type="button" key={id} className={`adm-tab ${tab === id ? "adm-tab--on" : ""}`} onClick={() => setTab(id)}>
                {lbl}
              </button>
            ))}
          </div>
          <div className="adm-shell__body">
            {tab === "sections" && <AdminSectionToggles content={content} patchContent={patchContent} />}

            {tab === "site" && (
              <div className="adm-stack">
                <AdminTextField
                  label="Countdown date (ISO)"
                  value={content.site?.weddingDateIso}
                  onChange={v => patchContent({ site: { weddingDateIso: v } })}
                />
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={content.admin?.requirePin !== false}
                    onChange={e => patchContent({ admin: { requirePin: e.target.checked } })}
                  />
                  <span>Require PIN to open editor</span>
                </label>
                <AdminTextField label="Editor PIN" value={content.admin?.pin} onChange={v => patchContent({ admin: { pin: v } })} />
                <AdminTextField label="Nav mono line" value={content.nav?.monoId} onChange={v => patchContent({ nav: { monoId: v } })} />
              </div>
            )}

            {tab === "hero" && (
              <div className="adm-stack">
                <AdminTextField label="Hero background image URL" value={content.hero?.bgImageUrl} onChange={v => patchContent({ hero: { bgImageUrl: v } })} />
                <AdminTextField label="Venue line (under date)" value={content.hero?.venueLine} onChange={v => patchContent({ hero: { venueLine: v } })} />
                <AdminTextField label="Eyebrow left" value={content.hero?.eyebrowLeft} onChange={v => patchContent({ hero: { eyebrowLeft: v } })} />
                <AdminTextField label="Eyebrow right (before gold &amp;)" value={content.hero?.eyebrowRightBefore} onChange={v => patchContent({ hero: { eyebrowRightBefore: v } })} />
                <AdminTextField label="Eyebrow right (after &amp;)" value={content.hero?.eyebrowRightAfter} onChange={v => patchContent({ hero: { eyebrowRightAfter: v } })} />
                <AdminTextField label="Name line 1" value={content.hero?.nameLine1} onChange={v => patchContent({ hero: { nameLine1: v } })} />
                <AdminTextField label="Name line 2" value={content.hero?.nameLine2} onChange={v => patchContent({ hero: { nameLine2: v } })} />
                <AdminTextField label="Eyebrow (Saving the date)" value={content.hero?.savingTheDate} onChange={v => patchContent({ hero: { savingTheDate: v } })} />
                <AdminTextField label="Roman date line" value={content.hero?.dateDisplay} onChange={v => patchContent({ hero: { dateDisplay: v } })} />
                <AdminTextField label="Scroll label" value={content.hero?.scrollLabel} onChange={v => patchContent({ hero: { scrollLabel: v } })} />
                <AdminTextField label="Button: View invitation" value={content.hero?.btnInvitation} onChange={v => patchContent({ hero: { btnInvitation: v } })} />
                <AdminTextField label="Button: RSVP" value={content.hero?.btnRsvp} onChange={v => patchContent({ hero: { btnRsvp: v } })} />
                <AdminTextField label="Button: Our story" value={content.hero?.btnStory} onChange={v => patchContent({ hero: { btnStory: v } })} />
              </div>
            )}

            {tab === "story" && (
              <div className="adm-stack">
                <AdminTextField label="Section eyebrow no." value={content.story?.eyebrow} onChange={v => patchContent({ story: { eyebrow: v } })} />
                <AdminTextField label="Section eyebrow label" value={content.story?.eyebrowLabel} onChange={v => patchContent({ story: { eyebrowLabel: v } })} />
                <AdminTextField label="Title line before em" value={content.story?.titleLine1} onChange={v => patchContent({ story: { titleLine1: v } })} />
                <AdminTextField label="Title emphasis word" value={content.story?.titleEm} onChange={v => patchContent({ story: { titleEm: v } })} />
                <AdminTextField label="Title line after em" value={content.story?.titleLine2} onChange={v => patchContent({ story: { titleLine2: v } })} />
                <AdminTextField label="Intro paragraph" value={content.story?.lede} onChange={v => patchContent({ story: { lede: v } })} multiline rows={4} />
                {(content.story?.chapters || []).map((ch, i) => (
                  <fieldset key={i} className="adm-fieldset">
                    <legend>Chapter {i + 1}</legend>
                    <label className="adm-check">
                      <input
                        type="checkbox"
                        checked={!!ch.flip}
                        onChange={e => {
                          const chapters = [...content.story.chapters];
                          chapters[i] = { ...chapters[i], flip: e.target.checked };
                          patchContent({ story: { chapters } });
                        }}
                      />
                      <span>Flip layout (image right)</span>
                    </label>
                    <AdminTextField label="Image URL (optional)" value={ch.imageUrl} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], imageUrl: v };
                      patchContent({ story: { chapters } });
                    }} />
                    <AdminTextField label="Chapter label" value={ch.chapter} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], chapter: v };
                      patchContent({ story: { chapters } });
                    }} />
                    <AdminTextField label="Title" value={ch.title} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], title: v };
                      patchContent({ story: { chapters } });
                    }} />
                    <AdminTextField label="Date line" value={ch.date} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], date: v };
                      patchContent({ story: { chapters } });
                    }} />
                    <AdminTextField label="Stamp / photo caption" value={ch.caption} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], caption: v };
                      patchContent({ story: { chapters } });
                    }} />
                    <AdminTextField label="Body" value={ch.body} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], body: v };
                      patchContent({ story: { chapters } });
                    }} multiline rows={5} />
                    <AdminTextField label="Handwritten line" value={ch.handwritten} onChange={v => {
                      const chapters = [...content.story.chapters];
                      chapters[i] = { ...chapters[i], handwritten: v };
                      patchContent({ story: { chapters } });
                    }} />
                  </fieldset>
                ))}
              </div>
            )}

            {tab === "details" && (
              <div className="adm-stack">
                <AdminTextField label="Eyebrow no." value={content.details?.eyebrow} onChange={v => patchContent({ details: { eyebrow: v } })} />
                <AdminTextField label="Eyebrow label" value={content.details?.eyebrowLabel} onChange={v => patchContent({ details: { eyebrowLabel: v } })} />
                <AdminTextField label="Title line 1" value={content.details?.titleLine1} onChange={v => patchContent({ details: { titleLine1: v } })} />
                <AdminTextField label="Title emphasis" value={content.details?.titleEm} onChange={v => patchContent({ details: { titleEm: v } })} />
                <AdminTextField label="Title line 2" value={content.details?.titleLine2} onChange={v => patchContent({ details: { titleLine2: v } })} />
                <AdminTextField label="Intro" value={content.details?.lede} onChange={v => patchContent({ details: { lede: v } })} multiline rows={3} />
                <h4 className="adm-subhd">Ceremony card</h4>
                <AdminTextField label="Image URL" value={content.details?.ceremonyCard?.imageUrl} onChange={v => patchContent({ details: { ceremonyCard: { imageUrl: v } } })} />
                <AdminTextField label="Placeholder label" value={content.details?.ceremonyCard?.imageLabel} onChange={v => patchContent({ details: { ceremonyCard: { imageLabel: v } } })} />
                <AdminTextField label="Eyebrow" value={content.details?.ceremonyCard?.eyebrow} onChange={v => patchContent({ details: { ceremonyCard: { eyebrow: v } } })} />
                <AdminTextField label="Title" value={content.details?.ceremonyCard?.title} onChange={v => patchContent({ details: { ceremonyCard: { title: v } } })} />
                <AdminTextField label="Address line 1" value={content.details?.ceremonyCard?.addrLine1} onChange={v => patchContent({ details: { ceremonyCard: { addrLine1: v } } })} />
                <AdminTextField label="Address line 2" value={content.details?.ceremonyCard?.addrLine2} onChange={v => patchContent({ details: { ceremonyCard: { addrLine2: v } } })} />
                <AdminTextField label="Arrival time" value={content.details?.ceremonyCard?.arrivalTime} onChange={v => patchContent({ details: { ceremonyCard: { arrivalTime: v } } })} />
                <AdminTextField label="Vows time" value={content.details?.ceremonyCard?.vowsTime} onChange={v => patchContent({ details: { ceremonyCard: { vowsTime: v } } })} />
                <AdminTextField label="Attire value" value={content.details?.ceremonyCard?.attireValue} onChange={v => patchContent({ details: { ceremonyCard: { attireValue: v } } })} />
                <h4 className="adm-subhd">Reception card</h4>
                <AdminTextField label="Image URL" value={content.details?.receptionCard?.imageUrl} onChange={v => patchContent({ details: { receptionCard: { imageUrl: v } } })} />
                <AdminTextField label="Placeholder label" value={content.details?.receptionCard?.imageLabel} onChange={v => patchContent({ details: { receptionCard: { imageLabel: v } } })} />
                <AdminTextField label="Eyebrow" value={content.details?.receptionCard?.eyebrow} onChange={v => patchContent({ details: { receptionCard: { eyebrow: v } } })} />
                <AdminTextField label="Title" value={content.details?.receptionCard?.title} onChange={v => patchContent({ details: { receptionCard: { title: v } } })} />
                <AdminTextField label="Address line 1" value={content.details?.receptionCard?.addrLine1} onChange={v => patchContent({ details: { receptionCard: { addrLine1: v } } })} />
                <AdminTextField label="Address line 2" value={content.details?.receptionCard?.addrLine2} onChange={v => patchContent({ details: { receptionCard: { addrLine2: v } } })} />
                <AdminTextField label="Dinner time" value={content.details?.receptionCard?.dinnerTime} onChange={v => patchContent({ details: { receptionCard: { dinnerTime: v } } })} />
                <AdminTextField label="Dancing time" value={content.details?.receptionCard?.dancingTime} onChange={v => patchContent({ details: { receptionCard: { dancingTime: v } } })} />
                <AdminTextField label="Attire value" value={content.details?.receptionCard?.attireValue} onChange={v => patchContent({ details: { receptionCard: { attireValue: v } } })} />
                <AdminTextField label="Map pin: ceremony" value={content.details?.mapPinCeremony} onChange={v => patchContent({ details: { mapPinCeremony: v } })} />
                <AdminTextField label="Map pin: reception" value={content.details?.mapPinReception} onChange={v => patchContent({ details: { mapPinReception: v } })} />
                <AdminTextField label="Itinerary eyebrow" value={content.details?.itineraryEyebrow} onChange={v => patchContent({ details: { itineraryEyebrow: v } })} />
                <AdminTextField label="Itinerary title" value={content.details?.itineraryTitle} onChange={v => patchContent({ details: { itineraryTitle: v } })} />
                <AdminTextField label="Add to calendar button" value={content.details?.addCalendarLabel} onChange={v => patchContent({ details: { addCalendarLabel: v } })} />
                {(content.details?.itinerary || []).map((row, i) => (
                  <fieldset key={i} className="adm-fieldset">
                    <legend>Itinerary row {i + 1}</legend>
                    <AdminTextField label="Time" value={row.time} onChange={v => {
                      const itinerary = [...content.details.itinerary];
                      itinerary[i] = { ...itinerary[i], time: v };
                      patchContent({ details: { itinerary } });
                    }} />
                    <AdminTextField label="Title" value={row.title} onChange={v => {
                      const itinerary = [...content.details.itinerary];
                      itinerary[i] = { ...itinerary[i], title: v };
                      patchContent({ details: { itinerary } });
                    }} />
                    <AdminTextField label="Subtitle" value={row.sub} onChange={v => {
                      const itinerary = [...content.details.itinerary];
                      itinerary[i] = { ...itinerary[i], sub: v };
                      patchContent({ details: { itinerary } });
                    }} />
                    <AdminTextField label="Location" value={row.loc} onChange={v => {
                      const itinerary = [...content.details.itinerary];
                      itinerary[i] = { ...itinerary[i], loc: v };
                      patchContent({ details: { itinerary } });
                    }} />
                    <AdminTextField label="Attire" value={row.attire} onChange={v => {
                      const itinerary = [...content.details.itinerary];
                      itinerary[i] = { ...itinerary[i], attire: v };
                      patchContent({ details: { itinerary } });
                    }} />
                  </fieldset>
                ))}
              </div>
            )}

            {tab === "rsvp" && (
              <div className="adm-stack">
                {Object.keys(WEDDING_CONTENT_DEFAULT.rsvp).map(key => (
                  <AdminTextField
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                    value={content.rsvp?.[key]}
                    onChange={v => patchContent({ rsvp: { [key]: v } })}
                    multiline={String(content.rsvp?.[key] || "").length > 90 || key === "posterTitleHtml"}
                    rows={key === "posterTitleHtml" ? 2 : 3}
                  />
                ))}
              </div>
            )}

            {tab === "party" && (
              <div className="adm-stack">
                <AdminTextField label="Eyebrow no." value={content.party?.eyebrow} onChange={v => patchContent({ party: { eyebrow: v } })} />
                <AdminTextField label="Eyebrow label" value={content.party?.eyebrowLabel} onChange={v => patchContent({ party: { eyebrowLabel: v } })} />
                <AdminTextField label="Title line 1" value={content.party?.titleLine1} onChange={v => patchContent({ party: { titleLine1: v } })} />
                <AdminTextField label="Title emphasis" value={content.party?.titleEm} onChange={v => patchContent({ party: { titleEm: v } })} />
                <AdminTextField label="Lede" value={content.party?.lede} onChange={v => patchContent({ party: { lede: v } })} multiline rows={3} />
                {(content.party?.members || []).map((m, i) => (
                  <fieldset key={i} className="adm-fieldset">
                    <legend>Party member {i + 1}</legend>
                    <AdminTextField label="Image URL" value={m.imageUrl} onChange={v => {
                      const members = [...content.party.members];
                      members[i] = { ...members[i], imageUrl: v };
                      patchContent({ party: { members } });
                    }} />
                    <AdminTextField label="Role" value={m.role} onChange={v => {
                      const members = [...content.party.members];
                      members[i] = { ...members[i], role: v };
                      patchContent({ party: { members } });
                    }} />
                    <AdminTextField label="Name" value={m.name} onChange={v => {
                      const members = [...content.party.members];
                      members[i] = { ...members[i], name: v };
                      patchContent({ party: { members } });
                    }} />
                    <AdminTextField label="Bio" value={m.bio} onChange={v => {
                      const members = [...content.party.members];
                      members[i] = { ...members[i], bio: v };
                      patchContent({ party: { members } });
                    }} multiline rows={2} />
                  </fieldset>
                ))}
              </div>
            )}

            {tab === "gallery" && (
              <div className="adm-stack">
                <AdminTextField label="Eyebrow no." value={content.gallery?.eyebrow} onChange={v => patchContent({ gallery: { eyebrow: v } })} />
                <AdminTextField label="Eyebrow label" value={content.gallery?.eyebrowLabel} onChange={v => patchContent({ gallery: { eyebrowLabel: v } })} />
                <AdminTextField label="Title line 1" value={content.gallery?.titleLine1} onChange={v => patchContent({ gallery: { titleLine1: v } })} />
                <AdminTextField label="Title emphasis" value={content.gallery?.titleEm} onChange={v => patchContent({ gallery: { titleEm: v } })} />
                <AdminTextField label="Lede" value={content.gallery?.lede} onChange={v => patchContent({ gallery: { lede: v } })} multiline rows={3} />
                {(content.gallery?.items || []).map((g, i) => (
                  <fieldset key={i} className="adm-fieldset">
                    <legend>Photo {i + 1}</legend>
                    <AdminTextField label="Aspect ratio (e.g. 3/4)" value={g.ratio} onChange={v => {
                      const items = [...content.gallery.items];
                      items[i] = { ...items[i], ratio: v };
                      patchContent({ gallery: { items } });
                    }} />
                    <AdminTextField label="Caption" value={g.caption} onChange={v => {
                      const items = [...content.gallery.items];
                      items[i] = { ...items[i], caption: v };
                      patchContent({ gallery: { items } });
                    }} />
                    <AdminTextField label="Image URL" value={g.imageUrl} onChange={v => {
                      const items = [...content.gallery.items];
                      items[i] = { ...items[i], imageUrl: v };
                      patchContent({ gallery: { items } });
                    }} />
                  </fieldset>
                ))}
              </div>
            )}

            {tab === "registry" && (
              <div className="adm-stack">
                {Object.keys(WEDDING_CONTENT_DEFAULT.registry).map(key => (
                  <AdminTextField
                    key={key}
                    label={key}
                    value={content.registry?.[key]}
                    onChange={v => patchContent({ registry: { [key]: v } })}
                    multiline={String(content.registry?.[key] || "").length > 100}
                    rows={3}
                  />
                ))}
              </div>
            )}

            {tab === "stream" && (
              <div className="adm-stack">
                <AdminTextField label="Eyebrow no." value={content.stream?.eyebrow} onChange={v => patchContent({ stream: { eyebrow: v } })} />
                <AdminTextField label="Eyebrow label" value={content.stream?.eyebrowLabel} onChange={v => patchContent({ stream: { eyebrowLabel: v } })} />
                <AdminTextField label="Title line 1" value={content.stream?.titleLine1} onChange={v => patchContent({ stream: { titleLine1: v } })} />
                <AdminTextField label="Title emphasis" value={content.stream?.titleEm} onChange={v => patchContent({ stream: { titleEm: v } })} />
                <AdminTextField label="Title line 2" value={content.stream?.titleLine2} onChange={v => patchContent({ stream: { titleLine2: v } })} />
                <AdminTextField label="Lede" value={content.stream?.lede} onChange={v => patchContent({ stream: { lede: v } })} multiline rows={3} />
                <AdminTextField label="Player image URL" value={content.stream?.playerImageUrl} onChange={v => patchContent({ stream: { playerImageUrl: v } })} />
                <AdminTextField label="Player placeholder label" value={content.stream?.playerImageLabel} onChange={v => patchContent({ stream: { playerImageLabel: v } })} />
                <AdminTextField label="Live badge" value={content.stream?.liveBadge} onChange={v => patchContent({ stream: { liveBadge: v } })} />
                <AdminTextField label="Controls left" value={content.stream?.controlsLeft} onChange={v => patchContent({ stream: { controlsLeft: v } })} />
                <AdminTextField label="Awaiting text" value={content.stream?.awaitingText} onChange={v => patchContent({ stream: { awaitingText: v } })} />
                <AdminTextField label="Preview text" value={content.stream?.previewText} onChange={v => patchContent({ stream: { previewText: v } })} />
                <AdminTextField label="Panel eyebrow" value={content.stream?.panelEyebrow} onChange={v => patchContent({ stream: { panelEyebrow: v } })} />
                <AdminTextField label="Panel title" value={content.stream?.panelTitle} onChange={v => patchContent({ stream: { panelTitle: v } })} multiline rows={2} />
                <AdminTextField label="Remind button" value={content.stream?.remindLabel} onChange={v => patchContent({ stream: { remindLabel: v } })} />
                <AdminTextField label="Calendar button" value={content.stream?.calendarLabel} onChange={v => patchContent({ stream: { calendarLabel: v } })} />
                {(content.stream?.schedule || []).map((row, i) => (
                  <fieldset key={i} className="adm-fieldset">
                    <legend>Schedule {i + 1}</legend>
                    <AdminTextField label="Label" value={row.label} onChange={v => {
                      const schedule = [...content.stream.schedule];
                      schedule[i] = { ...schedule[i], label: v };
                      patchContent({ stream: { schedule } });
                    }} />
                    <AdminTextField label="Time" value={row.time} onChange={v => {
                      const schedule = [...content.stream.schedule];
                      schedule[i] = { ...schedule[i], time: v };
                      patchContent({ stream: { schedule } });
                    }} />
                  </fieldset>
                ))}
              </div>
            )}

            {tab === "invitation" && (
              <div className="adm-stack">
                {Object.keys(WEDDING_CONTENT_DEFAULT.invitation).map(key => (
                  <AdminTextField
                    key={key}
                    label={key}
                    value={content.invitation?.[key]}
                    onChange={v => patchContent({ invitation: { [key]: v } })}
                    multiline={String(key).includes("Template") || String(key).includes("Quote")}
                    rows={3}
                  />
                ))}
              </div>
            )}

            {tab === "footer" && (
              <div className="adm-stack">
                <AdminTextField label="Eyebrow" value={content.footer?.eyebrow} onChange={v => patchContent({ footer: { eyebrow: v } })} />
                <AdminTextField label="Signature line 1" value={content.footer?.signatureLine1} onChange={v => patchContent({ footer: { signatureLine1: v } })} />
                <AdminTextField label="Signature line 2" value={content.footer?.signatureLine2} onChange={v => patchContent({ footer: { signatureLine2: v } })} />
                <AdminTextField label="Hashtag line" value={content.footer?.hash} onChange={v => patchContent({ footer: { hash: v } })} />
                <AdminTextField label="Copyright" value={content.footer?.copyrightLine} onChange={v => patchContent({ footer: { copyrightLine: v } })} multiline rows={2} />
                <AdminTextField label="Credit line" value={content.footer?.creditLine} onChange={v => patchContent({ footer: { creditLine: v } })} multiline rows={2} />
                {(content.footer?.social || []).map((s, i) => (
                  <fieldset key={i} className="adm-fieldset">
                    <legend>Social link {i + 1}</legend>
                    <AdminTextField label="Label" value={s.label} onChange={v => {
                      const social = [...content.footer.social];
                      social[i] = { ...social[i], label: v };
                      patchContent({ footer: { social } });
                    }} />
                    <AdminTextField label="URL" value={s.href} onChange={v => {
                      const social = [...content.footer.social];
                      social[i] = { ...social[i], href: v };
                      patchContent({ footer: { social } });
                    }} />
                  </fieldset>
                ))}
              </div>
            )}

            {tab === "backup" && (
              <div className="adm-stack">
                <p className="adm-hint">Edits save to this browser automatically. Export JSON before clearing cache.</p>
                <button type="button" className="adm-btn" onClick={exportJson}>Download JSON</button>
                <textarea className="adm-field__input adm-json" placeholder="Paste JSON to import…" value={importText} onChange={e => setImportText(e.target.value)} rows={8} />
                <button type="button" className="adm-btn" onClick={importJson}>Import JSON</button>
                <button type="button" className="adm-btn adm-btn--danger" onClick={() => { if (confirm("Reset all copy and images to the original site?")) resetToDefaults(); }}>Reset site to originals</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { ClientAdmin });
