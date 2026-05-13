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
