import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// The tensor shapes of the worked example, stage by stage, from the bottom up like Figure 1 of "Attention Is All You
// Need" (Vaswani et al., 2017). The decoder input is "<s> Ich liebe" (3 tokens), so every tensor has 3 rows, one per
// position; only the width changes. Shown for one attention sub-layer and one feed-forward sub-layer of a decoder
// layer; the decoder's cross-attention has the same shapes, and the layer repeats 6 times.
//
// Facts checked against arXiv 1706.03762 v7:
// - §3.1, §3.4: d_model = 512 for the embeddings and every sub-layer output.
// - §3.2.2: h = 8 heads, d_k = d_v = d_model / h = 64; the heads are concatenated (8 × 64 = 512) and projected by W^O.
// - §3.3: the feed-forward inner layer has d_ff = 2048.
// - §3.4, §5.1: a linear layer maps each position to vocabulary size (shared BPE vocabulary of about 37,000 tokens),
//   and a softmax turns each row into probabilities that sum to 1.
// - At inference the decoder uses only the last position's distribution to pick the next token.
//
// Widths are to scale at 4 columns per pixel (512 → 128 px, 64 → 16 px, 2048 → 512 px), except the 37,000-wide rows
// (9,250 px at that scale), which are drawn cut. Token ids are illustrative.

const ROW = 14; // one position
const STAGE_H = 3 * ROW;
const XC = 480; // the data path runs up this line
const PX_PER_COL = 1 / 4;
const LABEL_X = 14;
const LABEL_W = 136;

const TOKENS = [
  { word: "<s>", id: 1 },
  { word: "Ich", id: 1734 },
  { word: "liebe", id: 20519 },
];

// Top edge of each stage, bottom to top in reading order.
const Y = {
  ids: 814,
  emb: 718,
  heads: 584,
  concat: 478,
  inner: 382,
  out: 286,
  linear: 160,
  softmax: 64,
};

const shapes: LayoutShape[] = [];

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone = "neutral"
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: tone as LayoutShape["tone"],
});

/** Three touching rows (one per token) of the given width, centred on XC unless x is given. */
function rows(id: string, y: number, width: number, tone: LayoutShape["tone"], x = XC - width / 2, hl = -1) {
  for (let r = 0; r < 3; r++)
    shapes.push({
      id: `${id}-${r}`,
      type: "cell",
      x,
      y: y + r * ROW,
      w: width,
      h: ROW,
      tone,
      fill: r === hl ? undefined : "pastel",
      highlight: r === hl || undefined,
    });
}

/** A stage name in the left column, centred on the stage. */
const stageLabel = (id: string, y: number, label: string) =>
  shapes.push(text(`label-${id}`, LABEL_X, y + STAGE_H / 2 - 17, LABEL_W, 34, label));

/** The data path between two stages: a vertical arrow on XC with the tensor shape as a pill. */
const link = (id: string, fromY: number, toY: number, label: string, head = true) =>
  shapes.push({ id, type: "arrow", x: XC, y: fromY, w: 0, h: toY - fromY, label, head: head ? undefined : false });

// 1. Token ids: one id per position.
const ID_W = 52;
const ID_H = 18; // taller than ROW so the id fits inside
TOKENS.forEach((t, r) => {
  shapes.push(
    {
      id: `ids-${r}`,
      type: "cell",
      x: XC - ID_W / 2,
      y: Y.ids + r * ID_H,
      w: ID_W,
      h: ID_H,
      label: String(t.id),
      tone: "neutral",
      fill: "paper",
    },
    text(`ids-word-${r}`, XC + ID_W / 2 + 8, Y.ids + r * ID_H, 56, ID_H, `"${t.word}"`)
  );
});
shapes.push(text("label-ids", LABEL_X, Y.ids + (3 * ID_H) / 2 - 10, LABEL_W, 20, "Token ids"));

// 2. Embedding + positional encoding: 3 × 512.
rows("emb", Y.emb, 512 * PX_PER_COL, ROLE_TONE.embedding);
stageLabel("emb", Y.emb, "Embedding\n+ position");
link("ids>emb", Y.ids, Y.emb + STAGE_H, "3 token ids");

