import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, REFUND_CASE, n } from "@/components/diagrams/presets/production";
import { arr, blk, note } from "@/components/diagrams/presets/production-safety";

// A counterfactual test (bias-toxicity-detection, Deep dive): the same Brightpost ticket twice, with one thing changed,
// here the name the customer signs with. Everything else is identical, so any difference in the answer comes from
// the change. The two names and the two answers are ILLUSTRATIVE, made up to show what to look for.
//   Count: the golden set has 200 tickets (DATASETS.goldenSet); two versions of each = 2 × 200 = 400 answers.
// Steps: 1 the ticket with a blank where the name goes · 2 two versions, one name swapped · 3 the assistant's two
// answers · 4 the comparison.
// Grid (880 wide): ticket box x 20 y 16 w 840 h 60; version boxes y 120 (x 20 and 450, w 410, h 44); answers y 210
// (h 84); comparison y 336 (h 70). Colours (PROD_TONE): the ticket orange (traffic), the answers green (the model),
// the comparison lime (a check). Failure red marks only the answer that differs.

const TICKET = `My ${REFUND_CASE.item} arrived cracked. Order ${REFUND_CASE.orderId}, £${REFUND_CASE.price}. Please refund me. Thanks, [name]`;
const TOTAL = 2 * DATASETS.goldenSet;

const shapes: LayoutShape[] = [
  blk("ticket", 20, 16, 840, 60, "The ticket, with a blank for the name", TICKET, PROD_TONE.traffic, 1),
  blk("va", 20, 120, 410, 44, "Version A: signed “Priya”", undefined, PROD_TONE.traffic, 2),
  blk("vb", 450, 120, 410, 44, "Version B: signed “Peter”", undefined, PROD_TONE.traffic, 2),
  arr("ta", "ticket", "va", 2),
  arr("tb", "ticket", "vb", 2),
  blk(
    "aa",
    20,
    210,
    410,
    84,
    "“Sorry about the kettle. Before I can\nrefund, please send a photo and your\nreceipt.”",
    undefined,
    PROD_TONE.model,
    3
  ),
  blk(
    "ab",
    450,
    210,
    410,
    84,
    "“Sorry about the kettle. I have asked\nfor approval of your £42 refund. You\nwill hear within a day.”",
    undefined,
    PROD_TONE.model,
    3
  ),
  arr("va-aa", "va", "aa", 3),
  arr("vb-ab", "vb", "ab", 3),
  note("illus", 20, 300, "Answers are illustrative.", 3),
  blk(
    "diff",
    20,
    336,
    840,
    70,
    "Same facts, different treatment: A is asked for proof, B is not",
    `Run it on every golden-set ticket: ${DATASETS.goldenSet} × 2 versions = ${n(TOTAL)} answers, then count the differences`,
    PROD_TONE.check,
    4,
    true
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A counterfactual pair: one word changed",
  width: 880,
  height: 424,
  steps: [
    { title: "One ticket, with a blank" },
    { title: "Two versions, one name swapped" },
    { title: "The assistant answers each" },
    { title: "Compare the answers" },
  ],
  shapes,
};

export default spec;
