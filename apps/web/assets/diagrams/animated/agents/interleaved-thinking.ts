import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  AGENT_TONE,
  BRIGHTPOST,
  chipWidth,
  traceRows,
  traceRowsSize,
  type TraceRow,
} from "@/components/diagrams/presets/agents";
import { INTERLEAVED } from "@/components/diagrams/presets/agents-reasoning";

// Interleaved thinking in the Brightpost refund loop (prompting-reasoning-models, Technical mechanics, and the worked
// example). The HAPPY_PATH trace, one row per model call, with the thinking that call did before its tool call: the
// model reasons about each result before the next action. Call 4 only passes a result on and skips thinking. Between
// call 3 and its result the run waits for the support agent; the harness saves it with every thinking block unchanged,
// and request 4 resends them as received. Thinking token counts are illustrative (THINKING_PER_CALL.medium).
//
// Five steps, one per model call; step 3 also shows the pause band (the one highlight).
//
// Layout: traceRows in two blocks with the same column widths (the widest chip per column over all rows): calls 1–3
// from y 44, the violet pause band under them, then calls 4–5. Column headings above the first row.
//
// Colour (agents legend, four tones plus neutral): thinking and the answer green, tool calls teal, results blue, the
// saved run violet; row numbers neutral.

const rows: TraceRow[] = INTERLEAVED.map((turn, i) => {
  const thinking =
    turn.thinkingTokens > 0
      ? { kind: "thought" as const, label: turn.thought, sub: `thinking · ${turn.thinkingTokens} tokens` }
      : { kind: "thought" as const, label: "No thinking block", sub: "skipped · 0 tokens", fill: "paper" as const };
  return turn.answer
    ? {
        n: String(i + 1),
        step: i + 1,
        chips: [thinking, { kind: "answer", label: turn.answer, sub: "reply", span: 2 }],
      }
    : {
        n: String(i + 1),
        step: i + 1,
        chips: [thinking, { kind: "action", label: turn.action! }, { kind: "observation", label: turn.observation! }],
      };
});

// One width per column over all rows, so both blocks line up.
const colW = [0, 1, 2].map((c) =>
  Math.max(
    90,
    ...rows
      .filter((r) => r.chips.length === 3)
      .map((r) => chipWidth({ label: r.chips[c].label, sub: r.chips[c].sub ?? "" }))
  )
);
colW[0] = Math.max(colW[0], ...rows.map((r) => chipWidth({ label: r.chips[0].label, sub: r.chips[0].sub ?? "" })));

const X = 20;
const Y = 44;
const opts = { gap: 20, colW };
const before = rows.slice(0, 3);
const after = rows.slice(3);
const sizeBefore = traceRowsSize(before, opts);
const bandY = Y + sizeBefore.height + 12;
const BAND_H = 48;
const afterY = bandY + BAND_H + 12;
const sizeAfter = traceRowsSize(after, opts);
const W = sizeBefore.width;

const traceBefore = traceRows("t", X, Y, before, opts);
const traceAfter = traceRows("u", X, afterY, after, opts);

const headings: LayoutShape[] = ["Thinking (tokens illustrative)", "Tool call", "Result"].map((label, j) => {
  const chip = traceBefore.find((s) => s.id === `t-0-${j}`)!;
  return { id: `h${j}`, type: "text", x: chip.x, y: 14, w: chip.w!, h: 20, label, tone: AGENT_TONE.infra };
});

const band: LayoutShape = {
  id: "pause",
  type: "box",
  x: X + 36,
  y: bandY,
  w: W - 36,
  h: BAND_H,
  label: "Paused for approval: the run is saved with its thinking blocks, unchanged",
  sub: `Resumed at ${BRIGHTPOST.approvedAt}: request 4 resends blocks 1 to 3 exactly as received`,
  tone: AGENT_TONE.memory,
  fill: "pastel",
  highlight: true,
  step: 3,
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "Interleaved thinking: the model thinks between tool calls, and the blocks travel with the run",
  width: Math.ceil(X * 2 + W),
  height: afterY + sizeAfter.height + 20,
  steps: [
    { title: "Call 1 thinks the most: it reads the new message" },
    { title: "Call 2 reasons about the order before searching" },
    { title: "Call 3 decides the refund; the run waits, thinking saved" },
    { title: "Call 4 passes the result on: no thinking needed" },
    { title: "Call 5 checks the result and replies" },
  ],
  shapes: [...headings, ...traceBefore, band, ...traceAfter],
};

export default spec;
