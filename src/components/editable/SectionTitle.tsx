import { EditableText } from "./EditableText";

type SectionTitleProps = {
  titleLine1?: string;
  titleEm?: string;
  titleLine2?: string;
  className?: string;
  onPatch: (partial: {
    titleLine1?: string;
    titleEm?: string;
    titleLine2?: string;
  }) => void;
};

/** Section heading with optional emphasis line — three editable content fields. */
export function SectionTitle({ titleLine1, titleEm, titleLine2, className = "section__title", onPatch }: SectionTitleProps) {
  return (
    <h2 className={className}>
      <EditableText value={titleLine1} onChange={v => onPatch({ titleLine1: v })} />
      <em>
        <EditableText value={titleEm} onChange={v => onPatch({ titleEm: v })} />
      </em>
      {titleLine2 ? (
        <>
          <br />
          <EditableText value={titleLine2} onChange={v => onPatch({ titleLine2: v })} />
        </>
      ) : null}
    </h2>
  );
}

type SectionHeadProps = {
  eyebrow?: string;
  eyebrowLabel?: string;
  titleLine1?: string;
  titleEm?: string;
  titleLine2?: string;
  lede?: string;
  onPatch: (partial: Record<string, string>) => void;
};

export function SectionHead({
  eyebrow,
  eyebrowLabel,
  titleLine1,
  titleEm,
  titleLine2,
  lede,
  onPatch,
}: SectionHeadProps) {
  return (
    <div className="section__head reveal">
      <div>
        <div className="eyebrow">
          <EditableText value={eyebrow} onChange={v => onPatch({ eyebrow: v })} />{" "}
          <span className="dot" />{" "}
          <EditableText value={eyebrowLabel} onChange={v => onPatch({ eyebrowLabel: v })} />
        </div>
        <SectionTitle
          titleLine1={titleLine1}
          titleEm={titleEm}
          titleLine2={titleLine2}
          onPatch={onPatch}
        />
      </div>
      <EditableText
        as="p"
        className="section__lede"
        value={lede}
        onChange={v => onPatch({ lede: v })}
        multiline
      />
    </div>
  );
}
