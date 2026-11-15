import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE, RESULTS } from "@/components/diagrams/presets/rag";

// Which search finds which question. Three Brightpost questions, each searched by BM25 (keywords) and by vector search
// (meaning); each cell shows the top relevant hit, or the wrong top hit.
//   1 The main question shares words with its article and means the same thing: both find "Reset a forgotten
//     password" (BM25 rank 1, as in the rrf-fusion figure; vector rank 2, as in RESULTS).
//   2 A paraphrase with almost no shared words (the one on the embedding-space figure): BM25 matches only "phone" and
//     returns "Update your phone number"; vector search finds "Lost phone: use a backup code".
//   3 QUESTIONS.keyword: BM25 matches the token "E1234" exactly; the embedding of a rare code is close to the
//     embedding of any similar code, so vector search returns the article for another code.
// The E1234 and E1243 article titles and the paraphrase are this figure's own (not yet in presets/rag.ts); which
// article each method returns is illustrative.
//
// Layout (860 wide): questions in the left column (x 20, 250 wide), BM25 results (x 290) and vector results (x 580),
// 270 wide each; one row per step. Tones (four plus neutral): BM25 teal, vector violet, found chunks blue (pastel),
// wrong hits red; the questions are neutral text so the figure stays at four tones.

/** The paraphrase used on the embedding-space figure. */
const PARAPHRASE = "Can't log in, phone was stolen";
/** The article QUESTIONS.keyword needs, and the article for a code that looks like it. */
const CODE_ARTICLE = "Error E1234: session expired";
const NEAR_CODE = "Error E1243: card declined";

const byTitle = (t: string) => RESULTS.find((r) => r.title === t)!;
const reset = byTitle("Reset a forgotten password");
const resetVectorRank = RESULTS.indexOf(reset) + 1;

const COL = { q: 20, bm25: 290, vec: 580 } as const;
const CELL = { w: 270, h: 60 } as const;
const ROW_Y = [86, 168, 250] as const;

interface Hit {
  title: string;
  verdict: string;
  found: boolean;
  highlight?: boolean;
}
const ROWS: { question: string; bm25: Hit; vector: Hit }[] = [
  {
    question: QUESTIONS.main.replace(" if ", "\nif "),
    bm25: { title: reset.title, verdict: "relevant, rank 1: shared words", found: true },
    vector: { title: reset.title, verdict: `relevant, rank ${resetVectorRank}: same meaning`, found: true },
  },
  {
    question: `"${PARAPHRASE}"\n(a paraphrase)`,
    bm25: { title: byTitle("Update your phone number").title, verdict: 'wrong: shares only "phone"', found: false },
    vector: { title: byTitle("Lost phone: use a backup code").title, verdict: "relevant: same meaning", found: true },
  },
  {
    question: QUESTIONS.keyword,
    bm25: { title: CODE_ARTICLE, verdict: "relevant, rank 1: exact code", found: true, highlight: true },
    vector: { title: NEAR_CODE, verdict: "wrong: a code that looks alike", found: false },
  },
];

const cell = (id: string, x: number, y: number, hit: Hit, step: number): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w: CELL.w,
  h: CELL.h,
  label: hit.title,
  sub: hit.verdict,
  tone: hit.found ? RAG_TONE.text : RAG_TONE.failure,
  fill: hit.found ? "pastel" : "paper",
  highlight: hit.highlight,
  step,
});

const rows: LayoutShape[] = ROWS.flatMap((r, i) => {
  const y = ROW_Y[i];
  const step = i + 1;
  return [
    {
      id: `q${i}`,
      type: "text" as const,
      x: COL.q,
      y: y + 10,
      w: 250,
      h: 40,
      label: r.question,
      tone: RAG_TONE.infra,
      step,
    },
    cell(`b${i}`, COL.bm25, y, r.bm25, step),
    cell(`v${i}`, COL.vec, y, r.vector, step),
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Keyword search and vector search find different questions",
  width: 860,
  height: 380,
  steps: [
    { title: "Shared words and shared meaning: both find it" },
    { title: "Same meaning, other words: only vector search finds it" },
    { title: "An exact code: only BM25 finds it" },
  ],
  shapes: [
    {
      id: "h-q",
      type: "text",
      x: COL.q,
      y: 26,
      w: 250,
      h: 36,
      label: "Question",
      tone: RAG_TONE.infra,
    },
    {
      id: "h-bm25",
      type: "box",
      x: COL.bm25,
      y: 22,
      w: CELL.w,
      h: 44,
      label: "BM25 keyword search",
      sub: "matches words",
      tone: RAG_TONE.keyword,
      fill: "pastel",
    },
    {
      id: "h-vec",
      type: "box",
      x: COL.vec,
      y: 22,
      w: CELL.w,
      h: 44,
      label: "Vector search",
      sub: "matches meaning",
      tone: RAG_TONE.store,
      fill: "pastel",
    },
    ...rows,
    {
      id: "note",
      type: "text",
      x: COL.bm25,
      y: 326,
      w: COL.vec + CELL.w - COL.bm25,
      h: 40,
      label: "Each method misses a question the other finds:\nhybrid search runs both and fuses the lists",
      tone: RAG_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
