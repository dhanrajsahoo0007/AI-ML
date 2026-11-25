import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, type WaterfallSpan, n, waterfall, waterfallSize } from "@/components/diagrams/presets/production";
import { OVERHEAD } from "@/components/diagrams/presets/production-gateway";

// What the gateway adds to one Brightpost support request on a cache miss (llm-gateway, "Latency overhead and high
// availability"). Static, two panels on one canvas:
//   top: the whole request on one axis. Key and limits 0–3 ms, cache lookup 3–6 (miss), input guardrail 6–26,
//     provider call 26–1,526 (first token at 26 + 400 = 426 ms), output guardrail on the last chunk 1,526–1,536, then
//     the log line 1,536–1,541, after the reply. Reply done at 1,536 ms; the gateway's share 36 ÷ 1,536 = 2.3 %.
//   bottom: the first 26 ms zoomed in, so the three gateway spans that were slivers above get their own scale; the
//     input guardrail (20 of the 26 ms) is ringed as the one to watch.
// All timings illustrative except the shared 400 ms first token and 1,500 ms answer (LATENCY); the arithmetic is in
// presets/production-gateway.ts OVERHEAD.
//
// Grid: each panel has a 12.5 px title at its top-left; panel 1 from y 0, panel 2 below it, both from x 10 and fitted
// to 740 wide by waterfallSize.
// Colours (PROD_TONE): key and limits neutral (control), cache violet (a store), guardrails lime (checks), the
// provider call green (the model), the log line blue (data). Four tones plus neutral.

const O = OVERHEAD;
const X = 10;
const WIDTH = 740;

const keySpan: WaterfallSpan = {
  id: "key",
  label: "Key and limits",
  startMs: 0,
  durationMs: O.keyMs,
  tone: PROD_TONE.infra,
};
const cacheSpan: WaterfallSpan = {
  id: "cache",
  label: "Cache lookup",
  startMs: O.keyMs,
  durationMs: O.cacheMs,
  tone: PROD_TONE.store,
  note: "miss",
};
const guardIn: WaterfallSpan = {
  id: "guard-in",
  label: "Input guardrail",
  startMs: O.keyMs + O.cacheMs,
  durationMs: O.inputGuardMs,
  tone: PROD_TONE.check,
  note: "PII and policy",
};

const whole: WaterfallSpan[] = [
  keySpan,
  cacheSpan,
  { ...guardIn, note: undefined },
  { id: "provider", label: "Provider call", startMs: O.sendAtMs, durationMs: O.providerMs, tone: PROD_TONE.model },
  {
    id: "guard-out",
    label: "Output guardrail",
    startMs: O.sendAtMs + O.providerMs,
    durationMs: O.outputGuardMs,
    tone: PROD_TONE.check,
    note: "last chunk",
  },
  {
    id: "log",
    label: "Log and spend",
    startMs: O.doneMs,
    durationMs: O.logMs,
    tone: PROD_TONE.data,
    note: "after the reply",
  },
];
const wholeOpts = {
  width: WIDTH,
  tickMs: 250,
  total: { ms: O.doneMs, label: `reply done ${n(O.doneMs)} ms` },
  marks: [{ ms: O.firstTokenMs, label: `first token ${n(O.firstTokenMs)} ms`, tone: PROD_TONE.model }],
};

const zoom: WaterfallSpan[] = [keySpan, cacheSpan, { ...guardIn, highlight: true }];
const zoomOpts = {
  width: WIDTH,
  tickMs: 5,
  labelW: waterfallSize(whole, wholeOpts).axisX - 10,
  total: { ms: O.sendAtMs, label: `sent to the provider at ${O.sendAtMs} ms` },
};

const TITLE_H = 26;
const wholeSize = waterfallSize(whole, { ...wholeOpts, labelW: zoomOpts.labelW });
const ZOOM_Y = TITLE_H + wholeSize.height + 34;
const zoomSize = waterfallSize(zoom, zoomOpts);

const title = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
});

const wholeTitle = `One request, end to end: the gateway adds ${O.addedMs} ms of ${n(O.doneMs)} (${(O.doneShare * 100).toFixed(1)} %)`;
const zoomTitle = `The first ${O.sendAtMs} ms, zoomed in: ${O.sendAtMs} ms of a ${n(O.firstTokenMs)} ms first token (${Math.round(O.firstTokenShare * 100)} %)`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "What the gateway adds to one request",
  width: 760,
  height: ZOOM_Y + TITLE_H + zoomSize.height + 6,
  shapes: [
    title("whole-title", 0, wholeTitle),
    ...waterfall("w", X, TITLE_H, whole, { ...wholeOpts, labelW: zoomOpts.labelW }),
    title("zoom-title", ZOOM_Y, zoomTitle),
    ...waterfall("z", X, ZOOM_Y + TITLE_H, zoom, zoomOpts),
  ],
};

export default spec;
