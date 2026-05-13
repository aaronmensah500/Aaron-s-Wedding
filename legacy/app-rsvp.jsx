/* global React */
const { useState: useState2, useEffect: useEffect2, useCallback: useCallback2 } = React;
const { useWeddingContent } = window;
const { Ph: Ph2 } = window.WL;

// ============================================================
// RSVP — multi step
// ============================================================
function RSVP({ initialStep = 0 }) {
  const { content } = useWeddingContent();
  const r = content.rsvp || {};
  const [step, setStep] = useState2(initialStep);
  const [data, setData] = useState2({
    name: "", email: "",
    attendance: null,        // 'yes' | 'no'
    events: ["ceremony","reception"],
    guests: 2,
    diet: [],
    song: "", note: ""
  });

  useEffect2(() => { setStep(initialStep); }, [initialStep]);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const toggle = (k, v) => setData(d => ({
    ...d,
    [k]: d[k].includes(v) ? d[k].filter(x => x !== v) : [...d[k], v]
  }));

  const steps = ["Identity", "Attendance", "Preferences", "Confirmed"];
  const last = steps.length - 1;

  const canNext = (() => {
    if (step === 0) return data.name.trim().length > 1 && /.+@.+/.test(data.email);
    if (step === 1) return data.attendance != null;
    return true;
  })();

  const goNext = () => {
    if (step === 1 && data.attendance === "no") {
      setStep(3);
      return;
    }
    setStep(s => Math.min(last, s + 1));
  };

  const stepDotClass = (i, currentStep) => {
    const active = i === currentStep;
    const skippedNo = data.attendance === "no" && currentStep === 3 && i === 2;
    const done = i < currentStep && !skippedNo;
    return `rsvp__step-dot ${active ? "active" : ""} ${done ? "done" : ""}`;
  };

  const initialForm = () => ({
    name: "", email: "",
    attendance: null,
    events: ["ceremony", "reception"],
    guests: 2,
    diet: [],
    song: "", note: ""
  });

  const resetForm = () => {
    setData(initialForm());
    setStep(0);
  };

  return (
    <section id="rsvp" className="section">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{r.eyebrow} <span className="dot" /> {r.eyebrowLabel}</div>
          <h2 className="section__title">{r.titleLine1}<em>{r.titleEm}</em><br />{r.titleLine2}</h2>
        </div>
        <p className="section__lede">{r.lede}</p>
      </div>

      <div className="rsvp__wrap reveal">
        <aside className="rsvp__poster">
          <div className="ornament" />
          <div>
            <div className="rsvp-stamp">{r.posterStampTop}</div>
            <h3 style={{ marginTop: 20 }} dangerouslySetInnerHTML={{ __html: r.posterTitleHtml || "" }} />
            <p>{r.posterBody}</p>
          </div>
          <div className="rsvp-stamp" dangerouslySetInnerHTML={{ __html: r.posterStampBottom || "" }} />
        </aside>

        <div className="rsvp__form-card">
          <div className="rsvp__steps">
            {steps.map((s, i) => (
              <div key={s} className={stepDotClass(i, step)}>
                <span className="rsvp__step-num">0{i+1}</span> {s}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="rsvp__panel">
              <div className="eyebrow">{r.step1Eyebrow}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 300, lineHeight: 1.1 }}>{r.step1Lead}</div>
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
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 300, lineHeight: 1.1 }}>{r.step2Lead}</div>
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
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 300, lineHeight: 1.1 }}>{r.step3Lead}</div>
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
              <p>{data.attendance === "yes"
                ? `A confirmation has been sent to ${data.email || "your inbox"}. Your seat for ${data.guests} ${data.guests === 1 ? "person" : "people"} is held at ${r.confirmVenue || "Villa Sereno"}.`
                : r.successNoBody}</p>
              <button type="button" className="btn btn--ghost" onClick={resetForm}>{r.anotherGuest}</button>
            </div>
          )}

          {step < last && (
            <div className="rsvp__actions">
              <button type="button" className="btn btn--ghost" disabled={step === 0} onClick={() => setStep(s => {
                if (s === 3 && data.attendance === "no") return 1;
                return Math.max(0, s - 1);
              })} style={{ opacity: step === 0 ? 0.35 : 1, cursor: step === 0 ? "default" : "pointer" }}>
                <span className="arrow" style={{ transform: "rotate(180deg)" }}>→</span> {r.backLabel}
              </button>
              <button type="button" className="btn" disabled={!canNext} onClick={goNext} style={{ opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "not-allowed" }}>
                {step === last - 1 ? r.sendLabel : r.continueLabel} <span className="arrow">→</span>
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
function BridalParty() {
  const { content } = useWeddingContent();
  const pz = content.party || {};
  const members = pz.members || [];
  return (
    <section id="party" className="section section--dark">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{pz.eyebrow} <span className="dot" /> {pz.eyebrowLabel}</div>
          <h2 className="section__title" style={{ color: "var(--ivory)" }}>{pz.titleLine1}<br />{pz.titleLine2}<em>{pz.titleEm}</em></h2>
        </div>
        <p className="section__lede">{pz.lede}</p>
      </div>

      <div className="party__grid reveal-stagger">
        {members.map((p, i) => (
          <article key={i} className="party-card">
            <Ph2 label={`${String(i+1).padStart(2,"0")} · ${(p.name || "").split(" ")[0]}`} src={p.imageUrl} variant={i % 2 ? "default" : "blush"} />
            <div className="party-card__overlay">
              <div className="party-card__role">{p.role}</div>
              <div className="party-card__name">{p.name}</div>
              <div className="party-card__bio">{p.bio}</div>
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
function Gallery() {
  const { content } = useWeddingContent();
  const gz = content.gallery || {};
  const items = gz.items || [];
  const n = Math.max(1, items.length);
  const [open, setOpen] = useState2(-1);
  const close = useCallback2(() => setOpen(-1), []);
  const next = useCallback2(() => setOpen(o => (o + 1) % n), [n]);
  const prev = useCallback2(() => setOpen(o => (o - 1 + n) % n), [n]);

  useEffect2(() => {
    if (open < 0) return;
    const onKey = e => {
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
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{gz.eyebrow} <span className="dot" /> {gz.eyebrowLabel}</div>
          <h2 className="section__title">{gz.titleLine1}<em>{gz.titleEm}</em></h2>
        </div>
        <p className="section__lede">{gz.lede}</p>
      </div>

      <div className="gallery reveal">
        {items.map((g, i) => (
          <figure key={i} className="gallery__item" onClick={() => setOpen(i)}>
            <Ph2 label={g.caption} src={g.imageUrl} variant={i % 3 === 1 ? "blush" : i % 3 === 2 ? "dark" : "default"} style={{ aspectRatio: g.ratio }} />
            <figcaption className="gallery__cap">{g.caption}</figcaption>
          </figure>
        ))}
      </div>

      {open >= 0 && items[open] && (
        <div className="lightbox" onClick={close}>
          <div className="lightbox__img" onClick={e => e.stopPropagation()}>
            <Ph2 label={items[open].caption} src={items[open].imageUrl} variant={open % 3 === 1 ? "blush" : open % 3 === 2 ? "dark" : "default"} style={{ height: "100%" }} />
          </div>
          <button type="button" className="lightbox__close" onClick={e => { e.stopPropagation(); close(); }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous">‹</button>
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={e => { e.stopPropagation(); next(); }} aria-label="Next">›</button>
          <div className="lightbox__meta" onClick={e => e.stopPropagation()}>{String(open+1).padStart(2,"0")} / {String(items.length).padStart(2,"0")} · {items[open].caption}</div>
        </div>
      )}
    </section>
  );
}

window.WL = Object.assign(window.WL || {}, { RSVP, BridalParty, Gallery });
