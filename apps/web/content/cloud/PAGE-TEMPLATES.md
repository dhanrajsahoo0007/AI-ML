# Page template for Cloud concept pages

How to write one concept page of the Cloud section. This file is `.md`, so the site does not publish it. It covers
only what is Cloud-specific. The shared rules live in two files, and you must read them first:

- [`../system-design/PAGE-TEMPLATES.md`](../system-design/PAGE-TEMPLATES.md) §1 and §2: beginner-first rules,
  originality policy, frontmatter, `<PremiumBreak />`, the interview-question format.
- [`../system-design/COMPONENTS.md`](../system-design/COMPONENTS.md): every component and its props, the three diagram
  spec kinds, lint rules, glyphs, what an answer may contain.

Plans: `_plan/RECONCILIATION.md` (wins over the hub briefs), `_plan/0x-<hub>.md` (your page's brief), `_plan/ASSETS.md`
(reserved diagram ids). The worked example for everything below is
[`fundamentals/identity-and-access.mdx`](fundamentals/identity-and-access.mdx) with its two specs,
`assets/diagrams/animated/cloud/iam-role-chain.ts` and `sts-assume-role.ts`. Open them next to this file.

## 1. The skeleton

H2 order, exactly. Around 2,200–2,800 words including the interview answers (count the MDX body with tags stripped).

| # | H2 | What goes in it | In the pilot |
|---|---|---|---|
| 1 | `## In one sentence` | One `<KeyIdea>`. No jargon, no product name. | "Before a cloud does anything you ask, it checks two things: who is asking, and whether that caller is allowed to do exactly this." |
| 2 | `## The story` | One paragraph about Brightpost with the failure in it and real numbers, then one bridging line. | The key pasted in the code, the public repository, 730 files copied by Monday. |
| 3 | `## How it works` | Two or three plain definitions, then `### Step n: …` sub-sections, one idea each. | 9 steps; 7 of them show one step of the stepper, 1 shows the sequence spec, 1 uses a `<Compare>`. |
| 4 | `## On AWS, Google Cloud and Azure` | One sentence, `<Tabs>`, the full stepper, `<CloudMapping>`. See §4. | Five fixed bullets per cloud and one "difference that changes a design". |
| 5 | `## Try it` | One `<DecisionTree>` or one widget, then a `<Quiz>` of 3 items. | "Who is calling?" tree, 3 quiz items that reuse the story's numbers. |
| 6 | `## Trade-offs` | A `<Compare>` (or `<ProsCons>`) with numbers, then one or two sentences. | Long-lived key vs attached identity vs federation. |
| 7 | `## Common pitfalls` | 4–5 bullets: **the mistake.** why it hurts. the fix. | Wildcards "for now", shared admin user, keys in CI, no MFA on the owner, grants at the top. |
| 8 | `## How to say it in an interview` | 4–6 sentences in quotation marks, first person. | Six sentences, about 115 words. |
| 9 | `## Interview questions` | `<InterviewQuestions>` with the count and levels from your brief. See §6. | 5 questions: 1 Junior, 3 Mid, 1 Senior. |
| 10 | `## Related` | Site links only; check each path exists (outline pages are fine). | 4 cloud concept pages, 3 provider pages, 2 system-design pages. |
| 11 | `## Further reading` | 3–4 links to official documentation landing pages. A few words each, no quotes. | AWS IAM guide, Google Cloud IAM overview, Azure RBAC, Entra ID. |

Frontmatter is `title`, `description` (160 characters or fewer) and `updated`. Remove `status: outline`. Never add
`access`.

### How it works, in detail

```mdx
## How it works

Three words first. A **request** is … A **credential** is …

### Step 1: Two questions, in order

<AnimatedDiagram spec="animated/cloud/iam-role-chain" step={1} minWidth={620} caption="One full sentence that says what this step shows." />

Two short paragraphs. What the reader sees, why it is so, and the number that matters.

<PremiumBreak />

### Step 2: Who can call: people and workloads

<AnimatedDiagram spec="animated/cloud/iam-role-chain" step={2} minWidth={620} caption="The failure: …" />

<Callout tone="red" title="What breaks">
  Three or four sentences that walk the failure with the story's numbers.
</Callout>
```

- Headings are `### Step n: <idea>`. One idea per step, 80–150 words each.
- `<PremiumBreak />` goes after Step 1, on its own line with a blank line above and below. Step 1 and its figure are
  the whole free preview, so Step 1 must deliver the idea on its own.
- The failure is one step of the stepper (step 2 in the pilot). The page section that shows it carries
  `<Callout tone="red" title="What breaks">`. There is no separate "What breaks" H2.
- Page steps and diagram steps need not match one to one. A page step that needs no new picture uses a `<Compare>` or
  a numbered list (pilot Step 3), or the page's sequence spec with `stepper` (pilot Step 5).
- Define every term on first use with `<Term id="…">` or inline in the same sentence. Glossary ids are in
  `../system-design/glossary.yaml`. Do not edit the glossary; list missing terms in your report.
- Sections 1–3 are cloud-neutral: no provider or product names. Say "service identity", not the name one cloud uses.

## 2. Brightpost, the running example

Every page tells its story about the same company. Keep to this canon; add numbers your page needs, never
contradict these, and list anything new in your report so it can be added here.

> **Brightpost** is a small online shop that sells posters and greeting cards. It takes about 400 orders a day and
> about 4,000 on its biggest sale day. Two years after launch it has 90,000 customers and 6 staff, 3 of them
> engineers. It began on one rented server (the `brightpost-grows` spine in Start here grows it step by step). Its
> data: an orders database; an orders bucket that gets one export file every night (730 files after two years, with
> customer names and home addresses); an uploads bucket and a thumbnails bucket for product photos, filled by an
> image-resize worker. Since the leak on the identity page it has two accounts: the shop account, and an audit
> account that holds the log archive. **Asha** is the first developer: quick, capable, and sometimes in a hurry.
> Nobody else has a name; other people are roles (a support agent, a contractor, the finance lead).

Rules: the story has a concrete failure with numbers (files, minutes, orders lost); every later section refers back
to it; quiz items, the trade-off table and the answers reuse the same numbers.

## 3. Theory lives in system-design: link, do not re-teach

A cloud page recaps an idea that system-design already teaches in at most one short paragraph with a link, then
teaches what the managed services add: options, per-cloud differences, cost shape, failure behaviour. The pilot does
it in one sentence at the end of Step 1.

| Theory lives at | Cloud page that links to it |
|---|---|
| `/system-design/fundamentals/anatomy-of-a-request`, `http`, `tcp-udp`, `tls`, `networking` | all of `networking/*` |
| `/system-design/fundamentals/dns` | `networking/dns` |
| `/system-design/fundamentals/load-balancing-basics`, `/system-design/patterns/load-balancing` | `networking/load-balancing` |
| `/system-design/fundamentals/cdn`, `proxies` | `networking/cdn-edge-and-waf` |
| `/system-design/fundamentals/api-gateway`, `api-design`, `api-auth` | `networking/api-gateways` |
| `/system-design/fundamentals/rest`, `graphql`, `rpc`, `choosing-an-api-style` | `networking/hosting-apis`, `networking/service-to-service` |
| `/system-design/fundamentals/websockets`, `server-sent-events`, `long-polling`, `ajax-polling`, `choosing-realtime`, `push-notifications` | `networking/realtime-on-the-cloud` |
| `/system-design/fundamentals/webhooks` | `networking/webhooks-on-the-cloud` |
| `/system-design/fundamentals/availability`, `capacity-planning`, `scaling-journey` | `resilience/availability-math`, `compute/autoscaling` |
| `/system-design/fundamentals/storage-types` | `data/storage-types` |
| `/system-design/fundamentals/encryption-and-hashing`, `security`, `common-attacks`, `abuse-protection` | `resilience/encryption-and-keys`, `zero-trust`, `threat-detection` |
| `/system-design/patterns/*` (caching, queues, circuit breaker, rate limiting, …) | `data/managed-caches`, `data/streaming-and-messaging-services`, `resilience/quotas-and-retries` |
| `/system-design/databases/*` | `data/managed-relational`, `data/managed-nosql`, `start-here/databases-per-cloud` |

## 4. The "On AWS, Google Cloud and Azure" block

Order inside the section: one sentence saying the idea is the same on all three; `<Tabs title="On each cloud">` with
tabs labelled exactly `AWS`, `Google Cloud`, `Azure`; the full stepper; `<CloudMapping>`.

```mdx
<Tabs title="On each cloud">
  <Tab label="AWS">
    - **People:** …
    - **Workloads:** …
    - **Policies attach to:** …
    - **Guardrail:** …
    - **Outside callers:** …

    **The difference that changes a design.** Three or four sentences: the one mechanism that makes a design on
    this cloud differ from the other two.
  </Tab>
  …
</Tabs>

<AnimatedDiagram spec="animated/cloud/iam-role-chain" stepper minWidth={620} caption="The whole story in seven steps. The Services toggle shows each provider's name for every box." />

<CloudMapping diagram="cloud/iam-role-chain" lead="aws" />
```

- Each tab has the **same 4–5 bold labels in the same order** (the pieces of your concept), so a reader can compare
  line by line, then one paragraph that starts **The difference that changes a design.**
- The `stepper` embed lives here because a single-step figure has no Services toggle. It is the only place the reader
  can switch the picture between providers, and `<CloudMapping>` prints the same mapping as a table under it.
- State mechanisms, not version-specific features. No prices, no limits that change, no console click paths. If you
  are not sure a statement holds on all three clouds, say it inside the tab of the cloud where you are sure, or
  leave it out. Put a number that differs by cloud in the story's terms ("Brightpost's tokens last 1 hour") and say
  that real values differ.
- Provider and product names appear only here, in the Services toggle, in Further reading, and in a question that
  needs them.

## 5. Diagram specs

Specs live in `assets/diagrams/animated/cloud/<id>.ts` with `<id>.meta.yaml` (`title`, a full-sentence `alt`,
`caption`, `tags: [cloud, <hub>, <topic>]`, `created`; never `access`). Use the id reserved for your page in
`_plan/ASSETS.md`. Run `npm run assets -w web` after adding one. What the pilot settled:

**The stepper (architecture kind)**

- 5–7 steps that tell the page's story. Step 1 is the naive setup, **one step is the failure**, the rest repair it.
- **Canvas at most 800 wide.** The article column is 660 px, so a wider canvas makes 13.5 px labels unreadable.
  Go taller, not wider (the pilot is 795 × 735).
- **Three columns, steps 1–2 on the left.** On a phone the figure scrolls sideways and opens on the left 480 units.
  Put the nodes of the first steps in the left and middle columns, so the free preview and the failure are visible
  without scrolling. Embed with `minWidth={620}`.
- **Nodes never move and never disappear.** Something a later step removes (the pilot's static key) is never a node:
  put it in the label of an edge with `until`.
- **Tones by layer:** people, clients and the outside world `neutral`; network and edge `blue`; identity and security
  `red`; compute `teal`; data stores `violet`; queues, logs and governance `orange`. The attacker or failed node is
  `red` in a `neutral` zone, and refused calls are `red` dashed edges labelled with the refusal.
- **`cloud: { aws, gcp, azure }` on every node that is a managed service.** Use a catalog id only if it exists
  (`grep -rhoE 'id: "(aws|gcp|azure)-[a-z0-9-]+"' src/lib/cloud-data/`); otherwise `{ label: "…" }`. Use
  `{ id, label }` to show a shorter or more exact name than the catalog's.
- **Size nodes for the toggle.** The toggle puts the provider's name in the box and the generic label underneath.
  Allow 7.2 px per label character and 5.5 px per `sub` character after 52 px for the icon ("Role assignment" needs
  `w: 166`). The lint's estimate is looser than the real font.
- **Zone tabs sit on a zone's top-left corner.** Route vertical edges into a zone right of its tab, keep `labelAt`
  pills off tabs, and keep a node's top at least 26 units below the zone's top so the NEW ring clears the tab. A zone
  that an edge leaves through the top can use `kind: "subnet"` (inline label, no tab).
- Every edge that matters has a short verb label that fits the gap between its nodes; long labels go on vertical
  edges. One-node zones are fine. Explain the layout in a comment at the top of the spec, as the pilot does.

**The sequence spec**, when the page has a protocol or a handshake: cloud-neutral lane names of 15 characters or
fewer, 3–4 steps, clock times or counts in the labels, and no status code that differs between clouds (the pilot
says "refused: token expired", not a number).

**In the page:** `spec="animated/cloud/<id>"` everywhere; `step={n}` in How it works; `stepper` once, in the cloud
section; `highlight`, `path` or `step` inside answers. A tiny Mermaid fence is allowed only for a decision flow that
a table or list cannot carry.

## 6. Interview questions

Take the questions, levels and count from your brief. Every question is `category="Cloud"`. The answer follows the
house style in COMPONENTS.md §5, with the bold labels exactly as written:

```mdx
<InterviewQuestion question="Why are short-lived credentials safer than a long-lived key, if both can leak?" level="Mid" category="Cloud">
  **Short answer.** Two or three sentences the candidate says first.

  **Why.** The reasoning, with Brightpost's numbers (14 months is about 10,000 hours; a token lasts 1).

  <AnimatedDiagram spec="animated/cloud/iam-role-chain" step={2} caption="A static key works for whoever holds it, for as long as it exists." />

  **Follow-ups the interviewer may ask.**
  - 2–3 bullets.

  **Watch out for.** The common wrong answer and why it is wrong.
</InterviewQuestion>
```

- At least 3 of 5 answers carry a diagram; at most one per answer; always the page's own spec, never a new one.
- No `<Term>`, widget or Mermaid inside an answer (content-check fails). Define terms in words.
- Our own questions and wording. No exam questions, no exam phrasing, no vendor quiz items.
- The page is already mapped in `content/question-bank/articles.yaml`; the questions appear in the library at
  `/interviews/cloud-architecture/<hub>` without further work.

## 7. Files you may touch

| May touch | Never touch |
|---|---|
| your page's `.mdx` | `content/system-design/glossary.yaml` |
| your own specs and sidecars in `assets/diagrams/animated/cloud/` | `src/**` (except the generated registry that `npm run assets` rewrites) |
| the hub MDX: remove `status="outline"` from your card, nothing else | other pages, other pages' specs |
| `content/cloud/_index.yaml`: remove `status: outline` from your card, nothing else | `content/sections.yaml`, `question-bank/*.yaml`, this file |

The two status edits must match (content-check enforces the mirror). No git commands that write; the lead commits.

## 8. Verify before you report

```bash
# from the worktree root
npm run assets -w web
npm run content-check -w web                                   # 0 error(s), 0 warning(s)
# from apps/web
npx vitest run tests/unit/diagrams tests/unit/teach tests/unit/cloud
npx tsc --noEmit
# render checks against the running dev server (never start or stop it)
curl -s -o /dev/null -w "%{http_code}\n" -b "tts_local_view=paid" http://localhost:<port>/cloud/<hub>/<page>
curl -s -o /dev/null -w "%{http_code}\n" -b "tts_local_view=paid" http://localhost:<port>/interviews/cloud-architecture/<hub>
```

- In the paid HTML, with `<script>` blocks stripped: all 11 H2s, and none of `Unknown diagram`, `unknown glossary id`,
  `unknown node ids`, or a red `<Component>: …` note (`text-red-700`).
- The unpaid view (`tts_local_view=unpaid`) must stop after Step 1. `src/generated/premium-routes.json` is written
  when `next dev` starts, so a page that was an outline at start-up stays ungated until the server restarts.
- Look at the pictures. Screenshot the page with Playwright (script outside the repo) at 1280×900 and 390×844, light
  and dark: the full page, every stepper step, and the Services toggle on each provider. Fix overlapping or clipped
  labels, edges that cross boxes or zone tabs, nodes outside zones, provider names that overflow a box, and a step
  where nothing visibly changes.
- Reading level: no sentence over 30 words, most under 20; no "simply", "just", "obviously".
- Report: files changed, the stepper's step list, glossary terms used and missing, facts you were unsure of and how
  you handled them, new Brightpost canon, the output line of each command, and screenshot paths.
