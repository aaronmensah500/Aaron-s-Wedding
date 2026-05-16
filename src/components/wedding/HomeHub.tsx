import { useWeddingContent } from "../../lib/weddingContent";
import { SITE_PATHS } from "../../lib/sitePages";

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
  const { content } = useWeddingContent();
  const sec = content.sections || {};
  const hub = content.homeHub || {};

  const cards = (hub.cards || [])
    .map(c => {
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
        href: path,
        eyebrow: c.eyebrow || "",
        title,
        lede: c.lede || "",
        enabled: cardEnabled(id, sec),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null && c.enabled);

  if (cards.length === 0) return null;

  return (
    <section className="section section--beige home-hub" aria-labelledby="home-hub-more-title">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">
            {hub.moreEyebrow || "More"} <span className="dot" />
          </div>
          <h2 id="home-hub-more-title" className="section__title home-hub__more-title">
            {hub.moreTitle || "Plan the weekend"}
          </h2>
        </div>
      </div>

      <div className="home-hub__grid reveal-stagger">
        {cards.map(card => (
          <a key={card.id} href={card.href} className="home-hub__card">
            <span className="home-hub__eyebrow">{card.eyebrow}</span>
            <h3 className="home-hub__title">{card.title}</h3>
            <p className="home-hub__lede">{card.lede}</p>
            <span className="home-hub__cta">
              Open <span className="arrow">→</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
