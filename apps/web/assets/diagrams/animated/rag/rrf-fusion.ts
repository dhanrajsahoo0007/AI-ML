import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ADVANCED, RAG_TONE, RESULTS, TOP_K, rankList, rankListWidth } from "@/components/diagrams/presets/rag";

// Core concept 5, hybrid search: reciprocal rank fusion (RRF, Cormack, Clarke and Büttcher, SIGIR 2009) merges a BM25
// ranking and a vector ranking for Brightpost's main question. score(chunk) = Σ over lists of 1 / (k + rank), with
// k = 60 (ADVANCED.rrfK; the paper fixed k = 60 in a pilot and found the choice "not critical"). A chunk missing from
// a list adds nothing for that list. Only ranks count: the raw BM25 and cosine scores are never compared.
//
// The vector list is RESULTS (presets/rag.ts), ranks 1 to 7. The BM25 order is ILLUSTRATIVE, chosen so that the chunk
// "No backup codes: verify your ID" (vector rank 7, outside the top 5) ranks high on keywords (it repeats "lost" and
// "phone"). Both lists are cut at their top 7. Working (k = 60):
//   Reset a forgotten password       BM25 1, vector 2: 1/61 + 1/62 = 0.016393 + 0.016129 = 0.032522 → .0325
//   Change your password             BM25 4, vector 1: 1/64 + 1/61 = 0.015625 + 0.016393 = 0.032018 → .0320
//   Lost phone: use a backup code    BM25 3, vector 4: 1/63 + 1/64 = 0.015873 + 0.015625 = 0.031498 → .0315
//   No backup codes: verify your ID  BM25 2, vector 7: 1/62 + 1/67 = 0.016129 + 0.014925 = 0.031054 → .0311
//   Update your phone number         BM25 7, vector 3: 1/67 + 1/63 = 0.014925 + 0.015873 = 0.030798 → .0308
//   Locked out after failed sign-ins BM25 6, vector 6: 1/66 + 1/66 = 0.015152 + 0.015152 = 0.030303 → .0303
//   Set up two-factor sign-in        vector 5 only:    0 + 1/65 = 0.015385 → .0154
//   Password rules                   BM25 5 only:      1/65 + 0 = 0.015385 → .0154 (a tie; vector-only first)
// Fused top 5: Reset, Change, Lost phone, No backup codes, Update phone. "No backup codes" rises from vector rank 7 to
// fused rank 4, so the top 5 now holds all three relevant chunks (recall@5 = 3 / 3, was 2 / 3).
// The scores are computed below from the two rank lists, so the drawing and the working cannot drift.
//
// Layout (840 wide): left column, the BM25 list (teal group) over the vector list (violet group); right column, the
// formula box (step 2) and the fused list with its working (step 3), a neutral dashed cut after rank 5.
// Tones (four plus neutral): titles blue (relevant ones pastel), BM25 teal, vector violet, scores and fusion lime.

const K = ADVANCED.rrfK;
const DEPTH = 7;

const VECTOR = RESULTS.slice(0, DEPTH);
/** Illustrative BM25 order for the main question (titles from RESULTS). */
const BM25_ORDER = [
  "Reset a forgotten password",
  "No backup codes: verify your ID",
  "Lost phone: use a backup code",
  "Change your password",
  "Password rules",
  "Locked out after failed sign-ins",
  "Update your phone number",
] as const;
const byTitle = (t: string) => RESULTS.find((r) => r.title === t)!;
const BM25 = BM25_ORDER.map(byTitle);

const rankIn = (list: readonly { title: string }[], title: string) => {
  const i = list.findIndex((r) => r.title === title);
  return i < 0 ? undefined : i + 1;
};
const part = (rank: number | undefined) => (rank ? `1/${K + rank}` : "0");
const noScore = ({ title, relevant }: { title: string; relevant: boolean }) => ({ title, relevant });
const short = (v: number) => v.toFixed(4).replace(/^0/, "");

const titles = [...new Set([...VECTOR, ...BM25].map((r) => r.title))];
const FUSED = titles
  .map((title) => {
    const b = rankIn(BM25, title);
    const v = rankIn(VECTOR, title);
    const score = (b ? 1 / (K + b) : 0) + (v ? 1 / (K + v) : 0);
    return { title, relevant: byTitle(title).relevant, score, scoreLabel: `${part(b)} + ${part(v)} = ${short(score)}` };
  })
  // Stable sort: on a tie the chunk met first (the vector list) stays first.
  .sort((a, b) => b.score - a.score);

