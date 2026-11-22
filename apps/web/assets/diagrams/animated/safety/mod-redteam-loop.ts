import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// The red-team loop (content-moderation-red-teaming, Deep dive "The red-team loop"). Attacks are written down, run on
// every release, scored, fixed, and then kept as tests so the same hole cannot reopen.
// ILLUSTRATIVE numbers: a library of 40 attacks; 6 get through the assistant, so the attack success rate is
// 6 ÷ 40 = 15%. After the fix, a re-run of the same 40 lets 1 through: 1 ÷ 40 = 2.5%.
// Steps: 1 the attack library · 2 run it against the assistant · 3 score each reply · 4 fix the cause · 5 add the
// failures to the regression suite · 6 the suite re-runs on every release (back to the library).
// Layout (width 880, height 330, centres): top row y 90: library x 110 | run 330 | score 550 | fix 770 (w 170);
// regression suite at (770, 250); the return edge runs left under the row through y 300 to the library.
// Colours (PROD_TONE): the library blue (data), the run teal (compute), the score lime (a check; the accent), the fix
// neutral (change), the suite violet (a store). Four tones plus neutral.

const spec: DiagramSpec = {
  title: "The red-team loop",
  width: 880,
  height: 330,
  steps: [
    { title: "Write the attacks down" },
    { title: "Run them against the assistant" },
    { title: "Score every reply" },
    { title: "Fix the cause" },
    { title: "Keep the failures as tests" },
    { title: "Re-run on every release" },
  ],
  zones: [],
  nodes: [
    {
      id: "library",
      label: "Attack library",
      sub: "40 attacks (illustrative)",
      icon: "file",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 110,
      y: 90,
      w: 186,
    },
    {
      id: "run",
      label: "Run",
      sub: "against the assistant",
      icon: "server",
      tone: PROD_TONE.compute,
      fill: "pastel",
      x: 330,
      y: 90,
      w: 170,
      step: 2,
    },
    {
      id: "score",
      label: "Score",
      sub: "6 of 40 got through",
      icon: "chart",
      tone: PROD_TONE.check,
      accent: true,
      x: 550,
      y: 90,
      w: 170,
      step: 3,
    },
    {
      id: "fix",
      label: "Fix",
      sub: "prompt or filter",
      icon: "tool",
      tone: PROD_TONE.infra,
      x: 770,
      y: 90,
      w: 170,
      step: 4,
    },
    {
      id: "suite",
      label: "Regression suite",
      sub: "kept for every release",
      icon: "database",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 770,
      y: 250,
      w: 170,
      step: 5,
    },
  ],
  edges: [
    { from: "library", to: "run", packet: true, step: 2 },
    { from: "run", to: "score", label: "replies", packet: true, step: 3 },
    { from: "score", to: "fix", label: "failures", step: 4 },
    { from: "fix", to: "suite", label: "re-test", step: 5 },
    { from: "suite", to: "library", label: "new attacks join the library", dashed: true, via: [[110, 250]], step: 6 },
  ],
};

export default spec;
