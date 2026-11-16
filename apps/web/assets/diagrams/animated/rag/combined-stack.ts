import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// Architecture for prompt-vs-rag-vs-fine-tuning: Brightpost's support assistant grown one lever at a time, each added
// only when the eval set shows the gap it closes.
// 1 Start with a versioned prompt, a base model and an eval set that gates every change.
// 2 Add retrieval: the help centre is indexed offline; each question fetches the top 5 chunks into the prompt.
// 3 Add fine-tuning: graded replies train the model on format and house style; the tuned weights replace the base
//   model behind the same prompt.
//
// Illustrative numbers local to this figure: TRAIN = 3,000 graded replies, EVAL = 200 questions.
//
// Layout as in rag/pipeline: five columns at x 90 | 265 | 440 | 615 | 790, cards 150 wide; rows 95 (offline) and
// 290 (online). The index-to-retrieve edge runs straight down x 265, the eval gate straight down x 440, the tuned
// weights along the y 192 corridor from x 790 to 615. The question also reaches the prompt along y 352.
//
// Tones (four plus neutral): sources and training data blue, the index and retrieval violet, the prompt orange, the
// model and the answer green; the user and the eval set neutral. The model is the accent.

const X = [90, 265, 440, 615, 790] as const;
const ROW = { offline: 95, online: 290 } as const;
const W = 150;
const TRAIN = 3_000;
const EVAL = 200;

const spec: DiagramSpec = {
  title: "A support assistant grown one lever at a time: prompt, then retrieval, then fine-tuning",
  width: 880,
  height: 400,
  steps: [
    { title: "Start with a prompt, a base model and an eval set" },
    { title: "Add retrieval for the facts" },
    { title: "Fine-tune for format and style" },
  ],
  zones: [
    { id: "offline", title: "Offline: built before release", tone: RAG_TONE.infra, x: 10, y: 40, w: 860, h: 115 },
    { id: "online", title: "Online: every question", tone: RAG_TONE.infra, x: 10, y: 232, w: 860, h: 150 },
  ],
  nodes: [
    {
      id: "sources",
      label: "Help centre",
      sub: `${fmt(CORPUS.articles)} articles`,
      icon: "folder",
      tone: RAG_TONE.text,
      step: 2,
      x: X[0],
      y: ROW.offline,
      w: W,
    },
    {
      id: "index",
      label: "Vector index",
      sub: `${fmt(CORPUS.chunks)} chunks`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.offline,
      w: W,
    },
    {
      id: "eval",
      label: "Eval set",
      sub: `${EVAL} questions`,
      icon: "meter",
      tone: RAG_TONE.infra,
      x: X[2],
      y: ROW.offline,
      w: W,
    },
    {
      id: "train",
      label: "Training set",
      sub: `${fmt(TRAIN)} replies`,
      icon: "file",
      tone: RAG_TONE.text,
      step: 3,
      x: X[3],
      y: ROW.offline,
      w: W,
    },
    {
      id: "tune",
      label: "Fine-tune",
      sub: "LoRA, hours",
      icon: "pipeline",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 3,
      x: X[4],
      y: ROW.offline,
      w: W,
    },
    {
      id: "question",
      label: "Question",
      sub: "lost my phone",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[0],
      y: ROW.online,
      w: W,
    },
    {
      id: "retrieve",
      label: "Retrieve",
      sub: `top ${TOP_K} chunks`,
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.online,
      w: W,
    },
    {
      id: "prompt",
      label: "Prompt",
      sub: "versioned",
      icon: "prompt",
      tone: RAG_TONE.query,
      fill: "pastel",
      x: X[2],
      y: ROW.online,
      w: W,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "base, then tuned",
      icon: "model",
      tone: RAG_TONE.answer,
      accent: true,
      x: X[3],
      y: ROW.online,
      w: W,
    },
    {
      id: "answer",
      label: "Answer",
      sub: "cites articles",
      icon: "link",
      tone: RAG_TONE.answer,
      fill: "pastel",
      x: X[4],
      y: ROW.online,
      w: W,
    },
  ],
  edges: [
    // Step 1: the prompt-only baseline, gated by the eval set.
    {
      from: "question",
      to: "prompt",
      label: "the question",
      packet: true,
      via: [
        [X[0], 352],
        [X[2], 352],
      ],
    },
    { from: "prompt", to: "llm", packet: true, delay: 0.6 },
    { from: "llm", to: "answer", packet: true, delay: 1.2 },
    { from: "eval", to: "prompt", label: "gates each change", dashed: true },
    // Step 2: retrieval.
    { from: "sources", to: "index", packet: true, step: 2 },
    { from: "question", to: "retrieve", packet: true, step: 2 },
    { from: "index", to: "retrieve", packet: true, delay: 0.6, step: 2 },
    { from: "retrieve", to: "prompt", packet: true, delay: 1.2, step: 2 },
    // Step 3: fine-tuning.
    { from: "train", to: "tune", packet: true, step: 3 },
    {
      from: "tune",
      to: "llm",
      label: "tuned weights",
      packet: true,
      delay: 0.6,
      step: 3,
      via: [
        [X[4], 192],
        [X[3], 192],
      ],
    },
  ],
};

export default spec;
