import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { blockBox, leftNote, link } from "@/components/diagrams/presets/production-finetune";
import { DPO, DPO_LOSS, DPO_LOSS_START, DPO_MARGIN, sigmoid } from "@/components/diagrams/presets/production-pref";

// One DPO training pair on Brightpost's refund question (reinforcement-preference-learning, Deep dive). Rafailov et al.
// (2023, arXiv 2305.18290): the policy is trained directly on pairs with a classification loss, no reward model and no
// sampling during training:  L = −log σ( β · [ log π(y_w|x) ÷ π_ref(y_w|x) − log π(y_l|x) ÷ π_ref(y_l|x) ] ).
// Working (ILLUSTRATIVE log-ratios, presets/production-pref.ts): preferred +2.0, rejected −3.0, β = 0.1 →
//   margin = 0.1 × (2.0 − (−3.0)) = 0.5, σ(0.5) = 0.622, loss = −ln 0.622 = 0.474; at the start (both 0) the loss is 0.693.
// Steps: 1 the pair · 2 how much each answer's probability moved against the frozen reference · 3 the loss.
// Layout (880 x 410): prompt y 20 (h 50); answers y 110 (h 64) at x 20 / 450; log-ratio boxes y 214 (h 50); the loss box
// y 320 (x 250, w 380, h 56); an annotation under each stage. Colour: customer text orange (traffic), the preferred answer
// green (the model), the rejected answer red (it breaks the refund rule), ratios neutral, the loss lime.

const refund = REFUND_CASE;
const shapes: LayoutShape[] = [
  blockBox("prompt", 20, 20, 840, 50, "Customer", PROD_TONE.traffic, {
    sub: `My kettle arrived cracked. Can I have my money back? (order ${refund.orderId}, £${refund.price})`,
    step: 1,
  }),
  blockBox("good", 20, 110, 400, 64, "Preferred answer", T.model, {
    sub: "I have sent your £42 refund to an agent to approve",
    step: 1,
  }),
  blockBox("bad", 460, 110, 400, 64, "Rejected answer", PROD_TONE.failure, {
    sub: "Done, your £42 refund is on its way. Breaks the £30 rule.",
    step: 1,
  }),
  link("p-g", "prompt", "good", { step: 1 }),
  link("p-b", "prompt", "bad", { step: 1 }),

  blockBox("rg", 20, 214, 400, 50, "Policy ÷ reference: +2.0", T.frozen, {
    sub: "log-ratio of the whole answer, illustrative",
    step: 2,
  }),
  blockBox("rb", 460, 214, 400, 50, "Policy ÷ reference: −3.0", T.frozen, {
    sub: "log-ratio of the whole answer, illustrative",
    step: 2,
  }),
  link("g-rg", "good", "rg", { step: 2 }),
  link("b-rb", "bad", "rb", { step: 2 }),

  blockBox("loss", 250, 320, 380, 56, "DPO loss", T.check, {
    sub: `−ln σ(${DPO.beta} × (2.0 − (−3.0))) = −ln σ(${DPO_MARGIN.toFixed(1)}) = ${DPO_LOSS.toFixed(2)}`,
    step: 3,
    highlight: true,
  }),
  link("rg-l", "rg", "loss", { step: 3 }),
  link("rb-l", "rb", "loss", { step: 3 }),
  leftNote(
    "n3",
    20,
    394,
    `σ(${DPO_MARGIN.toFixed(1)}) = ${sigmoid(DPO_MARGIN).toFixed(3)}. At the start both ratios are 0, so the loss is −ln 0.5 = ${DPO_LOSS_START.toFixed(3)}; training lowers it by widening the gap.`,
    { step: 3 }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A DPO training pair on the refund question",
  width: 880,
  height: 430,
  steps: [
    { title: "A preferred and a rejected answer to one prompt" },
    { title: "How far each answer moved from the reference" },
    { title: "One loss on the pair: no reward model" },
  ],
  shapes,
};

export default spec;
