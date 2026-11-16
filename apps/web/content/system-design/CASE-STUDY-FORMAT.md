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

Icons: use the drawn glyphs in `src/components/diagrams/glyphs.tsx` (48 names, listed with what each one draws in `COMPONENTS.md`; the common ones are `database`, `cache`, `queue`, `blob`, `cdn`, `load-balancer`, `phone`, `server`, `workers`, `users`, `gateway`, `dns`, `lock`, `log`, `search`, `coordinator` and `ring`). Data stores and logs use `variant: "glyph"` (big drawing, label below); services use cards. A name without a glyph falls back to a lucide icon. Sketch new diagrams first with the Excalidraw libraries in `design/excalidraw-libraries/`.

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
