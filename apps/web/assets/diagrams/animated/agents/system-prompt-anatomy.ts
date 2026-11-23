import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import {
  CODE_CHECKS,
  PROMPT_TOTALS,
  PROMPT_V1,
  V2_RULE,
  type PromptBlock,
} from "@/components/diagrams/presets/agents-sysprompt";

// The anatomy of the Brightpost support agent's system prompt on system-prompt-design (Core concepts, "What belongs in
// a system prompt", and the worked example): six XML-tagged sections in the order they are sent, each with an excerpt
// and an illustrative token count, and, on the right, the checks in code that back three of its lines. Step 5 is the
// v2 fix from the worked example: one rule rewritten with its reason, and the gate in code that now sums refunds per
// order.
//
// Five steps: 1 role and task · 2 rules, and the approval gate in code · 3 tool guidance, and the owner check · 4
// format and examples, v1 total · 5 v2: the rewritten rule and the per-order gate, v2 total.
//
// Layout: two columns. Prompt sections x 20, 470 wide, each labelled with its tag and token count (the v2 addition
// indented to x 52, 438 wide, in the row kept for it under <rules>); code checks x 580, 240 wide. Rows 58 apart from
// y 48, 48 high. Totals under the last row. Dashed arrows join a prompt line to the code check that enforces it.
//
// Colour (agents legend, three tones plus neutral): prompt sections neutral (instructions), tool guidance teal, the
// examples green (model answers), code checks lime. The v2 rule carries the one highlight.

const H = 48;
const PITCH = 58;
const Y0 = 48;
const P = { x: 20, w: 470, childX: 52, childW: 438 } as const;
const C = { x: 580, w: 240 } as const;
const fmt = (n: number) => n.toLocaleString("en-GB");

// Row of each block; row 3 is kept for the v2 rule.
const ROW: Record<string, number> = { role: 0, task: 1, rules: 2, v2: 3, tools: 4, format: 5, examples: 6 };
const y = (key: string) => Y0 + ROW[key] * PITCH;

const STEP: Record<string, number> = { role: 1, task: 1, rules: 2, tools: 3, format: 4, examples: 4 };
const TONE: Record<string, LayoutTone> = { tools: AGENT_TONE.action, examples: AGENT_TONE.model };

const text = (id: string, x: number, ty: number, w: number, h: number, label: string, step = 1): LayoutShape => ({
  id,
  type: "text",
  x,
  y: ty,
  w,
  h,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const block = (b: PromptBlock): LayoutShape => ({
  id: `p-${b.key}`,
  type: "box",
  x: P.x,
  y: y(b.key),
  w: P.w,
  h: H,
  label: `${b.tag}  ·  ${fmt(b.tokens)} tokens`,
  sub: b.excerpt,
  tone: TONE[b.key] ?? AGENT_TONE.infra,
  fill: "pastel",
  step: STEP[b.key],
});

const check = (id: string, key: string, c: { label: string; sub: string }, step: number): LayoutShape => ({
  id,
  type: "box",
  x: C.x,
  y: y(key),
  w: C.w,
  h: H,
  label: c.label,
  sub: c.sub,
  tone: AGENT_TONE.check,
  fill: "pastel",
  step,
});

const link = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  dashed: true,
  step,
});

const totalsY = y("examples") + H + 18;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Anatomy of a system prompt: six sections, and the checks in code behind three lines",
  width: 840,
  height: totalsY + 64,
  steps: [
    { title: "Role and task: who the model is and what done looks like" },
    { title: "Rules: the approval limit is in the prompt and in code" },
    { title: "Tools: when to use each, backed by an owner check" },
    { title: `Format and examples: v1 is ${fmt(PROMPT_TOTALS.v1)} tokens` },
    { title: "v2: the rule rewritten with its reason, the gate made per order" },
  ],
  shapes: [
    text("h-prompt", P.x, 14, P.w, 22, "System prompt, in the order it is sent"),
    text("h-code", C.x, 14, C.w, 22, "Also enforced in code"),

    ...PROMPT_V1.map(block),

    check("c-gate", "rules", CODE_CHECKS.gateV1, 2),
    link("l-gate", "p-rules", "c-gate", 2),
    check("c-owner", "tools", CODE_CHECKS.owner, 3),
    link("l-owner", "p-tools", "c-owner", 3),

    text(
      "total-v1",
      P.x,
      totalsY,
      560,
      22,
      `v1: ${fmt(PROMPT_TOTALS.v1)} tokens, sent with every model call. Counts illustrative.`,
      4
    ),

    // Step 5: the v2 fix from the worked example.
    {
      id: "p-v2",
      type: "box",
      x: P.childX,
      y: y("v2"),
      w: P.childW,
      h: H,
      label: `${V2_RULE.tag}  ·  +${fmt(V2_RULE.tokens)} tokens`,
      sub: V2_RULE.excerpt,
      tone: AGENT_TONE.infra,
      fill: "pastel",
      step: 5,
      highlight: true,
    },
    check("c-gate2", "v2", CODE_CHECKS.gateV2, 5),
    link("l-gate2", "p-v2", "c-gate2", 5),
    text(
      "total-v2",
      P.x,
      totalsY + 28,
      560,
      22,
      `v2: ${fmt(PROMPT_TOTALS.v2)} tokens. The rule now says why, and code no longer trusts it alone.`,
      5
    ),
  ],
};

export default spec;
