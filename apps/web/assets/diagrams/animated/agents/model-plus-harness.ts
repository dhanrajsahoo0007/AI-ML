import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// "Agent = model + harness" (harness-engineering, The idea in plain English): what each side owns. The model owns
// three things, all of them words: it reads the context it is given, proposes the next step (a tool call or an
// answer), and says when it is done. The harness owns eight parts, each answering one question. The two sides meet
// at a narrow interface: the harness sends context in, the model sends a proposal out.
//
// Layout: the model column on the left (group x 20, 200 wide; three boxes 176 × 56 spread over the same height as the
// harness rows); the harness on the right (group x 330, 470 wide) as two columns of four boxes (215 × 56, 12 apart).
// The two arrows run through the 110-unit gap at rows 146 and 250, either side of the middle model box.
//
// Colour (agents legend, four tones plus neutral): the model green; harness parts by role: tools teal, state violet,
// verification and guardrails lime, the rest (context, sandbox, budgets, observability) neutral. The model box that
// proposes the next step is ringed: it is the model's only real decision.

const BOX = { w: 215, h: 56 } as const;
const ROW_Y = [62, 130, 198, 266] as const;
const COL_X = [342, 569] as const;

/** The harness's eight parts: label, the question each answers, legend tone. Column-major: left column first. */
const PARTS: { id: string; label: string; sub: string; tone: (typeof AGENT_TONE)[keyof typeof AGENT_TONE] }[] = [
  { id: "context", label: "Context", sub: "what it sees", tone: AGENT_TONE.infra },
  { id: "tools", label: "Tools", sub: "what it can do", tone: AGENT_TONE.action },
  { id: "sandbox", label: "Sandbox", sub: "where actions run", tone: AGENT_TONE.infra },
  { id: "state", label: "State", sub: "what it keeps", tone: AGENT_TONE.memory },
  { id: "verify", label: "Verification", sub: "is the work right?", tone: AGENT_TONE.check },
  { id: "guard", label: "Guardrails", sub: "what it must not do", tone: AGENT_TONE.check },
  { id: "budgets", label: "Budgets", sub: "when to stop", tone: AGENT_TONE.infra },
  { id: "observe", label: "Observability", sub: "what it did", tone: AGENT_TONE.infra },
];

const harness: LayoutShape[] = PARTS.map((p, i) => ({
  id: p.id,
  type: "box",
  x: COL_X[Math.floor(i / 4)],
  y: ROW_Y[i % 4],
  w: BOX.w,
  h: BOX.h,
  label: p.label,
  sub: p.sub,
  tone: p.tone,
  fill: p.tone === AGENT_TONE.infra ? "soft" : "pastel",
}));

const MODEL_OWNS: { id: string; label: string; sub: string; highlight?: boolean }[] = [
  { id: "m-read", label: "Reads the context", sub: "only what it is shown" },
  { id: "m-propose", label: "Proposes a step", sub: "a tool call or an answer", highlight: true },
  { id: "m-done", label: "Says it is done", sub: "a turn with no tool call" },
];

const model: LayoutShape[] = MODEL_OWNS.map((m, i) => ({
  id: m.id,
  type: "box",
  x: 32,
  y: [62, 164, 266][i],
  w: 176,
  h: BOX.h,
  label: m.label,
  sub: m.sub,
  tone: AGENT_TONE.model,
  fill: "pastel",
  highlight: m.highlight,
}));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Agent = model + harness: what each one owns",
  width: 820,
  height: 360,
  groups: [
    { id: "g-model", title: "The model", tone: AGENT_TONE.model, x: 20, y: 30, w: 200, h: 310 },
    { id: "g-harness", title: "The harness", tone: AGENT_TONE.infra, x: 330, y: 30, w: 470, h: 310 },
  ],
  shapes: [
    ...model,
    ...harness,
    { id: "in", type: "arrow", x: 330, y: 146, w: -110, h: 0, label: "context" },
    { id: "out", type: "arrow", x: 220, y: 250, w: 110, h: 0, label: "proposal" },
  ],
};

export default spec;
