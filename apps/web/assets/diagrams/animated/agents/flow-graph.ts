import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";

// The Brightpost refund as a fixed flow graph (chain-flow-orchestration). Code, not the model, owns the order of the
// nodes: classify → get_order and search_help in parallel → join → check → create_refund → reply → send_email. The
// graph has the three things a chain lacks: a branch (check sends £42 to the approval node because it is over £30;
// £30 or less would go straight to create_refund), a join (join waits for both parallel nodes) and a retry edge
// (create_refund times out once and runs again with the same idempotency key). A checkpointer saves the state after
// every step, which is what lets the run pause for a person and resume.
//
// Seven steps, one per stage of the worked example on the page: 1 classify reads the message · 2 fan out: get_order
// and search_help run in the same step · 3 join waits for both · 4 check routes on the amount · 5 approve pauses the
// run and the checkpoint is saved · 6 the support agent approves; create_refund times out and retries with the same
// key · 7 reply and send_email; the run ends. Nodes never move between steps.
//
// Layout: one zone ("Graph: one thread") holds every node of the graph; the checkpointer sits under it, outside.
// Top row runs left to right at y 130 (the parallel pair at y 72 and 190); the bottom row runs right to left at
// y 330, so the graph reads as one snake. The retry edge is a U-shaped loop under create_refund, x 455 to 545,
// down to y 416. Edges carry few labels (the gaps are short); the facts sit in each node's sub line. Node names are the graph's own node names, in code style, so they match the code block on the page.
//
// Colour (agents legend, four tones plus neutral): model calls green (classify, reply), tools teal (get_order,
// search_help, create_refund, send_email), the customer and the approval node orange, the checkpointer violet; join
// and check are plain code, neutral. No accent: every node is a step of equal rank. Arrows stay neutral.

const TOP = 130;
const BOTTOM = 330;

const spec: DiagramSpec = {
  title: "A flow graph: the Brightpost refund with a branch, a join and a retry",
  width: 880,
  height: 530,
  steps: [
    { title: "classify reads the message" },
    { title: "Fan out: two nodes run in the same step" },
    { title: "join waits for both" },
    { title: "check routes on the amount" },
    { title: "approve pauses the run; the checkpoint is saved" },
    { title: "Resume; create_refund times out and retries" },
    { title: "reply and send_email; the run ends" },
  ],
  zones: [{ id: "graph", title: "Graph: one thread", tone: AGENT_TONE.infra, x: 14, y: 14, w: 852, h: 432 }],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: `order ${BRIGHTPOST.orderId}`,
      icon: "users",
      tone: AGENT_TONE.task,
      fill: "pastel",
      x: 85,
      y: TOP,
      w: 130,
    },
    {
      id: "classify",
      label: "classify",
      sub: "model: refund",
      icon: "model",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: 245,
      y: TOP,
      w: 140,
    },
    {
      id: "get_order",
      label: TOOLS.getOrder.name,
      sub: `${BRIGHTPOST.item}, £${BRIGHTPOST.price}`,
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 2,
      x: 430,
      y: 72,
      w: 160,
    },
    {
      id: "search_help",
      label: TOOLS.searchHelp.name,
      sub: BRIGHTPOST.helpArticle,
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 2,
      x: 430,
      y: 190,
      w: 164,
    },
    {
      id: "join",
      label: "join",
      sub: "waits for both",
      icon: "git-merge",
      tone: AGENT_TONE.infra,
      step: 3,
      x: 600,
      y: TOP,
      w: 130,
    },
    {
      id: "check",
      label: "check",
      sub: `over £${BRIGHTPOST.approvalLimit}?`,
      icon: "route",
      tone: AGENT_TONE.infra,
      step: 4,
      x: 765,
      y: TOP,
      w: 130,
    },
    {
      id: "approve",
      label: "approve",
      sub: BRIGHTPOST.approver,
      icon: "approval",
      tone: AGENT_TONE.task,
      fill: "pastel",
      step: 4,
      x: 775,
      y: BOTTOM,
      w: 150,
    },
    {
      id: "create_refund",
      label: TOOLS.createRefund.name,
      sub: "same key on retry",
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 4,
      x: 500,
      y: BOTTOM,
      w: 170,
    },
    {
      id: "reply",
      label: "reply",
      sub: "model call",
      icon: "model",
      tone: AGENT_TONE.model,
      fill: "pastel",
      step: 7,
      x: 280,
      y: BOTTOM,
      w: 130,
    },
    {
      id: "send_email",
      label: TOOLS.sendEmail.name,
      sub: "then END",
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 7,
      x: 110,
      y: BOTTOM,
      w: 140,
    },
    {
      id: "checkpointer",
      label: "Checkpointer",
      sub: "state after each step",
      icon: "snapshot",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 5,
      x: 775,
      y: 485,
      w: 170,
    },
  ],
  edges: [
    // Step 1: the message enters the graph; one model call labels it.
    { from: "customer", to: "classify", packet: true },

    // Step 2: fan-out. Both edges leave classify, so both nodes run in the same step.
    { from: "classify", to: "get_order", packet: true, step: 2 },
    { from: "classify", to: "search_help", packet: true, step: 2 },

    // Step 3: join runs only when both inputs have arrived.
    { from: "get_order", to: "join", packet: true, step: 3 },
    { from: "search_help", to: "join", packet: true, step: 3 },

    // Step 4: the branch. £42 is over £30, so the approval edge is taken; the direct edge stays unused.
    { from: "join", to: "check", packet: true, step: 4 },
    {
      from: "check",
      to: "approve",
      label: `£${BRIGHTPOST.price} > £${BRIGHTPOST.approvalLimit}`,
      packet: true,
      step: 4,
    },
    { from: "check", to: "create_refund", label: `≤ £${BRIGHTPOST.approvalLimit}`, dashed: true, step: 4 },

    // Step 5: the interrupt. The run's state is saved and the process may stop.
    { from: "approve", to: "checkpointer", label: "save, pause", dashed: true, flow: true, step: 5 },

    // Step 6: resume, then one timeout and one retry with the same idempotency key.
    { from: "approve", to: "create_refund", label: "approved", packet: true, step: 6 },
    {
      from: "create_refund",
      to: "create_refund",
      label: "timeout: retry",
      packet: true,
      via: [
        [455, 392],
        [455, 416],
        [545, 416],
        [545, 392],
      ],
      step: 6,
    },

    // Step 7: the reply is written and sent; the graph reaches END.
    { from: "create_refund", to: "reply", label: BRIGHTPOST.refundId, packet: true, step: 7 },
    { from: "reply", to: "send_email", packet: true, step: 7 },
  ],
};

export default spec;
