import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { arr, blk, note } from "@/components/diagrams/presets/production-safety";

// What was asked for against what was meant (responsible-ai-and-alignment, Core concepts). The textbook case is
// CoastRunners (a boat agent circled to hit shaping rewards instead of finishing the race; DeepMind, 2020). The
// Brightpost version: reward "tickets closed per hour" while the intent is "solve the problem within policy".
//   Step 1 intent against the specification · 2 the assistant optimises the score · 3 the gap: a £42 promise closes the
//   ticket in one turn · 4 the fixes. No numbers beyond the refund case are drawn.
// Grid (880 wide): row 1 y 24 (intent x 20, spec x 480; w 380); row 2 y 150 (model x 250, w 380); row 3 y 272; row 4 y 392.
// Colours (PROD_TONE): intent blue (data), specification lime (a metric), model green, failure red, fixes lime.

const shapes: LayoutShape[] = [
  blk(
    "intent",
    20,
    24,
    360,
    72,
    "What we meant",
    `Solve it within policy (refunds over £${REFUND_CASE.approvalLimit} need approval)`,
    PROD_TONE.data,
    1
  ),
  blk("spec", 500, 24, 360, 72, "What we measured", "Tickets closed per hour: the reward", PROD_TONE.check, 1),
  arr("intent-spec", "intent", "spec", 1, "stands in for", { dashed: true }),
  blk(
    "model",
    250,
    150,
    380,
    72,
    "The assistant optimises the score",
    "It finds the shortest path to a closed ticket",
    PROD_TONE.model,
    2
  ),
  arr("spec-model", "spec", "model", 2, "optimises"),
  blk(
    "reply",
    20,
    272,
    340,
    72,
    "“I have refunded the £42 to your card.”",
    "Ticket closed in one turn: the score goes up",
    PROD_TONE.failure,
    3
  ),
  blk(
    "miss",
    520,
    272,
    340,
    72,
    "The intent is missed",
    `£${REFUND_CASE.price} is over the £${REFUND_CASE.approvalLimit} limit; no approval asked`,
    PROD_TONE.failure,
    3,
    true
  ),
  arr("model-reply", "model", "reply", 3),
  arr("reply-miss", "reply", "miss", 3, "score up, goal missed"),
  blk(
    "fix",
    20,
    392,
    840,
    64,
    "Close the gap",
    "Put the approval rule into the grader · grade outcomes, not speed · read a sample of high scorers by hand",
    PROD_TONE.check,
    4,
    true
  ),
  note(
    "coast",
    20,
    470,
    "Textbook case: a boat agent circled to hit bonus targets instead of finishing the race (DeepMind, 2020).",
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "What was asked for against what was meant",
  width: 880,
  height: 500,
  steps: [
    { title: "A measure stands in for the goal" },
    { title: "The model optimises the measure" },
    { title: "The score rises, the goal is missed" },
    { title: "Close the gap" },
  ],
  shapes,
};

export default spec;
