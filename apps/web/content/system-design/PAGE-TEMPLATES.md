# Page templates for Classic System Design

Copy the skeleton for your page type, keep the H2 order exactly as written, and fill it in. This file is `.md`, not
`.mdx`, so the site does not publish it. The plan behind it is `CURRICULUM-PLAN.md` (section 4 for the templates,
section 2 for the principles, section 6.1 for the question format). Every component, widget, diagram spec kind and
glyph used here is documented, with its exact props, in [`COMPONENTS.md`](COMPONENTS.md); the names and props in these
skeletons match that file.

Three page types:

| Type | Where | Skeleton |
|---|---|---|
| Concept page | `fundamentals/`, `databases/` | section 2 |
| Pattern page | `patterns/` | section 3 |
| Case study | `case-studies/` | section 4 (details in `CASE-STUDY-FORMAT.md`) |

---

## 1. Rules that apply to every page

### 1.1 Beginner first

Readers of all ages come here, and many know only "a browser talks to a server". Every page must work for them.

1. **One-sentence definition first.** The first thing after the title is a `KeyIdea` block with one plain sentence
   that says what the thing is. No jargon in that sentence.
2. **Then a concrete story.** One paragraph the reader can picture: "You run a pizza site. On Friday night at 7 pm,
   2,000 people order at once and the page goes blank." Every later section refers back to that story.
3. **Define every term on first use.** The first time a term appears, wrap it in `<Term id="...">` so the reader gets
   the glossary definition on hover, or define it inline in the same sentence. Never assume a term is known.
4. **Short sentences.** One idea per sentence. If a sentence needs a second comma, split it.
5. **Active voice.** "The load balancer sends the request to a server", not "the request is sent to a server by the
   load balancer".
6. **Numbers, not adjectives.** "p99 under 200 ms", not "fast". "1.5 PB a year", not "a lot of data".
7. **Plain words.** No marketing language, no "simply", "just", "obviously". If a step is easy, show it; do not say it.
8. **One idea, one diagram.** A diagram exists only where it carries meaning. Animate it only when motion explains
   something (a flow, a race, a failure). Comparisons stay as tables.

### 1.2 Originality policy

This is section 2 of the plan, and it is not optional:

> **Original content.** Everything is written from first principles in our own words with our own analogies and
> numbers. No paragraphs, tables, diagrams or question lists are copied or lightly paraphrased from books, courses or
> blogs (DDIA, Grokking, ByteByteGo, SwirlAI, Alex Xu, Outcome School, etc.). Those may appear only as named entries
> under "Further reading". Diagrams are drawn in our engine; the MIT Excalidraw libraries are sketch references only.
> Each page gets a manual originality pass before merge.

What this means while writing:

- Start from the page's own story and its own numbers, then explain. Do not start from someone else's outline.
- Do not reuse a known source's section order, table columns, example system, or question list, even reworded.
- A diagram layout copied from a book or course is a copy, even when redrawn. Lay it out from the story.
- Sources go in **Further reading** as named links, nothing else.
- Before the PR: read the page once asking "would the author of X recognise this as theirs?" If yes, rewrite.

### 1.3 Frontmatter

```yaml
---
title: "Consistent hashing"            # required
description: "One line, 160 characters or fewer; used as the <meta> description."  # required
updated: 2026-11-09                     # the date you wrote or last revised the page
---
```

Remove `status: outline` when the page is written. Never add or change `access`; the owner decides what is free.

### 1.4 Diagrams

Every diagram is an asset spec in `assets/diagrams/animated/<group>/<name>.ts` with a `<name>.meta.yaml` sidecar
(`alt` is required). After adding one run `npm run assets -w web`; the registry it writes is generated and never
hand-edited. Three spec kinds:

| Kind | Use for | Example |
|---|---|---|
| `architecture` | boxes and arrows, zones, step builds | a service and its stores, a case-study build |
| `sequence` | lanes and messages over time | polling vs WebSockets, 2PC, replication lag, a handshake |
| `layout` | static drawing with highlighted cells | B-tree pages, a hash ring, log segments, byte encodings |

MDX props used in the templates:

```mdx
<AnimatedDiagram name="patterns/caching" step={1} />                         {/* one build step */}
<AnimatedDiagram name="patterns/caching" stepper caption="..." />             {/* full picture with replay buttons */}
<AnimatedDiagram name="patterns/caching" highlight={["cache", "db"]} caption="..." />   {/* dim everything except these node ids */}
<AnimatedDiagram name="patterns/caching" path="client>lb>cache" caption="..." />        {/* highlight one route */}
```

