import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";
import { BLOCKS, CAPACITY, LATENCY, POOLS, STAGES, TARGETS, TURN50 } from "@/components/diagrams/presets/gcase-chat";

// Time to first token per path (chatgpt-style-chat-service, design sheet §9 walk-through and §12; preset STAGES,
// LATENCY, CAPACITY.turn50, TARGETS in presets/gcase-chat.ts). Bars are STAGE MEDIANS laid end to end; the last rows of each
// path are the SIMULATED p50 and p95 of the whole path, drawn from 0 (100,000 turns at one prefill unit, ρ 0.6, reserved hit mix), which
// is where the tail lives: stage medians do not add up to a percentile. All stage times are illustrative.
//   Step 1, turn 50 on its home unit: edge 15 + session and bucket 6 + the parallel group 18 (the slowest median is
//     recall, 18; input screen 12, router 6, cache 8) + admission 2 + small-job queue LATENCY.prefillWaitSmall.p50 ≈ 41
//     (the 450 new tokens are CAPACITY.turn50.hitPrefillMs ≈ 9 ms of it) + KV to decode 1 + join a step 11 (half of
//     22.7) + first step 23 + network 20 = 137 ms. Simulated, prefix on its home unit: p50 155, p95 266 (target 250 /
//     500). The sheet's walk-through prints 136: it takes 17 ms for the parallel group.
//   Step 2, the same turn missing: the same front 41 + recompute 11,650 tokens CAPACITY.turn50.missPrefillMs ≈ 188 ms
//     on an idle unit + 1 + 11 + 23 + 20 = 284 ms. Simulated over all misses (queued behind each other): p50 331, p95
//     733 (target 600 / 1,200).
//   Step 3, a search turn: front 41 + queue 41 + join 12 + the search call (30 tokens at 60 a second = 500) → the
//     "Searching" status 20 later; search STAGES.search.p50 = 700; the 2,000 tokens of results re-enter the small-job
//     queue (41) + KV, join, first step 35 + network 20 ≈ 1,390 by medians. Simulated: status p50 636, p95 770; answer
//     p50 1,468, p95 2,271 (targets 800 / 1,200 and 2,000 / 3,000).
//   Step 4, a reasoning turn (own scale): "Thinking" shown after front + network ≈ 61 (simulated p50 65, p95 113);
//     prefill 41 + KV and join 8, then 2,000 thinking tokens at 100 a second = 20 s, summaries every ≈ 5 s; answer's
//     first token simulated p50 20,216, p95 45,144 (target 30,000 / 60,000).
//   Step 2 also prints LATENCY.turn50Miss, misses of turn 50's size (10,500–13,000 tokens): p50 414, p95 827.
//   Step 5, a risky-input turn (3%): the same hit path, but the first 32-token window is held until screened
//   (LATENCY.holdMs = 533 ms) = 670 ms by medians; simulated LATENCY.held p50 691, p95 821 against its own target
//   800 / 1,300 (TARGETS row "held").
// Layout (880 wide): waterfall() from presets/production.ts; steps 1 and 2 share one scale to 800 ms, steps 3 and 4
// have their own, said in their headings. Label column 250 px, rows 24 px.
// Colours: edge, session, screens and network neutral; prefill and decode green (models); a recompute red; the web
// search teal (a tool); thinking green; simulated p50 rows neutral, p95 rows red.

const X = 12;
const LABEL_W = 250;
const S = STAGES;
const T = CAPACITY.turn50;
const L = LATENCY;
const r = Math.round;
const front =
  S.edge.p50 +
  S.auth.p50 +
  Math.max(S.inputSafety.p50, S.router.p50, S.contextLoad.p50, S.recall.p50) +
  S.admission.p50;
const queue = r(L.prefillWaitSmall.p50);
const kvMs = Math.max(1, r(T.transferMs));
const join = r(L.fastStepMs / 2);
const stepMs = r(L.fastStepMs);
const net = S.network.p50;
const callMs = r((30 / POOLS.fastSpeed) * 1_000);

