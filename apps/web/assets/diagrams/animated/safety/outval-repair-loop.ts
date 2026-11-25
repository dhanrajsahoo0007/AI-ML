import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { RETRY, arr, blk, note } from "@/components/diagrams/presets/production-safety";

// The repair loop (guardrails-output-validation, Deep dive): an invalid output comes back to the model with the
// validator's error, the model tries again, and after a fixed number of retries a safe fallback takes over.
//   Step 1 attempt 1 returns the amount as text · 2 the schema check fails and names the field · 3 the error goes back
//   into the prompt and attempt 2 is valid · 4 the cap: after 2 retries a fallback. Worst case if every attempt takes the
//   full 1,500 ms: 3 attempts × 1,500 ms = 4,500 ms (RETRY in presets/production-safety.ts, from LATENCY.fullAnswerMs).
// Grid (880 wide): columns x 20 | 330 | 640 (w 220); rows y 30 | 190 | 330 (h 68).
// Colours (PROD_TONE): attempts green (the model), validator lime, the error red (a failure), pass orange, fallback neutral.

const COLS = [20, 330, 640] as const;
const W = 220;

const shapes: LayoutShape[] = [
  blk("a1", COLS[0], 30, W, 68, "Attempt 1", `amount: "£${REFUND_CASE.price}" (text)`, PROD_TONE.model, 1),
  blk("v1", COLS[1], 30, W, 68, "Schema check", "amount must be a number", PROD_TONE.check, 2),
  blk(
    "err",
    COLS[2],
    30,
    W,
    68,
    "Error: amount is text",
    `expected number, got "£${REFUND_CASE.price}"`,
    PROD_TONE.failure,
    2,
    true
  ),
  arr("a1-v1", "a1", "v1", 2, "fails"),
  arr("v1-err", "v1", "err", 2),
  blk("a2", COLS[0], 190, W, 68, "Attempt 2", `amount: ${REFUND_CASE.price} (number)`, PROD_TONE.model, 3),
  blk("v2", COLS[1], 190, W, 68, "Schema check", "passes", PROD_TONE.check, 3),
  blk("ok", COLS[2], 190, W, 68, "Answer goes on", "to the policy check", PROD_TONE.traffic, 3),
  arr("err-a2", "err", "a2", 3, "error added to the prompt", {
    via: [
      [750, 144],
      [130, 144],
    ],
  }),
  arr("a2-v2", "a2", "v2", 3),
  arr("v2-ok", "v2", "ok", 3, "valid"),
  blk("fb", COLS[1], 330, W, 68, "Fallback", "safe template, hand off to a person", PROD_TONE.infra, 4, true),
  arr("v2-fb", "v2", "fb", 4, "still invalid after 2 retries", { dashed: true }),
  note(
    "cost",
    20,
    420,
    `Cap: ${RETRY.maxRetries} retries. If each attempt takes the full 1,500 ms, worst case is ${RETRY.attempts} × 1,500 = ${RETRY.worstCaseMs.toLocaleString("en-GB")} ms before the fallback.`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The repair loop: error back, retry, fallback",
  width: 880,
  height: 456,
  steps: [
    { title: "The first attempt returns text" },
    { title: "The check fails and says why" },
    { title: "The error goes back; the retry is valid" },
    { title: "A cap, then a fallback" },
  ],
  shapes,
};

export default spec;
