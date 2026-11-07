# features/seo: metadata, JSON-LD, OG images and security headers

Per-page `<head>` metadata (title, description, canonical, Open Graph, Twitter, robots), schema.org JSON-LD
(including Google's paywalled-content markup), Open Graph cards, and the browser security headers for every
response.

## Public API

No index file; import the files directly.

- `metadata.ts`: `pageMetadata(input)` (every page uses it), `pageRobots()`, `OG_WIDTH`/`OG_HEIGHT`, and the helper
  that keeps the nearest `opengraph-image` when a page sets its own `openGraph`.
- `docs.ts`: `docsSectionSeo()`, `docPageSeo()` for the shared docs routes. `pages.ts`: `homeSeo()`,
  `listingPageSeo()` for route-folder sections. (DSA and newsletter have their own seo modules built on these.)
- `json-ld.ts`: `organizationNode()`, `websiteNode()`, `breadcrumbNode()`, `articleNode()`;
  `json-ld-script.tsx`: `<JsonLd data>`.
- `og-image.tsx`: `ogImage({ title, subtitle })` used by every opengraph-image route.
- `security-headers.ts`: `securityHeaders()`, `contentSecurityPolicy()`, loaded by `apps/web/next.config.ts`.
- `site.ts`: `SITE_NAME`, `absoluteUrl()`, `PAYWALL_CONTAINER_CLASS`.

`apps/web/src/app/sitemap.ts` (on sections only, URLs only) and `apps/web/src/app/robots.ts` (AI crawlers blocked
from `apps/web/src/config/crawlers.ts`, search engines allowed) live in the app folder.

## Invariants and gotchas

- **Headers come from `next.config.ts`, not middleware.** `securityHeaders()` is applied to `/:path*`; a second rule
  relaxes the CSP only for the DSA runner chunks (`dsaRunner: true`: `'unsafe-eval'`, `'wasm-unsafe-eval'`,
  Pyodide CDN). Never relax the page CSP to fix a runner problem.
- The CSP is **Report-Only** until Phase 7; `upgrade-insecure-requests` and `report-to` are left out until it is
  enforced and `CSP_REPORT_ENDPOINT` exists. `'unsafe-inline'` scripts are a known trade-off (nonces would break
  static caching).
- Third-party hosts are added in `CSP_HOSTS` or come from `apps/web/src/features/observability/csp-hosts.ts` only
  when that tool's variable is set. The Dodo checkout origin is still empty (stream L).
- Importing `security-headers.ts` runs `pinPublicObservabilityEnv()` (see `apps/web/src/features/observability/AGENTS.md`).
  Relative imports only: `next.config.ts` loads this file with plain Node.
- Outside production builds `X-Robots-Tag` is `noindex, nofollow, noai, noimageai`; production sends
  `noai, noimageai`.
  `hidden` sections get `noindex` and are never in the sitemap.
- **Paywall markup:** premium articles emit `isAccessibleForFree: false` with `hasPart.cssSelector` pointing at
  the `oa-paywalled` class. The Phase 5 `<Paywall/>` container must use exactly `PAYWALL_CONTAINER_CLASS`, or Google may treat
  the gated part as cloaking.
- `<JsonLd>` is the only `dangerouslySetInnerHTML` in this feature; its input is build-time data escaped by
  `serializeJsonLd`.
- OG images are static (rendered once at build) and must never include premium text.
- Nothing here reads the request: metadata is computed at build from frontmatter and the registry.

## Extend it

New page: call `pageMetadata()` from its `generateMetadata` with its own path and pass `parent` so OG images are
kept. New third-party host: add it to `CSP_HOSTS` and a test in `security-headers.test.ts`.

## Tests

`metadata.test.ts`, `json-ld.test.ts`, `docs.test.ts`, `security-headers.test.ts`; E2E
`apps/web/tests/e2e/seo.spec.ts`.
