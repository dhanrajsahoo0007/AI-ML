import type { DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { INDEX, RETRIEVAL, TRAFFIC } from "@/components/diagrams/presets/gcase-answer";

// The AI answer engine (genai-system-design/case-studies/ai-answer-engine), the hero. Built one requirement at a time,
// exactly as the design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/ai-answer-engine.md):
//   1 Search, then write from the snippets (F1): user → API gateway → orchestrator → search APIs → answer model.
//   2 Plan the question; look up the cache in parallel (F1, F2): query planner; the gateway looks up the answer cache
//     while the planner runs (a hit returns the whole answer, the planner is cancelled).
//   3 Read pages as spans (F1, F3): fetcher and parser (top 3 pages, 500 ms deadline), page store.
//   4 Rank spans in stages (F1, N1): ranker (prefilter, cheap scorer, 400 → 60) and the cross-encoder (60 → 12).
//   5 Cite while writing; check each sentence before showing (F3, N2, N3): sentence checks (support, copy, harm).
//   6 Escalate: multi-hop and research tiers (F2, F5): research lead and read-only subagents.
//   7 Own the head of the web (F4, N3): crawler and scheduler, indexer, span index (20B spans) feeding the ranker.
//   8 Publisher controls, screening and evaluation (F6, F7, N2, N6): host flags (to the crawler and replicated to
//     retrieval), safety screen, answer traces, evaluation.
// Numbers: RETRIEVAL.funnel (600 retrieved, 400 unique, 60 after the cheap scorer, 12 after the cross-encoder),
// INDEX.spans = 20B (2B pages × 10 spans), TRAFFIC.mix.cache = 14%; all from presets/gcase-answer.ts.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The "Search, models and checks" tab is
// 25 characters × 8.2 + 28 = 233 px wide, x 421–654 at y 316–344, so no line crosses the
// core/services boundary left of x 662. Three channels instead: the left gutter x 394 (between the edge zone and the
// middle zones), the drop at x 705 (right of the tab), and the right gutter x 756 (between the middle zones and Offline).
//   Clients x 105: user 187. Edge x 297: API gateway 187.
//   Answer orchestration, columns x 490 | 660, rows y 120 | 187 | 254 (48 tall):
//            x 490            x 660
//     120    Safety screen    Sentence checks
//     187    Orchestrator     Ranker
//     254    Query planner    Research lead
//   The orchestrator (accent) sits in the middle of the left column, so its five core links are up, down, right and the
//   two diagonals (checked: the diagonals pass between the boxes), and its left side faces the gateway.
//   Search, models and checks, columns x 490 | 660, rows y 400 | 505 | 615: answer model, search APIs, fetcher (left,
//   reached from the orchestrator down the left gutter, one trunk with three taps) | subagents (under the lead, the
//   x 705 drop), cross-encoder (the ranker's line down the right gutter), · .
//   Offline x 879: evaluation 118, indexer 360, crawler 450. Data and state x 1098 (glyphs 115 apart): answer traces
//   125, span index 240, host flags 355, page store 470, answer cache 595.
// Routing (every long edge checked against the boxes and tabs it passes):
//   - Traces go over the top: out of the orchestrator's left side, up the left gutter, along y 84 (under the zone tabs,
//     which end at y 74; above row 1, which starts at y 96), down into the trace store.
//   - The cache lookup goes along the bottom: down the empty edge column, along y 705 under every zone, up into the
//     foot of the answer cache.
//   - Span index → ranker bends at (1000, 190) and runs level at y ≈ 188 through the gap in Offline (evaluation ends at
//     140, the indexer starts at 335), 13 px above the ranker's right-gutter elbow (y 201).
//   - Fetcher → page store runs from the fetcher's right side over the empty services slot (660, 615), under Offline
//     (y ≈ 517 at x 974), into the page store's left side.
//   - Host flags → span index is a bracket on the right of the store column (x 1160), clear of both glyphs.
//   - Indexer above the crawler: crawler → indexer is a short vertical; indexer → span index leaves the indexer's top;
//     host flags → crawler passes under the indexer (y ≈ 409 at x 974).
// Colours (GENAI_TONE roles): the user orange; the answer model, research lead and subagents green; search APIs and the
// fetcher teal (tools); planner, ranker and cross-encoder lime (ranking); checks, safety screen and evaluation lime
// (check); crawler and indexer blue (data); stores violet glyphs; the gateway neutral; the orchestrator the one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 879, store: 1098 } as const;
const ROW = { c1: 120, c2: 187, c3: 254, s1: 400, s2: 505, s3: 615 } as const;
const GUTTER = { left: 394, drop: 705, right: 756, top: 84, bottom: 705, storeRight: 1160 } as const;
const W = 150;
const CH = 48;
const AW = 190;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string | undefined,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, ...(icon ? { icon } : {}), x, y, w: W, step, fill: "pastel", ...extra });

