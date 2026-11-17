import type { DiagramSpec, LayoutTone } from "@/components/diagrams/types";

// The enterprise AI assistant (genai-system-design/case-studies/conversational-assistant-design), built up one
// capability at a time. Case-study figure: zones and tones follow the "Architecture diagram groups" table in
// content/system-design/CASE-STUDY-FORMAT.md, not the RAG legend.
//
// Eight steps: 1 chat over one model · 2 answer from company documents · 3 keep the index and its permissions in
// sync · 4 route each message by intent · 5 act through scoped tools · 6 remember the conversation · 7 screen what
// goes in and out · 8 trace and evaluate every turn. Nodes never move between steps. Two early shortcuts (the gateway
// straight to the orchestrator, the LLM straight back to the gateway) last until step 6; guardrails replace them in
// step 7.
//
// Grid: five columns at x 90 | 265 | 440 | 615 | 790 (175 apart, cards 150 wide) and four rows at y 100 | 225 |
// 350 | 500.
//
//            c1               c2             c3               c4              c5
//   r1       Employee         LLM            Intent router    Handoff         ·
//   r2       API gateway      Guardrails     Orchestrator*    Tool agent      Company APIs
//   r3       ·                Memory         Search index     Retriever       ·
//   r4       ·                Observability  Connectors       ·               Company docs
//
// The orchestrator is the hub: it asks the router for the intent, calls the retriever or the tool agent, and sends
// the prompt to the LLM; the LLM's draft goes up to the guardrails and back out through the gateway. Every edge is a
// straight line or a short diagonal through an empty gap, so nothing crosses.
//
// Zones (CASE-STUDY-FORMAT): Clients neutral, Edge blue, core request path green (orchestrator is the accent),
// application services teal, async pipeline orange, storage violet. The company's own systems (document sources and
// the APIs the tools call) sit in a neutral "Company systems" zone. Data stores use the glyph variant.

/** The zone table from CASE-STUDY-FORMAT.md, by group. */
const ZONE_TONE = {
  clients: "neutral",
  edge: "blue",
  core: "green",
  services: "teal",
  async: "orange",
  storage: "violet",
} as const satisfies Record<string, LayoutTone>;

const X = [90, 265, 440, 615, 790] as const;
const Y = [100, 225, 350, 500] as const;
const W = 150;

/** A zone around columns c0..c1 (0-based), from top `y` to bottom `b`. */
const zone = (id: string, title: string, tone: LayoutTone, c0: number, c1: number, y: number, b: number) => ({
  id,
  title,
  tone,
  x: X[c0] - 82,
  y,
  w: X[c1] - X[c0] + 164,
  h: b - y,
});

