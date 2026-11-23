import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Pointwise, pairwise and listwise learning to rank (ml-system-design/case-studies/search-ranking-system) on one tiny
// example: the query "running shoes for flat feet" and three products with human relevance labels (2 = best) and a
// model's scores. Labels and scores are illustrative. The model puts B above A, which is the mistake each loss sees
// differently.
//
//   A Stability running shoe   label 2   score 1.2
//   B Neutral running shoe     label 1   score 1.5
//   C Running socks            label 0   score 0.3
//
// Working (computed below, rounded for drawing):
// - Pointwise, squared error per item: A (2 - 1.2)² = 0.64, B (1 - 1.5)² = 0.25, C (0 - 0.3)² = 0.09; mean 0.33.
//   Each item is fitted on its own; nothing says A and B are in the wrong order.
// - Pairwise: A above B? 1.2 < 1.5, wrong. A above C? right. B above C? right. 1 of 3 pairs out of order.
// - Listwise, nDCG@3 with gain (2^label - 1) / log2(rank + 1): the model's order B, A, C gives
//   1 / 1 + 3 / 1.585 + 0 = 2.89; the ideal order A, B, C gives 3 / 1 + 1 / 1.585 + 0 = 3.63; nDCG = 0.80.
//   Swapping A and B is worth 1 - 0.80 = 0.20 of nDCG; LambdaRank and LambdaMART weight each pair's gradient by this
//   change (Burges, 2010).
//
// Layout (880 wide): the example on top, three panels below, one per step. Tones (three plus neutral): the query
// orange, products blue, losses and gains lime. One highlight: the out-of-order pair.

type Item = { id: "A" | "B" | "C"; name: string; label: number; score: number };
const ITEMS: Item[] = [
  { id: "A", name: "Stability running shoe", label: 2, score: 1.2 },
  { id: "B", name: "Neutral running shoe", label: 1, score: 1.5 },
  { id: "C", name: "Running socks", label: 0, score: 0.3 },
];
const by = (id: Item["id"]) => ITEMS.find((i) => i.id === id)!;

const sqErr = (i: Item) => (i.label - i.score) ** 2;
const meanSqErr = ITEMS.reduce((s, i) => s + sqErr(i), 0) / ITEMS.length; // 0.33

const PAIRS: [Item["id"], Item["id"]][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "C"],
];
const pairRight = ([hi, lo]: [Item["id"], Item["id"]]) => by(hi).score > by(lo).score;
const wrongPairs = PAIRS.filter((p) => !pairRight(p)).length; // 1

const gain = (label: number, rank: number) => (2 ** label - 1) / Math.log2(rank + 1);
const modelOrder = [...ITEMS].sort((a, b) => b.score - a.score); // B, A, C
const idealOrder = [...ITEMS].sort((a, b) => b.label - a.label); // A, B, C
const dcg = modelOrder.reduce((s, it, i) => s + gain(it.label, i + 1), 0); // 2.89
const idcg = idealOrder.reduce((s, it, i) => s + gain(it.label, i + 1), 0); // 3.63
const ndcg = dcg / idcg; // 0.80

const f2 = (n: number) => n.toFixed(2);

const PANEL = { y: 160, h: 236, w: 280 } as const;
const PANEL_X = [10, 300, 590] as const;
const ROW = { y: PANEL.y + 38, h: 34, gap: 10 } as const;
const rowY = (i: number) => ROW.y + i * (ROW.h + ROW.gap);

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = RAG_TONE.infra,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "cell", x, y, w, h: ROW.h, label, tone, step, ...extra });

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: RAG_TONE.infra,
  step,
});

const footY = rowY(3) + 4;

// Pointwise: one row per item, its label, score and squared error.
const pointwise: LayoutShape[] = ITEMS.flatMap((it, i) => {
  const x = PANEL_X[0] + 22;
  return [
    cell(`pw-${it.id}`, x - 4, rowY(i), 30, it.id, 1, RAG_TONE.text),
    cell(`pw-${it.id}-l`, x + 32, rowY(i), 66, `label ${it.label}`, 1),
    cell(`pw-${it.id}-s`, x + 104, rowY(i), 76, `score ${it.score}`, 1),
    cell(`pw-${it.id}-e`, x + 186, rowY(i), 54, f2(sqErr(it)), 1, RAG_TONE.rank),
  ];
});

