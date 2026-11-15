import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";

// A simulated user in an eval run (agentic-ai-evaluation, Core concepts). A model plays the customer from a script:
// the goal (a refund for the cracked kettle on order 4471) and one rule (give the order number only when asked), so
// the test also checks that the agent asks for what it needs. The agent works against mock tools in a sandbox, where a
// mock approver says yes to the £42 refund. When the persona's goal is met it ends the chat; the grader then reads
// the sandbox's end state, not the chat, and compares it with the task's goal. Same shape as tau-bench (Yao et al.
// 2024): a model plays the user, sees only the agent's messages, and the run is graded on the final database state.
//
// Five steps: 1 the persona opens without the order number · 2 the agent asks; the persona answers · 3 the agent
// looks up the order and the rule · 4 the refund (mock approval) and the email · 5 the persona ends the chat; the
// grader reads the end state. Tool calls go to the sandbox lane; their results come back dashed (returns).
//
// Tones (sequence lanes take the seven section tones only, SEQUENCE_TONE): the simulated user orange, the agent green,
// the sandbox tools teal. The grader would be lime, which lanes cannot use, so it is neutral with a test-tube icon.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A simulated user talks to the agent; the grader reads the end state",
  width: 860,
  steps: [
    { title: "The persona opens, without the order number" },
    { title: "The agent asks; the persona answers" },
    { title: "The agent looks up the order and the rule" },
    { title: "Refund (mock approval) and email" },
    { title: "The persona ends the chat; the grader reads the end state" },
  ],
  lanes: [
    { id: "persona", label: "Simulated user", icon: "users", tone: SEQUENCE_TONE.user },
    { id: "agent", label: "Agent", icon: "robot", tone: SEQUENCE_TONE.model },
    { id: "sandbox", label: "Sandbox tools", icon: "sandbox", tone: SEQUENCE_TONE.tool },
    { id: "grader", label: "Grader", icon: "test-tube", tone: "neutral" },
  ],
  messages: [
    // Step 1: the persona follows its script and leaves the order number out.
    { from: "persona", to: "agent", label: `my ${BRIGHTPOST.item} arrived cracked, refund?` },

    // Step 2: the agent has to ask.
    { from: "agent", to: "persona", label: "which order is it?", kind: "return", step: 2 },
    { from: "persona", to: "agent", label: `order ${BRIGHTPOST.orderId}`, step: 2 },

    // Step 3: two tool calls against mock data.
    { from: "agent", to: "sandbox", label: TOOLS.getOrder.call, step: 3 },
    {
      from: "sandbox",
      to: "agent",
      label: `kettle, £${BRIGHTPOST.price}, ${BRIGHTPOST.delivered}`,
      kind: "return",
      step: 3,
    },
    { from: "agent", to: "sandbox", label: TOOLS.searchHelp.call, step: 3 },
    { from: "sandbox", to: "agent", label: `"${BRIGHTPOST.helpArticle}": full refund`, kind: "return", step: 3 },

    // Step 4: the refund goes through the mock approver, then the email.
    { from: "agent", to: "sandbox", label: TOOLS.createRefund.call, step: 4 },
    { from: "sandbox", to: "agent", label: `approved, ${BRIGHTPOST.refundId}`, kind: "return", step: 4 },
    { from: "agent", to: "sandbox", label: TOOLS.sendEmail.call, step: 4 },
    { from: "sandbox", to: "agent", label: "sent", kind: "return", step: 4 },

    // Step 5: the reply, the persona stops, and the grader checks the state.
    { from: "agent", to: "persona", label: `£${BRIGHTPOST.price} refund on its way`, kind: "return", step: 5 },
    { from: "persona", to: "agent", label: "thanks (goal met: ends chat)", step: 5 },
    { from: "grader", to: "sandbox", label: "read end state", step: 5, delay: 0.4 },
    {
      from: "sandbox",
      to: "grader",
      label: `1 refund, £${BRIGHTPOST.price}, order ${BRIGHTPOST.orderId} = goal`,
      kind: "return",
      step: 5,
    },
    { from: "grader", to: "grader", label: "pass", step: 5 },
  ],
  notes: [
    { lane: "persona", text: `Script: refund ${BRIGHTPOST.orderId}; give the number only if asked`, step: 1, at: -0.5 },
    { lane: "sandbox", text: "Mock approver says yes", step: 4, at: 7.5 },
  ],
};

export default spec;
