# Case study format

Every page in `system-design/case-studies/` follows this order. `facebook-messenger.mdx` is the reference implementation.
This file is `.md`, not `.mdx`, so the site does not publish it.

Frontmatter: `title`, `description`. Drop `status: outline` once the page is written.

1. **Intro** — one short paragraph: what is being designed and what makes it hard.
2. **Functional requirements** — table `# | Requirement | Notes`, ids F1, F2, ...; then one line of what is out of scope.
3. **Non-functional requirements** — table `Property | Target | Why it matters` (latency, availability, durability, consistency, scale, cost/efficiency as relevant). Give numbers.
4. **Back-of-the-envelope estimates** — table `Quantity | Assumption | Result` (DAU, request rates, peak factor, storage per day/year with replication, bandwidth, servers needed). End with one paragraph: what the numbers imply for the design.
5. **API design** — real-time events as a table if the system has them; REST endpoints in an `http` code block. Call out idempotency keys.
6. **Database schema** — one `sql` block per store, grouped by store type (wide-column, relational, cache/ephemeral). Comment partition and clustering keys.
7. **Building the architecture, one requirement at a time** — start from the smallest design that meets F1 and add components only when a requirement forces it. One `### Step n: <title> (<requirement ids>)` per step, each with `<AnimatedDiagram name="<case-study>/architecture" step={n} />`, then: what is added, how the flow works, why this choice (the alternative and its cost), and **the gap** that motivates the next step. Tie claims back to the estimates.
8. **Final architecture** — `<AnimatedDiagram name="<case-study>/architecture" stepper caption="..." />` (full design with buttons to replay each step), then a `Group | Components | Responsibility` table and a numbered request walk-through.
9. **Patterns used** — links to `/system-design/patterns/*`.
10. **Interview questions** — `<InterviewQuestions>` block; map the page in `question-bank/articles.yaml` to `distributed-systems-patterns/case-studies`.

## Architecture diagram groups

Diagrams live in `src/components/diagrams/specs/<case-study>/` and are registered in `specs/index.ts`. Use these zones (dotted borders) and tones so every case study reads the same:

| Zone | Tone | Typical components |
|---|---|---|
| Clients | neutral | mobile, web, third-party callers |
| Edge | blue | DNS/CDN, load balancer, API gateway |
| Real-time / core request path | green | the stateful or latency-critical servers the design is about (mark one `accent`) |
| Application services | teal | supporting stateless services |
| Async pipeline | orange | queues, workers, notifications |
| Storage | violet | databases, caches, blob stores |

Steps: list them in the spec's `steps` (`title`, `covers`). Give each node `step` (the step that introduces it; default 1); an edge defaults to the later step of its two nodes. An early shortcut that a later step replaces gets `until` (for example the chat server writing straight to the store `until: 4`, before the message bus arrives in step 5); `until` edges never show in the full diagram. Keep every node in the same position in every step so readers watch one picture fill in.

Icons: use the drawn glyphs in `src/components/diagrams/glyphs.tsx` (`database`, `cache`, `queue`, `blob`, `load-balancer`, `phone`, `chat`, `registry`, `presence`, `bell`, `workers`, `users`, `gateway`, `media`, `history`, `server`, `cdn`). Data stores and logs use `variant: "glyph"` (big drawing, label below); services use cards. Sketch new diagrams first with the Excalidraw libraries in `design/excalidraw-libraries/`.

Edges: `flow` + `packet` with increasing `delay` for the main request path; `dashed` for secondary calls; route around boxes with `via` lanes in the gaps between zones.
