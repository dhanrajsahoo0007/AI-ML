import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Text-to-SQL for Brightpost's operations team: "How many orders were refunded last week?" The question does not go to
// the help-centre index; it goes to the orders database through a guarded path.
//   1 Schema lookup: the question is matched against a schema catalog (table and column descriptions) and only the
//     tables it needs, refunds and orders, are put in the prompt, not all 40.
//   2 An LLM writes one SELECT from the question and that schema.
//   3 A validator parses the SQL and checks it before anything runs: read-only, allowed tables only, a LIMIT, and a
//     filter to the rows this user may see.
//   4 The failure step: SQL that is unsafe (a DELETE, a table outside the allow-list) or wrong (a column that does not
//     exist, caught by a dry run) is rejected, and the error goes back to the LLM for one retry.
//   5 Approved SQL runs on a read replica, as a read-only role, with a statement timeout.
//   6 The answer quotes the number and shows the SQL it ran, so the user can check it.
// Numbers are illustrative and this figure's own (not in presets/rag.ts): 40 tables in the database, 2 picked;
// 312 refunded orders last week; a 5-second timeout.
//
// Nodes never move. Layout: top row (y 90) question 100 · schema lookup 330 · LLM 560 · validator 780; middle row
// (y 195) the rejected card under the LLM; bottom row (y 300) schema catalog 330 · answer 560 · read replica 780. The
// validator and the replica sit in one zone, guarded execution. Path: across the top, down the right, back along the
// bottom, so no edge crosses another.
// Colour (four tones plus neutral): the question orange, catalog, lookup and replica violet (stores), the LLM and
// the answer green, the rejection red; the validator is the neutral accent.

/** Illustrative: tables in Brightpost's orders database, and how many the question needs. */
const TABLES = { total: 40, picked: 2 } as const;
/** Illustrative answer to the question. */
const REFUNDED_LAST_WEEK = 312;
/** Illustrative statement timeout on the replica, in seconds. */
const TIMEOUT_S = 5;

const X = { question: 100, schema: 330, llm: 560, guard: 780 } as const;
const Y = { top: 90, mid: 195, bottom: 300 } as const;
const W = 150;
/** Wider cards for "Schema lookup" and "Schema catalog" beside their icons. */
const WIDE = 166;

const spec: DiagramSpec = {
  title: "Text-to-SQL: schema lookup, generation, validation and safe execution",
  width: 880,
  height: 370,
  steps: [
    { title: "Find the tables the question needs" },
    { title: "The LLM writes one SELECT" },
    { title: "A validator checks the SQL before it runs" },
    { title: "Wrong or unsafe SQL is rejected" },
    { title: "Approved SQL runs on a read replica" },
    { title: "The answer shows the SQL it ran" },
  ],
  zones: [{ id: "db", title: "Guarded execution", tone: RAG_TONE.infra, x: 695, y: 34, w: 172, h: 322 }],
  nodes: [
    {
      id: "question",
      label: "Question",
      sub: "refunds, week",
      icon: "chat",
      tone: RAG_TONE.query,
      fill: "pastel",
      x: X.question,
      y: Y.top,
      w: W,
    },
    {
      id: "schema",
      label: "Schema lookup",
      sub: `${TABLES.picked} of ${TABLES.total} tables`,
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: X.schema,
      y: Y.top,
      w: WIDE,
    },
    {
      id: "catalog",
      label: "Schema catalog",
      sub: "column notes",
      icon: "registry",
      tone: RAG_TONE.store,
      fill: "soft",
      x: X.schema,
      y: Y.bottom,
      w: WIDE,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "writes SELECT",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 2,
      x: X.llm,
      y: Y.top,
      w: W,
    },
    {
      id: "guard",
      label: "Validator",
      sub: "4 checks",
      icon: "shield",
      tone: RAG_TONE.infra,
      accent: true,
      step: 3,
      x: X.guard,
      y: Y.top,
      w: W,
    },
    {
      id: "rejected",
      label: "Rejected",
      sub: "error to LLM",
      icon: "alert-triangle",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 4,
      x: X.llm,
      y: Y.mid,
      w: W,
    },
    {
      id: "replica",
      label: "Read replica",
      sub: `${TIMEOUT_S} s timeout`,
      icon: "database",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 5,
      x: X.guard,
      y: Y.bottom,
      w: W,
    },
    {
      id: "answer",
      label: "Answer + SQL",
      sub: `${REFUNDED_LAST_WEEK} refunds`,
      icon: "message-circle",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 6,
      x: X.llm,
      y: Y.bottom,
      w: W,
    },
  ],
  edges: [
    { from: "question", to: "schema", label: "question", packet: true },
    { from: "catalog", to: "schema", label: "tables, columns", packet: true, delay: 0.6 },
    { from: "schema", to: "llm", label: "+ schema", packet: true, step: 2 },
    { from: "llm", to: "guard", label: "SQL", packet: true, step: 3 },
    {
      from: "guard",
      to: "rejected",
      label: "unsafe",
      tone: RAG_TONE.failure,
      packet: true,
      via: [[735, Y.mid]],
      labelAt: 0.8,
      step: 4,
    },
    { from: "rejected", to: "llm", label: "retry once", dashed: true, step: 4 },
    { from: "guard", to: "replica", label: "approved", packet: true, step: 5 },
    { from: "replica", to: "answer", label: "rows", packet: true, step: 6 },
  ],
};

export default spec;
