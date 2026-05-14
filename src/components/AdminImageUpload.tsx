import { useRef, useState } from "react";

type Props = {
  label: string;
  value: string | undefined;
  onChange: (url: string) => void;
};

const uploadToken = import.meta.env.PUBLIC_ADMIN_UPLOAD_TOKEN;
const canUpload = Boolean(uploadToken);

export function AdminImageUpload({ label, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const url = value ?? "";

  async function handleFile(file: File) {
    setErr("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${uploadToken}` },
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error?.message ?? `Upload failed (${res.status})`);
        return;
      }
      onChange(json.url ?? "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
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
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              style={{ display: "none" }}
              onChange={onInputChange}
            />
            <button
              type="button"
              className="adm-btn adm-btn--sm adm-btn--ghost"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading…" : url ? "Change image" : "Choose image"}
            </button>
            {url && (
              <button
                type="button"
                className="adm-btn adm-btn--sm adm-btn--danger"
                disabled={busy}
                onClick={() => { onChange(""); setErr(""); }}
              >
                Remove
              </button>
            )}
            <span style={{ fontSize: 10, color: "var(--muted)" }}>
              or drag & drop · JPEG PNG WebP GIF AVIF · max 10 MB
            </span>
          </div>

          <button
            type="button"
            style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: 10, color: "var(--muted)", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => setShowUrlInput(v => !v)}
          >
            {showUrlInput ? "Hide URL input" : "Or paste a URL"}
          </button>

          {showUrlInput && (
            <input
              className="adm-field__input"
              type="text"
              placeholder="https://…"
              value={url}
              onChange={e => onChange(e.target.value)}
            />
          )}
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
