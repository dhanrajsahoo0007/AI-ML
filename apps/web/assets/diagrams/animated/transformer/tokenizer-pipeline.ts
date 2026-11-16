import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block, vector } from "@/components/diagrams/presets/transformer";

// The tokenizer pipeline at inference, one example string followed through every stage (top to bottom):
//   raw text "Tokenizers don't split evenly…"
//   → normalize: NFKC turns the one-character ellipsis U+2026 into three full stops "..." (checked with Python's
//     unicodedata.normalize("NFKC", "…") == "...")
//   → pre-tokenize, GPT-2 style: a space stays attached to the word after it, and the contraction "'t" splits off
//     → Tokenizers | ▁don | 't | ▁split | ▁evenly | ...
//   → BPE merges (illustrative split): Token izers | ▁don | 't | ▁split | ▁even ly | ...
//   → token ids (illustrative numbers, not from a real vocabulary)
//   → special tokens: <bos> (illustrative id 1) at the start; chat models also add role markers from the template
//   → embedding lookup: each id selects one row of the embedding table (pink, as in the Transformer legend).
// "▁" marks a space, the way SentencePiece shows it (GPT-2's byte-level BPE writes it as "Ġ").
//
// Consistency by construction: the pre-tokenized chunks are the pieces joined per chunk, and the normalized text is
// all pieces joined with "▁" turned back into a space, so the rows always agree.
//
// Embedding values are illustrative: value d of the row for id t is 0.5 + 0.42 · sin(0.37 · t + 1.9 · d), used only
// as a 0–1 shade.

const PIECES: { text: string; id: number; chunk: number }[] = [
  { text: "Token", id: 3963, chunk: 0 },
  { text: "izers", id: 12509, chunk: 0 },
  { text: "▁don", id: 1541, chunk: 1 },
  { text: "'t", id: 470, chunk: 2 },
  { text: "▁split", id: 6626, chunk: 3 },
  { text: "▁even", id: 1556, chunk: 4 },
  { text: "ly", id: 306, chunk: 4 },
  { text: "...", id: 986, chunk: 5 },
];
const BOS = { text: "<bos>", id: 1 };
const SEQUENCE = [BOS, ...PIECES]; // what the model receives: 9 ids

const CHUNKS = [...new Set(PIECES.map((p) => p.chunk))].map((c) => {
  const cols = PIECES.flatMap((p, i) => (p.chunk === c ? [i + 1] : []));
  return {
    text: PIECES.filter((p) => p.chunk === c)
      .map((p) => p.text)
      .join(""),
    first: cols[0],
    last: cols.at(-1)!,
  };
});
const NORMALIZED = PIECES.map((p) => p.text)
  .join("")
  .replace(/▁/g, " ");
const RAW = NORMALIZED.replace(/\.\.\.$/, "…");

const EMB_SHOWN = 6;
const embRow = (id: number) =>
  Array.from({ length: EMB_SHOWN }, (_, d) => Math.round((0.5 + 0.42 * Math.sin(0.37 * id + 1.9 * d)) * 100) / 100);

// ── Layout ───────────────────────────────────────────────────────────────────────────────────────────────────

const PIECE_TONE: LayoutTone = "violet"; // sub-word pieces, as in the BPE training figure
const SPECIAL_TONE: LayoutTone = "teal";

// The stage column sits right of the group title tabs, so its arrows do not cross them.
const STAGE_X = 84;
const STAGE_W = 150;
const STAGE_H = 44;
const COL0 = 256; // column 0 holds <bos>; pieces sit in columns 1–8
const COL_W = 58;
const COL_GAP = 6;
const colX = (i: number) => COL0 + i * (COL_W + COL_GAP);
const spanW = (first: number, last: number) => colX(last) + COL_W - colX(first);

// Row tops; extra space before the tokenizer group and before the embedding row leaves room for the group tabs.
const ROW = [34, 128, 192, 256, 320, 384, 486];
const CELL_H = 32;
const cellY = (r: number) => ROW[r] + (STAGE_H - CELL_H) / 2;

const text = (id: string, x: number, y: number, w: number, label: string, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
});

const shapes: LayoutShape[] = [];

