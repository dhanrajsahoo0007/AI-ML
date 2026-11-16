// Constants for the human-in-the-loop-and-approvals figures (assets/diagrams/animated/agents/approval-interrupt,
// risk-matrix, approval-fatigue and audit-trail). The Brightpost names come from ./agents and the run's ids from
// ./agents-state, so the pause drawn here is the same pause as step 5–6 of agent-loop and cp_3–cp_4 of
// checkpoint-timeline: call 3 asks for create_refund(4471, 42.00); £42 is over £30, so the harness saves cp_3 (the
// pending call and its key) and pauses; the support agent approves at 10:20; the harness saves cp_4 and runs the call,
// which returns refund R-2291.
//
// The approval-fatigue numbers are Anthropic's, from "Auto mode is now the default in Claude Code" (claude.com, 7 Aug
// 2026, updated 22 Oct 2026) and "Beyond permission prompts" (anthropic.com, 20 Oct 2025). Everything else not taken
// from ./agents is illustrative and says so.

import { BRIGHTPOST, TOOLS } from "./agents";
import { RUN_STATE } from "./agents-state";

/** The pause, as the approval figures and the audit record show it. */
export const APPROVAL = {
  /** When the harness held the call and asked (illustrative; the approval time 10:20 is BRIGHTPOST.approvedAt). */
  requestedAt: "10:14",
  /** 10:14 → 10:20: the six minutes the run waited (illustrative). */
  waitMin: 6,
  /** The support agent's id in the audit record (illustrative). */
  approverId: "sa_31",
  /** The rule that held the call, as the harness logs it. */
  rule: `refund > £${BRIGHTPOST.approvalLimit}`,
  ruleId: "refund-over-limit",
  /** The model's reason for the call, as the harness shows it to the approver. */
  reason: "Arrived cracked; damage rule gives a full refund",
  /** An edit the support agent could make instead of approving: a partial refund (illustrative). */
  editedAmount: 30,
  pendingCall: TOOLS.createRefund.call,
  keyedCall: `${TOOLS.createRefund.name}(${BRIGHTPOST.orderId}, ${BRIGHTPOST.price.toFixed(2)}, key)`,
  pausedAt: "cp_3",
  resumedAt: "cp_4",
  key: RUN_STATE.refundKey,
} as const;

/** The four gates of the risk matrix, weakest first. */
export const GATES = {
  run: { label: "Run", sub: "nothing to undo" },
  notifyUndo: { label: "Notify", sub: "runs; a person can undo it" },
  notifyLog: { label: "Notify", sub: "runs; logged, loss accepted" },
  ask: { label: "Ask", sub: "pauses for a person" },
  forbid: { label: "Forbid", sub: "code refuses, at any size" },
} as const;

/**
 * Approval fatigue, from Anthropic's Claude Code data (7 Aug 2026): users approve 97 % of permission prompts and
 * reject 39 % of plans. In a study of 1,053 paid testers, one routine prompt per session was swapped for a clearly
 * dangerous command: people caught 143 (143 / 1,053 = 13.6 %), auto mode's classifier blocked 937 (937 / 1,053 =
 * 89 %). People caught about 17 % early in a session and about 5 % after 50 or more prompts; the classifier's rate
 * stayed flat. Sandboxing cut prompts by 84 % in Anthropic's own use (20 Oct 2025): 50 prompts × 0.16 = 8 prompts.
 */
export const FATIGUE = {
  approvePct: 97,
  planRejectPct: 39,
  testers: 1053,
  humanCaught: 143,
  humanCaughtPct: Math.round((143 / 1053) * 1000) / 10,
  classifierBlocked: 937,
  classifierPct: Math.round((937 / 1053) * 100),
  earlyPct: 17,
  latePct: 5,
  lateAfter: 50,
  sandboxCut: 0.84,
  promptsAfterSandbox: Math.round(50 * (1 - 0.84)),
} as const;
