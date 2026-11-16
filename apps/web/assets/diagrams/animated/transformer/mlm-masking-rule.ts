import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import { BUDGET, PAIR } from "@/components/diagrams/presets/llm-families";

// BERT's 80 / 10 / 10 rule on one chosen position of the page's running example (sentence B of
// `bert-pretrain-finetune`, "she poured the tea", with "tea" chosen), and the counts the rule gives per 1,000 training
// tokens. One static layout, no steps.
//
// Left panel: the three things that can happen to a chosen token, one row each, every row with the same target
// ("tea"): [MASK] (80 %), a random token (10 %; "apple", the paper's own §A.1 example of a random word) and the token
// left unchanged (10 %). A fourth row, under a dashed line, is a fine-tuning input from the same figure
// ("[CLS] tea was great"): it never contains [MASK], which is why the rule exists. The [MASK] cell carries the one
// highlight. "same" is the paper's own name for the unchanged case (Table 8: MASK, SAME, RND).
// Right panel: per 1,000 tokens (presets/llm-families.ts has the working): 1,000 × 0.15 = 150 chosen; 150 × 0.8 = 120
// [MASK], 150 × 0.1 = 15 random, 15 unchanged; 1,000 − 150 = 850 give no loss; a causal LM has 1,000 targets.
//
// Facts checked against arXiv 1810.04805 v2:
// - §3.1 Task #1: "The training data generator chooses 15% of the token positions at random for prediction"; the
//   chosen token becomes [MASK] 80 %, a random token 10 %, unchanged 10 %; "Ti will be used to predict the original
//   token with cross entropy loss"; the reason: "the [MASK] token does not appear during fine-tuning".
// - §A.1: the encoder "does not know which words it will be asked to predict or which have been replaced by random
//   words, so it is forced to keep a distributional contextual representation of every input token"; random
//   replacement is 1.5 % of all tokens; the unchanged 10 % biases "the representation towards the actual observed
//   word".
// - §C.1: MLM predicts "only 15% of words … in each batch rather than every word".
//
// Geometry: left group x 16–628, right group x 644–864, both y 36–300. Label column x 24–100; token cells 60 wide at
// x 112 + 66·i; target cell x 410–480; note column x 498–622 (20 characters at 6.2 px). Rows at y 96, 146, 196 and,
// under a dashed line at y 238, the fine-tuning row at y 254. Right panel cells x 656–852.

const B_START = PAIR.findIndex((p) => p.t === "[SEP]") + 1; // first token of sentence B
const SENT_B = PAIR.slice(B_START, -1).map((p) => p.t); // she poured the tea
const CHOSEN = SENT_B.length - 1; // "tea"
const TARGET = SENT_B[CHOSEN];

const LABEL_X = 24;
const LABEL_W = 76;
const TOK_X = 112;
const PITCH = 66;
const TOK_W = 60;
const TOK_H = 32;
const TGT_X = 410;
const TGT_W = 70;
const NOTE_X = 498;
const NOTE_W = 124;
const ROWS_Y = [96, 146, 196];
const RULE_Y = 238;
const FT_Y = 254;
const RX = 656;
const RW = 196;

const tokX = (i: number) => TOK_X + i * PITCH;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

interface Treatment {
  id: string;
  pct: string;
  shown: string;
  fill: "pastel" | "soft";
  note: string;
}

const TREATMENTS: Treatment[] = [
  { id: "mask", pct: "80 %", shown: "[MASK]", fill: "pastel", note: "sees a blank" },
  { id: "random", pct: "10 %", shown: "apple", fill: "soft", note: "sees a wrong word" },
  { id: "same", pct: "10 %", shown: TARGET, fill: "soft", note: "sees the real word" },
];

const shapes: LayoutShape[] = [
  text("h-input", tokX(0), 64, tokX(SENT_B.length - 1) + TOK_W - tokX(0), "input (sentence B)"),
  text("h-target", TGT_X - 10, 64, TGT_W + 20, "target"),
  text("h-note", NOTE_X, 64, NOTE_W, "the model …"),
];

