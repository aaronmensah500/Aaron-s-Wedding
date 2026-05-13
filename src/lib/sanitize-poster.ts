import DOMPurify from "dompurify";

/** Admin-controlled RSVP poster HTML: strip scripts and unsafe markup before `dangerouslySetInnerHTML`. */
export function sanitizePosterHtml(html: string): string {
  return DOMPurify.sanitize(html || "", {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "br",
      "span",
      "em",
      "strong",
      "b",
      "i",
      "small",
      "sub",
      "sup",
      "p",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "a",
    ],
    ALLOWED_ATTR: ["class", "href", "title", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}
