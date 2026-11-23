import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY as L, RETRIEVAL, TARGETS } from "@/components/diagrams/presets/gcase-answer";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// The answer engine's latency budget to the first verified sentence, p50, per path (design sheet §12). Every stage is
// LATENCY.own / LATENCY.api in presets/gcase-answer.ts:
//   Own-index path (75% of quick answers): edge, screen, cache lookup 30 + planner 250 + index 80 (3 queries × 100
//   shards, 60 ms per-shard deadline hedged at 40, + 20 merge) + rank 110 (prefilter and cheap scorer 30, cross-encoder
//   80) → `sources` at LATENCY.sourcesOwn = 470 + assembly 10 + first token 500 + first sentence 312.5 (25 tokens at 80
//   a second) + checks 60 = LATENCY.ownP50 ≈ 1,353 ms (N3 ≤ 1,500; p95 ≈ 1,980 ≤ 2,500).
//   API-routed path (25%): edge 30 + planner 250 + one API call 513 (Brave class p50, vendor-run test by Perplexity,
//   September 2025) + the slowest of 3 fetches LATENCY.fetchP50 ≈ 400 (one fetch p50 300, p95 500: q = 0.5^(1/3) =
//   0.794 → 300 + 0.82 × 122) + parse 30 + rank 110 → sources ≈ 1,333 + assembly 10 + first token 500 + sentence 312.5
//   + checks 60 = LATENCY.apiP50 ≈ 2,215 ms (N3 ≤ 2,400; p95 ≈ 2,910 ≤ 3,200).
//   Cache hit: edge 30 + lookup 10 + send 10 = 50 ms (the planner is cancelled).
//   Multi-hop (own index): edge and planner 280 + 2 rounds × LATENCY.roundMs 1,940 (index 80 + cheap 30 + cross 80 +
//   first token 500 + 100 tokens 1,250) + the answer stages 1,072.5 = LATENCY.hopOwnP50 = 5,232.5; the 25% whose first
//   round calls the API add LATENCY.hopRoutedExtra ≈ 863; mixed p50 ≈ 5,400, p95 ≈ 6,480 (N3 ≤ 6,000 / 9,000).
// The own path draws the index and ranking as one row (80 + 110 = 190 ms, ending at `sources`) and the API path draws
// fetch + parse as one row (≈ 430 ms), so no duration text sits under the `sources` marker.
// Steps: 1 own-index path · 2 API-routed path (the max-of-3 fetch marked) · 3 cache hit · 4 multi-hop (own scale).
// Layout (880 wide): waterfall() from presets/production.ts; steps 1–3 share one msPerPx fitted to the API path's
// 2,400 ms target; multi-hop has its own scale, said in its heading. Label column 196 px, rows 24 px.
// Colours (GENAI_TONE): edge and assembly neutral, planner and ranking lime, the index violet, the API call and fetches
// teal (tools), the model green, checks lime, the cache hit violet.

const X = 12;
const LABEL_W = 196;
const ms = (s: readonly { id: string; ms: number }[], id: string) => s.find((x) => x.id === id)?.ms ?? 0;
const sp = (
  id: string,
  label: string,
  startMs: number,
  durationMs: number,
  tone: LayoutTone,
  step: number,
  note?: string
): WaterfallSpan => ({ id, label, startMs, durationMs: Math.round(durationMs), tone, step, note });

/** A path as consecutive spans from a list of [id, label, ms, tone, note?]. */
function chain(rows: [string, string, number, LayoutTone, string?][], step: number): WaterfallSpan[] {
  let t = 0;
  return rows.map(([id, label, d, tone, note]) => {
    const s = sp(id, label, Math.round(t), d, tone, step, note);
    t += d;
    return s;
  });
}

const rank = ms(L.own, "cheap") + ms(L.own, "cross");
const [retrieved, , , , cross] = RETRIEVAL.funnel;
const rankRow: [string, string, number, LayoutTone, string?] = [
  "rank",
  `Rank ${retrieved.spans} → ${cross.spans}`,
  rank,
  GENAI_TONE.rank,
];
const tail: [string, string, number, LayoutTone, string?][] = [
  ["assemble", "Assemble prompt", ms(L.own, "assemble"), PROD_TONE.infra],
  ["first", "Model: first token", ms(L.own, "firstToken"), GENAI_TONE.model],
  ["sentence", "First sentence", L.sentenceMs, GENAI_TONE.model],
  ["checks", "Checks", ms(L.own, "verify"), GENAI_TONE.check],
];
const head: [string, string, number, LayoutTone, string?][] = [
  ["edge", "Edge, screen, cache", ms(L.own, "edge"), PROD_TONE.infra],
  ["planner", "Planner (small)", ms(L.own, "planner"), GENAI_TONE.rank],
];
const own = chain(
  [
    ...head,
    ["index", `Own index + rank ${retrieved.spans} → ${cross.spans}`, ms(L.own, "index") + rank, GENAI_TONE.store],
    ...tail,
  ],
  1
);
const api = chain(
  [
    ...head,
    ["api", "One search-API call", ms(L.api, "api"), GENAI_TONE.tool],
    ["fetch", "Slowest of 3 fetches + parse", L.fetchP50 + ms(L.api, "parse"), GENAI_TONE.tool],
    rankRow,
    ...tail,
  ],
  2
);
const hit = [sp("hit", "Cache hit: whole answer", 0, L.cacheHit.p50, GENAI_TONE.store, 3)];
const answerStages = L.hopOwnP50 - (ms(L.own, "edge") + ms(L.own, "planner")) - 2 * L.roundMs;
const hop = chain(
  [
    ["h-head", "Edge and planner", ms(L.own, "edge") + ms(L.own, "planner"), GENAI_TONE.rank],
    ["h-r1", "Round 1: retrieve, step", L.roundMs, GENAI_TONE.model],
    ["h-r2", "Round 2: retrieve, step", L.roundMs, GENAI_TONE.model],
    ["h-answer", "Answer to first sentence", answerStages, GENAI_TONE.model],
  ],
  4
);

