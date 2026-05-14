# Aaron & Princess — wedding site

Single-page wedding experience: story, details, RSVP, gallery, registry, livestream, guest photo uploads, and an optional in-browser **site editor**. Built with **Astro 6**, **React 19**, and **Supabase** (RSVP storage, magic-link auth, private media).

## Requirements

- **Node.js** 20+ (CI uses 22)
- **npm** 10+

## Quick start

```bash
npm install
cp .env.example .env
# Fill Supabase URL, anon key, service role key, and PUBLIC_SITE_URL (see docs/DEPLOYMENT.md)
npm run dev
```

Open the URL shown in the terminal (often `http://localhost:4324`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Astro dev server |
| `npm run build` | Production build (`dist/`, Node standalone) |
| `npm run preview` | Preview production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, modules, Supabase |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Env vars, hosting, migrations |
| [docs/SECURITY.md](docs/SECURITY.md) | Auth, RLS, rate limits, HTML sanitization |
| [docs/TESTING.md](docs/TESTING.md) | Vitest layout and gaps |

## Site editor (hide button on the public site)

To ship the editor for the couple **without** the floating **Edit site** button for guests:

1. `PUBLIC_SHOW_SITE_EDITOR=true` — include the editor + tweaks in the production build.
2. `PUBLIC_HIDE_SITE_EDITOR_LAUNCHER=true` — hide the launcher on **production** only.

**Couple access:** visit `https://your-domain.com/?admin=1` — PIN dialog (or editor opens if **Require PIN** is off). After unlocking in that browser, **Alt+Shift+E** toggles the editor when the button stays hidden.

`npm run dev` always shows the launcher (the hide flag applies only to production builds).

## Project path note

The repo folder name may contain an apostrophe (`Aaron's wedding`). Astro’s session driver is patched on `postinstall` (`scripts/fix-astro-session-driver.mjs`), and the app uses an **in-memory session driver** in `astro.config.mjs`. **Do not add `src/middleware.ts`** until Astro resolves apostrophe paths in generated imports, or deploy from a path without `'`.

## License

Private project — not for redistribution.