/** A path as consecutive spans from [id, label, ms, tone, note?]; each starts where the previous ended. */
function chain(rows: [string, string, number, LayoutTone, string?][], step: number, t0 = 0): WaterfallSpan[] {
  let t = t0;
  return rows.map(([id, label, d, tone, note]) => {
    const s: WaterfallSpan = { id, label, startMs: t, durationMs: d, tone, step, note };
    t += d;
    return s;
  });
}
const head: [string, string, number, LayoutTone, string?][] = [
  ["edge", "Edge, session, token bucket", S.edge.p50 + S.auth.p50, PROD_TONE.infra],
  [
    "group",
    "Parallel: screen, router, recall",
    Math.max(S.inputSafety.p50, S.router.p50, S.contextLoad.p50, S.recall.p50),
    PROD_TONE.infra,
  ],
  ["admit", "Inference router", S.admission.p50, GENAI_TONE.rank],
];
const tail: [string, string, number, LayoutTone, string?][] = [
  ["kv", "KV to decode, join a step", kvMs + join, GENAI_TONE.model],
  ["step", "First step (1.7 tokens)", stepMs, GENAI_TONE.model],
  ["net", "Network to the screen", net, PROD_TONE.infra],
];
const hit = chain(
  [...head, ["queue", `Queue + 450 tokens (${r(T.hitPrefillMs)} ms work)`, queue, GENAI_TONE.model], ...tail].map(
    ([id, ...rest]) => [`h-${id}`, ...rest] as [string, string, number, LayoutTone, string?]
  ),
  1
);
const miss = chain(
  [
    ...head,
    [
      "recompute",
      `Recompute ${n(TURN50.total - BLOCKS.systemPrompt)} tokens`,
      r(T.missPrefillMs),
      GENAI_TONE.failure,
      "idle unit",
    ],
    ...tail,
  ].map(([id, ...rest]) => [`m-${id}`, ...rest] as [string, string, number, LayoutTone, string?]),
  2
);
const hitSum = hit.reduce((s, x) => s + x.durationMs, 0);
const missSum = miss.reduce((s, x) => s + x.durationMs, 0);

// Search turn.
const sFront = chain(
  [
    ["s-front", "Edge to inference router", front, PROD_TONE.infra],
    ["s-queue", "Small-job queue", queue, GENAI_TONE.model],
    ["s-call", "Write the search call, 30 tokens", kvMs + join + callMs, GENAI_TONE.model],
  ],
  3
);
const callEnd = sFront[2].startMs + sFront[2].durationMs;
const sStatus: WaterfallSpan = {
  id: "s-status",
  label: "“Searching” to the screen",
  startMs: callEnd,
  durationMs: net,
  tone: PROD_TONE.infra,
  step: 3,
};
const sRest = chain(
  [
    ["s-search", "Web search", S.search.p50, GENAI_TONE.tool],
    ["s-requeue", `Re-prefill ${n(BLOCKS.searchResult)} result tokens`, queue, GENAI_TONE.model],
    ["s-step", "KV, join, first step", kvMs + join + stepMs, GENAI_TONE.model],
    ["s-net", "Network to the screen", net, PROD_TONE.infra],
  ],
  3,
  callEnd
);
const search = [...sFront, sStatus, ...sRest];
const searchSum = sRest[sRest.length - 1].startMs + net;

