import type { LayoutSpec } from "@/components/diagrams/types";

const spec: LayoutSpec = {
  kind: "layout",
  title: "The 2-minute STAR+L time budget (120 seconds total)",
  width: 900,
  height: 280,
  steps: [
    { title: "1. Situation & Task (15% / ~20s)", covers: "Stakes & constraint" },
    { title: "2. Action (60% / ~70s)", covers: "Your 3 engineering moves" },
    { title: "3. Result (15% / ~20s)", covers: "Metric delta + guardrail" },
    { title: "4. Learning (10% / ~10s)", covers: "Systemic mechanism" },
  ],
  groups: [
    { id: "timeline", title: "2-Minute Spoken Delivery Arc (Keep 60% of airtime on your personal engineering actions)", tone: "neutral", x: 16, y: 20, w: 868, h: 240 },
  ],
  shapes: [
    { id: "st", type: "box", x: 36, y: 72, w: 170, h: 150, label: "S + T (15%)", sub: "20s: System, hard constraint & stakes", tone: "blue", step: 1 },
    { id: "act", type: "box", x: 236, y: 72, w: 280, h: 150, label: "Action (60%)", sub: "70s: 'I' decisions, trade-offs & execution", tone: "orange", highlight: true, step: 2 },
    { id: "res", type: "box", x: 546, y: 72, w: 160, h: 150, label: "Result (15%)", sub: "20s: Before/after numbers & business win", tone: "green", step: 3 },
    { id: "lrn", type: "box", x: 736, y: 72, w: 130, h: 150, label: "Learning (10%)", sub: "10s: Guardrail that prevented repeats", tone: "violet", step: 4 },
    { id: "a1", type: "arrow", from: "st", to: "act", packet: true, step: 2 },
    { id: "a2", type: "arrow", from: "act", to: "res", packet: true, step: 3 },
    { id: "a3", type: "arrow", from: "res", to: "lrn", packet: true, step: 4 },
  ],
};

export default spec;
