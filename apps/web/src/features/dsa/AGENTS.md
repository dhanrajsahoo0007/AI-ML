# features/dsa: the `problems` section kind (DSA)

Topics (pattern articles) and coding problems with an in-browser editor and test runner. Routes live in
`apps/web/src/app/dsa/` (`/dsa`, `/dsa/<topic>`, `/dsa/problems`, `/dsa/problems/<slug>`); they only call this feature. The section
is `off` in production until released.

## Public API

`index.ts` exports the route helpers, SEO, MDX renderers and server components the `apps/web/src/app/dsa/` pages
use; the client islands are imported by path. `apps/web/src/features/sections/kinds.ts` imports `kind.ts` by path
(plain Node can't load the index's JSX and server-only modules), and the tests import the files by path.

- `kind.ts`: `problemsKind` (`SectionKind<DsaItem>`), registered in `apps/web/src/features/sections/kinds.ts`.
- `routes.ts`: `dsaSection()` (404 when off), `dsaContent()`, `topicParams()`, `problemParams()`, `getTopic()`.
- `source.ts`: reads topics, problems, public tests and `apps/web/content/dsa/patterns.yaml` from disk; `readHiddenTestsForValidation()`.
- `schema.ts`: problem/topic frontmatter, test-file and pattern schemas; `MIN_HIDDEN_TESTS`, `PREMIUM_BREAK`.
- `mdx.tsx`: `problemStatement()` and `problemEditorial()` compile the two halves of a problem separately.
- `problem-index.ts`: the build-time JSON index behind the filterable list (client-safe).
- Client islands: `problem-list.client.tsx`, `problem-workspace.client.tsx`, `editor.client.ts` (CodeMirror).
- `runner/`: `runner/run.ts` (page side), `runner/js.worker.ts`, `runner/py.worker.ts` (Pyodide),
  `runner/lockdown.ts`, `runner/compare.ts`, `runner/protocol.ts`, harnesses. `seo.ts`: metadata and JSON-LD.

## Data flow

`content/dsa/problems/<slug>.mdx` (statement, `<PremiumBreak/>`, editorial) + `content/dsa/tests/<slug>.public.json`

- `<slug>.hidden.json` → validated at build → the problem page gets the statement, starter code, entry names and
  **public** cases as props → "Run tests" lazy-loads `runner/run.ts`, which spawns a Web Worker per run and compares
  results with `runner/compare.ts`. Nothing is sent to the server.

## Invariants and gotchas

- **Hidden tests never ship.** Only their path sits on the item; `readHiddenTestsForValidation()` is the one reader,
  used by content-check. No page may import it. `leak.test.ts` and the E2E "hidden tests are never served" test
  check props, the index, bundles and HTML. They exist for the future Stage C server-side judge.
- **Premium editorials are never compiled for public pages**: `mdx.tsx` splits at `<PremiumBreak/>` and the page
  shows `ProEditorial` (container class `PAYWALL_CONTAINER_CLASS` from `apps/web/src/features/seo/site.ts`).
  Topics and easy problems are always free (`alwaysFree` in the registry).
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

## Extend it

- New problem: `.claude/skills/add-dsa-problem/SKILL.md`. New topic: an MDX file in `content/dsa/topics/`.
- New pattern: add it to `apps/web/content/dsa/patterns.yaml`. New language: add it to `LANGUAGES`, a worker and
  harness in `runner/`, a CSP rule if it needs one, and tests.

## Tests

`kind.test.ts`, `schema.test.ts`, `problem-index.test.ts`, `runner.test.ts` (reference solutions run against every
public and hidden case), `leak.test.ts`; E2E `apps/web/tests/e2e/dsa.spec.ts` (`@core`, Python `@full`).
