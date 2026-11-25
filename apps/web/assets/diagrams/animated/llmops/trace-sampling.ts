import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { SAMPLING } from "@/components/diagrams/presets/production-observe";

// Head against tail sampling for Brightpost's day of 200,000 requests (tracing-logging, Deep dive "Sampling"). No steps.
// Assumption (illustrative): 2 % of requests are slow or failed, 4,000 a day; 196,000 are ordinary. The store keeps
// about 1 % of ordinary traces in both designs.
//   Head sampling: the keep-or-drop coin is tossed at the first span, before the outcome is known, at 1 %.
//     Kept 2,000 = 40 slow or failed (1 % of 4,000) + 1,960 ordinary.
//   Tail sampling: the collector holds each trace until it ends, then keeps every slow or failed one and 1 % of the rest.
//     Kept 5,960 = 4,000 slow or failed + 1,960 ordinary (2.98 % of the day, 2.98 times the head design's storage).
//   So tail sampling keeps 4,000 ÷ 40 = 100 times as many of the traces an engineer wants, for 5,960 ÷ 2,000 = 3 times
//   the storage, and costs a buffer in the collector.
// Layout (880 x 300): two rows at y 14 and 150; each is a title line, a stacked bar (x 20, 700 px for 6,000 traces, h 28)
// and two note lines; a legend at y 270. Colours (PROD_TONE): slow or failed red (something broke), ordinary blue (data).
// Two tones plus neutral.

const SCALE_MAX = 6_000;
const BAR_W = 700;
const X = 20;
const px = (v: number) => Math.round((v / SCALE_MAX) * BAR_W * 10) / 10;

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: BAR_W,
  h: 18,
  label,
  tone,
});

const row = (
  id: string,
  y: number,
  title: string,
  kept: { interesting: number; ordinary: number },
  notes: string[]
): LayoutShape[] => {
  const wi = Math.max(px(kept.interesting), 4);
  const wo = px(kept.ordinary);
  const total = kept.interesting + kept.ordinary;
  return [
    text(`${id}-title`, X, y, title),
    {
      id: `${id}-bad`,
      type: "cell",
      x: X,
      y: y + 24,
      w: wi,
      h: 28,
      label: wi > 150 ? `${n(kept.interesting)} slow or failed` : undefined,
      tone: PROD_TONE.failure,
      fill: "pastel",
    },
    {
      id: `${id}-ok`,
      type: "cell",
      x: X + wi,
      y: y + 24,
      w: wo,
      h: 28,
      label: `${n(kept.ordinary)} ordinary`,
      tone: PROD_TONE.data,
      fill: "pastel",
    },
    { ...text(`${id}-total`, X + wi + wo + 8, y + 29, `${n(total)} kept`), w: 80 },
    ...notes.map((t, i) => text(`${id}-note-${i}`, X, y + 60 + i * 20, t)),
  ];
};

const shapes: LayoutShape[] = [
  ...row("head", 14, "Head sampling: toss the coin at the first span, 1 %", SAMPLING.head, [
    `Keeps ${SAMPLING.head.interesting} of the ${n(SAMPLING.interesting)} slow or failed traces (1 %). Nothing to buffer.`,
    "The coin does not know yet how the request will end.",
  ]),
  ...row("tail", 150, "Tail sampling: decide when the trace is complete", SAMPLING.tail, [
    `Keeps all ${n(SAMPLING.tail.interesting)} slow or failed traces and 1 % of the rest: 100 times as many of the ones you want.`,
    "Costs a buffer: the collector holds every trace until its last span arrives.",
  ]),
  text(
    "scale",
    X,
    262,
    `Traces kept out of ${n(TRAFFIC.requestsPerDay)} a day (2 % slow or failed, illustrative; red).`
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Head sampling keeps 40 of 4,000 slow or failed traces; tail sampling keeps all 4,000",
  width: 880,
  height: 292,
  shapes,
};

export default spec;
