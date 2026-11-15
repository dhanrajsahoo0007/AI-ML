import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { CORPUS, LATENCY_MS, PROMPT, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "Cost, latency and maintenance compared" (prompt-vs-rag-vs-fine-tuning). Four ways to answer Brightpost's main
// question, one row each: input tokens per question (a bar on a log scale), the latency added before the model
// starts, and what happens when one help article changes.
//
// Working (all from presets/rag.ts unless marked):
// - Prompt only: 200 instructions + 15 question = 215 tokens.
// - Fine-tuned: the model has learned the format and style, so the instructions shrink to about 50 tokens
//   (FINE_TUNED_INSTRUCTIONS, illustrative) + 15 = 65 tokens. Facts still come from training, so an article edit
//   means a new training run.
// - RAG, top 5: PROMPT.total = 2,215 tokens; adds embed + search = 20 + 15 = 35 ms (LATENCY_MS, illustrative); an
//   edited article re-embeds its 3 chunks.
// - Long context: paste the whole help centre: 1,200 × 1,100 = 1,320,000 tokens + 215 = 1,320,215 ≈ 1.32 M tokens,
//   more than a 1 M-token window, so it does not fit at all (red).
//
// Log-scale bars: x = BAR_X + BAR_W × log10(tokens) / LOG_MAX with LOG_MAX = log10(2,000,000) ≈ 6.3, so 65 → 103,
// 215 → 133, 2,215 → 191, 1.32 M → 350 units. Ticks at 100, 10 k and 1 M.
//
// Tones (four): prompt orange, fine-tuning green, RAG violet, long context red (it breaks the window).
// Columns: approach x 20..190 | bar x 200..560 | added latency x 575..685 | an article changes x 695..855.

const FINE_TUNED_INSTRUCTIONS = 50;

const base = PROMPT.instructionTokens + PROMPT.questionTokens;
const longContext = CORPUS.articles * CORPUS.articleTokens + base;

const BAR_X = 200;
const BAR_W = 360;
const LOG_MAX = Math.log10(2_000_000);
const barW = (tokens: number) => Math.round((BAR_W * Math.log10(tokens)) / LOG_MAX);

const rows: { label: string; tokens: number; tag: string; tone: LayoutTone; latency: string; change: string }[] = [
  {
    label: "Prompt only",
    tokens: base,
    tag: fmt(base),
    tone: RAG_TONE.query,
    latency: "none",
    change: "edit the prompt",
  },
  {
    label: "Fine-tuned model",
    tokens: FINE_TUNED_INSTRUCTIONS + PROMPT.questionTokens,
    tag: fmt(FINE_TUNED_INSTRUCTIONS + PROMPT.questionTokens),
    tone: RAG_TONE.answer,
    latency: "none",
    change: "train again",
  },
  {
    label: "RAG, top 5",
    tokens: PROMPT.total,
    tag: fmt(PROMPT.total),
    tone: RAG_TONE.store,
    latency: `+${LATENCY_MS.embedQuery + LATENCY_MS.vectorSearch} ms`,
    change: `re-embed ${CORPUS.chunksPerArticle} chunks`,
  },
  {
    label: "Whole help centre",
    tokens: longContext,
    tag: `${(longContext / 1_000_000).toFixed(2)} M: over a 1 M window`,
    tone: RAG_TONE.failure,
    latency: "does not fit",
    change: "nothing to rebuild",
  },
];

const ROW_Y = (i: number) => 70 + i * 56;
const text = (id: string, x: number, y: number, w: number, label: string, tone?: LayoutTone): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone,
});

const TICKS = [
  { at: 100, label: "100" },
  { at: 10_000, label: "10 k" },
  { at: 1_000_000, label: "1 M" },
];
const AXIS_Y = ROW_Y(rows.length) - 10;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Input tokens, added latency and upkeep for four ways to answer one question",
  width: 860,
  height: 320,
  shapes: [
    text("h-approach", 20, 30, 170, "Approach"),
    text("h-tokens", BAR_X, 30, BAR_W, "Input tokens per question (log scale)"),
    text("h-latency", 575, 30, 110, "Added latency"),
    text("h-change", 695, 30, 160, "An article changes"),
    ...rows.flatMap((r, i): LayoutShape[] => [
      text(`r${i}-label`, 20, ROW_Y(i) + 5, 170, r.label),
      {
        id: `r${i}-bar`,
        type: "cell",
        x: BAR_X,
        y: ROW_Y(i),
        w: barW(r.tokens),
        h: 30,
        label: r.tag,
        tone: r.tone,
        fill: "pastel",
      },
      text(`r${i}-latency`, 575, ROW_Y(i) + 5, 110, r.latency, r.tone === RAG_TONE.failure ? r.tone : undefined),
      text(`r${i}-change`, 695, ROW_Y(i) + 5, 160, r.change),
    ]),
    {
      id: "axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [BAR_X, AXIS_Y],
        [BAR_X + BAR_W, AXIS_Y],
      ],
    },
    ...TICKS.flatMap((t): LayoutShape[] => {
      const tx = BAR_X + barW(t.at);
      return [
        {
          id: `tick-${t.at}`,
          type: "path",
          x: 0,
          y: 0,
          points: [
            [tx, AXIS_Y],
            [tx, AXIS_Y + 6],
          ],
        },
        text(`tick-${t.at}-label`, tx - 25, AXIS_Y + 8, 50, t.label),
      ];
    }),
  ],
};

export default spec;
