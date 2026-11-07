# features/pages: simple site pages (legal, contact, security, pricing copy)

Loads the MDX pages in `apps/web/content/pages/` (terms, privacy, refunds, attributions, copyright, contact,
security, pricing FAQ), fills in business placeholders, and renders them in a copyable layout. Routes:
`apps/web/src/app/legal/`, `apps/web/src/app/contact/`, `apps/web/src/app/security/`, `apps/web/src/app/pricing/`.

## Public API

No index file; import the files directly.

- `page-doc.tsx`: `loadPageDoc(slug)` (cached; compiles `content/pages/<slug>.mdx`), `pageMetadata(slug)` from its
  frontmatter.
- `site-page.tsx`: `<SitePage>`, the layout for legal, contact and security; marks the page `data-copy-ok="page"`.
  `/pricing` has its own layout (also `data-copy-ok="page"`) and loads `pricing-faq` with `loadPageDoc`.
- `placeholders.ts`: `resolvePlaceholders(source, values)`, `placeholderKeys(source)`.
- `billing-period.client.tsx`: `<BillingPeriod>`, the monthly/yearly switch on the pricing page (sets
  `data-period`; prices are server-rendered and shown with CSS variants).

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
- Prices shown on `/pricing` are labelled estimates; the checkout (MoR) shows the final amount with tax.
- Pages are static: no request data, no database.

## Extend it

New site page: add `content/pages/<slug>.mdx` with `title` and `description` frontmatter, a thin route that calls
`loadPageDoc` and renders `<SitePage>`, a line in `STATIC_PATHS` of `apps/web/src/app/sitemap.ts`, and a visual
baseline if it should be snapshot.

## Tests

`placeholders.test.ts`; pages are covered by the route crawl, `apps/web/tests/e2e/seo.spec.ts` and the visual
snapshots in `apps/web/tests/e2e/visual.spec.ts`.
