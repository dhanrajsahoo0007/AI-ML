import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, gate, gateSize, n } from "@/components/diagrams/presets/production";
import { EVAL_RUN, QUALITY, pct } from "@/components/diagrams/presets/production-release";
import { BAND, GATE, NOISE_MEAN } from "@/components/diagrams/presets/production-regress";

// The regression gate in CI for a prompt change (automated-regression-testing, Architecture figure).
// Step 1: the path of a change: pull request -> the 200-ticket suite runs -> compare with the stored baseline run ->
//   allow or block. Step 2: prompt p12 passes all three checks. Step 3: prompt p13 fails two of them and is blocked.
// Rules of the gate (presets/production-regress.ts; pass counts are illustrative, the rule is Brightpost's choice):
//   1 floor: at least 85 % of 200 = 170 passes (QUALITY.floor);
//   2 drift from baseline: no drop beyond the noise band, 180 +- 4.5 cases (5 runs of the live prompt; sd 2.236);
//   3 must-pass: the 12 refund-limit cases pass every time.
// Working: p12 184 of 200 = 92 %; 184 - 180 = +4, inside the band, so no drop. p13 164 of 200 = 82 %, under 170;
//   164 - 180 = -16, beyond -4.5. One run is 200 x 2,200 = 440,000 input tokens.
// Layout (880 x 488): step 1 row at y 20 (four boxes 170 wide, pitch 235); gate p12 at x 20, y 150; gate p13 at x 20,
// y 330; notes at x 610. Colour: change neutral, checks lime, baseline violet (a stored run), results green or red.
// Red only on the failing checks and the block.

const X = 20;
const NOTE_X = 610;
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

const flow = [
  { id: "pr", label: "Prompt change", sub: "pull request", tone: PROD_TONE.infra },
  { id: "suite", label: "Suite runs", sub: `${EVAL_RUN.tickets} golden tickets`, tone: PROD_TONE.check },
  {
    id: "baseline",
    label: "Compare",
    sub: `with baseline: ${NOISE_MEAN} of ${EVAL_RUN.tickets}`,
    tone: PROD_TONE.store,
  },
  { id: "verdict", label: "Allow or block", sub: "the merge button", tone: PROD_TONE.model },
];
const shapes: LayoutShape[] = [];
flow.forEach((f, i) => {
  shapes.push({
    id: f.id,
    type: "box",
    x: X + i * 215,
    y: 20,
    w: 185,
    h: 56,
    label: f.label,
    sub: f.sub,
    tone: f.tone,
    fill: "pastel",
    step: 1,
  });
  if (i > 0) shapes.push({ id: `fa-${i}`, type: "arrow", x: 0, y: 0, from: flow[i - 1].id, to: f.id, step: 1 });
});
shapes.push(
  text(
    "flow-note",
    X,
    88,
    840,
    36,
    `One run sends ${n(EVAL_RUN.inputTokens)} input tokens (${(EVAL_RUN.shareOfDay * 100).toFixed(1)} % of a day's input). The baseline is the stored run of the live prompt.\nThe gate has three rules: a floor, no drop beyond the noise band, and no broken must-pass case.`,
    1
  )
);

const band = `${BAND.low.toFixed(1)} to ${BAND.high.toFixed(1)}`;
const cases: [string, number, number, string][] = [
  ["p12", 2, 150, "Prompt p12"],
  ["p13", 3, 330, "Prompt p13"],
];
cases.forEach(([key, step, y, name]) => {
  const pass = key === "p12" ? EVAL_RUN.goodPass : GATE.badPass;
  const delta = pass - NOISE_MEAN;
  const floorOk = pass >= GATE.floorPass;
  const dropOk = delta >= -BAND.half;
  const ok = floorOk && dropOk;
  const opts = {
    step,
    change: { label: name, sub: "pull request" },
    checks: [
      {
        label: `Floor ${pct(QUALITY.floor)}`,
        pass: floorOk,
        sub: `${pass} of ${EVAL_RUN.tickets} · needs ${GATE.floorPass}`,
      },
      {
        label: "Drop vs baseline",
        pass: dropOk,
        sub: `${delta >= 0 ? "+" : "−"}${Math.abs(delta)} cases · band ±${BAND.half.toFixed(1)}`,
      },
      { label: "Must-pass cases", pass: true, sub: `${GATE.mustPass} of ${GATE.mustPass} refund-limit` },
    ],
    result: ok ? ("promote" as const) : ("block" as const),
    resultLabel: ok ? "Allow" : "Block",
    resultSub: ok ? "merge" : "fix the prompt",
  };
  const { height } = gateSize(opts);
  shapes.push(...gate(key, X, y, opts));
  shapes.push(
    text(
      `${key}-note`,
      NOTE_X,
      y + height / 2 - 34,
      260,
      68,
      ok
        ? `${pass} of ${EVAL_RUN.tickets} = ${pct(pass / EVAL_RUN.tickets)}, up ${delta} from ${NOISE_MEAN}.\nThe band is ${band}:\n+${delta} is inside it, so no drop.`
        : `${pass} of ${EVAL_RUN.tickets} = ${pct(pass / EVAL_RUN.tickets)}, under the floor of ${GATE.floorPass}.\n${Math.abs(delta)} cases below baseline, far\noutside the band ${band}.`,
      step
    )
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A regression gate in CI: a prompt change, the suite, the baseline, a verdict",
  width: 880,
  height: 504,
  steps: [
    { title: "A change runs the suite and meets the baseline" },
    { title: "Prompt p12 passes all three rules" },
    { title: "Prompt p13 fails two and is blocked" },
  ],
  shapes,
};

export default spec;
