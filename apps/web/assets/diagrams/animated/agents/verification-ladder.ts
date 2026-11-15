import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// The verification ladder (harness-engineering, Core concepts 5): check an agent's work with cheap, certain checks
// first and costly judgement last. 1 schema and format (certain, instant, free) · 2 tests, lint and types (certain,
// seconds) · 3 a reviewer model (judgement, costs tokens) · 4 a person (judgement, costs attention). Work climbs down
// the ladder only while it passes; any failure goes back to the model as an error it can act on. Computational against
// inferential checks follows Böckeler, "Harness engineering for coding agent users" (martinfowler.com, 2026).
//
// Four build steps, one rung each; the last also shows "Accepted". Layout: rungs 340 × 56 at x 120, y 30 + 78i; a
// cost arrow down the left (x 60); one tall model box on the right (x 600) that every dashed "fail" arrow reaches.
//
// Colour (agents legend, three tones plus neutral): checks lime, the person orange, the model and the accepted result
// green. The reviewer model is a grader, so it is lime, not green. The person is ringed: the scarcest check.

const X = 120;
const W = 340;
const H = 56;
const Y0 = 30;
const STEP_Y = 78;
const MODEL_X = 600;

const RUNGS = [
  { label: "Schema and format", sub: "certain · instant · free", tone: AGENT_TONE.check },
  { label: "Tests, lint, types", sub: "certain · seconds · cheap", tone: AGENT_TONE.check },
  { label: "A reviewer model", sub: "judgement · costs tokens", tone: AGENT_TONE.check },
  { label: "A person", sub: "judgement · costs attention", tone: AGENT_TONE.task },
] as const;

const rungs: LayoutShape[] = RUNGS.flatMap((r, i) => {
  const y = Y0 + i * STEP_Y;
  const step = i + 1;
  const out: LayoutShape[] = [
    {
      id: `r${i}`,
      type: "box",
      x: X,
      y,
      w: W,
      h: H,
      label: `${i + 1}  ${r.label}`,
      sub: r.sub,
      tone: r.tone,
      fill: "pastel",
      highlight: r.tone === AGENT_TONE.task ? true : undefined,
      step,
    },
    {
      id: `f${i}`,
      type: "arrow",
      x: X + W,
      y: y + H / 2,
      w: MODEL_X - X - W,
      h: 0,
      label: "fail",
      dashed: true,
      step,
    },
  ];
  if (i > 0) out.push({ id: `p${i}`, type: "arrow", x: 0, y: 0, from: `r${i - 1}`, to: `r${i}`, step });
  return out;
});

const bottom = Y0 + 3 * STEP_Y + H;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The verification ladder: cheap, certain checks first",
  width: 820,
  height: bottom + 108,
  steps: [
    { title: "Schema and format: free, every proposal" },
    { title: "Tests, lint and types: seconds, every change" },
    { title: "A reviewer model: tokens, only work that passed" },
    { title: "A person: attention, only what is risky" },
  ],
  shapes: [
    {
      id: "cost",
      type: "arrow",
      x: 60,
      y: Y0,
      w: 0,
      h: bottom - Y0,
      label: "more cost",
    },
    {
      id: "model",
      type: "box",
      x: MODEL_X,
      y: Y0,
      w: 190,
      h: bottom - Y0,
      label: "Model",
      sub: "reads the error, tries again",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    ...rungs,
    {
      id: "ok",
      type: "box",
      x: X + W / 2 - 90,
      y: bottom + 44,
      w: 180,
      h: 44,
      label: "Accepted",
      tone: AGENT_TONE.model,
      step: 4,
    },
    { id: "p4", type: "arrow", x: 0, y: 0, from: "r3", to: "ok", label: "pass", step: 4 },
  ],
};

export default spec;
