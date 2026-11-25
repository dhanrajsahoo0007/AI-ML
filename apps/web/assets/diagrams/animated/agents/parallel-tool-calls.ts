import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, LATENCY_S, TOOLS } from "@/components/diagrams/presets/agents";
import { PARALLEL } from "@/components/diagrams/presets/agents-tools";

// Parallel tool calls (tool-use-and-mcp, Core concepts 4): the Brightpost agent needs the order (get_order) and the
// refund rule (search_help). The two lookups do not depend on each other. Asked one after the other they take two model
// calls and two tool waits before the third model call can start: 1.5 + 0.3 + 1.5 + 0.3 = 3.6 s. Asked together, one
// model response holds both calls and the app runs them at the same time: 1.5 + 0.3 = 1.8 s. Times are LATENCY_S
// (illustrative) and the arithmetic is PARALLEL.
//
// Two steps: 1 one after the other · 2 both at once, with the saving.
//
// Layout: a timeline, 170 units per second from x 170 (0 s) to x 850 (4 s), axis at y 260. Row 1 (y 60) and row 2
// (y 160) each have a label on the left. In row 2 the two tool calls are stacked half-height cells over the same 0.3 s.
//
// Colour (agents legend, two tones): model calls green, tool calls teal, labels and axis neutral.

const S = 170; // units per second
const X0 = 170;
const at = (s: number) => Math.round(X0 + s * S);
const M = LATENCY_S.modelCall;
const T = LATENCY_S.toolCall;
const ROW1 = 60;
const ROW2 = 160;
const H = 44;

const model = (id: string, label: string, start: number, y: number, sub: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x: at(start),
  y,
  w: at(start + M) - at(start),
  h: H,
  label,
  sub,
  tone: AGENT_TONE.model,
  fill: "pastel",
  step,
});

const tool = (id: string, start: number, y: number, h: number, step: number): LayoutShape => ({
  id,
  type: "cell",
  x: at(start),
  y,
  w: at(start + T) - at(start),
  h,
  label: `${T} s`,
  tone: AGENT_TONE.action,
  fill: "pastel",
  step,
});

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

const ticks: LayoutShape[] = [0, 1, 2, 3, 4].map((s) => text(`tick${s}`, at(s) - 15, 268, 30, 18, `${s} s`));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two lookups: one after the other, or both at once",
  width: 880,
  height: 350,
  steps: [{ title: "One after the other: 3.6 s" }, { title: "Both at once: 1.8 s" }],
  shapes: [
    // Row 1: one tool per model call.
    text("l1", 20, ROW1, 140, H, "One after\nthe other"),
    model("s-m1", "Model call 1", 0, ROW1, `asks for ${TOOLS.getOrder.name} · ${M} s`, 1),
    tool("s-t1", M, ROW1, H, 1),
    text("s-t1-name", at(M + T / 2) - 45, ROW1 - 24, 90, 20, TOOLS.getOrder.name),
    model("s-m2", "Model call 2", M + T, ROW1, `asks for ${TOOLS.searchHelp.name} · ${M} s`, 1),
    tool("s-t2", 2 * M + T, ROW1, H, 1),
    text("s-t2-name", at(2 * M + 1.5 * T) - 45, ROW1 - 24, 90, 20, TOOLS.searchHelp.name),
    text("s-end", at(PARALLEL.sequential) - 90, ROW1 + H + 6, 180, 20, `next call at ${PARALLEL.sequential} s`),

    // Row 2: one model response holds both calls; the app runs them together.
    text("l2", 20, ROW2, 140, H, "Both at once", 2),
    model("p-m1", "Model call 1", 0, ROW2, `asks for both · ${M} s`, 2),
    tool("p-t1", M, ROW2, 21, 2),
    tool("p-t2", M, ROW2 + 23, 21, 2),
    text(
      "p-tools",
      at(M + T) + 10,
      ROW2,
      230,
      H,
      `${TOOLS.getOrder.name} and ${TOOLS.searchHelp.name}\nrun at the same time`,
      2
    ),
    text("p-end", at(PARALLEL.parallel) - 90, ROW2 + H + 6, 180, 20, `next call at ${PARALLEL.parallel} s`, 2),

    // Time axis.
    { id: "axis", type: "arrow", x: X0, y: 260, w: 4 * S + 10, h: 0 },
    ...ticks,
    text(
      "saved",
      20,
      300,
      840,
      40,
      `Saved ${PARALLEL.sequential} − ${PARALLEL.parallel} = ${PARALLEL.saved} s. Whole refund: ${PARALLEL.happyPathSequential} s → ${PARALLEL.happyPathParallel} s.\nIllustrative: ${M} s per model call, ${T} s per tool call`,
      2
    ),
  ],
};

export default spec;
