# Brief for a Cloud QA reviewer (Wave 7)

Your launch prompt gives you a **HUB** (or a provider group set) and its page list. Every page is already written and
renders. Your job is a careful **review and fix pass**, not a rewrite: make each page correct, consistent and
comfortable for a beginner, then prove it renders cleanly.

## Rules

- Work ONLY in `/Users/dhanraj/Workspace/AI-ML/.claude/worktrees/cloud-curriculum`, app `apps/web`. Dev server
  http://localhost:5095 (never start or stop it; if it does not answer, wait and retry). Up to six other reviewers
  work at the same time on other hubs.
- Edit ONLY your hub's MDX pages and the specs those pages own (see `apps/web/content/cloud/_plan/ASSETS.md`). Never
  edit hub MDX, `_index.yaml`, `articles.yaml`, the glossary, `src/**` (unless your prompt says so) or other hubs'
  pages. If a problem needs a change elsewhere, list it in your report.
- No git command that writes. `npm run assets -w web` is allowed after a spec change.
- Keep URLs, titles, interview question count and topics. Never set `access`. Never put `<Term>` inside an
  `<InterviewQuestion>` answer.

## What to check on every page

1. **Facts.** Read each page's per-cloud Tabs and any service claim. Fix anything wrong; remove anything you cannot
   stand behind (a vague true sentence beats a precise wrong one). No prices, discount percentages, or limits that
   change. Watch for retired or renamed services; check the catalog entry (`apps/web/src/lib/cloud-data/*.ts`,
   `status`/notes fields) when in doubt.
2. **Brightpost canon.** Facts must agree with `apps/web/content/cloud/PAGE-TEMPLATES.md` §2 and with the other pages
   of your hub (team size, numbers, dates, regions: London and near Sydney, about 300 wholesale gift shops). Fix
   contradictions inside your hub; report contradictions with other hubs.
3. **Beginner clarity.** Terms defined on first use, sentences ≤ 30 words, no "simply / just / obviously", one idea per
   paragraph. Prose about 2,400–3,000 words (concept pages): trim pages over ~3,200 words of prose by cutting
   repetition, not substance. Provider pages: 600–900 words before the questions (GCP/Azure).
4. **Interview answers** follow the house style: **Short answer.** → **Why.** → optional one diagram → **Follow-ups
   the interviewer may ask.** → **Watch out for.**
5. **Diagrams.** Step numbers cited in text and answers must match the spec's real steps. `<CloudMapping>` only with
   architecture specs. Captions say what to notice.
6. **Links.** Every internal link must resolve (`npm run content-check -w web` reports broken ones).

## Render check

- `curl -s -b "tts_local_view=paid" http://localhost:5095/<path>` → 200 and no visible error note (strings in
  `apps/web/src/components/teach/props.tsx`; check rendered text, not the JS bundle).
- Screenshots: from the worktree root run
  `node /private/tmp/claude-501/-Users-dhanraj-Workspace-SYSTEM-DESIGN/8ca8ff97-8e2d-4435-9cf4-9f9c6440f4c7/scratchpad/pilot/shoot.cjs <path> <outdir> [--dark] [--phone-only|--desktop-only]`
  with outdir under `/private/tmp/claude-501/-Users-dhanraj-Workspace-SYSTEM-DESIGN/8ca8ff97-8e2d-4435-9cf4-9f9c6440f4c7/scratchpad/qa/<hub>/<slug>/`.
  It prints `pageOverflowX` and page errors. Shoot every page at phone width (light) and one page per hub in dark
  mode. Read the diagram images: fix overlaps, clipped labels and edges through boxes in your own specs.
- Finally `npm run content-check -w web` → 0 errors.

## Report (final message, plain text, concise)

Per page: what you changed (one line). Facts you removed or were unsure of. Contradictions with other hubs. Verify
output (content-check line, any page that was not 200 or had `pageOverflowX=true`). Anything left undone.
