import { useWeddingContent } from "../../lib/weddingContent";
import { EditableText } from "../editable/EditableText";
import { SectionHead } from "../editable/SectionTitle";

type TravelLeg = {
  stepLabel?: string;
  title?: string;
  subtitle?: string;
  contextLine?: string;
  body?: string;
  addressLine1?: string;
  addressLine2?: string;
  googleUrl?: string;
  tips?: string;
};

function TravelLegCard({
  leg,
  googleLabel,
  onPatch,
}: {
  leg: TravelLeg;
  googleLabel: string;
  onPatch: (partial: Record<string, string>) => void;
}) {
  const g = (leg.googleUrl || "").trim();
  return (
    <article className="travel__leg reveal">
      <div className="travel__leg-step">
        <EditableText value={leg.stepLabel} onChange={v => onPatch({ stepLabel: v })} />
      </div>
      <h3 className="travel__leg-title">
        <EditableText value={leg.title} onChange={v => onPatch({ title: v })} />
      </h3>
      {leg.subtitle ? (
        <p className="travel__leg-sub">
          <EditableText value={leg.subtitle} onChange={v => onPatch({ subtitle: v })} multiline as="span" />
        </p>
      ) : null}
      {leg.contextLine ? (
        <p className="travel__leg-context">
          <EditableText value={leg.contextLine} onChange={v => onPatch({ contextLine: v })} multiline as="span" />
        </p>
      ) : null}
      {leg.body ? (
        <p className="travel__leg-body">
          <EditableText value={leg.body} onChange={v => onPatch({ body: v })} multiline as="span" />
        </p>
      ) : null}
      {(leg.addressLine1 || leg.addressLine2) ? (
        <p className="travel__leg-addr">
          <EditableText value={leg.addressLine1} onChange={v => onPatch({ addressLine1: v })} />
          {leg.addressLine1 && leg.addressLine2 ? <br /> : null}
          <EditableText value={leg.addressLine2} onChange={v => onPatch({ addressLine2: v })} />
        </p>
      ) : null}
      {g ? (
        <div className="travel__leg-links">
          <a className="btn btn--ghost" href={g} target="_blank" rel="noopener noreferrer">
            {googleLabel} <span className="arrow">→</span>
          </a>
        </div>
      ) : null}
      {leg.tips ? (
        <p className="travel__leg-tips">
          <EditableText value={leg.tips} onChange={v => onPatch({ tips: v })} multiline as="span" />
        </p>
      ) : null}
    </article>
  );
}

export function TravelLogistics() {
  const { content, patchContent } = useWeddingContent();
  const t = content.travelLogistics;
  if (!t) return null;

  const gBtn = t.googleMapsBtnLabel || "Google Maps";

  const patchLeg = (key: "airport" | "hotel" | "ceremony", partial: Record<string, string>) => {
    const current = (t[key] as Record<string, unknown>) || {};
    patchContent({ travelLogistics: { [key]: { ...current, ...partial } } });
  };

  return (
    <section id="travel" className="section">
      <SectionHead
        eyebrow={t.eyebrow}
        eyebrowLabel={t.eyebrowLabel}
        titleLine1={t.titleLine1}
        titleEm={t.titleEm}
        titleLine2={t.titleLine2}
        lede={t.lede}
        onPatch={p => patchContent({ travelLogistics: p })}
      />

      {(t.shuttleNote || t.visaNote) ? (
        <div className="travel__notes reveal">
          {t.shuttleNote ? (
            <p className="travel__callout">
              <EditableText value={t.shuttleNote} onChange={v => patchContent({ travelLogistics: { shuttleNote: v } })} multiline as="span" />
            </p>
          ) : null}
          {t.visaNote ? (
            <p className="travel__callout travel__callout--soft">
              <EditableText value={t.visaNote} onChange={v => patchContent({ travelLogistics: { visaNote: v } })} multiline as="span" />
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="travel__grid reveal-stagger">
        <TravelLegCard leg={t.airport || {}} googleLabel={gBtn} onPatch={p => patchLeg("airport", p)} />
        <TravelLegCard leg={t.hotel || {}} googleLabel={gBtn} onPatch={p => patchLeg("hotel", p)} />
        <TravelLegCard leg={t.ceremony || {}} googleLabel={gBtn} onPatch={p => patchLeg("ceremony", p)} />
      </div>

      <footer className="travel__foot reveal">
        {t.disclaimer ? (
          <p className="travel__fine">
            <EditableText value={t.disclaimer} onChange={v => patchContent({ travelLogistics: { disclaimer: v } })} multiline as="span" />
          </p>
        ) : null}
        {t.lastUpdated ? (
          <p className="travel__fine travel__fine--muted">
            Last updated ·{" "}
            <EditableText value={t.lastUpdated} onChange={v => patchContent({ travelLogistics: { lastUpdated: v } })} />
          </p>
        ) : null}
      </footer>
    </section>
  );
}