const core = (
  id: string,
  label: string,
  sub: string,
  icon: string | undefined,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => card(id, label, sub, icon, x, y, step, { h: CH, ...extra });

const store = (id: string, label: string, sub: string, icon: string, y: number, step: number): DiagramNode => ({
  id,
  label,
  sub,
  icon,
  tone: GENAI_TONE.store,
  variant: "glyph",
  x: C.store,
  y,
  step,
});

const [retrieved, unique, , cheap, cross] = RETRIEVAL.funnel;
const billions = (v: number) => `${Math.round(v / 1e9)}B`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

const spec: DiagramSpec = {
  title: "AI answer engine: plan, retrieve spans, rank in stages, check every sentence, escalate when it pays",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "Search, then write from the snippets", covers: "F1" },
    { title: "Plan the question; look up the cache in parallel", covers: "F1, F2" },
    { title: "Read pages as spans", covers: "F1, F3" },
    { title: "Rank spans in stages", covers: "F1, N1" },
    { title: "Cite while writing; check each sentence before showing", covers: "F3, N2, N3" },
    { title: "Escalate: multi-hop and research tiers", covers: "F2, F5" },
    { title: "Own the head of the web", covers: "F4, N3" },
    { title: "Publisher controls, screening and evaluation", covers: "F6, F7, N2, N6" },
  ],
  zones: genaiZones({ core: "Answer orchestration", services: "Search, models and checks" }),
  nodes: [
    // Clients and edge
    card("user", "User", "web, app", "users", C.clients, ROW.c2, 1, { tone: GENAI_TONE.user }),
    card("gateway", "API gateway", "auth, limits, SSE", "gateway", C.edge, ROW.c2, 1),

    // Answer orchestration
    core("safety", "Safety screen", "query, spans", "shield", C.left, ROW.c1, 8, { tone: GENAI_TONE.check }),
    {
      id: "orch",
      label: "Orchestrator",
      sub: "routes, streams",
      icon: "coordinator",
      accent: true,
      x: C.left,
      y: ROW.c2,
      w: W,
      h: CH,
      step: 1,
    },
    core("planner", "Query planner", "3 rewrites, route", "router", C.left, ROW.c3, 2, { tone: GENAI_TONE.rank }),
    // No icon: the full name needs the card's width.
    core("checks", "Sentence checks", "support, copy, harm", undefined, C.right, ROW.c1, 5, {
      tone: GENAI_TONE.check,
    }),
    core("ranker", "Ranker", `${unique.spans} → ${cheap.spans} spans`, "chart", C.right, ROW.c2, 4, {
      tone: GENAI_TONE.rank,
    }),
    core("lead", "Research lead", "tiers S, M, L", "coordinator", C.right, ROW.c3, 6, { tone: GENAI_TONE.model }),

    // Search, models and checks
    card("model", "Answer model", "small or mid-size", "model", C.left, ROW.s1, 1, { tone: GENAI_TONE.model }),
    card("search", "Search APIs", "two vendors", "search", C.left, ROW.s2, 1, { tone: GENAI_TONE.tool }),
    card("fetcher", "Fetcher, parser", "3 pages, 500 ms", "browser", C.left, ROW.s3, 3, { tone: GENAI_TONE.tool }),
    card("subagents", "Subagents", "search and fetch", "robot", C.right, ROW.s1, 6, { tone: GENAI_TONE.model }),
    card("crossenc", "Cross-encoder", `${cheap.spans} → ${cross.spans} spans`, "layers", C.right, ROW.s2, 4, {
      tone: GENAI_TONE.rank,
    }),

    // Offline pipelines
    card("eval", "Evaluation", "gold sets, grader, gates", "chart", C.async, 118, 8, {
      w: AW,
      h: 44,
      tone: GENAI_TONE.check,
    }),
    card("indexer", "Indexer", "dedup, spans, vectors", "pipeline", C.async, 360, 7, {
      w: AW,
      h: 50,
      tone: GENAI_TONE.data,
    }),
    card("crawler", "Crawler, scheduler", "per-URL recrawl", "globe", C.async, 450, 7, {
      w: AW,
      h: 50,
      tone: GENAI_TONE.data,
    }),

    // Data and state
    store("traces", "Answer traces", "every stage", "trace", 125, 8),
    store("index", "Span index", `${billions(INDEX.spans)} spans`, "vector-index", 240, 7),
    store("flags", "Host flags", "per-host rules", "flag", 355, 8),
    store("pages", "Page store", "raw HTML, spans", "blob", 470, 3),
    store("cache", "Answer cache", `${pct(TRAFFIC.mix.cache)} of questions`, "cache", 595, 2),
  ],
  edges: [
    // Step 1: one search, snippets in a prompt, a streamed answer.
    { from: "user", to: "gateway", flow: true, packet: true, bidirectional: true },
    { from: "gateway", to: "orch", flow: true, packet: true, bidirectional: true, delay: 0.6 },
    {
      from: "orch",
      to: "search",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 1.2,
      via: [
        [GUTTER.left, 210],
        [GUTTER.left, ROW.s2],
      ],
    },
    {
      from: "orch",
      to: "model",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 2,
      via: [
        [GUTTER.left, 210],
        [GUTTER.left, ROW.s1],
      ],
    },

    // Step 2: plan; the cache lookup runs at the gateway in parallel.
    { from: "orch", to: "planner" },
    {
      from: "gateway",
      to: "cache",
      label: "lookup in parallel; a hit ≈ 50 ms",
      labelAt: 0.45,
      bidirectional: true,
      via: [
        [C.edge, GUTTER.bottom],
        [C.store, GUTTER.bottom],
      ],
    },

    // Step 3: read the top pages as spans.
    {
      from: "orch",
      to: "fetcher",
      via: [
        [GUTTER.left, 210],
        [GUTTER.left, ROW.s3],
      ],
    },
    { from: "fetcher", to: "pages", label: "pages as spans", labelAt: 0.42, bidirectional: true },

    // Step 4: rank in stages.
    { from: "orch", to: "ranker" },
    {
      from: "ranker",
      to: "crossenc",
      bidirectional: true,
      via: [
        [GUTTER.right, 205],
        [GUTTER.right, ROW.s2],
      ],
    },

    // Step 5: every sentence checked before it is shown.
    { from: "orch", to: "checks", bidirectional: true },

    // Step 6: escalate.
    { from: "orch", to: "lead", bidirectional: true },
    {
      from: "lead",
      to: "subagents",
      label: "tasks",
      bidirectional: true,
      via: [
        [GUTTER.drop, ROW.c3 + CH / 2],
        [GUTTER.drop, ROW.s1 - 29],
      ],
    },

    // Step 7: own the head of the web.
    { from: "crawler", to: "pages", label: "raw HTML", labelAt: 0.62 },
    { from: "crawler", to: "indexer" },
    { from: "indexer", to: "index", label: "spans", labelAt: 0.55 },
    {
      from: "index",
      to: "ranker",
      label: `${retrieved.spans} spans`,
      labelAt: 0.42,
      via: [[1000, 190]],
    },

    // Step 8: publisher rules, screening, traces and evaluation.
    { from: "orch", to: "safety" },
    { from: "flags", to: "crawler", label: "robots, signals", labelAt: 0.6 },
    {
      from: "flags",
      to: "index",
      dashed: true,
      via: [
        [GUTTER.storeRight, 355],
        [GUTTER.storeRight, 240],
      ],
    },
    {
      from: "orch",
      to: "traces",
      label: "trace every answer",
      dashed: true,
      labelAt: 0.62,
      via: [
        [GUTTER.left, 165],
        [GUTTER.left, GUTTER.top],
        [C.store, GUTTER.top],
      ],
    },
    { from: "traces", to: "eval", label: "1% graded", dashed: true },
  ],
};

export default spec;
