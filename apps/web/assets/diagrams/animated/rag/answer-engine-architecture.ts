import type { DiagramSpec, LayoutTone } from "@/components/diagrams/types";

// The AI answer engine (genai-system-design/case-studies/ai-answer-engine), built up one requirement at a time.
// Case-study figure: zones and tones follow the "Architecture diagram groups" table in
// content/system-design/CASE-STUDY-FORMAT.md, not the RAG legend.
//
// Eight steps: 1 search, then summarise the snippets · 2 rewrite the question into several searches · 3 read the
// pages, not the snippets · 4 rank passages, keep the best ten · 5 stream the answer with numbered citations ·
// 6 cache answers by freshness · 7 screen the query, the pages and the answer · 8 log, evaluate and learn.
// Nodes never move between steps. Shortcuts that a later step replaces carry `until`: the orchestrator waits for the
// LLM's whole answer until step 4 (streaming arrives in step 5), the fetcher hands whole pages back until step 3
// (the reranker arrives in step 4), and the gateway talks to the orchestrator directly until step 6 (safety sits
// between them from step 7).
//
// The scale numbers behind the sub lines (all illustrative, derived once; the page's tables use the same ones):
// - 3 searches per question × 10 links each = 30 links, about 20 unique after de-duplication; the top 8 are fetched.
// - Page cache hit rate 60%: 8 × 0.4 = 3.2 live fetches per question.
// - 8 pages × about 2,500 tokens of main text = 20,000 tokens, cut into 250-token passages = 80 passages; the
//   reranker keeps 10 (2,500 tokens of context).
//
// Grid: five columns at x 90 | 265 | 440 | 615 | 790 (175 apart, cards 150 wide) and three rows at y 100 | 225 | 355.
//
//            c1               c2             c3               c4               c5
//   r1       User             LLM            Query planner    Search fan-out   Search API
//   r2       API gateway      Safety         Orchestrator*    Fetcher          Web pages
//   r3       Evaluation       Answer cache   ·                Reranker         Page cache
//
// Every edge is a straight line or a short diagonal through an empty gap, so nothing crosses.
//
// Zones (CASE-STUDY-FORMAT): Clients neutral, Edge blue, core request path green (the orchestrator is the accent),
// application services teal, async pipeline orange, storage violet. The public web (the search provider and the
// pages it links to) sits in a neutral "The web" zone. The two caches sit next to the service that reads them, so
// there are two small storage zones. Data stores use the glyph variant.

/** The zone table from CASE-STUDY-FORMAT.md, by group. */
const ZONE_TONE = {
  clients: "neutral",
  edge: "blue",
  core: "green",
  services: "teal",
  async: "orange",
  storage: "violet",
} as const satisfies Record<string, LayoutTone>;

/** Illustrative scale numbers, shared with the page (see the working above). */
const ANSWER_ENGINE = {
  searchesPerQuestion: 3,
  linksPerSearch: 10,
  pagesFetched: 8,
  pageCacheHitRate: 0.6,
  passages: 80,
  passagesKept: 10,
} as const;

const X = [90, 265, 440, 615, 790] as const;
const Y = [100, 225, 355] as const;
const W = 150;

/** A zone around columns c0..c1 (0-based), from top `y` to bottom `b`. */
const zone = (id: string, title: string, tone: LayoutTone, c0: number, c1: number, y: number, b: number) => ({
  id,
  title,
  tone,
  x: X[c0] - 82,
  y,
  w: X[c1] - X[c0] + 164,
  h: b - y,
});

