import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, fmt, funnel } from "@/components/diagrams/presets/rag";

// The search ranking funnel (ml-system-design/case-studies/search-ranking-system): a shopper's query and a product
// catalog meet in candidate retrieval, and each later stage scores fewer items with a more expensive model. This is
// classic e-commerce search, not the Brightpost RAG example, so the numbers are local to this figure.
//
// Stage counts: ~1,000 fused candidates, top ~100 after learning to rank, top ~20 after the cross-encoder, as on the
// page (its old Mermaid funnel). Illustrative, labelled as such in the figure: a catalog of 10,000,000 products and
// a first page of 10 results (the page evaluates nDCG at 10).
// Working: 10,000,000 / 1,000 = 10,000, so retrieval lets the ranker score 1 product in 10,000; each later stage
// keeps 1 in 10 (1,000 → 100), 1 in 5 (100 → 20) and 1 in 2 (20 → 10).
//
// Widths: funnel() is linear in `count`; we pass log10 of the candidate count (3, 2, 1.3, 1) so the drop from 1,000
// to 10 stays visible (linear widths would draw 100, 20 and 10 at the same minimum width). The sub line carries the
// real count.
//
// Layout (880 wide): the query and the catalog side by side on top, both feeding retrieval; the funnel below centred
// on x 300; one note per stage on the right; in the last step a dashed loop on the left from the results back to the
// learning-to-rank model (logged clicks and purchases become training labels).
// Tones (four plus neutral, RAG legend roles): the query orange, the catalog blue (documents), retrieval violet (the
// indexes), the ranking models lime; business rules neutral. One highlight: the learning-to-rank stage.

/** Illustrative sizes (not from a source). */
const CATALOG = 10_000_000;
const PAGE = 10;
/** Candidate counts after each stage, from the page. */
const KEEP = { retrieve: 1_000, ltr: 100, rerank: 20 } as const;

const CX = 300;
const STAGE = { y: 132, h: 48, gap: 26 } as const;
const stageY = (i: number) => STAGE.y + i * (STAGE.h + STAGE.gap);

const note = (i: number, label: string, step: number): LayoutShape => ({
  id: `note-${i}`,
  type: "text",
  x: 590,
  y: stageY(i) + 4,
  w: 270,
  h: 40,
  label,
  tone: RAG_TONE.infra,
  step,
});

const stages = funnel(
  "f",
  CX,
  STAGE.y,
  [
    {
      label: "Retrieve: BM25 + dense, fused",
      count: Math.log10(KEEP.retrieve),
      sub: `≈ ${fmt(KEEP.retrieve)} candidates`,
      tone: RAG_TONE.store,
      step: 2,
    },
    {
      label: "Learning to rank",
      count: Math.log10(KEEP.ltr),
      sub: `top ≈ ${KEEP.ltr}`,
      tone: RAG_TONE.rank,
      step: 3,
    },
    {
      label: "Cross-encoder",
      count: Math.log10(KEEP.rerank),
      sub: `top ≈ ${KEEP.rerank}`,
      tone: RAG_TONE.rank,
      step: 4,
    },
    {
      label: "Business rules",
      count: Math.log10(PAGE),
      sub: `first page: ${PAGE}`,
      tone: RAG_TONE.infra,
      step: 5,
    },
  ],
  { maxW: 520, minW: 200, h: STAGE.h, gap: STAGE.gap }
).map((s) => (s.id === "f-1" ? { ...s, highlight: true } : s));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Search ranking: retrieve wide and cheap, rank narrow and precise",
  width: 880,
  height: 470,
  steps: [
    { title: `A query meets a catalog of ${fmt(CATALOG)} products` },
    { title: `Retrieval keeps about ${fmt(KEEP.retrieve)}` },
    { title: `Learning to rank keeps about ${KEEP.ltr}` },
    { title: `A cross-encoder keeps about ${KEEP.rerank}` },
    { title: `Business rules fill a page of ${PAGE}` },
    { title: "Clicks and purchases retrain the ranker" },
  ],
  shapes: [
    {
      id: "query",
      type: "box",
      x: 40,
      y: 24,
      w: 250,
      h: 56,
      label: "“comfy running shoes\nfor flat feet”",
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 1,
    },
    {
      id: "catalog",
      type: "box",
      x: 330,
      y: 24,
      w: 230,
      h: 56,
      label: "Catalog",
      sub: `${fmt(CATALOG)} products`,
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 1,
    },
    {
      id: "note-q",
      type: "text",
      x: 590,
      y: 32,
      w: 270,
      h: 40,
      label: "Query understanding first: spelling,\nsynonyms, category, attributes",
      tone: RAG_TONE.infra,
      step: 1,
    },
    { id: "q-arrow", type: "arrow", x: 0, y: 0, from: "query", to: "f-0", step: 2 },
    { id: "c-arrow", type: "arrow", x: 0, y: 0, from: "catalog", to: "f-0", step: 2 },
    ...stages,
    note(0, "BM25 matches exact terms; two-tower\nembeddings + ANN match meaning", 2),
    note(1, "GBDT or neural model over many\nfeatures: match, price, popularity", 3),
    note(2, "Reads query and product together:\nprecise, too slow for more than a few", 4),
    note(3, "Diversity, stock, ads and\nde-duplication, then render", 5),
    {
      id: "loop",
      type: "arrow",
      x: 0,
      y: 0,
      from: "f-3",
      to: "f-1",
      via: [
        [100, stageY(3) + STAGE.h / 2],
        [100, stageY(1) + STAGE.h / 2],
      ],
      dashed: true,
      step: 6,
    },
    {
      id: "loop-label",
      type: "text",
      x: 6,
      y: stageY(2) - 6,
      w: 88,
      h: 60,
      label: "clicks and\npurchases\nretrain it",
      tone: RAG_TONE.infra,
      step: 6,
    },
    {
      id: "footer",
      type: "text",
      x: 30,
      y: stageY(4) + 4,
      w: 820,
      h: 20,
      label: "Widths on a log scale. Catalog and page sizes are illustrative.",
      tone: RAG_TONE.infra,
      step: 5,
    },
  ],
};

export default spec;
