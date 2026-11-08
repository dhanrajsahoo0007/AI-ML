# features/pages: simple site pages (legal, contact, security, pricing copy)

Loads the MDX pages in `apps/web/content/pages/` (terms, privacy, refunds, attributions, copyright, contact,
security, pricing FAQ), fills in business placeholders, and renders them in a copyable layout. Routes:
`apps/web/src/app/legal/`, `apps/web/src/app/contact/`, `apps/web/src/app/security/`, `apps/web/src/app/pricing/`.

## Public API

`index.ts` exports `loadPageDoc()`, `pageMetadata()` and `SitePage`; the client islands are imported by path.

- `page-doc.tsx`: `loadPageDoc(slug)` (cached; compiles `content/pages/<slug>.mdx`), `pageMetadata(slug)` from its
  frontmatter.
- `site-page.tsx`: `<SitePage>`, the layout for legal, contact and security; marks the page `data-copy-ok="page"`.
  `/pricing` has its own layout (also `data-copy-ok="page"`) and loads `pricing-faq` with `loadPageDoc`.
- `placeholders.ts`: `resolvePlaceholders(source, values)`, `placeholderKeys(source)`.
- `billing-period.client.tsx`: `<BillingPeriod>`, the monthly/yearly switch on the pricing page (sets
  `data-period`; prices are server-rendered and shown with CSS variants).
- `region-switcher.client.tsx`: `<RegionSwitcher countries>`, "Show prices for" on the pricing page: a select and
  an "Update prices" button (no reload on change, WCAG 3.2.2) that set or clear the `oa_region` cookie and reload
  `/pricing`. Country names are made at build time with `Intl.DisplayNames`.

## Data flow

`content/pages/**.mdx` with `{{KEY}}` placeholders → `resolvePlaceholders` with values from
`apps/web/src/config/business.ts` (escaped so a value always renders as text) → MDX compile at build → static page.

## Invariants and gotchas

- **A missing placeholder value fails the build** instead of shipping a raw `{{KEY}}` (`resolvePlaceholders` throws
  on an unknown key). Add new keys to `apps/web/src/config/business.ts` first.
- The legal texts originate from the owner-reviewed drafts (not legal advice). Change policy wording only on the
  owner's instruction; the refund policy is the 7-day money-back guarantee (2026-11-07).
- The founder email `dhanrajsahoo.work@gmail.com` must appear on Contact, Refunds, Terms and Privacy.
- These pages are deliberately copyable and printable (`data-copy-ok="page"`); content pages are not.
- Prices shown on `/pricing` are labelled estimates; the checkout (MoR) shows the final amount with tax. The page
  is prerendered per checkout state and regional price tier (`apps/web/src/app/pricing/pricing-view.tsx`, routes
  `apps/web/src/app/pricing/[tier]/` and `apps/web/src/app/pricing/live/[tier]/`); middleware picks the visitor's
  (`apps/web/src/server/edge/AGENTS.md`). A tier's price is the base USD price × its share, rounded (`tierPriceUsd`
  in `apps/web/src/config/pricing-tiers.ts`). Until `PRICE_MONTHLY_USD` / `PRICE_YEARLY_USD` are set, local and
  preview builds show sample prices ($9 / $90 base) and staging and production show "Price announced at launch"
  for every tier.
- Pages are static: no request data, no database.

## Extend it

New site page: add `content/pages/<slug>.mdx` with `title` and `description` frontmatter, a thin route that calls
`loadPageDoc` and renders `<SitePage>`, a line in `STATIC_PATHS` of `apps/web/src/app/sitemap.ts`, and a visual
baseline if it should be snapshot.

## Tests

`placeholders.test.ts`; pages are covered by the route crawl, `apps/web/tests/e2e/seo.spec.ts` and the visual
snapshots in `apps/web/tests/e2e/visual.spec.ts`.
