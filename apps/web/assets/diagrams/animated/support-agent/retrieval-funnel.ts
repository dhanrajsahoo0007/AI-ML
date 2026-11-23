import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { GATES, LATENCY_MS, RETRIEVAL } from "@/components/diagrams/presets/gcase-support";
import { fmt, funnel } from "@/components/diagrams/presets/rag";

// "Ground answers in the help centre" (customer-support-agent, Step 2; also answers "what does the reranker cost and
// buy"). Brightpost's 3,600 chunks → hybrid search keeps 40 → a cross-encoder scores those 40 → the 5 passages that
// fit the 2,000-token evidence budget. Every number from presets/gcase-support.ts:
//   RETRIEVAL.chunks = 3,600 (CORPUS: 1,200 articles × 3 chunks); RETRIEVAL.candidates = 40;
//   kept = budget 2,000 ÷ 400 tokens a passage (CORPUS.chunkTokens) = 5;
//   LATENCY_MS.search = 60 ms, RETRIEVAL.rerankMs = 150 ms (illustrative; Fin reports P50 ≈ 150 ms for its own
//   reranker), RETRIEVAL.rerankUsd = 0.0005 USD a query (illustrative);
//   search + rerank = 60 + 150 = 210 ms, run in parallel with the router's 250 ms (LATENCY_MS.router), so the turn
//   waits max(250, 210) = 250 ms, not 460;
//   the gate: recall@5 ≥ 90% on 300 labelled queries (GATES), measured with and without the reranker.
// Four steps, one stage each; the gate box arrives with the last stage.
// Layout (860 wide): funnel() from presets/rag.ts centred at x 250 (box width linear in the count), one note per
// stage at x 500, the gate and the timing line underneath.
// Tones (GENAI_TONE, three plus neutral): chunks and passages blue (data), hybrid search violet (the index), the
// reranker and the gate lime (ranking, check).

const STAGE = { y: 30, h: 50, gap: 30 } as const;
const stageY = (i: number) => STAGE.y + i * (STAGE.h + STAGE.gap);
const parallelMs = RETRIEVAL.rerankMs + LATENCY_MS.search;
const pct = (v: number) => `${Math.round(v * 100)}%`;

const note = (i: number, label: string): LayoutShape => ({
  id: `note-${i}`,
  type: "text",
  x: 500,
  y: stageY(i) + 5,
  w: 340,
  h: 40,
  label,
  tone: "neutral",
  step: i + 1,
});

const GATE_Y = stageY(4) + 4;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Retrieval for the support agent: 3,600 chunks to the 5 passages that fit 2,000 tokens",
  width: 860,
  height: GATE_Y + 50 + 40,
  steps: [
    { title: `All ${fmt(RETRIEVAL.chunks)} chunks are candidates` },
    { title: `Hybrid search keeps ${RETRIEVAL.candidates}` },
    { title: `A cross-encoder scores the ${RETRIEVAL.candidates}` },
    { title: `The best ${RETRIEVAL.kept} fit the ${fmt(RETRIEVAL.budgetTokens)}-token budget` },
  ],
  shapes: [
    ...funnel(
      "f",
      250,
      STAGE.y,
      [
        {
          label: "Help index",
          count: RETRIEVAL.chunks,
          sub: `${fmt(RETRIEVAL.chunks)} chunks`,
          tone: GENAI_TONE.data,
          step: 1,
        },
        {
          label: "Hybrid search",
          count: RETRIEVAL.candidates,
          sub: `keyword + vector: top ${RETRIEVAL.candidates}`,
          tone: GENAI_TONE.store,
          step: 2,
        },
        {
          label: "Cross-encoder rerank",
          count: RETRIEVAL.candidates,
          sub: `${RETRIEVAL.candidates} pairs scored`,
          tone: GENAI_TONE.rank,
          step: 3,
        },
        {
          label: "Evidence budget",
          count: RETRIEVAL.kept,
          sub: `${RETRIEVAL.kept} passages × ${RETRIEVAL.passageTokens} tokens`,
          tone: GENAI_TONE.data,
          step: 4,
        },
      ],
      { maxW: 440, minW: 220, h: STAGE.h, gap: STAGE.gap }
    ),
    note(
      0,
      `${fmt(RETRIEVAL.indexMB)} MB of vectors plus keyword fields;\narticles re-indexed within minutes of an edit`
    ),
    note(1, `≈ ${LATENCY_MS.search} ms: product codes match by keyword,\n"it came in pieces" by vector`),
    note(
      2,
      `≈ ${RETRIEVAL.rerankMs} ms and ${RETRIEVAL.rerankUsd} USD a query:\nreads each question-passage pair (illustrative)`
    ),
    note(
      3,
      `${RETRIEVAL.kept} × ${RETRIEVAL.passageTokens} = ${fmt(RETRIEVAL.budgetTokens)} tokens, cited by article;\nthe rest are dropped, not squeezed in`
    ),
    {
      id: "gate",
      type: "box",
      x: 30,
      y: GATE_Y,
      w: 440,
      h: 50,
      label: `Gate: recall@5 ≥ ${pct(GATES.recallAt5)}`,
      sub: `${GATES.retrievalQueries} labelled queries, with and without the reranker`,
      tone: GENAI_TONE.check,
      fill: "pastel",
      step: 4,
    },
    {
      id: "timing",
      type: "text",
      x: 500,
      y: GATE_Y + 5,
      w: 340,
      h: 40,
      label: `Search + rerank = ${LATENCY_MS.search} + ${RETRIEVAL.rerankMs} = ${parallelMs} ms,\nin parallel with the ${LATENCY_MS.router} ms router: no added wait`,
      tone: "neutral",
      step: 4,
    },
  ],
};

export default spec;