const STAR = "No backup codes: verify your ID";
const starFused = FUSED.findIndex((f) => f.title === STAR) + 1;
const starB = rankIn(BM25, STAR)!;
const starV = rankIn(VECTOR, STAR)!;
const starScore = 1 / (K + starB) + 1 / (K + starV);
const relevantTop = FUSED.slice(0, TOP_K).filter((f) => f.relevant).length;
const relevantAll = RESULTS.filter((r) => r.relevant).length;

const LIST = { w: 226, rowH: 28, gap: 4 } as const;
const L = { x: 20, bm25Y: 58, vecY: 348 } as const;
const R = { x: 320, fusedY: 166, scoreW: 170 } as const;
const fusedW = rankListWidth({ w: LIST.w, scoreW: R.scoreW });
const listH = DEPTH * (LIST.rowH + LIST.gap) - LIST.gap;
const cutY = R.fusedY + TOP_K * (LIST.rowH + LIST.gap) - LIST.gap / 2;

const fused = rankList("fu", R.x, R.fusedY, FUSED, { ...LIST, scoreW: R.scoreW, step: 3 }).map((s): LayoutShape =>
  s.id === `fu-t${starFused}` ? { ...s, highlight: true } : s
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Reciprocal rank fusion: two rankings become one",
  width: 840,
  height: 600,
  steps: [
    { title: "Two retrievers rank the same chunks differently" },
    { title: `Each list adds 1 / (${K} + rank) to a chunk's score` },
    { title: "Sorting by the sum lifts a chunk both lists rank well" },
  ],
  groups: [
    {
      id: "g-bm25",
      title: "BM25 ranking (illustrative)",
      tone: RAG_TONE.keyword,
      x: 8,
      y: 24,
      w: 284,
      h: listH + 50,
    },
    { id: "g-vec", title: "Vector ranking", tone: RAG_TONE.store, x: 8, y: 314, w: 284, h: listH + 50 },
  ],
  shapes: [
    // Ranks only: the raw scores are left off on purpose, RRF never reads them.
    ...rankList("bm", L.x, L.bm25Y, BM25.map(noScore), LIST),
    ...rankList("vec", L.x, L.vecY, VECTOR.map(noScore), LIST),
    {
      id: "formula",
      type: "box",
      x: R.x,
      y: 30,
      w: fusedW,
      h: 70,
      label: `RRF score = sum over the lists of 1 / (${K} + rank)\n${STAR}: 1/(${K}+${starB}) + 1/(${K}+${starV})\n= ${(1 / (K + starB)).toFixed(4)} + ${(1 / (K + starV)).toFixed(4)} = ${starScore.toFixed(4)}`,
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 2,
    },
    {
      id: "fused-title",
      type: "text",
      x: R.x + 32,
      y: R.fusedY - 26,
      w: LIST.w,
      h: 20,
      label: "Fused ranking",
      tone: RAG_TONE.infra,
      step: 3,
    },
    {
      id: "score-title",
      type: "text",
      x: R.x + fusedW - R.scoreW,
      y: R.fusedY - 26,
      w: R.scoreW,
      h: 20,
      label: "BM25 + vector = score",
      tone: RAG_TONE.infra,
      step: 3,
    },
    ...fused,
    {
      id: "cut",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [R.x - 6, cutY],
        [R.x + fusedW + 6, cutY],
      ],
      dashed: true,
      step: 3,
    },
    {
      id: "cut-label",
      type: "text",
      x: R.x + fusedW + 8,
      y: cutY - 10,
      w: 44,
      h: 20,
      label: `top ${TOP_K}`,
      tone: RAG_TONE.infra,
      step: 3,
    },
    {
      id: "result",
      type: "text",
      x: R.x,
      y: R.fusedY + FUSED.length * (LIST.rowH + LIST.gap) + 14,
      w: fusedW,
      h: 40,
      label: `Vector rank ${starV} → fused rank ${starFused}: BM25 ranked it ${starB}\n${relevantTop} of ${relevantAll} relevant chunks now in the top ${TOP_K}`,
      tone: RAG_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
