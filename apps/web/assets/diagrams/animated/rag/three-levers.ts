import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, PROMPT, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// "What each approach changes" (prompt-vs-rag-vs-fine-tuning): one model call drawn as what the model reads (the
// instructions, the retrieved passages, the question) above the weights it reads them with. Each step adds one lever
// on the left and says on the right when that lever changes:
// 1 prompt engineering edits the instructions (any time, no training) · 2 RAG fills the passages slot from the vector
// index on every request · 3 fine-tuning changes the weights (once per training run).
//
// Numbers from PROMPT in presets/rag.ts: 200 instruction tokens, 5 × 400 = 2,000 tokens of passages, a 15-token
// question.
//
// Tones (four): the prompt and the question orange, passages blue, the vector index violet, the model green.
// Layout: levers x 30..250 | the model call (group) x 290..590 | "changes when" notes x 620..830.

const LEVER_X = 30;
const LEVER_W = 220;
const CALL_X = 310;
const CALL_W = 260;
const NOTE_X = 620;
const ROW = { inst: 72, ctx: 128, q: 184, llm: 268 } as const;

const note = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: NOTE_X,
  y,
  w: 210,
  h: 20,
  label,
  tone: RAG_TONE.infra,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three levers on one model call: the words, the evidence and the weights",
  width: 840,
  height: 350,
  steps: [
    { title: "Prompt engineering edits the words you send" },
    { title: "RAG adds evidence to every request" },
    { title: "Fine-tuning changes the model itself" },
  ],
  groups: [{ id: "call", title: "One model call", tone: RAG_TONE.infra, x: 290, y: 36, w: 300, h: 300 }],
  shapes: [
    { id: "h-lever", type: "text", x: LEVER_X, y: 40, w: LEVER_W, h: 20, label: "The lever" },
    { id: "h-when", type: "text", x: NOTE_X, y: 40, w: 210, h: 20, label: "It changes" },

    // What the model reads, and the weights it reads them with.
    {
      id: "inst",
      type: "box",
      x: CALL_X,
      y: ROW.inst,
      w: CALL_W,
      h: 44,
      label: "Instructions + examples",
      sub: `≈ ${PROMPT.instructionTokens} tokens`,
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    {
      id: "ctx",
      type: "box",
      x: CALL_X,
      y: ROW.ctx,
      w: CALL_W,
      h: 44,
      label: "Retrieved passages",
      sub: `${TOP_K} × ${CORPUS.chunkTokens} = ${fmt(PROMPT.contextTokens)} tokens`,
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 2,
    },
    {
      id: "q",
      type: "box",
      x: CALL_X,
      y: ROW.q,
      w: CALL_W,
      h: 44,
      label: "Question",
      sub: `≈ ${PROMPT.questionTokens} tokens`,
      tone: RAG_TONE.query,
      fill: "soft",
    },
    {
      id: "llm",
      type: "box",
      x: CALL_X,
      y: ROW.llm,
      w: CALL_W,
      h: 50,
      label: "LLM weights",
      sub: "billions of numbers",
      tone: RAG_TONE.answer,
      fill: "pastel",
    },
    { id: "a-read", type: "arrow", x: 0, y: 0, from: "q", to: "llm" },

    // Step 1: prompt engineering.
    {
      id: "l-prompt",
      type: "box",
      x: LEVER_X,
      y: ROW.inst,
      w: LEVER_W,
      h: 44,
      label: "Prompt engineering",
      sub: "you edit the words",
      tone: RAG_TONE.query,
      fill: "soft",
      step: 1,
    },
    { id: "a-prompt", type: "arrow", x: 0, y: 0, from: "l-prompt", to: "inst", step: 1 },
    note("n-prompt", ROW.inst + 12, "any time, no training", 1),

    // Step 2: RAG.
    {
      id: "l-rag",
      type: "box",
      x: LEVER_X,
      y: ROW.ctx,
      w: LEVER_W,
      h: 44,
      label: "Vector index",
      sub: `${fmt(CORPUS.chunks)} help-centre chunks`,
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
    },
    { id: "a-rag", type: "arrow", x: 0, y: 0, from: "l-rag", to: "ctx", step: 2 },
    note("n-rag", ROW.ctx + 12, "on every request", 2),

    // Step 3: fine-tuning.
    {
      id: "l-ft",
      type: "box",
      x: LEVER_X,
      y: ROW.llm,
      w: LEVER_W,
      h: 50,
      label: "Fine-tuning",
      sub: "trains on examples",
      tone: RAG_TONE.answer,
      fill: "soft",
      step: 3,
    },
    { id: "a-ft", type: "arrow", x: 0, y: 0, from: "l-ft", to: "llm", step: 3 },
    note("n-ft", ROW.llm + 15, "once per training run", 3),
  ],
};

export default spec;
