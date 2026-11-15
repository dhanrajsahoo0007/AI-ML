// Constants for the state-persistence-retrieval figures (assets/diagrams/animated/agents/checkpoint-timeline and
// state-records). The run is the Brightpost refund through the agent loop (./agents HAPPY_PATH, and the agent-loop
// figure, whose step 5 saves the run state before asking the support agent). This file adds only what durable state
// needs on top: the ids of the thread, the run and its checkpoints, the idempotency key for create_refund, and the
// crash. The checkpoint-timeline spec is reused by agent-reliability-and-error-recovery, so everything it draws comes
// from here or from ./agents.
//
// The story: the harness saves a checkpoint after every step. Call 3 asks for create_refund; £42 is over £30, so the
// harness saves cp_3 (the pending call and its key) and pauses. The support agent approves at 10:20; worker A records
// the approval (cp_4) and runs create_refund. The payments service makes refund R-2291, and worker A crashes before it
// saves cp_5. Worker B loads the latest checkpoint, cp_4, and runs create_refund again with the same key; the payments
// service returns the saved R-2291 instead of paying twice. Then send_email and the reply, as on the happy path.

import { BRIGHTPOST, HAPPY_PATH, LATENCY_S, TOOLS } from "./agents";

/** Ids of the durable records. The tool-call id toolu_03 is create_refund's, as on agentic-ai-evaluation. */
export const RUN_STATE = {
  threadId: "th_5e08",
  runId: "run_8f3a",
  toolCallId: "toolu_03",
  /** Run id + tool-call id: the same on every retry of this call, different in every other run (Temporal's advice). */
  refundKey: "run_8f3a:toolu_03",
  workerA: "Worker A",
  workerB: "Worker B",
  store: "Postgres",
  /** A second, later run on the same thread: the customer's follow-up in the same chat. */
  followUpRunId: "run_d4b7",
  followUp: "When will it arrive?",
} as const;

/**
 * The checkpoints of run_8f3a, one per step, in order. `col` is the step's column on the timeline (1–7);
 * `worker` says who wrote it. cp_5 is written by worker B: worker A crashed after create_refund ran and before it
 * saved cp_5.
 */
export const CHECKPOINTS: readonly { id: string; short: string; after: string; worker: "A" | "B" }[] = [
  { id: "cp_1", short: "+ order", after: `call 1, ${TOOLS.getOrder.name}`, worker: "A" },
  { id: "cp_2", short: "+ rule", after: `call 2, ${TOOLS.searchHelp.name}`, worker: "A" },
  { id: "cp_3", short: "paused + key", after: `call 3 asks for ${TOOLS.createRefund.name}`, worker: "A" },
  { id: "cp_4", short: "approved", after: `approval at ${BRIGHTPOST.approvedAt}`, worker: "A" },
  { id: "cp_5", short: BRIGHTPOST.refundId, after: TOOLS.createRefund.name, worker: "B" },
  { id: "cp_6", short: "email sent", after: `call 4, ${TOOLS.sendEmail.name}`, worker: "B" },
  { id: "cp_7", short: "done", after: "call 5, the reply", worker: "B" },
];

/**
 * What the crash costs with and without checkpoints (illustrative seconds from LATENCY_S).
 * Restart from the start: calls 1–3 again (3 × 1.5 s) + get_order and search_help again (2 × 0.3 s) = 5.1 s, a
 * second request to the support agent, and create_refund with a fresh key: £42 + £42 = £84 refunded.
 * Resume from cp_4: one create_refund (0.3 s), which the payments service answers from its saved result.
 */
export const RESUME_COST = {
  fromStart: Math.round((3 * LATENCY_S.modelCall + 2 * LATENCY_S.toolCall) * 10) / 10,
  fromCheckpoint: LATENCY_S.toolCall,
  doubleRefund: BRIGHTPOST.price * 2,
  modelCalls: HAPPY_PATH.length,
} as const;
