import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "Isolating context with sub-agents" (context-engineering). A Brightpost customer disputes charges across several
// orders; answering needs their order history, the refund policy and their past tickets.
// Step 1: one agent reads all three sources into its own window: 3 × 20,000 = 60,000 tokens, almost twice the
//   32,000-token budget of ctx-budget, so it does not fit (red).
// Step 2: a lead agent hands each source to a sub-agent with its own window. Each sub-agent reads about 20,000 tokens
//   and returns a summary of about 1,500 tokens (Anthropic's context-engineering post, 2025, reports condensed
//   summaries of "often 1,000-2,000 tokens"). The lead's window holds 3 × 1,500 = 4,500 tokens of findings.
//
// Local constants (illustrative): EXPLORE = 20,000 tokens read per source, SUMMARY = 1,500 tokens returned.
// Layout: customer 75 (130 wide) | lead 280 | sub-agents 540 (rows 90 / 215 / 340) | sources 790 (same rows). Step-1 edges run
// from the lead straight to the sources (the sub-agents are not drawn yet) and are replaced in step 2 (`until: 1`).
// Tones (three plus neutral): agents green (the lead is the accent), sources violet, the overflow red.

const EXPLORE = 20_000;
const SUMMARY = 1_500;
const ROWS = [90, 215, 340] as const;
const W = 150;

const SUBS = [
  { id: "orders", agent: "Orders agent", source: "Orders DB", sub: "every order", icon: "database" },
  {
    id: "policy",
    agent: "Policy agent",
    source: "Help centre",
    sub: `${fmt(CORPUS.chunks)} chunks`,
    icon: "vector-index",
  },
  { id: "tickets", agent: "Tickets agent", source: "Past tickets", sub: "this customer", icon: "ticket" },
] as const;

const spec: DiagramSpec = {
  title: "Sub-agents read in their own windows and return short summaries to a lead agent",
  width: 880,
  height: 420,
  steps: [
    { title: `One agent reads everything: ${fmt(SUBS.length * EXPLORE)} tokens` },
    { title: `Sub-agents return ${fmt(SUMMARY)}-token summaries` },
  ],
  zones: [{ id: "subs", title: "Own windows", tone: RAG_TONE.answer, x: 450, y: 30, w: 180, h: 370 }],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: "a dispute",
      icon: "users",
      tone: RAG_TONE.infra,
      x: 75,
      y: ROWS[1],
      w: 130,
    },
    {
      id: "lead",
      label: "Lead agent",
      sub: "32,000 budget",
      icon: "model",
      tone: RAG_TONE.answer,
      accent: true,
      x: 280,
      y: ROWS[1],
      w: W,
    },
    ...SUBS.flatMap((s, i) => [
      {
        id: s.id,
        label: s.agent,
        sub: "own window",
        icon: "model",
        tone: RAG_TONE.answer,
        fill: "pastel" as const,
        step: 2,
        x: 540,
        y: ROWS[i],
        w: W,
      },
      {
        id: `${s.id}-src`,
        label: s.source,
        sub: s.sub,
        icon: s.icon,
        tone: RAG_TONE.store,
        x: 790,
        y: ROWS[i],
        w: W,
      },
    ]),
  ],
  edges: [
    { from: "customer", to: "lead", packet: true },
    // Step 1: the lead reads every source itself; the middle edge carries the total.
    ...SUBS.map((s, i) => ({
      from: "lead",
      to: `${s.id}-src`,
      label: i === 1 ? `${fmt(SUBS.length * EXPLORE)} into one window` : undefined,
      tone: RAG_TONE.failure,
      dashed: true,
      until: 1,
    })),
    // Step 2: a task out and a summary back; each sub-agent reads its source in its own window.
    ...SUBS.flatMap((s) => [
      {
        from: "lead",
        to: s.id,
        label: `${fmt(SUMMARY)} back`,
        bidirectional: true,
        packet: true,
        step: 2,
      },
      { from: s.id, to: `${s.id}-src`, label: `reads ${EXPLORE / 1000} k`, packet: true, delay: 0.6, step: 2 },
    ]),
  ],
};

export default spec;
