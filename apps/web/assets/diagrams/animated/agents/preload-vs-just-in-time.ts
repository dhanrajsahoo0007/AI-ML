import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { KNOWLEDGE_TURNS, PRELOAD_JIT } from "@/components/diagrams/presets/agents-context";

// Preloading against just-in-time retrieval (context-engineering, Deep dive): two turns of the Brightpost kettle
// conversation, each run both ways. Preload: the builder searches the customer's raw message before every model call
// and adds the top 5 chunks (2,000 tokens), needed or not. Just in time: the model calls search_help with its own
// query when it decides it needs knowledge, and gets the top 3 chunks (1,200 tokens); on the "thanks" turn it fetches
// nothing. Numbers from PRELOAD_JIT (latency illustrative, from LATENCY_S).
//
// Two steps: 1 the kettle refund turn, both ways · 2 the "thanks, that's all" turn, both ways, and the totals.
//
// Layout: a turn heading over each pair of rows; one row per approach (rows at y 44, 104 and 214, 274). A label block
// on the left (x 20, 140 wide: the approach, its calls and time). Four aligned columns so like sits under like:
// col 1 the first model call (just in time only), col 2 the search (the builder's on the raw message, or the model's
// tool call), col 3 the chunks that enter the window, col 4 the model call that writes the reply. The wasted chunks on
// the "thanks" turn carry the figure's one highlight. A totals line under the last row.
//
// Colour (agents legend, three tones plus neutral): model calls green, the search_help tool call teal, chunks blue
// (retrieved text), the builder's own search and all text neutral.

const H = 44;
const COL = [
  { x: 172, w: 108 },
  { x: 304, w: 264 },
  { x: 592, w: 128 },
  { x: 744, w: 116 },
] as const;
const ROW = { kettlePre: 44, kettleJit: 104, thanksPre: 214, thanksJit: 274 } as const;
const fmt = (n: number) => n.toLocaleString("en-GB");

const chip = (
  id: string,
  col: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col].x,
  y,
  w: COL[col].w,
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  ...extra,
});

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const { preload, jit, latency, totals } = PRELOAD_JIT;
const s = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Preloading against just-in-time retrieval",
  width: 880,
  height: 368,
  steps: [{ title: "The kettle refund turn, both ways" }, { title: 'The "thanks, that\'s all" turn, and the totals' }],
  shapes: [
    // Step 1: the kettle refund turn.
    text("h-kettle", 172, 12, 688, 22, KNOWLEDGE_TURNS.kettle, 1),
    text("l-kettle-pre", 20, ROW.kettlePre, 140, H, `Preload\n1 call · ${latency.preload} s`, 1),
    chip("kp-search", 1, ROW.kettlePre, "Search the message", "the builder, every turn", AGENT_TONE.infra, 1),
    chip(
      "kp-chunks",
      2,
      ROW.kettlePre,
      `${preload.chunks} chunks`,
      `${fmt(preload.tokens)} tokens`,
      AGENT_TONE.result,
      1
    ),
    chip("kp-model", 3, ROW.kettlePre, "Model call", "writes the reply", AGENT_TONE.model, 1),
    arrow("kp-a1", "kp-search", "kp-chunks", 1),
    arrow("kp-a2", "kp-chunks", "kp-model", 1),

    text("l-kettle-jit", 20, ROW.kettleJit, 140, H, `Just in time\n2 calls · ${latency.jit} s`, 1),
    chip("kj-model1", 0, ROW.kettleJit, "Model call", "picks a tool", AGENT_TONE.model, 1),
    chip("kj-search", 1, ROW.kettleJit, jit.call, "the model's own query", AGENT_TONE.action, 1),
    chip("kj-chunks", 2, ROW.kettleJit, `${jit.chunks} chunks`, `${fmt(jit.tokens)} tokens`, AGENT_TONE.result, 1),
    chip("kj-model2", 3, ROW.kettleJit, "Model call", "writes the reply", AGENT_TONE.model, 1),
    arrow("kj-a1", "kj-model1", "kj-search", 1),
    arrow("kj-a2", "kj-search", "kj-chunks", 1),
    arrow("kj-a3", "kj-chunks", "kj-model2", 1),

    // Step 2: the "thanks" turn.
    text("h-thanks", 172, 182, 688, 22, KNOWLEDGE_TURNS.thanks, 2),
    text("l-thanks-pre", 20, ROW.thanksPre, 140, H, "Preload\n1 call", 2),
    chip("tp-search", 1, ROW.thanksPre, "Search the message", "the builder, every turn", AGENT_TONE.infra, 2),
    chip(
      "tp-chunks",
      2,
      ROW.thanksPre,
      `${preload.chunks} chunks`,
      `${fmt(preload.tokens)}, not needed`,
      AGENT_TONE.result,
      2,
      {
        highlight: true,
      }
    ),
    chip("tp-model", 3, ROW.thanksPre, "Model call", "writes the reply", AGENT_TONE.model, 2),
    arrow("tp-a1", "tp-search", "tp-chunks", 2),
    arrow("tp-a2", "tp-chunks", "tp-model", 2),

    text("l-thanks-jit", 20, ROW.thanksJit, 140, H, "Just in time\n1 call", 2),
    text("tj-none", COL[1].x, ROW.thanksJit, COL[2].x + COL[2].w - COL[1].x, H, "nothing fetched: 0 tokens", 2),
    chip("tj-model", 3, ROW.thanksJit, "Model call", "writes the reply", AGENT_TONE.model, 2),

    text(
      "totals",
      20,
      336,
      840,
      22,
      `Both turns: preload ${s(totals.preload.calls, "call")}, ${fmt(totals.preload.tokens)} chunk tokens · ` +
        `just in time ${s(totals.jit.calls, "call")}, ${fmt(totals.jit.tokens)} chunk tokens (times illustrative)`,
      2
    ),
  ],
};

export default spec;
