# Case study format

Every page in `system-design-case-studies/case-studies/` follows this order (plan:
`SYSTEM-DESIGN/plans/case-studies-plan.md` §5). `facebook-messenger.mdx` (a converted page) and `ticketmaster.mdx` (a
page written from an outline) are the reference implementations. This file is `.md`, not `.mdx`, so the site does not
publish it. The copy-paste MDX skeleton and the writing rules are in `PAGE-TEMPLATES.md` §4. The format is enforced by
the third `describe` in `tests/unit/doc-headings.test.ts` on every page with `updated:` and no `status: outline`.

**Frontmatter:** `title`, `description` (≤ 160 characters), `logo` (an id under `assets/logos`: `systems/<slug>` or
`companies/<slug>`), `updated`. Generic systems (no brand) also set `modelledOn`: up to three logo ids shown as
"Modelled on" in the header (for example `[tech/oss/apache-kafka, tech/oss/rabbitmq]`). Drop `status: outline` once
the page is written; the hub card and `_index.yaml` lose it in the same commit.

## Sections, in order

The H2 titles are exact (the guard compares them). Every section is bullets, numbered steps or tables: no paragraphs.

| # | H2 | What goes in it |
|---|---|---|
| | (intro) | One or two sentences: what is designed and what makes it hard. One bullet: what interviewers test with it |
| 1 | `The interview question` | `<InterviewPrompt>`: the prompt in the interviewer's words, level, minutes, `bankId`, what it tests, the clarifying questions with the answers the page assumes, out of scope |
| 2 | `Overview` | 5–6 bullets: the whole design in thirty seconds; then `<Numbers>` with the 3–4 figures that drive it |
| 3 | `Functional requirements` | `<RequirementsTable kind="functional">`, ids F1…; one "Out of scope" bullet |
| 4 | `Non-functional requirements` | `<RequirementsTable kind="non-functional">`, ids N1…, every target a number |
| 5 | `Estimates and decision drivers` | `<EstimateTable>` with the arithmetic; then the decision-drivers table (below) |
| 6 | `API design` | Table of endpoints or events (who calls it, when), one `http` block; idempotency keys, pagination and error codes as bullets |
| 7 | `Data model` | The store-choice table (below), one `sql` block per store with partition and clustering keys commented, the access patterns each table serves |
| 8 | `Building the architecture, step by step` | `### Step n: <title> (<requirement ids>)`, 5–8 steps. Each: the hero at that step, then **Adds**, **Flow** (numbered), **Why this and not that**, **The gap**. `<PremiumBreak />` after Step 1 |
| 9 | `Final architecture` | The hero with `stepper`; a `Group \| Components \| Responsibility` table; a numbered walk-through of the main request |
| 9a | `Component choices and why` | One `###` per building block in the final diagram (API style, load balancer, CDN, cache, each database, message bus, blob store, push, ids…), 6 or more. Each has `- **Choice:**` (the product type, and an example with its `<TechIcon>`), `- **Why:**` with driver and requirement ids, and one `- **Why not <alternative>:**` bullet per rejected option. Real-company facts stay in "How real systems do it" |
| | `Running it on AWS` | Optional, Messenger only (new pages do not get one), inside `<CloudOnly>` |
| 10 | `Deep dives` | The three hardest problems, one `###` each with its own sequence or layout figure, then `### Worked example: …` with computed numbers |
| 11 | `Design decisions and why` | The design-decisions table (below), 7–10 rows |
| 12 | `Patterns used` | `Pattern \| Where in this design \| Why it is needed here`; each pattern links its page; advanced patterns marked "(advanced)" |
| 13 | `Same design, other systems` | `If the interviewer asks for… \| What stays the same \| What changes`, 3–5 rows |
| 14 | `How real systems do it` | 4–6 bullets of facts from primary sources, each with its year; then where this design differs from the real one and why that is fine |
| 15 | `Failure modes & pitfalls` | 5–7 bullets: what breaks, how you notice, the fix |
| 16 | `Interview framework` | A minute-by-minute plan for 45 minutes (numbered); `**What interviewers listen for:**` by level; `**Red flags:**` |
| 17 | `Further reading` | The primary sources as links; a `Related pages:` line |
| | `<InterviewQuestions>` | 8–10 questions from the real interview probes, mixed levels, at least three Senior; every answer 3–5 bullets |

