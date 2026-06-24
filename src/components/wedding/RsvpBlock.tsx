import { useState, useEffect, useCallback } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { parseApiErrorCode, parseApiErrorMessage } from "../../lib/api/json";
import { sanitizePosterHtml } from "../../lib/sanitize-poster";
import { SITE_PATHS } from "../../lib/sitePages";
import { Ph } from "./Core";
import { EditableText } from "../editable/EditableText";
import { EditableImage } from "../editable/EditableImage";
import { SectionHead } from "../editable/SectionTitle";

const MAX_PARTY_SIZE = 5; // lead guest + up to 4 others

type RsvpForm = {
  name: string;
  email: string;
  attendance: "yes" | "no" | null;
  events: string[];
  guests: number;
  partyNames: string[];
  diet: string[];
  song: string;
  note: string;
};

// Remember this device's own last reply so a returning guest can edit/add
// without retyping. Stored locally only — never a server lookup by email,
// which would leak other guests' details to anyone who guesses their address.
const RSVP_DRAFT_KEY = "wedding:rsvp:self:v1";

function loadRsvpDraft(): Partial<RsvpForm> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RSVP_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<RsvpForm>;
    return d && typeof d === "object" ? d : null;
  } catch {
    return null;
  }
}

function saveRsvpDraft(form: RsvpForm): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RSVP_DRAFT_KEY, JSON.stringify(form));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// ============================================================
// RSVP — multi step
// ============================================================
export function RSVP({ initialStep = 0 }: { initialStep?: number }) {
  const { content, patchContent } = useWeddingContent();
  const r = content.rsvp || {};
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [data, setData] = useState<RsvpForm>({
    name: "",
    email: "",
    attendance: null,
    events: ["ceremony", "reception"],
    guests: 1,
    partyNames: [],
    diet: [],
    song: "",
    note: "",
  });

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  // Rehydrate this device's previous reply (done after mount to avoid SSR
  // hydration mismatch). Lets returning guests edit/add without retyping.
  useEffect(() => {
    const draft = loadRsvpDraft();
    if (!draft || !draft.email) return;
    setData(d => ({
      ...d,
      ...draft,
      events: Array.isArray(draft.events) ? draft.events : d.events,
      partyNames: Array.isArray(draft.partyNames) ? draft.partyNames : d.partyNames,
      diet: Array.isArray(draft.diet) ? draft.diet : d.diet,
      guests: typeof draft.guests === "number" ? draft.guests : d.guests,
    }));
    setPrefilled(true);
  }, []);

  const set = <K extends keyof RsvpForm>(k: K, v: RsvpForm[K]) => setData(d => ({ ...d, [k]: v }));
  const toggle = (k: "events" | "diet", v: string) =>
    setData(d => ({
      ...d,
      [k]: d[k].includes(v) ? d[k].filter(x => x !== v) : [...d[k], v],
    }));

  // Party size drives how many additional-guest name fields we show.
  const setPartySize = (n: number) =>
    setData(d => {
      const guests = Math.min(MAX_PARTY_SIZE, Math.max(1, n));
      const extra = guests - 1;
      const partyNames = Array.from({ length: extra }, (_, i) => d.partyNames[i] || "");
      return { ...d, guests, partyNames };
    });

  const setPartyName = (i: number, v: string) =>
    setData(d => ({ ...d, partyNames: d.partyNames.map((x, idx) => (idx === i ? v : x)) }));

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
          guests: data.attendance === "yes" ? data.guests : 1,
          party_names:
            data.attendance === "yes"
              ? data.partyNames.map(n => n.trim()).filter(Boolean)
              : [],
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
      // Remember this reply on the device so they can return and edit it.
      saveRsvpDraft(data);
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
    guests: 1,
    partyNames: [],
    diet: [],
    song: "",
    note: "",
  });

  const resetForm = () => {
    setData(initialForm());
    setPrefilled(false);
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
              <EditableText
                value={r.posterStampTop}
                onChange={v => patchContent({ rsvp: { posterStampTop: v } })}
                plainText
              />
            </div>
            <h3>
              <EditableText
                value={r.posterTitleLine1}
                onChange={v => patchContent({ rsvp: { posterTitleLine1: v } })}
                plainText
              />
              <br />
              <EditableText
                value={r.posterTitleLine2}
                onChange={v => patchContent({ rsvp: { posterTitleLine2: v } })}
                plainText
              />{" "}
              <em>
                <EditableText
                  value={r.posterTitleEm}
                  onChange={v => patchContent({ rsvp: { posterTitleEm: v } })}
                  plainText
                />
              </em>
            </h3>
            <p>
              <EditableText
                value={r.posterBody}
                onChange={v => patchContent({ rsvp: { posterBody: v } })}
                multiline
                as="span"
                plainText
              />
            </p>
          </div>
          <div className="rsvp-stamp">
            <EditableText
              value={r.posterStampLine}
              onChange={v => patchContent({ rsvp: { posterStampLine: v } })}
              plainText
            />
          </div>
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
              {prefilled && (
                <p className="rsvp__prefill-note" role="status">
                  Welcome back — we loaded your last reply. Update anything (like adding to your party) and resend.
                </p>
              )}
              <div className="eyebrow">
                <EditableText value={r.step1Eyebrow} onChange={v => patchContent({ rsvp: { step1Eyebrow: v } })} />
              </div>
              <div className="rsvp__lead">
                <EditableText value={r.step1Lead} onChange={v => patchContent({ rsvp: { step1Lead: v } })} />
              </div>
              <div className="field">
                <label>
                  <EditableText value={r.labelName} onChange={v => patchContent({ rsvp: { labelName: v } })} />
                </label>
                <input value={data.name} onChange={e => set("name", e.target.value)} placeholder={r.phName} />
              </div>
              <div className="field">
                <label>
                  <EditableText value={r.labelEmail} onChange={v => patchContent({ rsvp: { labelEmail: v } })} />
                </label>
                <input type="email" value={data.email} onChange={e => set("email", e.target.value)} placeholder={r.phEmail} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="rsvp__panel">
              <div className="eyebrow">
                <EditableText value={r.step2Eyebrow} onChange={v => patchContent({ rsvp: { step2Eyebrow: v } })} />
              </div>
              <div className="rsvp__lead">
                <EditableText value={r.step2Lead} onChange={v => patchContent({ rsvp: { step2Lead: v } })} />
              </div>
              <div className="choice-row">
                <button type="button" className={`choice choice--gold ${data.attendance === "yes" ? "selected" : ""}`} onClick={() => set("attendance", "yes")}>{r.acceptLabel}</button>
                <button type="button" className={`choice ${data.attendance === "no" ? "selected" : ""}`} onClick={() => set("attendance", "no")}>{r.declineLabel}</button>
              </div>
              {data.attendance === "yes" && (
                <>
                  <div className="field" style={{ marginTop: 16 }}>
                    <label>
                      <EditableText value={r.eventsLabel} onChange={v => patchContent({ rsvp: { eventsLabel: v } })} />
                    </label>
                    <div className="choice-row">
                      {["ceremony","reception"].map(ev => (
                        <button type="button" key={ev} className={`choice ${data.events.includes(ev) ? "selected" : ""}`} onClick={() => toggle("events", ev)}>{ev}</button>
                      ))}
                    </div>
                  </div>

                  <div className="field" style={{ marginTop: 16 }}>
                    <label>How many in your party?</label>
                    <div className="rsvp__stepper" role="group" aria-label="Party size">
                      <button
                        type="button"
                        className="rsvp__stepper-btn"
                        onClick={() => setPartySize(data.guests - 1)}
                        disabled={data.guests <= 1}
                        aria-label="Fewer guests"
                      >
                        −
                      </button>
                      <span className="rsvp__stepper-value" aria-live="polite">{data.guests}</span>
                      <button
                        type="button"
                        className="rsvp__stepper-btn"
                        onClick={() => setPartySize(data.guests + 1)}
                        disabled={data.guests >= MAX_PARTY_SIZE}
                        aria-label="More guests"
                      >
                        +
                      </button>
                      <span className="rsvp__stepper-hint">
                        {data.guests === 1 ? "Just you" : `You + ${data.guests - 1}`}
                      </span>
                    </div>
                  </div>

                  {data.guests > 1 && (
                    <div className="field" style={{ marginTop: 12 }}>
                      <label>Who are you bringing?</label>
                      {data.partyNames.map((nm, i) => (
                        <input
                          key={i}
                          value={nm}
                          onChange={e => setPartyName(i, e.target.value)}
                          placeholder={`Guest ${i + 2} full name`}
                          style={{ marginTop: i === 0 ? 0 : 8 }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="rsvp__panel">
              <div className="eyebrow">
                <EditableText value={r.step3Eyebrow} onChange={v => patchContent({ rsvp: { step3Eyebrow: v } })} />
              </div>
              <div className="rsvp__lead">
                <EditableText value={r.step3Lead} onChange={v => patchContent({ rsvp: { step3Lead: v } })} />
              </div>
              <div className="field">
                <label>
                  <EditableText value={r.dietLabel} onChange={v => patchContent({ rsvp: { dietLabel: v } })} />
                </label>
                <div className="choice-row">
                  {["Vegetarian","Vegan","Pescatarian","Gluten-free","No restrictions"].map(d => (
                    <button type="button" key={d} className={`choice ${data.diet.includes(d) ? "selected" : ""}`} onClick={() => toggle("diet", d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>
                  <EditableText value={r.songLabel} onChange={v => patchContent({ rsvp: { songLabel: v } })} />
                </label>
                <input value={data.song} onChange={e => set("song", e.target.value)} placeholder={r.songPh} />
              </div>
              <div className="field">
                <label>
                  <EditableText value={r.noteLabel} onChange={v => patchContent({ rsvp: { noteLabel: v } })} />
                </label>
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
                {import.meta.env.PUBLIC_SUPABASE_URL
                  ? "Thanks — the hosts will confirm your RSVP. Once approved, sign in on "
                  : data.attendance === "yes"
                    ? `Your seat is noted for ${r.confirmVenue || "Agape House & El-Wak Stadium"}. `
                    : r.successNoBody}
                {import.meta.env.PUBLIC_SUPABASE_URL ? (
                  <>
                    <a href={`${SITE_PATHS.guest}#my-guest`} style={{ color: "var(--champagne)" }}>
                      My guest
                    </a>
                    {" "}
                    with the same email — we&apos;ll send a 6-digit code
                    {data.attendance === "yes"
                      ? " to see your reply and share photos."
                      : " to see your reply."}
                  </>
                ) : data.attendance === "yes" ? (
                  `Your seat is held at ${r.confirmVenue || "Agape House & El-Wak Stadium"}.`
                ) : (
                  r.successNoBody
                )}
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
              label={`${String(i + 1).padStart(2, "0")} ${(p.name || "").split(" ")[0]}`}
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

export { Gallery } from "./GallerySection";


