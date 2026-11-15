import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, RESULTS, QUESTIONS } from "@/components/diagrams/presets/rag";

// "The idea in plain English": the same model answers the same question twice. Left, closed book: the model alone
// answers from what it learned in training, which knows nothing about Brightpost's help centre. Right, open book: the
// three relevant chunks from the running example (RESULTS ranks 2, 4 and 7) are handed over, and the answer cites
// them as [1], [2], [3].
//
// Tones (four): the question orange, the model and the good answer green, passages blue, the closed-book answer red.
// Two panels of 380 at x 20 and 440; inside each, the question on top, the model in the middle, the answer below.

const question = QUESTIONS.main.replace(" if ", "\nif ");
const passages = RESULTS.filter((r) => r.relevant).map((r) => r.title);

const panel = (p: string, x: number): LayoutShape[] => [
  {
    id: `${p}-q`,
    type: "box",
    x: x + 30,
    y: 58,
    w: 320,
    h: 50,
    label: question,
    tone: RAG_TONE.query,
    fill: "pastel",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Closed book and open book: the same model with and without retrieved passages",
  width: 840,
  height: 340,
  groups: [
    { id: "closed", title: "Closed book: the model alone", tone: RAG_TONE.infra, x: 20, y: 30, w: 380, h: 295 },
    { id: "open", title: "Open book: with 3 retrieved passages", tone: RAG_TONE.infra, x: 440, y: 30, w: 380, h: 295 },
  ],
  shapes: [
    // Closed book
    ...panel("c", 20),
    {
      id: "c-llm",
      type: "box",
      x: 135,
      y: 150,
      w: 150,
      h: 50,
      label: "LLM",
      sub: "training data only",
      tone: RAG_TONE.answer,
      fill: "pastel",
    },
    {
      id: "c-ans",
      type: "box",
      x: 50,
      y: 245,
      w: 320,
      h: 54,
      label: "Generic steps from other sites,\nmaybe out of date, no source",
      tone: RAG_TONE.failure,
      fill: "pastel",
    },
    { id: "c-a1", type: "arrow", x: 0, y: 0, from: "c-q", to: "c-llm" },
    { id: "c-a2", type: "arrow", x: 0, y: 0, from: "c-llm", to: "c-ans" },

    // Open book
    ...panel("o", 440),
    ...passages.map((title, i): LayoutShape => ({
      id: `o-p${i + 1}`,
      type: "box",
      x: 450,
      y: 132 + i * 34,
      w: 230,
      h: 28,
      label: `[${i + 1}] ${title}`,
      tone: RAG_TONE.text,
      fill: "pastel",
    })),
    {
      id: "o-llm",
      type: "box",
      x: 698,
      y: 150,
      w: 108,
      h: 50,
      label: "LLM",
      sub: "same model",
      tone: RAG_TONE.answer,
      fill: "pastel",
    },
    {
      id: "o-ans",
      type: "box",
      x: 470,
      y: 245,
      w: 320,
      h: 54,
      label: "Brightpost's own steps:\nbackup code [2], else ID check [3]",
      tone: RAG_TONE.answer,
      fill: "pastel",
      highlight: true,
    },
    { id: "o-a1", type: "arrow", x: 0, y: 0, from: "o-q", to: "o-llm", via: [[752, 125]] },
    ...passages.map((_, i): LayoutShape => ({
      id: `o-pa${i + 1}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `o-p${i + 1}`,
      to: "o-llm",
    })),
    { id: "o-a2", type: "arrow", x: 0, y: 0, from: "o-llm", to: "o-ans", via: [[752, 225]] },
  ],
};

export default spec;
