import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { arr, blk, note } from "@/components/diagrams/presets/production-safety";

// The action ladder (hallucination-safety-detection, Architecture): what the system does with a detection result, from
// light to heavy as the risk rises. Thresholds are ILLUSTRATIVE; a team sets them on its own labelled data.
//   Rung 1 cite: every claim supported (faithfulness 1.00) · 2 flag: 0.80 to 0.99 and nothing costs money ·
//   3 abstain: under 0.80, or no passage found · 4 hand off: the answer would move money or promise a policy.
// One rung per step. Grid (880 wide): rows y 40 + 94 i (h 72); columns x 20 (w 280, trigger) | 330 (w 240, action) |
// 590 (w 270, example). Colours (PROD_TONE): triggers blue (data, the detection result), cite and flag lime (checks),
// abstain neutral, hand off orange (a person is traffic on these pages); examples are annotations.

const ROW = (i: number) => 40 + i * 94;
const rungs = [
  {
    id: "cite",
    trigger: ["Every claim supported", "faithfulness 1.00"],
    action: ["Cite", "answer with a source link"],
    example: "Returns within 30 days,\nwith the help article",
    tone: PROD_TONE.check,
  },
  {
    id: "flag",
    trigger: ["Some claims weak, nothing at stake", "0.80 to 0.99 (illustrative)"],
    action: ["Flag", "send marked unverified, log it"],
    example: "A delivery estimate the\npassages do not give",
    tone: PROD_TONE.check,
  },
  {
    id: "abstain",
    trigger: ["Low score or no passage found", "under 0.80 (illustrative)"],
    action: ["Abstain", "cannot confirm; link the help page"],
    example: "“Refunds arrive in 2 days”:\nno passage says so",
    tone: PROD_TONE.infra,
  },
  {
    id: "handoff",
    trigger: ["The answer moves money or sets policy", "whatever the score"],
    action: ["Hand off", "pass ticket and evidence to a person"],
    example: `£${REFUND_CASE.price} refund; the limit is £${REFUND_CASE.approvalLimit}`,
    tone: PROD_TONE.traffic,
  },
] as const;

const shapes: LayoutShape[] = [
  note("h-trigger", 20, 8, "When the check says", 1),
  note("h-action", 330, 8, "Do this", 1),
  note("h-example", 590, 8, "Brightpost example", 1),
];
rungs.forEach((r, i) => {
  const step = i + 1;
  shapes.push(
    blk(`${r.id}-t`, 20, ROW(i), 280, 72, r.trigger[0], r.trigger[1], PROD_TONE.data, step),
    blk(`${r.id}-a`, 330, ROW(i), 240, 72, r.action[0], r.action[1], r.tone, step, i === 3 || undefined),
    note(`${r.id}-e`, 590, ROW(i) + 14, r.example, step, PROD_TONE.infra, 270),
    arr(`${r.id}-arrow`, `${r.id}-t`, `${r.id}-a`, step)
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The action ladder: cite, flag, abstain, hand off",
  width: 880,
  height: ROW(3) + 72 + 20,
  steps: [
    { title: "Cite: every claim supported" },
    { title: "Flag: weak, low stakes" },
    { title: "Abstain: cannot confirm" },
    { title: "Hand off: money or policy" },
  ],
  shapes,
};

export default spec;
