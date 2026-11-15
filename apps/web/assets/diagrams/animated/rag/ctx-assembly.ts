import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// Architecture for context-engineering: the context builder of Brightpost's support agent, the one place that decides
// what the model sees on each turn. Built in five steps, one source of context at a time.
// 1 A versioned prompt and the customer's message go through the builder to the model.
// 2 The builder adds the top 5 help-centre chunks from the vector index (presets/rag.ts).
// 3 The model calls tools (get_order, search_help, create_refund, send_email); their results come back through the
//   builder, not straight into the model, so the builder can trim them.
// 4 A memory store (facts about this customer) and the conversation history join the context.
// 5 When the assembled context passes 80 % of the budget (ctx-budget), a compactor summarises old turns and writes
//   the summary back to the history store.
//
// Layout (centres): top row y 95, the sources: instructions 170 | vector index 400 | memory store 630.
// Middle row y 235: customer 95 | context builder 400 | LLM 705. Bottom row y 375: compactor 120 | history 400 |
// tools 705. Every source edge runs into the builder; the tool loop is LLM → tools → builder → LLM.
//
// Tones (four plus neutral): the index and the memory store violet, the LLM and the compactor green, the tools teal,
// the history orange (the conversation); the customer, the instructions and the builder neutral. The builder is the
// accent: it is what the page is about.

const W = 150; // the builder is 176 wide for its longer label
const ROW = { top: 95, mid: 235, bottom: 375 } as const;

const spec: DiagramSpec = {
  title: "A context builder that assembles the model's input on every turn",
  width: 880,
  height: 440,
  steps: [
    { title: "Instructions and the message" },
    { title: "Add retrieved chunks" },
    { title: "Add tools and their results" },
    { title: "Add memory and history" },
    { title: "Compact when the budget runs low" },
  ],
  zones: [{ id: "sources", title: "Sources of context", tone: RAG_TONE.infra, x: 70, y: 45, w: 660, h: 96 }],
  nodes: [
    {
      id: "instructions",
      label: "Instructions",
      sub: "versioned",
      icon: "prompt",
      tone: RAG_TONE.infra,
      x: 170,
      y: ROW.top,
      w: W,
    },
    {
      id: "index",
      label: "Vector index",
      sub: `${fmt(CORPUS.chunks)} chunks`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
      x: 400,
      y: ROW.top,
      w: W,
    },
    {
      id: "memory",
      label: "Memory store",
      sub: "this customer",
      icon: "database",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 4,
      x: 630,
      y: ROW.top,
      w: W,
    },
    {
      id: "customer",
      label: "Customer",
      sub: "chat",
      icon: "users",
      tone: RAG_TONE.infra,
      x: 95,
      y: ROW.mid,
      w: W,
    },
    {
      id: "builder",
      label: "Context builder",
      sub: "select · order",
      icon: "pipeline",
      tone: RAG_TONE.infra,
      accent: true,
      x: 400,
      y: ROW.mid,
      w: 176,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "replies or calls",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      x: 705,
      y: ROW.mid,
      w: W,
    },
    {
      id: "compactor",
      label: "Compactor",
      sub: "summarises",
      icon: "minimize",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 5,
      x: 120,
      y: ROW.bottom,
      w: W,
    },
    {
      id: "history",
      label: "History",
      sub: "every turn",
      icon: "history",
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 4,
      x: 400,
      y: ROW.bottom,
      w: W,
    },
    {
      id: "tools",
      label: "Tools",
      sub: "get_order …",
      icon: "wrench",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 705,
      y: ROW.bottom,
      w: W,
    },
  ],
  edges: [
    // Step 1
    { from: "customer", to: "builder", label: "message", packet: true },
    { from: "instructions", to: "builder", packet: true },
    { from: "builder", to: "llm", label: "context", packet: true, delay: 0.8 },
    // Step 2
    { from: "index", to: "builder", label: `top ${TOP_K} chunks`, packet: true, step: 2 },
    // Step 3
    { from: "llm", to: "tools", label: "tool call", packet: true, step: 3 },
    { from: "tools", to: "builder", label: "results", packet: true, delay: 0.8, step: 3 },
    // Step 4
    { from: "memory", to: "builder", label: "facts", packet: true, step: 4 },
    { from: "builder", to: "history", label: "read / append", bidirectional: true, step: 4 },
    // Step 5
    { from: "builder", to: "compactor", label: "over 80 %", dashed: true, step: 5 },
    { from: "compactor", to: "history", label: "summary", packet: true, delay: 0.8, step: 5 },
  ],
};

export default spec;