Length 320–480 lines; 4–6 figures (one step-by-step hero with `stepper`, at least one sequence, at least one layout).

### The decision-drivers table

`| # | Driver | For this system | What it forces |`, the same twelve rows on every page, in this order. A driver that
does not matter still gets its row, with "Not a driver here" and one reason.

| # | Driver | The question it answers |
|---|---|---|
| D1 | Read to write ratio | Read-heavy or write-heavy, and by how much? |
| D2 | Peak against average | How bursty? What is the worst minute? |
| D3 | Consistency per operation | Which operations need strong consistency, read-your-writes, or eventual? |
| D4 | Latency target | The p99 budget on the hot path |
| D5 | Durability | Can an acknowledged write be lost? Recovery point? |
| D6 | Ordering | Does order matter, and in what scope? |
| D7 | Duplicates | Harmless, annoying or harmful? Where are they removed? |
| D8 | Data size and growth | Bytes per item, items per day, years kept, hot against cold |
| D9 | Fan-out shape | One to one, one to many, one to millions? |
| D10 | Contention | Do many writers fight over one item? |
| D11 | Geography | One region or many? Residency rules? |
| D12 | Availability and degradation | The target, and what is switched off first under stress |

### The store-choice table

`| Data | Store type | Why this store (driver ids) | Partition key | Consistency | Rejected alternative and its cost |`,
one row per kind of data. Name the store type first ("wide-column store") and an example product second, with its
mark where one exists (`<TechIcon id="oss/apache-cassandra" />`; the set is in `assets/logos/tech/oss/`).

### The design-decisions table

`| Decision | Options considered | Choice | Decided by | What we give up | Revisit when |`, 7–10 rows. "Decided by"
cites driver and requirement ids ("D1, D4, N2"). Every row is a choice another workload would flip; "use a load
balancer" is not a decision.

### Facts, sources and the question bank

- Every claim about a real company sits under "How real systems do it", with a primary source in "Further reading"
  and a year. Estimates elsewhere on the page are round numbers chosen to size the system.
- A pattern is never re-taught: two or three bullets on why it is needed here, its figure embedded by id
  (`spec="animated/patterns/<id>"`), and a link to its page.
- Map the page in `content/question-bank/articles.yaml` to its `system-design-questions/<subsection>` (plan §8 lists
  the subsection per page), and add the page path to the matching bank prompts' `topics`, so the bank's "Asked in
  interviews" block shows at the end of the page.

## Where diagram specs live

Animated diagrams are assets, not components:

- The spec is `assets/diagrams/animated/<group>/<name>.ts`, which `export default`s a `DiagramSpec` (type in
  `src/components/diagrams/types.ts`). For a case study `<group>` is the short slug (`messenger`, `uber-eats`, `ticketmaster`)
  and `<name>` is `architecture` for the step build, `aws` for the AWS deployment, and a descriptive name for the
  other figures (`seat-hold`, `waiting-room`). Shared zones and the hero frame come from
  `src/components/diagrams/presets/case-study.ts` (`ZONE`, `zoneFrame()`); sequence and layout figures use
  `PATTERN_TONE` from `presets/patterns.ts`. Blocks are pastel (`fill: "pastel"`) with glyph icons.
- Every spec has a sidecar `assets/diagrams/animated/<group>/<name>.meta.yaml` with `title`, `alt` (required: one or two
  sentences that describe the picture for a screen reader), `tags` and `created`. Schema: `src/lib/asset-schema.ts`.
- The registry `src/components/diagrams/animated-specs.ts` is **generated** by `npm run assets -w web`. Never edit it
  by hand; content-check fails when it is stale. Run the command after adding or renaming a spec.
- Scaffold both files with `npm run asset:new -w web -- diagrams/animated/<group>/<name>`.

In MDX, `<AnimatedDiagram name="<group>/<name>" step={n} />` shows build step `n`;
`<AnimatedDiagram name="<group>/<name>" stepper caption="..." />` shows the full picture with replay buttons.
`spec="animated/<group>/<name>"` is the newer spelling of the same reference; both work.

