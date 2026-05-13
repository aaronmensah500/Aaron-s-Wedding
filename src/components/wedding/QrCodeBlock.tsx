import { useEffect, useState } from "react";

type Props = {
  /** Data to encode (typically an https URL). */
  value: string;
  /** Accessible name for the image. */
  label: string;
  className?: string;
};

/**
 * Renders a scannable QR from `value` (client-only generation via `qrcode`).
 */
export function QrCodeBlock({ value, label, className }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!value || typeof window === "undefined") {
      setDataUrl(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    setDataUrl(null);
    import("qrcode")
      .then(QR => QR.default.toDataURL(value, { margin: 1, width: 280, color: { dark: "#1a1714", light: "#f6ecd8" } }))
      .then(url => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!value) {
    return <p className="qr-block__fallback">Set a URL in site content to generate this QR.</p>;
  }
  if (failed) {
    return <p className="qr-block__fallback">Could not build QR for this link.</p>;
  }
  if (!dataUrl) {
    return (
      <div className={`qr-block__loading ${className || ""}`} role="status" aria-label="Generating QR code">
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--muted)" }}>
          Generating…
        </span>
      </div>
    );
  }

  return <img className={`qr-block__img ${className || ""}`} src={dataUrl} alt={label} width={280} height={280} decoding="async" />;
}
