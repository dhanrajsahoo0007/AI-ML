import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { MULTI_HOP, QUESTIONS, RAG_TONE } from "@/components/diagrams/presets/rag";

// "When to use a graph": the multi-hop question (QUESTIONS.multiHop) answered two ways. Left, vector search returns
// the three chunks most similar to the question; each mentions the incident or the service, but none says who owns
// checkout-api, and nothing connects them, so the model has to guess. Right, the graph walk starts at the incident
// named in the question (INC-311), follows AFFECTED to checkout-api and OWNED_BY to the Payments team (MULTI_HOP):
// three nodes, two edges, and the last node is the answer.
//
// VECTOR_HITS is local to this figure: chunk titles and cosine scores are illustrative (no source), and the page says
// so. Tones (four): the question orange, chunks blue, graph nodes violet, the vector side's gap red.
//
// Layout: the question across the top; two groups of 400 at x 20 and 440. Left, three chunk boxes 360 wide at
// y 130 | 200 | 270. Right, three node boxes 220 wide at x 530, y 130 | 210 | 290 (36 between them for the pill).
// The question's two arrows drop straight down at x 370 and 715, clear of the group title tabs.

/** Illustrative: the three nearest chunks for the multi-hop question, with made-up cosine similarities. */
const VECTOR_HITS = [
  { title: `${MULTI_HOP.incident} postmortem`, sub: `${MULTI_HOP.service} timed out · 0.81` },
  { title: `${MULTI_HOP.service} runbook`, sub: "how to restart it · 0.78" },
  { title: "Incident review process", sub: "who writes the postmortem · 0.74" },
] as const;

const GRAPH_PATH = [
  { id: "g1", type: "Incident", name: MULTI_HOP.incident },
  { id: "g2", type: "Service", name: MULTI_HOP.service },
  { id: "g3", type: "Team", name: MULTI_HOP.team },
] as const;

/** A relation name as drawn on its arrow (the engine sizes pills for capitals). */
const rel = (name: string) => name;

const vectorSide: LayoutShape[] = [
  ...VECTOR_HITS.map((h, i): LayoutShape => ({
    id: `v${i + 1}`,
    type: "box",
    x: 40,
    y: 130 + i * 70,
    w: 360,
    h: 50,
    label: h.title,
    sub: h.sub,
    tone: RAG_TONE.text,
    fill: "pastel",
    step: 2,
  })),
  {
    id: "v-gap",
    type: "text",
    x: 40,
    y: 340,
    w: 360,
    h: 20,
    label: `No chunk says who owns ${MULTI_HOP.service}`,
    tone: RAG_TONE.failure,
    step: 2,
  },
  {
    id: "v-gap2",
    type: "text",
    x: 40,
    y: 362,
    w: 360,
    h: 20,
    label: "so the model guesses the team",
    tone: RAG_TONE.failure,
    step: 2,
  },
];

const graphSide: LayoutShape[] = [
  ...GRAPH_PATH.map((n, i): LayoutShape => ({
    id: n.id,
    type: "box",
    x: 530,
    y: 130 + i * 80,
    w: 220,
    h: 44,
    label: n.name,
    sub: n.type,
    tone: RAG_TONE.store,
    fill: "pastel",
    highlight: i === GRAPH_PATH.length - 1 ? true : undefined,
    step: 3,
  })),
  { id: "g-a1", type: "arrow", x: 0, y: 0, from: "g1", to: "g2", label: rel("AFFECTED"), step: 3 },
  { id: "g-a2", type: "arrow", x: 0, y: 0, from: "g2", to: "g3", label: rel("OWNED_BY"), step: 3 },
  {
    id: "g-ans",
    type: "text",
    x: 460,
    y: 350,
    w: 360,
    h: 20,
    label: `The last node is the answer: ${MULTI_HOP.team}`,
    tone: RAG_TONE.store,
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Vector search against a graph walk on the multi-hop question",
  width: 860,
  height: 400,
  steps: [
    { title: "The question needs two facts joined" },
    { title: "Vector search returns similar chunks that do not connect" },
    { title: "The graph walk follows two edges to the team" },
  ],
  groups: [
    { id: "vec", title: "Vector search: 3 nearest chunks", tone: RAG_TONE.infra, x: 20, y: 96, w: 400, h: 294 },
    { id: "kg", title: "Graph: follow edges", tone: RAG_TONE.infra, x: 440, y: 96, w: 400, h: 294 },
  ],
  shapes: [
    {
      id: "q",
      type: "box",
      x: 140,
      y: 20,
      w: 580,
      h: 40,
      label: QUESTIONS.multiHop,
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    ...vectorSide,
    ...graphSide,
    // Free arrows (start + vector) so they drop straight down beside the group title tabs.
    { id: "q-v", type: "arrow", x: 370, y: 60, w: 0, h: 70, label: "top 3", step: 2 },
    { id: "q-g", type: "arrow", x: 715, y: 60, w: 0, h: 70, label: `link ${MULTI_HOP.incident}`, step: 3 },
  ],
};

export default spec;
