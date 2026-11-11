import type { LayoutSpec } from "@/components/diagrams/types";

const spec: LayoutSpec = {
  kind: "layout",
  title: "How senior engineers turn high-risk one-way doors into reversible two-way doors",
  width: 900,
  height: 310,
  steps: [
    { title: "1. Classify blast radius", covers: "Cost of being wrong" },
    { title: "2. One-way door path", covers: "Irreversible choices" },
    { title: "3. Reversibility mechanism", covers: "Flags, dual-write & adapters" },
    { title: "4. Two-way door execution", covers: "Fast launch + auto-rollback" },
  ],
  groups: [
    { id: "doors", title: "Decision Reversibility & Engineering Mechanisms", tone: "neutral", x: 16, y: 20, w: 868, h: 270 },
  ],
  shapes: [
    { id: "decision", type: "box", x: 36, y: 110, w: 180, h: 110, label: "Technical Decision", sub: "70% data available; clock is ticking", tone: "blue", step: 1 },
    { id: "oneway", type: "box", x: 266, y: 55, w: 250, h: 95, label: "One-Way Door (Slow)", sub: "Public API break, drop column, hard cutover", tone: "red", step: 2 },
    { id: "converter", type: "box", x: 266, y: 175, w: 250, h: 95, label: "Reversibility Shim", sub: "Adapter layer, dual-write, dark read, flag", tone: "orange", highlight: true, step: 3 },
    { id: "twoway", type: "box", x: 576, y: 110, w: 280, h: 110, label: "Two-Way Door (Fast)", sub: "1% canary + 60s rollback if p99 or error rate spikes", tone: "green", step: 4 },
    { id: "a1", type: "arrow", from: "decision", to: "oneway", dashed: true, step: 2 },
    { id: "a2", type: "arrow", from: "decision", to: "converter", packet: true, step: 3 },
    { id: "a3", type: "arrow", from: "oneway", to: "converter", dashed: true, step: 3 },
    { id: "a4", type: "arrow", from: "converter", to: "twoway", packet: true, step: 4 },
  ],
};

export default spec;