const spec: DiagramSpec = {
  title: "AI answer engine: search, read, rank, then write with citations",
  width: 880,
  height: 450,
  steps: [
    { title: "Search, then summarise the snippets", covers: "F1" },
    { title: "Rewrite the question into several searches", covers: "F2" },
    { title: "Read the pages, not the snippets", covers: "N3" },
    { title: "Rank passages and keep the best ten", covers: "N2, N3" },
    { title: "Stream the answer with numbered citations", covers: "F3, N1" },
    { title: "Cache answers by how fast the topic changes", covers: "F4, N2" },
    { title: "Screen the query, the pages and the answer", covers: "N4" },
    { title: "Log, evaluate and learn", covers: "N3" },
  ],
  zones: [
    zone("clients", "Clients", ZONE_TONE.clients, 0, 0, 40, 145),
    zone("edge", "Edge", ZONE_TONE.edge, 0, 0, 165, 270),
    zone("async", "Async pipeline", ZONE_TONE.async, 0, 0, 290, 430),
    zone("core", "Core request path", ZONE_TONE.core, 1, 2, 40, 270),
    zone("answer-store", "Storage", ZONE_TONE.storage, 1, 1, 290, 430),
    zone("services", "App services", ZONE_TONE.services, 3, 3, 40, 430),
    zone("web", "The web", "neutral", 4, 4, 40, 270),
    zone("page-store", "Storage", ZONE_TONE.storage, 4, 4, 290, 430),
  ],
  nodes: [
    // Step 1: one search, ten snippets, one model.
    { id: "user", label: "User", sub: "asks, reads", icon: "browser", x: X[0], y: Y[0], w: W },
    {
      id: "gateway",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: ZONE_TONE.edge,
      x: X[0],
      y: Y[1],
      w: W,
    },
    {
      id: "orch",
      label: "Orchestrator",
      sub: "runs a query",
      icon: "coordinator",
      tone: ZONE_TONE.core,
      accent: true,
      x: X[2],
      y: Y[1],
      w: W,
    },
    { id: "llm", label: "LLM", sub: "writes, cites", icon: "model", tone: ZONE_TONE.core, x: X[1], y: Y[0], w: W },
    {
      id: "fanout",
      label: "Search fan-out",
      sub: "in parallel",
      icon: "load-balancer",
      tone: ZONE_TONE.services,
      x: X[3],
      y: Y[0],
      w: W + 8, // "Search fan-out" needs a little more room than the other cards
    },
    {
      id: "search",
      label: "Search API",
      sub: `${ANSWER_ENGINE.linksPerSearch} links each`,
      icon: "search",
      x: X[4],
      y: Y[0],
      w: W,
    },

    // Step 2: query understanding.
    {
      id: "planner",
      label: "Query planner",
      sub: `${ANSWER_ENGINE.searchesPerQuestion} searches`,
      icon: "tree",
      tone: ZONE_TONE.core,
      step: 2,
      x: X[2],
      y: Y[0],
      w: W,
    },

    // Step 3: fetch and parse the pages, with a cache.
    {
      id: "fetcher",
      label: "Fetcher",
      sub: "fetch, parse",
      icon: "workers",
      tone: ZONE_TONE.services,
      step: 3,
      x: X[3],
      y: Y[1],
      w: W,
    },
    {
      id: "pages",
      label: "Web pages",
      sub: `top ${ANSWER_ENGINE.pagesFetched} links`,
      icon: "globe",
      step: 3,
      x: X[4],
      y: Y[1],
      w: W,
    },
    {
      id: "pagecache",
      label: "Page cache",
      sub: `${Math.round(ANSWER_ENGINE.pageCacheHitRate * 100)}% hits`,
      icon: "cache",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      step: 3,
      x: X[4],
      y: Y[2],
    },

    // Step 4: passages ranked.
    {
      id: "reranker",
      label: "Reranker",
      sub: `${ANSWER_ENGINE.passages} → ${ANSWER_ENGINE.passagesKept}`,
      icon: "reranker",
      tone: ZONE_TONE.services,
      step: 4,
      x: X[3],
      y: Y[2],
      w: W,
    },

    // Step 6: the answer cache.
    {
      id: "answercache",
      label: "Answer cache",
      sub: "TTL by topic",
      icon: "cache",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      step: 6,
      x: X[1],
      y: Y[2],
    },

    // Step 7: safety on the way in and the way out.
    {
      id: "safety",
      label: "Safety",
      sub: "in and out",
      icon: "shield",
      tone: ZONE_TONE.core,
      step: 7,
      x: X[1],
      y: Y[1],
      w: W,
    },

    // Step 8: evaluation.
    {
      id: "eval",
      label: "Evaluation",
      sub: "traces, evals",
      icon: "trace",
      tone: ZONE_TONE.async,
      step: 8,
      x: X[0],
      y: Y[2],
      w: W,
    },
  ],
  edges: [
    // The request path, packet by packet.
    { from: "user", to: "gateway", bidirectional: true, packet: true },
    { from: "gateway", to: "orch", bidirectional: true, packet: true, delay: 0.6, until: 4 },
    { from: "gateway", to: "orch", packet: true, delay: 0.6, step: 5, until: 6 },
    { from: "gateway", to: "safety", bidirectional: true, packet: true, delay: 0.6 },
    { from: "safety", to: "orch", bidirectional: true, packet: true, delay: 1 },
    { from: "orch", to: "planner", bidirectional: true, packet: true, delay: 1.2 },
    { from: "orch", to: "fanout", bidirectional: true, packet: true, delay: 1.6 },
    { from: "fanout", to: "search", bidirectional: true, packet: true, delay: 1.8 },
    { from: "orch", to: "fetcher", bidirectional: true, packet: true, delay: 2.2, until: 3 },
    { from: "orch", to: "fetcher", packet: true, delay: 2.2, step: 4 },
    { from: "fetcher", to: "pages", bidirectional: true, packet: true, delay: 2.4 },
    { from: "fetcher", to: "pagecache", bidirectional: true },
    { from: "fetcher", to: "reranker", label: "passages", packet: true, delay: 2.8 },
    { from: "reranker", to: "orch", label: "top 10", packet: true, delay: 3.2 },
    { from: "orch", to: "llm", bidirectional: true, label: "prompt", packet: true, delay: 3.4, until: 4 },
    { from: "orch", to: "llm", label: "prompt", packet: true, delay: 3.4, step: 5 },
    { from: "llm", to: "gateway", label: "stream", labelAt: 0.35, packet: true, delay: 3.8, step: 5, until: 6 },
    { from: "llm", to: "safety", label: "stream", packet: true, delay: 3.8 },

    // Cache and evaluation.
    { from: "orch", to: "answercache", bidirectional: true },
    // Routed down the gap right of the Clients column, so it enters the evaluation card from the side, clear of the
    // zone title tab.
    {
      from: "gateway",
      to: "eval",
      dashed: true,
      via: [
        [177, 244],
        [177, Y[2]],
      ],
    },
  ],
};

export default spec;
