import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, HAPPY_PATH_COUNTS, TOOLS } from "@/components/diagrams/presets/agents";
import { PER_CUSTOMER_LIMIT } from "@/components/diagrams/presets/llm-anatomy";
import { SAMPLE_RATE } from "@/components/diagrams/presets/production-online";
import { CORPUS, PROMPT, TOP_K } from "@/components/diagrams/presets/rag";

// The map of the whole hub (anatomy-of-an-llm-application, hero and Architecture). One Brightpost request, the agents
// track's refund ("My kettle arrived cracked. It's order 4471. Can I get my money back?"), passes through every layer
// of an LLM application, one layer per step. The page reuses this spec with `highlight` in the section on each layer.
//
// Seven steps, one per layer (each layer is a group of the hub):
//   1 Gateway: the message enters through the gateway, which checks the signed-in customer (1847) and the limit of
//     20 messages a minute, then passes it to the harness (Brightpost's chat service).
//   2 Prompt and context: the harness builds the prompt: system prompt, history and the four tool definitions.
//   3 Retrieval: search_help reads the help-centre index (3,600 chunks, presets/rag.ts CORPUS) and returns the top 5.
//   4 Model and serving: the prompt (≈ 2,200 tokens, PROMPT) goes to the model on its inference engine; the model
//     answers with a tool call or with words, never by running anything itself.
//   5 Tools and agents: the harness runs the tool calls; the refund of £42 is over £30, so it waits for the support
//     agent. The loop takes 5 model calls and 4 tool calls (HAPPY_PATH_COUNTS).
//   6 Guardrails: the harness checks the message on the way in and the reply on the way out; the one-way message
//     edge is replaced by a two-way edge that also carries the checked reply.
//   7 Evaluation and observability: every span goes to the trace store; a model judge grades 5 % of them
//     (SAMPLE_RATE, presets/production-online.ts), off the customer's path.
// Nodes never move between steps; the message edge of step 1 ends at step 5 (`until`) and step 6 replaces it.
//
// Fact checks (2026-11-16): the model only asks for a tool and the application runs it (ReAct, Yao et al. 2022,
// arXiv 2210.03629); retrieval as non-parametric memory beside the model's weights (Lewis et al. 2020, arXiv
// 2005.11401); input and output classification as separate checks (Llama Guard, Inan et al. 2023, arXiv 2312.06674);
// spans, metrics and events for model calls and agents (OpenTelemetry GenAI semantic conventions, checked November
// 2026).
//
// Layout (880 × 510), three rows (y 90, 260, 430) and four columns:
//   x 60/75: customer (glyph, row 260), evals (row 430)
//   x 250/310: help-centre index (row 90), gateway (row 260), trace store (x 310, row 430)
//   x 500: prompt and context (row 90), harness (row 260), guardrails (row 430)
//   x 790: model (row 90), tools (row 260), support agent (glyph, row 430)
// Gaps between neighbouring boxes are at least 70 units so every edge label pill fits. The harness → trace store
// edge runs diagonally under the gateway (it is at x 471 when it passes the gateway's bottom edge, y 285).
// Colour (agents legend, four tones plus neutral): model green (the accent), tools teal, stores violet (index, trace
// store), checks lime (guardrails, evals), people and plumbing neutral (customer, gateway, harness, prompt, support
// agent; RAG_TONE also draws the user neutral). Arrows stay neutral.

const COL = { a: 60, b: 250, c: 500, d: 790 } as const;
const ROW = { top: 90, mid: 260, low: 430 } as const;

