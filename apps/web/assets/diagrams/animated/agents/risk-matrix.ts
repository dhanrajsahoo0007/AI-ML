import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";
import { GATES } from "@/components/diagrams/presets/agents-hitl";

// The risk matrix (human-in-the-loop-and-approvals, Core concepts "Which actions need approval"): every action an
// agent can take sits on two axes, whether it can be undone and how much harm it does if it is wrong, plus a third
// column for actions outside policy at any size. The cell decides the gate: run, notify, ask or forbid. The four
// Brightpost tools are placed on it:
// - get_order(4471) and search_help read and change nothing → Run.
// - send_email to the customer's address on file, and create_refund up to £30, cannot be undone but cost little if
//   wrong → Notify (they run; the harness logs them and a person reviews a sample later; Brightpost accepts the loss).
// - The top-right cell (undoable, large) holds none of the four tools: it runs and a person can undo it afterwards.
// - create_refund(4471, 42.00) is over £30 and cannot be undone → Ask (the highlight: the call this page follows).
// - A refund on a stranger's order 5122 (the injection case) or above the price paid → Forbid: code refuses it.
//
// Four steps: 1 the grid and Run · 2 the two Notify cells · 3 Ask, the £42 refund · 4 Forbid.
//
// Layout: row labels in a 118-wide column at x 28 (the undo axis arrow at x 14); three columns, small (x 150) and large (x 400), each 240 wide, and
// out of policy (x 650, 170 wide); two rows, undoable (y 56) and not undoable (y 214), each 146 tall. A cell is a
// gate header box (44 tall) with tool chips under it; thin dashed lines separate the cells (no containers, so
// nothing overlaps). The out-of-policy column is one tall cell: the row line stops before it. Axis arrows run along the bottom (impact) and the left (harder to undo).
//
// Colour (agents legend, four tones plus neutral): tool chips teal; gates Run neutral, Notify lime (a check after the
// fact), Ask orange (a person), Forbid red with its blocked calls red. One highlight: the £42 refund.

const LABEL = { x: 28, w: 118 } as const;
const COLS = [
  { x: 150, w: 240 },
  { x: 400, w: 240 },
  { x: 650, w: 170 },
] as const;
const ROWS = [56, 214] as const;
const ROW_H = 146;
const HEAD_H = 44;
const CHIP_H = 30;

const gate = (
  id: string,
  col: number,
  row: number,
  g: { label: string; sub: string },
  tone: LayoutTone,
  step: number
): LayoutShape => ({
  id,
  type: "box",
  x: COLS[col].x + 10,
  y: ROWS[row] + 8,
  w: COLS[col].w - 20,
  h: HEAD_H,
  label: g.label,
  sub: g.sub,
  tone,
  fill: "pastel",
  step,
});

const chip = (
  id: string,
  col: number,
  row: number,
  slot: 0 | 1,
  label: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "cell",
  x: COLS[col].x + 20,
  y: ROWS[row] + 66 + slot * (CHIP_H + 10),
  w: COLS[col].w - 40,
  h: CHIP_H,
  label,
  tone,
  fill: "soft",
  step,
  ...extra,
});

const text = (id: string, x: number, y: number, w: number, label: string, step = 1, h = 20): LayoutShape => ({
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

const line = (id: string, points: [number, number][]): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  dashed: true,
  weight: 0.4,
});

const GRID_BOTTOM = ROWS[1] + ROW_H;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The risk matrix: undo and impact decide the gate",
  width: 840,
  height: GRID_BOTTOM + 50,
  steps: [
    { title: "Reads change nothing: run" },
    { title: "Small or undoable: run, then tell a person" },
    { title: `Over £${BRIGHTPOST.approvalLimit} and final: ask` },
    { title: "Out of policy: forbid, at any size" },
  ],
  shapes: [
    // The grid: column headings, row labels, separators and the two axes.
    text("h-small", COLS[0].x, 24, COLS[0].w, "Small impact if wrong"),
    text("h-large", COLS[1].x, 24, COLS[1].w, "Large impact if wrong"),
    text("h-out", COLS[2].x, 24, COLS[2].w, "Out of policy"),
    text("r-undo", LABEL.x, ROWS[0] + 50, LABEL.w, "Can be undone\nor changes nothing", 1, 46),
    text("r-final", LABEL.x, ROWS[1] + 50, LABEL.w, "Cannot be\nundone", 1, 46),
    line("sep-row", [
      [COLS[0].x, ROWS[1] - 6],
      [COLS[2].x - 5, ROWS[1] - 6],
    ]),
    line("sep-col1", [
      [COLS[1].x - 5, ROWS[0]],
      [COLS[1].x - 5, GRID_BOTTOM],
    ]),
    line("sep-col2", [
      [COLS[2].x - 5, ROWS[0]],
      [COLS[2].x - 5, GRID_BOTTOM],
    ]),
    {
      id: "x-axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [COLS[0].x, GRID_BOTTOM + 12],
        [COLS[1].x + COLS[1].w, GRID_BOTTOM + 12],
      ],
      head: true,
    },
    text("x-label", COLS[0].x, GRID_BOTTOM + 20, 490, "Impact if the agent is wrong: smaller → larger"),
    {
      id: "y-axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [14, ROWS[0] + 10],
        [14, GRID_BOTTOM - 10],
      ],
      head: true,
    },

    // Step 1: reads.
    gate("run", 0, 0, GATES.run, AGENT_TONE.infra, 1),
    chip("t-order", 0, 0, 0, TOOLS.getOrder.call, AGENT_TONE.action, 1),
    chip("t-help", 0, 0, 1, `${TOOLS.searchHelp.name}(…)`, AGENT_TONE.action, 1),

    // Step 2: the two Notify cells.
    gate("notify-undo", 1, 0, GATES.notifyUndo, AGENT_TONE.check, 2),
    text("none", COLS[1].x + 20, ROWS[0] + 76, COLS[1].w - 40, "none of the four tools", 2),
    gate("notify-log", 0, 1, GATES.notifyLog, AGENT_TONE.check, 2),
    chip("t-email", 0, 1, 0, `${TOOLS.sendEmail.name}(customer, …)`, AGENT_TONE.action, 2),
    chip("t-small", 0, 1, 1, `${TOOLS.createRefund.name} ≤ £${BRIGHTPOST.approvalLimit}`, AGENT_TONE.action, 2),

    // Step 3: the refund this page follows.
    gate("ask", 1, 1, GATES.ask, AGENT_TONE.task, 3),
    chip("t-refund", 1, 1, 0, TOOLS.createRefund.call, AGENT_TONE.action, 3, { highlight: true }),
    text("ask-who", COLS[1].x + 20, ROWS[1] + 110, COLS[1].w - 40, `${BRIGHTPOST.approver}, then it runs`, 3),

    // Step 4: what code refuses whatever its size.
    gate("forbid", 2, 0, GATES.forbid, AGENT_TONE.failure, 4),
    chip("t-stranger", 2, 0, 0, `refund ${BRIGHTPOST.injectedOrder}`, AGENT_TONE.failure, 4),
    text("stranger-why", COLS[2].x + 10, ROWS[0] + 104, COLS[2].w - 20, "a stranger's order", 4),
    chip("t-over", 2, 1, 0, "refund > price", AGENT_TONE.failure, 4),
    text("over-why", COLS[2].x + 10, ROWS[1] + 104, COLS[2].w - 20, "more than was paid", 4),
  ],
};

export default spec;
