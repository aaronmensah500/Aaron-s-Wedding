import { useWeddingContent } from "../../lib/weddingContent";
import { SITE_PATHS } from "../../lib/sitePages";
import { Ph } from "./Core";

export function HomeStoryTeaser() {
  const { content } = useWeddingContent();
  const s = content.story || {};
  const ch0 = s.chapters?.[0];
  const imageUrl = String(s.homeImageUrl || ch0?.imageUrl || "").trim();
  const caption = (ch0?.caption as string) || "Our story";

  return (
    <section id="story" className="section home-story" aria-labelledby="home-story-title">
      <div className="home-story__grid reveal">
        <div className="home-story__media">
          <Ph label={caption} src={imageUrl || undefined} />
        </div>
        <div className="home-story__body">
          <div className="eyebrow">
            {s.eyebrow} <span className="dot" /> {s.eyebrowLabel}
          </div>
          <h2 id="home-story-title" className="section__title">
            {s.titleLine1}
            <em>{s.titleEm}</em>
            {s.titleLine2 ? (
              <>
                <br />
                {s.titleLine2}
              </>
            ) : null}
          </h2>
          <p className="home-story__intro">{s.lede}</p>
          <a href={SITE_PATHS.story} className="btn btn--ghost home-story__cta">
            Read our story <span className="arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
