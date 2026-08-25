import { Fragment, useState, useMemo, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { deriveWeddingDateFormats } from "../../lib/weddingDateFormats";
import { SITE_PATHS } from "../../lib/sitePages";
import { getBrowserSupabase, isSupabaseConfigured } from "../../lib/supabase/browser";
import { WEDDING_SLUG } from "../../lib/weddingConstants";
import { openPaystackInline, type PaystackCurrency } from "../../lib/paystack";
import { EditableText } from "../editable/EditableText";
import { SectionHead } from "../editable/SectionTitle";

const PAYSTACK_CURRENCIES = new Set<string>(["GHS", "NGN", "USD", "ZAR", "KES", "XOF", "XAF"]);
const REGISTRY_PRESET_EXCLUDE = new Set([2500, 5000]);

function parseAmountPresets(csv: string | undefined, fallback: number[]): number[] {
  const parts = (csv || "")
    .split(/[\s,;]+/)
    .map(s => parseInt(s.replace(/\D/g, ""), 10))
    .filter(n => Number.isFinite(n) && n > 0 && !REGISTRY_PRESET_EXCLUDE.has(n));
  return parts.length ? parts : fallback;
}

function pickPaystackCurrency(regCode: string | undefined): PaystackCurrency {
  const fromEnv = (import.meta.env.PUBLIC_PAYSTACK_CURRENCY || "").trim().toUpperCase();
  const fromReg = (regCode || "").trim().toUpperCase();
  const raw = fromEnv || fromReg || "GHS";
  return (PAYSTACK_CURRENCIES.has(raw) ? raw : "GHS") as PaystackCurrency;
}

// ============================================================
// REGISTRY
// ============================================================
type RegistryProps = { compact?: boolean };

export function Registry({ compact = false }: RegistryProps) {
  const { content, patchContent } = useWeddingContent();
  const reg = content.registry || {};
  const weddingDotDate =
    deriveWeddingDateFormats(content.site?.weddingDateIso)?.dotDateShort ?? "12 · 12 · 26";
  const presets = useMemo(
    () => parseAmountPresets(reg.amountPresetCsv as string | undefined, [200, 500, 1000]),
    [reg.amountPresetCsv]
  );
  const currency = useMemo(() => pickPaystackCurrency(reg.payCurrencyCode as string | undefined), [reg.payCurrencyCode]);
  const moneyFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [currency]
  );

  const [amt, setAmt] = useState(presets[1] ?? 500);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStr, setCustomStr] = useState("");
  const [email, setEmail] = useState("");
  const [giftName, setGiftName] = useState("");
  const [paying, setPaying] = useState(false);
  const [paidRef, setPaidRef] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyField = (key: string, value: string) => {
    navigator.clipboard.writeText((value || "").trim()).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1500);
    }).catch(() => {});
  };
  useEffect(() => {
    if (presets.length && !presets.includes(amt) && !customOpen) {
      setAmt(presets[1] ?? presets[0]);
    }
  }, [presets, amt, customOpen]);

  const effectiveAmt = useMemo(() => {
    if (!customOpen) return amt;
    const n = parseInt(customStr.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? Math.min(999999, n) : 0;
  }, [customOpen, customStr, amt]);

  const pickPreset = (p: number) => {
    setCustomOpen(false);
    setCustomStr("");
    setAmt(p);
  };

  const pickCustom = () => {
    setCustomOpen(true);
    if (presets.includes(amt)) setCustomStr("");
    else setCustomStr(String(amt));
  };

  const publicKey = (import.meta.env.PUBLIC_PAYSTACK_PUBLIC_KEY || "").trim();

  const handleContribute = async () => {
    setPayError(null);
    setPaidRef(null);
    if (!publicKey) {
      setPayError((reg.paystackMissingKeyHint as string) || "Paystack is not configured.");
      return;
    }
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setPayError("Please enter a valid email address for your receipt.");
      return;
    }
    if (!effectiveAmt) {
      setPayError("Choose an amount.");
      return;
    }
    setPaying(true);
    try {
      const ref = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await openPaystackInline({
        publicKey,
        email: em,
        amountMajor: effectiveAmt,
        currency,
        reference: ref,
        metadata: {
          source: "wedding_registry",
          ...(giftName.trim() ? { guest_name: giftName.trim() } : {}),
        },
        onSuccess: reference => {
          setPaidRef(reference);
          setPaying(false);
          if (import.meta.env.PUBLIC_SUPABASE_URL) {
            void fetch("/api/gifts/record", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: em, reference }),
            }).catch(() => undefined);
          }
        },
        onClose: () => {
          setPaying(false);
        },
      });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Checkout could not start.");
      setPaying(false);
    }
  };

  return (
    <section id="registry" className={`section${compact ? " section--beige registry--home" : ""}`}>
      <SectionHead
        eyebrow={reg.eyebrow}
        eyebrowLabel={reg.eyebrowLabel}
        titleLine1={reg.titleLine1}
        titleEm={reg.titleEm}
        lede={reg.lede}
        onPatch={p => patchContent({ registry: p })}
      />

      <div className={`registry__grid reveal-stagger${compact ? " registry__grid--compact" : ""}`}>
        <article className={`registry-card${compact ? " registry-card--horizontal" : ""}`}>
          {compact ? (
            /* Compact home widget — existing horizontal split */
            <div className="registry-card__split">
              <div className="registry-card__col registry-card__col--intro">
                <div className="registry-card__head">
                  <div>
                    <div className="eyebrow">
                      <EditableText value={reg.fundEyebrow} onChange={v => patchContent({ registry: { fundEyebrow: v } })} />
                    </div>
                    <h4>
                      <EditableText value={reg.fundTitle} onChange={v => patchContent({ registry: { fundTitle: v } })} />
                    </h4>
                  </div>
                  <div className="mono" style={{ color: "var(--champagne)" }}>
                    <EditableText value={reg.currencies} onChange={v => patchContent({ registry: { currencies: v } })} />
                  </div>
                </div>
                <p className="section__lede registry-card__lede">
                  <EditableText value={reg.fundBody} onChange={v => patchContent({ registry: { fundBody: v } })} multiline as="span" />
                </p>
                <div className="contribution-amts">
                  {presets.map(p => (
                    <button type="button" key={p} className={`choice ${!customOpen && amt === p ? "selected" : ""}`} onClick={() => pickPreset(p)}>
                      {moneyFmt.format(p)}
                    </button>
                  ))}
                  <button type="button" className={`choice ${customOpen ? "selected" : ""}`} onClick={pickCustom}>Custom</button>
                </div>
                {customOpen && (
                  <div className="field registry-card__custom-amt">
                    <label htmlFor="registry-custom-amt-c">Amount ({currency})</label>
                    <input id="registry-custom-amt-c" inputMode="numeric" autoComplete="off" placeholder="e.g. 750" value={customStr} onChange={e => setCustomStr(e.target.value)} />
                  </div>
                )}
                <div className="registry-card__guest-fields">
                  <div className="field">
                    <label htmlFor="registry-gift-email-c">{reg.contributeEmailLabel}</label>
                    <input id="registry-gift-email-c" type="email" autoComplete="email" placeholder={reg.contributeEmailPlaceholder as string | undefined} value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="registry-gift-name-c">{reg.contributeNameLabel}</label>
                    <input id="registry-gift-name-c" type="text" autoComplete="name" placeholder={reg.contributeNamePlaceholder as string | undefined} value={giftName} onChange={e => setGiftName(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="registry-card__col registry-card__col--checkout">
                <div className="payment-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="chip" />
                    <div className="mono" style={{ letterSpacing: "0.32em", fontSize: 10 }}>A <span style={{ fontFamily: "var(--script)", color: "var(--champagne)", fontSize: 18 }}>&amp;</span> P</div>
                  </div>
                  <div>
                    <div className="num">Paystack · {currency}</div>
                    <div className="meta">
                      <div><div style={{ opacity: 0.5, marginBottom: 4 }}>To</div><EditableText value={(reg.fundPaymentLabel as string) || "Honeymoon fund"} onChange={v => patchContent({ registry: { fundPaymentLabel: v } })} /></div>
                      <div><div style={{ opacity: 0.5, marginBottom: 4 }}>Date</div>{weddingDotDate}</div>
                      <div><div style={{ opacity: 0.5, marginBottom: 4 }}>Amount</div>{effectiveAmt ? moneyFmt.format(effectiveAmt) : "—"}</div>
                    </div>
                  </div>
                </div>
                {payError && <p className="registry__hint registry__hint--error" role="alert">{payError}</p>}
                {paidRef && (
                  <p className="registry__hint registry__hint--ok">
                    {reg.contributePaidNote} <strong className="mono">{paidRef}</strong>
                    {import.meta.env.PUBLIC_SUPABASE_URL ? <>{" "}<a href={`${SITE_PATHS.guest}#my-guest`} style={{ color: "var(--burgundy)" }}>View on My guest</a></> : null}
                  </p>
                )}
                <button type="button" className="btn btn--gold registry-card__submit" disabled={!effectiveAmt || paying} onClick={() => void handleContribute()}>
                  {paying ? "Opening checkout…" : <>Contribute {effectiveAmt ? moneyFmt.format(effectiveAmt) : "—"} <span className="arrow">→</span></>}
                </button>
              </div>
            </div>
          ) : (
            /* Full page — header + lede full width, then Paystack | Bank side-by-side */
            <>
              <div className="registry-card__head">
                <div>
                  <div className="eyebrow">
                    <EditableText value={reg.fundEyebrow} onChange={v => patchContent({ registry: { fundEyebrow: v } })} />
                  </div>
                  <h4>
                    <EditableText value={reg.fundTitle} onChange={v => patchContent({ registry: { fundTitle: v } })} />
                  </h4>
                </div>
                <div className="mono" style={{ color: "var(--champagne)" }}>
                  <EditableText value={reg.currencies} onChange={v => patchContent({ registry: { currencies: v } })} />
                </div>
              </div>
              <p className="section__lede registry-card__lede">
                <EditableText value={reg.fundBody} onChange={v => patchContent({ registry: { fundBody: v } })} multiline as="span" />
              </p>

              <div className="registry-card__pay-split">
                {/* Left: form fields + button */}
                <div className="registry-card__pay-col">
                  <div className="contribution-amts">
                    {presets.map(p => (
                      <button type="button" key={p} className={`choice ${!customOpen && amt === p ? "selected" : ""}`} onClick={() => pickPreset(p)}>
                        {moneyFmt.format(p)}
                      </button>
                    ))}
                    <button type="button" className={`choice ${customOpen ? "selected" : ""}`} onClick={pickCustom}>Custom</button>
                  </div>
                  {customOpen && (
                    <div className="field registry-card__custom-amt">
                      <label htmlFor="registry-custom-amt">Amount ({currency})</label>
                      <input id="registry-custom-amt" inputMode="numeric" autoComplete="off" placeholder="e.g. 750" value={customStr} onChange={e => setCustomStr(e.target.value)} />
                    </div>
                  )}
                  <div className="field" style={{ marginTop: 20 }}>
                    <label htmlFor="registry-gift-email">{reg.contributeEmailLabel}</label>
                    <input id="registry-gift-email" type="email" autoComplete="email" placeholder={reg.contributeEmailPlaceholder as string | undefined} value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <label htmlFor="registry-gift-name">{reg.contributeNameLabel}</label>
                    <input id="registry-gift-name" type="text" autoComplete="name" placeholder={reg.contributeNamePlaceholder as string | undefined} value={giftName} onChange={e => setGiftName(e.target.value)} />
                  </div>
                  {payError && <p className="registry__hint registry__hint--error" role="alert">{payError}</p>}
                  {paidRef && (
                    <p className="registry__hint registry__hint--ok">
                      {reg.contributePaidNote} <strong className="mono">{paidRef}</strong>
                      {import.meta.env.PUBLIC_SUPABASE_URL ? <>{" "}<a href={`${SITE_PATHS.guest}#my-guest`} style={{ color: "var(--burgundy)" }}>View on My guest</a></> : null}
                    </p>
                  )}
                  <button type="button" className="btn btn--gold" style={{ marginTop: 24, width: "100%" }} disabled={!effectiveAmt || paying} onClick={() => void handleContribute()}>
                    {paying ? "Opening checkout…" : <>Contribute {effectiveAmt ? moneyFmt.format(effectiveAmt) : "—"} <span className="arrow">→</span></>}
                  </button>
                </div>

                {/* Right: bank card (top) + Paystack card (bottom) */}
                <div className="registry-card__pay-col" style={{ gap: 16, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                  {(reg.bankName || reg.bankAccountNo) && (
                    <div className="payment-card payment-card--bank payment-card--side">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.55 }}>
                          <EditableText value={reg.bankLabel} onChange={v => patchContent({ registry: { bankLabel: v } })} />
                        </div>
                        <div className="mono" style={{ letterSpacing: "0.32em", fontSize: 10 }}>A <span style={{ fontFamily: "var(--script)", color: "var(--champagne)", fontSize: 18 }}>&amp;</span> P</div>
                      </div>
                      <div>
                        <div className="num">
                          <EditableText value={reg.bankName} onChange={v => patchContent({ registry: { bankName: v } })} />
                        </div>
                        <div className="meta" style={{ flexWrap: "wrap", gap: "12px 24px", marginTop: 12 }}>
                          <div><div style={{ opacity: 0.5, marginBottom: 4 }}>Account name</div><strong style={{ opacity: 1, fontSize: 13 }}><EditableText value={reg.bankAccountName} onChange={v => patchContent({ registry: { bankAccountName: v } })} /></strong></div>
                          <div onClick={() => copyField("accountNo", reg.bankAccountNo as string)} style={{ cursor: "pointer" }}>
                            <div style={{ opacity: 0.5, marginBottom: 4 }}>Account no.</div>
                            <strong style={{ opacity: 1, fontSize: 13, color: copiedField === "accountNo" ? "var(--champagne)" : "inherit" }}>
                              {copiedField === "accountNo" ? "Copied!" : <EditableText value={reg.bankAccountNo} onChange={v => patchContent({ registry: { bankAccountNo: v } })} />}
                            </strong>
                          </div>
                          <div onClick={() => copyField("transit", reg.bankTransit as string)} style={{ cursor: "pointer" }}>
                            <div style={{ opacity: 0.5, marginBottom: 4 }}>Transit</div>
                            <strong style={{ opacity: 1, fontSize: 13, color: copiedField === "transit" ? "var(--champagne)" : "inherit" }}>
                              {copiedField === "transit" ? "Copied!" : <EditableText value={reg.bankTransit} onChange={v => patchContent({ registry: { bankTransit: v } })} />}
                            </strong>
                          </div>
                          <div onClick={() => copyField("institution", reg.bankInstitution as string)} style={{ cursor: "pointer" }}>
                            <div style={{ opacity: 0.5, marginBottom: 4 }}>Institution</div>
                            <strong style={{ opacity: 1, fontSize: 13, color: copiedField === "institution" ? "var(--champagne)" : "inherit" }}>
                              {copiedField === "institution" ? "Copied!" : <EditableText value={reg.bankInstitution} onChange={v => patchContent({ registry: { bankInstitution: v } })} />}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <p style={{ margin: "8px 0 0", fontSize: 11, opacity: 0.5, letterSpacing: "0.04em" }}>
                    Tap the account number, transit, or institution to copy.
                  </p>
                </div>
              </div>
            </>
          )}
        </article>

      </div>

      {compact ? (
        <p className="registry__more reveal">
          <a href={SITE_PATHS.registry} className="btn btn--ghost">
            View full registry <span className="arrow">→</span>
          </a>
        </p>
      ) : null}
    </section>
  );
}


// ============================================================
// GUEST EXPERIENCE — RSVP prompt + welcome (signed-in guests)
// ============================================================
function tpl(str: string, map: Record<string, string>) {
  return String(str || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (map[k] != null ? String(map[k]) : ""));
}

function firstNameFromFullName(fullName: string | undefined): string {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] || "";
}

type GuestExperienceProps = { session: Session };

export function GuestExperience({ session }: GuestExperienceProps) {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const inv = content.invitation || {};
  const [guestFirstName, setGuestFirstName] = useState("");
  const [hasRsvp, setHasRsvp] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !session) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    let active = true;
    void sb
      .from("rsvps")
      .select("full_name")
      .eq("wedding_slug", WEDDING_SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data?.full_name) {
          setHasRsvp(true);
          setGuestFirstName(firstNameFromFullName(data.full_name));
        } else {
          setHasRsvp(false);
          const meta = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name;
          setGuestFirstName(firstNameFromFullName(typeof meta === "string" ? meta : "") || "Guest");
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  const name = editor?.isEditing ? inv.guestFirstName || "Guest" : guestFirstName || "Guest";
  const vars = { name };
  const lede = tpl(inv.ledeTemplate, vars);
  const quote = tpl(inv.welcomeQuoteTemplate, vars);

  return (
    <section id="invitation" className="section section--beige">
      <div className="section__head reveal in">
        <div>
          <div className="eyebrow">
            <EditableText value={inv.eyebrow} onChange={v => patchContent({ invitation: { eyebrow: v } })} />{" "}
            <span className="dot" />{" "}
            <EditableText value={inv.eyebrowLabel} onChange={v => patchContent({ invitation: { eyebrowLabel: v } })} />
          </div>
          <h2 className="section__title">
            <EditableText value={inv.titleLine1} onChange={v => patchContent({ invitation: { titleLine1: v } })} />
            <em>
              <EditableText value={inv.titleEm} onChange={v => patchContent({ invitation: { titleEm: v } })} />
            </em>,<br />
            <EditableText value={inv.titleLine2} onChange={v => patchContent({ invitation: { titleLine2: v } })} />
          </h2>
        </div>
        {editor?.isEditing ? (
          <EditableText
            className="section__lede"
            value={inv.ledeTemplate}
            onChange={v => patchContent({ invitation: { ledeTemplate: v } })}
            multiline
            as="p"
            placeholder="Use {{name}} for the guest first name"
          />
        ) : (
          <p className="section__lede">{lede}</p>
        )}
      </div>

      <div className="guest__grid reveal-stagger in">
        {!hasRsvp ? (
        <article className="guest-card">
          <div className="guest-card__icon">
            <svg viewBox="0 0 24 24"><path d="M9 11H5a2 2 0 0 0-2 2v7h18v-7a2 2 0 0 0-2-2h-4"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>
          </div>
          <div>
            <h4>
              <EditableText value={inv.card3Title} onChange={v => patchContent({ invitation: { card3Title: v } })} />
            </h4>
            <p>
              <EditableText value={inv.card3Body} onChange={v => patchContent({ invitation: { card3Body: v } })} multiline as="span" />
            </p>
          </div>
          <div className="guest-card__rsvp">
            <a
              href={SITE_PATHS.rsvp}
              className="btn btn--gold"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={e => {
                if (editor?.isEditing) e.preventDefault();
              }}
            >
              <EditableText value={inv.card3CtaLabel} onChange={v => patchContent({ invitation: { card3CtaLabel: v } })} />{" "}
              <span className="arrow">→</span>
            </a>
          </div>
        </article>
        ) : null}

        <article className="guest-card">
          <div className="guest-card__icon">
            <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M4 4l8 7 8-7"/></svg>
          </div>
          <div>
            <h4>
              <EditableText value={inv.card4Title} onChange={v => patchContent({ invitation: { card4Title: v } })} />
            </h4>
            {editor?.isEditing ? (
              <EditableText
                style={{ fontFamily: "var(--script)", fontSize: 22, lineHeight: 1.2, color: "var(--charcoal)" }}
                value={inv.welcomeQuoteTemplate}
                onChange={v => patchContent({ invitation: { welcomeQuoteTemplate: v } })}
                multiline
                as="p"
                placeholder="Use {{name}} for the guest first name"
              />
            ) : (
              <p style={{ fontFamily: "var(--script)", fontSize: 22, lineHeight: 1.2, color: "var(--charcoal)" }}>
                {quote}
              </p>
            )}
          </div>
          <div className="preview">
            <span>
              <EditableText value={inv.card4Footer} onChange={v => patchContent({ invitation: { card4Footer: v } })} />
            </span>
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
export function Footer() {
  const { content, patchContent } = useWeddingContent();
  const f = content.footer || {};
  const social = f.social || [];
  const socialHref = (name: string) =>
    social.find(s => s.label?.toLowerCase() === name?.toLowerCase())?.href || null;
  const showSupport =
    Boolean((f.supportLabel || "").trim()) && content.sections?.registry !== false;
  return (
    <footer className="footer">
      <div className="footer__glow" />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
        <div className="eyebrow" style={{ textAlign: "center", color: "rgba(246,242,234,0.5)" }}>
          <EditableText value={f.eyebrow} onChange={v => patchContent({ footer: { eyebrow: v } })} />
        </div>
        <h2 className="footer__signature">
          {socialHref(f.signatureLine1 || "") ? (
            <a href={socialHref(f.signatureLine1 || "")!} target="_blank" rel="noopener noreferrer" className="footer__sig-link">
              <EditableText value={f.signatureLine1} onChange={v => patchContent({ footer: { signatureLine1: v } })} />
            </a>
          ) : (
            <EditableText value={f.signatureLine1} onChange={v => patchContent({ footer: { signatureLine1: v } })} />
          )}{" "}
          <span className="amp">&amp;</span>{" "}
          {socialHref(f.signatureLine2 || "") ? (
            <a href={socialHref(f.signatureLine2 || "")!} target="_blank" rel="noopener noreferrer" className="footer__sig-link">
              <EditableText value={f.signatureLine2} onChange={v => patchContent({ footer: { signatureLine2: v } })} />
            </a>
          ) : (
            <EditableText value={f.signatureLine2} onChange={v => patchContent({ footer: { signatureLine2: v } })} />
          )}
        </h2>
        <div className="footer__hash">
          <EditableText value={f.hash} onChange={v => patchContent({ footer: { hash: v } })} />
        </div>

        {/* Support us — reachable from every page via the footer. Hidden when the
            registry section is switched off, so it never links to an empty page. */}
        {showSupport ? (
          <div className="footer__support">
            {f.supportNote ? (
              <p className="footer__support-note">
                <EditableText
                  value={f.supportNote}
                  onChange={v => patchContent({ footer: { supportNote: v } })}
                  multiline
                  as="span"
                  plainText
                />
              </p>
            ) : null}
            <a className="footer__support-btn" href={f.supportHref || SITE_PATHS.registry}>
              <EditableText
                value={f.supportLabel}
                onChange={v => patchContent({ footer: { supportLabel: v } })}
                plainText
              />
              <span className="arrow" aria-hidden>→</span>
            </a>
          </div>
        ) : null}

        <div className="footer__row">
          <div>
            <EditableText value={f.copyrightLine} onChange={v => patchContent({ footer: { copyrightLine: v } })} />
          </div>
          <div className="footer__social">
            {social.map((s, i) => (
              <a key={i} href={s.href || "#"}>{s.label}</a>
            ))}
          </div>
          <div>{(f.creditLine || "").split("\n").map((line, i) => (
            <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>
          ))}</div>
        </div>
      </div>
    </footer>
  );
}

