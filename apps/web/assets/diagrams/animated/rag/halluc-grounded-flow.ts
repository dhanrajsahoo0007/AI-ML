import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// Hallucination mitigation, "Architecture": the layered answer flow for Brightpost's main question ("How do I reset
// my password if I lost my phone?"). Ground the question in retrieved chunks → check there is enough evidence (if
// not, say "I don't know" and point to support) → draft with citations → check every claim against the chunks
// (accent) → drop or revise an unsupported claim and check again → hold high-stakes answers for a person → send the
// answer with its sources → log and sample answers to measure the hallucination rate.
//
// Eight steps: 1 the question is grounded in retrieved chunks · 2 too little evidence: say so instead of guessing ·
// 3 enough evidence: draft with citations · 4 every claim is checked against the chunks · 5 an unsupported claim is
// dropped or revised · 6 high-stakes answers wait for a person · 7 the answer goes out with its sources · 8 answers
// are logged and sampled to measure the rate. Nodes never move between steps.
//
// Layout: columns x 90 | 265 | 440 | 615 | 790 (as rag/pipeline: cards 150 wide, 25 apart). Rows: 95 (the two
// side exits: abstain above the gate, revise above the draft) | 235 (the main line) | 375 (after the check). The
// revise loop runs verify → up to y 95 → revise → down into the draft. The answer returns to the customer along the
// corridor at y 445, under the measuring node.
//
// Colour (four tones plus neutral): retrieval violet, the evidence gate and the claim check lime (scores and checks),
// the draft, the abstention and the answer green, the unsupported claim red; the customer, the reviewer and the
// measuring step neutral. The claim check is the accent.
//
// Local constants (illustrative, not from a source; the page labels them so):
// - EVIDENCE_FLOOR: the best chunk must score at least 0.70 cosine similarity. The main question's best chunk scores
//   RESULTS[0].score = 0.82, so it passes; all of its top 5 (0.82 to 0.74) clear the floor.
// - CLAIMS: the draft makes 4 claims; 3 are found in the chunks, 1 is not ("call support to reset it by phone"), so
//   3 / 4 = 75% are supported before the revise loop and 3 / 3 = 100% after it.

const EVIDENCE_FLOOR = 0.7; // the page checks it against RESULTS[0].score = 0.82
const CLAIMS = { total: 4, supported: 3 } as const;

const X = [90, 265, 440, 615, 790] as const;
const ROW = { exits: 95, main: 235, after: 375, back: 445 } as const;
const W = 150;

const unsupported = CLAIMS.total - CLAIMS.supported;

const spec: DiagramSpec = {
  title: "Hallucination mitigation: ground, abstain, cite, verify, review, measure",
  width: 880,
  height: 470,
  steps: [
    { title: "The question is grounded in retrieved chunks" },
    { title: "Too little evidence: say so instead of guessing" },
    { title: "Enough evidence: draft an answer with citations" },
    { title: "Every claim is checked against the chunks" },
    { title: "An unsupported claim is dropped or revised" },
    { title: "High-stakes answers wait for a person" },
    { title: "The answer goes out with its sources" },
    { title: "Answers are logged and sampled to measure the rate" },
  ],
  zones: [],
  nodes: [
    {
      id: "question",
      label: "Question",
      sub: "lost my phone",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[0],
      y: ROW.main,
      w: W,
    },
    {
      id: "retrieve",
      label: "Retrieve",
      sub: `top ${TOP_K} chunks`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: X[1],
      y: ROW.main,
      w: W,
    },
    {
      id: "gate",
      label: "Evidence?",
      sub: `best ≥ ${EVIDENCE_FLOOR.toFixed(2)}`,
      icon: "gauge",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 2,
      x: X[2],
      y: ROW.main,
      w: W,
    },
    {
      id: "abstain",
      label: "Abstain",
      sub: "I don't know",
      icon: "message-circle",
      tone: RAG_TONE.answer,
      step: 2,
      x: X[2],
      y: ROW.exits,
      w: W,
    },
    {
      id: "draft",
      label: "Draft answer",
      sub: "cites [1] [2]",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 3,
      x: X[3],
      y: ROW.main,
      w: W,
    },
    {
      id: "verify",
      label: "Check claims",
      sub: "each vs chunks",
      icon: "policy",
      tone: RAG_TONE.rank,
      accent: true,
      step: 4,
      x: X[4],
      y: ROW.main,
      w: W,
    },
    {
      id: "revise",
      label: "Revise",
      sub: `drop ${unsupported} claim`,
      icon: "scissors",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 5,
      x: X[3],
      y: ROW.exits,
      w: W,
    },
    {
      id: "review",
      label: "Human review",
      sub: "if high-stakes",
      icon: "user-check",
      tone: RAG_TONE.infra,
      step: 6,
      x: X[4],
      y: ROW.after,
      w: W,
    },
    {
      id: "answer",
      label: "Answer",
      sub: "with 2 links",
      icon: "link",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 7,
      x: X[3],
      y: ROW.after,
      w: W,
    },
    {
      id: "measure",
      label: "Measure",
      sub: "log + sample",
      icon: "chart",
      tone: RAG_TONE.infra,
      step: 8,
      x: X[2],
      y: ROW.after,
      w: W,
    },
  ],
  edges: [
    // Step 1: ground the question.
    { from: "question", to: "retrieve", packet: true },

    // Step 2: the evidence gate, and the honest exit.
    { from: "retrieve", to: "gate", packet: true, delay: 0.6 },
    {
      from: "gate",
      to: "abstain",
      label: `best < ${EVIDENCE_FLOOR.toFixed(2)}`,
      dashed: true,
    },
    {
      from: "abstain",
      to: "question",
      label: "no guess",
      dashed: true,
      via: [[X[0], ROW.exits]],
    },

    // Step 3: enough evidence, so draft with citations.
    // The main question's best chunk scores RESULTS[0].score (0.82), so it passes; the page gives the number (the
    // 25-unit gap is too short for a label).
    { from: "gate", to: "draft", packet: true, delay: 1.2 },

    // Step 4: check every claim.
    { from: "draft", to: "verify", packet: true, delay: 1.8 },

    // Step 5: the revise loop.
    {
      from: "verify",
      to: "revise",
      label: `${unsupported} of ${CLAIMS.total} unsupported`,
      tone: RAG_TONE.failure,
      dashed: true,
      via: [[X[4], ROW.exits]],
    },
    { from: "revise", to: "draft", label: "check again", dashed: true },

    // Step 6: high-stakes answers wait for a person.
    { from: "verify", to: "review", label: "supported", packet: true, delay: 2.4 },

    // Step 7: the answer goes out with its sources.
    { from: "review", to: "answer", packet: true, delay: 3 },
    {
      from: "answer",
      to: "question",
      label: "shown with sources",
      dashed: true,
      labelAt: 0.6,
      via: [
        [X[3], ROW.back],
        [X[0], ROW.back],
      ],
    },

    // Step 8: measure.
    { from: "answer", to: "measure", dashed: true },
  ],
};

export default spec;
