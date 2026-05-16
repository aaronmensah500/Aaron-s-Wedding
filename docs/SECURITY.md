# Security

## Threat model

Guests are semi-trusted: anyone can POST `/api/rsvp` until rate limits kick in. Authenticated guests can read/write only what **RLS** allows. Site editors publish copy via **`PUT /api/site-content`** with the editor PIN in `Authorization: Bearer` (same check as photo upload). Edits stay on the device until they confirm **Save for everyone** and re-enter the PIN.

## Implemented controls

| Area | Mitigation |
|------|------------|
| **RSVP + magic link** | In-memory **rate limits** per client IP (`src/lib/rate-limit.ts`): RSVP ~24 / 15 min, magic link ~8 / 15 min (tune as needed). |
| **API JSON** | Consistent shape `{ error: { code, message } }` plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` on API responses (`src/lib/api/json.ts`). |
| **Email OTP** | `POST /api/auth/send-otp` after guest-list check; Supabase emails a 6-digit code; client `verifyOtp`. Configure Email OTP in Supabase dashboard. |
| **RSVP approval** | New RSVPs are `pending` until couple approves on `/guest` (host APIs use service role + JWT). |
| **Guest media** | RLS requires `attendance = yes` and `status = approved`; uploads under `{userId}/…`. |
| **XSS (poster HTML)** | `dangerouslySetInnerHTML` paths use **`sanitizePosterHtml`** (`dompurify`) in `RsvpBlock`. |
| **Structured errors** | Magic-link failures return generic `otp_send_failed` message (no raw Supabase text to clients). |

## Admin PIN and published content

The PIN in published site content is checked server-side for uploads and publishing. **`PUBLIC_SITE_CONTENT_SAVE_TOKEN`** (optional legacy env) also authorizes publish if set — avoid using it; prefer PIN only.

Published copy is read by all visitors via **`GET /api/site-content`**. Local `localStorage` is a cache only.

## Global HTTP middleware (Astro)

**`src/middleware.ts` is intentionally omitted:** with a project path containing an apostrophe (`Aaron's wedding`), Astro’s generated middleware import can fail to parse (same class of issue as the session driver). Baseline headers are applied to **API** responses and partially via **`<meta name="referrer">`** in `Layout.astro`. For full **`Permissions-Policy`** / **CSP** on HTML, configure your **CDN or reverse proxy**.

## Multi-instance rate limits

Current limiter is **in-process**. Behind multiple Node instances, limits are per instance. Move to Redis or an edge limiter if you scale horizontally.

## Secret handling

- Never commit `.env` or real keys in `.env.example`.
- Rotate **`SUPABASE_SERVICE_ROLE_KEY`** if leaked.
