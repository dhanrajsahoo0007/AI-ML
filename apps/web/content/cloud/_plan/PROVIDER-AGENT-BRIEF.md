# Brief for a Cloud provider-page agent (Wave 6)

Your launch prompt gives you a **GROUP** (one of compute, containers, serverless, networking, edge, storage,
databases, caching, messaging, analytics, security, observability, devops, ai-ml), its **CONCEPT SPEC**, the
**CONCEPT PAGES** to link and **NOTES**. You own exactly three pages: `apps/web/content/cloud/aws/<GROUP>.mdx`,
`apps/web/content/cloud/gcp/<GROUP>.mdx` and `apps/web/content/cloud/azure/<GROUP>.mdx`. Readers are beginners,
including teenagers, who know the idea from a concept page and now want the real service names on one cloud.

## Worktree and sharing rules

- Work ONLY in `/Users/dhanraj/Workspace/AI-ML/.claude/worktrees/cloud-curriculum` (branch `feature/cloud-curriculum`),
  app `apps/web`. A dev server runs at http://localhost:5095; never start or stop a server. Up to nine other agents
  work in this worktree at the same time; if the server does not answer, wait a few minutes and retry.
- You may edit ONLY your three MDX files. Never: hub MDX (`aws.mdx`, `gcp.mdx`, `azure.mdx`), `_index.yaml`,
  `articles.yaml` (the lead already added the rows), the glossary, `src/**`, specs, other pages.
- You create NO diagram specs. You embed the existing concept spec (and may embed other existing specs in
  `apps/web/assets/diagrams/animated/cloud/` with `step`/`highlight`/`path`).
- No git command that writes. `npm run assets -w web` is allowed. Errors in files you did not write are not yours.
- Keep each page's URL, title and card. Never set `access` in frontmatter. Do not change `status`.

## Read first

1. `apps/web/content/cloud/_plan/07-providers.md` — Rule 1 (AWS upgrade), Rule 2 (GCP/Azure rewrite), the table row
   for your group, and the three worked examples (#1 aws/networking, #2 gcp/databases, #3 azure/security).
2. `apps/web/content/cloud/_plan/RECONCILIATION.md` — it WINS over 07-providers.md:
   - `<ConceptMap spec lead>` does not exist → use `<CloudMapping diagram="cloud/<spec>" lead="aws|gcp|azure" />`.
   - The `InterviewQuestion diagram=` attribute does not exist → put the diagram inside the answer:
     `<AnimatedDiagram spec="animated/cloud/<spec>" step={n} cloud="gcp" minWidth={620} />`.
   - Answer house style: **Short answer.** → **Why.** → optional one diagram → **Follow-ups the interviewer may ask.**
     → **Watch out for.** (replaces the "bold decision + Trade-off" style in 07-providers.md).
   - `<Tabs>`, `<KeyIdea>`, `<Callout>`, `<Compare>` are available; see `apps/web/content/system-design/COMPONENTS.md`.
3. Your three current pages, your concept spec (`.ts` + `.meta.yaml`: read its steps so captions and step numbers you
   cite are right) and the concept pages you link (read their "On AWS, Google Cloud and Azure" Tabs: your pages must
   agree with them and go deeper on the one cloud, not repeat the concept).
4. One finished concept page for tone: `apps/web/content/cloud/fundamentals/identity-and-access.mdx`.
5. Catalog: `apps/web/src/lib/cloud-data/*.ts` (find your group's services per provider). Every catalog service of your
   group and provider should have a `<CloudServiceProfile id="…">` on that provider's page (Wave 1 added ~42 new
   services without profiles; their chips link to anchors that must exist). Add missing ones in the Services section.

## What each page gets

- **"The idea" section** right after the intro: two sentences in our own words, a `<Callout tone="blue" title="Learn
  the idea">` linking the concept page(s), then `<AnimatedDiagram spec="animated/cloud/<spec>" stepper cloud="<p>"
  minWidth={620} caption="…" />` and `<CloudMapping diagram="cloud/<spec>" lead="<p>" />`.
- **AWS (Rule 1):** upgrade in place; delete an inline Mermaid only if it duplicates the stepper; rewrite every
  existing answer into the house style; at least 3 questions; Related starts with the concept page.
- **GCP and Azure (Rule 2):** rewrite to stand alone at 600–900 words: problem-first intro with no AWS mention, the
  idea section, TL;DR (4 bullets), `<CloudGroupTable group lead>`, "How it fits together on <cloud>" (prose walk of the
  stepper with this cloud's names + a 3–5 row naming table), Services (profiles, each with one "Pick it when…" line),
  Common mistakes (3), Where this shows up in system design (2–3), Related (concept page, the other two providers'
  same group, `/system-design`), and exactly 3 interview questions (0–1 Junior, 2 Mid, 0–1 Senior), `category="Cloud"`.
  Delete "Coming from AWS".
- At least one answer per page carries a diagram (the concept spec at a `step`).
- Brightpost (canon in `apps/web/content/cloud/PAGE-TEMPLATES.md` §2) is the running example; reuse canon facts; no new
  incident needed. Our own words only: no vendor or course text, no prices or discount percentages, no limits that
  change. When unsure of a fact, leave it out and list it in your report.
- Sentences ≤ 30 words, terms defined on first use, no "simply / just / obviously".

## Verify (fix until clean, judging only your own files)

- Root: `npm run content-check -w web` → 0 errors.
- `curl -s -b "tts_local_view=paid" http://localhost:5095/cloud/<p>/<GROUP>` for all three → 200, no visible error note
  (check rendered text; read `apps/web/src/components/teach/props.tsx` for the error strings), the stepper present.
- Screenshots (light, desktop 1280 and phone 390) of each page's stepper and the CloudMapping table: adapt
  `/private/tmp/claude-501/-Users-dhanraj-Workspace-SYSTEM-DESIGN/8ca8ff97-8e2d-4435-9cf4-9f9c6440f4c7/scratchpad/pilot/shoot.cjs`
  into `/private/tmp/claude-501/-Users-dhanraj-Workspace-SYSTEM-DESIGN/8ca8ff97-8e2d-4435-9cf4-9f9c6440f4c7/scratchpad/providers/<GROUP>/`.
  Use `waitUntil: "load"` and a few seconds' wait (the server is busy). One shot pass plus one fix pass.

## Report (final message, plain text, concise)

Per page: word count, questions (levels), profiles added, Mermaid kept or removed. Facts you were unsure of; verify
output lines; anything left undone.
