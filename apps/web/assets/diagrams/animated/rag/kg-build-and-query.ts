import type { DiagramSpec } from "@/components/diagrams/types";
import { MULTI_HOP, RAG_TONE } from "@/components/diagrams/presets/rag";

// Knowledge-graph system, build and query, for the multi-hop question "Which team owns the service that failed in
// last week's incident?" (QUESTIONS.multiHop). Top lane, built offline: Brightpost's engineering documents (incident
// notes, the service catalogue) → an LLM extracts entities and relations → duplicates are merged → facts are checked
// against the ontology → the graph store (accent). Bottom lanes, per question: the question → entity linking finds
// INC-311 → the graph walk follows AFFECTED and OWNED_BY → the path and its source chunks become the context → the
// LLM → the answer, Payments team (MULTI_HOP).
//
// Eight steps: 1 documents are collected · 2 an LLM extracts entities and relations · 3 duplicates merge into one
// node per entity · 4 facts are checked against the ontology and stored · 5 entities in the question are linked to
// nodes · 6 the walk follows edges from the incident · 7 the path and its chunks become the context · 8 the model
// answers and cites the path. Nodes never move between steps.
//
// Layout (the same grid as rag/pipeline): five columns at x 90 | 265 | 440 | 615 | 790, cards 150 wide; rows 95
// (build) | 290 (query) | 410 (the answer). The graph-to-walk edge runs in the corridor at y 192 between the zones.
//
// Colour (RAG legend, four tones plus neutral): documents blue, the LLM (extraction and answering) green, the graph
// store and the walk violet, the question and entity linking orange; merge, validate and context building neutral.

const X = [90, 265, 440, 615, 790] as const;
const ROW = { build: 95, query: 290, answer: 410 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: "Knowledge graph: build the graph offline, walk it per question",
  width: 880,
  height: 470,
  steps: [
    { title: "Documents are collected" },
    { title: "An LLM extracts entities and relations" },
    { title: "Duplicates merge into one node per entity" },
    { title: "Facts are checked against the ontology and stored" },
    { title: "Entities in the question are linked to nodes" },
    { title: "The walk follows edges from the incident" },
    { title: "The path and its chunks become the context" },
    { title: "The model answers and cites the path" },
  ],
  zones: [
    { id: "build", title: "Offline: build the graph", tone: RAG_TONE.infra, x: 10, y: 40, w: 860, h: 115 },
    { id: "query", title: "Per question: walk the graph", tone: RAG_TONE.infra, x: 10, y: 232, w: 860, h: 225 },
  ],
  nodes: [
    // Build lane
    {
      id: "docs",
      label: "Documents",
      sub: "incident notes",
      icon: "file",
      tone: RAG_TONE.text,
      x: X[0],
      y: ROW.build,
      w: W,
    },
    {
      id: "extract",
      label: "Extract",
      sub: "LLM + ontology",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.build,
      w: W,
    },
    {
      id: "resolve",
      label: "Resolve",
      sub: "merge dupes",
      icon: "git-merge",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 3,
      x: X[2],
      y: ROW.build,
      w: W,
    },
    {
      id: "validate",
      label: "Validate",
      sub: "ontology rules",
      icon: "policy",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 4,
      x: X[3],
      y: ROW.build,
      w: W,
    },
    {
      id: "graph",
      label: "Graph store",
      sub: "nodes + edges",
      icon: "graph",
      tone: RAG_TONE.store,
      accent: true,
      step: 4,
      x: X[4],
      y: ROW.build,
      w: W,
    },

    // Query lane
    {
      id: "question",
      label: "Question",
      sub: "who owns it?",
      icon: "users",
      tone: RAG_TONE.query,
      step: 5,
      x: X[0],
      y: ROW.query,
      w: W,
    },
    {
      id: "link",
      label: "Link entities",
      sub: `finds ${MULTI_HOP.incident}`,
      icon: "search",
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 5,
      x: X[1],
      y: ROW.query,
      w: W,
    },
    {
      id: "walk",
      label: "Graph walk",
      sub: "2 edges",
      icon: "graph",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 6,
      x: X[2],
      y: ROW.query,
      w: W,
    },
    {
      id: "context",
      label: "Build context",
      sub: "path + chunks",
      icon: "prompt",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 7,
      x: X[3],
      y: ROW.query,
      w: W,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "cites the path",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 8,
      x: X[4],
      y: ROW.query,
      w: W,
    },
    {
      id: "answer",
      label: "Answer",
      sub: MULTI_HOP.team,
      icon: "link",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 8,
      x: X[4],
      y: ROW.answer,
      w: W,
    },
  ],
  edges: [
    // Build: one packet runs the lane, stage by stage.
    { from: "docs", to: "extract", packet: true },
    { from: "extract", to: "resolve", packet: true, delay: 0.6 },
    { from: "resolve", to: "validate", packet: true, delay: 1.2 },
    { from: "validate", to: "graph", packet: true, delay: 1.8 },

    // Query: link the named incident, walk from it, gather the path and its sources, answer.
    { from: "question", to: "link", packet: true },
    { from: "link", to: "walk", packet: true, delay: 0.6 },
    {
      from: "graph",
      to: "walk",
      label: "edges from the incident",
      packet: true,
      delay: 1.2,
      step: 6,
      via: [
        [X[4], 192],
        [X[2], 192],
      ],
    },
    { from: "walk", to: "context", packet: true, delay: 1.8 },
    { from: "context", to: "llm", packet: true, delay: 2.4 },
    { from: "llm", to: "answer", packet: true, delay: 3 },
    {
      from: "answer",
      to: "question",
      label: "shown with the path",
      dashed: true,
      labelAt: 0.45,
      via: [[X[0], ROW.answer]],
    },
  ],
};

export default spec;