`highlight` and `path` let a paragraph or a question answer point at part of the page's diagram without a new spec.
Mermaid fences are allowed only for tiny decision flows; a fence used twice moves to `assets/diagrams/mermaid/`.

### 1.5 Widgets

Interactive widgets (`LatencyLadder`, `EstimateCalculator`, `NinesCalculator`, `ConsistentHashRing`,
`LoadBalancerSim`, `CacheSim`, `RateLimiterSim`, `BloomFilterSim`, `ReplicationLagDemo`, `IndexPlayground`,
`QuorumPicker`) and the `DecisionTree` component lazy-load. **At most two per page.** Props: `COMPONENTS.md`.

### 1.6 Where `<PremiumBreak />` goes

`<PremiumBreak />` marks the end of the free preview on a premium page. Everything above it is shown to everyone;
everything below it is shown only to Pro readers. Place it so the preview delivers the idea and the first picture:

| Page type | Position |
|---|---|
| Concept page | after step 1 of **How it works** |
| Pattern page | after **The problem** (the failing diagram), before **The pattern** |
| Case study | after **Step 1** in "Building the architecture" |

One `<PremiumBreak />` per page, on its own line with a blank line above and below. Pages with `access: free` in the
registry still carry it (it renders nothing there), so the owner can switch access later without a content edit.

---

## 2. Concept page (fundamentals, databases)

H2 order: In one sentence → The story → How it works → Try it → Trade-offs → In the wild → Common pitfalls →
How to say it in an interview → Interview questions → Related → Further reading.

```mdx
---
title: "Consistent hashing"
description: "How a ring of hash slots lets you add or remove a cache server while moving only a few keys."
updated: 2026-11-09
---

## In one sentence

<KeyIdea>
  Consistent hashing places servers and keys on the same circle, so when a server joins or leaves, only the keys next to it move.
</KeyIdea>

## The story

You run a pizza site with three <Term id="cache">cache</Term> servers. You pick a server for each key with `hash(key) % 3`. On Friday night you add a fourth server to cope with the load, and suddenly `% 4` sends almost every key to a different server. The caches are empty, every request hits the database, and the site goes blank for ten minutes.

## How it works

### Step 1: Servers and keys on one ring

<AnimatedDiagram name="patterns/consistent-hashing" step={1} />

Two to four sentences. What the reader sees in this step and why it is drawn this way.

<PremiumBreak />

### Step 2: A server joins

<AnimatedDiagram name="patterns/consistent-hashing" step={2} />

Two to four sentences. What changed, which keys moved, how many (with a number).

### Step 3: Virtual nodes

<AnimatedDiagram name="patterns/consistent-hashing" step={3} />

Two to four sentences.

## Try it

<Quiz>
  <QuizItem question="You have 4 servers and add a fifth. Roughly what share of keys moves?" hint="Think about the arc each server owns.">
    About one fifth (20%). Only the keys on the arc the new server takes over move; everything else stays put.
  </QuizItem>
  <QuizItem question="Why do we need virtual nodes?">
    With one point per server the arcs are uneven, so one server can own far more keys than another. Many points per server even the arcs out.
  </QuizItem>
</Quiz>

{/* Or one interactive widget instead of the quiz, for example <ConsistentHashRing />. Two widgets per page at most. */}

## Trade-offs

<ProsCons
  pros={[
    "Adding or removing a server moves about 1/N of the keys",
    "No central table to keep in sync",
  ]}
  cons={[
    "Uneven load without enough virtual nodes",
    "A hot key still lands on one server",
  ]}
/>

{/* Or a <Compare> table when there are several options to weigh; always with numbers. */}

## In the wild

- **Amazon DynamoDB** partitions a table across storage nodes with a hash ring.
- **Apache Cassandra** assigns token ranges to nodes with virtual nodes (256 by default).
- **Memcached clients** (such as ketama) pick the cache server with consistent hashing.

## Common pitfalls

- Using `hash % N` and calling it consistent hashing.
- Too few virtual nodes, so one server owns half the ring.
- Forgetting that a key's replicas should sit on the next distinct physical servers, not the next virtual nodes.
- Treating the ring as a fix for hot keys; it is not.

## How to say it in an interview

A 60-second answer in prose, in the first person, as the candidate would say it. Open with the one-sentence definition, give the number that matters (1/N of keys move), name the trade-off (uneven load without virtual nodes), and say where you would use it (cache tier, partitioned store).

<InterviewQuestions>
  {/* 4–8 questions across Junior / Mid / Senior; format in section 5 below */}
</InterviewQuestions>

## Related

- [Sharding and Partitioning](/system-design/patterns/sharding)
- [Caching](/system-design/patterns/caching)

## Further reading

- Named external sources only, one line each: author or site, title, what it adds.
```

