import { useWeddingContent } from "../../lib/weddingContent";
import { EditableText } from "../editable/EditableText";
import { SectionHead } from "../editable/SectionTitle";

type Swatch = { name?: string; hex?: string };

/** Home "Our colours" band — the wedding palette guests can dress toward. */
export function WeddingColours() {
  const { content, patchContent } = useWeddingContent();
  const c = content.colours || {};
  const swatches: Swatch[] = Array.isArray(c.swatches) ? c.swatches : [];

  const patchSwatch = (i: number, partial: Partial<Swatch>) => {
    const updated = swatches.map((s, idx) => (idx === i ? { ...s, ...partial } : s));
    patchContent({ colours: { swatches: updated } });
  };

  return (
    <section id="colours" className="section colours">
      <SectionHead
        eyebrow={c.eyebrowLabel}
        eyebrowLabel={c.eyebrowLabel}
        titleLine1={c.titleLine1}
        titleEm={c.titleEm}
        titleLine2={c.titleLine2}
        lede={c.lede}
        onPatch={p => patchContent({ colours: p })}
      />

      <div className="colours__row reveal-stagger">
        {swatches.map((s, i) => {
          const hex = (s.hex || "#000000").trim();
          return (
            <figure key={i} className="colours__swatch">
              <span
                className="colours__chip"
                style={{ background: hex }}
                aria-hidden="true"
              />
              <figcaption className="colours__caption">
                <span className="colours__name">
                  <EditableText value={s.name} onChange={v => patchSwatch(i, { name: v })} plainText />
                </span>
                <span className="colours__hex mono">{hex.toUpperCase()}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