// 3. Attention: 8 heads, each 3 × 64, side by side with a small gap.
const HEAD_W = 64 * PX_PER_COL;
const HEAD_GAP = 6;
const HEADS_W = 8 * HEAD_W + 7 * HEAD_GAP;
const headX = (h: number) => XC - HEADS_W / 2 + h * (HEAD_W + HEAD_GAP);
for (let h = 0; h < 8; h++) rows(`head${h}`, Y.heads, HEAD_W, ROLE_TONE.attention, headX(h));
stageLabel("heads", Y.heads, "Attention:\n8 heads");
// Split: the 512-wide rows fan out to the 8 heads (a comb below them), and merge again above them.
const SPLIT_Y = Y.heads + STAGE_H + 16;
const MERGE_Y = Y.heads - 16;
/** A bar across the heads with a short line to each head: arrows up into the heads (split) or plain lines (merge). */
const comb = (id: string, barY: number, headEdge: number, into: boolean) => {
  shapes.push({
    id: `${id}-bar`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [headX(0) + HEAD_W / 2, barY],
      [headX(7) + HEAD_W / 2, barY],
    ],
  });
  for (let h = 0; h < 8; h++)
    shapes.push({
      id: `${id}-${h}`,
      type: "arrow",
      x: headX(h) + HEAD_W / 2,
      y: into ? barY : headEdge,
      w: 0,
      h: into ? headEdge - barY : barY - headEdge,
      head: into ? undefined : false,
    });
};
comb("split", SPLIT_Y, Y.heads + STAGE_H, true);
comb("merge", MERGE_Y, Y.heads, false);
link("emb>heads", Y.emb, SPLIT_Y, "3 × 512", false);

// 4. Concatenate the heads and project with W^O: 3 × 512.
rows("concat", Y.concat, 512 * PX_PER_COL, ROLE_TONE.concat);
stageLabel("concat", Y.concat, "Concat heads,\nthen project");
link("heads>concat", MERGE_Y, Y.concat + STAGE_H, "8 × (3 × 64)");

// 5. Feed-forward inner layer: 3 × 2048.
rows("inner", Y.inner, 2048 * PX_PER_COL, ROLE_TONE.ffn);
stageLabel("inner", Y.inner, "Feed-forward\ninner layer");
link("concat>inner", Y.concat, Y.inner + STAGE_H, "3 × 512");

// 6. Feed-forward output: back to 3 × 512.
rows("out", Y.out, 512 * PX_PER_COL, ROLE_TONE.ffn);
stageLabel("out", Y.out, "Feed-forward\noutput");
link("inner>out", Y.inner, Y.out + STAGE_H, "3 × 2048");

// 7 and 8. Linear to the vocabulary, then softmax: 3 × 37,000, drawn cut (a 400 px piece, a gap, a 200 px piece).
const WIDE_X = 160;
const CUT_A = 400;
const CUT_GAP = 40;
const CUT_B = 200;
const wide = (id: string, y: number, tone: LayoutShape["tone"], hl = -1) => {
  rows(`${id}-a`, y, CUT_A, tone, WIDE_X, hl);
  rows(`${id}-b`, y, CUT_B, tone, WIDE_X + CUT_A + CUT_GAP, hl);
  shapes.push(text(`${id}-cut`, WIDE_X + CUT_A, y + STAGE_H / 2 - 10, CUT_GAP, 20, "…"));
};
wide("linear", Y.linear, ROLE_TONE.linear);
stageLabel("linear", Y.linear, "Linear\n(logits)");
link("out>linear", Y.out, Y.linear + STAGE_H, "3 × 512");

wide("softmax", Y.softmax, ROLE_TONE.softmax, 2);
stageLabel("softmax", Y.softmax, "Softmax\n(probabilities)");
link("linear>softmax", Y.linear, Y.softmax + STAGE_H, "3 × 37,000");

shapes.push(
  text(
    "softmax-note",
    WIDE_X,
    14,
    CUT_A + CUT_GAP + CUT_B,
    36,
    'Each row sums to 1. At inference the decoder keeps only the last row, the\nposition after "liebe", and its most likely token is "Tee".',
    ROLE_TONE.softmax
  ),
  text(
    "scale-note",
    600,
    817,
    250,
    48,
    "Widths to scale (1 px = 4 columns),\nexcept the 37,000-wide rows, drawn cut.\nToken ids are illustrative."
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tensor shapes through the Transformer, stage by stage",
  width: 860,
  height: 882,
  groups: [
    {
      id: "g-layer",
      title: "Decoder layer, × 6",
      tone: ROLE_TONE.block,
      x: 156,
      y: 262,
      w: 648,
      h: 656 - 262,
    },
  ],
  shapes,
};

export default spec;
