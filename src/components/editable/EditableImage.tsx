import { useCallback, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Ph } from "../wedding/Core";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { IMAGE_UPLOAD_ACCEPT, useAdminImageUpload } from "../../lib/useAdminImageUpload";

type EditableImageProps = {
  label?: string;
  src?: string;
  onChange: (url: string) => void;
  variant?: string;
  className?: string;
  style?: CSSProperties;
};

function ImageUploadToast({ message }: { message: string }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <p className="editable-image__toast" role="alert">
      {message}
    </p>,
    document.body
  );
}

export function EditableImage({
  label,
  src,
  onChange,
  variant = "default",
  className = "",
  style,
}: EditableImageProps) {
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing);
  const { inputRef, busy, err, pickFile, onInputChange, canUpload } = useAdminImageUpload(onChange);

  const openPicker = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canUpload || busy) return;
      pickFile();
    },
    [canUpload, busy, pickFile]
  );

  if (!isEditing) {
    return <Ph label={label} src={src} variant={variant} className={className} style={style} />;
  }

  return (
    <div
      className={`editable-image ${className}`.trim()}
      style={style}
      data-editable="image"
      data-uploading={busy ? "true" : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        style={{ display: "none" }}
        aria-hidden
        onChange={onInputChange}
      />
      <Ph label={label} src={src} variant={variant} className="editable-image__ph" />
      <button
        type="button"
        className="editable-image__upload-btn"
        onClick={openPicker}
        disabled={busy || !canUpload}
        title={canUpload ? "Choose a photo" : "Unlock the editor with your PIN first"}
        aria-label={canUpload ? "Upload photo" : "Unlock editor to upload"}
      >
        <span className="editable-image__upload-icon" aria-hidden>
          {busy ? "…" : "+"}
        </span>
      </button>
      {busy ? <span className="editable-image__busy" aria-hidden /> : null}
      {src ? (
        <button
          type="button"
          className="editable-image__remove"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }}
          aria-label="Remove photo"
        >
          Remove
        </button>
      ) : null}
      {err ? <ImageUploadToast message={err} /> : null}
    </div>
  );
}