Word count: 1,200–2,000. "How it works" has 2–5 steps.

---

## 3. Pattern page

Same as the concept page, with **How it works** replaced by five sections: The problem → The pattern → Variations →
Failure modes → Where it appears. The problem and the pattern use **the same spec**: step 1 is the system without the
pattern, showing the failure; step 2 adds the pattern.

H2 order: In one sentence → The story → The problem → The pattern → Variations → Failure modes → Where it appears →
Try it → Trade-offs → In the wild → Common pitfalls → How to say it in an interview → Interview questions → Related →
Further reading.

```mdx
---
title: "Rate limiting"
description: "Protect a service from too many requests with a token bucket, a sliding window or a fixed window, and know when each one lies."
updated: 2026-11-09
---

## In one sentence

<KeyIdea>
  A rate limiter counts requests per client over a time window and rejects the ones over the limit, so one noisy client cannot slow everyone else down.
</KeyIdea>

## The story

One paragraph the reader can picture, with the failure in it: a script hits your login endpoint 5,000 times a second, the database connection pool fills, and real users see timeouts.

## The problem

<AnimatedDiagram name="patterns/rate-limiting" step={1} caption="Without a limiter: one client's burst reaches the database and starves everyone." />

Two to four sentences that walk the failure. Give the numbers: how many requests, where the queue forms, what breaks first.

<PremiumBreak />

## The pattern

<AnimatedDiagram name="patterns/rate-limiting" step={2} caption="With a limiter at the gateway: over-limit requests get a 429 before they cost anything." />

What is added, how the request flows now, and why this placement. Then the worked numbers: a limit of 100 requests per minute per key with 1M keys needs how much memory in the store, and what latency the check adds.

## Variations

<Tabs>
  <Tab label="Token bucket">
    How it works in 3–5 sentences, when it fits, and a number (burst size).
  </Tab>
  <Tab label="Sliding window">
    Same shape.
  </Tab>
  <Tab label="Fixed window">
    Same shape, and the edge-of-window problem.
  </Tab>
</Tabs>

<Compare
  columns={["Algorithm", "Memory per key", "Allows bursts", "Accuracy at window edge"]}
  rows={[
    ["Token bucket", "2 numbers", "Yes, up to bucket size", "Exact"],
    ["Sliding window log", "1 timestamp per request", "No", "Exact"],
    ["Fixed window", "1 counter", "2x at the boundary", "Poor"],
  ]}
/>

## Failure modes

What breaks when the pattern itself fails, 3–5 items, each with the fix:

- **The limiter's store is down.** Fail open or fail closed? State the choice and why.
- **Clock skew between gateways.** ...
- **Hot key** (one tenant with millions of users behind one API key). ...

## Where it appears

<PatternUses
  pattern="rate limiting"
  uses={[
    { title: "Design an API gateway", href: "/system-design/case-studies/api-gateway", note: "Per-key limits at the edge" },
  ]}
/>

`PatternUses` takes an explicit list for now: one entry per case study whose diagram embeds this pattern's spec.

## Try it

<Quiz>
  <QuizItem question="..." hint="...">...</QuizItem>
</Quiz>

{/* or <RateLimiterSim /> */}

## Trade-offs

<ProsCons pros={["...", "..."]} cons={["...", "..."]} />

## In the wild

- 2–3 named systems, one line each.

## Common pitfalls

- 3–5 bullets.

## How to say it in an interview

A 60-second answer in prose.

<InterviewQuestions>
  {/* 6–8 questions; format in section 5 below */}
</InterviewQuestions>

## Related

- Links to the pattern pages and case studies this one leans on.

## Further reading

- Named sources only.
```

Word count: 1,500–2,000. The spec for a pattern is also what case studies embed, so keep node ids stable
(`client`, `gateway`, `limiter`, `store`, ...).

