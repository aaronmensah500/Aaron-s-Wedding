import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { EditableText } from "../editable/EditableText";
import { SectionHead } from "../editable/SectionTitle";
import { FloralCorners } from "./FloralCorners";

type ServiceRow = { item?: string; by?: string };
type LeadRow = { role?: string; name?: string };

/** Small ✕ shown beside list rows while the site editor is unlocked. */
function RemoveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="prog__remove" onClick={onClick} aria-label={label} title="Remove this row">
      ✕
    </button>
  );
}

/**
 * Program outline — the printed order of service, rendered as a booklet page.
 * Every line is editable in place; lists gain add/remove controls in edit mode.
 */
export function ProgramOutline() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing);

  const p = content.program || {};
  const leads: LeadRow[] = Array.isArray(p.leads) ? p.leads : [];
  const service: ServiceRow[] = Array.isArray(p.service) ? p.service : [];
  const ministers: string[] = Array.isArray(p.ministers) ? p.ministers : [];
  const support: string[] = Array.isArray(p.support) ? p.support : [];
  const photography: string[] = Array.isArray(p.photography) ? p.photography : [];

  const patch = (partial: Record<string, unknown>) => patchContent({ program: partial });

  const patchLead = (i: number, part: Partial<LeadRow>) =>
    patch({ leads: leads.map((r, idx) => (idx === i ? { ...r, ...part } : r)) });

  const patchService = (i: number, part: Partial<ServiceRow>) =>
    patch({ service: service.map((r, idx) => (idx === i ? { ...r, ...part } : r)) });

  const patchName = (key: "ministers" | "support" | "photography", list: string[], i: number, v: string) =>
    patch({ [key]: list.map((n, idx) => (idx === i ? v : n)) });

  const removeAt = (key: string, list: unknown[], i: number) =>
    patch({ [key]: list.filter((_, idx) => idx !== i) });

  return (
    <section id="program" className="section section--beige program">
      <FloralCorners />
      <SectionHead
        eyebrow={p.eyebrowLabel}
        eyebrowLabel={p.eyebrowLabel}
        titleLine1={p.titleLine1}
        titleEm={p.titleEm}
        titleLine2={p.titleLine2}
        lede={p.lede}
        onPatch={patchPartial => patch(patchPartial as Record<string, unknown>)}
      />

      {/* ---------- Booklet header ---------- */}
      <div className="prog-card prog-card--head reveal">
        <div className="prog-head__rule" aria-hidden />
        <h3 className="prog-head__title">
          <EditableText value={p.heading} onChange={v => patch({ heading: v })} plainText />
        </h3>
        <div className="prog-head__between">
          <EditableText value={p.betweenLabel} onChange={v => patch({ betweenLabel: v })} plainText />
        </div>
        <p className="prog-head__names">
          <EditableText value={p.coupleNames} onChange={v => patch({ coupleNames: v })} multiline as="span" plainText />
        </p>
        <div className="prog-head__rule" aria-hidden />

        <dl className="prog-head__facts">
          <div>
            <dt><EditableText value={p.dateLabel} onChange={v => patch({ dateLabel: v })} plainText /></dt>
            <dd><EditableText value={p.dateValue} onChange={v => patch({ dateValue: v })} plainText /></dd>
          </div>
          <div>
            <dt><EditableText value={p.timeLabel} onChange={v => patch({ timeLabel: v })} plainText /></dt>
            <dd><EditableText value={p.timeValue} onChange={v => patch({ timeValue: v })} plainText /></dd>
          </div>
          <div>
            <dt><EditableText value={p.venueLabel} onChange={v => patch({ venueLabel: v })} plainText /></dt>
            <dd><EditableText value={p.venueValue} onChange={v => patch({ venueValue: v })} plainText /></dd>
          </div>
        </dl>

        {leads.length > 0 ? (
          <div className="prog-leads">
            {leads.map((l, i) => (
              <div key={i} className="prog-lead">
                <span className="prog-lead__role">
                  <EditableText value={l.role} onChange={v => patchLead(i, { role: v })} plainText />
                </span>
                <span className="prog-lead__name">
                  <EditableText value={l.name} onChange={v => patchLead(i, { name: v })} plainText />
                </span>
                {isEditing ? (
                  <RemoveBtn onClick={() => removeAt("leads", leads, i)} label={`Remove ${l.role || "role"}`} />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {isEditing ? (
          <button
            type="button"
            className="prog__add"
            onClick={() => patch({ leads: [...leads, { role: "Role", name: "Name" }] })}
          >
            + Add role
          </button>
        ) : null}
      </div>

      {/* ---------- Order of service ---------- */}
      <div className="prog-card reveal">
        <h3 className="prog-card__title">
          <EditableText value={p.serviceTitle} onChange={v => patch({ serviceTitle: v })} plainText />
        </h3>
        <ol className="prog-service">
          {service.map((row, i) => (
            <li key={i} className="prog-service__row">
              <span className="prog-service__num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <span className="prog-service__item">
                <EditableText value={row.item} onChange={v => patchService(i, { item: v })} plainText />
              </span>
              <span className="prog-service__dots" aria-hidden />
              <span className="prog-service__by">
                <EditableText
                  value={row.by}
                  onChange={v => patchService(i, { by: v })}
                  placeholder={isEditing ? "—" : ""}
                  plainText
                />
              </span>
              {isEditing ? (
                <RemoveBtn onClick={() => removeAt("service", service, i)} label={`Remove ${row.item || "item"}`} />
              ) : null}
            </li>
          ))}
        </ol>
        {isEditing ? (
          <button
            type="button"
            className="prog__add"
            onClick={() => patch({ service: [...service, { item: "New item", by: "" }] })}
          >
            + Add item
          </button>
        ) : null}
      </div>

      {/* ---------- Ministers ---------- */}
      <div className="prog-grid">
        <div className="prog-card reveal">
          <h3 className="prog-card__title">
            <EditableText value={p.ministersTitle} onChange={v => patch({ ministersTitle: v })} plainText />
          </h3>
          <ul className="prog-names">
            {ministers.map((n, i) => (
              <li key={i} className="prog-names__row">
                <EditableText value={n} onChange={v => patchName("ministers", ministers, i, v)} plainText />
                {isEditing ? (
                  <RemoveBtn onClick={() => removeAt("ministers", ministers, i)} label={`Remove ${n}`} />
                ) : null}
              </li>
            ))}
          </ul>
          {isEditing ? (
            <button type="button" className="prog__add" onClick={() => patch({ ministers: [...ministers, "Name"] })}>
              + Add minister
            </button>
          ) : null}
        </div>

        <div className="prog-card reveal">
          <h3 className="prog-card__title">
            <EditableText value={p.supportTitle} onChange={v => patch({ supportTitle: v })} plainText />
          </h3>
          <ul className="prog-names">
            {support.map((n, i) => (
              <li key={i} className="prog-names__row">
                <EditableText value={n} onChange={v => patchName("support", support, i, v)} plainText />
                {isEditing ? (
                  <RemoveBtn onClick={() => removeAt("support", support, i)} label={`Remove ${n}`} />
                ) : null}
              </li>
            ))}
          </ul>
          {isEditing ? (
            <button type="button" className="prog__add" onClick={() => patch({ support: [...support, "Name"] })}>
              + Add name
            </button>
          ) : null}
        </div>
      </div>

      {/* ---------- Order of photography ---------- */}
      <div className="prog-card reveal">
        <h3 className="prog-card__title">
          <EditableText value={p.photoTitle} onChange={v => patch({ photoTitle: v })} plainText />
        </h3>
        {p.photoLede ? (
          <p className="prog-card__lede">
            <EditableText value={p.photoLede} onChange={v => patch({ photoLede: v })} multiline as="span" plainText />
          </p>
        ) : null}
        <ol className="prog-photo">
          {photography.map((n, i) => (
            <li key={i} className="prog-photo__row">
              <span className="prog-photo__num" aria-hidden>{i + 1}</span>
              <span className="prog-photo__name">
                <EditableText value={n} onChange={v => patchName("photography", photography, i, v)} plainText />
              </span>
              {isEditing ? (
                <RemoveBtn onClick={() => removeAt("photography", photography, i)} label={`Remove ${n}`} />
              ) : null}
            </li>
          ))}
        </ol>
        {isEditing ? (
          <button type="button" className="prog__add" onClick={() => patch({ photography: [...photography, "Group"] })}>
            + Add group
          </button>
        ) : null}
      </div>
    </section>
  );
}
