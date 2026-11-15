import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { USAGE } from "@/components/diagrams/presets/production-observe";

// One request, four token classes, and where each one lives in two providers' usage objects
// (latency-token-monitoring, Deep dive "Token accounting"). No steps. A reasoning-on request (illustrative split of the
// shared sizes, presets/production-observe.ts USAGE): 2,200 input tokens, 1,000 of them a cached prefix read from the
// cache; 310 output tokens, 60 of them reasoning and 250 the visible answer (the shared 250-token answer).
//   Anthropic Messages usage (docs checked 2026-11-16): input_tokens counts only what was NOT read from or written to
//     the cache (1,200); cache_read_input_tokens 1,000; total input = input_tokens + cache_creation_input_tokens +
//     cache_read_input_tokens; output_tokens 310; usage.output_tokens_details.thinking_tokens 60 is part of the billed
//     output tokens.
//   OpenAI Responses usage (docs checked 2026-11-16): input_tokens is the total (2,200) with
//     input_tokens_details.cached_tokens 1,000 inside it; output_tokens 310 with
//     output_tokens_details.reasoning_tokens 60 inside it.
//   Cost at the shared illustrative price (2 dollars in, 10 out per million; a cache read at 0.1 x the input price):
//     1,200 x 2 / 1 M = 0.0024; 1,000 x 0.2 / 1 M = 0.0002; 250 x 10 / 1 M = 0.0025; 60 x 10 / 1 M = 0.0006;
//     total 0.0057 dollars.
// Layout (880 x 312): a heading row at y 6; four rows from y 30 with a 56 pitch (cells h 48); columns x 20 (w 140) /
// 168 (w 74) / 250 (w 270) / 528 (w 270) / 806 (w 64); two footer lines at y 260 and 284.
// Colours (PROD_TONE): uncached input orange, cached input violet (a cache is a store), output and reasoning green;
// field and cost cells neutral. Three tones plus neutral; the reasoning row is the one highlight.

const COLS = [
  { x: 20, w: 140 },
  { x: 168, w: 74 },
  { x: 250, w: 270 },
  { x: 528, w: 270 },
  { x: 806, w: 64 },
] as const;

const usd = (v: number) => `$${v.toFixed(4)}`;
const total = USAGE.output;

interface Row {
  label: string;
  tone: LayoutShape["tone"];
  tokens: number;
  a: [string, string];
  o: [string, string];
  cost: number;
  ring?: boolean;
}

const rows: Row[] = [
  {
    label: "Uncached input",
    tone: PROD_TONE.traffic,
    tokens: USAGE.uncached,
    a: ["input_tokens", `${n(USAGE.uncached)} (no cache included)`],
    o: ["input_tokens − cached_tokens", `${n(USAGE.input)} − ${n(USAGE.cached)}`],
    cost: USAGE.cost.uncached,
  },
  {
    label: "Cached input",
    tone: PROD_TONE.store,
    tokens: USAGE.cached,
    a: ["cache_read_input_tokens", n(USAGE.cached)],
    o: ["input_tokens_details.cached_tokens", n(USAGE.cached)],
    cost: USAGE.cost.cached,
  },
  {
    label: "Visible output",
    tone: PROD_TONE.model,
    tokens: USAGE.visible,
    a: ["output_tokens − thinking_tokens", `${total} − ${USAGE.reasoning}`],
    o: ["output_tokens − reasoning_tokens", `${total} − ${USAGE.reasoning}`],
    cost: USAGE.cost.visible,
  },
  {
    label: "Reasoning output",
    tone: PROD_TONE.model,
    tokens: USAGE.reasoning,
    a: ["output_tokens_details.thinking_tokens", `${USAGE.reasoning}, inside output_tokens ${total}`],
    o: ["output_tokens_details.reasoning_tokens", `${USAGE.reasoning}, inside output_tokens ${total}`],
    cost: USAGE.cost.reasoning,
    ring: true,
  },
];

const text = (id: string, x: number, y: number, w: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
});

const shapes: LayoutShape[] = [];
["Token class", "Tokens", "Anthropic usage field", "OpenAI usage field", "Cost"].forEach((h, i) =>
  shapes.push(text(`h-${i}`, COLS[i].x, 6, COLS[i].w, h))
);
rows.forEach((r, i) => {
  const y = 30 + i * 56;
  const cell = (c: number, label: string, tone: LayoutShape["tone"], sub?: string, ring?: boolean): LayoutShape => ({
    id: `r${i}-c${c}`,
    type: "cell",
    x: COLS[c].x,
    y,
    w: COLS[c].w,
    h: 48,
    label,
    sub,
    tone,
    fill: "pastel",
    highlight: ring || undefined,
  });
  shapes.push(
    cell(0, r.label, r.tone, undefined, r.ring),
    cell(1, n(r.tokens), r.tone),
    cell(2, r.a[0], PROD_TONE.infra, r.a[1]),
    cell(3, r.o[0], PROD_TONE.infra, r.o[1]),
    cell(4, usd(r.cost), PROD_TONE.infra)
  );
});
shapes.push(
  text(
    "foot-1",
    20,
    260,
    850,
    `One request: ${n(USAGE.input + USAGE.output)} tokens, ${usd(USAGE.total)} (illustrative: $2 in and $10 out per million, a cache read at 0.1 × the input price).`
  ),
  text(
    "foot-2",
    20,
    284,
    850,
    `Same request in OpenTelemetry: gen_ai.usage.input_tokens = ${n(USAGE.input)} (includes the cache); gen_ai.usage.output_tokens = ${USAGE.output} (includes reasoning).`
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "One request, four token classes: where each sits in two providers' usage fields",
  width: 880,
  height: 312,
  shapes,
};

export default spec;
