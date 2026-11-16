import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";
import { CHECKPOINTS, RUN_STATE } from "@/components/diagrams/presets/agents-state";

// The durable records behind one agent conversation (state-persistence-retrieval, Core concepts): a thread, the runs
// in it and the checkpoints of each run, and what lives outside the thread. The thread is customer 1847's chat,
// th_5e08. Run run_8f3a is the kettle refund from the checkpoint-timeline figure, with its seven checkpoints; each
// checkpoint points to its parent. Run run_d4b7 is the customer's follow-up in the same chat; its checkpoints carry on
// the thread's history. Opening cp_4 shows what one record holds: the thread, its parent, the next step, the values,
// the pending tool call and its idempotency key. Outside the thread sit the memory store, read across threads (see
// agent-memory), and the payments service's record of the key.
//
// Four steps: 1 the refund run and its seven checkpoints · 2 a second run on the same thread · 3 one checkpoint
// record, cp_4, opened (the key is the highlight) · 4 what lives outside the thread.
//
// Layout: one group for the thread (x 16 to 872, y 16 to 316). Runs on the left (x 32, w 170) at rows y 56 and 130;
// each run's checkpoints run right from x 272 in cells of 64 with gaps of 22, linked right to left (the parent
// pointer). The cp_4 record is six cells (two columns of 190) at x 458 to 852, under cp_4. Outside the thread, at
// y 340: the memory store on the left and the payments service under the key.
//
// Colour (agents legend, two tones plus neutral): runs, checkpoints and the memory store violet (state); the payments
// service teal (a tool's side of the call); text neutral. One highlight: the key.

const RUN = { x: 32, w: 170, h: 52 };
const ROW1 = 56;
const ROW2 = 130;
const CELL = { x: 272, w: 64, h: 44, gap: 22 };
const REC = { x: 458, y: 156, w: 190, h: 40, gapX: 14, gapY: 8 };
const OUT_Y = 340;

const cellX = (i: number) => CELL.x + i * (CELL.w + CELL.gap);

const chain = (ids: string[], y: number, step: number): LayoutShape[] => [
  ...ids.map((id, i): LayoutShape => ({
    id,
    type: "cell",
    x: cellX(i),
    y: y + 4,
    w: CELL.w,
    h: CELL.h,
    label: id,
    tone: AGENT_TONE.memory,
    fill: "pastel",
    step,
    quiet: i > 0 ? true : undefined,
  })),
  // The parent pointer: each checkpoint points back to the one before it.
  ...ids
    .slice(1)
    .map((id, i): LayoutShape => ({ id: `${id}-parent`, type: "arrow", x: 0, y: 0, from: id, to: ids[i], step })),
];

const run = (id: string, y: number, sub: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x: RUN.x,
  y,
  w: RUN.w,
  h: RUN.h,
  label: id,
  sub,
  tone: AGENT_TONE.memory,
  fill: "pastel",
  step,
});

const cp4 = CHECKPOINTS[3];
const fields: [string, string][] = [
  ["thread_id", RUN_STATE.threadId],
  ["parent", CHECKPOINTS[2].id],
  ["values", "6 messages so far"],
  ["next", TOOLS.createRefund.name],
  ["pending", `${RUN_STATE.toolCallId}, approved`],
  ["key", RUN_STATE.refundKey],
];
const record: LayoutShape[] = fields.map(([label, sub], i) => ({
  id: `f-${label}`,
  type: "cell",
  x: REC.x + (i % 2) * (REC.w + REC.gapX),
  y: REC.y + Math.floor(i / 2) * (REC.h + REC.gapY),
  w: REC.w,
  h: REC.h,
  label,
  sub,
  tone: AGENT_TONE.memory,
  step: 3,
  quiet: label === "key" ? undefined : true,
  highlight: label === "key" ? true : undefined,
}));

const cp4Centre = cellX(3) + CELL.w / 2;
const keyCell = REC.x + REC.w + REC.gapX + REC.w / 2;
const keyBottom = REC.y + 3 * REC.h + 2 * REC.gapY;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Durable records: a thread, its runs, their checkpoints",
  width: 880,
  height: 410,
  steps: [
    { title: `${RUN_STATE.runId}: the refund run and its seven checkpoints` },
    { title: `${RUN_STATE.followUpRunId}: a second run on the same thread` },
    { title: `Open ${cp4.id}: what one checkpoint record holds` },
    { title: "Outside the thread: the memory store and the payments service" },
  ],
  groups: [
    {
      id: "thread",
      title: `Thread ${RUN_STATE.threadId} · customer ${BRIGHTPOST.customerId}'s chat`,
      tone: AGENT_TONE.memory,
      x: 16,
      y: 16,
      w: 856,
      h: 300,
    },
  ],
  shapes: [
    // Step 1: the refund run and its checkpoint chain.
    run(RUN_STATE.runId, ROW1, `${BRIGHTPOST.item} refund · done`, 1),
    { id: "has1", type: "arrow", x: 0, y: 0, from: RUN_STATE.runId, to: "cp_1", step: 1 },
    ...chain(
      CHECKPOINTS.map((c) => c.id),
      ROW1,
      1
    ),

    // Step 2: the follow-up run in the same chat; the thread's history carries on.
    run(RUN_STATE.followUpRunId, ROW2, `"${RUN_STATE.followUp}"`, 2),
    { id: "has2", type: "arrow", x: 0, y: 0, from: RUN_STATE.followUpRunId, to: "cp_8", step: 2 },
    ...chain(["cp_8", "cp_9"], ROW2, 2),
    {
      id: "rule",
      type: "text",
      x: RUN.x,
      y: 214,
      w: 400,
      h: 60,
      label: "One thread, many runs.\nOne run, many checkpoints.\nEach checkpoint points to its parent.",
      tone: AGENT_TONE.infra,
      step: 2,
    },

    // Step 3: one checkpoint record opened.
    { id: "open", type: "arrow", x: cp4Centre, y: ROW1 + 4 + CELL.h, w: 0, h: REC.y - ROW1 - 4 - CELL.h - 22, step: 3 },
    {
      id: "rec-title",
      type: "text",
      x: REC.x,
      y: REC.y - 22,
      w: 2 * REC.w + REC.gapX,
      h: 20,
      label: `${cp4.id}, one checkpoint record`,
      tone: AGENT_TONE.memory,
      step: 3,
      quiet: true,
    },
    ...record,

    // Step 4: what lives outside the thread.
    {
      id: "memory",
      type: "box",
      x: RUN.x,
      y: OUT_Y,
      w: 290,
      h: 52,
      label: "Memory store",
      sub: "read across threads: prefers email",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 4,
    },
    {
      id: "payments",
      type: "box",
      x: REC.x,
      y: OUT_Y,
      w: 2 * REC.w + REC.gapX,
      h: 52,
      label: "Payments service",
      sub: `key ${RUN_STATE.refundKey} → ${BRIGHTPOST.refundId}`,
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 4,
    },
    { id: "send-key", type: "arrow", x: keyCell, y: keyBottom, w: 0, h: OUT_Y - keyBottom, dashed: true, step: 4 },
  ],
};

export default spec;
