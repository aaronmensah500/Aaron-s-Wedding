import { useWeddingContent } from "../../lib/weddingContent";
import { SITE_PATHS } from "../../lib/sitePages";
import { EditableText } from "../editable/EditableText";
import { useSiteEditorOptional } from "../../lib/siteEditor";

const HIGHLIGHT_IDS = new Set(["story", "rsvp", "registry"]);

const CARD_SECTION: Record<string, { sectionKeys: string[] }> = {
  wedding: { sectionKeys: ["details", "party"] },
  travel: { sectionKeys: ["travel"] },
  gallery: { sectionKeys: ["gallery"] },
  guest: { sectionKeys: ["invitation"] },
};

function cardEnabled(id: string, sec: Record<string, boolean | undefined>): boolean {
  const meta = CARD_SECTION[id];
  if (!meta) return false;
  if (id === "guest") {
    return meta.sectionKeys.some(k => sec[k] !== false) || Boolean(import.meta.env.PUBLIC_SUPABASE_URL);
  }
  return meta.sectionKeys.some(k => sec[k] !== false);
}

export function HomeHub() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const sec = content.sections || {};
  const hub = content.homeHub || {};
  const rawCards = hub.cards || [];

  const cards = rawCards
    .map((c, originalIndex) => {
      const id = String(c.id || "");
      if (HIGHLIGHT_IDS.has(id)) return null;
      const path = SITE_PATHS[id as keyof typeof SITE_PATHS];
      if (!path) return null;
      let title = c.title || "";
      if (id === "travel") {
        title = (content.travelLogistics?.navLabel || c.title || "Travel").trim() || "Travel";
      }
      return {
        id,
        originalIndex,
        href: path,
        eyebrow: c.eyebrow || "",
        title,
        lede: c.lede || "",
        enabled: cardEnabled(id, sec),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null && c.enabled);

  if (cards.length === 0) return null;

  const patchCard = (originalIndex: number, partial: Record<string, string>) => {
    const updated = [...rawCards];
    updated[originalIndex] = { ...updated[originalIndex], ...partial };
    patchContent({ homeHub: { cards: updated } });
  };

  return (
    <section className="section section--beige home-hub" aria-labelledby="home-hub-more-title">
      <div className="section__head reveal in">
        <div>
          <div className="eyebrow">
            <EditableText
              value={hub.moreEyebrow || "More"}
              onChange={v => patchContent({ homeHub: { moreEyebrow: v } })}
            />{" "}
            <span className="dot" />
          </div>
          <h2 id="home-hub-more-title" className="section__title home-hub__more-title">
            <EditableText
              value={hub.moreTitle || "Plan the weekend"}
              onChange={v => patchContent({ homeHub: { moreTitle: v } })}
            />
          </h2>
        </div>
      </div>

      <div className="home-hub__grid reveal-stagger">
        {cards.map(card => (
          <a
            key={card.id}
            href={card.href}
            className="home-hub__card"
            onClick={e => editor?.isEditing && e.preventDefault()}
          >
            <span className="home-hub__eyebrow">
              <EditableText
                value={card.eyebrow}
                onChange={v => patchCard(card.originalIndex, { eyebrow: v })}
              />
            </span>
            <h3 className="home-hub__title">
              <EditableText
                value={card.title}
                onChange={v => patchCard(card.originalIndex, { title: v })}
              />
            </h3>
            <p className="home-hub__lede">
              <EditableText
                value={card.lede}
                onChange={v => patchCard(card.originalIndex, { lede: v })}
                multiline
              />
            </p>
            <span className="home-hub__cta">
              Open <span className="arrow">→</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
