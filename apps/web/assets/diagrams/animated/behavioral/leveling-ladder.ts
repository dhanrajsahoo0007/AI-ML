import type { LayoutSpec } from "@/components/diagrams/types";

const spec: LayoutSpec = {
  kind: "layout",
  title: "How behavioral scope, autonomy, and leverage scale from L3 to L6+",
  width: 900,
  height: 300,
  steps: [
    { title: "1. L3 (Junior): Task execution", covers: "Clear spec -> working PR" },
    { title: "2. L4 (Mid): Feature ownership", covers: "Component -> production" },
    { title: "3. L5 (Senior): Team system & ambiguity", covers: "Vague goal -> durable system" },
    { title: "4. L6+ (Staff / EM): Org leverage", covers: "Multi-team strategy & bar" },
  ],
  groups: [
    { id: "ladder", title: "Scope & Autonomy Progression Across Engineering Levels", tone: "neutral", x: 16, y: 20, w: 868, h: 260 },
  ],
  shapes: [
    { id: "l3", type: "box", x: 36, y: 78, w: 185, h: 165, label: "L3 · Junior SWE", sub: "Given a scoped task; ships tested code, asks fast when blocked", tone: "blue", step: 1 },
    { id: "l4", type: "box", x: 251, y: 78, w: 185, h: 165, label: "L4 · Mid-Level SWE", sub: "Given a feature spec; designs API, coordinates rollout & alerts", tone: "teal", step: 2 },
    { id: "l5", type: "box", x: 466, y: 78, w: 190, h: 165, label: "L5 · Senior SWE", sub: "Given a messy problem; aligns stakeholders, prevents bug classes", tone: "orange", highlight: true, step: 3 },
    { id: "l6", type: "box", x: 686, y: 78, w: 180, h: 165, label: "L6+ · Staff / EM", sub: "Finds the problem nobody asked about; multiplies 3+ teams", tone: "green", step: 4 },
    { id: "s1", type: "arrow", from: "l3", to: "l4", packet: true, step: 2 },
    { id: "s2", type: "arrow", from: "l4", to: "l5", packet: true, step: 3 },
    { id: "s3", type: "arrow", from: "l5", to: "l6", packet: true, step: 4 },
  ],
};

export default spec;