const scale = waterfallSize([...own, ...api], { width: 856, labelW: LABEL_W, total: { ms: TARGETS.apiP50Ms } });
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 500, rowH: 24, barH: 16 };

const text = (id: string, y: number, label: string, step: number, w = 856): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const ownP50 = Math.round(L.ownP50);
const apiP50 = Math.round(L.apiP50);
const H1 = 4;
const W1 = H1 + 24;
const s1 = waterfallSize(own, { ...common, total: { ms: ownP50 } });
const H2 = W1 + s1.height + 12;
const W2 = H2 + 24;
const s2 = waterfallSize(api, { ...common, total: { ms: apiP50 } });
const H3 = W2 + s2.height + 12;
const W3 = H3 + 24;
const hitOpts = {
  ...common,
  tickMs: 250,
  total: false as const,
  marks: [
    {
      ms: L.own[0].ms + L.own[1].ms,
      label: `planner done: ${L.own[0].ms + L.own[1].ms} ms`,
    },
  ],
};
const s3 = waterfallSize(hit, hitOpts);
const H4 = W3 + s3.height + 12;
const W4 = H4 + 24;
const s4 = waterfallSize(hop, {
  width: 856,
  labelW: LABEL_W,
  rowH: 24,
  barH: 16,
  tickMs: 1_000,
  total: { ms: L.hopOwnP50 },
});
const FOOT = W4 + s4.height + 8;

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "Latency to the first verified sentence, p50: 1,353 ms on the own index, 2,215 ms when the search API is called",
  width: 880,
  height: FOOT + 46,
  steps: [
    { title: `Own-index path: ${n(ownP50)} ms` },
    { title: `API-routed path: ${n(apiP50)} ms` },
    { title: `Cache hit: ${L.cacheHit.p50} ms` },
    { title: `Multi-hop: ${n(Math.round(L.hopOwnP50))} ms on the own index` },
  ],
  shapes: [
    text("h1", H1, `Own-index path (75% of quick answers): ${n(ownP50)} ms, target ${n(TARGETS.ownP50Ms)}`, 1),
    ...waterfall("own", X, W1, own, {
      ...common,
      step: 1,
      total: { ms: ownP50, label: `first verified sentence ${n(ownP50)} ms` },
      marks: [{ ms: L.sourcesOwn, label: `sources ${L.sourcesOwn} ms` }],
    }),
    text("h2", H2, `API-routed path (25%): ${n(apiP50)} ms, target ${n(TARGETS.apiP50Ms)}`, 2),
    ...waterfall("api", X, W2, api, {
      ...common,
      step: 2,
      total: { ms: apiP50, label: `first verified sentence ${n(apiP50)} ms` },
      marks: [{ ms: Math.round(L.sourcesApi), label: `sources ${n(Math.round(L.sourcesApi))} ms` }],
    }),
    text(
      "h3",
      H3,
      `Cache hit (14% of questions): ${L.cacheHit.p50} ms p50, target ≤ ${TARGETS.cacheHitP95Ms} ms p95; a hit cancels the planner`,
      3
    ),
    ...waterfall("hit", X, W3, hit, { ...hitOpts, step: 3 }),
    text(
      "h4",
      H4,
      `Multi-hop, own index (different scale): ${n(Math.round(L.hopOwnP50))} ms; mixed with API rounds ≈ ${n(Math.round(L.hopP50 / 10) * 10)} p50, target ${n(TARGETS.hopP50Ms)}`,
      4
    ),
    ...waterfall("hop", X, W4, hop, {
      width: 856,
      labelW: LABEL_W,
      rowH: 24,
      barH: 16,
      tickMs: 1_000,
      step: 4,
      total: { ms: L.hopOwnP50, label: `first verified sentence ${n(Math.round(L.hopOwnP50))} ms` },
    }),
    text(
      "foot-1",
      FOOT,
      `Fetches: one p50 300, p95 500; the slowest of 3 is one fetch's p79.4 ≈ ${Math.round(L.fetchP50)} ms. API p50 513 ms is vendor-run (Perplexity's test).`,
      2
    ),
    text(
      "foot-2",
      FOOT + 20,
      `p95: own ≈ ${n(Math.round(L.ownP95 / 10) * 10)} ms (≤ ${n(TARGETS.ownP95Ms)}), API ≈ ${n(Math.round(L.apiP95 / 10) * 10)} ms (≤ ${n(TARGETS.apiP95Ms)}). Stage times illustrative.`,
      2
    ),
  ],
};

export default spec;
