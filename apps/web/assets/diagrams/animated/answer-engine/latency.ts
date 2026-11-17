import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "The latency budget" (genai-system-design/case-studies/ai-answer-engine). A waterfall of the five stages between a
// question arriving and the first answer token, on one time axis.
//
// Stage budgets in milliseconds, illustrative (the page's latency table uses the same numbers):
// - Understand and rewrite the question with a small model: 150 → ends at 150.
// - Three searches in parallel; the stage lasts as long as the slowest: 300 → ends at 450.
// - Fetch and parse the top 8 pages in parallel, with a hard 500 ms deadline: 500 → ends at 950.
// - Chunk the pages and rerank 80 passages: 150 → ends at 1,100. The source cards can be shown now.
// - The LLM reads about 3,000 prompt tokens and emits its first token: 400 → ends at 1,500 (time to first token).
// Total to the first token = 150 + 300 + 500 + 150 + 400 = 1,500 ms.
//
// Step 2: one page takes 3 s. Waiting for it would push the first token to 1,500 - 950 + (450 + 3,000) = 4,000 ms;
// the deadline drops it at 950 and the answer uses the 7 pages that arrived.
// Step 3: an answer-cache hit returns the whole stored answer in about 50 ms (illustrative).
//
// Tones (four plus neutral, RAG legend): the question orange, search neutral (an outside service), pages blue,
// ranking lime, the LLM and the answer green. Axis: 0..2,000 ms over x 240..840 (0.3 units per ms).

const STAGES: { label: string; ms: number; tone: LayoutTone }[] = [
  { label: "Understand and rewrite", ms: 150, tone: RAG_TONE.query },
  { label: "3 searches in parallel", ms: 300, tone: RAG_TONE.infra },
  { label: "Fetch and parse 8 pages", ms: 500, tone: RAG_TONE.text },
  { label: "Chunk and rerank", ms: 150, tone: RAG_TONE.rank },
  { label: "LLM to first token", ms: 400, tone: RAG_TONE.answer },
];

const SLOW_PAGE_MS = 3_000;
const CACHE_HIT_MS = 50;

const X0 = 240;
const SCALE = 0.3;
const AXIS_MS = 2_000;
const at = (ms: number) => Math.round(X0 + ms * SCALE);

const starts = STAGES.map((_, i) => STAGES.slice(0, i).reduce((s, st) => s + st.ms, 0));
const ends = STAGES.map((st, i) => starts[i] + st.ms);
const SOURCES_MS = ends[3];
const FIRST_TOKEN_MS = ends[4];
const FETCH = { start: starts[2], end: ends[2] };

/** A bar of at least 250 ms (75 units) holds its "300 ms" label. */
const inside = (ms: number) => ms >= 250;

const ROW_Y = (i: number) => 76 + i * 42;
const BAR_H = 26;
const AXIS_Y = ROW_Y(7) - 4;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  opts: { tone?: LayoutTone; step?: number; h?: number } = {}
): LayoutShape => ({ id, type: "text", x, y, w, h: opts.h ?? 20, label, tone: opts.tone, step: opts.step });

const vline = (id: string, ms: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  dashed: true,
  points: [
    [at(ms), 60],
    [at(ms), AXIS_Y],
  ],
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The latency budget to the first answer token",
  width: 880,
  height: 420,
  steps: [
    { title: "Five stages, 1,500 ms to the first token" },
    { title: "A slow page is dropped at the fetch deadline" },
    { title: "A cached answer skips every stage" },
  ],
  shapes: [
    text("h-stage", 20, 32, 200, "Stage"),
    text("m-sources", at(SOURCES_MS) - 58, 20, 116, `Sources shown\n${fmt(SOURCES_MS)} ms`, { h: 36 }),
    text("m-first", at(FIRST_TOKEN_MS) - 58 + 6, 20, 116, `First token\n${fmt(FIRST_TOKEN_MS)} ms`, {
      h: 36,
      tone: RAG_TONE.answer,
    }),
    vline("v-sources", SOURCES_MS),
    vline("v-first", FIRST_TOKEN_MS),

    // Step 1: the five stages.
    ...STAGES.flatMap((st, i): LayoutShape[] => [
      text(`s${i}-label`, 20, ROW_Y(i) + 3, 210, st.label),
      {
        id: `s${i}-bar`,
        type: "cell",
        x: at(starts[i]),
        y: ROW_Y(i),
        w: at(ends[i]) - at(starts[i]),
        h: BAR_H,
        // The duration sits inside a bar wide enough for it, otherwise just after it (clear of the marker lines).
        label: inside(st.ms) ? `${st.ms} ms` : undefined,
        tone: st.tone,
        fill: "pastel",
      },
      ...(inside(st.ms) ? [] : [text(`s${i}-ms`, at(ends[i]) + 6, ROW_Y(i) + 3, 60, `${st.ms} ms`)]),
    ]),

    // Step 2: one page is slow; the fetch deadline drops it.
    text("slow-label", 20, ROW_Y(5) + 3, 210, `One slow page (${SLOW_PAGE_MS / 1_000} s)`, { step: 2 }),
    {
      id: "slow-bar",
      type: "cell",
      x: at(FETCH.start),
      y: ROW_Y(5),
      w: at(FETCH.end) - at(FETCH.start),
      h: BAR_H,
      label: "dropped",
      tone: RAG_TONE.text,
      fill: "soft",
      step: 2,
    },
    {
      id: "slow-rest",
      type: "path",
      x: 0,
      y: 0,
      dashed: true,
      step: 2,
      points: [
        [at(FETCH.end), ROW_Y(5) + BAR_H / 2],
        [at(AXIS_MS), ROW_Y(5) + BAR_H / 2],
      ],
    },
    text(
      "slow-note",
      at(FIRST_TOKEN_MS) + 22,
      ROW_Y(5) - 14,
      150,
      `would end at ${fmt(FETCH.start + SLOW_PAGE_MS)} ms`,
      {
        step: 2,
      }
    ),

    // Step 3: an answer-cache hit.
    text("cache-label", 20, ROW_Y(6) + 3, 210, "Answer cache hit", { step: 3 }),
    {
      id: "cache-bar",
      type: "cell",
      x: at(0),
      y: ROW_Y(6),
      w: at(CACHE_HIT_MS) - at(0),
      h: BAR_H,
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 3,
    },
    text("cache-ms", at(CACHE_HIT_MS) + 6, ROW_Y(6) + 3, 190, `${CACHE_HIT_MS} ms for the whole answer`, {
      step: 3,
    }),

    // The time axis.
    {
      id: "axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [at(0), AXIS_Y],
        [at(AXIS_MS), AXIS_Y],
      ],
    },
    ...[0, 500, 1_000, 1_500, 2_000].flatMap((ms): LayoutShape[] => [
      {
        id: `tick-${ms}`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [at(ms), AXIS_Y],
          [at(ms), AXIS_Y + 6],
        ],
      },
      text(`tick-${ms}-label`, at(ms) - 30, AXIS_Y + 8, 60, fmt(ms)),
    ]),
    text("axis-title", at(0), AXIS_Y + 30, 600, "Milliseconds after the question arrives (illustrative)"),
  ],
};

export default spec;
