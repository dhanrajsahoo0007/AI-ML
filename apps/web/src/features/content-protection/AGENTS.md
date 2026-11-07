# features/content-protection: no copying (layer 1, browser deterrents)

Owner decision 2026-11-07: no content may be copied, printed or harvested. This feature is the browser layer: no
text selection, copy/cut/drag blocked with a notice, right-click and Ctrl/⌘ + C/X/A/S/P/U intercepted, printing
replaced by a notice, plus the `tdm-reservation` meta. The real protection is server-side (paywall, AI-crawler
blocking in `apps/web/src/app/robots.ts`, rate limits, watermarks later).

## Public API

No index file; import the files directly.

- `content-protection.tsx`: `<ContentProtection />`, mounted once in the root layout (island + TDM meta).
- `content-protection.client.tsx`: `ContentProtectionIsland`, one set of document listeners.
- `protection.ts`: the pure decisions (`EDITABLE`, `COPY_OK`, `COPY_OK_PAGE` selectors and the handlers' logic).
- `dom-env.ts`: `domEnv()`, the real DOM behind the decisions. `content-protection.css`: `user-select`, print rules.

## Scope

Everything inside `<main>` is protected, except:

- form controls and editable regions (`input`, `textarea`, `select`, `contenteditable`), which always keep normal
  copy, paste and selection (the DSA code editor relies on this);
- subtrees marked `data-copy-ok` (stay copyable);
- whole pages marked `data-copy-ok="page"` (no shortcut interception, printing allowed): legal, pricing, contact and
  security pages via `apps/web/src/features/pages/site-page.tsx`, because people must be able to quote terms and copy
  our email address.

## Invariants and gotchas

- **Accessibility first:** screen readers, keyboard navigation, focus and zoom must keep working; axe
  (`apps/web/tests/e2e/a11y.spec.ts`) must stay green. Don't block Tab, arrow keys or browser zoom.
- Decisions stay pure in `protection.ts` so they are unit-tested without a DOM; DOM access lives only in `dom-env.ts`.
- The copied-text notice uses the brand from `apps/web/src/config/business.ts` and the page URL, never the content.
- Never add copy buttons, "Copy for LLM", raw-markdown endpoints or full-text feeds (golden rule 7).
- Budget: under 2 kB of JS; it ships on every page.

## Extend it

A new copyable region (e.g. a coupon code): add `data-copy-ok` to that element only. A new protected element type:
extend `protection.ts` and its test, then the E2E spec.

## Tests

`protection.test.ts`; E2E `apps/web/tests/e2e/content-protection.spec.ts` (selection, copy notice, print, right-click
only on content).
