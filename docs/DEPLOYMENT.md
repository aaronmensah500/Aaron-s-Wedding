# Deployment

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Where |
|----------|----------|--------|
| `PUBLIC_SUPABASE_URL` | For RSVP + guest features | Client + server |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes if using Supabase | Client + server (magic-link route) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for APIs | **Server only** — never expose to browser |
| `PUBLIC_SITE_URL` | Recommended | Magic-link redirect when `Origin` header is missing |
| `PUBLIC_SHOW_SITE_EDITOR` | Optional | Set to `true` only on a **private** staging URL to load the editor + tweaks in production builds. |
| `PUBLIC_HIDE_SITE_EDITOR_LAUNCHER` | Optional | With `PUBLIC_SHOW_SITE_EDITOR=true`, set to `true` to **hide the floating “Edit site” button** on the public site. Couple opens **`?admin=1`** and/or **Alt+Shift+E** (see README). |

## Supabase checklist

1. Create a project; run SQL in `supabase/migrations/20260211120000_wedding_rsvp_guest_media.sql` (SQL editor or CLI).
2. **Authentication** → disable public sign-up if you only want guests created via RSVP API.
3. **URL configuration** → add site URL, `http://localhost:4324`, and production origin to redirect allowlist.
4. **Storage** → migration creates private `guest-media` bucket and policies.

## Hosting

- **Node** host (Fly.io, Railway, Render, VPS): run the standalone server from `dist/`, pass env vars at runtime.
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
