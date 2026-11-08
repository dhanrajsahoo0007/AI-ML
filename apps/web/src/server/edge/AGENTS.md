# server/edge: the only server code middleware may import

Edge-safe helpers for `apps/web/src/middleware.ts`: the section gate, the `oa_ent` entitlement cookie, the
maintenance page, the edge env and the health handler. **No database, no Node APIs, no `fs`**: Web Crypto, `jose`
and zod only. Middleware runs on every content request before the page cache, within ~1 ms of CPU.

## Public API

- `sections-gate.ts`: `decideGate({ pathname, manifest, killed, isAdmin })` → `maintenance | not-found | pass`;
  `needsAdmin()`, `parseKillList()`, `matchPrefix()`, `normalizePath()`, `sectionManifestSchema`, `EMPTY_MANIFEST`.
  Pure (no Next.js, no env), unit-tested directly.
- `entitlement.ts`: `ENTITLEMENT_COOKIE` (`oa_ent`), `verifyEntitlement(token, keyring)`, `signEntitlement()`
  (refresh endpoint and tests only; middleware never signs), `keyringFromEnv()`, `parseKey()`, `isAdmin()`,
  `CLOCK_TOLERANCE_SEC`.
- `env.ts`: `readEdgeEnv()`, `edgeEnvSchema` (`APP_ENV`, `NEXT_PUBLIC_GIT_SHA`, `SECTIONS_KILL`,
  `ENTITLEMENT_SECRET`, `ENTITLEMENT_SECRET_PREVIOUS`), `appVersion()`.
- `maintenance.ts`: `maintenanceResponse()` (503, `Retry-After: 300`, `noindex`, self-contained HTML).
- `health.ts`: `healthHandler()` behind `GET /api/health` → `{status, version, env, region}`.
- `analytics.ts`: Workers Analytics Engine writes (`ANALYTICS` binding, plan §10.5): `writeAnalytics(point)` (no-op
  without the binding, never throws, never awaited), `toDataPoint()` (the column layout in the file header),
  `paywallPreviewPoint()`, `edgeCountry()`, `analyticsDataset()`. Used by middleware (paywall previews) and by
  `/api/vitals`, `/api/billing/checkout` and `/api/billing/webhook/[provider]`.
- `host-guard.ts`: `decideHost()`: in production a page request on a host other than `BETTER_AUTH_URL`'s
  (workers.dev, version preview URLs, which skip the zone's WAF and bot rules) → 308 to the canonical host, unless
  it carries `x-smoke-key` = `SMOKE_KEY` (deploy smoke tests; passes with `noindex`).

## Data flow

`next.config.ts` writes the hidden-routes manifest (src/generated/hidden-routes.json, production builds only) from
the registry → middleware bundles it → per request: kill list from `SECTIONS_KILL` → if the path is in a hidden
section, verify `oa_ent` for `role=admin` → `decideGate` → 503 page, rewrite to the 404 page, or pass (admin passes
get `Cache-Control: private, no-store`). Every response gets `x-app-version` (the deploy smoke test checks it).

## Invariants and gotchas

- **Fail closed:** a missing or malformed `ENTITLEMENT_SECRET` means nobody is entitled, never everybody. Bad tokens
  (unknown `kid`, wrong algorithm, expired, older than 15 minutes, `iat` in the future beyond 2 minutes, wrong claim
  shape) all verify to `null`.
- Key format is `<kid>:<base64url key of ≥ 32 bytes>`; the `kid` is in the JWT header, not the claims. Two keys
  verify at once for rotation (runbook in the root `AGENTS.md`).
- Paths are lower-cased, decoded and collapsed before matching, so `/Cloud`, `/%63loud` and `//cloud/` can't slip
  past the gate.
- The kill switch wins over everything, admins included. `SECTIONS_KILL` is a Worker **secret** (not a var) so a
  deploy never resets it.
- `not-found` is a rewrite to an unrouted path, so Next renders the site 404 (RSC requests get the not-found tree);
  don't force a 404 status on RSC responses, the client router ignores non-200 prefetch bodies.
- `next dev` has no manifest and gates nothing; a production build without it throws.
- Middleware's matcher skips `/api/`, `/_next/`, `/cdn-cgi/` and files with an extension.
- Security headers are **not** set here; they come from `apps/web/next.config.ts`.
- `health.ts` reads no database (it proves the Worker version is live, not that Neon is up).
- Middleware's only metric is on the paywall `preview` branch: a pure `paywallPreviewPoint()` plus one
  `writeDataPoint`, which is non-blocking by design (queued, sent after the response), so no `waitUntil`. Router
  prefetches are skipped. Middleware is the one place that sees every preview (the rewrite is `private`, so no
  cache answers it). Don't add metrics to other branches; content pages pass through untouched.
- Analytics points carry labels only (path, section, tier, country, outcome), never a user ID or email; the
  column positions are a contract with saved SQL queries, so append new blobs, never reorder.

## Planned

Stream L adds the premium gate (verify `oa_ent` `tier=pro`, else rewrite to the preview route) on top of this
gate, using the same keyring.

## Tests

`sections-gate.test.ts`, `entitlement.test.ts` (forged, wrong kid, expired, rotation, skew), `health.test.ts`,
`analytics.test.ts` (column layout, no-op without the binding, prefetch skipping); E2E
`apps/web/tests/e2e/edge-gate.spec.ts`.
