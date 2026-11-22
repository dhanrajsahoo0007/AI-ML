import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// Shadow traffic against a live A/B test for the same prompt change (ab-testing-prompts-models, Architecture).
//
// Two steps on the same nodes: 1 shadow: every request goes to the live prompt A, whose answer is the only one the
// customer gets; a copy of the request also goes to the new prompt B, and its answer is sent to the judge and never to
// the customer (dashed). The judge scores A and B on the same requests, so the comparison is paired, but no customer
// outcome (resolved, hand-off, thumbs) exists for B · 2 live A/B: the router splits users 50/50 (the shadow copy and
// the unseen link end), B's answers reach customers, and the customer outcomes flow into the metrics as well.
// Nodes never move; links replaced between steps end with `until: 1`.
//
// Layout (880 × 400): customer (80, 190); traffic router (295, 190), the accent; prompt A (520, 80) and prompt B
// (520, 310); reply to the customer (785, 80); judge and metrics (785, 310). Colours (PROD_TONE, four tones plus
// neutral): the customer and the reply orange (traffic), the router neutral, both prompts green (the model), the judge
// lime (a check).
// Fact check: shadow deployment (mirroring live traffic to a candidate whose responses are discarded) and live A/B
// testing are the two standard pre-release modes; the trade-off drawn (no user impact and paired scoring against real
// outcomes and extra model cost) follows from the topology, not from a source.

const spec: DiagramSpec = {
  title: "Shadow traffic against a live A/B test",
  width: 880,
  height: 400,
  steps: [{ title: "Shadow: the new prompt runs on a copy" }, { title: "A/B: some customers see the new prompt" }],
  zones: [],
  nodes: [
    {
      id: "user",
      label: "Customer",
      sub: "asks a question",
      icon: "users",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 80,
      y: 190,
      w: 140,
    },
    {
      id: "router",
      label: "Traffic router",
      sub: "decides who sees what",
      icon: "router",
      tone: PROD_TONE.infra,
      accent: true,
      x: 295,
      y: 190,
      w: 186,
      h: 64,
    },
    {
      id: "a",
      label: "Prompt A",
      sub: "live",
      icon: "prompt",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 520,
      y: 80,
      w: 160,
    },
    {
      id: "b",
      label: "Prompt B",
      sub: "candidate",
      icon: "prompt",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 520,
      y: 310,
      w: 160,
    },
    {
      id: "reply",
      label: "Reply seen",
      sub: "by the customer",
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 785,
      y: 80,
      w: 170,
    },
    {
      id: "judge",
      label: "Judge, metrics",
      sub: "scores and outcomes",
      icon: "chart",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 785,
      y: 310,
      w: 174,
    },
  ],
  edges: [
    { from: "user", to: "router", label: "ask", packet: true },
    { from: "router", to: "a", label: "request", packet: true, delay: 0.3, until: 1 },
    { from: "a", to: "reply", label: "answer", packet: true, delay: 0.8 },
    { from: "router", to: "b", label: "copy", dashed: true, packet: true, delay: 0.5, until: 1 },
    { from: "b", to: "judge", label: "never shown", dashed: true, packet: true, delay: 1, until: 1 },
    { from: "a", to: "judge", label: "scored", dashed: true, delay: 1, until: 1 },

    { from: "router", to: "a", label: "half of users", packet: true, delay: 0.3, step: 2 },
    { from: "router", to: "b", label: "half of users", packet: true, delay: 0.5, step: 2 },
    { from: "b", to: "reply", label: "answer", packet: true, delay: 0.8, step: 2 },
    { from: "reply", to: "judge", label: "outcome", packet: true, delay: 1.2, step: 2 },
  ],
};

export default spec;