// The stages, top to bottom, joined by arrows.
const stages: LayoutShape[] = [
  { ...block("s-raw", "block", STAGE_X, ROW[0], { w: STAGE_W, label: "Raw text" }), fill: "paper" },
  block("s-norm", "block", STAGE_X, ROW[1], { w: STAGE_W, label: "Normalize", sub: "Unicode, whitespace" }),
  block("s-pre", "block", STAGE_X, ROW[2], { w: STAGE_W, label: "Pre-tokenize", sub: "word chunks" }),
  {
    ...block("s-model", "block", STAGE_X, ROW[3], { w: STAGE_W, label: "Tokenizer model", sub: "BPE merges" }),
    tone: PIECE_TONE,
  },
  block("s-ids", "block", STAGE_X, ROW[4], { w: STAGE_W, label: "Token ids", sub: "vocabulary lookup" }),
  {
    ...block("s-special", "block", STAGE_X, ROW[5], { w: STAGE_W, label: "Special tokens", sub: "and chat template" }),
    tone: SPECIAL_TONE,
  },
  block("s-emb", "embedding", STAGE_X, ROW[6] + 20, { w: STAGE_W, label: "Embedding lookup", sub: "one row per id" }),
];
shapes.push(...stages);
stages
  .slice(1)
  .forEach((s, i) =>
    shapes.push({ id: `${stages[i].id}>${s.id}`, type: "arrow", x: 0, y: 0, from: stages[i].id, to: s.id })
  );

// Raw and normalized text: one box across the piece columns.
shapes.push(
  {
    id: "raw",
    type: "box",
    x: colX(1),
    y: ROW[0],
    w: spanW(1, 8),
    h: STAGE_H,
    label: `"${RAW}"`,
    sub: "as typed: the ending … is one character",
    tone: "neutral",
  },
  {
    id: "norm",
    type: "box",
    x: colX(1),
    y: ROW[1],
    w: spanW(1, 8),
    h: STAGE_H,
    label: `"${NORMALIZED}"`,
    sub: "NFKC turns … into three full stops ...",
    tone: "neutral",
  }
);

// Pre-tokenized chunks, each spanning the columns of its pieces.
CHUNKS.forEach((c, k) =>
  shapes.push({
    id: `chunk-${k}`,
    type: "cell",
    x: colX(c.first),
    y: cellY(2),
    w: spanW(c.first, c.last),
    h: CELL_H,
    label: c.text,
    tone: "neutral",
    fill: "soft",
  })
);

// Pieces, ids, then the full sequence with <bos>.
PIECES.forEach((p, i) => {
  const col = i + 1;
  shapes.push(
    {
      id: `piece-${i}`,
      type: "cell",
      x: colX(col),
      y: cellY(3),
      w: COL_W,
      h: CELL_H,
      label: p.text,
      tone: PIECE_TONE,
      fill: "pastel",
    },
    {
      id: `id-${i}`,
      type: "cell",
      x: colX(col),
      y: cellY(4),
      w: COL_W,
      h: CELL_H,
      label: String(p.id),
      tone: "neutral",
      fill: "paper",
    }
  );
});
SEQUENCE.forEach((t, i) => {
  const special = i === 0;
  shapes.push({
    id: `seq-${i}`,
    type: "cell",
    x: colX(i),
    y: ROW[5],
    w: COL_W,
    h: STAGE_H,
    label: String(t.id),
    sub: t.text,
    tone: special ? SPECIAL_TONE : "neutral",
    fill: special ? "pastel" : "paper",
  });
  // One embedding row per id, drawn upright under its column.
  shapes.push(
    ...vector(`emb-${i}`, colX(i) + (COL_W - 14) / 2, ROW[6], EMB_SHOWN, ROLE_TONE.embedding, {
      vertical: true,
      values: embRow(t.id),
    }),
    {
      id: `seq-${i}>emb`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `seq-${i}`,
      to: `emb-${i}-0`,
    }
  );
});

shapes.push(
  text(
    "note",
    20,
    ROW[6] + EMB_SHOWN * 14 + 22,
    840,
    "Decoding reverses the process: ids → pieces → text, with each ▁ turned back into a space.\n▁ marks a space that starts the next piece. The split is illustrative; the ids and vector values are made up.",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "From raw text to embeddings: the tokenizer pipeline",
  width: 872,
  height: ROW[6] + EMB_SHOWN * 14 + 70,
  groups: [
    {
      id: "g-tokenizer",
      title: "Tokenizer",
      tone: "neutral",
      x: 16,
      y: ROW[1] - 18,
      w: 840,
      h: ROW[5] + STAGE_H + 14 - (ROW[1] - 18),
    },
    {
      id: "g-llm",
      title: "In the LLM",
      tone: ROLE_TONE.embedding,
      x: 16,
      y: ROW[6] - 18,
      w: 840,
      h: EMB_SHOWN * 14 + 30,
    },
  ],
  shapes,
};

export default spec;