// Reasoning turn.
const reasonJoin = r(L.reasonStepMs / 2);
const thinkMs = (BLOCKS.thinking / POOLS.reasoningSpeed) * 1_000;
const reason: WaterfallSpan[] = [
  { id: "r-front", label: "Edge to inference router", startMs: 0, durationMs: front, tone: PROD_TONE.infra, step: 4 },
  {
    id: "r-status",
    label: "“Thinking” to the screen",
    startMs: front,
    durationMs: net,
    tone: PROD_TONE.infra,
    step: 4,
  },
  {
    id: "r-queue",
    label: "Queue, KV, join",
    startMs: front,
    durationMs: queue + kvMs + reasonJoin,
    tone: GENAI_TONE.model,
    step: 4,
  },
  {
    id: "r-think",
    label: `Thinking: ${n(BLOCKS.thinking)} tokens at ${POOLS.reasoningSpeed}/s`,
    startMs: front + queue + kvMs + reasonJoin,
    durationMs: thinkMs,
    tone: GENAI_TONE.model,
    step: 4,
    note: "a summary every ≈ 5 s",
  },
  {
    id: "r-net",
    label: "First answer token to the screen",
    startMs: front + queue + kvMs + reasonJoin + thinkMs,
    durationMs: net,
    tone: PROD_TONE.infra,
    step: 4,
  },
];

const target = (id: string) => TARGETS.rows.find((x) => x.id === id)!;

/** Two rows under a path: the simulated p50 and p95 of every such turn, from 0 (no dashed marks through the notes). */
const sim = (id: string, label: string, q: { p50: number; p95: number }, step: number): WaterfallSpan[] => [
  { id: `${id}-p50`, label: `${label}: simulated p50`, startMs: 0, durationMs: r(q.p50), tone: PROD_TONE.infra, step },
  {
    id: `${id}-p95`,
    label: `${label}: simulated p95`,
    startMs: 0,
    durationMs: r(q.p95),
    tone: GENAI_TONE.failure,
    step,
  },
];
const hitRows = [...hit, ...sim("h-sim", "Home-unit hits", L.hit, 1)];
const missRows = [
  ...miss,
  ...sim("m-sim50", "Turn-50-size misses", L.turn50Miss, 2),
  ...sim("m-sim", "All misses", L.miss, 2),
];
// Risky-input turns (3%) hold each 32-token window until it is screened: the first token waits one window.
const held = chain(
  [
    ...head,
    ["queue", "Queue + 450 tokens", queue, GENAI_TONE.model],
    ["kv", "KV to decode, join a step", kvMs + join, GENAI_TONE.model],
    ["step", "First steps fill a 32-token window", stepMs, GENAI_TONE.model],
    ["hold", "Window held until screened", r(L.holdMs), GENAI_TONE.check, "32 tokens at 60 a second"],
    ["net", "Network to the screen", net, PROD_TONE.infra],
  ].map(([id, ...rest]) => [`k-${id}`, ...rest] as [string, string, number, LayoutTone, string?]),
  5
);
const heldSum = held.reduce((s, x) => s + x.durationMs, 0);
const heldRows = [...held, ...sim("k-sim", "Held turns", L.held, 5)];
const searchRows = [
  ...search,
  {
    id: "s-sim-status",
    label: "\u201cSearching\u201d: simulated p50",
    startMs: 0,
    durationMs: r(L.searchStatus.p50),
    tone: PROD_TONE.infra,
    step: 3,
  },
  ...sim("s-sim", "Answer", L.searchAnswer, 3),
];
const reasonRows = [...reason, ...sim("r-sim", "Answer", L.reasonAnswer, 4)];

const common = { labelW: LABEL_W, rowH: 24, barH: 16 };
const scale12 = waterfallSize([...hitRows, ...missRows, ...heldRows], { ...common, width: 856, total: { ms: 800 } });
const opts12 = { ...common, msPerPx: scale12.msPerPx, tickMs: 100 };

/** Waterfall shapes carry no NEW rings of their own: each step's heading announces it. */
const hush = (sh: LayoutShape): LayoutShape => ({ ...sh, quiet: true });

