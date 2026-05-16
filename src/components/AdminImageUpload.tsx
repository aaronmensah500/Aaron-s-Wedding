import { useState } from "react";
import { IMAGE_UPLOAD_ACCEPT, useAdminImageUpload } from "../lib/useAdminImageUpload";

type Props = {
  label: string;
  value: string | undefined;
  onChange: (url: string) => void;
};

export function AdminImageUpload({ label, value, onChange }: Props) {
  const { inputRef, busy, err, pickFile, onInputChange, handleFile, canUpload } = useAdminImageUpload(onChange);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const url = value ?? "";

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="adm-field">
      <span className="adm-field__lbl">{label}</span>

      {/* thumbnail preview */}
      {url && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={url}
            alt=""
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: 120,
              borderRadius: 6,
              border: "1px solid var(--hairline)",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {canUpload ? (
        <>
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            style={{
              border: "1px dashed var(--hairline)",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              style={{ display: "none" }}
              onChange={onInputChange}
            />
            <button
              type="button"
              className="adm-btn adm-btn--sm adm-btn--ghost"
              disabled={busy}
              onClick={pickFile}
            >
              {busy ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
            </button>
            {url ? (
              <button
                type="button"
                className="adm-btn adm-btn--sm adm-btn--danger"
                disabled={busy}
                onClick={() => onChange("")}
              >
                Remove
              </button>
            ) : null}
            <span style={{ fontSize: 10, color: "var(--muted)" }}>
              From your phone or computer · max 10 MB
            </span>
          </div>

          <button
            type="button"
            className="adm-field__url-toggle"
            onClick={() => setShowUrlInput(v => !v)}
          >
            {showUrlInput ? "Hide paste-URL option" : "Advanced: paste image URL"}
          </button>

          {showUrlInput ? (
            <input
              className="adm-field__input"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={url}
              onChange={e => onChange(e.target.value)}
            />
          ) : null}
        </>
      ) : (
        /* fallback when upload token not configured */
        <input
          className="adm-field__input"
          type="text"
          placeholder="https://…"
          value={url}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {err && <p className="adm-err">{err}</p>}
    </div>
  );
}
