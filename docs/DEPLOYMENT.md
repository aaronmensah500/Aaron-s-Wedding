# Deployment

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Where |
|----------|----------|--------|
| `PUBLIC_SUPABASE_URL` | For RSVP + guest features | Client + server |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes if using Supabase | Client + server (magic-link route) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for APIs | **Server only** — never expose to browser |
| `PUBLIC_SITE_URL` | Recommended | Magic-link redirect when `Origin` header is missing |
| `PUBLIC_SHOW_SITE_EDITOR` | Optional | Set to `true` on a **staging** build so the editor appears without `?admin=1`. On production you can omit it and open **`https://your-site/?admin=1`** instead (PIN still required). |
| `PUBLIC_HIDE_SITE_EDITOR_LAUNCHER` | Optional | With `PUBLIC_SHOW_SITE_EDITOR=true`, set to `true` to **hide the floating “Edit site” button** on the public site. Couple opens **`?admin=1`** and/or **Alt+Shift+E** (see README). |

## Supabase checklist

1. Create a project; run SQL in `supabase/migrations/20260211120000_wedding_rsvp_guest_media.sql` (SQL editor or CLI).
2. **Authentication** → disable public sign-up if you only want guests created via RSVP API.
3. **URL configuration** → add site URL, `http://localhost:4324`, and production origin to redirect allowlist.
4. **Storage** → migration creates private `guest-media` bucket and policies.

## Hosting

### Vercel (recommended if you deploy there)

This repo defaults to **`@astrojs/node`** for Docker / VPS / Railway-style hosts. **Vercel does not run that server** — you get `404 NOT_FOUND` on `/` or `/api/*` unless the Vercel adapter is used.

On Vercel, **`VERCEL=1` is set automatically** during build. `astro.config.mjs` switches to **`@astrojs/vercel`** and `output: "server"` so API routes (`/api/rsvp`, `/api/auth/magic-link`) deploy as serverless functions.

- Connect the GitHub repo in the Vercel dashboard; use the default **Install Command** / **Build Command** (`npm run build`) and **Output** is taken from the adapter (no manual “output directory” override unless Vercel asks for the framework preset **Astro**).
- Add the same env vars as in `.env.example` in **Project → Settings → Environment Variables** (include `SUPABASE_SERVICE_ROLE_KEY` for **Production** only, not exposed to the client build if Vercel marks it as sensitive — Vercel keeps server env for SSR/API).

Local check that matches Vercel’s build:

```bash
VERCEL=1 npm run build
```

### Node (Fly.io, Railway, Render, VPS)

- Run the standalone server from `dist/`, pass env vars at runtime.
- Put **TLS** at the edge; configure **`X-Forwarded-For`** so `getClientIp()` in API routes sees real client IPs for rate limiting.
- Set **`Permissions-Policy`**, **`X-Content-Type-Options`**, and CSP at the reverse proxy if possible (see `docs/SECURITY.md` for the apostrophe / middleware constraint).

## Build

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

Artifacts: `dist/` per `@astrojs/node` adapter output.

## Postinstall

`npm run postinstall` patches Astro’s session Vite plugin when the old fragile import pattern is present—required when the project directory path contains `'` until upstream fixes it.
