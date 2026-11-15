import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import {
  BAND,
  BAND_POINTS,
  KRUN_INPUT,
  KRUN_SHARE,
  NOISE_K,
  NOISE_MEAN,
  NOISE_RUNS,
  NOISE_SD,
  NOISE_VAR,
} from "@/components/diagrams/presets/production-regress";
import { EVAL_RUN } from "@/components/diagrams/presets/production-release";

// The noise band for the golden-set pass count (automated-regression-testing, Deep dive: noise). Run the live prompt
// p11 k = 5 times on the 200 tickets at temperature above zero (presets/production-regress.ts; counts illustrative).
// Working: passes 177, 181, 180, 183, 179; sum 900, mean 180 (90 %). Squared deviations 9, 1, 0, 9, 1 = 20;
//   variance 20 / (5 - 1) = 5; sd = sqrt(5) = 2.24 cases. Band = mean +- 2 sd = 180 +- 4.47 = 175.5 to 184.5 (+-2.2 points).
//   Two runs of one prompt disagree on about 2 x 5 = 10 cases. Five runs cost 5 x 440,000 = 2,200,000 input tokens,
//   2,200,000 / 440,000,000 = 0.5 % of a day's input.
// Steps: 1 five runs of the unchanged prompt as dots on a pass-count scale · 2 the band, mean +- 2 sd ·
//   3 two candidates: p12 scores 184 (+4, inside the band: not a change), p14 scores 190 (+10, outside: a change).
// Layout (880 x 372): scale 170-195, 28 px a case, x = 90 + (v - 170) x 28; axis y 190; band box y 96-190; dots y 150.
// Colour: band lime (a check), run dots neutral, candidate dots green. No red: nothing here breaks.

const X0 = 90;
const PX = 28;
const AXIS_Y = 190;
const xOf = (v: number) => Math.round((X0 + (v - 170) * PX) * 10) / 10;
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone,
  step,
  quiet: true,
});

const shapes: LayoutShape[] = [
  text(
    "head",
    40,
    10,
    800,
    36,
    `Pass count on the ${EVAL_RUN.tickets}-ticket golden set, same prompt p11, run ${NOISE_K} times at temperature above zero.\nEach dot is one run of the same prompt. Counts are illustrative.`,
    1
  ),
  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0 - 10, AXIS_Y],
      [xOf(195) + 10, AXIS_Y],
    ],
    step: 1,
  },
];
for (let v = 170; v <= 195; v += 5) {
  shapes.push(
    {
      id: `tick-${v}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [xOf(v), AXIS_Y],
        [xOf(v), AXIS_Y + 5],
      ],
      step: 1,
    },
    text(`tick-${v}-t`, xOf(v) - 16, AXIS_Y + 8, 32, 18, String(v), 1)
  );
}
shapes.push(text("axis-t", X0, AXIS_Y + 30, 700, 18, "cases passed out of 200", 1));
shapes.push({
  id: "band",
  type: "box",
  x: xOf(BAND.low),
  y: 110,
  w: Math.round((xOf(BAND.high) - xOf(BAND.low)) * 10) / 10,
  h: AXIS_Y - 110,
  tone: PROD_TONE.check,
  fill: "soft",
  step: 2,
});
NOISE_RUNS.forEach((v, i) => {
  shapes.push(
    {
      id: `run-${i}`,
      type: "circle",
      x: xOf(v),
      y: 162,
      w: 16,
      tone: PROD_TONE.infra,
      fill: "pastel",
      step: 1,
      quiet: true,
    },
    text(`run-${i}-t`, xOf(v) - 16, 130, 32, 18, String(v), 1)
  );
});
shapes.push(
  {
    id: "mean",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [xOf(NOISE_MEAN), 112],
      [xOf(NOISE_MEAN), AXIS_Y],
    ],
    dashed: true,
    step: 1,
  },
  text("mean-t", xOf(NOISE_MEAN) - 126, 92, 120, 18, `mean ${NOISE_MEAN} (90 %)`, 1),
  text(
    "band-t",
    xOf(BAND.low),
    46,
    252,
    20,
    `noise band ${BAND.low.toFixed(1)} to ${BAND.high.toFixed(1)}`,
    2,
    PROD_TONE.check
  ),
  text(
    "work",
    40,
    256,
    800,
    54,
    `mean ${NOISE_MEAN}; variance = (9 + 1 + 0 + 9 + 1) ÷ (${NOISE_K} − 1) = ${NOISE_VAR}; spread = √${NOISE_VAR} = ${NOISE_SD.toFixed(2)} cases.\nBand = mean ± 2 × spread = ${NOISE_MEAN} ± ${BAND.half.toFixed(1)} cases = ± ${(BAND_POINTS * 100).toFixed(1)} points.\n${NOISE_K} runs cost ${n(KRUN_INPUT)} input tokens, ${(KRUN_SHARE * 100).toFixed(1)} % of a day's input.`,
    2
  ),
  { id: "cand-a", type: "circle", x: xOf(184), y: 140, w: 18, tone: PROD_TONE.model, fill: "pastel", step: 3 },
  text("cand-a-t", xOf(184) - 70, 70, 140, 34, "p12: 184\n+4, inside the band", 3, PROD_TONE.model),
  {
    id: "cand-b",
    type: "circle",
    x: xOf(190),
    y: 160,
    w: 18,
    tone: PROD_TONE.model,
    fill: "pastel",
    highlight: true,
    step: 3,
  },
  text("cand-b-t", xOf(190) - 70, 112, 140, 34, "p14: 190\n+10, outside", 3, PROD_TONE.model),
  text(
    "verdict",
    40,
    322,
    800,
    36,
    "p12 is not shown to differ from p11: a rerun of p11 alone can score 184.\np14 clears the band: treat it as a change, then confirm with the paired flips.",
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The noise band: run the same prompt k times",
  width: 880,
  height: 372,
  steps: [
    { title: "Five runs of the same prompt differ" },
    { title: "The band is mean plus or minus two spreads" },
    { title: "A change inside the band is not a change" },
  ],
  shapes,
};

export default spec;