// Pairwise: one row per pair, the two scores and whether the order is right.
const pairwise: LayoutShape[] = PAIRS.flatMap(([hi, lo], i) => {
  const x = PANEL_X[1] + 20;
  const right = pairRight([hi, lo]);
  return [
    cell(`pp-${hi}${lo}`, x, rowY(i), 88, `${hi} above ${lo}?`, 2, RAG_TONE.text),
    cell(`pp-${hi}${lo}-s`, x + 94, rowY(i), 80, `${by(hi).score} ${right ? ">" : "<"} ${by(lo).score}`, 2),
    cell(`pp-${hi}${lo}-r`, x + 180, rowY(i), 60, right ? "right" : "wrong", 2, RAG_TONE.rank, {
      highlight: right ? undefined : true,
    }),
  ];
});

// Listwise: the model's ranked list, each row's gain, and nDCG for the whole list.
const listwise: LayoutShape[] = modelOrder.flatMap((it, i) => {
  const x = PANEL_X[2] + 22;
  return [
    cell(`lw-r${i + 1}`, x, rowY(i), 34, String(i + 1), 3),
    cell(`lw-${it.id}`, x + 40, rowY(i), 134, `${it.id}, label ${it.label}`, 3, RAG_TONE.text),
    cell(`lw-${it.id}-g`, x + 180, rowY(i), 56, f2(gain(it.label, i + 1)), 3, RAG_TONE.rank),
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Pointwise, pairwise and listwise losses on one query",
  width: 880,
  height: 410,
  steps: [
    { title: "Pointwise: fit each item's label on its own" },
    { title: "Pairwise: check the order of every pair" },
    { title: "Listwise: score the whole ranked list" },
  ],
  groups: [
    { id: "g-ex", title: "One query, three products", tone: RAG_TONE.infra, x: 10, y: 24, w: 860, h: 116 },
    { id: "g-pw", title: "Pointwise", tone: RAG_TONE.infra, x: PANEL_X[0], y: PANEL.y, w: PANEL.w, h: PANEL.h },
    { id: "g-pp", title: "Pairwise", tone: RAG_TONE.infra, x: PANEL_X[1], y: PANEL.y, w: PANEL.w, h: PANEL.h },
    { id: "g-lw", title: "Listwise", tone: RAG_TONE.infra, x: PANEL_X[2], y: PANEL.y, w: PANEL.w, h: PANEL.h },
  ],
  shapes: [
    // The example, shown in every step.
    {
      id: "query",
      type: "text",
      x: 30,
      y: 50,
      w: 820,
      h: 20,
      label: "Query “running shoes for flat feet”. Label: human relevance, 2 = best. Score: the model's guess.",
      tone: RAG_TONE.query,
      step: 1,
    },
    ...ITEMS.map((it, i): LayoutShape => ({
      id: `item-${it.id}`,
      type: "box",
      x: 40 + i * 275,
      y: 76,
      w: 250,
      h: 48,
      label: `${it.id}  ${it.name}`,
      sub: `label ${it.label} · score ${it.score}`,
      tone: RAG_TONE.text,
      fill: it.label > 0 ? "pastel" : "paper",
      step: 1,
    })),

    ...pointwise,
    text(
      "pw-foot",
      PANEL_X[0] + 10,
      footY,
      PANEL.w - 20,
      60,
      `mean error² = ${f2(meanSqErr)}\nEach item is fitted alone; the\nloss never checks the order`,
      1
    ),

    ...pairwise,
    text(
      "pp-foot",
      PANEL_X[1] + 10,
      footY,
      PANEL.w - 20,
      60,
      `${wrongPairs} of ${PAIRS.length} pairs out of order:\nthe loss pushes A up\nand B down`,
      2
    ),

    ...listwise,
    text(
      "lw-foot",
      PANEL_X[2] + 10,
      footY,
      PANEL.w - 20,
      60,
      `nDCG@3 = ${f2(dcg)} ÷ ${f2(idcg)} = ${f2(ndcg)}\nSwapping A and B adds ${f2(1 - ndcg)};\nLambdaMART weights pairs by that`,
      3
    ),
  ],
};

export default spec;
