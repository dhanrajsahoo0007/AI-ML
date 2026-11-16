import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { APPROVAL } from "@/components/diagrams/presets/agents-hitl";

// An approval interrupt, message by message (human-in-the-loop-and-approvals, Core concepts "Interrupt, approve, edit
// and resume"). The Brightpost refund at call 3: the model asks for create_refund(4471, 42.00); £42 is over the £30
// limit, so the harness holds the call, saves the run (cp_3: the pending call and its idempotency key) and asks the
// support agent. The support agent approves at 10:20 (edit or reject are the other answers, in a note). The harness
// records the decision (cp_4), runs the call with the saved key and hands the result back to the model, which goes on
// to send_email. The same pause as step 5–6 of agent-loop and cp_3–cp_4 of checkpoint-timeline.
//
// Six steps: 1 the model asks for a refund over the limit; the policy check says ask · 2 the harness saves the run and
// pauses · 3 it shows the support agent the pending action · 4 the support agent decides · 5 the harness records the
// decision and runs the call · 6 the result goes back to the model.
//
// Lanes (SEQUENCE_TONE, plus violet for the store): model green, harness neutral, checkpointer violet, create_refund
// teal, support agent orange. The person is the last lane, as in the plan's conversation figures; the harness's
// arrows to the right cross the store's lifeline. Lane labels stay under 13 characters.

const spec: SequenceSpec = {
  kind: "sequence",
  title: `Pause, ask, resume: the £${BRIGHTPOST.price} refund waits for a person`,
  width: 880,
  steps: [
    { title: `The model asks for a refund over £${BRIGHTPOST.approvalLimit}` },
    { title: "The harness saves the run and pauses" },
    { title: "The support agent sees the pending action" },
    { title: "Approve, edit or reject" },
    { title: "The harness records the decision and runs the call" },
    { title: "The result goes back to the model" },
  ],
  lanes: [
    { id: "model", label: "Model", icon: "model", tone: SEQUENCE_TONE.model },
    { id: "harness", label: "Harness", icon: "server", tone: SEQUENCE_TONE.harness },
    { id: "store", label: "Checkpointer", icon: "database", tone: "violet" },
    { id: "tool", label: TOOLS.createRefund.name, icon: "tool", tone: SEQUENCE_TONE.tool },
    { id: "agent", label: BRIGHTPOST.approver, icon: "approval", tone: SEQUENCE_TONE.approver },
  ],
  messages: [
    // Step 1: an ordinary tool call; the harness, not the model, applies the £30 rule.
    { from: "model", to: "harness", label: `tool_use: ${APPROVAL.pendingCall}`, step: 1, at: 0 },
    {
      from: "harness",
      to: "harness",
      label: `policy: £${BRIGHTPOST.price} > £${BRIGHTPOST.approvalLimit} → ask`,
      step: 1,
      at: 1,
    },

    // Step 2: the run becomes a database row; the worker may stop.
    { from: "harness", to: "store", label: `save ${APPROVAL.pausedAt}: call + key`, step: 2, at: 2 },

    // Step 3: one question with the evidence attached.
    {
      from: "harness",
      to: "agent",
      label: `approve £${BRIGHTPOST.price} for order ${BRIGHTPOST.orderId}?`,
      step: 3,
      at: 4,
    },

    // Step 4: the answer; edit and reject are the other two.
    { from: "agent", to: "harness", label: `approve, ${BRIGHTPOST.approvedAt}`, kind: "return", step: 4, at: 6 },

    // Step 5: record first, then act, with the key saved in cp_3.
    { from: "harness", to: "store", label: `save ${APPROVAL.resumedAt}: approved`, step: 5, at: 8 },
    { from: "harness", to: "tool", label: APPROVAL.keyedCall, step: 5, at: 9 },
    { from: "tool", to: "harness", label: `refund ${BRIGHTPOST.refundId}`, kind: "return", step: 5, at: 10 },

    // Step 6: to the model, the pause looks like a slow tool call.
    { from: "harness", to: "model", label: `tool_result: ${BRIGHTPOST.refundId}`, step: 6, at: 11 },
  ],
  notes: [
    { lane: "harness", text: "Worker may stop; the run is a row", step: 2, at: 3 },
    { lane: "agent", text: "Sees order, rule, reason", step: 3, at: 5 },
    { lane: "agent", text: `or edit (£${APPROVAL.editedAmount}) or reject + reason`, step: 4, at: 7 },
    { lane: "model", text: `Next: ${TOOLS.sendEmail.name}`, step: 6, at: 12 },
  ],
};

export default spec;
