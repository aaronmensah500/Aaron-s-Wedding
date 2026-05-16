import { useWeddingContent } from "../../lib/weddingContent";
import { SITE_PATHS } from "../../lib/sitePages";
import { EditableText } from "../editable/EditableText";
import { EditableImage } from "../editable/EditableImage";
import { useSiteEditorOptional } from "../../lib/siteEditor";

export function HomeStoryTeaser() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const s = content.story || {};
  const ch0 = s.chapters?.[0];
  const imageUrl = String(s.homeImageUrl || ch0?.imageUrl || "").trim();
  const caption = (ch0?.caption as string) || "Our story";

  return (
    <section id="story" className="section home-story" aria-labelledby="home-story-title">
      <div className="home-story__grid reveal">
        <div className="home-story__media">
          <EditableImage
            label={caption}
            src={imageUrl || undefined}
            onChange={url => patchContent({ story: { homeImageUrl: url } })}
          />
        </div>
        <div className="home-story__body">
          <div className="eyebrow">
            <EditableText value={s.eyebrow} onChange={v => patchContent({ story: { eyebrow: v } })} />{" "}
            <span className="dot" />{" "}
            <EditableText value={s.eyebrowLabel} onChange={v => patchContent({ story: { eyebrowLabel: v } })} />
          </div>
          <h2 id="home-story-title" className="section__title">
            <EditableText value={s.titleLine1} onChange={v => patchContent({ story: { titleLine1: v } })} />
            <em>
              <EditableText value={s.titleEm} onChange={v => patchContent({ story: { titleEm: v } })} />
            </em>
            {s.titleLine2 ? (
              <>
                <br />
                <EditableText value={s.titleLine2} onChange={v => patchContent({ story: { titleLine2: v } })} />
              </>
            ) : null}
          </h2>
          <p className="home-story__intro">
            <EditableText value={s.lede} onChange={v => patchContent({ story: { lede: v } })} multiline as="span" />
          </p>
          <a
            href={SITE_PATHS.story}
            className="btn btn--ghost home-story__cta"
            onClick={e => editor?.isEditing && e.preventDefault()}
          >
            Read our story <span className="arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
