import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";

// The agents hero: one Brightpost refund through the agent loop (agent-architectures). The customer writes "My kettle
// arrived cracked. It's order 4471. Can I get my money back?". The harness (Brightpost's chat service) sends the
// message and the four tool definitions to the model; the model answers with a tool call or with words; the harness
// runs each call and sends the result back. The model never touches a tool itself.
//
// Seven steps (agents plan §7): 1 the message and the tool list reach the model · 2 the model asks for the order ·
// 3 the harness runs get_order and returns the result · 4 the model looks up the refund rule with search_help · 5 the
// model asks to refund £42; it is over £30, so the harness saves the run and asks the support agent · 6 the support
// agent approves at 10:20 and create_refund runs · 7 the model sends the email and answers; it asks for no tool, so
// the loop ends. Nodes never move between steps; the approval request (step 5) is an edge with `until`, replaced by
// the approval in step 6.
//
// Layout: three columns. Left x 95: customer (row 250) and support agent (row 430). Middle x 345: model (row 90),
// harness (row 250), run state (row 430). Right x 655, inside the Tools zone: the four tools at rows 90, 170, 250, 330.
// The harness ⇄ model pair has two edges, bent apart through x 278 (up: messages and results) and x 412 (down: tool
// calls), so both labels show. Labels on the edges to the tools stay short (about 11 characters) so their pills fit
// between the harness and the Tools zone. The reply to the customer dips under the message edge through (215, 292).
//
// Colour (agents legend, four tones plus neutral): the model green (the accent), the customer and the support agent
// orange, the tools teal, the run state violet, the harness neutral. Arrows stay neutral.

const COL = { left: 95, mid: 345, right: 655 } as const;
const ROW = { model: 90, harness: 250, bottom: 430 } as const;
const TOOL_ROWS = [90, 170, 250, 330] as const;

const spec: DiagramSpec = {
  title: "The agent loop: one refund, step by step",
  width: 800,
  height: 510,
  steps: [
    { title: "The message and the tool list reach the model" },
    { title: "The model asks for the order" },
    { title: "The harness runs the tool and returns the result" },
    { title: "The model looks up the refund rule" },
    { title: "The model asks to refund; the harness pauses" },
    { title: "The support agent approves; the refund runs" },
    { title: "The model answers and the loop ends" },
  ],
  zones: [{ id: "tools", title: "Tools", tone: AGENT_TONE.action, x: 550, y: 26, w: 230, h: 354 }],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: `${BRIGHTPOST.customerId}, signed in`,
      icon: "users",
      tone: AGENT_TONE.task,
      variant: "glyph",
      x: COL.left,
      y: ROW.harness,
    },
    {
      id: "model",
      label: "Model",
      sub: "picks the next step",
      icon: "model",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL.mid,
      y: ROW.model,
      w: 176,
    },
    {
      id: "harness",
      label: "Harness",
      sub: "Brightpost chat service",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: COL.mid,
      y: ROW.harness,
      w: 196,
    },
    ...(
      [
        ["get_order", TOOLS.getOrder],
        ["search_help", TOOLS.searchHelp],
        ["create_refund", TOOLS.createRefund],
        ["send_email", TOOLS.sendEmail],
      ] as const
    ).map(([id, tool], i) => ({
      id,
      label: tool.name,
      sub: tool.params,
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel" as const,
      x: COL.right,
      y: TOOL_ROWS[i],
      w: 190,
    })),
    {
      id: "agent",
      label: BRIGHTPOST.approver,
      sub: `approves over £${BRIGHTPOST.approvalLimit}`,
      icon: "approval",
      tone: AGENT_TONE.task,
      variant: "glyph",
      step: 5,
      x: COL.left,
      y: ROW.bottom,
    },
    {
      id: "state",
      label: "Run state",
      sub: "messages so far",
      icon: "history",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 5,
      x: COL.mid,
      y: ROW.bottom,
      w: 176,
    },
  ],
  edges: [
    // Step 1: the customer's message, then the message and the four tool definitions go to the model.
    { from: "customer", to: "harness", label: "message", packet: true },
    {
      from: "harness",
      to: "model",
      label: "messages + 4 tools",
      packet: true,
      delay: 0.8,
      via: [[278, 170]],
      labelAt: 0.5,
    },

    // Step 2: the model answers with a tool call, not with words.
    { from: "model", to: "harness", label: "tool call", packet: true, via: [[412, 170]], labelAt: 0.5, step: 2 },

    // Step 3: the harness runs get_order; the result goes back up the message edge.
    {
      from: "harness",
      to: "get_order",
      label: `order ${BRIGHTPOST.orderId}`,
      packet: true,
      bidirectional: true,
      labelAt: 0.5,
      step: 3,
    },

    // Step 4: the second call looks up the refund rule.
    {
      from: "harness",
      to: "search_help",
      label: "refund rule",
      packet: true,
      bidirectional: true,
      labelAt: 0.5,
      step: 4,
    },

    // Step 5: £42 is over £30. The harness saves the run and asks a person instead of refunding.
    { from: "harness", to: "state", label: "save and pause", dashed: true, flow: true, step: 5 },
    { from: "harness", to: "agent", label: `approve £${BRIGHTPOST.price}?`, packet: true, step: 5, until: 5 },

    // Step 6: the approval resumes the run and the refund is created.
    { from: "agent", to: "harness", label: `approved ${BRIGHTPOST.approvedAt}`, packet: true, step: 6 },
    {
      from: "harness",
      to: "create_refund",
      label: `£${BRIGHTPOST.price}.00`,
      packet: true,
      bidirectional: true,
      labelAt: 0.5,
      step: 6,
    },

    // Step 7: the confirmation email, then the reply; the model asked for no tool, so the loop ends.
    { from: "harness", to: "send_email", label: "confirmation", packet: true, labelAt: 0.64, step: 7 },
    { from: "harness", to: "customer", label: "reply", packet: true, via: [[215, 292]], step: 7 },
  ],
};

export default spec;
