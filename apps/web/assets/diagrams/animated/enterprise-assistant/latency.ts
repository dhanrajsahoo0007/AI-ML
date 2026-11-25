import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CONTEXT, LATENCY as L, RETRIEVAL } from "@/components/diagrams/presets/gcase-enterprise";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// The enterprise assistant's latency budget, p50, per path (design sheet §12; every stage is LATENCY in
// presets/gcase-enterprise.ts, stage times illustrative; p95 = p50 + root-sum-square of stage spreads):
//   Answer, indexed (first token): edge 20 + router 300 (`status` at 320) + embed 15 + filtered BM25 + ANN 40 +
//     ACL-store re-check 5 + personal ranker 10 + cross-encoder 120 (`sources` at LATENCY.sourcesAt = 510) + injection
//     screen 25 + context 10 + first token 600 = LATENCY.answer.p50 = 1,145 (N3 ≤ 1,500; p95 ≈ 1,799 ≤ 2,500).
//   + live check (30% of answers): checks start when the personal ranker finishes (390), in parallel with the
//     cross-encoder; the slowest of the chosen 3 ≈ 260 ms (LATENCY.liveSlowestP50 = 259.5) ends at ≈ 650, a residual
//     wait of ≈ 140 → first token LATENCY.answerSensitive.p50 ≈ 1,285 (p95 ≈ 1,975). Deadline 500 ms.
//   + live Slack or mail search (30%): live search 500 (335 → 835; the index search runs inside it) + the slowest of 3
//     mail bodies ≈ 275 (→ 1,110), then re-check, ranker, cross-encoder, screen, context and first token as above →
//     LATENCY.answerFederated.p50 ≈ 1,880 (N3 ≤ 2,200; p95 ≈ 2,856 ≤ 3,500).
//   Lookup: edge 20 + router 300 + first token 600 + 60 tokens 750 + broker 5 + tool 300 + second first token 500 =
//     LATENCY.lookup.p50 = 2,475 to the reply's first token (N3 ≤ 3,000; p95 ≈ 3,707).
//   Write: 20 + 300 + 600 + 120 tokens 1,500 + schema, entitlement, audience, policy 30 = LATENCY.writeCard.p50 =
//     2,450 to the card (N3 ≤ 3,000); confirm is a new request: LATENCY.writeExecute.p50 = 435 (≤ 1,000).
//   Agent: edge and router 320 + 6 first tokens 3,600 + 560 tokens out 7,000 + 3 tools 900 + 2 tool searches 60 =
//     LATENCY.agent.p50 = 11,880 (N3 ≤ 15,000); drawn as a budget (summed by kind), not in time order.
// Steps: 1 indexed answer · 2 + a live check (overlap marked) · 3 + a live search · 4 lookup and write · 5 agent.
// Layout (880 wide): waterfall() from presets/production.ts. The answer chart (rows 1–7 in step 1, the live-check row in
// step 2, the live-search rows in step 3) is fitted to the live-search target 2,200 ms; only the rows that differ are
// added, and `sources` and the first-token time of each path are a note and footer lines, so no text crosses a marker. Lookup and write share
// a scale fitted to 3,000 ms; the agent has its own scale, said in its heading. Label column 220 px, rows 24 px.
// Colours: edge and context neutral, router and rankers lime (ranking), the filtered index search violet (store), live
// checks, live search and tool calls teal (tools, called as the user), screen, broker and policy lime (check), model
// green.

/** The sheet rounds these times to 5 ms (259.5 → 260, 1,284.5 → 1,285). */
const r5 = (v: number) => Math.round(v / 5) * 5;
const X = 12;
const LABEL_W = 220;
const WIDTH = 856;
const st = (path: { stages: readonly { id: string; p50: number }[] }, id: string) =>
  path.stages.find((s) => s.id === id)?.p50 ?? 0;
const a = L.answer;
const sp = (
  id: string,
  label: string,
  startMs: number,
  durationMs: number,
  tone: LayoutTone,
  step: number,
  extra: Partial<WaterfallSpan> = {}
): WaterfallSpan => ({
  id,
  label,
  startMs: Math.round(startMs),
  durationMs: Math.round(durationMs),
  tone,
  step,
  ...extra,
});

/** Consecutive spans from a list of [id, label, ms, tone]. */
function chain(rows: [string, string, number, LayoutTone, string?][], step: number, start = 0): WaterfallSpan[] {
  let t = start;
  return rows.map(([id, label, d, tone, note]) => {
    const s = sp(id, label, t, d, tone, step, note ? { note } : {});
    t += d;
    return s;
  });
}

