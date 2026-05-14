/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const { useWeddingContent } = window;

// ============================================================
// Hooks & helpers
// ============================================================
const WEDDING_DATE = new Date("2026-12-12T16:00:00+02:00");

function useCountdown(target) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function useReveal(contentRevision) {
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
function Ph({ label, src, variant = "default", className = "", style }) {
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
function Nav() {
  const scrolled = useScrolled(80);
  const { content } = useWeddingContent();
  const sec = content.sections || {};
  const links = [];
  if (sec.story !== false) links.push({ href: "#story", label: "Story" });
  if (sec.details !== false) links.push({ href: "#details", label: "Details" });
  if (sec.gallery !== false) links.push({ href: "#gallery", label: "Gallery" });
  if (sec.registry !== false) links.push({ href: "#registry", label: "Registry" });
  if (sec.stream !== false) links.push({ href: "#stream", label: "Live" });
  return (
    <nav className={`nav ${scrolled ? "nav--solid" : ""}`}>
      <div className="nav__brand">
        <span className="serif" style={{ fontSize: 22 }}>A<span style={{ fontFamily: "var(--script)", color: "var(--champagne)", margin: "0 4px" }}>&amp;</span>A</span>
        <span className="mono-id">{content.nav?.monoId || "No. 12 · 12 · 26"}</span>
      </div>
      <div className="nav__menu">
        {links.map(l => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </div>
      {sec.rsvp !== false && (
        <div className="nav__cta">
          <a href="#rsvp" className="pill">RSVP</a>
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
            width: p.size, height: p.size,
            opacity: p.opacity,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.dur}s`,
            "--dx": `${p.dx}px`
          }} />
      ))}
    </div>
  );
}

function Countdown({ light = true, targetDate }) {
  const target = targetDate instanceof Date && !Number.isNaN(targetDate.getTime()) ? targetDate : WEDDING_DATE;
  const { days, hours, minutes, seconds } = useCountdown(target);
  const units = [
    { v: days,    l: "Days" },
    { v: hours,   l: "Hours" },
    { v: minutes, l: "Min" },
    { v: seconds, l: "Sec" },
  ];
  return (
    <div className="countdown" style={light ? null : { background: "transparent", border: "1px solid var(--hairline)", color: "var(--soft-black)" }}>
      {units.map((u, i) => (
        <React.Fragment key={u.l}>
          {i > 0 && <div className="countdown__sep" />}
          <div className="countdown__unit">
            <div className="countdown__num">{String(u.v).padStart(2, "0")}</div>
            <div className="countdown__label">{u.l}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function Hero({ countdownTarget }) {
  const { content } = useWeddingContent();
  const h = content.hero || {};
  const sec = content.sections || {};
  const bgRef = useRef(null);
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
      </div>

      <div className="hero__eyebrow-row">
        <span>{h.eyebrowLeft}</span>
        <span>
          {h.eyebrowRightBefore}
          <span style={{ fontFamily: "var(--script)", color: "var(--champagne)" }}>&amp;</span>
          {h.eyebrowRightAfter}
        </span>
      </div>

      <div className="hero__inner">
        <h1 className="hero__title">
          <span className="line"><span>{h.nameLine1}</span></span>
          <span className="line"><span><i className="amp">&amp;</i>{h.nameLine2}</span></span>
        </h1>
        <div className="hero__meta">
          <div className="eyebrow"><span className="dot" />{h.savingTheDate}</div>
          <div className="hero__date">{h.dateDisplay}</div>
          <div className="hero__loc">{h.venueLine}</div>
          <Countdown targetDate={countdownTarget} />
          <div className="hero__actions">
            {sec.invitation !== false && (
              <a href="#invitation" className="btn btn--primary">{h.btnInvitation} <span className="arrow">→</span></a>
            )}
            {sec.rsvp !== false && (
              <a href="#rsvp" className="btn">{h.btnRsvp}</a>
            )}
            {sec.story !== false && (
              <a href="#story" className="btn btn--ghost" style={{ color: "var(--ivory)", borderColor: "rgba(255,255,255,0.3)" }}>{h.btnStory}</a>
            )}
          </div>
        </div>
      </div>

      <div className="hero__scroll">
        <span>{h.scrollLabel}</span>
        <span className="line" />
      </div>
    </section>
  );
}

// ============================================================
// LOVE STORY
// ============================================================
function LoveStory() {
  const { content } = useWeddingContent();
  const s = content.story || {};
  const chapters = s.chapters || [];
  return (
    <section id="story" className="section">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{s.eyebrow} <span className="dot" /> {s.eyebrowLabel}</div>
          <h2 className="section__title">{s.titleLine1}<em>{s.titleEm}</em><br />{s.titleLine2}</h2>
        </div>
        <p className="section__lede">{s.lede}</p>
      </div>

      <div className="story__rail">
        {chapters.map((c, i) => (
          <article key={i} className={`story__chapter reveal ${c.flip ? "story__chapter--flip" : ""}`}>
            <div className="story__media">
              <div className="stamp">{c.caption}</div>
              <Ph label={c.caption} src={c.imageUrl} variant={i % 2 === 1 ? "blush" : "default"} />
            </div>
            <div className="story__body">
              <div className="story__chapter-num">{c.chapter}</div>
              <h3 className="story__title">{c.title}</h3>
              <div className="story__date">{c.date}</div>
              <p className="story__copy">{c.body}</p>
              <div className="story__handwritten">— {c.handwritten}</div>
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
function Details() {
  const { content } = useWeddingContent();
  const d = content.details || {};
  const cer = d.ceremonyCard || {};
  const rec = d.receptionCard || {};
  const itinerary = d.itinerary || [];
  return (
    <section id="details" className="section section--beige">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{d.eyebrow} <span className="dot" /> {d.eyebrowLabel}</div>
          <h2 className="section__title">{d.titleLine1}<em>{d.titleEm}</em><br />{d.titleLine2}</h2>
        </div>
        <p className="section__lede">{d.lede}</p>
      </div>

      <div className="details__grid reveal-stagger">
        <article className="details__card">
          <Ph label={cer.imageLabel} src={cer.imageUrl} />
          <div className="details__card-body">
            <div className="eyebrow">{cer.eyebrow}</div>
            <h3>{cer.title}</h3>
            <p className="addr">{cer.addrLine1}<br />{cer.addrLine2}</p>
            <div className="meta">
              <div><span>{cer.arrivalLabel || "Arrival"}</span><strong>{cer.arrivalTime}</strong></div>
              <div><span>{cer.vowsLabel || "Vows"}</span><strong>{cer.vowsTime}</strong></div>
              <div><span>{cer.attireLabel || "Attire"}</span><strong>{cer.attireValue}</strong></div>
            </div>
          </div>
        </article>

        <article className="details__card">
          <Ph label={rec.imageLabel} src={rec.imageUrl} variant="blush" />
          <div className="details__card-body">
            <div className="eyebrow">{rec.eyebrow}</div>
            <h3>{rec.title}</h3>
            <p className="addr">{rec.addrLine1}<br />{rec.addrLine2}</p>
            <div className="meta">
              <div><span>{rec.dinnerLabel || "Dinner"}</span><strong>{rec.dinnerTime}</strong></div>
              <div><span>{rec.dancingLabel || "Dancing"}</span><strong>{rec.dancingTime}</strong></div>
              <div><span>{rec.attireLabel || "Attire"}</span><strong>{rec.attireValue}</strong></div>
            </div>
          </div>
        </article>
      </div>

      <div className="details__map reveal" aria-label="Venue map">
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
        <div className="pin" style={{ left: "32%", top: "55%" }}>{d.mapPinCeremony}</div>
        <div className="pin pin--gold" style={{ left: "62%", top: "38%" }}>{d.mapPinReception}</div>
      </div>

      <div className="itinerary reveal">
        <div className="itinerary__head">
          <div>
            <div className="eyebrow">{d.itineraryEyebrow}</div>
            <h3 className="serif" style={{ fontSize: 36, fontWeight: 300, margin: "8px 0 0" }}>{d.itineraryTitle}</h3>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => window.WL.downloadWeddingIcs?.()}>{d.addCalendarLabel || "Add to calendar"} <span className="arrow">→</span></button>
        </div>
        <div className="itinerary__list">
          {itinerary.map((row, i) => (
            <div className="itin-row" key={i}>
              <div className="itin-row__time">{row.time}</div>
              <div className="itin-row__title">{row.title}<small>{row.sub}</small></div>
              <div className="itin-row__loc">{row.loc}</div>
              <div className="itin-row__attire">{row.attire}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Download a single-event .ics for the wedding (works with Apple, Google import, Outlook). */
function downloadWeddingIcs(filename = "aaron-princess-wedding.ics") {
  const pad = n => String(n).padStart(2, "0");
  const stamp = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const now = new Date();
  // Ceremony anchor: 4:30 PM Africa/Lagos (UTC+1) on 12 Dec 2026 → 15:30 UTC
  const start = new Date(Date.UTC(2026, 11, 12, 15, 30, 0));
  const end = new Date(Date.UTC(2026, 11, 13, 3, 0, 0));
  const fmt = d => stamp(d);
  const uid = `aaron-princess-20261212@${window.location.hostname || "wedding"}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aaron & Princess//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Aaron & Princess — Wedding",
    "DESCRIPTION:Villa Sereno · Ceremony 4:30 PM WAT\\, reception to follow.\\nhttps://aarona.com",
    "LOCATION:Villa Sereno\\, 14 Banana Island Boulevard\\, Ikoyi\\, Lagos\\, Nigeria",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.WL = Object.assign(window.WL || {}, {
  Nav, Hero, LoveStory, Details, Countdown, Ph, useReveal, WEDDING_DATE, downloadWeddingIcs
});
