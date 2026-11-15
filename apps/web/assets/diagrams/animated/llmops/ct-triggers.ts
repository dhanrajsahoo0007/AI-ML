import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { CT, QUALITY, pct } from "@/components/diagrams/presets/production-release";
import { DATASETS } from "@/components/diagrams/presets/production";

// Continuous training triggers for Brightpost's fine-tuned support model (cicd-ct-pipelines, Deep dive). Three things
// can start a training run: the calendar (the first of each month), a drift alarm (a weekly sample of 200 live answers
// is graded and the pass rate falls under the 85 % floor) and enough new labelled data (1,000 newly resolved tickets).
// A trigger rule lets any one of them start a run, with a guard against a run storm. The run then goes through the same
// path as any change: the golden-set evaluation, a registered candidate bundle, and the release pipeline.
//
// Working (presets/production-release.ts, CT; sample results are illustrative):
//   Schedule: 12 runs a year, whatever the data says.
//   Drift: 166 of 200 = 83 %, under the 85 % floor, so the alarm fires.
//   New data: 1,000 resolved tickets ÷ 5,000 in the fine-tuning set = 20 %.
//   Guard: at most one run in 7 days, and no new run while one is in flight.
//
// Steps: 1 schedule · 2 drift alarm · 3 new labelled data · 4 the rule and its guard · 5 run, evaluate, register ·
// 6 the release pipeline (a model never goes straight to production).
// Layout (880 x 420): triggers at y 30 (w 250, h 64) at x 15 / 315 / 615; the rule at x 315, y 170 (w 250, h 56);
// the guard note right of the rule at x 590; the chain at y 290 (four boxes w 190, gap 30, from x 15); a three-line
// note under each chain box at y 352.
// Colour (four tones plus neutral): triggers and the rule neutral (control), the drift alarm red (drift alarm in the
// legend), the training run teal, the evaluation lime, the registered candidate violet.

const trig = (
  id: string,
  x: number,
  step: number,
  label: string,
  sub: string,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "box", x, y: 30, w: 250, h: 64, label, sub, tone, fill: "pastel", step });

const chain = (id: string, i: number, step: number, label: string, sub: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "box",
  x: 15 + i * 220,
  y: 290,
  w: 190,
  h: 56,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
});

const note = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
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
  trig("schedule", 15, 1, "Schedule", `1st of the month: ${CT.scheduleRunsPerYear} runs a year`),
  trig(
    "drift",
    315,
    2,
    "Drift alarm",
    `${CT.samplePass} of ${CT.sampleSize} pass = ${pct(CT.samplePass / CT.sampleSize)}, under ${pct(QUALITY.floor)}`,
    PROD_TONE.failure
  ),
  trig(
    "data",
    615,
    3,
    "New labelled data",
    `${n(CT.ticketThreshold)} tickets = ${pct(CT.thresholdShareOfSet)} of ${n(DATASETS.fineTuneSet)}`
  ),
  {
    id: "rule",
    type: "box",
    x: 315,
    y: 170,
    w: 250,
    h: 56,
    label: "Trigger rule",
    sub: "any one of the three starts a run",
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 4,
  },
  { id: "a-schedule", type: "arrow", x: 0, y: 0, from: "schedule", to: "rule", tone: PROD_TONE.infra, step: 4 },
  { id: "a-drift", type: "arrow", x: 0, y: 0, from: "drift", to: "rule", tone: PROD_TONE.infra, step: 4 },
  { id: "a-data", type: "arrow", x: 0, y: 0, from: "data", to: "rule", tone: PROD_TONE.infra, step: 4 },
  note(
    "guard",
    590,
    176,
    280,
    44,
    `Guard: at most one run in ${CT.minDaysBetweenRuns} days,\nand none while one is running`,
    4
  ),
  chain("job", 0, 5, "Training run", "fine-tune or re-embed", PROD_TONE.compute),
  chain("eval", 1, 5, "Golden-set evaluation", "200 tickets, 85 % floor", PROD_TONE.check),
  chain("candidate", 2, 5, "Candidate bundle", "registered, not live", PROD_TONE.store),
  chain("pipeline", 3, 6, "Release pipeline", "tests, suite, canary", PROD_TONE.infra),
  { id: "a-rule-job", type: "arrow", x: 0, y: 0, from: "rule", to: "job", tone: PROD_TONE.infra, step: 5 },
  { id: "a-job-eval", type: "arrow", x: 0, y: 0, from: "job", to: "eval", tone: PROD_TONE.infra, step: 5 },
  { id: "a-eval-cand", type: "arrow", x: 0, y: 0, from: "eval", to: "candidate", tone: PROD_TONE.infra, step: 5 },
  { id: "a-cand-pipe", type: "arrow", x: 0, y: 0, from: "candidate", to: "pipeline", tone: PROD_TONE.infra, step: 6 },
  note("n-job", 15, 352, 190, 36, "immutable inputs: data\nsnapshot, code commit", 5),
  note("n-eval", 235, 352, 190, 36, "same set as the CI gate,\nso scores compare", 5),
  note("n-cand", 455, 352, 190, 36, "bundle 43 in the registry\nwith its scores", 5),
  note("n-pipe", 675, 352, 190, 36, "never straight to\nproduction", 6),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three triggers start a training run; the result goes through the release pipeline",
  width: 880,
  height: 410,
  steps: [
    { title: "A schedule starts a run" },
    { title: "A drift alarm starts a run" },
    { title: "Enough new labelled data starts a run" },
    { title: "One rule, with a guard against a run storm" },
    { title: "Train, evaluate on the golden set, register" },
    { title: "Release like any other change" },
  ],
  shapes,
};

export default spec;
