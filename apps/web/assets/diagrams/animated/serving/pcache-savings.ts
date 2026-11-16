import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  LATENCY,
  PROD_TONE,
  TOKENS,
  TRAFFIC,
  meter,
  type MeterSegment,
  n,
  waterfall,
  waterfallSize,
  type WaterfallSpan,
} from "@/components/diagrams/presets/production";
import { PCACHE_DAY, PCACHE_PRICE, PCACHE_PROMPT, PCACHE_TTFT } from "@/components/diagrams/presets/production-pcache";

// What caching saves Brightpost (prompt-caching, Architecture). No steps: read the bars together.
// Top, cost of one day's input tokens in millions of input-token equivalents (1 token at the base price = 1; the price
// per million cancels), against the no-caching line of 440 M (200,000 × 2,200):
//   no caching       440 M = 240 M fixed part + 200 M changing part;
//   with caching     226.76 M = writes 3.0 + reads 23.76 + changing 200 (1 % of requests miss and write; read 0.1×,
//                    write 1.25×; illustrative miss rate, multipliers from Anthropic's docs, November 2026);
//   a date in line 1 500 M = every request writes (300 M) + changing 200 M: 60 M over the line, 14 % worse than none.
// Bottom, first token: 400 ms = 312 ms queue and network + 88 ms prefill of 2,200 tokens (0.04 ms/token, illustrative);
//   with a hit only the changing 1,000 tokens are prefilled: 40 ms, so the first token is at 352 ms (12 % sooner).
// Colours: the fixed part violet (the cache), the changing part orange (the prompt), prefill teal (compute), the broken
// day red (where something breaks), plus neutral.

const X = 20;
const mk = (id: string, y: number, label: string, used: number, segments: MeterSegment[]) =>
  meter(id, X, y, {
    label,
    used: Math.round(used * 100) / 100,
    limit: PCACHE_DAY.none,
    unit: "M",
    width: 820,
    max: 520,
    limitLabel: `no caching: ${PCACHE_DAY.none} M`,
    segments: segments,
  }).map((s) => ({ ...s, quiet: true }));

const fixedNone = (TRAFFIC.requestsPerDay * PCACHE_PROMPT.fixed) / 1_000_000;
const shapes: LayoutShape[] = [
  ...mk("none", 14, "Without caching, per day", PCACHE_DAY.none, [
    { value: fixedNone, tone: PROD_TONE.store },
    { value: PCACHE_DAY.changing, tone: PROD_TONE.traffic },
  ]),
  ...mk("cached", 104, "With caching: 1 % of requests write, the rest read", PCACHE_DAY.cached, [
    { value: PCACHE_DAY.writes, tone: PROD_TONE.store },
    { value: PCACHE_DAY.reads, tone: PROD_TONE.store },
    { value: PCACHE_DAY.changing, tone: PROD_TONE.traffic },
  ]),
  ...mk("broken", 194, "Broken: a date in line 1, every request writes", PCACHE_DAY.broken, [
    { value: PCACHE_DAY.brokenWrites, tone: PROD_TONE.failure },
    { value: PCACHE_DAY.changing, tone: PROD_TONE.traffic },
  ]),
];

const spans: WaterfallSpan[] = [
  { id: "other", label: "Queue + network", startMs: 0, durationMs: PCACHE_TTFT.other, tone: PROD_TONE.infra },
  {
    id: "full",
    label: "Prefill, no caching",
    startMs: PCACHE_TTFT.other,
    durationMs: PCACHE_TTFT.prefillFull,
    tone: PROD_TONE.compute,
    note: `${n(TOKENS.inputPerRequest)} tokens · first token ${LATENCY.firstTokenMs} ms`,
  },
  {
    id: "hit",
    label: "Prefill, cache hit",
    startMs: PCACHE_TTFT.other,
    durationMs: PCACHE_TTFT.prefillCached,
    tone: PROD_TONE.compute,
    highlight: true,
    note: `${n(PCACHE_PROMPT.changing)} tokens · first token ${Math.round(PCACHE_TTFT.firstTokenCached)} ms`,
  },
];
const WF_Y = 322;
const wf = waterfallSize(spans, { width: 820, labelW: 150, total: false });

const head: LayoutShape = {
  id: "ttft-head",
  type: "text",
  x: X,
  y: WF_Y - 26,
  w: 330,
  h: 20,
  label: "First token (illustrative prefill speed)",
  tone: PROD_TONE.infra,
  quiet: true,
};
void PCACHE_PRICE;

const legend: LayoutShape = {
  id: "legend",
  type: "text",
  x: X,
  y: WF_Y + wf.height + 6,
  w: 760,
  h: 20,
  label: "Bars: millions of input-token equivalents per day. Violet: the fixed prefix. Orange: the part that changes.",
  tone: PROD_TONE.infra,
  quiet: true,
};

shapes.push(head, legend, ...waterfall("ttft", X, WF_Y, spans, { width: 820, labelW: 150, total: false }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Caching Brightpost's fixed prefix: cost per day and time to first token",
  width: 880,
  height: WF_Y + wf.height + 40,
  shapes,
};

export default spec;
