# Components for Classic System Design pages

The single authoring reference for every MDX component, widget, diagram spec kind and glyph available to
`content/system-design/` pages, with the exact props the code accepts today. This file is `.md`, so the site does not
publish it. Use it together with:

- [`PAGE-TEMPLATES.md`](PAGE-TEMPLATES.md): page skeletons (concept, pattern, case study) and where each component goes.
- [`CASE-STUDY-FORMAT.md`](CASE-STUDY-FORMAT.md): the case-study structure and its diagram conventions.
- `CURRICULUM-PLAN.md`: the plan behind all three.

Every component below is available in every docs MDX file with **no import** (registered in
`apps/web/src/lib/mdx-doc.tsx`). Write props in JSX syntax (`{[...]}`, `{{...}}`, `{123}`, `{true}`), never as YAML.

Every ` ```mdx ` example in this file is compiled and server-rendered by `tests/unit/teach/components-doc.test.ts`,
which fails on an invalid prop. When a prop changes, update the example here in the same change.

Contents:

1. [Teaching components](#1-teaching-components): KeyIdea, Term, Glossary, Compare, ProsCons, Tabs/Tab, Quiz/QuizItem,
   DecisionTree, SpotTheFlag, GuessTheLevel, WhichPrinciple, StoryBuilder, StoryMatrix, MockLoop, PrepChecklist,
   RequirementsTable, EstimateTable, Numbers, PatternUses, LearningPath
2. [Interactive widgets](#2-interactive-widgets): eleven lazy islands, at most two per page
3. [Diagrams](#3-diagrams): the `<AnimatedDiagram>` tag, sidecars, the three spec kinds, `composeSpecs`, lint rules
4. [Glyphs](#4-glyphs): the 77 drawn icons for diagram nodes and lanes
5. [Interview questions](#5-interview-questions): article blocks, library YAML, what an answer may contain
6. [Other components used on these pages](#6-other-components-used-on-these-pages): PremiumBreak, CloudOnly,
   CloudMapping, Callout

---

## 1. Teaching components

Source: `apps/web/src/components/teach/`. Props come from MDX and are checked with zod. A bad prop shows a red note in
`next dev` and fails the production build (`next build` names the component and the prop). **Schemas are strict: unknown props are errors**, so
spell prop names exactly as below.

### KeyIdea

The "In one sentence" block (green border, lightbulb). One near the top of every concept and pattern page.

- `children` (required): one or two sentences of MDX.

```mdx
<KeyIdea>A cache keeps a copy of hot data close to the reader, trading freshness for speed.</KeyIdea>
```

### Term

Inline term: a dotted-underline link to the glossary page (`<href>/glossary#<id>` of the section with `glossary: true`
in `content/sections.yaml`, today `/system-design`) with a hover/focus definition (the entry's `short` text). The
definition is shown by CSS; a small lazy island adds Esc to hide it. It closes when focus and the pointer move away.
On phones (below `sm`) it is a card fixed above the bottom edge of the screen, so it never runs off the right side.
While the glossary's section is not `on`, the term is a focusable span with the same definition and no link.

- `id` (required): an id from `content/system-design/glossary.yaml`.
- `children` (optional): text to show instead of the entry's `term`.

An unknown id is a red note in dev and fails the production build, and fails `tests/unit/teach/term-ids.test.ts` (which
scans `content/**/*.mdx` for `<Term id="...">`), so `npm test` catches it before a build.

```mdx
Every read pays some <Term id="latency" />, and a slow <Term id="p99">tail</Term> hurts pages with wide <Term id="fan-out" />.
```

Seeded ids (42): `latency`, `throughput`, `qps`, `availability`, `consistency`, `replication`, `sharding`,
`partition`, `cache`, `cdn`, `load-balancer`, `idempotent`, `quorum`, `leader`, `wal`, `index`, `transaction`,
`acid`, `isolation`, `eventual-consistency`, `fan-out`, `back-pressure`, `rate-limit`, `circuit-breaker`,
`consensus`, `hash-ring`, `bloom-filter`, `blob`, `ttl`, `sla`, `slo`, `sli`, `failover`, `hot-key`, `stale-read`,
`read-your-writes`, `p99`, `rpc`, `websocket`, `dns`, `tls`, `api-gateway`.

The glossary page is `content/system-design/glossary.mdx`, a hub with no articles (so no `_index.yaml` entry and no
categories) that renders `<Glossary />`; it shows as its own card on the section index and its own sidebar group.

#### glossary.yaml entry format

File: `apps/web/content/system-design/glossary.yaml`, a YAML list, validated by `src/lib/glossary.ts` at build time.
Quote any value that contains `: ` or starts with a quote.

| Field     | Required | Rule                                                        |
| --------- | -------- | ----------------------------------------------------------- |
| `id`      | yes      | kebab-case, unique                                          |
| `term`    | yes      | display name                                                |
| `short`   | yes      | one plain sentence, at most 160 characters (the hover text) |
| `long`    | no       | a short paragraph for the glossary page                     |
| `related` | no       | list of other existing ids (never the entry itself)         |

```yaml
- id: hot-key
  term: Hot key
  short: A single key that gets far more traffic than the rest, overloading the one shard or cache node that holds it.
  long: Fixes include caching the key closer to readers, splitting it into several sub-keys, or giving it a dedicated node.
  related: [sharding, cache]
```

### Glossary

Renders the whole glossary, sorted by term, one anchor per id (`#latency`). No props. Used by the
`/system-design/glossary` page.

```mdx
<Glossary />
```

### Compare

Comparison table. Booleans render as a green tick or red cross (with "Yes"/"No" for screen readers). The first column
is a row header and stays visible while the table scrolls sideways on phones. Always put numbers in the cells.

| Prop      | Type                    | Rule                                               |
| --------- | ----------------------- | -------------------------------------------------- |
| `columns` | `string[]`              | header row; the first one may be `""`              |
| `rows`    | `(string\|boolean)[][]` | each row has exactly `columns.length` cells        |
| `caption` | `string`, optional      | shown under the table                              |
| children  | optional                | a plain markdown table instead of `columns`/`rows` |

Give either `columns` + `rows` or a markdown table as children (with a blank line before and after it).

```mdx
<Compare
  columns={["", "Cache-aside", "Write-through"]}
  rows={[
    ["Reads after a write are fresh", false, true],
    ["Write latency", "Unchanged", "Higher"],
    ["Survives cache loss", true, true],
  ]}
  caption="Two ways to keep a cache in step with the database."
/>

<Compare caption="Same thing as a markdown table.">

|               | Cache-aside | Write-through |
| ------------- | ----------- | ------------- |
| Write latency | Unchanged   | Higher        |

</Compare>
```

### ProsCons

Two columns of short points.

- `pros` (`string[]`, at least 1)
- `cons` (`string[]`, at least 1)

```mdx
<ProsCons
  pros={["Simple to run", "Cheap reads"]}
  cons={["Stale reads for up to the TTL", "Cold start after a restart"]}
/>
```

### Tabs / Tab

Tabbed panels. Arrow keys move between tabs, Home/End jump to the ends. A lazy client island; every panel is
server-rendered (inactive ones are `hidden`).

- `Tabs.title` (optional string): small label left of the tabs, also the tablist's accessible name.
- `Tab.label` (required string, unique within its `Tabs`): the tab text.
- `Tab` children: any MDX (code fences, diagrams, prose).

```mdx
<Tabs title="Two ways to shard">
  <Tab label="By user id">Every user's data lives on one shard, so a user's reads hit one machine.</Tab>
  <Tab label="By region">Data stays near its users, but a global query fans out to every region.</Tab>
</Tabs>
```

### Quiz / QuizItem

Self-check questions with a "Show answer" toggle (plain `<details>`, no JS).

- `Quiz.title` (optional string, default `"Check yourself"`).
- `QuizItem.question` (required string).
- `QuizItem.hint` (optional string): shown under the question as "Hint: ...".
- `QuizItem` children: the answer (MDX).

```mdx
<Quiz>
  <QuizItem
    question="Why is p99 latency more useful than the average?"
    hint="Think about pages that call many services."
  >
    A page that calls 50 services waits for the slowest one, so it sees the tail far more often than the average
    suggests.
  </QuizItem>
  <QuizItem question="What does a write-ahead log protect against?">
    Losing committed writes in a crash: the change is on disk in the log before the data files are updated.
  </QuizItem>
</Quiz>
```

### DecisionTree

Interactive yes/no tree: one question at a time with Yes/No buttons, the path taken as chips (click one to go back to
it), and "Start over". A lazy client island; counts towards the two-widgets-per-page limit.

- `tree` (required): a node. A node is a question `{ q, yes, no }` or a leaf. A leaf is a string, or
  `{ answer, href? }` (`href` adds a "Read more" link).
- `title` (optional string, default `"Decision tree"`).

```mdx
<DecisionTree
  title="Cache or read replica?"
  tree={{
    q: "Do reads outnumber writes 10 to 1?",
    yes: {
      q: "Can readers see data a few seconds old?",
      yes: { answer: "Add a cache", href: "/system-design/fundamentals/caching" },
      no: "Add read replicas with read-your-writes routing",
    },
    no: "Scale the primary first",
  }}
/>
```

### SpotTheFlag

A weak interview answer, one sentence per row. The reader selects the sentences that would cost the candidate points,
then checks: every sentence is marked and explained and the picks are scored ("You caught 2 of 3 red flags, with 1
false alarm"). "Try again" clears it. A lazy client island; counts towards the two-widgets-per-page limit. Used on the
behavioral pages, where it replaces a reveal-only `Quiz` with an exercise that has a right answer.

- `prompt` (required string): the interviewer's question, shown above the answer.
- `sentences` (required, 3 to 12): `{ text, flag?, note? }[]`. `flag` marks a red flag and says why it costs points.
  `note`, on a sentence that is fine, says why; it shows when the reader flags that sentence by mistake. A sentence
  takes `flag` or `note`, not both. At least one sentence needs a `flag` and at least one must be fine.
- `title` (optional string, default `"Spot the red flags"`).

```mdx
<SpotTheFlag
  prompt="Tell me about a time you made a system faster."
  sentences={[
    {
      text: "Our company started in 2015 and the monolith has had four owners.",
      flag: "Backstory. The interviewer cannot score any of it.",
    },
    {
      text: "I profiled the checkout path and found one query doing a full table scan.",
      note: "A first-person action with a cause. This is what gets scored.",
    },
    {
      text: "We added an index and some caching.",
      flag: "'We' hides what you did, and there is no reason for the choice.",
    },
    { text: "p99 fell from 900 ms to 120 ms and the error rate stayed flat." },
  ]}
/>
```

### GuessTheLevel

Answers to one interview question, each to be matched to the level it shows. The reader picks a level for every
answer, then checks: each answer is marked, the right level is shown with the reason, and the picks are scored. A lazy
client island (shared with `WhichPrinciple`); counts towards the two-widgets-per-page limit.

- `prompt` (required string): the interviewer's question, shown above the answers.
- `levels` (required, 2 to 5 different strings): the choices, lowest first.
- `answers` (required, 1 to 5): `{ text, level, why }[]`. `level` must be one of `levels`; `why` says what in the
  answer shows that level.
- `title` (optional string, default `"Guess the level"`).

```mdx
<GuessTheLevel
  prompt="Tell me about a time you improved something."
  levels={["Mid", "Senior", "Staff"]}
  answers={[
    {
      text: "Our retries were hammering a slow dependency, so I added backoff and a retry budget to our client.",
      level: "Mid",
      why: "One person changed one component inside their own service.",
    },
    {
      text: "I wrote the retry standard, built the shared client with two teams, and moved four services onto it.",
      level: "Staff",
      why: "Several teams changed how they work because of it.",
    },
  ]}
/>
```

### WhichPrinciple

Interview questions to be matched to the principle, value or focus area each one tests. Same island and scoring as
`GuessTheLevel`; counts towards the two-widgets-per-page limit.

- `principles` (required, 2 to 8 different strings): the choices.
- `prompts` (required, 2 to 8): `{ text, principle, why }[]`. `principle` must be one of `principles`; `why` says how
  to tell.
- `title` (optional string, default `"Which principle is this?"`).
- `instruction` (optional string): the line under the title. Set it when the items are not interview questions, for
  example answers to sort into kinds. Default: "Read each question. Which one is the interviewer testing?"

```mdx
<WhichPrinciple
  principles={["Ownership", "Dive Deep", "Bias for Action"]}
  prompts={[
    {
      text: "Tell me about a problem you fixed that was not your team's.",
      principle: "Ownership",
      why: "The words 'not your team's' ask whether you act beyond your own area.",
    },
    {
      text: "Tell me about a time a metric looked fine but something was wrong.",
      principle: "Dive Deep",
      why: "It asks whether you check the detail behind a summary number.",
    },
  ]}
/>
```

### StoryBuilder, StoryMatrix and MockLoop

The Practice Lab tools (`/behavioral/practice-lab/*`). `StoryBuilder` and `MockLoop` take **no props**;
`StoryMatrix` takes `builder`, the path of the page that holds the story builder. Each is meant for a page of its own, so
an article links to the tool's page and does not embed it. All three are lazy client islands that keep the reader's
data in the browser (`src/lib/stories.ts`, `src/lib/practice.ts`) and copy it to the account when the reader is signed
in (`src/lib/practice-sync.ts`, `src/features/practice/`).

- `<StoryBuilder />`: four text boxes (situation and task, action, result, learning) with a live speaking-time
  estimate against the 15/60/15/10 budget, an "I" against "we" count, and a warning when the result has no number.
  A link such as `/behavioral/practice-lab/story-builder?for=conflict` starts a new story already ticked for that
  competency (a slug from `content/question-bank/signals.yaml`, group `Competencies`).
- `<StoryMatrix builder="/behavioral/practice-lab/story-builder" />`: the reader's stories against the signals of `signals.yaml`, one view per group. Rows with no
  story are marked as gaps.
- `<MockLoop />`: the reader picks a company and a level and gets five prompts drawn from the leadership-track
  question bank, each with the two-minute timer, the follow-ups one at a time, and a 1 to 5 rating. Only prompts are
  sent to the browser, never answers. Put it after `<PremiumBreak />` on a premium page.

```mdx
<StoryBuilder />
```

### PrepChecklist

A preparation plan the reader ticks off, with a progress bar. Ticks are kept in the browser only
(`src/lib/checklist.ts`). A lazy client island; counts towards the two-widgets-per-page limit.

- `id` (required): lowercase letters, digits and dashes. It names the list in the browser's storage, so do not change
  it after the page is published.
- `title` (required string).
- `groups` (required, 1 to 12): `{ title, items }[]`, where `items` (1 to 20) is `{ id, text, href? }[]`. Item ids
  must be different across the whole list. `href`, a site path, adds an "Open" link.

```mdx
<PrepChecklist
  id="three-day-plan"
  title="Three-day plan"
  groups={[
    {
      title: "Day 1: stories",
      items: [
        { id: "pick-stories", text: "Pick the five projects you know best." },
        {
          id: "write-two",
          text: "Write two of them in the story builder.",
          href: "/behavioral/practice-lab/story-builder",
        },
      ],
    },
    { title: "Day 2: practice", items: [{ id: "mock-one", text: "Run one mock loop out loud." }] },
  ]}
/>
```

### RequirementsTable

Case-study requirements (sections 1 and 2). Each row gets an anchor `req-<id>` (for example `#req-F1`), so prose and
diagram steps can link to it. Ids must be unique on the page.

- `kind` (required): `"functional"` or `"non-functional"`.
- `rows` for `"functional"`: `{ id, requirement, notes? }[]` (at least 1).
- `rows` for `"non-functional"`: `{ id, property, target, why? }[]` (at least 1).

```mdx
<RequirementsTable
  kind="functional"
  rows={[
    { id: "F1", requirement: "Send a message to a user or group", notes: "Groups up to 500 members" },
    { id: "F2", requirement: "See delivered and read receipts" },
  ]}
/>

<RequirementsTable
  kind="non-functional"
  rows={[
    { id: "N1", property: "Latency", target: "p99 < 200 ms", why: "Chat should feel instant" },
    { id: "N2", property: "Availability", target: "99.99%", why: "People rely on it" },
  ]}
/>

As required by [F1](#req-F1), ...
```

### EstimateTable

Back-of-the-envelope estimates (case-study section 3).

- `rows` (required, at least 1): `{ quantity, assumption, result }[]`, all strings.
- `note` (optional string): shown under the table.

```mdx
<EstimateTable
  rows={[
    { quantity: "Write QPS", assumption: "500M messages a day / 86,400 s", result: "~6k/s, peak ~30k/s" },
    { quantity: "Storage per year", assumption: "100 bytes x 500M x 365", result: "~18 TB" },
  ]}
  note="Round freely; the order of magnitude is what matters."
/>
```

### Numbers

A row of big numbers (2 columns on phones, up to 4 on wide screens).

- `items` (required, at least 1): `{ value: string | number, label: string, hint?: string }[]`.

```mdx
<Numbers
  items={[
    { value: "30k", label: "writes per second at peak", hint: "5x the average" },
    { value: "18 TB", label: "new data per year" },
    { value: "99.99%", label: "availability target" },
  ]}
/>
```

### PatternUses

Where a pattern shows up in other pages. The list is explicit for now (it is not derived from diagram specs).

- `pattern` (required string): shown as "Where <pattern> is used".
- `uses` (required, at least 1): `{ title, href, note? }[]`.

```mdx
<PatternUses
  pattern="consistent hashing"
  uses={[
    {
      title: "Design a key-value store",
      href: "/system-design/case-studies/key-value-store",
      note: "Spreads keys across nodes",
    },
    { title: "Design a distributed cache", href: "/system-design/case-studies/distributed-cache" },
  ]}
/>
```

### LearningPath

An ordered reading list with numbered steps and the total time.

- `title` (required string).
- `steps` (required, at least 1): `{ title, href, minutes? }[]`; `minutes` is a positive integer, hrefs should be
  unique.

```mdx
<LearningPath
  title="Databases in a week"
  steps={[
    { title: "Indexes", href: "/system-design/databases/indexes", minutes: 20 },
    { title: "Transactions and isolation", href: "/system-design/databases/transactions", minutes: 30 },
    { title: "Replication", href: "/system-design/databases/replication", minutes: 25 },
  ]}
/>
```

---

## 2. Interactive widgets

Source: `apps/web/src/components/teach/widgets/` (server wrappers in `index.tsx`, prop schemas in `schemas.ts`, lazy
islands registered in `src/lib/mdx-lazy-widgets.tsx`). Each loads in its own chunk (about 2.4 to 3.4 kB gzipped) and is
server-rendered with its starting state, so it shows something useful without JS. All data is deterministic.

Rules:

- **At most two widgets per page** (`DecisionTree` counts). Content-check does not enforce this yet.
- Write the tag on its own lines, with a blank line before and after it.
- Every prop is optional; leave it out to get the default. Unknown props, values out of range and values not in the
  allowed list are errors (red note in dev, a failed production build).
- Numbers as `{123}`, booleans as `{true}`, strings in quotes.
- Every widget also accepts `title` (string, 1–80 characters), which replaces its default heading.

### LatencyLadder

A log-scale ladder of latencies from an L1 cache reference (1 ns) to a round trip across a continent (150 ms).
Hovering, focusing or clicking a row compares it with the reference row ("One HDD disk seek = 100,000× main memory
reference"); each row also shows how many of that operation fit in the window. Readers can change the reference row.

| Prop        | Type   | Default       | Allowed            |
| ----------- | ------ | ------------- | ------------------ |
| `compareTo` | string | `"memory"`    | a row id (below)   |
| `highlight` | string | `"disk-seek"` | a row id (below)   |
| `windowMs`  | number | `100`         | > 0, at most 10000 |

Row ids: `l1`, `branch`, `l2`, `mutex`, `memory`, `snappy`, `mem-1mb`, `net-1kb`, `ssd-random`, `ssd-1mb`, `dc-rtt`,
`disk-1mb`, `disk-seek`, `cross-continent`.

```mdx
<LatencyLadder title="Why caches matter" compareTo="memory" highlight="ssd-random" windowMs={100} />
```

### EstimateCalculator

Back-of-the-envelope calculator. Readers edit DAU, requests per user per day, peak factor, payload size, retention and
reads per write. It shows QPS (average, peak, read and write), storage per day, per year and for the whole retention,
and read and write bandwidth, with the working for every result in a static table.

| Prop             | Type   | Default    | Allowed                         |
| ---------------- | ------ | ---------- | ------------------------------- |
| `dau`            | number | `10000000` | > 0, at most 1e10               |
| `actionsPerUser` | number | `10`       | > 0, at most 1e5                |
| `peakFactor`     | number | `3`        | 1–100                           |
| `payloadBytes`   | number | `1000`     | > 0, at most 1e10 (bytes/write) |
| `retentionDays`  | number | `1825`     | > 0, at most 36500              |
| `readWriteRatio` | number | `10`       | 0–10000 (reads per write)       |

```mdx
<EstimateCalculator
  title="Chat app estimates"
  dau={50000000}
  actionsPerUser={40}
  peakFactor={3}
  payloadBytes={200}
  retentionDays={3650}
  readWriteRatio={5}
/>
```

### NinesCalculator

Two availability targets side by side: the downtime each allows per day, week, month (30 days) and year, "X allows N×
less downtime than Y", and a note on what each level usually needs.

| Prop | Type   | Default | Allowed                                          |
| ---- | ------ | ------- | ------------------------------------------------ |
| `a`  | number | `99.9`  | `99`, `99.5`, `99.9`, `99.95`, `99.99`, `99.999` |
| `b`  | number | `99.99` | same as `a`                                      |

```mdx
<NinesCalculator a={99.9} b={99.99} />
```

### ConsistentHashRing

A hash ring with servers (squares, N virtual nodes each) and keys (dots coloured by owner). Readers add or remove a
server, undo the last change, and change the number of virtual nodes. After a change the keys that moved are circled,
counts per server are shown, and the moved count is compared with what `hash mod N` would have moved.

| Prop         | Type    | Default | Allowed |
| ------------ | ------- | ------- | ------- |
| `servers`    | integer | `3`     | 1–8     |
| `vnodes`     | integer | `3`     | 1–16    |
| `keys`       | integer | `24`    | 4–48    |
| `showModulo` | boolean | `true`  |         |

```mdx
<ConsistentHashRing servers={4} vnodes={8} keys={32} showModulo={true} />
```

### LoadBalancerSim

A fixed stream of requests from 6 clients; some are slow (solid border) and stay open for 5–9 ticks. The stream is
replayed through round robin, least connections (ties go to the server with the fewest requests so far), weighted
(smooth weighted round robin, weights editable with +/−) or IP hash. Controls: Play / Pause / Replay, Step, Reset. It
shows requests per server and, for least connections, the open requests on each server.

| Prop        | Type      | Default         | Allowed                                                           |
| ----------- | --------- | --------------- | ----------------------------------------------------------------- |
| `servers`   | integer   | `4`             | 3–6                                                               |
| `algorithm` | string    | `"round-robin"` | `"round-robin"`, `"least-connections"`, `"weighted"`, `"ip-hash"` |
| `requests`  | integer   | `20`            | 10–40                                                             |
| `weights`   | integer[] | `[3,2,1,1,1,1]` | up to 6 entries, each 1–5; missing entries use the default        |

```mdx
<LoadBalancerSim servers={3} algorithm="weighted" requests={24} weights={[3, 1, 1]} />
```

### CacheSim

Replays a request sequence through LRU, LFU or FIFO, step by step: requests coloured hit or miss, slots in eviction
order (leftmost is evicted next; LFU slots show their use count), running hits, misses and hit ratio, and a table of
the final hit ratio of all three policies on the same sequence. Readers can edit the sequence (keys separated by
spaces or commas, at most 40 used, upper-cased).

| Prop       | Type    | Default                         | Allowed                    |
| ---------- | ------- | ------------------------------- | -------------------------- |
| `policy`   | string  | `"lru"`                         | `"lru"`, `"lfu"`, `"fifo"` |
| `capacity` | integer | `4`                             | 4–8                        |
| `sequence` | string  | `"A B C D A B E A B C D E A B"` | 1–200 characters           |

```mdx
<CacheSim policy="lfu" capacity={4} sequence="A B A C A D E A F B G A B H A B" />
```

### RateLimiterSim

Four seconds of traffic (a steady stream plus a burst packed into 200 ms just before the 2 s mark) through a token
bucket, a sliding window log or a fixed window (1 s windows). A timeline shows accepted requests (top lane) and
rejected ones (bottom lane), with counts, the peak accepted in any 1 s, and a table comparing all three algorithms.
The fixed window lets about twice the limit through around the boundary.

| Prop         | Type    | Default          | Allowed                                                |
| ------------ | ------- | ---------------- | ------------------------------------------------------ |
| `algorithm`  | string  | `"token-bucket"` | `"token-bucket"`, `"sliding-window"`, `"fixed-window"` |
| `limit`      | integer | `5`              | 1–10 (requests per second, also the token refill rate) |
| `bucketSize` | integer | `5`              | 1–20 (token bucket only)                               |
| `steadyRps`  | integer | `3`              | 0–10                                                   |
| `burst`      | integer | `10`             | 0–30                                                   |

```mdx
<RateLimiterSim algorithm="fixed-window" limit={5} bucketSize={5} steadyRps={3} burst={12} />
```

### BloomFilterSim

A bit array of m bits with k hash functions. Readers add words (up to 20; there is a Clear button) and test a word,
which outlines the k bits it checks. The verdict is "definitely not in the set", "probably in the set", or "probably in
the set, but never added: a false positive". It shows n, the bits set, the expected false-positive rate
(1 − e^(−kn/m))^k and the best k.

| Prop     | Type     | Default                         | Allowed                         |
| -------- | -------- | ------------------------------- | ------------------------------- |
| `bits`   | integer  | `32`                            | 8–64, a multiple of 8 (slider)  |
| `hashes` | integer  | `3`                             | 1–6                             |
| `words`  | string[] | `["apple", "banana", "cherry"]` | up to 20 words, each 1–24 chars |

```mdx
<BloomFilterSim bits={32} hashes={3} words={["alice", "bob", "carol", "dave"]} />
```

### ReplicationLagDemo

A leader and two followers; follower 2 lags twice as much as follower 1. The clock is simulated and moves 250 ms only
when the reader presses Wait. Buttons: Write vN, Read from follower 1, Read from follower 2, Wait 250 ms, Reset. With
read-your-writes off, a read from a lagging follower returns a stale version; with it on, the read goes to the leader.

| Prop             | Type    | Default | Allowed                                    |
| ---------------- | ------- | ------- | ------------------------------------------ |
| `lagMs`          | integer | `800`   | 0–3000 (follower 1's lag; follower 2 = 2×) |
| `readYourWrites` | boolean | `false` |                                            |

```mdx
<ReplicationLagDemo lagMs={1000} readYourWrites={false} />
```

### IndexPlayground

A `users` table with 1,000 rows (`id`, `email`, `country`, `age`), always generated the same way. The reader picks a
column, types a value and turns the index on or off (`id` is always indexed). It shows the `SELECT`, rows read,
binary-search steps, matches, the plan (full scan or index seek), a 100-cell grid lighting up the rows read (10 rows
per cell) and the first 5 matches.

| Prop      | Type    | Default   | Allowed                                             |
| --------- | ------- | --------- | --------------------------------------------------- |
| `column`  | string  | `"email"` | `"id"`, `"email"`, `"country"`, `"age"`             |
| `indexed` | boolean | `false`   | starts with an index on `column` (ignored for `id`) |

```mdx
<IndexPlayground column="country" indexed={true} />
```

### QuorumPicker

Sliders for N, W and R, plus presets 3/2/2, 3/1/3, 3/3/1, 3/1/1 and 5/3/3. A row of replicas shows the write landing
on the first W replicas and the worst-case read asking the last R; replicas in both are the overlap. It shows the
verdict (whether R + W > N, and the overlap), illustrative write and read latency, how many failed replicas writes and
reads survive, and notes on the trade-offs.

| Prop | Type    | Default | Allowed          |
| ---- | ------- | ------- | ---------------- |
| `n`  | integer | `3`     | 1–7              |
| `r`  | integer | `2`     | 1–7, at most `n` |
| `w`  | integer | `2`     | 1–7, at most `n` |

```mdx
<QuorumPicker n={5} r={2} w={2} title="Can this read be stale?" />
```

---

## 3. Diagrams

Every diagram is a TypeScript spec plus a `.meta.yaml` sidecar in
`apps/web/assets/diagrams/animated/<group>/<name>.ts`. All three kinds (architecture, sequence, layout) live there and
use the same MDX tag, `<AnimatedDiagram>`, which picks the renderer from the spec's `kind` (each renderer loads lazily,
only on pages that render one, and is still server-rendered). Source: `apps/web/src/components/diagrams/`.

After adding or renaming a spec run `npm run assets -w web`; it regenerates
`src/components/diagrams/animated-specs.ts` (never hand-edit it). `npm run asset:new -w web -- diagrams/animated/<group>/<name>`
scaffolds an architecture spec; for a sequence or layout spec change the type and add `kind`. Every spec must pass
`lintSpec` (see [Lint rules](#lint-rules-lintspec)); `tests/unit/diagrams/specs.test.ts` lints every file in the
folder, so `npm test` fails on a broken spec.

The `patterns/read-with-cache`, `patterns/cache-aside-read` and `databases/hash-buckets` specs below are worked
examples of each kind, not files that exist yet; `messenger/architecture` and `databases/read-scaling` are real.

### The MDX tag

```mdx
<AnimatedDiagram
  spec="animated/patterns/cache-aside-read"
  caption="Cache-aside: read the cache, fall back to the database"
  stepper
/>
```

| Prop        | Type     | Kinds             | Meaning                                                                                                                                                                                                                          |
| ----------- | -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec`      | string   | all               | Asset ID: `"animated/<group>/<name>"`. The `diagrams/` prefix is optional.                                                                                                                                                       |
| `name`      | string   | all               | Older form of `spec`: `"<group>/<name>"`. Use one of `spec` or `name`.                                                                                                                                                           |
| `caption`   | string   | all               | Text under the figure. Also the SVG's accessible name.                                                                                                                                                                           |
| `step`      | number   | all               | Draws the diagram as it stands after build step N: elements added in step N get a green NEW ring, earlier ones are faded, later ones hidden. The header reads "Step N of M".                                                     |
| `stepper`   | boolean  | all               | Adds numbered step buttons plus "Full design". On its own, or with `step` to choose the starting step.                                                                                                                           |
| `minWidth`  | number   | all               | Minimum width in px before the figure scrolls sideways on phones. Default: 560 for every kind.                                                                                                                                   |
| `highlight` | string[] | architecture only | Node ids that stay bright; every other node and edge fades to about 0.25 opacity and the highlighted nodes get a soft pulsing ring. An edge stays bright when both its nodes are highlighted; a zone when it holds one.          |
| `path`      | string   | architecture only | Node ids joined by `>`, such as `"client>lb>cache"`. Those nodes stay bright with a ring; only the edges between consecutive ids (either direction) stay bright, drawn heavier. Combines with `highlight`, `step` and `stepper`. |
| `cloud`     | string   | architecture only | Provider the Services toggle starts on: `"aws"`, `"gcp"` or `"azure"` (default: Generic). Nodes with `cloud` refs show that provider's service from the first render; the reader can still switch. See the notes below.          |

```mdx
<AnimatedDiagram spec="animated/messenger/architecture" />
<AnimatedDiagram spec="animated/messenger/architecture" step={3} />
<AnimatedDiagram spec="animated/messenger/architecture" stepper caption="Building the chat path" />
<AnimatedDiagram spec="animated/messenger/architecture" highlight={["chat", "session"]} />
<AnimatedDiagram spec="animated/messenger/architecture" path="sender>lb>chat>session" caption="A message's route" />
<AnimatedDiagram name="databases/read-scaling" step={3} path="client>lb>app>cache" />
<AnimatedDiagram spec="animated/messenger/architecture" cloud="aws" caption="The chat path on AWS" />
```

`cloud` sets where the Services toggle (Generic / AWS / Google Cloud / Azure) starts, for provider pages that embed a
concept spec. Each node with a `cloud` ref for that provider shows the service name with the generic name underneath,
already in the server-rendered HTML. It combines with `step`, `stepper`, `highlight` and `path`; with `step` alone the
figure has no toggle and stays on that provider. `<CloudMapping>` is not affected.

How errors show up:

- Unknown diagram: production builds throw; dev prints "Unknown diagram: ...".
- Unknown ids in `highlight` or `path`: production throws; dev prints "&lt;AnimatedDiagram&gt;: highlight/path name
  unknown node ids in &lt;id&gt;: ...". Use node ids, not labels.
- `highlight` and `path` do nothing on sequence and layout specs. In a layout spec use the shape-level
  `highlight: true` instead.
- `cloud` with any value but `"aws"`, `"gcp"` or `"azure"` (lower case), on any kind of spec: production throws; dev
  shows a red note naming the value. A valid `cloud` does nothing on sequence and layout specs and on architecture
  specs whose nodes have no `cloud` refs.
- `highlight` and `path` work only on `<AnimatedDiagram>`, not on `<Figure>` or `<Diagram id>`.
- A premium sidecar (`access: premium`) renders the Pro placeholder.

### Sidecar `<name>.meta.yaml` (required for every kind)

```yaml
title: Cache-aside read
alt: The app checks the cache for user 42, gets a miss, reads the row from the database, writes it back to the cache asynchronously with a 5 minute TTL and returns 200 to the client. # required; it becomes the SVG <desc>
caption: Cache-aside read path # optional default caption
tags: [caching, system-design] # kebab-case
created: 2026-11-09 # YYYY-MM-DD
# access: premium              # optional; default free. Never set it on your own initiative.
```

### Tones and zone kinds

Tones: `blue`, `green`, `orange`, `red`, `violet`, `teal`, `neutral` (the default). Each has a stroke and a soft fill
(`--dg-<tone>`, `--dg-<tone>-soft`) that switch automatically in dark mode. Suggested: clients and edge `neutral` or
`blue`, app/compute `teal`, data stores `violet`, caches and queues `orange`, failure `red`, new or healthy `green`.

Zone `kind`:

- omitted: a dotted group with a title tab ("Clients", "Storage")
- `"region"`: a plain outline
- `"vpc"`: a solid tinted network boundary with a filled tab
- `"subnet"`: a tinted band with an inline uppercase label

Zone fields: `id`, `title`, `tone`, `kind?`, `x`, `y`, `w`, `h` (`x`,`y` is the top-left corner).

### Kind 1: architecture (`DiagramSpec`, the default; `kind` may be omitted)

Coordinates are viewBox units. A node's `x`,`y` is its **centre**. Card nodes default to 116×58 (`w`,`h` override);
text starts 52 px from the left edge when the node has an icon. `variant: "glyph"` draws a large icon with the label
below; its box is about 76 wide and reaches 62 below the centre. `icon` is a [glyph name](#4-glyphs) or any Lucide icon
name from `src/lib/icons.ts`.

Node fields: `id`, `label`, `sub?` (second line), `icon?`, `tone?`, `accent?` (solid fill, for the component the
diagram is about), `variant?: "card" | "glyph"`, `step?` (default 1), `cloud?: { aws?, gcp?, azure? }` (a catalog id
from `src/lib/cloud-catalog.ts` or `{ label, id? }`; adds the Generic/AWS/Google Cloud/Azure toggle, which the tag's
`cloud` prop can start on a provider, and feeds `<CloudMapping>`), `x`, `y`, `w?`, `h?`.

Edge fields: `from`, `to`, `label?`, `tone?`, `dashed?`, `flow?` (marching dashes), `packet?` (a dot travels along the
edge), `delay?` (seconds before the packet starts; tells a story across edges), `duration?` (seconds per trip, default
2.4), `bidirectional?`, `via?: [x, y][]` (route points), `labelAt?` (0..1, default 0.5), `step?` (default: the later
step of its two nodes), `until?` (last step that shows the edge; hidden in the full view; for an edge a later step
replaces).

Step fields: `title`, `covers?` (requirement ids the step satisfies, such as `"F1"` or `"NFR: latency"`).

Example, `assets/diagrams/animated/patterns/read-with-cache.ts`:

```ts
import type { DiagramSpec } from "@/components/diagrams/types";

// The read path before and after a cache.
const spec: DiagramSpec = {
  title: "Read path with a cache",
  width: 880,
  height: 320,
  steps: [{ title: "Clients call the API" }, { title: "Add a cache in front of the database", covers: "NFR: latency" }],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 180, h: 240 },
    { id: "app", title: "Application", tone: "teal", x: 240, y: 50, w: 200, h: 240 },
    { id: "storage", title: "Storage", tone: "violet", x: 480, y: 50, w: 380, h: 240 },
  ],
  nodes: [
    { id: "client", label: "Users", icon: "phone", x: 110, y: 170 },
    { id: "api", label: "API", sub: "stateless", icon: "server", tone: "teal", accent: true, x: 340, y: 170 },
    { id: "cache", label: "Cache", icon: "cache", tone: "orange", x: 590, y: 110, step: 2 },
    { id: "db", label: "Database", icon: "database", tone: "violet", x: 760, y: 220 },
  ],
  edges: [
    { from: "client", to: "api", label: "HTTPS", packet: true },
    { from: "api", to: "db", label: "SQL", packet: true, delay: 1, until: 1 },
    { from: "api", to: "cache", label: "GET", packet: true, delay: 1, step: 2 },
    { from: "cache", to: "db", label: "miss", dashed: true, flow: true, step: 2 },
  ],
};

export default spec;
```

A glyph node, for reference:

```ts
{ id: "resolver", label: "DNS", sub: "Route 53", icon: "dns", tone: "teal", variant: "glyph", x: 400, y: 120 }
```

#### Reusing another spec inside yours: `composeSpecs`

A pattern page's spec is also what case studies embed. Keep pattern node ids stable (`client`, `gateway`, `limiter`,
`store`, ...).

```ts
import type { DiagramSpec } from "@/components/diagrams/types";
import { composeSpecs } from "@/components/diagrams/geometry";
import limiter from "../patterns/rate-limiter";

const base: DiagramSpec = {/* title, width, height, steps, zones, nodes, edges as above */};

// The limiter's zones, nodes and edges are shifted by (dx, dy), their ids get the "rl-" prefix, and the whole part
// appears in build step 3 of the base. The base keeps its title and steps, and the canvas grows to fit.
export default composeSpecs(base, [{ spec: limiter, dx: 400, dy: 300, prefix: "rl-", step: 3 }]);
```

`parts[]` fields: `spec` (an architecture spec), `dx`, `dy`, `prefix?` (use one whenever the part's ids could clash
with yours; edges are renamed too), `step?` (puts the whole part in that build step and drops the part's `until`).
Without `step`, the part's own step numbers are kept, so they must fit the base's steps. In MDX and in edges you add
yourself, refer to the part's nodes by their prefixed ids (`"rl-gate"`).

### Kind 2: sequence (`SequenceSpec`)

Lanes are equal columns across `width`. Without `width`, each lane gets 180 plus 40 for margins; lanes need at least
120 each. Every lane draws a header box (icon and label, at most 150 wide) and a dashed lifeline. Messages are
horizontal arrows. Rows run top to bottom in `at` order (default: array index; ties keep array order). Notes come after
every message unless they set `at`; a fractional `at` such as 5.5 places a note between rows. Each row is 46 units
tall and the height is computed for you. Rows keep their place in every step view, so stepping never shifts arrows.

Lane fields: `id`, `label`, `icon?`, `tone?`.

Message fields: `from`, `to`, `label?`, `kind?`, `step?` (default 1), `delay?`, `duration?` (seconds for one
crossing, default 1.2), `at?`. A message with `from === to` draws a small self-loop.

Message `kind`:

- `"call"` (default): a solid blue arrow
- `"return"`: a dashed neutral arrow with muted label text
- `"async"`: a dashed blue arrow
- `"timeout"`: a solid red arrow with a red tinted bar and the word TIMEOUT
- `"note"`: an orange box spanning `from`..`to`; if `from` equals `to`, the box sits next to the lane

Note fields: `lane`, `text`, `step?`, `at?`. The note box hangs right of the lane, or left of it at the canvas edge.

Animation: one packet crosses each arrow in turn, in row order, and the sequence loops. `delay` adds a pause before a
message, after the previous one arrives. In a step view only that step's new messages animate; earlier rows are faded
and static.

Example, `assets/diagrams/animated/patterns/cache-aside-read.ts`:

```ts
import type { SequenceSpec } from "@/components/diagrams/types";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Cache-aside read",
  lanes: [
    { id: "client", label: "Client", icon: "phone" },
    { id: "app", label: "App server", icon: "server", tone: "teal" },
    { id: "cache", label: "Cache", icon: "cache", tone: "orange" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    { from: "client", to: "app", label: "GET /users/42" },
    { from: "app", to: "cache", label: "GET user:42" },
    { from: "cache", to: "app", label: "miss", kind: "return" },
    { from: "app", to: "db", label: "SELECT ... id = 42", step: 2 },
    { from: "db", to: "app", label: "row", kind: "return", step: 2 },
    { from: "app", to: "cache", label: "SET user:42 EX 300", kind: "async", step: 2, delay: 0.3 },
    { from: "app", to: "client", label: "200 OK", kind: "return", step: 2 },
    { from: "app", to: "db", label: "SELECT (replica down)", kind: "timeout", step: 3, duration: 2 },
  ],
  notes: [{ lane: "cache", text: "TTL 5 min", step: 2, at: 5.5 }],
  steps: [
    { title: "Check the cache first" },
    { title: "On a miss, read the database and fill the cache", covers: "NFR: p99 < 50 ms" },
    { title: "When the database does not answer", covers: "Failure mode" },
  ],
};

export default spec;
```

```mdx
<AnimatedDiagram spec="animated/patterns/cache-aside-read" stepper caption="Cache-aside read, step by step" />
```

### Kind 3: layout (`LayoutSpec`)

A static drawing for data structures (B-tree pages, hash buckets, rings, log segments), revealed step by step. No
packets unless an arrow sets `packet: true`.

Shape `type`: `"box"`, `"cell"`, `"circle"`, `"text"`, `"arrow"`.

- `box`, `cell`, `text`: `x`,`y` is the **top-left** corner; text is centred in its `w`×`h` box.
- `circle`: `x`,`y` is the **centre** and `w` is the diameter.
- Default sizes: box 120×48, cell 40×40, circle 40, text 80×20.

Shape fields: `id`, `type`, `x`, `y`, `w?`, `h?`, `label?`, `sub?` (second line on a box or cell), `tone?`, `step?`
(default 1), `highlight?: true` (a pulsing ring in the shape's tone and a solid fill, for the element the paragraph is
about).

Arrow fields:

- `from`/`to`: shape ids. The line runs between the two shapes' borders and appears once both shapes are shown.
- Without `from`/`to`: the line runs from (`x`,`y`) to (`x+w`,`y+h`). With only one of them, the free point is the
  other end.
- `via?: [x, y][]`, `label?` (a pill at the midpoint), `dashed?`, `packet?`, `tone?`, `step?`.

`groups?` are dotted zones drawn like architecture zones, with the same fields and tones. A group appears once any
shape inside it does.

Example, `assets/diagrams/animated/databases/hash-buckets.ts`:

```ts
import type { LayoutSpec } from "@/components/diagrams/types";

const spec: LayoutSpec = {
  kind: "layout",
  title: "Hash index: key to bucket",
  width: 640,
  height: 240,
  groups: [{ id: "buckets", title: "Buckets", tone: "teal", x: 300, y: 40, w: 320, h: 120 }],
  shapes: [
    { id: "key", type: "box", x: 30, y: 76, w: 140, label: "user:42", sub: "key", tone: "blue" },
    { id: "b0", type: "cell", x: 320, y: 80, label: "0", tone: "teal" },
    { id: "b1", type: "cell", x: 370, y: 80, label: "1", tone: "teal" },
    { id: "b2", type: "cell", x: 420, y: 80, label: "2", tone: "teal" },
    { id: "b3", type: "cell", x: 470, y: 80, label: "3", tone: "orange", highlight: true },
    { id: "b4", type: "cell", x: 520, y: 80, label: "4", tone: "teal" },
    { id: "b5", type: "cell", x: 570, y: 80, label: "5", tone: "teal" },
    {
      id: "h",
      type: "arrow",
      x: 0,
      y: 0,
      from: "key",
      to: "b3",
      via: [[490, 200]],
      label: "hash % 6 = 3",
      tone: "blue",
      step: 2,
      packet: true,
    },
    {
      id: "cap",
      type: "text",
      x: 300,
      y: 205,
      w: 320,
      label: "Six buckets; collisions chain inside one",
      tone: "neutral",
    },
  ],
  steps: [{ title: "An empty table of six buckets" }, { title: "The key hashes to bucket 3" }],
};

export default spec;
```

```mdx
<AnimatedDiagram spec="animated/databases/hash-buckets" step={2} caption="Hashing picks the bucket" />
```

### Lint rules (`lintSpec`)

Source: `src/components/diagrams/spec-lint.ts`. It must return no problems for every spec.

All kinds:

- Ids are unique within their list: nodes, zones, lanes, shapes and groups.
- Every `step` is a positive integer no greater than `steps.length`. Without a `steps` list, everything is step 1.
- Steps are contiguous: each step 1..N introduces at least one element (for architecture specs an edge's `step` or
  `until` also counts).

Architecture:

- Every edge's `from` and `to` name existing nodes.
- `until` is at least the edge's step (its explicit `step`, or else the later step of its two nodes).
- Every node box lies inside `width`×`height`. A card is x±w/2, y±h/2; a glyph node is ±38 wide and reaches 27 up and
  62 down.
- No two node boxes overlap (touching is fine).
- Labels fit: label length × 6.2 px ≤ w − 48 with an icon, or w − 16 without; the `sub` line is length × 4.8 px with
  the same room. A default 116-wide node with an icon fits about 11 label characters, so set `w: 150` for "Session
  registry" (16 characters).
- Card height is at least 36.

Sequence:

- Every message's `from`/`to` and every note's `lane` is an existing lane; there is at least one lane.
- `duration` is greater than 0.
- Lane labels fit the header: length × 6.2 ≤ 96 with an icon (about 15 characters), or ≤ 134 without.
- Lanes are at least 120 apart, so a fixed `width` is at least 120 × lanes + 40.

Layout:

- Arrow `from`/`to` name existing shapes; an arrow without `from`/`to` needs a `w` or `h`.
- Every non-arrow shape lies inside the canvas.
- Box and cell shapes do not overlap each other (text and circles may overlap anything).
- Box and cell labels fit: length × 6.2 ≤ shape width − 8.

Before committing, check the diagram in the browser at desktop width, at 375 px, in dark mode and with reduced motion
(packets are hidden, rings and dashes stop moving).

### Mermaid

Mermaid fences are allowed only for tiny decision flows; a fence used twice moves to `assets/diagrams/mermaid/`
(content-check warns on duplicates). Never inside an interview answer.

---

## 4. Glyphs

Drawn icons for architecture nodes and sequence lanes, picked by name through the `icon` field (no import). Source:
`src/components/diagrams/glyphs.tsx` (`GLYPH_NAMES` lists them all). A name that is not a glyph falls back to a Lucide
icon from `src/lib/icons.ts`. Colour comes from the node's `tone`. Use `variant: "glyph"` for a large drawing with the
label underneath (data stores, logs), or the default `"card"` for a boxed node with the glyph on the left (services).

| Name            | Drawing                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| `database`      | Filled cylinder with two band lines and a lighter lid                               |
| `cache`         | Three stacked isometric layers, fading downwards                                    |
| `queue`         | Horizontal segmented tube with an open end                                          |
| `blob`          | Bucket with a lighter rim and a zigzag "object" mark                                |
| `cdn`           | Globe: circle with meridian ellipse and three latitude lines                        |
| `load-balancer` | Circle with one input dot fanning out to three arrows                               |
| `phone`         | Phone outline with a screen and two message pills                                   |
| `server`        | Three stacked rack units, each with a line and an LED dot                           |
| `chat`          | Two overlapping speech bubbles, the front one filled with dots                      |
| `registry`      | Clipboard-like card with a filled header and three bullet rows                      |
| `presence`      | Circle with a heartbeat line and a status dot at top right                          |
| `bell`          | Filled bell with a clapper arc and a badge circle                                   |
| `workers`       | Two meshed gears                                                                    |
| `users`         | Two people (head and shoulders), one in front                                       |
| `gateway`       | Shield with a check mark                                                            |
| `media`         | Picture frame with mountains and a sun                                              |
| `history`       | Clock face with a counter-clockwise return arrow                                    |
| `bag`           | Filled shopping bag with a handle and two lines                                     |
| `card`          | Payment card with a magnetic stripe and a chip                                      |
| `dns`           | Signpost: a pole with two opposite-pointing name boards                             |
| `lock`          | Padlock: shackle arc over a rounded body with a keyhole                             |
| `key`           | Key: round bow with a hole, diagonal shaft with two teeth                           |
| `shield`        | Shield, right half filled, with a centre seam (security or policy, no check mark)   |
| `timer`         | Stopwatch: circle with a top button, side button and a swept quarter wedge          |
| `clock`         | Clock face with four tick marks and hour and minute hands                           |
| `cpu`           | Chip: square with an inner filled die and three pins on each side                   |
| `gpu`           | Graphics card: wide board with two fans and a connector edge underneath             |
| `disk`          | Hard drive: square case with a platter, hub and read arm                            |
| `file`          | Document: page with a folded corner and three text lines                            |
| `folder`        | Folder with a tab, front panel lighter                                              |
| `log`           | Tall page of bullet rows with an append arrow at the bottom (append-only log)       |
| `search`        | Magnifying glass with a thick handle                                                |
| `tree`          | Hierarchy of boxes: one root, two children, two leaves (org chart or B-tree)        |
| `map`           | Folded three-panel map with a dashed route and a location pin                       |
| `chart`         | Axes with three rising bars and a dashed trend line                                 |
| `link`          | Two interlocking chain links                                                        |
| `globe`         | Desk globe on a stand: tilted axis, equator, meridians and two land blobs           |
| `robot`         | Robot head: antenna, two eyes, mouth bar, side ears and neck posts                  |
| `feed`          | RSS symbol (dot and two arcs) in a rounded square                                   |
| `video`         | Film frame: wide rectangle with sprocket strips and a play triangle                 |
| `ticket`        | Ticket with side notches, a dashed tear line and a stub dot                         |
| `ledger`        | Bound book: dark spine, ruled rows and a right-hand amounts column                  |
| `browser`       | Browser window: title bar with two dots and an address bar over a content block     |
| `api`           | Rounded panel with `{ }` curly braces around a dot                                  |
| `coordinator`   | Filled centre node with a check mark linked to three satellite nodes (leader)       |
| `trie`          | Branching tree of small circles; filled circles mark terminal nodes                 |
| `hash`          | Bold `#` in a rounded square                                                        |
| `ring`          | Consistent-hashing ring: five nodes on a circle (one filled) and a dashed arrow     |
| `firewall`      | Brick wall with a flame on top                                                      |
| `router`        | Rounded box with a centre dot and four arrows pointing out                          |
| `nat`           | Three source dots merging through a tall box into one outgoing arrow (many to one)  |
| `tunnel`        | Pipe with an open end between two endpoint dots, a dashed line running through it   |
| `building`      | Office block with windows, a door and a lower annex (on-premises data centre)       |
| `webhook`       | Line leaving a hollow dot, looping round and arriving back at a filled dot          |
| `image`         | Three outlined stacked layers with a filled tag (container image)                   |
| `container`     | Shipping container: wide box with filled top and bottom rails, five ribs, two feet  |
| `pod`           | Wide capsule holding two small boxes, one filled                                    |
| `node`          | Machine case with an LED strip, holding three upright capsules (two filled)         |
| `function`      | Lightning bolt in a rounded square                                                  |
| `controller`    | Two loop arrows circling a dial with a centre dot (reconcile loop)                  |
| `folder-share`  | Folder on a network line: a stem down to a filled node between two end dots         |
| `appliance`     | Rugged case with a carry handle, corner guards, two latches and a status LED        |
| `proxy`         | Tall box with a filled core between an incoming and an outgoing arrow               |
| `partition`     | Bar cut into three slices by two dashed lines, the middle slice filled              |
| `topic`         | One input dot into a filled upright bar, three arrows out                           |
| `snapshot`      | Disk platter inside four camera-frame corner marks                                  |
| `vault`         | Safe: door with a spoked dial, a handle bar, two hinges and two feet                |
| `certificate`   | Landscape document with three text lines and a round seal with ribbon tails         |
| `radar`         | Round scope with two range rings, a swept wedge and a blip                          |
| `signal`        | Rising metric line over a soft area and a baseline, ending in a dot                 |
| `trace`         | Three staggered span bars joined by elbow lines (trace waterfall), the first filled |
| `flag`          | Filled swallow-tail flag on a pole with a base                                      |
| `meter`         | Half-dial gauge with tick marks, a needle and a readout bar underneath              |
| `coin`          | Coin at an angle: face with an inner ring and a diamond mark, filled edge behind    |
| `model`         | Small neural net: two, three and two dots in layers, each layer joined to the next  |
| `policy`        | Page with three check-list rows and a filled shield over the bottom corner          |
| `pipeline`      | Three stage boxes in a row joined by small arrows, the first filled with a check    |

---

## 5. Interview questions

Answers are **MDX** in both places they come from, and the same text renders on the article page and in the library
(`/interviews` category and subsection pages, `/companies`). Sources: `src/components/mdx/interview-qa.tsx`,
`src/lib/question-answer.ts`, `src/components/mdx/question-answer.tsx`.

### 5.1 Inside an article

```mdx
<InterviewQuestions>
  <InterviewQuestion question="How does Messenger deliver a message to an online user?" level="Mid" category="Real-time" companies={["Meta"]}>
    **Short answer.** The sender's chat server looks up which chat server holds the recipient's connection and forwards the message there, which pushes it down the open WebSocket.

    **Why.** Each chat server holds about 100k connections, so a presence map (user id to server) in a cache keeps the lookup under 1 ms.

    <AnimatedDiagram name="messenger/architecture" highlight={["chat"]} caption="Chat servers hold the open connections" />

    **Follow-ups the interviewer may ask.**
    - What if the recipient is offline?
    - How do you keep message order per conversation?

    **Watch out for.** Polling the database for new messages. It does not scale past a few thousand users.

  </InterviewQuestion>
</InterviewQuestions>
```

| Prop        | Required (authoring rule) | Values                                                                  |
| ----------- | ------------------------- | ----------------------------------------------------------------------- |
| `question`  | yes                       | the question as the interviewer would ask it, in double quotes          |
| `level`     | yes                       | `"Junior"`, `"Mid"` or `"Senior"`                                       |
| `category`  | yes                       | a short topic chip label: `"Consistency"`, `"Data modeling"`, `"Cloud"` |
| `companies` | no                        | names that exist in `content/companies/companies.yaml`                  |

- `companies` takes company **names** (`"Meta"`, not `"meta"`); they become company tags on the page and in the
  library. An unknown name fails content-check.
- Indent the body by any amount: the library removes the common indentation and keeps line breaks, so lists, tables
  and code fences work. Leave a blank line between blocks.
- Order inside an answer: **Short answer.** → **Why.** → diagram (optional) → **Follow-ups the interviewer may ask.** →
  **Watch out for.** Keep the bold labels exactly as written.
- Reuse the page's own spec with `highlight` or `path`; never make a new spec for a question. At most one diagram per
  answer.
- Counts: concept page 4–8, pattern page 6–8, case study 8–10, spread across the three levels.
- The article must be listed in `content/question-bank/articles.yaml` (`/path/to/page: <category>/<subsection>`).
  System design pages file into four categories (see `question-bank/taxonomy.yaml`):
  `system-design-fundamentals/` (`fundamentals`, `networking`, `apis`, `realtime-communication`, `security`),
  `system-design-databases/` (`database-foundations`, `database-selection`, `storage-engines`, `replication`,
  `partitioning`), `system-design-patterns/` (`scaling-traffic`, `data-consistency`, `messaging-async`,
  `reliability-resilience`, `specialised-structures`) and, for case studies, `system-design-questions/` (by product
  kind, for example `messaging-realtime`).

### 5.2 In a library YAML file (`content/question-bank/<category>.yaml`)

```yaml
- id: deliver-message-online-user
  q: How does Messenger deliver a message to an online user?
  level: Mid
  category: system-design-questions
  subcategory: messaging-realtime
  topics: [/system-design/case-studies/facebook-messenger, /system-design/fundamentals/websockets]
  companies: [Meta]
  a: |-
    **Short answer.** The sender's chat server forwards the message to the server holding the recipient's WebSocket.

    | Method | Latency | Server cost |
    | --- | --- | --- |
    | Polling | seconds | high |
    | WebSocket | ms | low per message |

    <AnimatedDiagram name="messenger/architecture" highlight={["chat"]} />
  followUps:
    - q: What changes when the recipient is offline?
      level: Senior
      topics: [/system-design/patterns/message-queues]
      a: |-
        The message is stored first, then a push notification is sent through a queue.
```

- `topics` is a list of site paths. Every path must be a real page; the first one is the main topic. The question is
  shown on each of those pages under **Asked in interviews** (added by the page layout, nothing to write in the MDX).
  A question in a system design category needs at least one topic.
- `followUps` are the questions an interviewer asks next. Each has `q`, `a` and `level`, and may have `companies`,
  `topics` and `refs`. A follow-up cannot have follow-ups of its own. It takes its category and subsection from its
  question, gets the id `<question id>--<slug of its text>`, counts as a question in every total, and is drawn nested
  under its question as **Interviewers then ask**. On a topic page it is tagged to, without its question, it shows
  **Follow-up to: ...**.

Use a block scalar (`|-`) for anything longer than one line. In `taxonomy.yaml`, quote any description or title that
contains a comma (an unquoted comma ends the value in a YAML flow mapping; content-check now rejects it).

### 5.3 What an answer may contain

- Markdown: paragraphs, **bold**, _italic_, `inline code`, links, `-` and `1.` lists, blockquotes, GFM tables, fenced
  code with a language. Headings (`##`) render as bold lead-ins, not real headings.
- Math: in **article** answers `$x$` is inline and `$$x$$` is display math, as in the article. In **YAML** answers only
  `$$x$$` is math, so prices such as `$2.50/hour` stay plain text.
- Components: **only these six** (`ANSWER_COMPONENTS` in `src/lib/question-answer.ts`):
  - `<AnimatedDiagram name="..." />` or `spec="animated/..."`, with the same optional props as in articles
    (`highlight`, `path`, `caption`, `step`, `stepper`, `minWidth`). An unknown name fails the production build.
  - `<Callout title="Watch out" tone="red" icon="lightbulb">text</Callout>`: `title` required; `tone` is `blue`
    (default), `green`, `orange`, `red` or `violet`; `icon` optional.
  - `<KeyIdea>One sentence.</KeyIdea>`
  - `<Compare columns={[...]} rows={[...]} caption="..." />`, or `<Compare caption="...">` around a markdown table.
  - `<Tabs title="Two ways"><Tab label="A">...</Tab><Tab label="B">...</Tab></Tabs>`
- **Not allowed:** `Figure`, `Img`, `Mermaid`, widgets, `Term` and every other article component, and any
  ` ```mermaid ` fence. Each fails `npm run content-check -w web`, naming the file and question id.

Inside an answer these blocks lose their article margins and fit the answer column. On a premium page only the
question text and props reach a reader without access. In the library, a premium category's answer is replaced by the
"This answer is part of Pro" placeholder and is never compiled, so neither its text nor its diagram is in the unpaid
HTML or RSC payload.

---

## 6. Other components used on these pages

These existed before the curriculum work; listed here so this file is the one place to look.

### PremiumBreak

`<PremiumBreak />` marks the end of the free preview on a premium page: everything above it is shown to everyone,
everything below only to Pro readers. One per page, on its own line with a blank line above and below. Placement per
page type is in `PAGE-TEMPLATES.md` §1.6. On a free page it renders nothing.

### CloudOnly

`<CloudOnly>...</CloudOnly>` wraps content that is shown only while the Cloud section is released in the current
environment (the "Running it on AWS" section of a case study). Leave blank lines inside it around Markdown.

### CloudMapping

A table of the cloud services each node of an architecture spec maps to, from the nodes' `cloud` refs.

- `diagram` (required): the spec name in `"<group>/<name>"` form, for example `"url-shortener/architecture"`.
- `lead` (optional): `"aws"` (default), `"gcp"` or `"azure"`: the provider shown first.

```mdx
<CloudMapping diagram="messenger/architecture" lead="aws" />
```

### Callout

A boxed note.

- `title` (required string), `tone` (`blue` default, `green`, `orange`, `red`, `violet`), `icon` (optional Lucide
  name), children.

```mdx
<Callout title="Watch out" tone="orange" icon="lightbulb">
  A cache in front of a write-heavy table can make things slower: every write also has to invalidate a key.
</Callout>
```
