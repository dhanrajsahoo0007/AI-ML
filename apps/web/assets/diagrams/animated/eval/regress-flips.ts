import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import {
  FLIPS,
  FLIPS_BASE_PASS,
  FLIPS_CAND_PASS,
  FLIPS_CHANGED,
  FLIPS_NET,
  FLIPS_TOTAL,
  FLIPS_UNCHANGED,
  NOISE_FLIPS,
} from "@/components/diagrams/presets/production-regress";

// The 200 golden tickets scored under the live prompt p11 and the candidate p12, case by case (automated-regression-
// testing, Deep dive: flips). One bar, 4 px a case, four segments (presets/production-regress.ts; counts illustrative):
//   fixed 10 (failed under p11, passes under p12) · broken 6 (passed, now fails) · both fail 10 · both pass 174.
//   Check: 10 + 6 + 10 + 174 = 200. p11 passes 174 + 6 = 180; p12 passes 174 + 10 = 184. Net +4; cases changed 16.
// Steps: 1 the bar and its key · 2 the totals hide the flips: net 10 - 6 = +4, but 16 cases changed · 3 the yardstick:
//   two runs of the same prompt already disagree on about 10 cases (2 x run-to-run variance 5), so 16 changed cases
//   is only 6 above noise, and the 6 broken ones are the ones to read.
// Layout (880 x 330): bar x 40, y 60, 800 wide, 52 tall; key at y 136 in two columns; totals at y 214; noise bar y 276.
// Colour: fixed green, broken red (something breaks), unchanged neutral; no other tones.

const X = 40;
const PX = 4;
const BAR_Y = 60;
const segs = [
  {
    id: "fixed",
    n: FLIPS.fixed,
    tone: PROD_TONE.model,
    fill: "pastel" as const,
    label: "10 fixed",
    sub: "fail, now pass",
  },
  {
    id: "broken",
    n: FLIPS.broken,
    tone: PROD_TONE.failure,
    fill: "pastel" as const,
    label: "6 broken",
    sub: "pass, now fail",
  },
  {
    id: "bothfail",
    n: FLIPS.bothFail,
    tone: PROD_TONE.infra,
    fill: "paper" as const,
    label: "10 still fail",
    sub: "fail both times",
  },
  {
    id: "bothpass",
    n: FLIPS.bothPass,
    tone: PROD_TONE.infra,
    fill: "pastel" as const,
    label: "174 still pass",
    sub: "pass both times",
  },
];
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

const shapes: LayoutShape[] = [
  text(
    "head",
    X,
    14,
    800,
    36,
    `${FLIPS_TOTAL} golden tickets, graded under the live prompt p11 and under the candidate p12.\nEach bar segment is a group of cases (4 pixels a case). Counts are illustrative.`,
    1
  ),
];
let cx = X;
segs.forEach((s) => {
  const w = s.n * PX;
  shapes.push({
    id: `seg-${s.id}`,
    type: "box",
    x: cx,
    y: BAR_Y,
    w,
    h: 52,
    label: String(s.n),
    tone: s.tone,
    fill: s.fill,
    step: 1,
  });
  cx += w;
});
// key: two columns under the bar
segs.forEach((s, i) => {
  const kx = X + (i % 2) * 400;
  const ky = 134 + Math.floor(i / 2) * 34;
  shapes.push(
    { id: `key-${s.id}`, type: "box", x: kx, y: ky, w: 22, h: 22, tone: s.tone, fill: s.fill, step: 1 },
    text(`key-${s.id}-t`, kx + 30, ky, Math.round(`${s.label}: ${s.sub}`.length * 6.6), 22, `${s.label}: ${s.sub}`, 1)
  );
});
shapes.push(
  text(
    "totals",
    X,
    214,
    800,
    36,
    `Passes: p11 ${FLIPS_BASE_PASS}, p12 ${FLIPS_CAND_PASS}. Net change: ${FLIPS.fixed} fixed − ${FLIPS.broken} broken = +${FLIPS_NET}.\nCases that changed: ${FLIPS.fixed} + ${FLIPS.broken} = ${FLIPS_CHANGED}. Unchanged: ${FLIPS_UNCHANGED}.`,
    2
  ),
  text(
    "noise-head",
    X,
    262,
    800,
    20,
    `Run p11 twice, with no change at all: about ${NOISE_FLIPS} cases change by themselves.`,
    3
  ),
  {
    id: "noise-seg",
    type: "box",
    x: X,
    y: 290,
    w: NOISE_FLIPS * PX,
    h: 28,
    label: String(NOISE_FLIPS),
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 3,
  },
  {
    id: "chg-seg",
    type: "box",
    x: X + NOISE_FLIPS * PX + 60,
    y: 290,
    w: FLIPS_CHANGED * PX,
    h: 28,
    label: String(FLIPS_CHANGED),
    tone: PROD_TONE.infra,
    fill: "paper",
    highlight: true,
    step: 3,
  },
  text("noise-t", X + NOISE_FLIPS * PX + 8, 290, 50, 28, "noise", 3),
  text(
    "chg-t",
    X + NOISE_FLIPS * PX + 60 + FLIPS_CHANGED * PX + 8,
    290,
    420,
    28,
    `p12: ${FLIPS_CHANGED} changed, only ${FLIPS_CHANGED - NOISE_FLIPS} above noise. Read the ${FLIPS.broken} broken ones.`,
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Of 200 golden cases, how many were fixed, broken and unchanged",
  width: 880,
  height: 336,
  steps: [
    { title: "Each case is fixed, broken or unchanged" },
    { title: "The net hides the flips" },
    { title: "Compare the flips with noise" },
  ],
  shapes,
};

export default spec;
