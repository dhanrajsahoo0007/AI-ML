# Brief for a Cloud page agent

Your launch prompt gives you: **HUB**, **SLUG**, **TITLE**, **BRIEF FILE** (`apps/web/content/cloud/_plan/<nn>-<hub>.md`), the
**MODE** (`new` = replace an outline stub, `rewrite` = rewrite an existing published page in the new format) and
**PAGE NOTES**. Everything else is here. Write one fully finished Cloud concept page for a paid learning site
(Next.js 15 + MDX) at `/cloud/<HUB>/<SLUG>`. Readers are beginners, including teenagers.

## Worktree and sharing rules

- Work ONLY in `/Users/dhanraj/Workspace/AI-ML/.claude/worktrees/cloud-curriculum` (branch `feature/cloud-curriculum`),
  app `apps/web`, dependencies installed. A dev server for this worktree runs at http://localhost:5095; never start or
  stop a server. Up to seven other agents are writing other pages in this worktree at the same time.
- You may create or edit ONLY: `apps/web/content/cloud/<HUB>/<SLUG>.mdx` and your own diagram specs under
  `apps/web/assets/diagrams/animated/cloud/` (the ids reserved for your page in `apps/web/content/cloud/_plan/ASSETS.md`;
  an unlisted one is named `<SLUG>-<n>`). Never: hub MDX files, `_index.yaml` (the lead flips card statuses), the
  glossary, `articles.yaml`, `src/**`, other pages, other agents' specs.
- A spec that ASSETS.md gives to ANOTHER page and that does not exist yet must not be created or embedded by you. A spec
  that already exists (check the folder) may be embedded with `step`, `highlight` or `path`.
- No git command that writes (no add, commit, stash, checkout, reset, restore). The lead commits; an automatic
  checkpoint also commits the worktree every 10 minutes, which is expected.
- `npm run assets -w web` is allowed and needed (it regenerates `src/components/diagrams/animated-specs.ts`; never
  hand-edit that file). Other agents run it too.
- Errors in files you did not write are not yours: ignore them and name them in your report.

## Read first

1. `apps/web/content/cloud/PAGE-TEMPLATES.md`: the Cloud page format (skeleton, Brightpost canon and the table of
   facts already used, per-cloud Tabs block, spec conventions, question pattern, verify). Follow it exactly.
2. The approved pilot `apps/web/content/cloud/fundamentals/identity-and-access.mdx` and its specs
   `apps/web/assets/diagrams/animated/cloud/iam-role-chain.ts` (+ `.meta.yaml`) and `sts-assume-role.ts`; and one more
   written page of your choice from `apps/web/content/cloud/fundamentals/`.
3. Your page's entry in the BRIEF FILE (scope, sections, diagrams with steps, question ideas, exam refs, links).
   `apps/web/content/cloud/_plan/RECONCILIATION.md` wins where they disagree: `Tabs` not CloudTabs, `CloudMapping` not
   ConceptMap, `sequence`/`layout` specs instead of Mermaid/SVG assets, the site's answer house style, and theory that
   lives in `/system-design` is linked, not re-taught (§3 table).
4. `apps/web/content/system-design/COMPONENTS.md` (§1 teaching components, §2 widgets, §3 spec kinds and lint rules,
   §4 glyphs, §5 interview answers) and `apps/web/content/system-design/PAGE-TEMPLATES.md` §1 (beginner-first rules,
   originality policy, PremiumBreak).
5. Catalog ids for `cloud:` refs: grep `apps/web/src/lib/cloud-data/*.ts`. Use only ids that exist and belong to that
   provider (the spec lint fails otherwise); else `{ label: "…" }`. Responsibility sets and decision-tree topics that
   exist: see `apps/web/src/lib/cloud-data/responsibility-sets.ts` and `decision-trees.ts`.
6. Glossary ids for `<Term id>`: `apps/web/content/system-design/glossary.yaml`. A missing term is defined inline and
   listed in your report; never edit the glossary.

In `rewrite` mode, also read the existing page: keep what is still right (facts, any widget the page is known for),
then rewrite it fully in the new format. Its URL and its interview questions' topic must stay.

## Quality bar (same as the pilot)

- Entirely our own words, analogies and numbers. No vendor or course text, no vendor diagrams, no exam wording, no
  prices or discount percentages. Facts must be right on all three clouds; when unsure, say it only in that cloud's
  Tab or leave it out, and list it in your report. State mechanisms, not counts or limits that change.
- Brightpost canon must stay consistent. Your page gets its OWN incident (do not reuse another page's). Add numbers
  only if needed and list every new fact in your report.
- Every term defined on first use; sentences short (none over 30 words); active voice; numbers, not adjectives; no
  "simply / just / obviously". One idea per diagram; an architecture stepper with exactly one failure step; node
  positions fixed across steps; canvas at most 800 wide (go taller, not wider), embedded with `minWidth={620}`; first
  steps' nodes in the left and middle columns so they show on a phone; nodes sized for the longest provider name the
  Services toggle shows. At most two lazy widgets per page (`DecisionTree` counts).
- Interview questions: the count and level mix from your brief entry (default 4: 1 Junior, 2 Mid, 1 Senior), all
  `category="Cloud"`, answers in the house style: **Short answer.** → **Why.** → optional one diagram reusing your
  spec with `step`/`highlight`/`path` → **Follow-ups the interviewer may ask.** → **Watch out for.** At least half the
  answers carry a diagram.
- Length: about 2,400–3,000 words of prose (the pilot is about 2,950).

## Verify (fix until clean, judging only your own files)

- Root: `npm run assets -w web`, then `npm run content-check -w web` → 0 errors. The only acceptable warnings are
  "card … has status outline but the page is published" for pages of this batch, and specs not yet used by a page.
- `apps/web`: `npx vitest run tests/unit/diagrams/specs.test.ts` (your specs must pass) and `npx tsc --noEmit` (no
  errors in your specs); `npx prettier --write` on your own spec `.ts` files.
- Render: `curl -s -b "tts_local_view=paid" http://localhost:5095/cloud/<HUB>/<SLUG>` → 200, every H2 present, and no
  visible error note (read `apps/web/src/components/teach/props.tsx`; check the rendered text, not the dev JS bundle,
  which contains those strings as code). Skip the unpaid-preview check.
- Screenshots: copy `/private/tmp/claude-501/-Users-dhanraj-Workspace-SYSTEM-DESIGN/8ca8ff97-8e2d-4435-9cf4-9f9c6440f4c7/scratchpad/pilot/shoot.cjs`
  into `/private/tmp/claude-501/-Users-dhanraj-Workspace-SYSTEM-DESIGN/8ca8ff97-8e2d-4435-9cf4-9f9c6440f4c7/scratchpad/pages/<SLUG>/`
  and adapt it (installed Chrome; desktop 1280 and phone 390; light and dark; every stepper step; the three Services
  toggles). Read your screenshots and fix overlaps, clipped labels, edges through boxes or zone tabs, steps where
  nothing visibly changes, and boxes overflowing with provider names. Iterate until clean.
- Word count and longest sentence (adapt `words.py` / `check.py` from the same pilot folder).

## Report (your final message, plain text, concise)

Files created; stepper step list; glossary terms used and missing; new Brightpost facts; facts you were unsure of;
verify output lines; the 3 best screenshot paths (desktop full page, the failure step, phone); anything left undone.
