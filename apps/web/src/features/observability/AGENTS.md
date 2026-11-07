# features/observability: errors, web vitals and logs (off by default)

Sentry (browser and server), real-user Core Web Vitals, and the CSP hosts these tools need. Every tool is off until
its variable is set at build; no account exists yet, and the build needs no env vars.

## Public API

No index file; import the files directly.

- `observability.tsx`: `<Observability />`, mounted once in the root layout (Cloudflare beacon + the island).
- `observability.client.tsx`: `ObservabilityIsland`; starts vitals, Sentry and PostHog only after `load` and idle.
- `capture.ts`: `captureError()` for `apps/web/src/app/error.tsx` and `apps/web/src/app/global-error.tsx`.
- `vitals.client.ts` (10% sample, `sendBeacon` to `/api/vitals`) and `vitals-schema.ts` (`vitalsPayload`, zod).
- `sentry.browser.ts`, `sentry.server.ts` (started from `apps/web/src/instrumentation.ts` when `SENTRY_DSN` is set),
  `sentry-options.ts` (`DATA_COLLECTION`, `scrubEvent`, `isLocalHost`, `TRACES_SAMPLE_RATE`).
- `public-env.ts`: `PUBLIC_OBSERVABILITY_ENV`, `pinPublicObservabilityEnv()`. `csp-hosts.ts`:
  `observabilityCspHosts()`. `route-info.ts`: `routeOf()`, `sectionOf()` labels.
- Server logs: `apps/web/src/server/log.ts` (`log`, `redact`, `requestContext`).

## Invariants and gotchas

- **`pinPublicObservabilityEnv()`** sets every unset `NEXT_PUBLIC_*` observability variable to `""` before Next
  reads the environment. Next only inlines defined variables; an undefined one stays a runtime lookup, so
  `if (process.env.NEXT_PUBLIC_SENTRY_DSN) import(...)` would still emit the Sentry chunk. It runs when
  `next.config.ts` imports `apps/web/src/features/seo/security-headers.ts`; `next.config.ts` `env` also pins them.
  Keep the env checks written inline and literal so webpack can drop the dead imports.
- Budget: the island with every tool off is a few hundred bytes (≤ 1 kB, enforced by `npm run size -w web`).
- Privacy: no user fields, cookies, bodies, query strings or local variables in Sentry (`DATA_COLLECTION`, then
  `scrubEvent` as a second layer); local hosts never send. Logs never contain secrets, cookies, tokens or full
  emails; `redact()` runs on every field.
- Route labels use the path only, never the query string.
- `/api/vitals` (`apps/web/src/app/api/vitals/route.ts`) writes one log line per beacon; it doesn't use `route()`
  (no session, no DB) and relies on a Cloudflare rate-limit rule. Analytics Engine writes come with the binding.
- On Workers the Sentry server SDK must wrap the Worker entry (`@sentry/nextjs/cloudflare`); not wired yet.
- The CSP gets a tool's hosts only when its variable is set (`csp-hosts.ts`).

## Extend it

A new tool: add its `NEXT_PUBLIC_*` name to `PUBLIC_OBSERVABILITY_ENV` and to `next.config.ts` `env`, load it lazily
behind a literal env check in the island, add its hosts in `csp-hosts.ts`, and extend
`apps/web/tests/e2e/observability.spec.ts` (off by default: no request, no chunk).

## Tests

`sentry-options.test.ts`, `vitals.test.ts`, `log.test.ts`; E2E `apps/web/tests/e2e/observability.spec.ts`.