Cloud concept specs live in the `cloud` group (`assets/diagrams/animated/cloud/<name>.ts`), for example
`vpc-three-tier`, `dr-tiers`, `iam-role-chain` and `encryption-states`. A case study can embed one instead of redrawing
it: `<AnimatedDiagram name="cloud/vpc-three-tier" step={n} />` for the picture and
`<CloudMapping diagram="cloud/vpc-three-tier" />` for its service table. The reserved ids and their owner pages are
listed in `content/cloud/_plan/ASSETS.md`; a spec exists once its owner page is written.

## Architecture diagram groups

Use these zones (dotted borders) and tones so every case study reads the same:

| Zone | Tone | Typical components |
|---|---|---|
| Clients | neutral | mobile, web, third-party callers |
| Edge | blue | DNS/CDN, load balancer, API gateway |
| Real-time / core request path | green | the stateful or latency-critical servers the design is about (mark one `accent`) |
| Application services | teal | supporting stateless services |
| Async pipeline | orange | queues, workers, notifications |
| Storage | violet | databases, caches, blob stores |

Steps: list them in the spec's `steps` (`title`, `covers`). Give each node `step` (the step that introduces it; default 1); an edge defaults to the later step of its two nodes. An early shortcut that a later step replaces gets `until` (for example the chat server writing straight to the store `until: 4`, before the message bus arrives in step 5); `until` edges never show in the full diagram. Keep every node in the same position in every step so readers watch one picture fill in. Eight steps at most.

Icons: use the drawn glyphs in `src/components/diagrams/glyphs.tsx` (88 names, listed with what each one draws in `COMPONENTS.md`; the common ones are `database`, `cache`, `queue`, `blob`, `cdn`, `load-balancer`, `phone`, `server`, `workers`, `users`, `gateway`, `dns`, `lock`, `log`, `search`, `coordinator` and `ring`). Data stores and logs use `variant: "glyph"` (big drawing, label below); services use cards. A name without a glyph falls back to a lucide icon. Sketch new diagrams first with the Excalidraw libraries in `design/excalidraw-libraries/`.

Edges: `flow` + `packet` with increasing `delay` for the main request path; `dashed` for secondary calls; route around boxes with `via` lanes in the gaps between zones.

Check every diagram at desktop width, at 375 px, in dark mode and with reduced motion before committing.

## Running it on AWS (optional, Messenger only)

Messenger keeps this section; new pages do not get one (cloud deployments are a separate track). Everything in it is wrapped in `<CloudOnly>`, which
renders its children only when the Cloud section is visible in the current environment (today Cloud is `hidden` in
production, so the section is invisible there and nothing from it ships). The page must still read well without it.

Three pieces work together:

1. **`cloud` refs on nodes.** In `architecture.ts`, give each node that maps to a managed service a `cloud` field:

   ```ts
   cloud: {
     aws: { id: "aws-ecs", label: "ECS on EC2" },
     gcp: { id: "gcp-gke", label: "GKE" },
     azure: { id: "azure-aks", label: "AKS" },
   },
   // or just catalog ids when the catalog short name is the right label:
   cloud: { aws: "aws-msk", gcp: "gcp-managed-kafka", azure: "azure-event-hubs" },
   ```

   `id` is a service id from `src/lib/cloud-catalog.ts`. These refs drive the **Generic / AWS / Google Cloud / Azure**
   toggle on the animated diagram and the mapping table below.
2. **`<CloudMapping diagram="<group>/architecture" lead="aws" />`** renders a `Component | AWS | Google Cloud | Azure`
   table from those refs, with the `lead` provider in the first column. `lead` is optional and defaults to `aws`.
3. **A second spec, `<group>/aws.ts`**, draws the deployment (Region, VPC, Availability Zones, managed services) as its
   own step build, shown with `<AnimatedDiagram name="<group>/aws" stepper caption="..." />`.

Section order, as on the Messenger page:

