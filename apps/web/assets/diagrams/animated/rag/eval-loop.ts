import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// The offline evaluation loop that guards every change to Brightpost's RAG pipeline (new chunking, embedding model,
// reranker or prompt). A golden set of labelled questions → run the candidate pipeline on every question → score
// retrieval against the labelled chunks (no LLM needed) and score the answers with an LLM judge that is checked
// against human labels → a dashboard compares the candidate with the current baseline → a release gate ships the
// change or blocks it.
//
// Steps (seven): 1 golden set · 2 run the pipeline · 3 score retrieval · 4 LLM judge calibrated on human labels ·
// 5 dashboard against the baseline · 6 the gate ships a change that drops nothing · 7 a change that drops recall@5
// or faithfulness is blocked (the failure step).
//
// Constants that are not in presets/rag.ts (illustrative, not from a source; the page says so):
// - EVAL.goldenQuestions = 200 questions, each with its relevant chunk ids and a reference answer.
// - EVAL.humanLabels = 50 answers graded by people, used to check the judge's agreement before trusting it.
// - EVAL.maxRecallDrop = 0.02 and EVAL.minFaithfulness = 0.9: the gate blocks a change when mean recall@5 falls by
//   more than 0.02 against the baseline or mean faithfulness falls below 0.9.
//
// Grid: columns x 90 | 265 | 440 | 615 | 790 (cards 150 wide; the two scorers 170, their rows are free beside them), rows y 80 | 190 | 300 | 380. Retrieval and judge sit
// above and below the main row so their two inputs and outputs run in clear corridors.
// Colour (four tones plus neutral): the golden questions orange, retrieval scores lime, the LLM judge green, the
// blocked change red; the pipeline run, the human labels, the dashboard and the gate neutral (the gate is the accent).

const EVAL = {
  goldenQuestions: 200,
  humanLabels: 50,
  maxRecallDrop: 0.02,
  minFaithfulness: 0.9,
} as const;

const X = [90, 265, 440, 615, 790] as const;
const ROW = { top: 80, mid: 190, low: 300, base: 385 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: "The RAG evaluation loop: golden set, run, score, judge, dashboard, release gate",
  width: 880,
  height: 430,
  steps: [
    { title: "A golden set of labelled questions" },
    { title: "Every change runs the full pipeline on the set" },
    { title: "Retrieval is scored against the labelled chunks" },
    { title: "An LLM judge, checked against human labels, scores the answers" },
    { title: "The dashboard compares the change with the baseline" },
    { title: "The gate ships a change that drops nothing" },
    { title: "A change that drops recall@5 or faithfulness is blocked" },
  ],
  zones: [],
  nodes: [
    {
      id: "golden",
      label: "Golden set",
      sub: `${EVAL.goldenQuestions} questions`,
      icon: "file",
      tone: RAG_TONE.query,
      fill: "pastel",
      x: X[0],
      y: ROW.mid,
      w: W,
    },
    {
      id: "run",
      label: "Run pipeline",
      sub: "the candidate",
      icon: "pipeline",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 2,
      x: X[1],
      y: ROW.mid,
      w: W,
    },
    {
      id: "score",
      label: "Score retrieval",
      sub: "recall@5, MRR",
      icon: "gauge",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 3,
      x: X[2],
      y: ROW.top,
      w: 170,
    },
    {
      id: "judge",
      label: "LLM judge",
      sub: "faith, relevance",
      icon: "scale",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 4,
      x: X[2],
      y: ROW.low,
      w: 170,
    },
    {
      id: "human",
      label: "Human labels",
      sub: `${EVAL.humanLabels} graded`,
      icon: "users",
      tone: RAG_TONE.infra,
      step: 4,
      x: X[1],
      y: ROW.base,
      w: W,
    },
    {
      id: "dash",
      label: "Dashboard",
      sub: "vs baseline",
      icon: "line-chart",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 5,
      x: X[3],
      y: ROW.mid,
      w: W,
    },
    {
      id: "gate",
      label: "Release gate",
      sub: "no metric drops",
      icon: "shield-check",
      tone: RAG_TONE.infra,
      accent: true,
      step: 6,
      x: X[4],
      y: ROW.mid,
      w: W,
    },
    {
      id: "ship",
      label: "Ship",
      sub: "new baseline",
      icon: "flag",
      tone: RAG_TONE.infra,
      step: 6,
      x: X[4],
      y: ROW.top,
      w: W,
    },
    {
      id: "block",
      label: "Blocked",
      sub: "recall@5 fell",
      icon: "lock",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 7,
      x: X[4],
      y: ROW.low,
      w: W,
    },
  ],
  edges: [
    { from: "golden", to: "run", packet: true },
    { from: "run", to: "score", label: "chunks", packet: true, delay: 0.6, via: [[X[1], ROW.top]] },
    { from: "run", to: "judge", label: "answers", packet: true, delay: 0.6, via: [[X[1], ROW.low]] },
    { from: "human", to: "judge", label: "calibrate", dashed: true, via: [[X[2], ROW.base]] },
    { from: "score", to: "dash", packet: true, delay: 1.2, via: [[X[3], ROW.top]] },
    { from: "judge", to: "dash", packet: true, delay: 1.2, via: [[X[3], ROW.low]] },
    { from: "dash", to: "gate", packet: true, delay: 1.8 },
    { from: "gate", to: "ship", label: "pass", packet: true, delay: 2.4 },
    { from: "gate", to: "block", label: "drop", packet: true, delay: 2.4 },
  ],
};

export default spec;
