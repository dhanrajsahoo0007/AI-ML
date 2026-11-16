import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { EFFORT_ROWS, OUTPUT_PRICE, OUTPUT_SPEED, type Effort } from "@/components/diagrams/presets/agents-reasoning";

// One Brightpost refund at three effort levels (prompting-reasoning-models, Core concepts, "Tuning reasoning effort
// and thinking token budgets"). Each row is the whole run: output tokens as a bar to scale (thinking, then tool-call
// arguments and the reply), tool calls, whether the policy was checked, and the output cost and extra wait. Medium
// and high give the same refund; high pays almost three times the thinking for it; low skips search_help. Token
// counts, the low-effort skip and the speed are illustrative; the price is Claude Opus 5.5's output list price.
//
// Four steps: 1 medium (the default on Claude Opus 5.5) · 2 high · 3 low, with the skipped search (red, the one
// highlight) · 4 the verdict line.
//
// Layout: three rows 64 apart from y 48, 44 high. Columns: effort cell x 20 (110 wide); bar x 146, 340 wide at full
// scale (the high row's output), with its arithmetic under it; tool calls x 502 (60); policy check x 578 (140); cost
// and wait x 734 (120). Key and verdict as text under the rows.
//
// Colour (agents legend, four tones plus neutral): thinking green, tool calls teal, the policy check lime (red where
// it was skipped), visible output and labels neutral.

const ROW_Y0 = 48;
const PITCH = 64;
const H = 44;
const COL = {
  effort: { x: 20, w: 110 },
  bar: { x: 146, w: 340 },
  tools: { x: 502, w: 60 },
  check: { x: 578, w: 140 },
  cost: { x: 734, w: 120 },
} as const;
const ORDER: Effort[] = ["low", "medium", "high"];
const STEP: Record<Effort, number> = { medium: 1, high: 2, low: 3 };
const SUB: Record<Effort, string> = { low: "", medium: "Opus 5.5 default", high: "" };

const fmt = (n: number) => n.toLocaleString("en-GB");
const usd = (v: number) => `$${v.toFixed(4)}`;
const secs = (s: number) => `${Number.isInteger(s) ? s : s.toFixed(1)} s`;

const maxOutput = Math.max(...EFFORT_ROWS.map((r) => r.output));
const scale = COL.bar.w / maxOutput;
const row = (e: Effort) => EFFORT_ROWS.find((r) => r.effort === e)!;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step = 1): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const rowShapes: LayoutShape[] = ORDER.flatMap((e, i) => {
  const r = row(e);
  const y = ROW_Y0 + i * PITCH;
  const step = STEP[e];
  const thinkW = Math.round(r.thinking * scale);
  const visW = Math.round(r.visible * scale);
  const skipped = r.toolCalls < 4;
  return [
    {
      id: `e-${e}`,
      type: "cell",
      x: COL.effort.x,
      y,
      w: COL.effort.w,
      h: H,
      label: e,
      sub: SUB[e] || undefined,
      tone: AGENT_TONE.infra,
      step,
    },
    { id: `bt-${e}`, type: "box", x: COL.bar.x, y, w: thinkW, h: 22, tone: AGENT_TONE.model, fill: "pastel", step },
    {
      id: `bv-${e}`,
      type: "box",
      x: COL.bar.x + thinkW,
      y,
      w: visW,
      h: 22,
      tone: AGENT_TONE.infra,
      fill: "soft",
      step,
    },
    text(
      `bn-${e}`,
      COL.bar.x,
      y + 26,
      Math.max(thinkW + visW, 240),
      16,
      `${fmt(r.thinking)} thinking + ${fmt(r.visible)} visible = ${fmt(r.output)}`,
      step
    ),
    {
      id: `tc-${e}`,
      type: "cell",
      x: COL.tools.x,
      y,
      w: COL.tools.w,
      h: H,
      label: String(r.toolCalls),
      sub: "calls",
      tone: AGENT_TONE.action,
      step,
    },
    {
      id: `ck-${e}`,
      type: "cell",
      x: COL.check.x,
      y,
      w: COL.check.w,
      h: H,
      label: skipped ? "No" : "Yes",
      sub: skipped ? `skipped ${TOOLS.searchHelp.name}` : "article cited",
      tone: skipped ? AGENT_TONE.failure : AGENT_TONE.check,
      highlight: skipped,
      step,
    },
    {
      id: `co-${e}`,
      type: "cell",
      x: COL.cost.x,
      y,
      w: COL.cost.w,
      h: H,
      label: usd(r.cost),
      sub: `+${secs(r.waitS)} wait`,
      tone: AGENT_TONE.infra,
      step,
    },
  ] satisfies LayoutShape[];
});

const lastY = ROW_Y0 + (ORDER.length - 1) * PITCH + H;
const med = row("medium");
const high = row("high");

const spec: LayoutSpec = {
  kind: "layout",
  title: "One refund at three effort levels",
  width: 870,
  height: lastY + 96,
  steps: [
    { title: `medium, the default on Claude Opus 5.5: ${fmt(med.thinking)} thinking tokens` },
    { title: `high: ${(high.thinking / med.thinking).toFixed(1)}× the thinking for the same refund` },
    { title: "low: cheapest, but it skipped the policy search" },
    { title: "Set effort per route, and check what the low setting skips" },
  ],
  shapes: [
    text("h-effort", COL.effort.x, 14, COL.effort.w, 20, "Effort"),
    text("h-bar", COL.bar.x, 14, COL.bar.w, 20, "Output tokens per refund, to scale"),
    text("h-tools", COL.tools.x, 14, COL.tools.w, 20, "Tools"),
    text("h-check", COL.check.x, 14, COL.check.w, 20, "Policy checked?"),
    text("h-cost", COL.cost.x, 14, COL.cost.w, 20, "Cost and wait"),
    ...rowShapes,
    text(
      "key",
      COL.effort.x,
      lastY + 16,
      830,
      34,
      `Green: thinking. Grey: tool-call arguments and the reply. Cost at $${OUTPUT_PRICE} per million output tokens ` +
        `(Claude Opus 5.5 list price).\nWait = thinking ÷ ${OUTPUT_SPEED} tokens/s. Tokens and speed illustrative.`
    ),
    text(
      "verdict",
      COL.effort.x,
      lastY + 58,
      830,
      20,
      `Same £42 refund at medium and high: high costs ${(high.cost / med.cost).toFixed(1)}× as much and waits ` +
        `${secs(high.waitS - med.waitS)} longer.`,
      4
    ),
  ],
};

export default spec;