---

## 4. Case study

The structure is `CASE-STUDY-FORMAT.md`: requirements → NFRs → estimates → APIs → schema → step build → final →
AWS section (optional) → patterns used → questions. The two additions from the plan: `RequirementsTable` for sections
1–2 so step `covers` ids link back to rows, and `EstimateTable` in section 3.

H2 order: 1. Functional requirements → 2. Non-functional requirements → 3. Back-of-the-envelope estimates →
4. API design → 5. Database schema → 6. Building the architecture, one requirement at a time → 7. Final architecture →
8. Running it on AWS (optional, inside `<CloudOnly>`) → Patterns used → Interview questions.

````mdx
---
title: "Design a URL shortener"
description: "Short links at scale: unique ids, redirects, caching and a read-heavy store, built one requirement at a time."
updated: 2026-11-09
---

One short paragraph: what is being designed and what makes it hard.

## 1. Functional requirements

<RequirementsTable
  kind="functional"
  rows={[
    { id: "F1", requirement: "Shorten a URL", notes: "Return a short code for any valid long URL." },
    { id: "F2", requirement: "Redirect", notes: "Opening the short link sends the browser to the long URL." },
    { id: "F3", requirement: "Custom aliases", notes: "Optional; must be unique." },
    { id: "F4", requirement: "Expiry", notes: "Links can expire after a date." },
  ]}
/>

**Out of scope:** one line listing what this design does not cover.

## 2. Non-functional requirements

<RequirementsTable
  kind="non-functional"
  rows={[
    { id: "N1", property: "Latency", target: "p99 redirect under 50 ms", why: "A redirect is on the way to every page view." },
    { id: "N2", property: "Availability", target: "99.99% for redirects", why: "A dead link looks like a dead site." },
    { id: "N3", property: "Scale", target: "100:1 reads to writes", why: "Drives caching and the choice of store." },
  ]}
/>

## 3. Back-of-the-envelope estimates

Assumptions are round numbers chosen to size the system, not real figures.

<EstimateTable
  rows={[
    { quantity: "New links per day", assumption: "100 million", result: "about 1,200 writes/s" },
    { quantity: "Redirects per day", assumption: "100 x reads", result: "about 120K reads/s, 360K at peak" },
    { quantity: "Storage per link", assumption: "500 bytes", result: "50 GB/day, 18 TB/year, 55 TB with 3x replication" },
  ]}
/>

<Numbers items={[{ label: "Peak reads", value: "360K/s" }, { label: "Storage / year", value: "18 TB" }, { label: "Cache for hot 20%", value: "~4 GB" }]} />

One paragraph: what the numbers imply for the design (read-heavy, cache most of it, store is small).

## 4. API design

### REST endpoints

```http
POST /v1/links            Idempotency-Key: <uuid>
GET  /{code}              302 -> long URL
```

Call out idempotency keys. Add a real-time events table only if the system has them.

## 5. Database schema

### Links (key-value or wide-column)

```sql
-- partition key: code
CREATE TABLE links (...);
```

One `sql` block per store, grouped by store type. Comment partition and clustering keys.

## 6. Building the architecture, one requirement at a time

Start from the smallest design that meets F1 and add a component only when a requirement forces it.

### Step 1: Shorten and redirect (F1, F2)

<AnimatedDiagram name="url-shortener/architecture" step={1} />

What is added. How the flow works. Why this choice (the alternative and its cost). **The gap:** what this step cannot do yet, which motivates step 2.

<PremiumBreak />

### Step 2: Unique codes at 1,200 writes/s (F1, N3)

<AnimatedDiagram name="url-shortener/architecture" step={2} />

Same four parts: added, flow, why, gap. Tie claims to the estimates in section 3.

### Step 3: ...

{/* 3 to 8 steps in all */}

## 7. Final architecture

<AnimatedDiagram name="url-shortener/architecture" stepper caption="URL shortener: create, redirect from cache, fall back to the store. Use the numbers to replay the build." />

| Group | Components | Responsibility |
|---|---|---|
| Edge | CDN, load balancer | ... |
| Services | link service | ... |
| Storage | links store, cache | ... |

### A redirect, step by step

1. The browser requests `/abc123`.
2. ...

<CloudOnly>

## 8. Running it on AWS

One paragraph: the design above is cloud-neutral; this section picks AWS services and says why.

### Service mapping

