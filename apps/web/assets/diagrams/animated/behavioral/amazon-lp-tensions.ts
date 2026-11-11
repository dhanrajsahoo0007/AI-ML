import type { DiagramSpec } from "@/components/diagrams/types";

const spec: DiagramSpec = {
  title: "How Amazon Bar Raisers test the tension between competing Leadership Principles",
  width: 920,
  height: 410,
  steps: [
    { title: "1. Speed vs Quality bar", covers: "Bias for Action ↔ Highest Standards" },
    { title: "2. User value vs Constraints", covers: "Customer Obsession ↔ Frugality" },
    { title: "3. Altitude calibration", covers: "Dive Deep ↔ Think Big" },
    { title: "4. Candor vs Alignment", covers: "Have Backbone ↔ Earn Trust & Commit" },
  ],
  zones: [
    { id: "pole-a", title: "Principle Pole A", tone: "blue", x: 16, y: 20, w: 250, h: 370 },
    { id: "pole-b", title: "Competing Pole B", tone: "orange", x: 335, y: 20, w: 250, h: 370 },
    { id: "synthesis", title: "Bar Raiser Resolution", tone: "green", x: 654, y: 20, w: 250, h: 370 },
  ],
  nodes: [
    { id: "action", label: "Bias for Action", sub: "Ship reversible two-way doors", icon: "zap", tone: "blue", x: 141, y: 85, w: 214, h: 54, step: 1 },
    { id: "standards", label: "Highest Standards", sub: "No silent defects at scale", icon: "shield", tone: "orange", x: 460, y: 85, w: 214, h: 54, step: 1 },
    { id: "res-1", label: "Scoped Canary Launch", sub: "Cut surface area, never invariants", icon: "check-circle", tone: "green", x: 779, y: 85, w: 214, h: 54, step: 1 },

    { id: "customer", label: "Customer Obsession", sub: "Solve real user pain first", icon: "heart", tone: "blue", x: 141, y: 175, w: 214, h: 54, step: 2 },
    { id: "frugality", label: "Frugality", sub: "Fixed headcount & cloud budget", icon: "dollar-sign", tone: "orange", x: 460, y: 175, w: 214, h: 54, step: 2 },
    { id: "res-2", label: "Invent & Simplify", sub: "Simpler architecture saves cost", icon: "sparkles", tone: "green", x: 779, y: 175, w: 214, h: 54, step: 2 },

    { id: "dive", label: "Dive Deep", sub: "Audit raw logs & p99.9 tails", icon: "search", tone: "blue", x: 141, y: 265, w: 214, h: 54, step: 3 },
    { id: "think-big", label: "Think Big", sub: "Multi-year 10x platform vision", icon: "compass", tone: "orange", x: 460, y: 265, w: 214, h: 54, step: 3 },
    { id: "res-3", label: "Grounded Roadmap", sub: "10x vision validated by data", icon: "trending-up", tone: "green", x: 779, y: 265, w: 214, h: 54, step: 3 },

    { id: "backbone", label: "Have Backbone", sub: "Challenge with hard evidence", icon: "git-branch", tone: "blue", x: 141, y: 350, w: 214, h: 54, step: 4 },
    { id: "trust", label: "Earn Trust & Commit", sub: "Low-ego alignment once decided", icon: "users", tone: "orange", x: 460, y: 350, w: 214, h: 54, step: 4 },
    { id: "res-4", label: "Principled Ownership", sub: "Debate hard, execute as one", icon: "award", tone: "green", accent: true, x: 779, y: 350, w: 214, h: 54, step: 4 },
  ],
  edges: [
    { from: "action", to: "standards", bidirectional: true, dashed: true, label: "tension", step: 1 },
    { from: "standards", to: "res-1", packet: true, step: 1 },
    { from: "customer", to: "frugality", bidirectional: true, dashed: true, label: "tension", step: 2 },
    { from: "frugality", to: "res-2", packet: true, step: 2 },
    { from: "dive", to: "think-big", bidirectional: true, dashed: true, label: "tension", step: 3 },
    { from: "think-big", to: "res-3", packet: true, step: 3 },
    { from: "backbone", to: "trust", bidirectional: true, dashed: true, label: "tension", step: 4 },
    { from: "trust", to: "res-4", packet: true, step: 4 },
  ],
};

export default spec;
