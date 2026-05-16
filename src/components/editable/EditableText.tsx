import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useSiteEditorOptional } from "../../lib/siteEditor";

type EditableTextProps = {
  value: string | undefined;
  onChange: (v: string) => void;
  as?: "span" | "p" | "div";
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function stripPastedText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function EditableText({
  value,
  onChange,
  as: Tag = "span",
  className = "",
  style,
  multiline = false,
  disabled = false,
  placeholder = "",
}: EditableTextProps) {
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing) && !disabled;
  const display = value ?? "";
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState(display);
  const committedRef = useRef(display);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (!active) {
      setDraft(display);
      committedRef.current = display;
    }
  }, [display, active]);

  useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [active]);

  const commit = useCallback(() => {
    const next = draft.trimEnd();
    setActive(false);
    committedRef.current = next;
    if (next !== display) onChange(next);
  }, [draft, display, onChange]);

  const cancel = useCallback(() => {
    setDraft(committedRef.current);
    setActive(false);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  if (!isEditing) {
    if (Tag === "p") {
      return (
        <p className={className} style={style}>
          {display || placeholder}
        </p>
      );
    }
    if (Tag === "div") {
      return (
        <div className={className} style={style}>
          {display || placeholder}
        </div>
      );
    }
    return (
      <span className={className} style={style}>
        {display || placeholder}
      </span>
    );
  }

  if (!active) {
    const handleActivate = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraft(display);
      committedRef.current = display;
      setActive(true);
    };
    const shared = {
      className: `editable-text ${className}`.trim(),
      style,
      "data-editable": true,
      onClick: handleActivate,
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate(e as unknown as MouseEvent);
        }
      },
      role: "button" as const,
      tabIndex: 0,
      title: "Tap to edit",
    };
    const text = display || placeholder || "\u00a0";
    if (Tag === "p") return <p {...shared}>{text}</p>;
    if (Tag === "div") return <div {...shared}>{text}</div>;
    return <span {...shared}>{text}</span>;
  }

  const inputClass = `editable-text__input ${className}`.trim();
  const inputStyle: CSSProperties = {
    ...style,
    width: multiline ? "100%" : undefined,
    minWidth: multiline ? "100%" : "3ch",
  };

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        className={inputClass}
        style={inputStyle}
        data-editable
        data-editing
        value={draft}
        rows={1}
        placeholder={placeholder}
        onChange={e => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onPaste={e => {
          e.preventDefault();
          const t = stripPastedText(e.clipboardData.getData("text/plain"));
          setDraft(d => d + t);
        }}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      className={inputClass}
      style={inputStyle}
      data-editable
      data-editing
      value={draft}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onPaste={e => {
        e.preventDefault();
        setDraft(d => d + stripPastedText(e.clipboardData.getData("text/plain")));
      }}
    />
  );
}
