import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, VECTOR_INDEX, fmt } from "@/components/diagrams/presets/rag";

// Exact search against an ANN index, for one question over Brightpost's 3,600 chunk vectors. Each tile stands for 60
// vectors, so 60 tiles are all 3,600 (and each tile is also one IVF cell: 3,600 / 60 = 60 vectors per cell).
//
// Left, exact (flat) search: the question vector is compared with every vector. 3,600 comparisons × 1,536
// multiply-adds = 5,529,600 multiply-adds; recall is 100% by definition.
// Right, an ANN index (IVF, VECTOR_INDEX in presets/rag.ts): the question is compared with the 60 cell centroids,
// then with the vectors of the 4 nearest cells: 60 + 4 × 60 = 300 comparisons × 1,536 = 460,800 multiply-adds,
// 3,600 / 300 = 12 times less work. The price: a true neighbour in a fifth cell is never looked at.
//
// Tones (three plus neutral): vectors pink (compared tiles pastel, skipped tiles neutral paper), the question
// orange, the missed fifth cell (one outlined tile) and its note red.

const COLS = 10;
const ROWS = 6;
const TILE = { w: 30, h: 22, gap: 4 } as const;
const GRID_W = COLS * TILE.w + (COLS - 1) * TILE.gap; // 336
const GRID_H = ROWS * TILE.h + (ROWS - 1) * TILE.gap; // 152
const LEFT = 40;
const RIGHT = 480;
const GRID_Y = 130;

const perTile = CORPUS.chunks / (COLS * ROWS); // 60
const perCell = CORPUS.chunks / VECTOR_INDEX.ivfCells; // 60
const annCompared = VECTOR_INDEX.ivfCells + VECTOR_INDEX.ivfCompared; // 60 + 240 = 300
const exactOps = CORPUS.chunks * CORPUS.dims; // 5,529,600
const annOps = annCompared * CORPUS.dims; // 460,800
const speedup = CORPUS.chunks / annCompared; // 12

/** The tiles the ANN index scans: the question's 4 nearest cells (a 2 × 2 block). */
const PROBED = new Set(["2-6", "2-7", "3-6", "3-7"]);
/** A fifth cell next to them that holds one of the true nearest neighbours: the ANN index never opens it. */
const MISSED = "3-5";

function grid(id: string, x: number, step: number, probed?: Set<string>): LayoutShape[] {
  const out: LayoutShape[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const hit = !probed || probed.has(`${r}-${c}`);
      const missed = probed && `${r}-${c}` === MISSED;
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * (TILE.w + TILE.gap),
        y: GRID_Y + r * (TILE.h + TILE.gap),
        w: TILE.w,
        h: TILE.h,
        tone: hit ? RAG_TONE.embedding : missed ? RAG_TONE.failure : RAG_TONE.infra,
        fill: hit ? "pastel" : "paper",
        step,
      });
    }
  }
  return out;
}

const question = (id: string, x: number, step: number): LayoutShape[] => [
  {
    id,
    type: "box",
    x: x + GRID_W / 2 - 90,
    y: 50,
    w: 180,
    h: 34,
    label: "question vector",
    tone: RAG_TONE.query,
    fill: "pastel",
    step,
  },
  {
    id: `${id}-arrow`,
    type: "arrow",
    x: x + GRID_W / 2,
    y: 86,
    w: 0,
    h: 26,
    step,
  },
];

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = RAG_TONE.infra
) => ({ id, type: "text", x, y, w, h: 20, label, tone, step }) satisfies LayoutShape;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Exact search compares every vector; an ANN index compares a few hundred",
  width: 860,
  height: 440,
  steps: [
    { title: `Exact search compares the question with all ${fmt(CORPUS.chunks)} vectors` },
    { title: `An ANN index compares it with ${annCompared}` },
  ],
  groups: [
    {
      id: "g-exact",
      title: `${fmt(CORPUS.chunks)} vectors`,
      tone: RAG_TONE.infra,
      x: LEFT - 14,
      y: GRID_Y - 18,
      w: GRID_W + 28,
      h: GRID_H + 32,
    },
    {
      id: "g-ann",
      title: `${VECTOR_INDEX.ivfCells} cells`,
      tone: RAG_TONE.infra,
      x: RIGHT - 14,
      y: GRID_Y - 18,
      w: GRID_W + 28,
      h: GRID_H + 32,
    },
  ],
  shapes: [
    text("t-exact", LEFT, 16, GRID_W, "Exact (flat) search", 1),
    text("t-ann", RIGHT, 16, GRID_W, "ANN index (IVF)", 2),
    ...question("q-exact", LEFT, 1),
    ...question("q-ann", RIGHT, 2),
    ...grid("ex", LEFT, 1),
    ...grid("an", RIGHT, 2, PROBED),
    {
      id: "sum-exact",
      type: "box",
      x: LEFT,
      y: 312,
      w: GRID_W,
      h: 50,
      label: `${fmt(CORPUS.chunks)} comparisons\n× ${fmt(CORPUS.dims)} = ${fmt(exactOps)} multiply-adds`,
      tone: RAG_TONE.embedding,
      fill: "soft",
      step: 1,
    },
    {
      id: "sum-ann",
      type: "box",
      x: RIGHT,
      y: 312,
      w: GRID_W,
      h: 50,
      label: `${VECTOR_INDEX.ivfCells} centroids + ${VECTOR_INDEX.ivfProbe} cells × ${perCell} = ${annCompared}\n× ${fmt(CORPUS.dims)} = ${fmt(annOps)} multiply-adds`,
      tone: RAG_TONE.embedding,
      fill: "soft",
      step: 2,
    },
    text("note-exact", LEFT, 374, GRID_W, "Recall 100%; work grows with every vector added", 1),
    text("note-ann", RIGHT, 374, GRID_W, `${speedup}× less work; vectors in the other cells are skipped`, 2),
    text("miss", RIGHT, 400, GRID_W, "A true neighbour in a 5th cell is missed", 2, RAG_TONE.failure),
    text("key", LEFT, 400, GRID_W, `One tile = ${perTile} vectors`, 1),
  ],
};

export default spec;
