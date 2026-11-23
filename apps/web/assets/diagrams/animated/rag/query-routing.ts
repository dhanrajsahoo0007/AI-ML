import type { DiagramSpec } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE } from "@/components/diagrams/presets/rag";

// Query routing: one front door, several back ends. Brightpost's assistant receives four kinds of message; a router
// (a small classifier or an LLM call that returns a label) condenses the chat into a standalone question, decides
// what it needs, and sends it to one route:
//   "How do I reset my password if I lost my phone?" (QUESTIONS.main)  → vector search over the help centre
//   "What does error E1234 mean?" (QUESTIONS.keyword)                   → keyword (BM25) search for the exact code
//   "Where is my order 1042?"                                            → a read-only SQL query over the customer's orders
//   "Thanks, that worked!"                                               → no retrieval: the LLM replies directly
// The order and the thank-you are this figure's own examples (not in presets/rag.ts).
//
// Steps: 1 the router · 2–5 one route per example; the step titles quote the example. Nodes never move.
// Layout: question x 85 · router x 270 · routes x 520 (rows 75 | 165 | 255 | 345) · LLM x 770, all on the middle row
// y 210 except the routes. Cards 150 wide (routes 166); the examples live in the route cards' sub lines, so the fan of edges
// carries no labels.
// Colour (four tones plus neutral): the question orange, vector search and the orders database violet (stores),
// keyword search teal, the LLM green; the router is the neutral accent (orchestration), "no retrieval" is neutral.

const X = { question: 85, router: 270, route: 520, llm: 770 } as const;
const MID = 210;
const ROW = [75, 165, 255, 345] as const;
const W = 150;
/** Route cards are wider: "Keyword search" needs about 100 px beside its icon. */
const RW = 166;

const ROUTE_EXAMPLES = {
  vector: QUESTIONS.main,
  keyword: QUESTIONS.keyword,
  sql: "Where is my order 1042?",
  none: "Thanks, that worked!",
} as const;

const spec: DiagramSpec = {
  title: "Query routing: each question goes to the source that can answer it",
  width: 880,
  height: 410,
  steps: [
    { title: "Every message goes through the router first" },
    { title: `"${ROUTE_EXAMPLES.vector}": vector search` },
    { title: `"${ROUTE_EXAMPLES.keyword}": keyword search` },
    { title: `"${ROUTE_EXAMPLES.sql}": SQL over orders` },
    { title: `"${ROUTE_EXAMPLES.none}": no retrieval` },
  ],
  zones: [{ id: "routes", title: "Routes", tone: RAG_TONE.infra, x: 425, y: 20, w: 190, h: 375 }],
  nodes: [
    {
      id: "question",
      label: "Question",
      sub: "from the chat",
      icon: "chat",
      tone: RAG_TONE.query,
      fill: "pastel",
      x: X.question,
      y: MID,
      w: W,
    },
    {
      id: "router",
      label: "Query router",
      sub: "condense, label",
      icon: "split",
      tone: RAG_TONE.infra,
      accent: true,
      x: X.router,
      y: MID,
      w: W,
    },
    {
      id: "vector",
      label: "Vector search",
      sub: "reset password",
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
      x: X.route,
      y: ROW[0],
      w: RW,
    },
    {
      id: "keyword",
      label: "Keyword search",
      sub: "error E1234",
      icon: "search",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 3,
      x: X.route,
      y: ROW[1],
      w: RW,
    },
    {
      id: "sql",
      label: "SQL: orders",
      sub: "order 1042",
      icon: "database",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 4,
      x: X.route,
      y: ROW[2],
      w: RW,
    },
    {
      id: "none",
      label: "No retrieval",
      sub: '"thanks!"',
      icon: "message-circle",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 5,
      x: X.route,
      y: ROW[3],
      w: RW,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "answers, cites",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 2,
      x: X.llm,
      y: MID,
      w: W,
    },
  ],
  edges: [
    { from: "question", to: "router", packet: true },
    { from: "router", to: "vector", packet: true, delay: 0.6 },
    { from: "vector", to: "llm", packet: true, delay: 1.2 },
    { from: "router", to: "keyword", packet: true, delay: 0.6 },
    { from: "keyword", to: "llm", packet: true, delay: 1.2 },
    { from: "router", to: "sql", packet: true, delay: 0.6 },
    { from: "sql", to: "llm", packet: true, delay: 1.2 },
    { from: "router", to: "none", dashed: true },
    { from: "none", to: "llm", dashed: true },
  ],
};

export default spec;
