import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { JUDGE_AGREEMENT, JUDGE_CALIBRATION } from "@/components/diagrams/presets/agents-eval";

// Checking a model judge against a person (agentic-ai-evaluation, Core concepts). A 2 × 2 grid of 50 graded Brightpost
// runs: columns are the person's label (fail, pass), rows the judge's verdict (fail, pass). The diagonal is agreement
// (16 + 27 = 43 of 50, 86 %); the off-diagonal cells are the judge's errors. The 5 failures the judge passed are the
// cell that matters most, so they are red and ringed (the one highlight). The arithmetic sits to the right in boxes:
// agreement, failures caught (16 of 21, 76 %) and Cohen's kappa (0.71). Counts are illustrative (presets/agents-eval).
//
// Two steps: 1 the grid and the agreement · 2 the missed failures, failures caught and kappa.
//
// Layout: column headings at y 44 over a grid from x 170, y 70 (cells 160 × 80, gap 6); row headings at x 20; column
// totals and "Illustrative counts" under the grid; three score boxes (280 × 50) from x 560.
//
// Colour (agents legend): agreement cells and score boxes lime (a check), false alarms neutral, missed failures red
// (where the judge breaks). Two tones plus neutral.

const J = JUDGE_CALIBRATION;
const A = JUDGE_AGREEMENT;
const GX = 170;
const GY = 70;
const CW = 160;
const CH = 80;
const G = 6;
const col = (i: number) => GX + i * (CW + G);
const row = (i: number) => GY + i * (CH + G);
const PX = 560;

const cells: LayoutShape[] = [
  { id: "ff", c: 0, r: 0, n: J.bothFail, sub: "both say fail", tone: AGENT_TONE.check, fill: "pastel" as const },
  { id: "pf", c: 1, r: 0, n: J.falseAlarm, sub: "false alarms", tone: AGENT_TONE.infra, fill: "soft" as const },
  {
    id: "fp",
    c: 0,
    r: 1,
    n: J.missed,
    sub: "missed failures",
    tone: AGENT_TONE.failure,
    fill: "pastel" as const,
    highlight: true,
    step: 2,
  },
  { id: "pp", c: 1, r: 1, n: J.bothPass, sub: "both say pass", tone: AGENT_TONE.check, fill: "pastel" as const },
].map((cell) => ({
  id: cell.id,
  type: "cell" as const,
  x: col(cell.c),
  y: row(cell.r),
  w: CW,
  h: CH,
  label: String(cell.n),
  sub: cell.sub,
  tone: cell.tone,
  fill: cell.fill,
  highlight: cell.highlight,
  step: cell.step,
}));

const text = (id: string, x: number, y: number, w: number, label: string, step?: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** One arithmetic line as a box, three stacked beside the grid (50 high, 8 apart). */
const score = (id: string, i: number, label: string, sub: string, step?: number): LayoutShape => ({
  id,
  type: "box",
  x: PX,
  y: GY + i * 58,
  w: 280,
  h: 50,
  label,
  sub,
  tone: AGENT_TONE.check,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A model judge against a person on 50 runs",
  width: 880,
  height: row(2) + 60,
  steps: [{ title: "Where the judge and the person agree" }, { title: "The failures the judge missed" }],
  shapes: [
    text("top", GX, 14, 2 * CW + G, "The person's label"),
    text("c0", col(0), 44, CW, "Fail"),
    text("c1", col(1), 44, CW, "Pass"),
    text("r0", 20, row(0) + CH / 2 - 10, 140, "Judge says fail"),
    text("r1", 20, row(1) + CH / 2 - 10, 140, "Judge says pass"),
    ...cells,
    text("t0", col(0), row(2) + 6, CW, `${A.personFail} failures`),
    text("t1", col(1), row(2) + 6, CW, `${A.personPass} passes`),
    text("note", GX, row(2) + 30, 2 * CW + G, `Illustrative counts`),
    score("m0", 0, `Agreement: ${pct(A.agreement)}`, `${J.bothFail} + ${J.bothPass} = ${A.agree} of ${J.total} agree`),
    score("m1", 1, `Failures caught: ${pct(A.failuresCaught)}`, `${J.bothFail} of ${A.personFail} failures`, 2),
    score("m2", 2, `Cohen's κ: ${A.kappa.toFixed(2)}`, "agreement beyond chance", 2),
  ],
};

export default spec;
