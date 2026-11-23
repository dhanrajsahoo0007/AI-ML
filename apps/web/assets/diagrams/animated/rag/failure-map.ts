import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ADVANCED, RAG_TONE, stageStrip, type Stage } from "@/components/diagrams/presets/rag";

// "Where RAG fails": the six-stage locator across the top, and under each stage the failure that happens there (red)
// and its fix (green). Seven failures; Retrieve has two (wording and ranking), which is the point: most RAG quality
// problems are retrieval problems. The ranking failure is the running example's: the relevant chunk at rank 7 with
// only the top TOP_K (5) used; the fix fetches 100 candidates, reranks and keeps 5 (ADVANCED).
//
// Columns are the strip's boxes (116 wide, 16 apart). Rows: failure at y 96, fix at y 160; Retrieve's second pair at
// y 236 and 300. Tones (three): neutral strip, red failures, green fixes.

const W = 116;
const GAP = 16;
const X0 = 24;
const strip = stageStrip("st", X0, 20, { w: W, gap: GAP, h: 34, step: 1 });

const FAILURES: { stage: Stage; fail: string; fix: string; row?: 1 | 2 }[] = [
  { stage: "Parse", fail: "Tables and\nheadings lost", fix: "Layout-aware\nparser" },
  { stage: "Chunk", fail: "Key fact split\nacross chunks", fix: "Structure-aware\nchunks + overlap" },
  { stage: "Index", fail: "Index is stale\nafter edits", fix: "Re-index edits\nincrementally" },
  { stage: "Retrieve", fail: "Words differ\nfrom the article", fix: "Hybrid search,\nquery rewriting" },
  {
    stage: "Retrieve",
    fail: "Relevant chunk\nat rank 7",
    fix: `Rerank ${ADVANCED.candidates},\nkeep ${ADVANCED.keep}`,
    row: 2,
  },
  { stage: "Prompt", fail: "Key fact lost\nin the middle", fix: "Fewer, better-\nordered chunks" },
  { stage: "Generate", fail: "Answers from\nmemory", fix: "Ground and cite;\nsay I don't know" },
];

const ROWS = { 1: { fail: 96, fix: 160 }, 2: { fail: 236, fix: 300 } } as const;

const pairs: LayoutShape[] = FAILURES.flatMap((f, i) => {
  const x = strip.centres[f.stage] - W / 2;
  const row = ROWS[f.row ?? 1];
  const fail = `fail${i}`;
  const fix = `fix${i}`;
  const above = f.row === 2 ? `fix${i - 1}` : `st-${f.stage.toLowerCase()}`;
  return [
    {
      id: fail,
      type: "box",
      x,
      y: row.fail,
      w: W,
      h: 44,
      label: f.fail,
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 2,
    },
    {
      id: fix,
      type: "box",
      x,
      y: row.fix,
      w: W,
      h: 44,
      label: f.fix,
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 3,
    },
    { id: `${fail}-in`, type: "arrow", x: 0, y: 0, from: above, to: fail, head: false, dashed: true, step: 2 },
    { id: `${fix}-in`, type: "arrow", x: 0, y: 0, from: fail, to: fix, step: 3 },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where RAG fails: one failure and one fix per stage",
  width: 820,
  height: 360,
  steps: [
    { title: "The six stages of the pipeline" },
    { title: "What breaks at each stage" },
    { title: "The fix for each failure" },
  ],
  shapes: [
    ...strip.shapes,
    ...pairs,
    {
      id: "note",
      type: "text",
      x: X0,
      y: 330,
      w: 380,
      h: 20,
      label: "Retrieve breaks in two ways: most failures start there",
      tone: RAG_TONE.infra,
      step: 2,
    },
  ],
};

export default spec;
