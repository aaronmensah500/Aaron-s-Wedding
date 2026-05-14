/* global React */
const { useState: useState3, useMemo: useMemo3 } = React;
const { useWeddingContent } = window;
const { Ph: Ph3, Countdown: Countdown3 } = window.WL;

// ============================================================
// REGISTRY
// ============================================================
function Registry() {
  const { content } = useWeddingContent();
  const reg = content.registry || {};
  const presets = [100, 250, 500, 1000, 2500];
  const [amt, setAmt] = useState3(250);
  const [customOpen, setCustomOpen] = useState3(false);
  const [customStr, setCustomStr] = useState3("");
  const effectiveAmt = useMemo3(() => {
    if (!customOpen) return amt;
    const n = parseInt(customStr.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? Math.min(999999, n) : 0;
  }, [customOpen, customStr, amt]);

  const pickPreset = p => {
    setCustomOpen(false);
    setCustomStr("");
    setAmt(p);
  };

  const pickCustom = () => {
    setCustomOpen(true);
    if (presets.includes(amt)) setCustomStr("");
    else setCustomStr(String(amt));
  };

  return (
    <section id="registry" className="section">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{reg.eyebrow} <span className="dot" /> {reg.eyebrowLabel}</div>
          <h2 className="section__title">{reg.titleLine1}<em>{reg.titleEm}</em></h2>
        </div>
        <p className="section__lede">{reg.lede}</p>
      </div>

      <div className="registry__grid reveal-stagger">
        <article className="registry-card">
          <div className="registry-card__head">
            <div>
              <div className="eyebrow">{reg.fundEyebrow}</div>
              <h4>{reg.fundTitle}</h4>
            </div>
            <div className="mono" style={{ color: "var(--champagne)" }}>{reg.currencies}</div>
          </div>
          <p className="section__lede" style={{ maxWidth: "100%" }}>{reg.fundBody}</p>

          <div className="contribution-amts">
            {presets.map(p => (
              <button type="button" key={p} className={`choice ${!customOpen && amt === p ? "selected" : ""}`} onClick={() => pickPreset(p)}>${p.toLocaleString()}</button>
            ))}
            <button type="button" className={`choice ${customOpen ? "selected" : ""}`} onClick={pickCustom}>Custom</button>
          </div>

          {customOpen && (
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="registry-custom-amt">Amount (USD)</label>
              <input
                id="registry-custom-amt"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 750"
                value={customStr}
                onChange={e => setCustomStr(e.target.value)}
              />
            </div>
          )}

          <div className="payment-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="chip" />
              <div className="mono" style={{ letterSpacing: "0.32em", fontSize: 10 }}>A <span style={{ fontFamily: "var(--script)", color: "var(--champagne)", fontSize: 18 }}>&amp;</span> A</div>
            </div>
            <div>
              <div className="num">5417 ··· ··· ${String(effectiveAmt || amt || 0).padStart(4, "0").slice(-4)}</div>
              <div className="meta">
                <div><div style={{ opacity: 0.5, marginBottom: 4 }}>Holder</div>The Couple</div>
                <div><div style={{ opacity: 0.5, marginBottom: 4 }}>Expires</div>12 / 26</div>
                <div><div style={{ opacity: 0.5, marginBottom: 4 }}>Amount</div>${effectiveAmt ? effectiveAmt.toLocaleString() : "—"}</div>
              </div>
            </div>
          </div>

          <button type="button" className="btn btn--gold" style={{ marginTop: 24, width: "100%" }} disabled={!effectiveAmt}>
            Contribute ${effectiveAmt ? effectiveAmt.toLocaleString() : "—"} <span className="arrow">→</span>
          </button>
        </article>

        <article className="registry-card qr-card">
          <div className="registry-card__head">
            <div>
              <div className="eyebrow">{reg.qrEyebrow}</div>
              <h4>{reg.qrTitle}</h4>
            </div>
          </div>
          <div className="qr-block">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              {/* Stylized QR — pure decoration */}
              {Array.from({ length: 18 }, (_, r) =>
                Array.from({ length: 18 }, (_, c) => {
                  const filled = ((r * 31 + c * 17) % 7) > 2 || (r === 0 || c === 0 || r === 17 || c === 17);
                  if (!filled) return null;
                  return <rect key={`${r}-${c}`} x={3 + c * 5.2} y={3 + r * 5.2} width="4.6" height="4.6" fill="var(--soft-black)" />;
                })
              )}
              {/* Position squares */}
              {[[3,3],[78,3],[3,78]].map(([x,y], k) => (
                <g key={k}>
                  <rect x={x} y={y} width="20" height="20" fill="var(--warm-white)" />
                  <rect x={x} y={y} width="20" height="20" fill="none" stroke="var(--soft-black)" strokeWidth="2.5" />
                  <rect x={x+6} y={y+6} width="8" height="8" fill="var(--soft-black)" />
                </g>
              ))}
              {/* Center monogram */}
              <rect x="38" y="38" width="24" height="24" fill="var(--warm-white)" stroke="var(--champagne)" strokeWidth="1.2" />
              <text x="50" y="56" textAnchor="middle" fontFamily="var(--script)" fontSize="22" fill="var(--champagne)">&amp;</text>
            </svg>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--muted)" }}>
            <span>{reg.qrDomain}</span>
            <span style={{ color: "var(--champagne)" }}>{reg.qrHint}</span>
          </div>
        </article>
      </div>
    </section>
  );
}

