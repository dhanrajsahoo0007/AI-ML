import type { LayoutSpec } from "@/components/diagrams/types";

const spec: LayoutSpec = {
  kind: "layout",
  title: "Turning raw work episodes into genuine self-knowledge and stronger engineering habits",
  width: 900,
  height: 290,
  steps: [
    { title: "1. Capture the unvarnished episode", covers: "Facts without spin" },
    { title: "2. Run the counterfactual audit", covers: "Where was my blind spot?" },
    { title: "3. Extract the reusable principle", covers: "What mechanism changed?" },
    { title: "4. Compounding career judgment", covers: "Authentic interview signal" },
  ],
  groups: [
    { id: "loop", title: "Blameless Career Post-Mortem Loop (Authenticity beats memorization)", tone: "teal", x: 16, y: 20, w: 868, h: 250 },
  ],
  shapes: [
    { id: "raw", type: "box", x: 36, y: 80, w: 185, h: 140, label: "1. Raw Episode", sub: "PRs, post-mortems, Slack threads & real metrics", tone: "blue", step: 1 },
    { id: "audit", type: "box", x: 251, y: 80, w: 195, h: 140, label: "2. Honest Audit", sub: "What did I miss early? Where was the other person right?", tone: "orange", step: 2 },
    { id: "mech", type: "box", x: 476, y: 80, w: 190, h: 140, label: "3. New Mechanism", sub: "Checklist, guardrail, or habit built afterward", tone: "violet", highlight: true, step: 3 },
    { id: "growth", type: "box", x: 696, y: 80, w: 168, h: 140, label: "4. Next-Level Bar", sub: "Calm under 3-level Bar Raiser probing", tone: "green", step: 4 },
    { id: "e1", type: "arrow", x: 0, y: 0, from: "raw", to: "audit", packet: true, step: 2 },
    { id: "e2", type: "arrow", x: 0, y: 0, from: "audit", to: "mech", packet: true, step: 3 },
    { id: "e3", type: "arrow", x: 0, y: 0, from: "mech", to: "growth", packet: true, step: 4 },
  ],
};

export default spec;
