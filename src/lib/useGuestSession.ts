import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "./supabase/browser";

export function useGuestSession(): { session: Session | null; authChecking: boolean } {
  const [session, setSession] = useState(null as Session | null);
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured());

  useEffect(() => {
    const sb = isSupabaseConfigured() ? getBrowserSupabase() : null;
    if (!sb) {
      setAuthChecking(false);
      return;
    }
    let active = true;
    void sb.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      setAuthChecking(false);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setAuthChecking(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, authChecking };
}