// ============================================================
// LIVESTREAM
// ============================================================
function Livestream() {
  const { content } = useWeddingContent();
  const st = content.stream || {};
  const countdownTarget = useMemo3(() => {
    const d = new Date(content.site?.weddingDateIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [content.site?.weddingDateIso]);
  const [playing, setPlaying] = useState3(false);
  const sched = st.schedule || [];
  return (
    <section id="stream" className="section section--dark">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow" style={{ color: "rgba(246,242,234,0.6)" }}>{st.eyebrow} <span className="dot" /> {st.eyebrowLabel}</div>
          <h2 className="section__title" style={{ color: "var(--ivory)" }}>{st.titleLine1}<em>{st.titleEm}</em><br />{st.titleLine2}</h2>
        </div>
        <p className="section__lede">{st.lede}</p>
      </div>

      <div className="stream__wrap reveal">
        <div className="stream__player">
          <Ph3 label={st.playerImageLabel} src={st.playerImageUrl} variant="dark" />
          <div className="stream__overlay">
            <div className="stream__live"><span className="dot" /> {st.liveBadge}</div>
            {!playing && (
              <button type="button" className="stream__play" onClick={() => setPlaying(true)} aria-label="Play preview">
                <svg viewBox="0 0 24 24"><path d="M5 3l16 9-16 9V3z" /></svg>
              </button>
            )}
            <div className="stream__controls">
              <span>{st.controlsLeft}</span>
              <div className="progress" />
              <span>{playing ? st.previewText : st.awaitingText}</span>
            </div>
          </div>
        </div>

        <aside className="stream__panel">
          <div className="eyebrow" style={{ color: "var(--champagne)" }}>{st.panelEyebrow}</div>
          <h3>{(st.panelTitle || "").split("\n").map((line, i) => (
            <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
          ))}</h3>
          <Countdown3 light={false} targetDate={countdownTarget} />
          <div className="schedule">
            {sched.map((row, i) => (
              <div key={i} className="schedule-row"><strong>{row.label}</strong><span className="t">{row.time}</span></div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="btn btn--gold" style={{ flex: 1 }} onClick={() => window.WL.downloadWeddingIcs?.("aaron-princess-livestream-reminder.ics")}>{st.remindLabel} <span className="arrow">→</span></button>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => window.WL.downloadWeddingIcs?.()}>{st.calendarLabel}</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ============================================================
// GUEST EXPERIENCE — QR pass, seating, wallet, welcome
// ============================================================
function SeatingMap() {
  // Stylized round-table seating with one highlighted table
  return (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="none" />
      {/* Dance floor */}
      <rect x="130" y="70" width="60" height="40" rx="2" fill="none" stroke="rgba(26,23,20,0.3)" strokeDasharray="2 3" />
      <text x="160" y="93" textAnchor="middle" fontFamily="var(--mono)" fontSize="6" letterSpacing="2" fill="rgba(26,23,20,0.5)">FLOOR</text>
      {/* Tables */}
      {[
        [50, 40], [110, 30], [210, 30], [270, 40],
        [40, 100], [280, 100],
        [60, 150], [130, 155], [200, 155], [270, 150]
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill={i === 6 ? "var(--champagne)" : "var(--ivory)"} stroke="rgba(26,23,20,0.4)" strokeWidth="1" />
          <text x={x} y={y+3} textAnchor="middle" fontFamily="var(--serif)" fontSize="9" fill={i === 6 ? "var(--soft-black)" : "rgba(26,23,20,0.6)"}>T{String(i+1).padStart(2,"0")}</text>
          {i === 6 && (
            <>
              <circle cx={x} cy={y} r="20" fill="none" stroke="var(--champagne)" strokeWidth="0.5" strokeDasharray="2 2" />
              <text x={x} y={y+34} textAnchor="middle" fontFamily="var(--mono)" fontSize="5" letterSpacing="1.5" fill="var(--champagne)">YOUR TABLE</text>
            </>
          )}
        </g>
      ))}
      {/* Head table */}
      <rect x="120" y="20" width="80" height="8" fill="rgba(26,23,20,0.15)" />
      <text x="160" y="15" textAnchor="middle" fontFamily="var(--mono)" fontSize="5" letterSpacing="2" fill="rgba(26,23,20,0.5)">HEAD TABLE</text>
    </svg>
  );
}

function tpl(str, map) {
  return String(str || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (map[k] != null ? String(map[k]) : ""));
}

function GuestExperience() {
  const { content } = useWeddingContent();
  const inv = content.invitation || {};
  const name = inv.guestFirstName || "Guest";
  const vars = { name };
  const lede = tpl(inv.ledeTemplate, vars);
  const quote = tpl(inv.welcomeQuoteTemplate, vars);
  return (
    <section id="invitation" className="section section--beige">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{inv.eyebrow} <span className="dot" /> {inv.eyebrowLabel}</div>
          <h2 className="section__title">{inv.titleLine1}<em>{inv.titleEm}</em>,<br />{inv.titleLine2}</h2>
        </div>
        <p className="section__lede">{lede}</p>
      </div>

      <div className="guest__grid reveal-stagger">
        <article className="guest-card">
          <div className="guest-card__icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 14h3M14 18h3M18 21h3M21 17v4"/></svg>
          </div>
          <div>
            <h4>{inv.card1Title}</h4>
            <p>{inv.card1Body}</p>
          </div>
          <div className="preview">
            <span>{inv.card1PreviewPrefix}{name.toUpperCase()}</span>
            <span>→</span>
          </div>
        </article>

        <article className="guest-card">
          <div className="guest-card__icon">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="6" cy="9" r="1.5"/><circle cx="18" cy="9" r="1.5"/><circle cx="9" cy="16" r="1.5"/><circle cx="15" cy="16" r="1.5"/></svg>
          </div>
          <div>
            <h4>{inv.card2Title}</h4>
            <p>{inv.card2Body}</p>
          </div>
          <div className="seating-preview"><SeatingMap /></div>
        </article>

        <article className="guest-card">
          <div className="guest-card__icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></svg>
          </div>
          <div>
            <h4>{inv.card3Title}</h4>
            <p>{inv.card3Body}</p>
          </div>
          <div className="wallet">
            <div className="w-top"><span>{inv.walletTopLeft}</span><span>{inv.walletTopRight}</span></div>
            <div>
              <div className="eyebrow" style={{ fontSize: 8 }}>{inv.walletGuestEyebrow}</div>
              <div className="w-name">{name} {inv.guestLastName}</div>
            </div>
            <div className="w-bottom">
              <div><span style={{ opacity: 0.55 }}>Table</span><strong>{inv.walletTable}</strong></div>
              <div><span style={{ opacity: 0.55 }}>Seat</span><strong>{inv.walletSeat}</strong></div>
              <div><span style={{ opacity: 0.55 }}>Wine</span><strong>{inv.walletWine}</strong></div>
            </div>
          </div>
        </article>

        <article className="guest-card">
          <div className="guest-card__icon">
            <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M4 4l8 7 8-7"/></svg>
          </div>
          <div>
            <h4>{inv.card4Title}</h4>
            <p style={{ fontFamily: "var(--script)", fontSize: 22, lineHeight: 1.2, color: "var(--charcoal)" }}>
              {quote}
            </p>
          </div>
          <div className="preview">
            <span>{inv.card4Footer}</span>
            <span style={{ color: "var(--champagne)" }}>♡</span>
          </div>
        </article>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer() {
  const { content } = useWeddingContent();
  const f = content.footer || {};
  const social = f.social || [];
  return (
    <footer className="footer">
      <div className="footer__glow" />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
        <div className="eyebrow" style={{ textAlign: "center", color: "rgba(246,242,234,0.5)" }}>{f.eyebrow}</div>
        <h2 className="footer__signature">{f.signatureLine1} <span className="amp">&amp;</span> {f.signatureLine2}</h2>
        <div className="footer__hash">{f.hash}</div>
        <div className="footer__row">
          <div>{f.copyrightLine}</div>
          <div className="footer__social">
            {social.map((s, i) => (
              <a key={i} href={s.href || "#"}>{s.label}</a>
            ))}
          </div>
          <div>{(f.creditLine || "").split("\n").map((line, i) => (
            <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
          ))}</div>
        </div>
      </div>
    </footer>
  );
}

window.WL = Object.assign(window.WL || {}, { Registry, Livestream, GuestExperience, Footer });
