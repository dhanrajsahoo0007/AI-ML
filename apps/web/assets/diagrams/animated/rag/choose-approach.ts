import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "A decision framework: knowledge, behaviour and format" (prompt-vs-rag-vs-fine-tuning). Start from the best prompt
// you can write and an evaluation set; read what is still wrong; the kind of gap picks the lever. Four branches, each
// with a Brightpost example under it:
// - nothing left → ship the prompt (answers were too long: a length rule fixed it);
// - facts it lacks → RAG (the lost-phone question needs two Brightpost articles);
// - format or behaviour → fine-tune (tagging every ticket with one of 40 types in strict JSON; 40 is illustrative);
// - both → RAG and a fine-tuned model (cite the articles, in Brightpost's house style).
//
// Tones (three plus neutral), matching three-levers: prompt orange, RAG violet (the index), fine-tuning green; the
// combined branch and the question are neutral. Layout: the start box and the question centred on x 420; four
// columns 190 wide at x 20, 230, 440, 650 (centres 115, 325, 535, 745); branch boxes at y 236, examples at y 312.

const COL_X = [20, 230, 440, 650] as const;
const COL_W = 190;
const centre = (i: number) => COL_X[i] + COL_W / 2;

const branches: { label: string; sub: string; tone: LayoutTone; example: string }[] = [
  {
    label: "Ship the prompt",
    sub: "nothing left",
    tone: RAG_TONE.query,
    example: "Answers too long:\na length rule fixed it",
  },
  {
    label: "Add RAG",
    sub: "facts it lacks",
    tone: RAG_TONE.store,
    example: "Lost phone: needs two\nBrightpost articles",
  },
  {
    label: "Fine-tune",
    sub: "format or behaviour",
    tone: RAG_TONE.answer,
    example: "Tag 40 ticket types\nin strict JSON",
  },
  {
    label: "RAG + fine-tune",
    sub: "both",
    tone: RAG_TONE.infra,
    example: "Cite the articles in\nBrightpost's house style",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Choose the lever from the gap the evaluation shows",
  width: 860,
  height: 380,
  shapes: [
    {
      id: "start",
      type: "box",
      x: 300,
      y: 24,
      w: 240,
      h: 50,
      label: "Best prompt + eval set",
      sub: "measure before choosing",
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    {
      id: "ask",
      type: "box",
      x: 310,
      y: 114,
      w: 220,
      h: 44,
      label: "What is still wrong?",
      tone: RAG_TONE.infra,
      fill: "soft",
    },
    { id: "a-start", type: "arrow", x: 0, y: 0, from: "start", to: "ask" },
    ...branches.flatMap((b, i): LayoutShape[] => [
      {
        id: `b${i}`,
        type: "box",
        x: COL_X[i],
        y: 236,
        w: COL_W,
        h: 50,
        label: b.label,
        sub: b.sub,
        tone: b.tone,
        fill: b.tone === RAG_TONE.infra ? "soft" : "pastel",
      },
      {
        id: `a${i}`,
        type: "arrow",
        x: 0,
        y: 0,
        from: "ask",
        to: `b${i}`,
        via: [
          [420, 196],
          [centre(i), 196],
        ],
      },
      {
        id: `e${i}`,
        type: "box",
        x: COL_X[i],
        y: 312,
        w: COL_W,
        h: 50,
        label: b.example,
        tone: RAG_TONE.infra,
        fill: "paper",
      },
      {
        id: `l${i}`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [centre(i), 286],
          [centre(i), 312],
        ],
        dashed: true,
      },
    ]),
  ],
};

export default spec;
