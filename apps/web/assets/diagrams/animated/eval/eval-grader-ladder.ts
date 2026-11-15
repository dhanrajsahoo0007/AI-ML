import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { GRADER } from "@/components/diagrams/presets/production-eval";

// The grader ladder (llm-evaluation-fundamentals, Core concepts): three ways to grade one Brightpost answer, from a
// code check through a model judge to a person. ALL COSTS ARE ILLUSTRATIVE, computed in presets/production-eval.ts GRADER:
//   code check: no per-grade charge;
//   judge: (2,450 input × $3 + 100 output × $15) ÷ 1,000,000 = $0.00885, about $0.009; 200 tickets = $1.77;
//   person: 3 minutes at $30 an hour = $1.50; 200 tickets = $300; ratio 1.50 ÷ 0.00885 = 169.5, about 170.
// Grid: columns x 20 | 335 | 650 (w 210); rows y 24 (grader h 64) | 130 (cost h 64) | 236 (trust h 64); long arrow y 340.
// Colours: code check lime (a check), judge green (a model), person neutral (not a machine); cost row blue (data).

const COLS = [20, 335, 650] as const;
const W = 210;
const usd = (v: number) => `$${v < 0.1 ? v.toFixed(3) : v.toFixed(2)}`;
const usd0 = (v: number) => `$${Math.round(v).toLocaleString("en-GB")}`;

const graders = [
  { id: "code", label: "Code check", sub: "a rule, run by a script", tone: PROD_TONE.check, cost: "$0", set: "$0" },
  {
    id: "judge",
    label: "Model judge",
    sub: "an LLM reads a rubric",
    tone: PROD_TONE.model,
    cost: usd(GRADER.judgeCost),
    set: `$${GRADER.judgeSet.toFixed(2)}`,
  },
  {
    id: "person",
    label: "Person",
    sub: "an expert reads the trace",
    tone: PROD_TONE.infra,
    cost: usd(GRADER.humanCost),
    set: usd0(GRADER.humanSet),
  },
] as const;
const trust = [
  { label: "Exact, but narrow", sub: "valid JSON, approval called" },
  { label: "Broad, but biased", sub: "check it against people first" },
  { label: "The reference", sub: "slow; people disagree too" },
] as const;

const shapes: LayoutShape[] = [];
graders.forEach((g, i) => {
  shapes.push(
    {
      id: `g-${g.id}`,
      type: "box",
      x: COLS[i],
      y: 24,
      w: W,
      h: 64,
      label: g.label,
      sub: g.sub,
      tone: g.tone,
      fill: "pastel",
      highlight: g.id === "judge" || undefined,
    },
    {
      id: `c-${g.id}`,
      type: "box",
      x: COLS[i],
      y: 130,
      w: W,
      h: 64,
      label: `${g.cost} per grade`,
      sub: `${DATASETS.goldenSet} tickets: ${g.set}`,
      tone: PROD_TONE.data,
      fill: "pastel",
    },
    {
      id: `t-${g.id}`,
      type: "box",
      x: COLS[i],
      y: 236,
      w: W,
      h: 64,
      label: trust[i].label,
      sub: trust[i].sub,
      tone: PROD_TONE.infra,
      fill: "soft",
    }
  );
});

shapes.push(
  { id: "a1", type: "arrow", x: 0, y: 0, from: "g-code", to: "g-judge", label: "too rigid" },
  { id: "a2", type: "arrow", x: 0, y: 0, from: "g-judge", to: "g-person", label: "check it" },
  {
    id: "row-cost",
    type: "text",
    x: 20,
    y: 104,
    w: 260,
    h: 18,
    label: "Cost (illustrative prices and wages)",
    tone: PROD_TONE.infra,
    quiet: true,
  },
  {
    id: "row-trust",
    type: "text",
    x: 20,
    y: 210,
    w: 200,
    h: 18,
    label: "What you can trust it for",
    tone: PROD_TONE.infra,
    quiet: true,
  },
  {
    id: "long",
    type: "arrow",
    x: 40,
    y: 340,
    w: 800,
    h: 0,
    label: "more cost and more nuance per grade: use the cheapest rung that can tell the difference",
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The grader ladder: code check, model judge, person",
  width: 880,
  height: 372,
  shapes,
};

export default spec;
