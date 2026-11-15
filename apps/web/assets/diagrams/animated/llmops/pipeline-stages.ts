import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, gate, n } from "@/components/diagrams/presets/production";
import { EVAL_RUN, QUALITY, pct } from "@/components/diagrams/presets/production-release";

// Brightpost's release pipeline for an LLM change (cicd-ct-pipelines, Architecture figure). Five stages in a row:
// unit tests (no model calls) -> evaluation suite on the 200-ticket golden set -> build one release bundle -> canary
// (shadow, then staged traffic; see rollback-blue-green-deployment) -> promote. A change that fails a stage stops there.
//
// Working (presets/production-release.ts, EVAL_RUN; pass counts are illustrative):
//   One evaluation run = 200 tickets x 2,200 input tokens = 440,000 and 200 x 250 output tokens = 50,000, plus the judge.
//   A day of live input is 440,000,000 tokens, so one run is 440,000 / 440,000,000 = 0.1 % of a day's input.
//   Floor: 85 % of 200 = 170 passes. A good change scores 184 of 200 = 92 %; the failing change (prompt p13) 164 = 82 %.
//
// Steps 1-5 reveal one stage each, with a three-line note under it; step 6 shows a failing change in the gate().
// Layout (880 x 390): stage boxes at y 30, x 15 + 175 i (w 150, h 56); notes at y 94 (w 150, h 54, three lines of
// up to 23 characters); the gate at x 15, y 232 (about 540 wide, 100 tall) with a note beside it at x 590.
// Colour (four tones plus neutral): checks lime (tests, suite, canary), build teal, promote green, the pipeline arrows
// neutral. Red only in step 6, on the failing check and the stop.

const X0 = 15;
const PITCH = 175;
const W = 150;

const stages: { id: string; label: string; sub: string; tone: LayoutTone; note: string }[] = [
  {
    id: "tests",
    label: "Unit tests",
    sub: "every push",
    tone: PROD_TONE.check,
    note: "prompt renders\ntool schemas parse\nno model calls",
  },
  {
    id: "suite",
    label: "Evaluation suite",
    sub: `${EVAL_RUN.floorPass} of ${EVAL_RUN.tickets} to pass`,
    tone: PROD_TONE.check,
    note: `${EVAL_RUN.tickets} golden tickets\n440 k in + 50 k out\n${(EVAL_RUN.shareOfDay * 100).toFixed(1)} % of a day's input`,
  },
  {
    id: "build",
    label: "Build",
    sub: "one release bundle",
    tone: PROD_TONE.compute,
    note: "bundle 42 pinned\nsigned, in registry\nsame one ships later",
  },
  {
    id: "canary",
    label: "Canary",
    sub: "staged traffic",
    tone: PROD_TONE.check,
    note: "shadow, then 1 %,\n10 %, 50 % with\nquality + latency",
  },
  {
    id: "promote",
    label: "Promote",
    sub: "bundle 42 live",
    tone: PROD_TONE.model,
    note: "100 % of traffic,\nblue kept warm for\nbaking, then freed",
  },
];

const shapes: LayoutShape[] = [];
stages.forEach((s, i) => {
  const x = X0 + i * PITCH;
  shapes.push(
    {
      id: s.id,
      type: "box",
      x,
      y: 30,
      w: W,
      h: 56,
      label: s.label,
      sub: s.sub,
      tone: s.tone,
      fill: "pastel",
      step: i + 1,
    },
    {
      id: `${s.id}-note`,
      type: "text",
      x,
      y: 94,
      w: W,
      h: 54,
      label: s.note,
      tone: PROD_TONE.infra,
      step: i + 1,
      quiet: true,
    }
  );
  if (i > 0) {
    shapes.push({
      id: `a-${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: stages[i - 1].id,
      to: s.id,
      tone: PROD_TONE.infra,
      step: i + 1,
    });
  }
});

shapes.push(
  {
    id: "fail-head",
    type: "text",
    x: X0,
    y: 192,
    w: 420,
    h: 20,
    label: "Step 2 on a change that makes answers worse",
    tone: PROD_TONE.infra,
    step: 6,
    quiet: true,
  },
  ...gate("bad", X0, 232, {
    step: 6,
    change: { label: "Prompt p13 change", sub: "pull request" },
    checks: [
      {
        label: `Quality ${pct(EVAL_RUN.badPass / EVAL_RUN.tickets)}`,
        pass: false,
        sub: `${EVAL_RUN.badPass} of ${EVAL_RUN.tickets} · floor ${pct(QUALITY.floor)}`,
      },
      { label: "Refund-limit cases", pass: true, sub: "12 of 12 (illustrative)" },
    ],
    result: "block",
    resultLabel: "Stop",
    resultSub: "nothing is built",
  }),
  {
    id: "fail-note",
    type: "text",
    x: 610,
    y: 252,
    w: 260,
    h: 60,
    label: `Build, canary and promote never run.\nThe failure cost one run:\n${n(EVAL_RUN.inputTokens)} input tokens.`,
    tone: PROD_TONE.infra,
    step: 6,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Brightpost's pipeline for an LLM change, from unit tests to promote",
  width: 880,
  height: 360,
  steps: [
    { title: "Unit tests: fast, no model calls" },
    { title: "Evaluation suite: the 200-ticket golden set" },
    { title: "Build: one bundle, pinned and signed" },
    { title: "Canary: shadow, then staged traffic" },
    { title: "Promote: bundle 42 goes live" },
    { title: "A failing change stops at the suite" },
  ],
  shapes,
};

export default spec;