const spec: DiagramSpec = {
  title: "Enterprise AI assistant: routed pipelines around one orchestrator",
  width: 880,
  height: 560,
  steps: [
    { title: "Chat over one model" },
    { title: "Answer from company documents" },
    { title: "Keep the index and its permissions in sync" },
    { title: "Route each message by intent" },
    { title: "Act through scoped tools" },
    { title: "Remember the conversation" },
    { title: "Screen what goes in and what comes out" },
    { title: "Trace and evaluate every turn" },
  ],
  zones: [
    zone("clients", "Clients", ZONE_TONE.clients, 0, 0, 40, 145),
    zone("edge", "Edge", ZONE_TONE.edge, 0, 0, 165, 270),
    zone("core", "Core request path", ZONE_TONE.core, 1, 2, 40, 270),
    zone("services", "Application services", ZONE_TONE.services, 3, 3, 40, 420),
    zone("storage", "Storage", ZONE_TONE.storage, 1, 2, 290, 420),
    zone("async", "Async pipeline", ZONE_TONE.async, 1, 2, 440, 545),
    zone("company", "Company systems", "neutral", 4, 4, 165, 545),
  ],
  nodes: [
    // Step 1: the smallest assistant.
    { id: "employee", label: "Employee", sub: "signed in, SSO", icon: "users", x: X[0], y: Y[0], w: W },
    {
      id: "gateway",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: ZONE_TONE.edge,
      x: X[0],
      y: Y[1],
      w: W,
    },
    {
      id: "orch",
      label: "Orchestrator",
      sub: "state, calls",
      icon: "coordinator",
      tone: ZONE_TONE.core,
      accent: true,
      x: X[2],
      y: Y[1],
      w: W,
    },
    { id: "llm", label: "LLM", sub: "writes, cites", icon: "model", tone: ZONE_TONE.core, x: X[1], y: Y[0], w: W },

    // Step 2: retrieval.
    {
      id: "retriever",
      label: "Retriever",
      sub: "hybrid + ACL",
      icon: "search",
      tone: ZONE_TONE.services,
      step: 2,
      x: X[3],
      y: Y[2],
      w: W,
    },
    {
      id: "index",
      label: "Search index",
      sub: "chunks + ACLs",
      icon: "vector-index",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      step: 2,
      x: X[2],
      y: Y[2],
    },

    // Step 3: ingestion with permission sync.
    {
      id: "connectors",
      label: "Connectors",
      sub: "docs + ACLs",
      icon: "pipeline",
      tone: ZONE_TONE.async,
      step: 3,
      x: X[2],
      y: Y[3],
      w: W,
    },
    {
      id: "docs",
      label: "Company docs",
      sub: "wikis, drives",
      icon: "folder",
      step: 3,
      x: X[4],
      y: Y[3],
      w: W,
    },

    // Step 4: intent routing and the way out to a person.
    {
      id: "router",
      label: "Intent router",
      sub: "3 paths",
      icon: "flag",
      tone: ZONE_TONE.core,
      step: 4,
      x: X[2],
      y: Y[0],
      w: W,
    },
    {
      id: "handoff",
      label: "Handoff",
      sub: "to a person",
      icon: "chat",
      tone: ZONE_TONE.services,
      step: 4,
      x: X[3],
      y: Y[0],
      w: W,
    },

    // Step 5: actions.
    {
      id: "agent",
      label: "Tool agent",
      sub: "confirms first",
      icon: "robot",
      tone: ZONE_TONE.services,
      step: 5,
      x: X[3],
      y: Y[1],
      w: W,
    },
    {
      id: "apis",
      label: "Company APIs",
      sub: "tickets, HR",
      icon: "api",
      step: 5,
      x: X[4],
      y: Y[1],
      w: W,
    },

    // Step 6: memory.
    {
      id: "memory",
      label: "Memory",
      sub: "chat + prefs",
      icon: "database",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      step: 6,
      x: X[1],
      y: Y[2],
    },

    // Step 7: guardrails on the way in and the way out.
    {
      id: "guard",
      label: "Guardrails",
      sub: "input, output",
      icon: "shield",
      tone: ZONE_TONE.core,
      step: 7,
      x: X[1],
      y: Y[1],
      w: W,
    },

    // Step 8: observability.
    {
      id: "obs",
      label: "Observability",
      sub: "traces, evals",
      icon: "trace",
      tone: ZONE_TONE.async,
      step: 8,
      x: X[1],
      y: Y[3],
      w: W,
    },
  ],
  edges: [
    // The request path for a knowledge question, packet by packet.
    { from: "employee", to: "gateway", bidirectional: true, packet: true },
    { from: "gateway", to: "orch", packet: true, delay: 0.6, until: 6 },
    { from: "gateway", to: "guard", bidirectional: true, packet: true, delay: 0.6 },
    { from: "guard", to: "orch", packet: true, delay: 1.2 },
    { from: "orch", to: "retriever", bidirectional: true, packet: true, delay: 1.8 },
    { from: "index", to: "retriever", packet: true, delay: 1.8 },
    { from: "orch", to: "llm", label: "prompt", packet: true, delay: 2.4 },
    { from: "llm", to: "gateway", packet: true, delay: 3, until: 6 },
    { from: "llm", to: "guard", label: "draft", packet: true, delay: 3 },

    // Ingestion keeps the index and its access lists current.
    { from: "docs", to: "connectors", packet: true },
    { from: "connectors", to: "index", label: "chunks + ACLs", packet: true, delay: 0.6 },

    // Routing, the action path and the handoff.
    { from: "orch", to: "router", bidirectional: true },
    { from: "router", to: "handoff", dashed: true },
    { from: "orch", to: "agent", bidirectional: true },
    { from: "agent", to: "apis", bidirectional: true },

    // State and observability.
    { from: "memory", to: "orch" },
    { from: "gateway", to: "obs", label: "every turn", dashed: true, labelAt: 0.4, via: [[X[0], Y[3]]] },
  ],
};

export default spec;
