import { useEffect, useRef, useState, type FormEvent } from "react";

type AdminPinSaveModalProps = {
  open: boolean;
  requirePin: boolean;
  publishing: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (pin: string) => void;
};

export function AdminPinSaveModal({
  open,
  requirePin,
  publishing,
  error,
  onClose,
  onSubmit,
}: AdminPinSaveModalProps) {
  const [pinInput, setPinInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPinInput("");
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(pinInput);
  };

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-save-pin-title">
      <div className="adm-modal__card">
        <form onSubmit={handleSubmit}>
          <h2 id="adm-save-pin-title" className="adm-modal__title">
            Save for all visitors
          </h2>
          <p className="adm-hint">
            {requirePin
              ? "Enter your editor PIN to publish these changes for everyone."
              : "Confirm to publish these changes for everyone."}
          </p>
          {requirePin ? (
            <input
              ref={inputRef}
              className="adm-field__input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              disabled={publishing}
            />
          ) : null}
          {error ? <p className="adm-err">{error}</p> : null}
          <div className="adm-modal__actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={publishing}>
              Cancel
            </button>
            <button type="submit" className="adm-btn" disabled={publishing}>
              {publishing ? "Saving…" : "Save for everyone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
