/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** When `"true"`, show the client site editor and tweaks panel (omit on public production). */
  readonly PUBLIC_SHOW_SITE_EDITOR?: string;
  /**
   * When `"true"` alongside `PUBLIC_SHOW_SITE_EDITOR`, hides the floating “Edit site” button on **production** builds only (`npm run dev` still shows it).
   * Couple opens the editor via `?admin=1` on the URL and/or **Alt+Shift+E** (keyboard).
   */
  readonly PUBLIC_HIDE_SITE_EDITOR_LAUNCHER?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /** MapTiler API key for interactive Details map tiles (client-safe). */
  readonly PUBLIC_MAPTILER_API_KEY?: string;
  /** Site origin for magic-link redirects, QR payloads, and calendar links — must be `PUBLIC_` so the client can read it. */
  readonly PUBLIC_SITE_URL?: string;
  /** Optional server-only fallback (same value as PUBLIC_SITE_URL) for API routes if the public var is unset. */
  readonly DOMAIN?: string;
  /** Paystack secret — server-only; never prefix with PUBLIC_. */
  readonly PAYSTACK_SECRET_KEY?: string;
  /** Paystack inline checkout (public key only — safe in the browser). */
  readonly PUBLIC_PAYSTACK_PUBLIC_KEY?: string;
  /** ISO currency for Paystack charges, e.g. `GHS`, `NGN`. Defaults in code if unset. */
  readonly PUBLIC_PAYSTACK_CURRENCY?: string;
  /** Server-only — never expose to the client. */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
}
