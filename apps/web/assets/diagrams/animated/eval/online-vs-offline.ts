import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import {
  RARE,
  RARE_IN_GOLDEN,
  RARE_IN_SAMPLE,
  RARE_PER_DAY,
  SAMPLED_PER_DAY,
} from "@/components/diagrams/presets/production-online";

// What offline and online evaluation each catch (online-production-evaluation, Core concepts). A matrix: five kinds of
// failure Brightpost can meet down the left; the offline suite (the 200-ticket golden set, run before release) and the
// online sample (5 % of traffic, graded after release) across. Each cell is "catches" (lime), "partly" (soft lime) or
// "misses" (neutral outline); the reason sits under the verdict.
// Working for the last row (presets/production-online.ts, the 1-in-5,000 rate is illustrative): 200,000 ÷ 5,000 = 40
// such requests a day; 5 % sampled = 2 of them in the sample; the 200-ticket set expects 200 ÷ 5,000 = 0.04 of them.
// Steps: 1 rows and the offline column · 2 the online column · 3 the summary: use both, and feed finds back.
// Layout (880 x 424): row labels x 10 (w 300); offline x 330 (w 255); online x 605 (w 255); header y 12; rows at
// y 52 + 62 i (h 52). Colour: lime for a check that catches, neutral otherwise; no red.

type Verdict = "catches" | "partly" | "misses";
const cell = (id: string, x: number, y: number, v: Verdict, label: string, sub: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w: 255,
  h: 52,
  label,
  sub,
  tone: v === "misses" ? PROD_TONE.infra : PROD_TONE.check,
  fill: v === "catches" ? "pastel" : v === "partly" ? "soft" : "paper",
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
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const rows: { fail: string; off: [Verdict, string, string]; on: [Verdict, string, string] }[] = [
  {
    fail: "A prompt edit breaks a known refund case",
    off: ["catches", "Catches", "before release, in CI"],
    on: ["partly", "Late", "after customers saw it"],
  },
  {
    fail: "A new kind of question appears: gift cards",
    off: ["misses", "Misses", `not among the ${DATASETS.goldenSet} tickets`],
    on: ["catches", "Catches", "shows up in the sample"],
  },
  {
    fail: "The provider changes the model behind an alias",
    off: ["partly", "At the next run", "nightly, not in real time"],
    on: ["catches", "Catches", "scores fall within a day"],
  },
  {
    fail: "A help article goes stale",
    off: ["misses", "Misses", "fixtures are frozen"],
    on: ["catches", "Catches", "answers quote the old policy"],
  },
  {
    fail: `A rare failure, 1 request in ${n(RARE.oneIn)}`,
    off: ["misses", "Misses", `expects ${RARE_IN_GOLDEN} such case in ${DATASETS.goldenSet}`],
    on: ["catches", `Sees ${RARE_IN_SAMPLE} a day`, `${RARE_PER_DAY} happen, 5 % sampled`],
  },
];

const shapes: LayoutShape[] = [
  text("h-off", 330, 12, 255, 30, "Offline: golden set,\nbefore release", 1),
  text("h-on", 605, 12, 255, 30, `Online: 5 % sample,\n${n(SAMPLED_PER_DAY)} of ${n(TRAFFIC.requestsPerDay)} a day`, 2),
];
rows.forEach((r, i) => {
  const y = 52 + 62 * i;
  shapes.push(
    text(`row-${i}`, 10, y, 300, 52, r.fail, 1),
    cell(`off-${i}`, 330, y, r.off[0], r.off[1], r.off[2], 1),
    cell(`on-${i}`, 605, y, r.on[0], r.on[1], r.on[2], 2)
  );
});
shapes.push(
  text(
    "summary",
    10,
    372,
    850,
    40,
    "Offline blocks the problems you already know. Online finds the ones you do not, after release.\nUse both, and turn every online find into an offline case.",
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "What offline and online evaluation each catch",
  width: 880,
  height: 424,
  steps: [
    { title: "Offline: known cases, before release" },
    { title: "Online: real traffic, after release" },
    { title: "Use both" },
  ],
  shapes,
};

export default spec;
