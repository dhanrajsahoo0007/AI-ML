import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Local search versus global search": the two GraphRAG query modes on the support-ticket graph from graphrag-index.
// Step 1, local search (a question that names an entity): match "Backup code" to its node, walk out one hop and
//   gather the neighbouring entities, a ticket that mentions it and its community's summary, then rank and fit them
//   into one context window (Microsoft's GraphRAG docs, "Local Search").
// Step 2, global search (a question about the whole corpus): every community summary at the chosen level is mapped
//   to a partial answer with a helpfulness score from 0 to 100; answers scored 0 are dropped, the rest are sorted by
//   score and packed into one context for the final answer (Edge et al. 2024, global answer by map-reduce).
//
// The scores are illustrative. Tones (four plus neutral): questions orange, graph entities violet, the ticket blue,
// summaries and answers green; scores and the context box neutral.
//
// Layout: two groups of 400 at x 20 and 440 (y 30..410). In each: the question at y 56, a hub or a row of summaries,
// a row of four 84-wide boxes at y 212, a merge box at y 276 and the answer at y 344.

const ROW_Y = 212;
const ROW_W = 84;
const rowX = (left: number, i: number) => left + 16 + i * (ROW_W + 8);

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

// ── Local search ──────────────────────────────────────────────────────────────────────────────────────────────────

const GATHERED = [
  { id: "l-n1", label: "Two-factor", sub: "related entity", tone: RAG_TONE.store, fill: "soft" as const },
  { id: "l-n2", label: "New phone", sub: "related entity", tone: RAG_TONE.store, fill: "soft" as const },
  { id: "l-t", label: "Ticket", sub: "no. 5120", tone: RAG_TONE.text, fill: "pastel" as const },
  { id: "l-c", label: "Summary", sub: "community 1", tone: RAG_TONE.answer, fill: "soft" as const },
];

const local: LayoutShape[] = [
  {
    id: "l-q",
    type: "box",
    x: 50,
    y: 56,
    w: 340,
    h: 50,
    label: "Why are backup codes rejected\nafter a phone change?",
    tone: RAG_TONE.query,
    fill: "pastel",
  },
  {
    id: "l-hub",
    type: "box",
    x: 160,
    y: 134,
    w: 120,
    h: 40,
    label: "Backup code",
    sub: "named entity",
    tone: RAG_TONE.store,
    fill: "pastel",
  },
  arrow("l-a0", "l-q", "l-hub", 1),
  ...GATHERED.map((g, i): LayoutShape => ({
    id: g.id,
    type: "box",
    x: rowX(20, i),
    y: ROW_Y,
    w: ROW_W,
    h: 40,
    label: g.label,
    sub: g.sub,
    tone: g.tone,
    fill: g.fill,
  })),
  ...GATHERED.map((g, i) => arrow(`l-a${i + 1}`, "l-hub", g.id, 1)),
  {
    id: "l-ctx",
    type: "box",
    x: 50,
    y: 276,
    w: 340,
    h: 40,
    label: "Rank and fit into one context window",
    tone: RAG_TONE.infra,
    fill: "soft",
  },
  ...GATHERED.map((g, i) => arrow(`l-b${i + 1}`, g.id, "l-ctx", 1)),
  {
    id: "l-ans",
    type: "box",
    x: 50,
    y: 344,
    w: 340,
    h: 50,
    label: "Codes fail after a phone change;\nanswer cites ticket 5120",
    tone: RAG_TONE.answer,
    fill: "pastel",
  },
  arrow("l-a9", "l-ctx", "l-ans", 1),
];

// ── Global search ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Illustrative helpfulness scores (0 to 100) for each community's partial answer. */
const MAPPED = [
  { c: "C1", topic: "phone, 2FA", score: 85 },
  { c: "C2", topic: "sign-ins", score: 90 },
  { c: "C3", topic: "security", score: 60 },
  { c: "C4", topic: "billing", score: 0 },
] as const;

const global: LayoutShape[] = [
  {
    id: "g-q",
    type: "box",
    x: 470,
    y: 56,
    w: 340,
    h: 50,
    label: "What are the most common reasons\ncustomers get locked out?",
    tone: RAG_TONE.query,
    fill: "pastel",
    step: 2,
  },
  ...MAPPED.flatMap((m, i): LayoutShape[] => [
    {
      id: `g-s${i + 1}`,
      type: "box",
      x: rowX(440, i),
      y: 134,
      w: ROW_W,
      h: 40,
      label: m.c,
      sub: m.topic,
      tone: RAG_TONE.answer,
      fill: "soft",
      step: 2,
    },
    arrow(`g-a${i + 1}`, "g-q", `g-s${i + 1}`, 2),
    {
      id: `g-p${i + 1}`,
      type: "cell",
      x: rowX(440, i),
      y: ROW_Y,
      w: ROW_W,
      h: 40,
      label: m.score ? `score ${m.score}` : "0: dropped",
      tone: RAG_TONE.infra,
      step: 2,
    },
    arrow(`g-m${i + 1}`, `g-s${i + 1}`, `g-p${i + 1}`, 2),
  ]),
  {
    id: "g-red",
    type: "box",
    x: 470,
    y: 276,
    w: 340,
    h: 40,
    label: "Sort by score, fill one context",
    tone: RAG_TONE.infra,
    fill: "soft",
    step: 2,
  },
  ...MAPPED.filter((m) => m.score > 0).map((_, i) => arrow(`g-r${i + 1}`, `g-p${i + 1}`, "g-red", 2)),
  {
    id: "g-ans",
    type: "box",
    x: 470,
    y: 344,
    w: 340,
    h: 50,
    label: "Failed sign-ins, phone changes\nand security holds, in that order",
    tone: RAG_TONE.answer,
    fill: "pastel",
    highlight: true,
    step: 2,
  },
  arrow("g-a9", "g-red", "g-ans", 2),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "GraphRAG local search and global search",
  width: 860,
  height: 424,
  steps: [
    { title: "Local search walks out from the entity in the question" },
    { title: "Global search maps every community summary, then reduces" },
  ],
  groups: [
    { id: "local", title: "Local: start at named entities", tone: RAG_TONE.infra, x: 20, y: 30, w: 400, h: 380 },
    { id: "global", title: "Global: map-reduce over summaries", tone: RAG_TONE.infra, x: 440, y: 30, w: 400, h: 380 },
  ],
  shapes: [...local, ...global],
};

export default spec;
