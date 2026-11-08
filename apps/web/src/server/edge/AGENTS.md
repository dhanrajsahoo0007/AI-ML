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
- `pricing-variant.ts`: `decidePricing({ pathname, paywall, billingConfigured, regionCookie, country })` → which
  prerendered pricing page to serve at `/pricing` (`rewrite`, or null for `/pricing` itself) and the headers to set,
  or null off the pricing pages; `COUNTRY_HEADER` (`cf-ipcountry`). Composes `pricingRewrite()` from
  `paywall-gate.ts` (checkout live or not) with the regional price tier from `apps/web/src/config/pricing-tiers.ts`.
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

**Pricing (live × tier):** `/pricing` is served from one of six prerendered pages, checkout state × regional
price tier (plan §9.3, §9.5):

|                                   | tier A          | tier B            | tier C            |
| --------------------------------- | --------------- | ----------------- | ----------------- |
| launching soon                    | `/pricing`      | `/pricing/b`      | `/pricing/c`      |
| live (paywall on, `DODO_API_KEY`) | `/pricing/live` | `/pricing/live/b` | `/pricing/live/c` |

The tier comes from the `oa_region` cookie (the pricing page's region switcher; an ISO country code) if it is a
valid code, else `cf-ipcountry` (Cloudflare sets it from `request.cf.country`; needs the zone's IP Geolocation
setting, on by default), else A. The country → tier map is `apps/web/src/config/pricing-tiers.ts`.

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
- **`/pricing` is per visitor**, so middleware sends `Cache-Control: private, no-cache` and
  `Vary: Cookie, CF-IPCountry` with it. `private` is what matters: Cloudflare's cache ignores `Vary` on HTML, and
  `next start` replaces middleware's `Vary` with its own. The six variants stay prerendered and cached server-side
  (incremental cache); at their own URLs they are single-content and cacheable, with `X-Robots-Tag: noindex`
  (canonical `/pricing`). Don't put a robots meta on a variant: it would de-index `/pricing` whenever middleware
  serves that variant there.
- The displayed price is only an estimate: Dodo charges by the billing country of the payment method, so a spoofed
  header, a VPN or the cookie can't change what anyone pays. Never use the tier for anything but the display.
- **To change a country's tier**, move its code between the lists in `apps/web/src/config/pricing-tiers.ts` (an
  unlisted country is tier A; the same map sets `subscription.price_tier` for reporting), have the owner change
  that country's price in the Dodo dashboard, and run `npm test -w web`. To change a tier's share, edit
  `TIER_PERCENT` there. A new tier also needs a slug in `TIER_SLUGS` and its pages are generated automatically.
- `health.ts` reads no database (it proves the Worker version is live, not that Neon is up).
- Middleware's only metric is on the paywall `preview` branch: a pure `paywallPreviewPoint()` plus one
  `writeDataPoint`, which is non-blocking by design (queued, sent after the response), so no `waitUntil`.
  Middleware is the one place that sees every preview (the rewrite is `private`, so no cache answers it). Only
  document loads count (`Sec-Fetch-Dest: document`, no `Sec-Purpose: prefetch`): Next.js strips `RSC` and
  `Next-Router-Prefetch` before middleware, so client-side navigations can't be told from router prefetches and
  are left out. Don't add metrics to other branches; content pages pass through untouched.
- Analytics points carry labels only (path, section, tier, country, outcome), never a user ID or email; the
  column positions are a contract with saved SQL queries, so append new blobs, never reorder.

## Planned

Stream L adds the premium gate (verify `oa_ent` `tier=pro`, else rewrite to the preview route) on top of this
gate, using the same keyring.

## Tests

`sections-gate.test.ts`, `entitlement.test.ts` (forged, wrong kid, expired, rotation, skew), `health.test.ts`,
`pricing-variant.test.ts` (tier × live, cookie override, malformed input, cache headers), `analytics.test.ts`
(column layout, no-op without the binding, document loads only); E2E `apps/web/tests/e2e/edge-gate.spec.ts` and
`apps/web/tests/e2e/pricing.spec.ts` (spoofed `cf-ipcountry`, switcher, canonical).
