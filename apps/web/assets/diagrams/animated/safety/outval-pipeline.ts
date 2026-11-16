import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";

// The output validation pipeline (guardrails-output-validation, Architecture): a model's draft passes three checks in
// order, cheapest first, then ends in one of three outcomes. Brightpost's draft is a refund action for order 4471.
//   Step 1 the draft · 2 schema check (is it valid JSON of the right shape?) · 3 policy check (is it allowed? refunds
//   over £30 need approval) · 4 grounding check (does the passage set support it?) · 5 three outcomes: pass, repair, block.
// Nodes never move between steps. Layout (centres): draft x 75 | schema 235 | policy 395 | grounding 555 (w 130, y 170);
// outcomes x 790 (w 150): pass y 70, repair y 170, block y 270. Width 880.
// Colours (PROD_TONE): the draft green (the model), the checks lime, pass orange (the customer gets it), repair neutral
// (control flow), block red. Four tones; the grounding check is the accent.

const spec: DiagramSpec = {
  title: "Three checks on a draft, then pass, repair or block",
  width: 880,
  height: 340,
  steps: [
    { title: "A draft from the model" },
    { title: "Check 1: the schema" },
    { title: "Check 2: the policy" },
    { title: "Check 3: the grounding" },
    { title: "Pass, repair or block" },
  ],
  zones: [],
  nodes: [
    {
      id: "draft",
      label: "Model draft",
      sub: `refund £${REFUND_CASE.price}`,
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 75,
      y: 170,
      w: 130,
    },
    {
      id: "schema",
      label: "Schema",
      sub: "valid JSON",
      icon: "file",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 235,
      y: 170,
      w: 130,
      step: 2,
    },
    {
      id: "policy",
      label: "Policy",
      sub: `limit £${REFUND_CASE.approvalLimit}`,
      icon: "policy",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 395,
      y: 170,
      w: 130,
      step: 3,
    },
    {
      id: "grounding",
      label: "Grounding",
      sub: "evidence",
      icon: "search",
      tone: PROD_TONE.check,
      accent: true,
      x: 555,
      y: 170,
      w: 130,
      step: 4,
    },
    {
      id: "pass",
      label: "Pass",
      sub: "send to the customer",
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 790,
      y: 70,
      w: 150,
      step: 5,
    },
    {
      id: "repair",
      label: "Repair",
      sub: "send the error back",
      icon: "history",
      tone: PROD_TONE.infra,
      x: 790,
      y: 170,
      w: 150,
      step: 5,
    },
    {
      id: "block",
      label: "Block",
      sub: "safe reply, hand off",
      icon: "shield",
      tone: PROD_TONE.failure,
      fill: "pastel",
      x: 790,
      y: 270,
      w: 150,
      step: 5,
    },
  ],
  edges: [
    { from: "draft", to: "schema", packet: true, step: 2 },
    { from: "schema", to: "policy", packet: true, step: 3 },
    { from: "policy", to: "grounding", packet: true, step: 4 },
    { from: "grounding", to: "pass", label: "all pass", step: 5 },
    { from: "grounding", to: "repair", label: "fixable", step: 5, dashed: true },
    { from: "grounding", to: "block", label: "unsafe", step: 5, tone: PROD_TONE.failure },
  ],
};

export default spec;
