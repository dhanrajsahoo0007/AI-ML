# features/observability: errors, web vitals and logs (off by default)

Sentry (browser and server), real-user Core Web Vitals, and the CSP hosts these tools need. Every tool is off until
its variable is set at build; no account exists yet, and the build needs no env vars.

## Public API

No index file; import the files directly.

- `observability.tsx`: `<Observability />`, mounted once in the root layout (Cloudflare beacon + the island).
- `observability.client.tsx`: `ObservabilityIsland`; starts vitals, Sentry and PostHog only after `load` and idle.
- `capture.ts`: `captureError()` for `apps/web/src/app/error.tsx` and `apps/web/src/app/global-error.tsx`.
- `vitals.client.ts` (10% sample, `sendBeacon` to `/api/vitals`) and `vitals-schema.ts` (`vitalsPayload`, zod).
- `sentry.browser.ts`, `sentry.server.ts` (started from `apps/web/src/instrumentation.ts` when `SENTRY_DSN` is set,
  Node and `next start` only), `sentry-options.ts` (`DATA_COLLECTION`, `scrubEvent`, `isLocalHost`,
  `TRACES_SAMPLE_RATE`).
- `sentry.worker.ts`: `withWorkerSentry(handler)`, `sentryWorkerOptions(env)`: Sentry on Cloudflare Workers, applied
  by the Worker entry `apps/web/worker.mjs` (wrangler `main`) to OpenNext's generated handler.
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
- `/api/vitals` (`apps/web/src/app/api/vitals/route.ts`) writes one log line per beacon, through `route()` with the
  `vitals` rate limit and the Origin check off (no session, no DB), plus one Analytics Engine `web_vital` point
  per metric when the Worker has the `ANALYTICS` binding (`apps/web/src/server/edge/analytics.ts`).
- On Workers, Sentry wraps the Worker entry (`withSentry` from `@sentry/nextjs/cloudflare`), decided per request:
  without the `SENTRY_DSN` secret the SDK is never imported; with it, it is loaded once per isolate (lazily, so it
  costs nothing at startup) and starts per request. `register()` in instrumentation does nothing on Workers, so
  there is one client; `onRequestError` reports through it. `traceLifecycle: "static"` keeps `scrubEvent` on
  transactions. The SDK adds about 0.3 MB gzip to the Worker bundle.
- `apps/web/worker.mjs` stays plain JavaScript and wiring only: in TypeScript, `allowJs` would make `tsc` follow its
  import into the generated `.open-next` bundle. New Worker handlers (the email queue's `queue()`) go in its marked
  spot and are wrapped by `withWorkerSentry` like `fetch`.
- The CSP gets a tool's hosts only when its variable is set (`csp-hosts.ts`).

## Extend it

A new tool: add its `NEXT_PUBLIC_*` name to `PUBLIC_OBSERVABILITY_ENV` and to `next.config.ts` `env`, load it lazily
behind a literal env check in the island, add its hosts in `csp-hosts.ts`, and extend
`apps/web/tests/e2e/observability.spec.ts` (off by default: no request, no chunk).

## Tests

`sentry-options.test.ts`, `sentry.worker.test.ts`, `vitals.test.ts`, `log.test.ts`; E2E
`apps/web/tests/e2e/observability.spec.ts`.