// Answer: the indexed path, then the rows that differ.
const indexSearch = st(a, "embed") + st(a, "search") + st(a, "recheck");
const indexed = chain(
  [
    ["edge", "Edge, auth, principal set", st(a, "edge"), PROD_TONE.infra],
    ["router", "Router (small)", st(a, "router"), GENAI_TONE.rank],
    ["index", "Embed, filtered search, re-check", indexSearch, GENAI_TONE.store],
    ["personal", "Personal ranker 160 → 50", st(a, "personal"), GENAI_TONE.rank],
    [
      "cross",
      `Cross-encoder 50 → ${RETRIEVAL.chunksInPrompt}`,
      st(a, "cross"),
      GENAI_TONE.rank,
      `sources at ${L.sourcesAt} ms`,
    ],
    ["screen", "Injection screen, context", st(a, "screen") + st(a, "assemble"), GENAI_TONE.check],
    ["ttft", "Answer model: first token", st(a, "ttft"), GENAI_TONE.model],
  ],
  1
);
const liveStart = L.sourcesAt - st(a, "cross"); // 390
const liveRow = sp("live", "Live checks, slowest of 3", liveStart, r5(L.liveSlowestP50), GENAI_TONE.tool, 2, {
  highlight: true,
  note: `overlaps the cross-encoder; waits ≈ ${r5(st(L.answerSensitive, "live"))} ms more`,
});
const fedStart = st(a, "edge") + st(a, "router") + st(a, "embed");
const fed = L.answerFederated;
const fedRows = [
  sp("federated", "Slack or mail search, live", fedStart, st(fed, "federated"), GENAI_TONE.tool, 3, {
    note: "index search runs inside it",
  }),
  sp("body", "Mail bodies, slowest of 3", fedStart + st(fed, "federated"), st(fed, "body"), GENAI_TONE.tool, 3),
];
const answerSpans = [...indexed, liveRow, ...fedRows];

const lookupSpans = chain(
  [
    ["l-head", "Lookup: edge and router", st(L.lookup, "edge") + st(L.lookup, "router"), GENAI_TONE.rank],
    ["l-ttft", "Model first token", st(L.lookup, "ttft"), GENAI_TONE.model],
    ["l-call", `${CONTEXT.toolCallOut} tokens of tool call`, st(L.lookup, "decode-60"), GENAI_TONE.model],
    ["l-broker", "Token broker", st(L.lookup, "broker"), GENAI_TONE.check],
    ["l-tool", "Tool API as the user", st(L.lookup, "tool"), GENAI_TONE.tool],
    ["l-ttft2", "Reply: first token", st(L.lookup, "ttft2"), GENAI_TONE.model],
  ],
  4
);
const w = L.writeCard;
const writeSpans = chain(
  [
    ["w-head", "Write: edge and router", st(w, "edge") + st(w, "router"), GENAI_TONE.rank],
    ["w-ttft", "Model first token", st(w, "ttft"), GENAI_TONE.model],
    ["w-args", `${CONTEXT.writeArgsOut} tokens of arguments`, st(w, "decode-120"), GENAI_TONE.model],
    ["w-check", "Schema, audience, policy", st(w, "validate"), GENAI_TONE.check],
  ],
  4
);
const ag = L.agent;
const sumOf = (prefix: string) => ag.stages.filter((s) => s.id.startsWith(prefix)).reduce((acc, s) => acc + s.p50, 0);
const agentSpans = chain(
  [
    ["g-head", "Edge and router", st(ag, "edge") + st(ag, "router"), GENAI_TONE.rank],
    ["g-ttft", "6 model calls: first tokens", sumOf("ttft-"), GENAI_TONE.model],
    ["g-out", "560 tokens out", sumOf("decode-"), GENAI_TONE.model],
    ["g-tools", "3 tool calls", sumOf("tool-"), GENAI_TONE.tool],
    ["g-search", "2 tool searches", sumOf("tsearch-"), GENAI_TONE.tool],
  ],
  5
);

const T = L.targets;
const ansScale = waterfallSize(answerSpans, { width: WIDTH, labelW: LABEL_W, total: { ms: T.federated.p50 } });
const ansOpts = { msPerPx: ansScale.msPerPx, labelW: LABEL_W, tickMs: 250, rowH: 24, barH: 16 };
const actScale = waterfallSize(lookupSpans, { width: WIDTH, labelW: LABEL_W, total: { ms: T.lookup.p50 } });
const actOpts = { msPerPx: actScale.msPerPx, labelW: LABEL_W, tickMs: 500, rowH: 24, barH: 16 };
const agentOpts = { width: WIDTH, labelW: LABEL_W, tickMs: 2_000, rowH: 24, barH: 16 };

