import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { REWRITE, REWRITE_TOTALS, type RewriteRow } from "@/components/diagrams/presets/agents-reasoning";

// The Brightpost refund agent's prompt, rewritten for a reasoning model (prompting-reasoning-models, Core concepts,
// "Why 'think step by step' can backfire" and "Specifying goals, constraints and verifiable criteria"). Left: the
// prompt as written for a chat model. Right: the same agent's prompt for a reasoning model. Each row says what
// happened to the line: kept, replaced, moved into the API call, or cut. Token counts are illustrative.
//
// Four steps: 1 the chat-model prompt and its total · 2 keep the goal, the rules and the format · 3 replace the recipe
// with success criteria (the one highlight) · 4 move "think step by step" into the effort setting, cut the examples,
// and the new total.
//
// Layout: two columns of six rows, 48 high and 58 apart from y 48. Chat column x 20, 340 wide; reasoning column
// x 480, 360 wide. One arrow per row across the 120-unit gap, with the move written above it. Totals under the rows.
//
// Colour (agents legend, three tones plus neutral): prompt lines neutral (instructions), the worked conversations
// green (model answers), the success criteria lime (a check the model runs on itself).

const H = 48;
const PITCH = 58;
const Y0 = 48;
const L = { x: 20, w: 340 } as const;
const R = { x: 480, w: 360 } as const;
const GAP = { x: L.x + L.w + 6, w: R.x - L.x - L.w - 12 } as const;
const fmt = (n: number) => n.toLocaleString("en-GB");

const STEP: Record<RewriteRow["action"], number> = { keep: 2, replace: 3, config: 4, cut: 4 };

const y = (i: number) => Y0 + i * PITCH;
const tokens = (n: number) => (n > 0 ? `  ·  ${fmt(n)} tokens` : "");

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

const chatTone = (r: RewriteRow): LayoutTone => (r.key === "examples" ? AGENT_TONE.model : AGENT_TONE.infra);
const reasoningTone = (r: RewriteRow): LayoutTone => (r.key === "recipe" ? AGENT_TONE.check : AGENT_TONE.infra);

const rows: LayoutShape[] = REWRITE.flatMap((r, i) => {
  const step = STEP[r.action];
  return [
    {
      id: `c-${r.key}`,
      type: "box",
      x: L.x,
      y: y(i),
      w: L.w,
      h: H,
      label: `${r.chat.label}${tokens(r.chat.tokens)}`,
      sub: r.chat.sub,
      tone: chatTone(r),
      fill: "pastel",
    },
    {
      id: `r-${r.key}`,
      type: "box",
      x: R.x,
      y: y(i),
      w: R.w,
      h: H,
      label: `${r.reasoning.label}${tokens(r.reasoning.tokens)}`,
      sub: r.reasoning.sub,
      tone: reasoningTone(r),
      fill: r.action === "cut" ? "paper" : "pastel",
      highlight: r.key === "recipe",
      step,
    },
    { id: `a-${r.key}`, type: "arrow", x: 0, y: 0, from: `c-${r.key}`, to: `r-${r.key}`, step },
    text(`m-${r.key}`, GAP.x, y(i) + 4, GAP.w, 16, r.move, step),
  ] satisfies LayoutShape[];
});

const totalsY = y(REWRITE.length - 1) + H + 18;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The same agent's prompt, written for a chat model and for a reasoning model",
  width: 860,
  height: totalsY + 40,
  steps: [
    { title: `Written for a chat model: ${fmt(REWRITE_TOTALS.chat)} tokens of steps and examples` },
    { title: "Keep the goal, the rules and the format" },
    { title: "Replace the recipe with what done looks like" },
    { title: `Move depth to the effort setting, cut the examples: ${fmt(REWRITE_TOTALS.reasoning)} tokens` },
  ],
  shapes: [
    text("h-chat", L.x, 14, L.w, 22, "Written for a chat model"),
    text("h-reasoning", R.x, 14, R.w, 22, "Written for a reasoning model", 2),
    ...rows,
    text("t-chat", L.x, totalsY, L.w, 22, `${fmt(REWRITE_TOTALS.chat)} tokens. Counts illustrative.`),
    text(
      "t-reasoning",
      R.x,
      totalsY,
      R.w,
      22,
      `${fmt(REWRITE_TOTALS.reasoning)} tokens, and the model plans the steps itself.`,
      4
    ),
  ],
};

export default spec;
