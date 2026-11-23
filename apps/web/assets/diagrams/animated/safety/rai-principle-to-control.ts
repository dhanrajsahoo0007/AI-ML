import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { arr, blk, note } from "@/components/diagrams/presets/production-safety";

// From a principle to a control to evidence (responsible-ai-and-alignment, Core concepts). Three Brightpost rows;
// a principle with no control is a slogan, a control with no evidence is a hope. No numbers are drawn.
//   Step 1 the three principles · 2 a control for each · 3 the evidence that the control ran · 4 the rule of thumb.
// Grid (880 wide): columns x 20 | 315 | 610 (w 250); rows y 60 | 150 | 240 (h 64); rule box y 340.
// Colours (PROD_TONE): principle neutral, control lime (a check), evidence blue (data). Three tones plus neutral.

const COLS = [20, 315, 610] as const;
const ROWS = [60, 150, 240] as const;
const W = 250;

const rows = [
  {
    id: "acc",
    principle: ["Accountability", "A named person owns each decision"],
    control: ["Approval queue", `refunds over £${REFUND_CASE.approvalLimit} wait for a person`],
    evidence: ["Approval log", "every large refund has an approver"],
  },
  {
    id: "fair",
    principle: ["Fairness", "Same help whatever the name or language"],
    control: ["Counterfactual test", "same ticket, one attribute swapped"],
    evidence: ["Gap per group", "on the golden set, before release"],
  },
  {
    id: "trans",
    principle: ["Transparency", "People know it is an AI"],
    control: ["Disclosure and hand-off", "banner plus an ask-for-a-person button"],
    evidence: ["Release checklist", "banner test passes; hand-off rate tracked"],
  },
] as const;

const shapes: LayoutShape[] = [
  note("h-principle", COLS[0], 22, "Principle: what we promise", 1),
  note("h-control", COLS[1], 22, "Control: what we built", 2),
  note("h-evidence", COLS[2], 22, "Evidence: what shows it ran", 3),
];
rows.forEach((r, i) => {
  shapes.push(
    blk(`${r.id}-p`, COLS[0], ROWS[i], W, 64, r.principle[0], r.principle[1], PROD_TONE.infra, 1),
    blk(`${r.id}-c`, COLS[1], ROWS[i], W, 64, r.control[0], r.control[1], PROD_TONE.check, 2),
    blk(`${r.id}-e`, COLS[2], ROWS[i], W, 64, r.evidence[0], r.evidence[1], PROD_TONE.data, 3),
    arr(`${r.id}-a1`, `${r.id}-p`, `${r.id}-c`, 2),
    arr(`${r.id}-a2`, `${r.id}-c`, `${r.id}-e`, 3)
  );
});
shapes.push(
  blk(
    "rule",
    20,
    340,
    840,
    52,
    "A principle without a control is a slogan",
    "A control without evidence is a hope",
    PROD_TONE.check,
    4,
    true
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Principle, control, evidence",
  width: 880,
  height: 412,
  steps: [
    { title: "Three principles" },
    { title: "Each becomes a control" },
    { title: "Each control leaves evidence" },
    { title: "The test for a principle" },
  ],
  shapes,
};

export default spec;
