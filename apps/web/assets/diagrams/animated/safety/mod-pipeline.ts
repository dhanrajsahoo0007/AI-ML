import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// The moderation pipeline (content-moderation-red-teaming, Architecture): two classifiers wrap one model call. The
// input check scores the customer's message before the model runs; the output check scores the draft before the
// customer sees it. Each can allow or block; the output check can also send a borderline draft to a person. The
// reviewers' labels tune the thresholds and grow the test set.
// Steps: 1 a message reaches the input check · 2 a clear violation is blocked (safe refusal) · 3 the rest goes to the
// model · 4 the draft goes to the output check · 5 a clean draft is sent · 6 a borderline draft goes to the review
// queue · 7 reviewer labels tune thresholds and tests. Nodes appear when their step starts; edges use the later node.
// Layout (width 880, centres): row 1 y 70: customer x 75 | input check 275 | model 475 | output check 675;
// row 2 y 250: refusal x 275 (under the input check) | reply 520 | review queue 725; thresholds and tests (725, 345).
// Colours (PROD_TONE): customer and reply orange (traffic), the classifiers lime (checks), the model green, refusal
// red (a block), the queue neutral (control), thresholds and tests violet (a store).

const spec: DiagramSpec = {
  title: "Two classifiers around one model call",
  width: 880,
  height: 390,
  steps: [
    { title: "A message reaches the input check" },
    { title: "A clear violation is blocked" },
    { title: "The rest goes to the model" },
    { title: "The draft goes to the output check" },
    { title: "A clean draft is sent" },
    { title: "A borderline draft goes to a person" },
    { title: "Reviewers tune the thresholds" },
  ],
  zones: [],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: "a ticket",
      icon: "users",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 75,
      y: 70,
      w: 130,
    },
    {
      id: "input",
      label: "Input check",
      sub: "score the message",
      icon: "shield",
      tone: PROD_TONE.check,
      accent: true,
      x: 275,
      y: 70,
      w: 150,
    },
    {
      id: "refusal",
      label: "Safe refusal",
      sub: "no model call",
      icon: "lock",
      tone: PROD_TONE.failure,
      fill: "pastel",
      x: 275,
      y: 250,
      w: 150,
      step: 2,
    },
    {
      id: "model",
      label: "Model",
      sub: "writes a draft",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 475,
      y: 70,
      w: 130,
      step: 3,
    },
    {
      id: "output",
      label: "Output check",
      sub: "score the draft",
      icon: "shield",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 675,
      y: 70,
      w: 150,
      step: 4,
    },
    {
      id: "reply",
      label: "Reply sent",
      sub: "to the customer",
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 520,
      y: 250,
      w: 150,
      step: 5,
    },
    {
      id: "queue",
      label: "Review queue",
      sub: "a person decides",
      icon: "approval",
      tone: PROD_TONE.infra,
      x: 725,
      y: 250,
      w: 150,
      step: 6,
    },
    {
      id: "tune",
      label: "Thresholds, tests",
      sub: "from reviewer labels",
      icon: "database",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 715,
      y: 345,
      w: 190,
      step: 7,
    },
  ],
  edges: [
    { from: "customer", to: "input", packet: true, step: 1 },
    { from: "input", to: "refusal", label: "block", tone: PROD_TONE.failure, step: 2 },
    { from: "input", to: "model", packet: true, step: 3 },
    { from: "model", to: "output", label: "draft", packet: true, step: 4 },
    { from: "output", to: "refusal", label: "block", tone: PROD_TONE.failure, step: 5 },
    { from: "output", to: "reply", label: "allow", step: 5 },
    { from: "output", to: "queue", label: "unsure", dashed: true, step: 6 },
    { from: "queue", to: "tune", label: "labels", step: 7 },
  ],
};

export default spec;
