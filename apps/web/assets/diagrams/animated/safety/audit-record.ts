import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, PROD_TONE } from "@/components/diagrams/presets/production";
import { blk, note } from "@/components/diagrams/presets/production-safety";

// One audit record (compliance-audit-logging, Architecture): the six facts that let a reviewer replay a decision, drawn
// for Brightpost's refund request on order 4471 (BRIGHTPOST), held because £42 is over the £30 limit. Record ids, the
// timestamp, the model name and the prompt version are ILLUSTRATIVE.
// Steps: 1 who, what and when · 2 which model and which prompt version · 3 the decision and its rule · 4 the evidence
// by reference (ids and a hash, not the text) and the hash that links it to the previous record.
// Grid (width 880): three columns x 10 | 305 | 600 (w 270, h 86); rows y 50 and 160; chain strip y 270 (w 860, h 56).
// Colours (PROD_TONE): who orange (the request), what teal (the action), when and evidence neutral, model green, decision
// lime (a check). Four tones plus neutral; the decision cell is the one highlight.

const W = 270;
const H = 86;

const shapes: LayoutShape[] = [
  note("head", 10, 14, `One audit record: the refund request for order ${BRIGHTPOST.orderId}`, 1),
  blk("who", 10, 50, W, H, "Who", `user ${BRIGHTPOST.customerId}, role customer, chat`, PROD_TONE.traffic, 1),
  blk(
    "what",
    305,
    50,
    W,
    H,
    "What",
    `create_refund, order ${BRIGHTPOST.orderId}, £${BRIGHTPOST.price}`,
    PROD_TONE.compute,
    1
  ),
  blk("when", 600, 50, W, H, "When", "16 Nov 2026, 10:08:41 UTC, req-7f3a", PROD_TONE.infra, 1),
  blk("model", 10, 160, W, H, "Which model, which prompt", "assistant-small, prompt support-v14", PROD_TONE.model, 2),
  blk(
    "decision",
    305,
    160,
    W,
    H,
    "Decision",
    `held: over £${BRIGHTPOST.approvalLimit}, needs approval`,
    PROD_TONE.check,
    3,
    true
  ),
  blk("evidence", 600, 160, W, H, "Evidence, by reference", "passage ids, input hash, no raw text", PROD_TONE.infra, 4),
  blk(
    "chain",
    10,
    270,
    860,
    56,
    "Link to the record before it",
    "prev_hash makes an edit or a deletion show up",
    PROD_TONE.infra,
    4
  ),
  note("illus", 10, 346, "Ids, timestamp, model name and prompt version are illustrative.", 1),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One audit record holds who, what, when, which model and prompt, and the decision",
  width: 880,
  height: 376,
  steps: [
    { title: "Who asked, what for, and when" },
    { title: "Which model and which prompt version" },
    { title: "The decision and the rule behind it" },
    { title: "Evidence by reference, linked to the last record" },
  ],
  shapes,
};

export default spec;
