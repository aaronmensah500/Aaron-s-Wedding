import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const ADMIN_SESSION_KEY = "wedding_site_admin_unlocked";
export const ADMIN_PIN_SESSION_KEY = "wedding_site_admin_pin";

function readSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** PIN entered at unlock; used for photo upload auth (same as editor gate). */
export function readUnlockedAdminPin(): string | null {
  try {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== "1") return null;
    return sessionStorage.getItem(ADMIN_PIN_SESSION_KEY) ?? "";
  } catch {
    return null;
  }
}

export function isAdminUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("admin") === "1";
  } catch {
    return false;
  }
}

type SiteEditorValue = {
  isEditing: boolean;
  hasSession: boolean;
  gateOpen: boolean;
  setGateOpen: (open: boolean) => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
};

const SiteEditorContext = createContext<SiteEditorValue | null>(null);

type SiteEditorProviderProps = {
  children: ReactNode;
  requirePin: boolean;
  expectedPin: string;
};

function SiteEditorProvider({ children, requirePin, expectedPin }: SiteEditorProviderProps) {
  const [hasSession, setHasSession] = useState(readSession);
  const [gateOpen, setGateOpen] = useState(false);

  const isEditing = hasSession;

  useEffect(() => {
    if (isEditing) {
      document.documentElement.dataset.siteEditing = "true";
    } else {
      delete document.documentElement.dataset.siteEditing;
    }
    return () => {
      delete document.documentElement.dataset.siteEditing;
    };
  }, [isEditing]);

  const unlock = useCallback(
    (pin: string) => {
      const need = requirePin !== false;
      const entered = String(pin ?? "").trim();
      const expected = String(expectedPin ?? "").trim();
      if (!need || entered === expected) {
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
          sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, entered);
        } catch {
          /* ignore */
        }
        setHasSession(true);
        setGateOpen(false);
        if (isAdminUrl()) {
          window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        }
        return true;
      }
      return false;
    },
    [requirePin, expectedPin]
  );

  const lock = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setHasSession(false);
    setGateOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isEditing,
      hasSession,
      gateOpen,
      setGateOpen,
      unlock,
      lock,
    }),
    [isEditing, hasSession, gateOpen, unlock, lock]
  );

  return <SiteEditorContext.Provider value={value}>{children}</SiteEditorContext.Provider>;
}

function useSiteEditor() {
  const ctx = useContext(SiteEditorContext);
  if (!ctx) throw new Error("useSiteEditor must be used inside SiteEditorProvider");
  return ctx;
}

function useSiteEditorOptional(): SiteEditorValue | null {
  return useContext(SiteEditorContext);
}

export { SiteEditorProvider, useSiteEditor, useSiteEditorOptional };
