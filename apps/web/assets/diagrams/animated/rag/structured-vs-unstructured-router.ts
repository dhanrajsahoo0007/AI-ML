import type { DiagramSpec } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE } from "@/components/diagrams/presets/rag";

// Structured or unstructured: a router reads each question and sends it to the source that holds the answer.
//   "What does error E1234 mean?" (QUESTIONS.keyword)   → help-centre search (documents)
//   "How many orders were refunded last week?"           → text-to-SQL over the orders database (records)
//   "How many customers hit error E1234 last week, and how do they fix it?" → both: SQL counts the errors, the help
//     centre explains the fix, and one LLM call writes one answer from the rows and the passages.
// The refunds and mixed questions are this figure's own (not in presets/rag.ts); the refunds question is the one on
// text-to-sql-flow.
//
// Steps: 1 documents · 2 records · 3 both. Nodes never move; each step adds its question card.
// Layout: questions x 100 (rows 80 | 200 | 320) · router x 320 · help centre x 560 (y 110) · text-to-SQL x 560 (y 290)
// · LLM x 790, router and LLM on the middle row y 200.
// Colour (four tones plus neutral): questions orange, help-centre search teal (keyword and hybrid search, as for E1234
// on the other RAG pages), the database violet (store), the LLM green; the router is the neutral accent.

/** This figure's own questions. */
const DATA_QUESTION = "How many orders were refunded last week?";
const MIXED_QUESTION = "How many customers hit error E1234 last week, and how do they fix it?";

const X = { question: 100, router: 320, route: 560, llm: 790 } as const;
const MID = 200;
const ROWS = [80, 200, 320] as const;
const W = 150;
/** Question cards are wider: "Mixed question" needs about 100 px beside its icon. */
const QW = 166;

const spec: DiagramSpec = {
  title: "Routing between documents and data",
  width: 880,
  height: 390,
  steps: [
    { title: `"${QUESTIONS.keyword}": documents` },
    { title: `"${DATA_QUESTION}": data` },
    { title: `"${MIXED_QUESTION}": both` },
  ],
  zones: [],
  nodes: [
    {
      id: "q-docs",
      label: "Docs question",
      sub: "error E1234",
      icon: "chat",
      tone: RAG_TONE.query,
      fill: "pastel",
      x: X.question,
      y: ROWS[0],
      w: QW,
    },
    {
      id: "q-data",
      label: "Data question",
      sub: "refunds, week",
      icon: "chat",
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 2,
      x: X.question,
      y: ROWS[1],
      w: QW,
    },
    {
      id: "q-mixed",
      label: "Mixed question",
      sub: "count + fix",
      icon: "chat",
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 3,
      x: X.question,
      y: ROWS[2],
      w: QW,
    },
    {
      id: "router",
      label: "Router",
      sub: "docs, data, both",
      icon: "split",
      tone: RAG_TONE.infra,
      accent: true,
      x: X.router,
      y: MID,
      w: W,
    },
    {
      id: "help",
      label: "Help centre",
      sub: "hybrid search",
      icon: "search",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      x: X.route,
      y: 110,
      w: W,
    },
    {
      id: "sql",
      label: "Text-to-SQL",
      sub: "read-only",
      icon: "database",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
      x: X.route,
      y: 290,
      w: W,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "one answer",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      x: X.llm,
      y: MID,
      w: W,
    },
  ],
  edges: [
    { from: "q-docs", to: "router", packet: true },
    { from: "router", to: "help", label: "docs", packet: true, delay: 0.6 },
    { from: "help", to: "llm", label: "passages", packet: true, delay: 1.2 },
    { from: "q-data", to: "router", packet: true, step: 2 },
    { from: "router", to: "sql", label: "data", packet: true, delay: 0.6, step: 2 },
    { from: "sql", to: "llm", label: "rows + SQL", packet: true, delay: 1.2, step: 2 },
    { from: "q-mixed", to: "router", packet: true, step: 3 },
  ],
};

export default spec;
