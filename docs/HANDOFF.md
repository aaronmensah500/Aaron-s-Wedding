# Handoff

You are maintaining **Aaron’s wedding** — Astro + React SPA island, Supabase backend for RSVP/auth/uploads, client-editable marketing copy in `localStorage`.

## First hour

1. Read `README.md` and `docs/ARCHITECTURE.md`.
2. Copy `.env.example` → `.env`, connect Supabase, run the SQL migration.
3. `npm run dev` — confirm RSVP and (if configured) guest magic link + upload flow on `http://localhost:4324`.

## Commands that must stay green

```bash
npm run typecheck
npm run test
npm run build
```

CI runs these on push/PR (`.github/workflows/ci.yml`).

## Sharp edges

| Topic | Detail |
|-------|--------|
| **Path with `'`** | `postinstall` patches Astro session plugin; `sessionDrivers.memory()` in `astro.config.mjs`. No `src/middleware.ts` — see `docs/SECURITY.md`. |
| **Service role** | Only in `src/lib/supabase/service.ts` and Astro API routes. |
| **`wedding_slug`** | Hard-coded `"primary"` in API + `GuestPortal`. |
| **Type source** | `useTweaks` returns `Record<string, unknown>`; `WeddingApp` casts to `TweakState`. |

## Suggested next improvements

- Redis-backed rate limiting if you scale past one Node process.
- Admin export of `rsvps` to CSV from a protected server route (not client-only).
- Optional `@sentry/node` on API routes behind `SENTRY_DSN`.
