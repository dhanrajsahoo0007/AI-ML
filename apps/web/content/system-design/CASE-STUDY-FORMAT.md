# Case study format

Every page in `system-design/case-studies/` follows this order. `facebook-messenger.mdx` is the reference implementation
(`uber-eats.mdx` is the second). This file is `.md`, not `.mdx`, so the site does not publish it. The copy-paste MDX
skeleton, the writing rules and the question format are in `PAGE-TEMPLATES.md`; this file explains the sections and the
diagram conventions behind them.

Frontmatter: `title`, `description`. Drop `status: outline` once the page is written.

1. **Intro** — one short paragraph: what is being designed and what makes it hard.
2. **Functional requirements** — table `# | Requirement | Notes`, ids F1, F2, ...; then one line of what is out of scope. Use the `RequirementsTable` component (see `COMPONENTS.md`) instead of a raw table, so every id gets an anchor (`#req-F1`) that prose and step `covers` can link to.
3. **Non-functional requirements** — table `Property | Target | Why it matters` (latency, availability, durability, consistency, scale, cost/efficiency as relevant). Give numbers.
4. **Back-of-the-envelope estimates** — table `Quantity | Assumption | Result` (DAU, request rates, peak factor, storage per day/year with replication, bandwidth, servers needed). End with one paragraph: what the numbers imply for the design. Use `EstimateTable` for the table and `Numbers` for the two or three headline figures (see `COMPONENTS.md`); the `EstimateCalculator` widget is for readers to try their own inputs.
5. **API design** — real-time events as a table if the system has them; REST endpoints in an `http` code block. Call out idempotency keys.
6. **Database schema** — one `sql` block per store, grouped by store type (wide-column, relational, cache/ephemeral). Comment partition and clustering keys.
7. **Building the architecture, one requirement at a time** — start from the smallest design that meets F1 and add components only when a requirement forces it. One `### Step n: <title> (<requirement ids>)` per step, each with `<AnimatedDiagram name="<case-study>/architecture" step={n} />`, then: what is added, how the flow works, why this choice (the alternative and its cost), and **the gap** that motivates the next step. Tie claims back to the estimates. `<PremiumBreak />` goes right after Step 1, so the free preview shows the requirements, the estimates and the first picture.
8. **Final architecture** — `<AnimatedDiagram name="<case-study>/architecture" stepper caption="..." />` (full design with buttons to replay each step), then a `Group | Components | Responsibility` table and a numbered request walk-through.
9. **Running it on AWS** (optional, see below) — the same design on one cloud, wrapped in `<CloudOnly>`.
10. **Patterns used** — links to `/system-design/patterns/*`.
11. **Interview questions** — `<InterviewQuestions>` block; map the page in `question-bank/articles.yaml` to `distributed-systems-patterns/case-studies`. Answer format: `PAGE-TEMPLATES.md`, "Interview question format".

## Where diagram specs live

Animated diagrams are assets, not components:

- The spec is `assets/diagrams/animated/<group>/<name>.ts`, which `export default`s a `DiagramSpec` (type in
  `src/components/diagrams/types.ts`). For a case study `<group>` is the case-study slug (`messenger`, `uber-eats`)
  and `<name>` is `architecture` for the step build, `aws` for the AWS deployment.
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

## Section 8: Running it on AWS (optional)

Add this section when the case study has a clear cloud story. Everything in it is wrapped in `<CloudOnly>`, which
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

## 8. Running it on AWS

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