```mdx
<CloudOnly>

## Running it on AWS

One paragraph: the design above is cloud-neutral; this section picks AWS services and says why.

### Service mapping

<CloudMapping diagram="<group>/architecture" lead="aws" />

### The deployment, step by step

<AnimatedDiagram name="<group>/aws" stepper caption="..." />

One paragraph on the network layout (zones, public vs private subnets, endpoints).

### Key decisions

| Decision | AWS choice | Why (from the estimates) | Alternative and its cost |

### Storage over time
### Availability, failover and limits
### Security and operations
### On Google Cloud and Azure

| Concern | Google Cloud | Azure |

Links to the relevant /cloud/aws/* pages.

</CloudOnly>
```

Keep the blank lines after `<CloudOnly>` and before `</CloudOnly>`; MDX needs them to parse the markdown inside.
Questions about the AWS choices go in the normal `<InterviewQuestions>` block with `category="Cloud"`; they are not
wrapped in `<CloudOnly>`.

## GenAI System Design case studies

Pages in `genai-system-design/case-studies/` follow the same format, extended for GenAI (plan:
`SYSTEM-DESIGN/plans/genai-design-plan.md` §4). All eleven pages are written to it; `customer-support-agent.mdx` and
`voice-agent-call-centre.mdx` were the pilots, and `llm-platform-gateway.mdx` is the most recent model. The fourth `describe` in
`tests/unit/doc-headings.test.ts` enforces it on every page in its `DONE` list, and content-check bans the retired
headings on every page here that carries `updated:`.

**Frontmatter:** `title` (no "Case Study:" prefix), `description` (≤ 160 characters, the same text as the hub card),
`icon`, `logo`, optional `modelledOn` (≤ 3 logo ids), `updated`.

### Sections, in order

The H2 titles are exact. Points only: bullets, numbered steps and tables. Prose only as the intro, a one-sentence
lead-in before a figure or code block, and the 2–3 sentences inside a `<StepCard>` or `<Callout>`. No bullet longer
than two sentences; no prose line over 200 characters.

| # | H2 | What goes in it |
|---|---|---|
| | (intro) | 1–2 sentences: what is designed and what makes it hard. One bullet: "Interviewers use this question to see whether…" |
| 1 | `The interview question` | `<InterviewPrompt>`: `prompt`, `level`, `minutes`, `bankId` where a bank prompt exists, `tests` (2–5), `clarify` (2–8), `outOfScope` |
| 2 | `Overview` | 5–6 bullets, `<Numbers>` with the 3–4 figures that drive the design, one `<KeyIdea>` |
| 3 | `Functional requirements` | `<RequirementsTable kind="functional">` F1…, one "Out of scope" bullet |
| 4 | `Non-functional requirements` | `<RequirementsTable kind="non-functional">` N1…, every target a number; always a quality, a latency (time to first token or per turn), a cost-per-request and a safety target |
| 5 | `Estimates and decision drivers` | `<EstimateTable>` with token and cost arithmetic; then the drivers table G1–G12 (below) |
| 6 | `API design` | Calls table, one `http` block (the streaming endpoint where there is one), tool or function schemas if the system acts, idempotency and error rules |
| 7 | `Data model` | Store-choice table (data, store type, why with driver ids, partition key, consistency, rejected alternative), one schema block per store, access patterns. A vector index, a graph, a cache and a trace store count as stores |
| 8 | `Building the architecture, step by step` | 5–8 `### Step n: <title> (<req ids>)`, from the baseline "one model call", one capability per step. Each: the hero at `step={n}`, **Adds**, **Flow** (numbered), **Why this and not that** (naming the principle it applies), **The gap**. `<PremiumBreak />` after Step 1 |
| 9 | `Final architecture` | The hero with `stepper`; `Group \| Components \| Responsibility` table; numbered walk-through of the main request |
| 10 | `Component choices and why` | ≥ 6 `###` blocks, one per building block (each model, retrieval stack, vector store, orchestration style, cache, gateway, guardrail, queue, each database): `- **Choice:**`, `- **Why:**` with G/N/F ids, one `- **Why not <alternative>:**` per rejected option |
| 11 | `Model, prompt and context design` | Context-window layout table (block, tokens, stable or changing, cached or not); model per stage with why; structured output and tool list; one context-layout figure |
| 12 | `Latency and cost budget` | Per-stage latency waterfall figure with the arithmetic; cost per request worked out; a levers table (lever, saves, costs you) |
| 13 | `Evaluation and release gates` | Offline set (size, source), metrics with targets, judge calibration, online metrics, rollout stages, the gate that blocks a release; one figure |
| 14 | `Safety and guardrails` | Threat table: threat, where it enters, control, enforced in code or in the prompt |
| 15 | `Deep dives` | The 2 hardest problems not covered above, one `###` each with its own figure, then `### Worked example: …` with computed numbers |
| 16 | `Design decisions and why` | `Decision \| Options considered \| Choice \| Decided by \| What we give up \| Revisit when`, 7–10 rows |
| 17 | `Principles and patterns used` | `### GenAI principles`: `Principle \| Where in this design \| Why it is needed here`, ≥ 5 rows, each linking `/genai-system-design/case-studies/design-principles#<anchor>` and one concept page. `### System design patterns`: the same columns, linking `/system-design/patterns/<slug>` |
| 18 | `Same design, other systems` | `If the interviewer asks for… \| What stays the same \| What changes`, 3–5 rows |
| 19 | `How real systems do it` | 4–6 sourced facts, each with its year; one bullet on where this design differs and why that is fine |
| 20 | `Failure modes & pitfalls` | 5–7 bullets: what breaks, how you notice, the fix |
| 21 | `Interview framework` | Minute-by-minute plan for 45 minutes; `**What interviewers listen for:**` by level (Mid, Senior, Staff); `**Red flags:**` |
| 22 | `Further reading` | Primary sources, then a `Related pages:` line |
| | `<InterviewQuestions>` | 10–12 questions (below) |

