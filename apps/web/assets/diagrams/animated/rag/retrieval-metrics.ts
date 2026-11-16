import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { METRICS, RAG_TONE, RELEVANT_RANKS, RESULTS, TOP_K, rankList } from "@/components/diagrams/presets/rag";

// "Measuring a RAG system": one question, one ranked list, three retrieval metrics, then the two generation checks.
// The list is RESULTS (presets/rag.ts): relevant chunks at ranks 2, 4 and 7 (pastel). Working, computed below from
// RELEVANT_RANKS so the figure and the constants cannot drift:
// - recall@5 = relevant in the top 5 / all relevant = 2 / 3 = 0.67
// - MRR = 1 / rank of the first relevant = 1 / 2 = 0.5
// - nDCG@10 (binary gain) = DCG / ideal DCG; DCG = 1/log2(3) + 1/log2(5) + 1/log2(8) = 1.39; ideal (ranks 1, 2, 3) =
//   1 + 1/log2(3) + 1/log2(4) = 2.13; 1.39 / 2.13 = 0.65
// Generation checks as RAGAS (Es et al., 2023) defines them: faithfulness (claims supported by the retrieved context)
// and answer relevance (the answer addresses the question).
//
// Tones (four): titles blue, scores and metrics lime, the k cut orange, the generation checks green.

const gain = (r: number) => 1 / Math.log2(r + 1);
const dcg = RELEVANT_RANKS.reduce((s, r) => s + gain(r), 0);
const ideal = RELEVANT_RANKS.map((_, i) => gain(i + 1)).reduce((s, g) => s + g, 0);
const inTop = RELEVANT_RANKS.filter((r) => r <= TOP_K).length;
const first = Math.min(...RELEVANT_RANKS);
const f2 = (v: number) => v.toFixed(2);

const metric = (
  id: string,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = RAG_TONE.rank,
  h = 50
): LayoutShape => ({
  id,
  type: "box",
  x: 430,
  y,
  w: 400,
  h,
  label,
  tone,
  fill: "pastel",
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Measuring retrieval and generation for one question",
  width: 860,
  height: 420,
  steps: [
    { title: "The ranked list for one question" },
    { title: "Three retrieval metrics from that list" },
    { title: "Two checks on the generated answer" },
  ],
  groups: [
    { id: "retrieval", title: "Retrieval", tone: RAG_TONE.infra, x: 410, y: 34, w: 440, h: 222 },
    { id: "generation", title: "Generation", tone: RAG_TONE.infra, x: 410, y: 290, w: 440, h: 116 },
  ],
  shapes: [
    {
      id: "list-title",
      type: "text",
      x: 20,
      y: 14,
      w: 324,
      h: 20,
      label: "10 results; relevant ones shaded",
      tone: RAG_TONE.infra,
    },
    ...rankList("list", 20, 44, RESULTS, { w: 220, rowH: 30, gap: 4, cut: TOP_K, cutLabel: `k = ${TOP_K}` }),
    metric(
      "recall",
      58,
      `Recall@${TOP_K} = ${inTop} / ${RELEVANT_RANKS.length} = ${f2(METRICS.recall5)}\nrelevant chunks found in the top ${TOP_K}`,
      2
    ),
    metric("mrr", 124, `MRR = 1 / ${first} = ${METRICS.mrr}\nthe first relevant chunk is at rank ${first}`, 2),
    metric(
      "ndcg",
      190,
      `nDCG@10 = ${f2(dcg)} / ${f2(ideal)} = ${f2(METRICS.ndcg10)}\nrewards relevant chunks near the top`,
      2
    ),
    metric("faith", 308, "Faithfulness: is every claim backed by a chunk?", 3, RAG_TONE.answer, 40),
    metric("relevance", 356, "Answer relevance: does it answer the question?", 3, RAG_TONE.answer, 40),
  ],
};

export default spec;
