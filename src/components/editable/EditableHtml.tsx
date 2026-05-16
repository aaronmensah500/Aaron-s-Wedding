import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizePosterHtml } from "../../lib/sanitize-poster";
import { useSiteEditorOptional } from "../../lib/siteEditor";

type EditableHtmlProps = {
  value: string | undefined;
  onChange: (v: string) => void;
  className?: string;
  as?: "div" | "h3";
};

export function EditableHtml({ value, onChange, className = "", as: Tag = "div" }: EditableHtmlProps) {
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing);
  const html = value ?? "";
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draft, setDraft] = useState(html);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) setDraft(html);
  }, [html, popoverOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  const commit = useCallback(() => {
    onChange(draft);
    setPopoverOpen(false);
  }, [draft, onChange]);

  const inner = (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizePosterHtml(html) }}
    />
  );

  if (!isEditing) return inner;

  return (
    <div className="editable-html" data-editable>
      <div
        role="button"
        tabIndex={0}
        title="Tap to edit HTML"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setPopoverOpen(true);
        }}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPopoverOpen(true);
          }
        }}
      >
        {inner}
      </div>
      {popoverOpen ? (
        <div ref={popoverRef} className="editable-html__popover" role="dialog" aria-label="Edit HTML">
          <p className="editable-html__hint">Use &lt;br/&gt; for line breaks and &lt;em&gt; for script emphasis.</p>
          <textarea
            className="editable-html__textarea adm-field__input"
            rows={5}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="editable-html__actions">
            <button type="button" className="adm-btn adm-btn--sm" onClick={commit}>
              Save
            </button>
            <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setPopoverOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
