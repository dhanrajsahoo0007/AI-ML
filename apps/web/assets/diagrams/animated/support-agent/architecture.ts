import type { DiagramSpec, LayoutTone } from "@/components/diagrams/types";
import { CORPUS, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// Brightpost's customer support agent (genai-system-design/case-studies/customer-support-agent), built one
// requirement at a time. Case-study figure: zones and tones follow the "Architecture diagram groups" table in
// content/system-design/CASE-STUDY-FORMAT.md, not the RAG legend.
//
// Seven steps, each naming the requirement it meets (F1–F6 on the page): 1 answer from the help centre (F1) · 2 keep
// the help index fresh (F1) · 3 look up the customer's own orders (F2) · 4 refunds behind a policy check (F3) ·
// 5 escalate to a person with a summary (F4) · 6 one ticket across turns and channels (F5) · 7 grade every
// resolution (F6). Nodes never move between steps.
//
// Grid: five columns at x 90 | 265 | 440 | 615 | 790 (175 apart, cards 150 wide) and four rows at y 100 | 225 |
// 350 | 475.
//
//            c1               c2             c3                c4               c5
//   r1       Customer         LLM            ·                 Refund policy    Payments API
//   r2       Chat gateway     ·              Support agent*    Account tools    Order API
//   r3       Helpdesk         Ticket store   Help index        Retriever        ·
//   r4       ·                Eval and QA    Ingestion         ·                Help centre CMS
//
// The escalation runs left under the gateway and drops down x 176, between the zones, into the side of the helpdesk, clear of the zone titles; the
// helpdesk's reply and the eval's reads of the ticket store are told in the text, not drawn, so no edge cuts a zone
// title. Labels only on long edges (the 25-unit gaps between columns are too short). Every edge is a straight line or a diagonal through an empty cell, so nothing crosses: the gateway reaches the
// agent through the empty c2-r2 cell; the escalation runs diagonally from the agent down-left to the helpdesk; the
// CMS feeds ingestion through the empty c4-r4 cell.
//
// Refund limit (illustrative): the policy approves refunds up to £50 on the customer's own order; larger ones go to
// a person.

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
const Y = [100, 225, 350, 475] as const;
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
  title: "Customer support agent: answers, account tools and refunds behind a policy, with a way out to people",
  width: 880,
  height: 540,
  steps: [
    { title: "Answer from the help centre", covers: "F1" },
    { title: "Keep the help index fresh", covers: "F1" },
    { title: "Look up the customer's own orders", covers: "F2" },
    { title: "Refunds go through a policy check", covers: "F3" },
    { title: "Escalate to a person with a summary", covers: "F4" },
    { title: "One ticket across turns and channels", covers: "F5" },
    { title: "Grade every resolution", covers: "F6" },
  ],
  zones: [
    zone("clients", "Clients", ZONE_TONE.clients, 0, 0, 40, 145),
    zone("edge", "Edge", ZONE_TONE.edge, 0, 0, 165, 270),
    zone("team", "Support team", "neutral", 0, 0, 290, 420),
    zone("core", "Core request path", ZONE_TONE.core, 1, 2, 40, 270),
    zone("services", "Application services", ZONE_TONE.services, 3, 3, 40, 420),
    zone("storage", "Storage", ZONE_TONE.storage, 1, 2, 290, 420),
    zone("async", "Async pipeline", ZONE_TONE.async, 1, 2, 440, 525),
    zone("company", "Brightpost systems", "neutral", 4, 4, 40, 525),
  ],
  nodes: [
    // Step 1: a cited answer from the help centre.
    { id: "customer", label: "Customer", sub: "web chat, email", icon: "users", x: X[0], y: Y[0], w: W },
    {
      id: "gateway",
      label: "Chat gateway",
      sub: "sign-in, limits",
      icon: "gateway",
      tone: ZONE_TONE.edge,
      x: X[0],
      y: Y[1],
      w: W,
    },
    {
      id: "agent",
      label: "Support agent",
      sub: "plans, calls",
      icon: "coordinator",
      tone: ZONE_TONE.core,
      accent: true,
      x: X[2],
      y: Y[1],
      w: W,
    },
    { id: "llm", label: "LLM", sub: "writes, cites", icon: "model", tone: ZONE_TONE.core, x: X[1], y: Y[0], w: W },
    {
      id: "retriever",
      label: "Retriever",
      sub: `top ${TOP_K} chunks`,
      icon: "search",
      tone: ZONE_TONE.services,
      x: X[3],
      y: Y[2],
      w: W,
    },
    {
      id: "index",
      label: "Help index",
      sub: `${fmt(CORPUS.chunks)} chunks`,
      icon: "vector-index",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      x: X[2],
      y: Y[2],
    },

    // Step 2: ingestion keeps the index fresh.
    {
      id: "ingest",
      label: "Ingestion",
      sub: "chunk, embed",
      icon: "pipeline",
      tone: ZONE_TONE.async,
      step: 2,
      x: X[2],
      y: Y[3],
      w: W,
    },
    {
      id: "cms",
      label: "Help centre",
      sub: `${fmt(CORPUS.articles)} articles`,
      icon: "folder",
      step: 2,
      x: X[4],
      y: Y[3],
      w: W,
    },

    // Step 3: read-only account tools.
    {
      id: "tools",
      label: "Account tools",
      sub: "own orders only",
      icon: "api",
      tone: ZONE_TONE.services,
      step: 3,
      x: X[3],
      y: Y[1],
      w: W,
    },
    { id: "orders", label: "Order API", sub: "status, tracking", icon: "bag", step: 3, x: X[4], y: Y[1], w: W },

    // Step 4: money moves only through the policy.
    {
      id: "policy",
      label: "Refund policy",
      sub: "auto up to £50",
      icon: "policy",
      tone: ZONE_TONE.services,
      step: 4,
      x: X[3],
      y: Y[0],
      w: W,
    },
    { id: "payments", label: "Payments API", sub: "refunds", icon: "card", step: 4, x: X[4], y: Y[0], w: W },

    // Step 5: the way out to people.
    { id: "helpdesk", label: "Helpdesk", sub: "human agents", icon: "ticket", step: 5, x: X[0], y: Y[2], w: W },

    // Step 6: one ticket for the whole conversation.
    {
      id: "tickets",
      label: "Ticket store",
      sub: "turns, actions",
      icon: "database",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      step: 6,
      x: X[1],
      y: Y[2],
    },

    // Step 7: grading.
    {
      id: "eval",
      label: "Eval and QA",
      sub: "samples tickets",
      icon: "meter",
      tone: ZONE_TONE.async,
      step: 7,
      x: X[1],
      y: Y[3],
      w: W,
    },
  ],
  edges: [
    // A how-to question, packet by packet.
    { from: "customer", to: "gateway", bidirectional: true, packet: true },
    { from: "gateway", to: "agent", bidirectional: true, packet: true, delay: 0.6 },
    { from: "agent", to: "retriever", bidirectional: true, packet: true, delay: 1.2 },
    { from: "index", to: "retriever", packet: true, delay: 1.2 },
    { from: "agent", to: "llm", label: "prompt", bidirectional: true, packet: true, delay: 1.8 },

    // Freshness.
    { from: "cms", to: "ingest", label: "edited articles", packet: true },
    { from: "ingest", to: "index", packet: true, delay: 0.6 },

    // Tools: reads, then refunds through the policy.
    { from: "agent", to: "tools", bidirectional: true },
    { from: "tools", to: "orders", bidirectional: true },
    { from: "tools", to: "policy", label: "refunds", bidirectional: true },
    { from: "policy", to: "payments" },

    // Escalation.
    {
      from: "agent",
      to: "helpdesk",
      label: "summary",
      dashed: true,
      labelAt: 0.35,
      via: [
        [176, 262],
        [176, 350],
      ],
    },

    // State and grading.
    { from: "tickets", to: "agent", bidirectional: true },
  ],
};

export default spec;
