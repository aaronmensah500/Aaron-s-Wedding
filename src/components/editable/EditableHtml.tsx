import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
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
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState(html);
  const committedRef = useRef(html);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!active) {
      setDraft(html);
      committedRef.current = html;
    }
  }, [html, active]);

  useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [active]);

  const commit = useCallback(() => {
    const next = draft.trimEnd();
    setActive(false);
    committedRef.current = next;
    if (next !== html) onChange(next);
  }, [draft, html, onChange]);

  const cancel = useCallback(() => {
    setDraft(committedRef.current);
    setActive(false);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const preview = (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizePosterHtml(html) }}
    />
  );

  if (!isEditing) return preview;

  if (!active) {
    const handleActivate = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraft(html);
      committedRef.current = html;
      setActive(true);
    };
    return (
      <div
        className="editable-html"
        data-editable
        onClick={handleActivate}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActivate(e as unknown as MouseEvent);
          }
        }}
        role="button"
        tabIndex={0}
        title="Tap to edit"
      >
        {preview}
      </div>
    );
  }

  return (
    <div className="editable-html editable-html--editing" data-editable data-editing>
      <textarea
        ref={inputRef}
        className={`editable-text__input editable-html__input ${className}`.trim()}
        rows={3}
        value={draft}
        placeholder="Use &lt;br/&gt; for line breaks and &lt;em&gt; for script emphasis."
        onChange={e => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <p className="editable-html__hint">
        Use &lt;br/&gt; for line breaks and &lt;em&gt; for script emphasis.
      </p>
    </div>
  );
}
