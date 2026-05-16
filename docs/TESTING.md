# Testing

## Unit tests (Vitest)

```bash
npm run test        # single run (CI)
npm run test:watch  # local TDD
```

Tests live as `src/**/*.test.ts` beside the modules they cover:

| File | Covers |
|------|--------|
| `src/lib/rate-limit.test.ts` | Sliding-window limiter used by API routes |
| `src/lib/api/json.test.ts` | `parseApiErrorCode` / `parseApiErrorMessage` for nested + legacy API errors |
| `src/lib/sanitize-poster.test.ts` | DOMPurify-based poster HTML sanitization |

Environment: **jsdom** (see `vitest.config.ts`).

## What is not covered yet

- End-to-end flows (Playwright) against a real or test Supabase project.
- Visual regression.

Recommended follow-up: one Playwright spec that loads `/`, steps through RSVP with mocked `fetch`, or a staging deploy smoke test.

## Guest approval flow (manual)

1. Submit RSVP with a new email → row is `pending` in Supabase; magic link returns “waiting for approval”.
2. Sign in on `/guest` as a host (`ADMIN_EDITOR_EMAILS`) → **Pending** tab shows the row → **Approve**.
3. Guest magic link for that email succeeds; guest sees RSVP / gifts / photos panels.
4. Gifter (gift record, no approved RSVP) can sign in without host approval.
5. Host JWT works for `POST /api/admin/upload` and `PUT /api/site-content` after `/guest` sign-in.
