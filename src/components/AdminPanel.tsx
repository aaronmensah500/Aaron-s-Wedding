import { useCallback, useEffect, useState } from "react";
import { useWeddingContent } from "../lib/weddingContent";
import { ADMIN_SESSION_KEY, isAdminUrl, useSiteEditor } from "../lib/siteEditor";
import { AdminToolbar } from "./AdminToolbar";
import { SITE_PATHS } from "../lib/sitePages";

const hideSiteEditorLauncher =
  import.meta.env.PUBLIC_HIDE_SITE_EDITOR_LAUNCHER === "true" && !import.meta.env.DEV;

function ClientAdmin() {
  const { content } = useWeddingContent();
  const {
    hasSession,
    isEditing,
    gateOpen,
    setGateOpen,
    unlock,
    lock,
    emailAuthEnabled,
    adminAuthChecking,
  } = useSiteEditor();
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!isAdminUrl() || emailAuthEnabled) return;
    const path = window.location.pathname + window.location.hash;
    if (content.admin?.requirePin === false) {
      unlock("");
      window.history.replaceState({}, "", path);
      return;
    }
    if (!hasSession) setGateOpen(true);
    window.history.replaceState({}, "", path);
  }, [content.admin?.requirePin, hasSession, setGateOpen, unlock, emailAuthEnabled]);

  useEffect(() => {
    if (!isAdminUrl() || !emailAuthEnabled) return;
    if (!hasSession && !adminAuthChecking) setGateOpen(true);
  }, [emailAuthEnabled, hasSession, adminAuthChecking, setGateOpen]);

  useEffect(() => {
    if (!hideSiteEditorLauncher) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || (e.key !== "e" && e.key !== "E")) return;
      e.preventDefault();
      if (hasSession) lock();
      else setGateOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSession, lock, setGateOpen]);

  const tryUnlock = useCallback(
    (pin: string) => {
      if (unlock(pin)) {
        setPinError("");
        setPinInput("");
        return true;
      }
      setPinError("PIN incorrect.");
      return false;
    },
    [unlock]
  );

  return (
    <>
      {!hideSiteEditorLauncher ? (
        <button
          type="button"
          className={`adm-launcher ${isEditing ? "adm-launcher--on" : ""}`}
          onClick={() => {
            if (!hasSession) setGateOpen(true);
            else lock();
          }}
          aria-label={isEditing ? "Lock site editor" : "Open site editor"}
        >
          {isEditing ? "Lock editing" : "Edit site"}
        </button>
      ) : null}

      {gateOpen && !hasSession ? (
        <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-pin-title">
          <div className="adm-modal__card">
            <h2 id="adm-pin-title" className="adm-modal__title">
              Site editor
            </h2>
            {emailAuthEnabled ? (
              adminAuthChecking ? (
                <p className="adm-hint" role="status">
                  Signing you in…
                </p>
              ) : (
                <div className="adm-stack">
                  <p className="adm-hint">
                    Sign in on{" "}
                    <a href={`${SITE_PATHS.guest}#my-guest`}>My guest</a> with your allowlisted email and the 6-digit
                    code from Supabase. That unlocks the site editor on every page.
                  </p>
                  <div className="adm-modal__actions">
                    <a className="adm-btn" href={`${SITE_PATHS.guest}#my-guest`}>
                      Go to My guest
                    </a>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setGateOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <>
                <p className="adm-hint">
                  Tap any text on the site to edit after unlocking. Default PIN is often{" "}
                  <code className="adm-code">121226</code>.
                  {hideSiteEditorLauncher ? (
                    <>
                      {" "}
                      Use <code className="adm-code">?admin=1</code> or{" "}
                      <kbd className="adm-code">Alt</kbd>+<kbd className="adm-code">Shift</kbd>+
                      <kbd className="adm-code">E</kbd>.
                    </>
                  ) : null}
                </p>
                {content.admin?.requirePin !== false ? (
                  <input
                    className="adm-field__input"
                    type="password"
                    inputMode="numeric"
                    placeholder="PIN"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") tryUnlock(pinInput);
                    }}
                  />
                ) : null}
                {pinError ? <p className="adm-err">{pinError}</p> : null}
                <div className="adm-modal__actions">
                  <button type="button" className="adm-btn" onClick={() => tryUnlock(pinInput)}>
                    Unlock
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => {
                      setGateOpen(false);
                      setPinInput("");
                      setPinError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isEditing ? <AdminToolbar /> : null}
    </>
  );
}

export { ClientAdmin, ADMIN_SESSION_KEY };
