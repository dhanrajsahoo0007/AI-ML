# features/dsa: the `problems` section kind (DSA)

Topics (pattern articles) and coding problems with an in-browser editor and test runner. Routes live in
`apps/web/src/app/dsa/` (`/dsa`, `/dsa/<topic>`, `/dsa/problems`, `/dsa/problems/<slug>`); they only call this feature. The section
is built for local and CI preview builds only (`off` on staging and production) until released.

## Public API

`index.ts` exports the route helpers, SEO, MDX renderers and server components the `apps/web/src/app/dsa/` pages
use; the client islands are imported by path. `apps/web/src/features/sections/kinds.ts` imports `kind.ts` by path
(plain Node can't load the index's JSX and server-only modules), and the tests import the files by path.

- `kind.ts`: `problemsKind` (`SectionKind<DsaItem>`), registered in `apps/web/src/features/sections/kinds.ts`.
- `routes.ts`: `dsaSection()` (404 when off), `dsaContent()` (drafts left out), `topicParams()`, `problemParams()`,
  `getTopic()`, `practiceGroups()` (a topic's problems by first pattern).
- `source.ts`: reads topics, problems, public tests and `apps/web/content/dsa/patterns.yaml` from disk;
  `readHiddenTestsForValidation()`, `readReferenceSolutionForValidation()`, `withoutDrafts()`.
- `schema.ts`: problem/topic frontmatter, test-file and pattern schemas; `MIN_HIDDEN_TESTS`, `PREMIUM_BREAK`.
- `mdx.tsx`: `problemStatement()` and `problemEditorial()` compile the two halves of a problem separately.
- `problem-index.ts`: the build-time JSON index behind the filterable list (client-safe): difficulty, topic,
  pattern and company facets, title search, `PAGE_SIZE` (50) rows per page.
- `local-view.ts`: `showsPremiumEditorialLocally()`, the local editorial review (below).
- Client islands: `problem-list.client.tsx`, `problem-workspace.client.tsx`, `editor.client.ts` (CodeMirror).
- `runner/`: `runner/run.ts` (page side), `runner/js.worker.ts`, `runner/py.worker.ts` (Pyodide),
  `runner/lockdown.ts`, `runner/compare.ts`, `runner/protocol.ts`, `runner/py-result.ts` (Python case result,
  shared with `reference.test.ts`), harnesses. `seo.ts`: metadata and JSON-LD.

## Data flow

Four files per problem: `content/dsa/problems/<slug>.mdx` (statement, `<PremiumBreak/>`, editorial),
`content/dsa/tests/<slug>.public.json`, `content/dsa/tests/<slug>.hidden.json` and, for every problem that lists
`python`, the reference solution `content/dsa/solutions/<slug>.py` → validated at build → the problem page gets
the statement, starter code, entry names and **public** cases as props → "Run tests" lazy-loads `runner/run.ts`,
which spawns a Web Worker per run and compares results with `runner/compare.ts`. Nothing is sent to the server.

## Invariants and gotchas

- **Hidden case names** are `hidden/<slug>/NN <label>` (NN two digits, e.g. "hidden/two-sum/03 large magnitudes
  cancel"); content-check rejects any other. The hidden/ prefix is the sentinel `leak.test.ts` scans every
  client bundle and prerendered page for.
- **Reference solutions** (`content/dsa/solutions/<slug>.py`): required when `languages` lists `python`; define the
  same top-level name as the starter's `entry`, no `if __name__ == "__main__":` block (the harness runs code as
  `__main__`; the starter may not have one either), standard library only. They never ship: `loadDsaItems()` does
  not read them, and only content-check and the tests call `readReferenceSolutionForValidation()`.
- **Python-only problems are fine** (`languages: [python]`): `reference.test.ts` covers them; the JavaScript
  `REFERENCE` map in `runner.test.ts` is only for problems that offer JavaScript.
- **Drafts** (`status: draft`, problem or topic) are validated but get no page, sitemap entry, search entry or nav
  link. Unfinished imports still stay out of the branch.
- **Scale:** the nav lists topics and one link to the problem list, never every problem (the header menu's
  nav-items.json would carry them all); the hub shows topics only; the list renders 50 rows per page and its
  links don't prefetch.
- **Hidden tests never ship.** Only their path sits on the item; `readHiddenTestsForValidation()` is the one reader,
  used by content-check. No page may import it. `leak.test.ts` and the E2E "hidden tests are never served" test
  check props, the index, bundles and HTML. They exist for the future Stage C server-side judge.
- **Premium editorials are never compiled for public pages**: `mdx.tsx` splits at `<PremiumBreak/>` and the page
  shows `ProEditorial` (container class `PAYWALL_CONTAINER_CLASS` from `apps/web/src/features/seo/site.ts`).
  Topics and easy problems are always free (`alwaysFree` in the registry). `mdx.test.tsx` still compiles every
  editorial, so a broken premium one fails `npm test`.
- **Reading premium editorials locally:** `npm run dev`, then the "Local view" switch (bottom right) → Paid, or
  `LOCAL_VIEW_AS=paid` in .env.local. Only `APP_ENV=local` honours it (`localView()` in
  `apps/web/src/server/edge/local-view.ts`); every other build ignores the cookie and stays static
  (`local-view.test.ts`).
- **Runner CSP:** only the runner worker chunks (`dsa-js-runner*`, `dsa-python-runner*`) get `'unsafe-eval'`,
  `'wasm-unsafe-eval'` and the Pyodide CDN, through the second header rule in `apps/web/next.config.ts` and the
  `dsaRunner` option of `apps/web/src/features/seo/security-headers.ts` (on Cloudflare, the generated
  `_headers` file, since static assets skip `next.config.ts`). The chunk names come from the `name` passed to
  `new Worker(...)` in `runner/run.ts` and are listed in `DSA_RUNNER_CHUNKS`: rename one and the runner breaks under
  the CSP (the E2E test in `apps/web/tests/e2e/seo.spec.ts` fetches the built chunks and checks their policy).
- `runner/lockdown.ts` deletes network and storage globals in the worker before user code runs; CSP `connect-src` is the
  second fence. Each case has a wall-clock limit; on timeout the worker is terminated (the only way to stop a loop).
- No editor or runner JS in first load: CodeMirror loads on first interaction, the runner on "Run tests". The
  editor is `contenteditable`, so copy protection leaves it usable while the statement stays protected.
- Values compare as JSON (`1` equals `1.0`, object key order ignored, `undefined` = `null`).
- Supported languages: JavaScript and Python only (`LANGUAGES` in `constants.ts`).

## Outlines (statement-only pages)

`apps/web/content/dsa/outlines/<slug>.mdx` (`status: outline`, schema `outlineFrontmatterSchema` in `schema.ts`) is a
problem that has only its statement: no starter, tests, reference or editorial. It is served at the problem URL
(`findOutline()` in `routes.ts`, rendered by the problem page) and listed in the sidebar, the hub counts and its
topic page, but not in the filterable problem list. There is one outline per file of the owner's notes; an empty file
is a placeholder (`placeholder: true`, shown as "(to write)" in lists) kept so the numbering has no gaps. `group` and `number` keep the numbering of the owner's notes;
a topic's `order` is its number (`topicLabel()` in `kind.ts`). Once `apps/web/content/dsa/problems/<slug>.mdx` exists the outline with
the same slug is ignored: delete it in the same change. Every outline is compiled in `mdx.test.tsx`.

An outline may carry notes after `<PremiumBreak/>` (approach, complexity, the owner's solution and tests). They follow
the editorial rule: `outlineNotes()` in `mdx.tsx` is only called for the local Paid view, every other build shows the Pro
placeholder, and `leak.test.ts` fails if a built page carries `data-dsa-outline-notes`.

## Extend it

- New problem: `.claude/skills/add-dsa-problem/SKILL.md`. New topic: an MDX file in `content/dsa/topics/`.
- New pattern: add it to `apps/web/content/dsa/patterns.yaml`. New language: add it to `LANGUAGES`, a worker and
  harness in `runner/`, a CSP rule if it needs one, and tests.

## Tests

`kind.test.ts`, `schema.test.ts`, `problem-index.test.ts`, `routes.test.ts`, `runner.test.ts` (JavaScript
references), `reference.test.ts` (Python references in Pyodide under Node, the `pyodide` dev dependency pinned to
`PYODIDE_VERSION`; every public and hidden case, and the starter must fail public case 1), `mdx.test.tsx`,
`leak.test.ts` (reads `.next` when a build exists: run it after `npm run build`, not after `next dev`),
`local-view.test.ts`; E2E `apps/web/tests/e2e/dsa.spec.ts` (`@core`, Python `@full`; samples problems, never
assumes a count).
