import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SitePageId } from "./sitePages";
import { fetchAdminAuthConfig, verifyAdminSession } from "./adminAuthClient";
import { getBrowserSupabase, isSupabaseConfigured } from "./supabase/browser";

export const ADMIN_SESSION_KEY = "wedding_site_admin_unlocked";
export const ADMIN_PIN_SESSION_KEY = "wedding_site_admin_pin";

function readSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** PIN entered at unlock; used for photo upload auth when email auth is off. */
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
  emailAuthEnabled: boolean;
  adminAuthChecking: boolean;
  currentPage: SitePageId;
  gateOpen: boolean;
  setGateOpen: (open: boolean) => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
};

const SiteEditorContext = createContext<SiteEditorValue | null>(null);

type SiteEditorProviderProps = {
  children: ReactNode;
  currentPage: SitePageId;
  requirePin: boolean;
  expectedPin: string;
};

function SiteEditorProvider({ children, currentPage, requirePin, expectedPin }: SiteEditorProviderProps) {
  const [hasSession, setHasSession] = useState(readSession);
  const [gateOpen, setGateOpen] = useState(false);
  const [emailAuthEnabled, setEmailAuthEnabled] = useState(false);
  const [adminAuthChecking, setAdminAuthChecking] = useState(false);

  const isEditing = hasSession;

  useEffect(() => {
    void fetchAdminAuthConfig().then(c => setEmailAuthEnabled(c.emailAuth));
  }, []);

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

  useEffect(() => {
    if (!emailAuthEnabled || !isSupabaseConfigured()) return;
    const sb = getBrowserSupabase();
    if (!sb) return;

    const syncFromSession = async () => {
      setAdminAuthChecking(true);
      try {
        const { data } = await sb.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!readUnlockedAdminPin()) {
            try {
              sessionStorage.removeItem(ADMIN_SESSION_KEY);
              sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
            } catch {
              /* ignore */
            }
            setHasSession(false);
          }
          return;
        }
        const ok = await verifyAdminSession(token);
        if (ok) {
          try {
            sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
            sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
          } catch {
            /* ignore */
          }
          setHasSession(true);
          setGateOpen(false);
          if (isAdminUrl()) {
            window.history.replaceState({}, "", window.location.pathname + window.location.hash);
          }
        } else if (!readUnlockedAdminPin()) {
          setHasSession(false);
        }
      } finally {
        setAdminAuthChecking(false);
      }
    };

    void syncFromSession();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      void syncFromSession();
    });
    return () => subscription.unsubscribe();
  }, [emailAuthEnabled]);

  const unlock = useCallback(
    (pin: string) => {
      if (emailAuthEnabled) return false;
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
    [requirePin, expectedPin, emailAuthEnabled]
  );

  const lock = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
    if (emailAuthEnabled && isSupabaseConfigured()) {
      void getBrowserSupabase()?.auth.signOut();
    }
    setHasSession(false);
    setGateOpen(false);
  }, [emailAuthEnabled]);

  const value = useMemo(
    () => ({
      isEditing,
      hasSession,
      emailAuthEnabled,
      adminAuthChecking,
      currentPage,
      gateOpen,
      setGateOpen,
      unlock,
      lock,
    }),
    [isEditing, hasSession, emailAuthEnabled, adminAuthChecking, currentPage, gateOpen, unlock, lock]
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
