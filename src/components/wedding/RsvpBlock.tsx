import { useState, useEffect, useCallback } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { parseApiErrorCode, parseApiErrorMessage } from "../../lib/api/json";
import { sanitizePosterHtml } from "../../lib/sanitize-poster";
import { SITE_PATHS } from "../../lib/sitePages";
import { Ph } from "./Core";
import { EditableText } from "../editable/EditableText";
import { EditableImage } from "../editable/EditableImage";
import { EditableHtml } from "../editable/EditableHtml";
import { SectionHead } from "../editable/SectionTitle";

type RsvpForm = {
  name: string;
  email: string;
  attendance: "yes" | "no" | null;
  events: string[];
  guests: number;
  diet: string[];
  song: string;
  note: string;
};

// ============================================================
// RSVP — multi step
// ============================================================
export function RSVP({ initialStep = 0 }: { initialStep?: number }) {
  const { content, patchContent } = useWeddingContent();
  const r = content.rsvp || {};
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [data, setData] = useState<RsvpForm>({
    name: "",
    email: "",
    attendance: null,
    events: ["ceremony", "reception"],
    guests: 2,
    diet: [],
    song: "",
    note: "",
  });

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const set = <K extends keyof RsvpForm>(k: K, v: RsvpForm[K]) => setData(d => ({ ...d, [k]: v }));
  const toggle = (k: "events" | "diet", v: string) =>
    setData(d => ({
      ...d,
      [k]: d[k].includes(v) ? d[k].filter(x => x !== v) : [...d[k], v],
    }));

  const steps = ["Identity", "Attendance", "Preferences", "Confirmed"];
  const last = steps.length - 1;

  const canNext = (() => {
    if (step === 0) return data.name.trim().length > 1 && /.+@.+/.test(data.email);
    if (step === 1) return data.attendance != null;
    return true;
  })();

  const persistRsvp = async (): Promise<boolean> => {
    if (!import.meta.env.PUBLIC_SUPABASE_URL) {
      setSubmitError("RSVP saving is not configured yet (add Supabase keys).");
      return false;
    }
    if (data.attendance == null) return false;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          full_name: data.name.trim(),
          attendance: data.attendance,
          events: data.events,
          guests: data.guests,
          diet: data.diet,
          song: data.song,
          note: data.note,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const code = parseApiErrorCode(body);
        setSubmitError(
          code === "save_failed" || code === "auth_provision_failed"
            ? "We couldn't save your reply. Please try again."
            : parseApiErrorMessage(body, "Something went wrong.")
        );
        return false;
      }
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = async () => {
    if (step === 1 && data.attendance === "no") {
      if (!(await persistRsvp())) return;
      setStep(3);
      return;
    }
    if (step === 2) {
      if (!(await persistRsvp())) return;
      setStep(3);
      return;
    }
    setStep(s => Math.min(last, s + 1));
  };

  const stepDotClass = (i: number, currentStep: number) => {
    const active = i === currentStep;
    const skippedNo = data.attendance === "no" && currentStep === 3 && i === 2;
    const done = i < currentStep && !skippedNo;
    return `rsvp__step-dot ${active ? "active" : ""} ${done ? "done" : ""}`;
  };

  const initialForm = (): RsvpForm => ({
    name: "",
    email: "",
    attendance: null,
    events: ["ceremony", "reception"],
    guests: 2,
    diet: [],
    song: "",
    note: "",
  });

  const resetForm = () => {
    setData(initialForm());
    setStep(0);
  };

  return (
    <section id="rsvp" className="section">
      <SectionHead
        eyebrow={r.eyebrow}
        eyebrowLabel={r.eyebrowLabel}
        titleLine1={r.titleLine1}
        titleEm={r.titleEm}
        titleLine2={r.titleLine2}
        lede={r.lede}
        onPatch={p => patchContent({ rsvp: p })}
      />

      <div className="rsvp__wrap reveal">
        <aside className="rsvp__poster">
          <div className="ornament" />
          <div>
            <div className="rsvp-stamp">
              <EditableText value={r.posterStampTop} onChange={v => patchContent({ rsvp: { posterStampTop: v } })} />
            </div>
            <EditableHtml
              as="h3"
              value={r.posterTitleHtml}
              onChange={v => patchContent({ rsvp: { posterTitleHtml: v } })}
              className=""
            />
            <p>
              <EditableText value={r.posterBody} onChange={v => patchContent({ rsvp: { posterBody: v } })} multiline as="span" />
            </p>
          </div>
          <EditableHtml
            value={r.posterStampBottom}
            onChange={v => patchContent({ rsvp: { posterStampBottom: v } })}
            className="rsvp-stamp"
          />
        </aside>

        <div className="rsvp__form-card">
          <div className="rsvp__steps">
            {steps.map((s, i) => (
              <div key={s} className={stepDotClass(i, step)} aria-label={`Step ${i + 1}: ${s}`}>
                <span className="rsvp__step-num">0{i + 1}</span>
                <span className="rsvp__step-label">{s}</span>
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="rsvp__panel">
              <div className="eyebrow">{r.step1Eyebrow}</div>
              <div className="rsvp__lead">{r.step1Lead}</div>
              <div className="field">
                <label>{r.labelName}</label>
                <input value={data.name} onChange={e => set("name", e.target.value)} placeholder={r.phName} />
              </div>
              <div className="field">
                <label>{r.labelEmail}</label>
                <input type="email" value={data.email} onChange={e => set("email", e.target.value)} placeholder={r.phEmail} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="rsvp__panel">
              <div className="eyebrow">{r.step2Eyebrow}</div>
              <div className="rsvp__lead">{r.step2Lead}</div>
              <div className="choice-row">
                <button type="button" className={`choice choice--gold ${data.attendance === "yes" ? "selected" : ""}`} onClick={() => set("attendance", "yes")}>{r.acceptLabel}</button>
                <button type="button" className={`choice ${data.attendance === "no" ? "selected" : ""}`} onClick={() => set("attendance", "no")}>{r.declineLabel}</button>
              </div>
              {data.attendance === "yes" && (
                <>
                  <div className="field" style={{ marginTop: 16 }}>
                    <label>{r.eventsLabel}</label>
                    <div className="choice-row">
                      {["ceremony","cocktails","reception","brunch"].map(ev => (
                        <button type="button" key={ev} className={`choice ${data.events.includes(ev) ? "selected" : ""}`} onClick={() => toggle("events", ev)}>{ev}</button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>{r.guestsLabel}</label>
                    <div className="counter">
                      <button type="button" onClick={() => set("guests", Math.max(1, data.guests - 1))}>–</button>
                      <div className="counter__val">{data.guests}</div>
                      <button type="button" onClick={() => set("guests", Math.min(6, data.guests + 1))}>+</button>
                      <span className="mono" style={{ marginLeft: 12, opacity: 0.55 }}>{r.guestsMaxNote}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="rsvp__panel">
              <div className="eyebrow">{r.step3Eyebrow}</div>
              <div className="rsvp__lead">{r.step3Lead}</div>
              <div className="field">
                <label>{r.dietLabel}</label>
                <div className="choice-row">
                  {["Vegetarian","Vegan","Pescatarian","Gluten-free","No restrictions"].map(d => (
                    <button type="button" key={d} className={`choice ${data.diet.includes(d) ? "selected" : ""}`} onClick={() => toggle("diet", d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>{r.songLabel}</label>
                <input value={data.song} onChange={e => set("song", e.target.value)} placeholder={r.songPh} />
              </div>
              <div className="field">
                <label>{r.noteLabel}</label>
                <textarea value={data.note} onChange={e => set("note", e.target.value)} placeholder={r.notePh} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rsvp__success">
              <div className="seal">✓</div>
              <div className="eyebrow">{r.successEyebrow}</div>
              <h3>{data.attendance === "yes" ? r.successYesTitle : r.successNoTitle}</h3>
              <p>
                {data.attendance === "yes"
                  ? `A confirmation has been sent to ${data.email || "your inbox"}. Your seat for ${data.guests} ${data.guests === 1 ? "person" : "people"} is held at ${r.confirmVenue || "Agape House & El-Wak Stadium"}.`
                  : r.successNoBody}
                {import.meta.env.PUBLIC_SUPABASE_URL ? (
                  <>
                    {" "}
                    Sign in anytime on{" "}
                    <a href={`${SITE_PATHS.guest}#my-guest`} style={{ color: "var(--champagne)" }}>
                      My guest
                    </a>
                    {data.attendance === "yes"
                      ? " to see your reply and share photos."
                      : " to see your reply."}
                  </>
                ) : null}
              </p>
              <button type="button" className="btn btn--ghost" onClick={resetForm}>{r.anotherGuest}</button>
            </div>
          )}

          {submitError && step < last ? (
            <p className="guest-portal__err" style={{ marginTop: 16 }} role="alert">
              {submitError}
            </p>
          ) : null}

          {step < last && (
            <div className="rsvp__actions">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={step === 0 || submitting}
                onClick={() =>
                  setStep(s => {
                    if (s === 3 && data.attendance === "no") return 1;
                    return Math.max(0, s - 1);
                  })
                }
                style={{ opacity: step === 0 ? 0.35 : 1, cursor: step === 0 ? "default" : "pointer" }}
              >
                <span className="arrow" style={{ transform: "rotate(180deg)" }}>→</span> {r.backLabel}
              </button>
              <button
                type="button"
                className="btn"
                disabled={!canNext || submitting}
                onClick={() => void goNext()}
                style={{ opacity: canNext ? 1 : 0.4, cursor: canNext && !submitting ? "pointer" : "not-allowed" }}
              >
                {submitting ? "Saving…" : step === last - 1 ? r.sendLabel : r.continueLabel}{" "}
                <span className="arrow">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// BRIDAL PARTY
// ============================================================
export function BridalParty() {
  const { content, patchContent } = useWeddingContent();
  const pz = content.party || {};
  const members = pz.members || [];

  const patchMember = (i: number, partial: Record<string, string>) => {
    const updated = [...members];
    updated[i] = { ...updated[i], ...partial };
    patchContent({ party: { members: updated } });
  };

  return (
    <section id="party" className="section section--dark">
      <SectionHead
        eyebrow={pz.eyebrow}
        eyebrowLabel={pz.eyebrowLabel}
        titleLine1={pz.titleLine1}
        titleEm={pz.titleEm}
        titleLine2={pz.titleLine2}
        lede={pz.lede}
        onPatch={p => patchContent({ party: p })}
      />

      <div className="party__grid reveal-stagger">
        {members.map((p, i) => (
          <article key={i} className="party-card">
            <EditableImage
              label={`${String(i + 1).padStart(2, "0")} · ${(p.name || "").split(" ")[0]}`}
              src={p.imageUrl}
              variant={i % 2 ? "default" : "blush"}
              onChange={url => patchMember(i, { imageUrl: url })}
            />
            <div className="party-card__overlay">
              <div className="party-card__role">
                <EditableText value={p.role} onChange={v => patchMember(i, { role: v })} />
              </div>
              <div className="party-card__name">
                <EditableText value={p.name} onChange={v => patchMember(i, { name: v })} />
              </div>
              <div className="party-card__bio">
                <EditableText value={p.bio} onChange={v => patchMember(i, { bio: v })} multiline />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// GALLERY w/ lightbox
// ============================================================
export function Gallery() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const gz = content.gallery || {};
  const items = gz.items || [];
  const n = Math.max(1, items.length);
  const [open, setOpen] = useState(-1);
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
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, close, next, prev]);

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

      <div className="gallery reveal">
        {items.map((g, i) => (
          <figure
            key={i}
            className="gallery__item"
            onClick={editor?.isEditing ? undefined : () => setOpen(i)}
          >
            <EditableImage
              label={g.caption}
              src={g.imageUrl}
              variant={i % 3 === 1 ? "blush" : i % 3 === 2 ? "dark" : "default"}
              style={{ aspectRatio: g.ratio }}
              onChange={url => patchItem(i, { imageUrl: url })}
            />
            <figcaption className="gallery__cap">
              <EditableText value={g.caption} onChange={v => patchItem(i, { caption: v })} />
            </figcaption>
          </figure>
        ))}
      </div>

      {open >= 0 && items[open] && (
        <div className="lightbox" onClick={close}>
          <div className="lightbox__img" onClick={e => e.stopPropagation()}>
            <Ph label={items[open].caption} src={items[open].imageUrl} variant={open % 3 === 1 ? "blush" : open % 3 === 2 ? "dark" : "default"} style={{ height: "100%" }} />
          </div>
          <button type="button" className="lightbox__close" onClick={e => { e.stopPropagation(); close(); }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous">‹</button>
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={e => { e.stopPropagation(); next(); }} aria-label="Next">›</button>
          <div className="lightbox__meta" onClick={e => e.stopPropagation()}>{String(open + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} · {items[open].caption}</div>
        </div>
      )}
    </section>
  );
}