const text = (id: string, y: number, label: string, step: number, tone: LayoutTone = PROD_TONE.infra): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: WIDTH,
  h: 18,
  label,
  tone,
  step,
});
const msr = (v: number) => n(r5(v));

const H1 = 4;
const W1 = H1 + 24;
const s1 = waterfallSize(answerSpans, { ...ansOpts, total: false });
const F1 = W1 + s1.height + 6;
const H2 = F1 + 3 * 20 + 14;
const W2 = H2 + 24;
const s2 = waterfallSize(lookupSpans, { ...actOpts, total: { ms: L.lookup.p50 } });
const W3 = W2 + s2.height + 10;
const s3 = waterfallSize(writeSpans, { ...actOpts, total: { ms: w.p50 } });
const F3 = W3 + s3.height + 6;
const H4 = F3 + 20 + 14;
const W4 = H4 + 24;
const s4 = waterfallSize(agentSpans, { ...agentOpts, total: { ms: ag.p50 } });
const FOOT = W4 + s4.height + 8;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Latency per path, p50: first token at ${n(a.p50)} ms indexed, ${msr(L.answerSensitive.p50)} with a live check, ${msr(fed.p50)} with a live search`,
  width: 880,
  height: FOOT + 24,
  steps: [
    { title: `Indexed answer: first token at ${n(a.p50)} ms` },
    { title: `With a live check: it overlaps the cross-encoder; ${msr(L.answerSensitive.p50)} ms` },
    { title: `With a live Slack or mail search: ${msr(fed.p50)} ms` },
    { title: `Lookup ${n(L.lookup.p50)} ms to the reply; write ${n(w.p50)} ms to the card` },
    { title: `Agent: ${n(ag.p50)} ms` },
  ],
  shapes: [
    text(
      "h1",
      H1,
      `Answer, p50 (65% of turns); targets: first token ${n(T.answer.p50)} ms, ${n(T.federated.p50)} with a live search`,
      1
    ),
    // The rows added in steps 2 and 3 carry the ring on their bar only (quiet label and note).
    ...waterfall("ans", X, W1, answerSpans, { ...ansOpts, step: 1, total: false }).map((sh): LayoutShape =>
      /^ans-(live|federated|body)-(label|after)$/.test(sh.id) ? { ...sh, quiet: true } : sh
    ),
    text("f1", F1, `Indexed: first token ${n(a.p50)} ms (p95 ≈ ${msr(a.p95)}).`, 1, GENAI_TONE.model),
    text(
      "f2",
      F1 + 20,
      `With a live check (30%): sources at ${msr(L.sourcesAt + st(L.answerSensitive, "live"))} ms, first token ${msr(L.answerSensitive.p50)} (p95 ≈ ${msr(L.answerSensitive.p95)}).`,
      2,
      GENAI_TONE.model
    ),
    text(
      "f3",
      F1 + 40,
      `With a live search (30%): then re-check, rankers and screen as above; first token ${msr(fed.p50)} ms (p95 ≈ ${msr(fed.p95)}).`,
      3,
      GENAI_TONE.model
    ),
    text(
      "h2",
      H2,
      `Lookup and write, p50 (another scale); targets: reply ≤ ${n(T.lookup.p50)} ms, card ≤ ${n(T.writeCard.p50)} ms`,
      4
    ),
    ...waterfall("look", X, W2, lookupSpans, {
      ...actOpts,
      step: 4,
      total: { ms: L.lookup.p50, label: `reply's first token ${n(L.lookup.p50)} ms` },
    }),
    ...waterfall("write", X, W3, writeSpans, {
      ...actOpts,
      step: 4,
      total: { ms: w.p50, label: `card shown ${n(w.p50)} ms` },
    }),
    text(
      "f4",
      F3,
      `Confirm is a new request: ${n(L.writeExecute.p50)} ms to done (target ${n(T.writeExecute.p50)}). A status event goes out at ${L.statusAt} ms on every path.`,
      4
    ),
    text(
      "h4",
      H4,
      `Agent, p50 (own scale), summed by kind, not in time order; target ${n(T.agent.p50)} ms, hard stop 60 s`,
      5
    ),
    ...waterfall("agent", X, W4, agentSpans, {
      ...agentOpts,
      step: 5,
      total: { ms: ag.p50, label: `answer ${n(ag.p50)} ms` },
    }),
  ],
};

export default spec;
