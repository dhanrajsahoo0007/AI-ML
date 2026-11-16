import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";
import { CHECKPOINTS, RUN_STATE } from "@/components/diagrams/presets/agents-state";

// A run with checkpoints, a crash and a resume (state-persistence-retrieval; reused by
// agent-reliability-and-error-recovery, so it tells the whole story on its own). The run is the Brightpost refund
// through the agent loop: the harness saves a checkpoint after every step. Call 3 asks for create_refund; £42 is over
// £30, so the harness saves cp_3 (the pending call and its idempotency key) and pauses. The support agent approves at
// 10:20 and worker A saves cp_4. create_refund runs and the payments service makes refund R-2291, then worker A
// crashes before it saves cp_5. Worker B loads the latest checkpoint, cp_4, not the start, and runs create_refund
// again with the same key; the payments service returns the saved R-2291 instead of paying twice.
//
// Seven steps: 1 calls 1 and 2, a checkpoint after each · 2 call 3 asks to refund; save cp_3 and pause · 3 approved at
// 10:20; cp_4 · 4 create_refund runs, then the crash before saving · 5 worker B loads cp_4 (the highlight) · 6
// create_refund again with the same key returns the saved refund; cp_5 · 7 send_email and the reply; cp_6, cp_7.
//
// Layout: seven columns of 110 from x 100, one per step of the run (centres 155 … 815). Three bands, each a group with a
// short title, so the title tabs sit left of the first column and no arrow crosses them: worker A (boxes at y 52), the
// checkpoints (cells at y 192), worker B (boxes at y 300). Worker A writes down into the
// checkpointer, worker B writes up into it; the load arrow runs from cp_4 down to worker B's create_refund. Worker B's
// first four columns hold one line of text: what it does not repeat.
//
// Colour (agents legend, four tones plus neutral): tool calls teal, the reply green, checkpoints violet, the crash
// red (only the run that breaks); the approval and the text neutral. One highlight: cp_4, the resume point.

const X0 = 100;
const COL = 110;
const BOX_W = 100;
const CELL_W = 90;
const cx = (col: number) => X0 + (col - 1) * COL + COL / 2;

const A = { y: 52, h: 52 };
const CP = { y: 192, h: 44 };
const B = { y: 300, h: 52 };

const box = (
  id: string,
  col: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number
): LayoutShape => ({
  id,
  type: "box",
  x: cx(col) - BOX_W / 2,
  y,
  w: BOX_W,
  h: A.h,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
});

/** Checkpoint cells: steps they appear in, in CHECKPOINTS order. */
const CP_STEP = [1, 1, 2, 3, 6, 7, 7];
const cells: LayoutShape[] = CHECKPOINTS.map((c, i) => ({
  id: `cp${i + 1}`,
  type: "cell",
  x: cx(i + 1) - CELL_W / 2,
  y: CP.y,
  w: CELL_W,
  h: CP.h,
  label: c.id,
  sub: c.short,
  tone: AGENT_TONE.memory,
  fill: "pastel",
  step: CP_STEP[i],
  highlight: c.id === "cp_4" ? true : undefined,
}));

/** A save: worker A writes down into the checkpointer, worker B writes up. */
const saveDown = (col: number, step: number): LayoutShape => ({
  id: `save${col}`,
  type: "arrow",
  x: cx(col),
  y: A.y + A.h,
  w: 0,
  h: CP.y - A.y - A.h,
  step,
});
const saveUp = (col: number, step: number): LayoutShape => ({
  id: `save${col}`,
  type: "arrow",
  x: cx(col),
  y: B.y,
  w: 0,
  h: CP.y + CP.h - B.y,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A run with checkpoints: a crash, then a resume from the last checkpoint",
  width: 880,
  height: 396,
  steps: [
    { title: "Worker A runs calls 1 and 2: a checkpoint after each" },
    { title: `Call 3 asks to refund £${BRIGHTPOST.price}: save cp_3 and pause` },
    { title: `Approved at ${BRIGHTPOST.approvedAt}: save cp_4` },
    { title: `${TOOLS.createRefund.name} runs, then worker A crashes before saving` },
    { title: "Worker B loads the latest checkpoint, cp_4, not the start" },
    { title: `Same key again: the payments service returns the saved ${BRIGHTPOST.refundId}` },
    { title: `${TOOLS.sendEmail.name} and the reply: the run ends` },
  ],
  groups: [
    { id: "a", title: RUN_STATE.workerA, tone: AGENT_TONE.infra, x: 16, y: 20, w: 856, h: 128 },
    { id: "store", title: "Checkpoints", tone: AGENT_TONE.memory, x: 16, y: 166, w: 856, h: 84 },
    { id: "b", title: RUN_STATE.workerB, tone: AGENT_TONE.infra, x: 16, y: 268, w: 856, h: 112 },
  ],
  shapes: [
    // Step 1: calls 1 and 2, each followed by a checkpoint.
    box("a1", 1, A.y, TOOLS.getOrder.name, "call 1", AGENT_TONE.action, 1),
    box("a2", 2, A.y, TOOLS.searchHelp.name, "call 2", AGENT_TONE.action, 1),
    saveDown(1, 1),
    saveDown(2, 1),

    // Step 2: call 3 asks for the refund; over £30, so it is held and the run pauses with its key saved.
    box("a3", 3, A.y, TOOLS.createRefund.name, `held: over £${BRIGHTPOST.approvalLimit}`, AGENT_TONE.action, 2),
    saveDown(3, 2),

    // Step 3: the approval is recorded.
    box("a4", 4, A.y, "Approved", `${BRIGHTPOST.approvedAt}, resume`, AGENT_TONE.infra, 3),
    saveDown(4, 3),

    // Step 4: the refund is made, then the worker dies before saving.
    box("a5", 5, A.y, TOOLS.createRefund.name, `${BRIGHTPOST.refundId}, crash`, AGENT_TONE.failure, 4),
    {
      id: "lost",
      type: "text",
      x: cx(5) - 60,
      y: A.y + A.h + 6,
      w: 120,
      h: 22,
      label: "nothing saved",
      tone: AGENT_TONE.failure,
      step: 4,
    },

    ...cells,

    // Step 5: worker B picks up the thread from the latest checkpoint.
    {
      id: "skip",
      type: "text",
      x: X0,
      y: B.y - 4,
      w: 4 * COL - 12,
      h: 60,
      label: "Loads the latest checkpoint, cp_4.\nCalls 1–3 and the approval do not run again.",
      tone: AGENT_TONE.infra,
      step: 5,
    },
    { id: "load", type: "arrow", x: 0, y: 0, from: "cp4", to: "b5", packet: true, step: 5 },

    // Step 6: the same call with the same key; the payments service answers from its saved result.
    box("b5", 5, B.y, TOOLS.createRefund.name, "same key", AGENT_TONE.action, 6),
    saveUp(5, 6),

    // Step 7: the rest of the happy path.
    box("b6", 6, B.y, TOOLS.sendEmail.name, "call 4", AGENT_TONE.action, 7),
    box("b7", 7, B.y, "Reply", "call 5", AGENT_TONE.model, 7),
    saveUp(6, 7),
    saveUp(7, 7),
  ],
};

export default spec;