<CloudMapping diagram="url-shortener/architecture" lead="aws" />

### The deployment, step by step

<AnimatedDiagram name="url-shortener/aws" stepper caption="URL shortener on AWS: one Region, three Availability Zones, managed services beside the VPC." />

### Key decisions

| Decision | AWS choice | Why (from the estimates) | Alternative and its cost |
|---|---|---|---|

### Storage over time

### Availability, failover and limits

### Security and operations

### On Google Cloud and Azure

| Concern | Google Cloud | Azure |
|---|---|---|

</CloudOnly>

## Patterns used

[Unique ID Generation](/system-design/patterns/unique-id-generation) · [Caching](/system-design/patterns/caching) · [Load Balancing](/system-design/patterns/load-balancing)

<InterviewQuestions>
  {/* 8–10 questions; format in section 5 below */}
</InterviewQuestions>
````

Notes:

- Section 8 needs `cloud` refs on the nodes of `architecture.ts` and a second spec `<slug>/aws.ts`; both are described
  in `CASE-STUDY-FORMAT.md`. Leave the whole `<CloudOnly>` block out if the case study has no cloud story yet.
- Map the page in `question-bank/articles.yaml` to `distributed-systems-patterns/case-studies`.
- Add the MDX file, the hub `<ModelCard>` and the `_index.yaml` card together (`add-article` skill).

---

## 5. Interview question format

Every page ends with an `<InterviewQuestions>` block. Each answer shows the reasoning and the trade-off, not only the
result, and reuses the page's diagram with `highlight` where a picture helps. This is section 6.1 of the plan.

```mdx
<InterviewQuestions>
  <InterviewQuestion question="Where would you put a cache in this system, and what would you cache?" level="Mid" category="Caching" companies={["Meta"]}>
    **Short answer.** Two sentences the candidate should say first.

    **Why.** The reasoning, with numbers.

    <AnimatedDiagram name="patterns/caching" highlight={["cache", "db"]} caption="The cache sits between the service and the database; a hit never reaches the database." />

    **Follow-ups the interviewer may ask.**
    - 2–3 bullets.

    **Watch out for.** The common wrong answer and why it is wrong.
  </InterviewQuestion>
</InterviewQuestions>
```

Props on `<InterviewQuestion>`:

| Prop | Required | Values |
|---|---|---|
| `question` | yes | the question as the interviewer would ask it |
| `level` | yes | `"Junior"`, `"Mid"` or `"Senior"` |
| `category` | yes | a short topic label such as `"Consistency"`, `"Reliability"`, `"Data modeling"`, `"Cloud"` |
| `companies` | no | array of company names that exist in `companies/companies.yaml` |

Rules:

- **Counts:** concept page 4–8, pattern page 6–8, case study 8–10. Spread across the three levels.
- **Order inside the answer:** Short answer → Why → diagram (optional) → Follow-ups → Watch out for. Keep the bold
  labels exactly as written; the library renders them.
- **Diagram in an answer:** reuse the page's spec with `highlight` or `path`; do not make a new spec for a question.
- **Components allowed inside an answer:** `AnimatedDiagram`, `Callout`, `Compare`, `KeyIdea`, `Tabs`/`Tab`, plus
  code blocks, tables and math. Anything else (including `Figure`, `Term`, widgets and mermaid fences) fails
  content-check, because the answer is also compiled for the `/interviews` library.
- Only the question text and props are visible to a reader without access on a premium page; the answer stays server-side.
- The page must be listed in `question-bank/articles.yaml` under its category and subsection.

---

## 6. Before you open the PR

1. Beginner read-through: a reader who knows only HTTP can follow every sentence; every term is defined or wrapped in `Term`.
2. Originality pass (section 1.2): no copied structure, phrasing, numbers tables or diagram layouts.
3. Diagrams: `alt` in every `.meta.yaml`; looks right at desktop and 375 px, in dark mode and with reduced motion; step `covers` ids exist on the page.
4. Questions: counts and levels as above; each in the section 5 shape; page in `articles.yaml`.
5. Nav: MDX file + hub `ModelCard` + `_index.yaml` card; `status: outline` removed.
6. Commands: `npm run content-check -w web -- --strict`, `npm run assets -w web`, `npm run mermaid -w web` (if any fence), `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run knip`, `npm test`.
7. Browser proof: screenshots in light and dark, the stepper at step 1 and full, and the preview (unpaid) view.
