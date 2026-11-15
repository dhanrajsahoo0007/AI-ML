import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import {
  EXPLICIT_PER_DAY,
  IMPLICIT_PER_DAY,
  IMPLICIT_RATIO,
  SIGNALS,
} from "@/components/diagrams/presets/production-human";

// Explicit and implicit feedback on Brightpost's 200,000 requests a day (human-evaluation-and-feedback, Deep dive).
// One row per signal: its name, a bar for how many requests a day carry it, and what it usually means. The counts are
// ILLUSTRATIVE shares of requests (presets/production-human): thumbs 2 % = 4,000 · written reason 0.2 % = 400 · agent
// edit 0.75 % = 1,500 · retry 4 % = 8,000 · copy 30 % = 60,000 · hand-off 5 % = 10,000. Explicit 5,900 a day, implicit
// 78,000, a ratio of 78,000 ÷ 5,900 = 13.2.
//
// Three steps: 1 explicit signals (the first three rows) · 2 implicit signals (the last three) · 3 the totals.
// Bar length is 300 px for 60,000 a day.
//
// Layout: rows 54 apart from y 36; signal boxes x 20 (190 × 40); bars from x 230; meaning text from x 600; the total
// box under the rows.
//
// Colour (production legend): the signals orange (they come from the user), the bars blue (data), the totals neutral.

const BAR_X = 230;
const MAX = 60_000;
const K = 300 / MAX;
const ROW = 54;
const TOP = 36;
const tw = (label: string) => Math.ceil(label.length * 5.2) + 2;

const shapes: LayoutShape[] = [
  {
    id: "head-a",
    type: "text",
    x: BAR_X,
    y: 8,
    w: tw("Requests a day with the signal (illustrative)"),
    h: 18,
    label: "Requests a day with the signal (illustrative)",
    tone: PROD_TONE.infra,
    quiet: true,
  },
];

SIGNALS.forEach((s, i) => {
  const y = TOP + i * ROW;
  const step = s.kind === "explicit" ? 1 : 2;
  const w = Math.max(s.perDay * K, 3);
  shapes.push(
    {
      id: `${s.id}-box`,
      type: "box",
      x: 20,
      y,
      w: 190,
      h: 40,
      label: s.name,
      sub: s.kind,
      tone: PROD_TONE.traffic,
      fill: "pastel",
      step,
    },
    {
      id: `${s.id}-bar`,
      type: "cell",
      x: BAR_X,
      y: y + 6,
      w,
      h: 28,
      tone: PROD_TONE.data,
      fill: "pastel",
      step,
      quiet: true,
    },
    {
      id: `${s.id}-n`,
      type: "text",
      x: BAR_X + w + 6,
      y: y + 11,
      w: 60,
      h: 18,
      label: n(s.perDay),
      tone: PROD_TONE.infra,
      step,
      quiet: true,
    },
    {
      id: `${s.id}-meaning`,
      type: "text",
      x: 620,
      y: y + 11,
      w: tw(s.meaning),
      h: 18,
      label: s.meaning,
      tone: PROD_TONE.infra,
      step,
      quiet: true,
    }
  );
});

const totalY = TOP + SIGNALS.length * ROW + 8;
shapes.push({
  id: "total",
  type: "box",
  x: 20,
  y: totalY,
  w: 600,
  h: 56,
  label: `Explicit ${n(EXPLICIT_PER_DAY)} a day, implicit ${n(IMPLICIT_PER_DAY)}: about ${Math.round(IMPLICIT_RATIO)} times as many`,
  sub: `of ${n(TRAFFIC.requestsPerDay)} requests; the larger pile is also the noisier one`,
  tone: PROD_TONE.infra,
  fill: "paper",
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Explicit and implicit feedback on Brightpost's requests",
  width: 880,
  height: totalY + 76,
  steps: [
    { title: "Explicit signals: rare and clear" },
    { title: "Implicit signals: common and noisy" },
    { title: "How much of each" },
  ],
  shapes,
};

export default spec;