TREATMENTS.forEach((tr, r) => {
  const y = ROWS_Y[r];
  shapes.push(text(`${tr.id}-pct`, LABEL_X, y, LABEL_W, tr.pct, ROLE_TONE.mask, TOK_H));
  SENT_B.forEach((t, i) => {
    const chosen = i === CHOSEN;
    shapes.push({
      id: `${tr.id}-tok-${i}`,
      type: "cell",
      x: tokX(i),
      y,
      w: TOK_W,
      h: TOK_H,
      label: chosen ? tr.shown : t,
      tone: chosen ? ROLE_TONE.mask : "neutral",
      fill: chosen ? tr.fill : undefined,
      highlight: (chosen && r === 0) || undefined,
    });
  });
  shapes.push(
    {
      id: `${tr.id}-tgt`,
      type: "cell",
      x: TGT_X,
      y,
      w: TGT_W,
      h: TOK_H,
      label: TARGET,
      tone: ROLE_TONE.softmax,
      fill: "pastel",
    },
    { id: `${tr.id}-arrow`, type: "arrow", x: 0, y: 0, from: `${tr.id}-tok-${CHOSEN}`, to: `${tr.id}-tgt` },
    text(`${tr.id}-note`, NOTE_X, y, NOTE_W, tr.note, "neutral", TOK_H)
  );
});

// Fine-tuning: the same encoder's input on a labelled review, with no [MASK] anywhere.
const FT_TOKENS = ["[CLS]", TARGET, "was", "great"];
shapes.push(
  {
    id: "rule",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [LABEL_X, RULE_Y],
      [NOTE_X + NOTE_W, RULE_Y],
    ],
    tone: "neutral",
    dashed: true,
  },
  text("ft-label", LABEL_X, FT_Y, LABEL_W, "fine-tune", "neutral", TOK_H),
  ...FT_TOKENS.map((t, i): LayoutShape => ({
    id: `ft-tok-${i}`,
    type: "cell",
    x: tokX(i),
    y: FT_Y,
    w: TOK_W,
    h: TOK_H,
    label: t,
    tone: "neutral",
    fill: t.startsWith("[") ? "pastel" : undefined,
  })),
  text("ft-note", TGT_X, FT_Y, NOTE_X + NOTE_W - TGT_X, "input never has [MASK]", "neutral", TOK_H)
);

// Right panel: the counts per 1,000 tokens.
const SMALL_W = 62;
const SMALL_GAP = (RW - 3 * SMALL_W) / 2;
shapes.push(
  {
    id: "chosen",
    type: "cell",
    x: RX,
    y: 72,
    w: RW,
    h: TOK_H,
    label: `${BUDGET.mlmChosen} chosen: loss here`,
    tone: ROLE_TONE.mask,
    fill: "pastel",
  },
  ...[
    { id: "n-mask", label: `${BUDGET.mlmMask}\n[MASK]` },
    { id: "n-random", label: `${BUDGET.mlmRandom}\nrandom` },
    { id: "n-same", label: `${BUDGET.mlmKept}\nsame` },
  ].map((c, i): LayoutShape => ({
    id: c.id,
    type: "cell",
    x: RX + i * (SMALL_W + SMALL_GAP),
    y: 116,
    w: SMALL_W,
    h: 44,
    label: c.label,
    tone: ROLE_TONE.mask,
    fill: i === 0 ? "pastel" : "soft",
  })),
  {
    id: "no-loss",
    type: "cell",
    x: RX,
    y: 176,
    w: RW,
    h: 44,
    label: `${BUDGET.mlmNoLoss.toLocaleString("en-US")} not chosen:\nno loss`,
    tone: "neutral",
  },
  text(
    "causal",
    RX - 6,
    234,
    RW + 12,
    `A causal LM has a target\nat all ${BUDGET.causalTargets.toLocaleString("en-US")} positions.`,
    "neutral",
    40
  ),
  text(
    "foot",
    16,
    316,
    848,
    "Rows: one chosen position, “tea”, and what the encoder reads there; the loss is −ln p(tea) in every row.\nCounts: expected values of the 15 % and 80 / 10 / 10 rule (Devlin et al., 2018, §3.1); “apple” is the paper's example.",
    "neutral",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "BERT's 80 / 10 / 10 masking rule",
  width: 880,
  height: 364,
  groups: [
    {
      id: "g-rows",
      title: "One chosen position, three treatments",
      tone: ROLE_TONE.block,
      x: 16,
      y: 36,
      w: 612,
      h: 264,
    },
    { id: "g-counts", title: "Per 1,000 training tokens", tone: ROLE_TONE.block, x: 644, y: 36, w: 220, h: 264 },
  ],
  shapes,
};

export default spec;
