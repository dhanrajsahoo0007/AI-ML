import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// "RAG evaluation": the three things a RAG system produces for one question (the question, the retrieved context and
// the answer) and the three checks between them, as RAGAS (Es et al., 2023, arXiv 2309.15217) defines them:
// - context relevance (question ↔ context): an LLM extracts the context sentences needed to answer the question;
//   CR = needed sentences ÷ all sentences in the context.
// - faithfulness (context ↔ answer): an LLM splits the answer into statements and checks each against the context;
//   F = supported statements ÷ all statements.
// - answer relevance (question ↔ answer): an LLM writes n questions the answer would answer; AR = mean cosine
//   similarity between those and the real question. It ignores factual accuracy.
// ARES (Saad-Falcon et al., 2023) scores the same three dimensions.
//
// Steps: 1 the three things logged per question · 2 context relevance · 3 faithfulness · 4 answer relevance.
// Layout: a triangle; the question top centre, the context bottom left, the answer bottom right; each check box sits
// on its side of the triangle, joined to its two ends by plain lines.
// Tones (four): the question orange, the context blue (chunks), the answer green, the three checks lime (scores).

const NODE = { w: 220, h: 56 } as const;
const CHECK = { w: 236, h: 66 } as const;

const node = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"]
): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w: NODE.w,
  h: NODE.h,
  label,
  sub,
  tone,
  fill: "pastel",
});

const check = (id: string, x: number, y: number, label: string, sub: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w: CHECK.w,
  h: CHECK.h,
  label,
  sub,
  tone: RAG_TONE.rank,
  fill: "pastel",
  step,
});

const line = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  head: false,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The RAG evaluation triad: question, context, answer and the three checks between them",
  width: 860,
  height: 420,
  steps: [
    { title: "Three things are logged for every question" },
    { title: "Context relevance: question and context" },
    { title: "Faithfulness: context and answer" },
    { title: "Answer relevance: question and answer" },
  ],
  shapes: [
    node("question", 320, 24, "Question", "lost my phone", RAG_TONE.query),
    node("context", 30, 300, "Retrieved context", `top ${TOP_K} chunks`, RAG_TONE.text),
    node("answer", 610, 300, "Answer", "cites 2 articles", RAG_TONE.answer),

    check("cr", 96, 160, "Context relevance\nIs the context on topic?", "needed ÷ all sentences", 2),
    line("q-cr", "question", "cr", 2),
    line("cr-c", "cr", "context", 2),

    check("faith", 312, 295, "Faithfulness\nIs every claim backed?", "backed ÷ all claims", 3),
    line("c-f", "context", "faith", 3),
    line("f-a", "faith", "answer", 3),

    check("ar", 528, 160, "Answer relevance\nDoes it answer the question?", "questions rebuilt from it", 4),
    line("q-ar", "question", "ar", 4),
    line("ar-a", "ar", "answer", 4),

    {
      id: "note",
      type: "text",
      x: 130,
      y: 384,
      w: 600,
      h: 20,
      label: "Each check is a score from 0 to 1; an LLM does the reading",
      tone: RAG_TONE.infra,
      step: 2,
    },
  ],
};

export default spec;
