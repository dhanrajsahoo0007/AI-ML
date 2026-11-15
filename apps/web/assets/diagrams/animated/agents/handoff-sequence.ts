import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { TEAM } from "@/components/diagrams/presets/agents-multi";

// Hand-offs on multi-agent-systems (Deep dive; replaces the triage → billing sequence). The Brightpost refund handled
// by a team: a triage agent reads the message and hands off to the orders agent, which checks order 4471 and hands
// off to the refunds agent. The refunds agent looks up the rule, asks to refund £42, waits for the support agent (a
// person) because £42 is over £30, then refunds, emails and replies. Each hand-off carries a short summary and the ids,
// not the whole transcript.
//
// Five steps: 1 triage reads the message and hands off · 2 the orders agent checks the order and hands off · 3 the
// refunds agent finds the rule and asks to refund · 4 £42 > £30: the run pauses for the support agent · 5 approved at
// 10:20: refund R-2291, the email and the reply. Tool calls are drawn as self-messages on the agent that owns the
// tool; their results come back as the next self-message, dashed (a return).
//
// Tones (sequence lanes take the seven section tones; SEQUENCE_TONE): the customer and the support agent orange, the
// three agents green. Lane labels stay at or under 13 characters so they fit with an icon.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Hand-offs: triage, then orders, then refunds, with a pause for approval",
  width: 860,
  steps: [
    { title: "Triage reads the message and hands off" },
    { title: "The orders agent checks the order and hands off" },
    { title: "The refunds agent finds the rule and asks to refund" },
    { title: `£${BRIGHTPOST.price} is over £${BRIGHTPOST.approvalLimit}: the run waits for a person` },
    { title: "Approved: refund, email and reply" },
  ],
  lanes: [
    { id: "customer", label: "Customer", icon: "users", tone: SEQUENCE_TONE.user },
    { id: "triage", label: TEAM.triage.label, icon: "robot", tone: SEQUENCE_TONE.model },
    { id: "orders", label: TEAM.orders.label, icon: "robot", tone: SEQUENCE_TONE.model },
    { id: "refunds", label: TEAM.refunds.label, icon: "robot", tone: SEQUENCE_TONE.model },
    { id: "person", label: BRIGHTPOST.approver, icon: "approval", tone: SEQUENCE_TONE.approver },
  ],
  messages: [
    // Step 1: one model call: classify, then hand off with a summary.
    { from: "customer", to: "triage", label: `kettle cracked, order ${BRIGHTPOST.orderId}` },
    { from: "triage", to: "triage", label: `intent: ${TEAM.intent}` },
    { from: "triage", to: "orders", label: `hand-off: order ${BRIGHTPOST.orderId}, cracked` },

    // Step 2: the orders agent owns get_order.
    { from: "orders", to: "orders", label: TOOLS.getOrder.call, step: 2 },
    {
      from: "orders",
      to: "orders",
      label: `kettle, £${BRIGHTPOST.price}, ${BRIGHTPOST.delivered}`,
      kind: "return",
      step: 2,
    },
    { from: "orders", to: "refunds", label: `hand-off: refund £${BRIGHTPOST.price}?`, step: 2 },

    // Step 3: the refunds agent owns the rule and the refund.
    { from: "refunds", to: "refunds", label: TOOLS.searchHelp.call, step: 3 },
    { from: "refunds", to: "refunds", label: `"${BRIGHTPOST.helpArticle}": full refund`, kind: "return", step: 3 },
    { from: "refunds", to: "refunds", label: TOOLS.createRefund.call, step: 3 },

    // Step 4: the harness, not the agent, enforces the limit: save the run and ask a person.
    { from: "refunds", to: "person", label: `approve £${BRIGHTPOST.price}?`, step: 4, delay: 0.4 },
    { from: "refunds", to: "customer", label: "a person will check", kind: "return", step: 4 },

    // Step 5: the approval resumes the run.
    { from: "person", to: "refunds", label: `approved ${BRIGHTPOST.approvedAt}`, kind: "return", step: 5, delay: 0.6 },
    { from: "refunds", to: "refunds", label: `refund ${BRIGHTPOST.refundId}`, kind: "return", step: 5 },
    { from: "refunds", to: "refunds", label: TOOLS.sendEmail.call, step: 5 },
    { from: "refunds", to: "customer", label: `£${BRIGHTPOST.price} refund on its way`, kind: "return", step: 5 },
  ],
  notes: [
    { lane: "orders", text: "Gets a summary, not the transcript", step: 1, at: 2.5 },
    { lane: "refunds", text: "Run saved; waits", step: 4, at: 9.5 },
  ],
};

export default spec;
