# Security

## Threat model

Guests are semi-trusted: anyone can POST `/api/rsvp` until rate limits kick in. Authenticated guests can read/write only what **RLS** allows. Site editors with the admin PIN can change **client-side** content (stored in `localStorage`); that is not server-side authorization.

## Implemented controls

| Area | Mitigation |
|------|------------|
| **RSVP + magic link** | In-memory **rate limits** per client IP (`src/lib/rate-limit.ts`): RSVP ~24 / 15 min, magic link ~8 / 15 min (tune as needed). |
| **API JSON** | Consistent shape `{ error: { code, message } }` plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` on API responses (`src/lib/api/json.ts`). |
| **Magic link** | Only emails present in `rsvps` receive OTP; `shouldCreateUser: false`. |
| **Guest media** | RLS + Storage policies in migration; uploads under `{userId}/…`. |
| **XSS (poster HTML)** | `dangerouslySetInnerHTML` paths use **`sanitizePosterHtml`** (`dompurify`) in `RsvpBlock`. |
| **Structured errors** | Magic-link failures return generic `otp_send_failed` message (no raw Supabase text to clients). |

## Admin PIN

The PIN in editable content is a **UX gate**, not cryptographic protection of APIs. Do not expose sensitive operations based on it alone.

## Global HTTP middleware (Astro)

**`src/middleware.ts` is intentionally omitted:** with a project path containing an apostrophe (`Aaron's wedding`), Astro’s generated middleware import can fail to parse (same class of issue as the session driver). Baseline headers are applied to **API** responses and partially via **`<meta name="referrer">`** in `Layout.astro`. For full **`Permissions-Policy`** / **CSP** on HTML, configure your **CDN or reverse proxy**.

## Multi-instance rate limits

Current limiter is **in-process**. Behind multiple Node instances, limits are per instance. Move to Redis or an edge limiter if you scale horizontally.

## Secret handling

- Never commit `.env` or real keys in `.env.example`.
- Rotate **`SUPABASE_SERVICE_ROLE_KEY`** if leaked.