const heading = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const hitOpts = { ...opts12, total: false as const };
const missOpts = { ...opts12, total: false as const };
const searchOpts = { ...common, width: 856, tickMs: 500, total: false as const };
const reasonOpts = { ...common, width: 856, tickMs: 10_000, total: false as const };
const H1 = 4;
const W1 = H1 + 24;
const s1 = waterfallSize(hitRows, hitOpts);
const H2 = W1 + s1.height + 14;
const W2 = H2 + 24;
const s2 = waterfallSize(missRows, missOpts);
const H3 = W2 + s2.height + 14;
const W3 = H3 + 24;
const s3 = waterfallSize(searchRows, searchOpts);
const H4 = W3 + s3.height + 14;
const W4 = H4 + 24;
const s4 = waterfallSize(reasonRows, reasonOpts);
const H5 = W4 + s4.height + 14;
const W5 = H5 + 24;
const s5 = waterfallSize(heldRows, opts12);
const FOOT = W5 + s5.height + 8;

const tHit = target("hit");
const tMiss = target("miss");
const tSearch = target("searchAnswer");
const tReason = target("reasonAnswer");
const tHeld = target("held");
const spec: LayoutSpec = {
  kind: "layout",
  title: `Time to first token by stage medians, with simulated p50 and p95: ${hitSum} ms on a home-unit hit, ${missSum} on an idle miss`,
  width: 880,
  height: FOOT + 46,
  steps: [
    { title: `Turn 50 on its home unit: ${hitSum} ms by medians; p50 ${r(L.hit.p50)}, p95 ${r(L.hit.p95)}` },
    {
      title: `The same turn missing: ${missSum} ms on an idle unit, ≈ ${r(L.turn50Miss.p50)} / ${r(L.turn50Miss.p95)} ms in the queue`,
    },
    { title: `A search turn: answer p50 ${n(r(L.searchAnswer.p50))}, p95 ${n(r(L.searchAnswer.p95))} ms` },
    { title: `A reasoning turn: ${thinkMs / 1_000} s of thinking; p95 ${n(r(L.reasonAnswer.p95))} ms` },
    { title: `A risky-input turn holds a window: p50 ${r(L.held.p50)}, p95 ${r(L.held.p95)} ms` },
  ],
  shapes: [
    heading(
      "h1",
      H1,
      `Turn 50, prefix on its home unit: ${hitSum} ms by medians (target p50 ${tHit.targetP50}, p95 ${tHit.targetP95})`,
      1
    ),
    ...waterfall("hit", X, W1, hitRows, { ...hitOpts, step: 1 }).map(hush),
    heading(
      "h2",
      H2,
      `The same turn missing (same scale): ${missSum} ms on an idle unit, more in the queue (target p50 ${tMiss.targetP50}, p95 ${n(tMiss.targetP95)})`,
      2
    ),
    ...waterfall("miss", X, W2, missRows, { ...missOpts, step: 2 }).map(hush),
    heading(
      "h3",
      H3,
      `A search turn (own scale): ≈ ${n(searchSum)} ms by medians (target p50 ${n(tSearch.targetP50)}, p95 ${n(tSearch.targetP95)})`,
      3
    ),
    ...waterfall("search", X, W3, searchRows, { ...searchOpts, step: 3 }).map(hush),
    heading(
      "h4",
      H4,
      `A reasoning turn (own scale, ms): thinking sets the tail (target p50 ${n(tReason.targetP50)}, p95 ${n(tReason.targetP95)})`,
      4
    ),
    ...waterfall("reason", X, W4, reasonRows, { ...reasonOpts, step: 4 }).map(hush),
    heading(
      "h5",
      H5,
      `A risky-input turn (3%, scale of steps 1–2): ${heldSum} ms by medians (its own target p50 ${tHeld.targetP50}, p95 ${n(tHeld.targetP95)})`,
      5
    ),
    ...waterfall("held", X, W5, heldRows, { ...opts12, total: false as const, step: 5 }).map(hush),
    {
      ...heading(
        "foot-1",
        FOOT,
        "Stage bars are medians laid end to end; the last rows are the whole path's simulated p50 and p95 (100,000 turns, ρ 0.6).",
        1
      ),
      quiet: true,
    },
    {
      ...heading(
        "foot-2",
        FOOT + 20,
        "The tail is the queue, a held window or thinking, not any one stage. Stage times are illustrative.",
        1
      ),
      quiet: true,
    },
  ],
};

export default spec;
