import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "Building the graph: entities, relations and communities": the GraphRAG indexing pipeline (Edge et al. 2024,
// arXiv 2404.16130) on one quarter of Brightpost's support tickets, in four steps, left to right.
// Step 1: tickets become chunks (each ticket fits one chunk).
// Step 2: an LLM reads every chunk and extracts entities and the relations between them; the same entity from many
//   tickets becomes one node, and repeated relations become heavier edges.
// Step 3: community detection (Leiden in the paper) groups densely linked entities into communities.
// Step 4: an LLM writes one summary per community; these summaries are what global search reads later.
//
// TICKETS is local to this figure and illustrative (not from a source); the lead may move it into presets/rag.ts.
// Tones (three plus neutral): chunks blue (text), entities violet (the graph is a store), summaries green (written by
// the LLM); relation lines and community outlines neutral.
//
// Layout: three columns. Chunks x 20..220; the graph x 258..600 (entity boxes 116 × 30 in three bands, one per
// community: y 64..148, 196..280, 328..412); summaries x 640..840, each aligned with its community's band. Column
// headers on y 14, column footers on y 436 and 460.

/**
 * Illustrative: one quarter of support tickets. Working: 6,000 tickets averaging 500 tokens = 3,000,000 tokens. Each
 * ticket fits in one 600-token chunk (the chunk size Edge et al. used), so 6,000 chunks and 6,000 extraction calls,
 * plus one gleaning pass ("did you miss any entities?") each = 12,000 LLM calls that read about 6,000,000 tokens.
 */
const TICKETS = { count: 6_000, tokens: 500 } as const;

const CHUNKS = [
  { id: "t1", label: "Ticket 4812", sub: "new phone, codes fail" },
  { id: "t2", label: "Ticket 5120", sub: "backup code rejected" },
  { id: "t3", label: "Ticket 6007", sub: "locked after many tries" },
  { id: "t4", label: "Ticket 6388", sub: "security hold on sign-in" },
  { id: "t5", label: "Ticket 7015", sub: "reset email never came" },
] as const;

const EW = 116;
const EH = 30;
const LEFT = 276;
const RIGHT = 452;
const MID = 364;

/** Three communities, one band each: two entities on top, one below in the middle. */
const COMMUNITIES = [
  { n: 1, top: 64, names: ["New phone", "Two-factor", "Backup code"] },
  { n: 2, top: 196, names: ["Failed sign-ins", "Account lock", "Password reset"] },
  { n: 3, top: 328, names: ["Suspicious login", "Security hold", "ID check"] },
] as const;

const SUMMARIES = [
  "Community 1: phone, 2FA\nA new phone breaks codes;\nbackup codes fix most",
  "Community 2: sign-ins\nRepeated failed tries\nlock the account",
  "Community 3: security\nOdd sign-ins cause a hold;\nan ID check lifts it",
] as const;

const entityId = (c: number, i: number) => `e${c}-${i}`;

const entities: LayoutShape[] = COMMUNITIES.flatMap((c) =>
  c.names.map((name, i): LayoutShape => ({
    id: entityId(c.n, i),
    type: "box",
    x: i === 0 ? LEFT : i === 1 ? RIGHT : MID,
    y: i === 2 ? c.top + 54 : c.top,
    w: EW,
    h: EH,
    label: name,
    tone: RAG_TONE.store,
    fill: "pastel",
    step: 2,
  }))
);

/** An undirected relation line between two entities. */
const link = (a: string, b: string): LayoutShape => ({
  id: `l-${a}-${b}`,
  type: "arrow",
  x: 0,
  y: 0,
  from: a,
  to: b,
  head: false,
  step: 2,
});

const relations: LayoutShape[] = [
  ...COMMUNITIES.flatMap((c) => [
    link(entityId(c.n, 0), entityId(c.n, 1)),
    link(entityId(c.n, 0), entityId(c.n, 2)),
    link(entityId(c.n, 1), entityId(c.n, 2)),
  ]),
  // The few links between communities: two-factor problems and security holds both end in a locked account.
  link(entityId(1, 1), entityId(2, 1)),
  link(entityId(3, 1), entityId(2, 1)),
];

/** A dashed rounded rectangle as a path (corner radius r). */
function roundRect(x: number, y: number, w: number, h: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  const corner = (cx: number, cy: number, from: number) => {
    for (let k = 0; k <= 4; k++) {
      const a = ((from + k * 22.5) * Math.PI) / 180;
      pts.push([Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10]);
    }
  };
  corner(x + w - r, y + r, 270);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, 90);
  corner(x + r, y + r, 180);
  pts.push(pts[0]);
  return pts;
}

const communities: LayoutShape[] = COMMUNITIES.flatMap((c): LayoutShape[] => [
  {
    id: `c${c.n}`,
    type: "path",
    x: 0,
    y: 0,
    points: roundRect(262, c.top - 10, 334, 104, 14),
    dashed: true,
    tone: RAG_TONE.store,
    step: 3,
  },
  {
    id: `c${c.n}-tag`,
    type: "text",
    x: 266,
    y: c.top + 62,
    w: 84,
    h: 18,
    label: `Community ${c.n}`,
    tone: RAG_TONE.store,
    step: 3,
  },
]);

const summaries: LayoutShape[] = SUMMARIES.flatMap((label, i): LayoutShape[] => {
  const top = COMMUNITIES[i].top;
  return [
    {
      id: `s${i + 1}`,
      type: "box",
      x: 640,
      y: top,
      w: 200,
      h: 84,
      label,
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 4,
    },
    { id: `s${i + 1}-a`, type: "arrow", x: 600, y: top + 42, w: 36, h: 0, step: 4 },
  ];
});

const header = (id: string, x: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 14,
  w,
  h: 20,
  label,
  step,
});

const footer = (id: string, x: number, w: number, label: string, step: number, y = 436): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: RAG_TONE.infra,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "GraphRAG indexing: chunks, extracted graph, communities, community summaries",
  width: 860,
  height: 490,
  steps: [
    { title: "Tickets become chunks" },
    { title: "An LLM extracts entities and relations" },
    { title: "Community detection groups the graph" },
    { title: "An LLM writes one summary per community" },
  ],
  shapes: [
    header("h-chunks", 20, 200, "Ticket chunks", 1),
    header("h-graph", 262, 334, "Entities and relations", 2),
    header("h-sum", 640, 200, "Community summaries", 4),
    ...CHUNKS.map((c, i): LayoutShape => ({
      id: c.id,
      type: "box",
      x: 20,
      y: 64 + i * 70,
      w: 200,
      h: 48,
      label: c.label,
      sub: c.sub,
      tone: RAG_TONE.text,
      fill: "pastel",
    })),
    footer("f-chunks", 20, 200, `${fmt(TICKETS.count)} tickets, 1 chunk each`, 1),
    { id: "a-extract", type: "arrow", x: 222, y: 236, w: 36, h: 0, step: 2 },
    ...relations,
    ...entities,
    footer("f-graph", 262, 334, "One LLM call per chunk", 2),
    ...communities,
    footer("f-comm", 262, 334, "Leiden finds densely linked groups", 3, 460),
    ...summaries,
    footer("f-sum", 640, 200, "One LLM call per community", 4),
  ],
};

export default spec;