Length guide: 650–850 lines. Sections 11–14 are a table plus one figure each, not essays.

### Decision drivers G1–G12

`| # | Driver | For this system | What it forces |`, all twelve rows in this order. A driver that does not matter says
"Not a driver here" and one reason. Every design decision and component choice cites driver ids.

| # | Driver | The question it answers |
|---|---|---|
| G1 | Quality bar and its metric | What does "good" mean, measured how, at what target? |
| G2 | Cost of a wrong answer | Annoying, expensive, harmful or illegal? |
| G3 | Latency target | Time to first token, per turn or end to end, at p95 |
| G4 | Cost per request | The budget per answer, ticket, call or document |
| G5 | Traffic shape | Requests per second, peak against average, sessions and turns |
| G6 | Knowledge source and freshness | Where the facts come from and how stale they may be |
| G7 | Context size | Tokens in the window per request, and what fills them |
| G8 | Determinism and auditability | Must the same input give the same output, and be explained later? |
| G9 | Data sensitivity and tenancy | Personal data, regulated data, one tenant or many |
| G10 | Autonomy level | Answers only, drafts for a person, or actions on its own |
| G11 | Modalities and interface | Text, voice, images, documents; chat, phone, API |
| G12 | Availability and degradation | The target, and what is switched off first under stress |

### Figures and principles

- At least 7 `<AnimatedDiagram>` embeds: one hero stepper (`animated/<folder>/architecture`, 1200 × 740, zones from
  `genaiZones()` in `src/components/diagrams/presets/genai-case.ts`), at least one sequence and one latency waterfall
  (`waterfall` from `presets/production.ts`). No Mermaid. Reuse existing figures by id before drawing new ones.
- One spec folder per system (`support-agent`, `voice-agent`, `answer-engine`, …); page constants in
  `presets/gcase-<slug>.ts`, pinned in `tests/unit/diagrams/genai-case-presets.test.ts`.
- Role tones from `GENAI_TONE`; sequence lanes from `SEQUENCE_LANE` (section tones only).
- Principles are defined once in `src/lib/genai-principles.ts`; its test checks that the catalog's `caseStudies` and
  each page's `### GenAI principles` table agree.

### Interview questions

- 10–12 per page, at least 4 Senior and 2 Junior, categories spread across Concepts, Architecture, Scaling,
  Trade-offs, Failure modes, Evaluation and Cost. Build them from real interviewer probes, not the page's headings.
- Every answer is 3–5 bullets: the first answers the question; one uses a number from the page; one names the
  trade-off and what is given up; one says how it fails or how you would verify it. Senior questions carry
  `followUps` (1–2). No figure inside an answer.
