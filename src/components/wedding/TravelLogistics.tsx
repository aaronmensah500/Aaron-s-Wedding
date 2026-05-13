import { useWeddingContent } from "../../lib/weddingContent";

type TravelLeg = {
  stepLabel?: string;
  title?: string;
  subtitle?: string;
  contextLine?: string;
  body?: string;
  addressLine1?: string;
  addressLine2?: string;
  googleUrl?: string;
  appleUrl?: string;
  tips?: string;
};

function TravelLegCard({
  leg,
  googleLabel,
  appleLabel,
}: {
  leg: TravelLeg;
  googleLabel: string;
  appleLabel: string;
}) {
  const g = (leg.googleUrl || "").trim();
  const a = (leg.appleUrl || "").trim();
  return (
    <article className="travel__leg reveal">
      <div className="travel__leg-step">{leg.stepLabel}</div>
      <h3 className="travel__leg-title">{leg.title}</h3>
      {leg.subtitle ? <p className="travel__leg-sub">{leg.subtitle}</p> : null}
      {leg.contextLine ? <p className="travel__leg-context">{leg.contextLine}</p> : null}
      {leg.body ? <p className="travel__leg-body">{leg.body}</p> : null}
      {(leg.addressLine1 || leg.addressLine2) ? (
        <p className="travel__leg-addr">
          {leg.addressLine1}
          {leg.addressLine1 && leg.addressLine2 ? <br /> : null}
          {leg.addressLine2}
        </p>
      ) : null}
      {(g || a) ? (
        <div className="travel__leg-links">
          {g ? (
            <a className="btn btn--ghost" href={g} target="_blank" rel="noopener noreferrer">
              {googleLabel} <span className="arrow">→</span>
            </a>
          ) : null}
          {a ? (
            <a className="btn btn--ghost" href={a} target="_blank" rel="noopener noreferrer">
              {appleLabel} <span className="arrow">→</span>
            </a>
          ) : null}
        </div>
      ) : null}
      {leg.tips ? <p className="travel__leg-tips">{leg.tips}</p> : null}
    </article>
  );
}

export function TravelLogistics() {
  const { content } = useWeddingContent();
  const t = content.travelLogistics;
  if (!t) return null;

  const gBtn = t.googleMapsBtnLabel || "Google Maps";
  const aBtn = t.appleMapsBtnLabel || "Apple Maps";

  return (
    <section id="travel" className="section">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">{t.eyebrow} <span className="dot" /> {t.eyebrowLabel}</div>
          <h2 className="section__title">
            {t.titleLine1}<em>{t.titleEm}</em><br />{t.titleLine2}
          </h2>
        </div>
        <p className="section__lede">{t.lede}</p>
      </div>

      {(t.shuttleNote || t.visaNote) ? (
        <div className="travel__notes reveal">
          {t.shuttleNote ? <p className="travel__callout">{t.shuttleNote}</p> : null}
          {t.visaNote ? <p className="travel__callout travel__callout--soft">{t.visaNote}</p> : null}
        </div>
      ) : null}

      <div className="travel__grid reveal-stagger">
        <TravelLegCard leg={t.airport || {}} googleLabel={gBtn} appleLabel={aBtn} />
        <TravelLegCard leg={t.hotel || {}} googleLabel={gBtn} appleLabel={aBtn} />
        <TravelLegCard leg={t.ceremony || {}} googleLabel={gBtn} appleLabel={aBtn} />
        <TravelLegCard leg={t.reception || {}} googleLabel={gBtn} appleLabel={aBtn} />
      </div>

      <footer className="travel__foot reveal">
        {t.disclaimer ? <p className="travel__fine">{t.disclaimer}</p> : null}
        {t.lastUpdated ? <p className="travel__fine travel__fine--muted">Last updated · {t.lastUpdated}</p> : null}
      </footer>
    </section>
  );
}