const spec: DiagramSpec = {
  title: "Anatomy of an LLM application: one refund request through every layer",
  width: 880,
  height: 510,
  steps: [
    { title: "Gateway: the request comes in" },
    { title: "Prompt and context: the harness builds the prompt" },
    { title: "Retrieval: the help centre adds the facts" },
    { title: "Model and serving: the model picks the next step" },
    { title: "Tools and agents: the harness runs the calls" },
    { title: "Guardrails: check the way in and the way out" },
    { title: "Evaluation and observability: record and grade" },
  ],
  zones: [],
  nodes: [
    // Step 1: gateway
    {
      id: "customer",
      label: "Customer",
      sub: `${BRIGHTPOST.customerId}, signed in`,
      icon: "users",
      tone: AGENT_TONE.infra,
      variant: "glyph",
      x: COL.a,
      y: ROW.mid,
    },
    {
      id: "gateway",
      label: "Gateway",
      sub: `${PER_CUSTOMER_LIMIT} a minute`,
      icon: "gateway",
      tone: AGENT_TONE.infra,
      x: COL.b,
      y: ROW.mid,
      w: 150,
    },
    {
      id: "harness",
      label: "Harness",
      sub: "Brightpost chat service",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: COL.c,
      y: ROW.mid,
      w: 196,
    },
    // Step 2: prompt and context
    {
      id: "context",
      label: "Prompt + context",
      sub: "system, history, tools",
      icon: "prompt",
      tone: AGENT_TONE.infra,
      step: 2,
      x: COL.c,
      y: ROW.top,
      w: 180,
    },
    // Step 3: retrieval
    {
      id: "index",
      label: "Help-centre index",
      sub: `${CORPUS.chunks.toLocaleString("en-GB")} chunks`,
      icon: "vector-index",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 3,
      x: COL.b,
      y: ROW.top,
      w: 180,
    },
    // Step 4: model and serving
    {
      id: "model",
      label: "Model",
      sub: "inference engine",
      icon: "model",
      tone: AGENT_TONE.model,
      accent: true,
      step: 4,
      x: COL.d,
      y: ROW.top,
      w: 150,
    },
    // Step 5: tools and agents
    {
      id: "tools",
      label: "Tools",
      sub: "order, refund, email",
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 5,
      x: COL.d,
      y: ROW.mid,
      w: 166,
    },
    {
      id: "agent",
      label: BRIGHTPOST.approver,
      sub: `approves over £${BRIGHTPOST.approvalLimit}`,
      icon: "approval",
      tone: AGENT_TONE.infra,
      variant: "glyph",
      step: 5,
      x: COL.d,
      y: ROW.low,
    },
    // Step 6: guardrails
    {
      id: "guard",
      label: "Guardrails",
      sub: "input + output checks",
      icon: "shield",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 6,
      x: COL.c,
      y: ROW.low,
      w: 176,
    },
    // Step 7: evaluation and observability
    {
      id: "traces",
      label: "Trace store",
      sub: "every span",
      icon: "trace",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 7,
      x: 310,
      y: ROW.low,
      w: 150,
    },
    {
      id: "evals",
      label: "Evals",
      sub: "model judge",
      icon: "chart",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 7,
      x: 75,
      y: ROW.low,
      w: 130,
    },
  ],
  edges: [
    // Step 1: the message comes in; the gateway lets it through to the harness.
    { from: "customer", to: "gateway", label: "message", packet: true, until: 5 },
    { from: "gateway", to: "harness", label: "allowed", packet: true, delay: 0.6 },

    // Step 2: the harness builds the prompt.
    { from: "harness", to: "context", label: "build", packet: true, step: 2 },

    // Step 3: search_help returns the top 5 chunks into the context.
    { from: "index", to: "context", label: `top ${TOP_K}`, packet: true, step: 3 },

    // Step 4: the prompt goes to the model; the model answers with a tool call (or, at the end, with words).
    { from: "context", to: "model", label: PROMPT.rounded, packet: true, step: 4 },
    { from: "model", to: "harness", label: "tool call", packet: true, delay: 0.8, step: 4 },

    // Step 5: the harness runs the calls; the £42 refund waits for the support agent.
    {
      from: "harness",
      to: "tools",
      label: `${HAPPY_PATH_COUNTS.toolCalls} calls`,
      packet: true,
      bidirectional: true,
      step: 5,
    },
    { from: "tools", to: "agent", label: `${TOOLS.createRefund.name} £${BRIGHTPOST.price}?`, packet: true, step: 5 },

    // Step 6: guardrails check the message and the reply; the reply goes back through the gateway.
    { from: "harness", to: "guard", label: "check", bidirectional: true, packet: true, step: 6 },
    { from: "customer", to: "gateway", label: "reply", bidirectional: true, packet: true, step: 6 },

    // Step 7: every span is recorded; a judge grades a sample, off the customer's path.
    { from: "harness", to: "traces", label: "spans", dashed: true, flow: true, step: 7 },
    {
      from: "traces",
      to: "evals",
      label: `${Math.round(SAMPLE_RATE * 100)} % judged`,
      dashed: true,
      flow: true,
      step: 7,
    },
  ],
};

export default spec;
