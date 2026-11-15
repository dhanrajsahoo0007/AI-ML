import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// BERT's input representation for a sentence pair, laid out like Figure 2 of Devlin et al. (2018): each input token
// gets three learned embeddings, one per row, and the three are summed (⊕) to give the input of the first encoder
// layer. Our own example pair, "my tea is scalding" / "let it cool", with "scalding" split into the WordPiece
// pieces "scald" and "##ing" (illustrative; the real vocabulary may split it differently).
//
// Facts checked against arXiv 1810.04805 v2, §3 "Input/Output Representations" and Figure 2:
// - "We use WordPiece embeddings with a 30,000 token vocabulary." Pieces that continue a word start with "##".
// - "The first token of every sequence is always a special classification token ([CLS])"; its final hidden state is
//   the sequence representation for classification.
// - Sentence pairs are packed into one sequence, separated by [SEP]; a learned embedding marks every token as
//   belonging to sentence A or sentence B. In Figure 2, [CLS], sentence A and the first [SEP] get E_A; sentence B
//   and the final [SEP] get E_B.
// - "For a given token, its input representation is constructed by summing the corresponding token, segment, and
//   position embeddings."
// - Position embeddings are learned: §A.2 trains 90% of steps at length 128, "then … 512 to learn the positional
//   embeddings" (so up to 512 positions; Figure 2 labels them E_0 … E_10), unlike the fixed sinusoids of Vaswani et
//   al. (2017, §3.5).
// - Each embedding is a vector of H values: H = 768 for BERT-Base, 1024 for BERT-Large (§3).

const SENT_A = ["[CLS]", "my", "tea", "is", "scald", "##ing", "[SEP]"];
const SENT_B = ["let", "it", "cool", "[SEP]"];
const TOKENS = [...SENT_A, ...SENT_B];
const N = TOKENS.length; // 11, positions 0–10

const SEG_TONE: Record<"A" | "B", LayoutTone> = { A: "teal", B: "violet" };
const segOf = (i: number): "A" | "B" => (i < SENT_A.length ? "A" : "B");

// ── Layout ───────────────────────────────────────────────────────────────────────────────────────────────────

const X0 = 148; // left edge of column 0
const PITCH = 66;
const CW = 58; // cell width
const colX = (i: number) => X0 + i * PITCH;
const colMid = (i: number) => colX(i) + CW / 2;

const BRACKET_Y = 44;
const INPUT_Y = 58;
const INPUT_H = 30;
const ROW_H = 40;
const TOKEN_Y = 112;
const SEG_Y = 188;
const POS_Y = 264;
/** Centre of the ⊕ between two rows. */
const plusY = (upperY: number) => upperY + ROW_H + (SEG_Y - TOKEN_Y - ROW_H) / 2;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const shapes: LayoutShape[] = [];

// Row labels.
shapes.push(
  text("l-input", 16, INPUT_Y, 120, "Input", "neutral", INPUT_H),
  text("l-token", 16, TOKEN_Y, 120, "Token\nembeddings", "neutral", ROW_H),
  text("l-seg", 16, SEG_Y, 120, "Segment\nembeddings", "neutral", ROW_H),
  text("l-pos", 16, POS_Y, 120, "Position\nembeddings", "neutral", ROW_H)
);

// Sentence A and sentence B, bracketed over their tokens in the segment tones.
const bracket = (id: string, from: number, to: number, label: string, tone: LayoutTone): LayoutShape[] => {
  const x1 = colX(from) + 2;
  const x2 = colX(to) + CW - 2;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, BRACKET_Y + 6],
        [x1, BRACKET_Y],
        [x2, BRACKET_Y],
        [x2, BRACKET_Y + 6],
      ],
      tone,
    },
    text(`${id}-label`, x1, BRACKET_Y - 26, x2 - x1, label, tone),
  ];
};
shapes.push(
  ...bracket("sent-a", 0, SENT_A.length - 1, "Sentence A", SEG_TONE.A),
  ...bracket("sent-b", SENT_A.length, N - 1, "Sentence B", SEG_TONE.B)
);

TOKENS.forEach((t, i) => {
  const seg = segOf(i);
  shapes.push(
    { id: `in-${i}`, type: "box", x: colX(i), y: INPUT_Y, w: CW, h: INPUT_H, label: t, tone: "neutral" },
    { id: `in-${i}>tok`, type: "arrow", x: 0, y: 0, from: `in-${i}`, to: `tok-${i}` },
    {
      id: `tok-${i}`,
      type: "cell",
      x: colX(i),
      y: TOKEN_Y,
      w: CW,
      h: ROW_H,
      label: "E",
      sub: t,
      tone: ROLE_TONE.embedding,
      fill: "pastel",
    },
    {
      id: `plus1-${i}`,
      type: "circle",
      x: colMid(i),
      y: plusY(TOKEN_Y),
      w: 20,
      symbol: "plus",
      label: "plus",
      tone: "neutral",
    },
    {
      id: `seg-${i}`,
      type: "cell",
      x: colX(i),
      y: SEG_Y,
      w: CW,
      h: ROW_H,
      label: "E",
      sub: seg,
      tone: SEG_TONE[seg],
      fill: "pastel",
    },
    {
      id: `plus2-${i}`,
      type: "circle",
      x: colMid(i),
      y: plusY(SEG_Y),
      w: 20,
      symbol: "plus",
      label: "plus",
      tone: "neutral",
    },
    {
      id: `pos-${i}`,
      type: "cell",
      x: colX(i),
      y: POS_Y,
      w: CW,
      h: ROW_H,
      label: "E",
      sub: String(i),
      tone: ROLE_TONE.position,
      fill: "pastel",
    }
  );
});

shapes.push(
  text(
    "note",
    16,
    324,
    848,
    "Each E is a learned vector of H values (768 in BERT-Base); each column's sum is that token's input to layer 1.\nToken: one row per WordPiece token of a 30,000-token vocabulary. Segment: one row for sentence A, one for B.\nPosition: learned, one row per position up to 512, where the 2017 Transformer used fixed sinusoids.",
    "neutral",
    52
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "BERT input: token + segment + position embeddings",
  width: 880,
  height: 392,
  shapes,
};

export default spec;
