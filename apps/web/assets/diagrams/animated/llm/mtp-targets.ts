import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Which future tokens each position is trained on, for "Beyond next-token prediction" on the Multi-Token Prediction
// page. One short sentence of our own, "Mira locked the door and went home" (7 tokens, one word per token for
// clarity). Positions 1–6 are inputs; token 7 is only ever a target.
// Top: next-token prediction. Position i is trained on token i + 1 only.
// Bottom: multi-token prediction with n = 3 heads. Position i is trained on tokens i + 1, i + 2 and i + 3, one per
// head, where they exist; near the end of the sequence the far heads run out of targets.
//
// Working (computed below, L = 7 tokens, 6 input positions):
//   next-token targets = 6 (one per position)
//   n = 3 targets: positions 1–4 have 3 each, position 5 has 2, position 6 has 1 → 4 × 3 + 2 + 1 = 15
//   position 3 ("the") is trained on "door", "and", "went".
//
// Facts: the loss of Gloeckle et al. (2024, arXiv 2404.19737, §2) sums, at every position t, the cross-entropy of
// heads 1 … n on tokens t + 1 … t + n; head 1 is the ordinary next-token head. They use n = 4 for most results; n = 3
// here keeps the drawing small. Target cells are green (probabilities / predictions in the legend).

const TOKENS = ["Mira", "locked", "the", "door", "and", "went", "home"];
const N = 3;
const INPUTS = TOKENS.length - 1;
const FOCUS = 2; // "the"

const COL_X0 = 160;
const COL_STEP = 112;
const COL_W = 96;
const colX = (i: number) => COL_X0 + i * COL_STEP;
const TOK_H = 40;
const CELL_H = 32;
const TARGET = ROLE_TONE.softmax;

const targetOf = (pos: number, head: number) => TOKENS[pos + head]; // head 1 → next token
const nextTokenCount = INPUTS;
const mtpCount = Array.from({ length: INPUTS }, (_, p) => Math.min(N, TOKENS.length - 1 - p)).reduce((a, b) => a + b);

const shapes: LayoutShape[] = [];

function panel(prefix: string, top: number, heads: number) {
  for (let p = 0; p < INPUTS; p++) {
    shapes.push({
      id: `${prefix}-tok-${p}`,
      type: "box",
      x: colX(p),
      y: top,
      w: COL_W,
      h: TOK_H,
      label: TOKENS[p],
      sub: `position ${p + 1}`,
      // The position the note talks about is blue, as the current token's query is in the Transformer legend.
      tone: prefix === "mtp" && p === FOCUS ? ROLE_TONE.query : "neutral",
      fill: "pastel",
    });
    const cellTop = top + TOK_H + 22;
    shapes.push({
      id: `${prefix}-arrow-${p}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${prefix}-tok-${p}`,
      to: `${prefix}-t-${p}-1`,
    });
    for (let h = 1; h <= heads; h++) {
      const target = targetOf(p, h);
      shapes.push({
        id: `${prefix}-t-${p}-${h}`,
        type: "cell",
        x: colX(p),
        y: cellTop + (h - 1) * CELL_H,
        w: COL_W,
        h: CELL_H,
        label: target ?? "no target",
        tone: target ? TARGET : "neutral",
        fill: target ? "pastel" : "soft",
        quiet: true,
      });
    }
  }
  for (let h = 1; h <= heads; h++) {
    shapes.push({
      id: `${prefix}-row-${h}`,
      type: "text",
      x: 16,
      y: top + TOK_H + 22 + (h - 1) * CELL_H,
      w: 132,
      h: CELL_H,
      label: heads === 1 ? "target: next token" : `head ${h}: token t + ${h}`,
      tone: TARGET,
    });
  }
}

const TOP_A = 64;
const TOP_B = 262;
panel("ntp", TOP_A, 1);
panel("mtp", TOP_B, N);

const BOTTOM_B = TOP_B + TOK_H + 22 + N * CELL_H;
shapes.push(
  {
    id: "input-label-a",
    type: "text",
    x: 16,
    y: TOP_A,
    w: 132,
    h: TOK_H,
    label: "input token t",
    tone: "neutral",
  },
  {
    id: "input-label-b",
    type: "text",
    x: 16,
    y: TOP_B,
    w: 132,
    h: TOK_H,
    label: "input token t",
    tone: "neutral",
  },
  {
    id: "note-focus",
    type: "text",
    x: COL_X0 - 8,
    y: BOTTOM_B + 18,
    w: 690,
    h: 20,
    label: `“${TOKENS[FOCUS]}” must predict “${targetOf(FOCUS, 1)}”, “${targetOf(FOCUS, 2)}” and “${targetOf(FOCUS, 3)}”: ${N} losses at one position instead of 1.`,
    tone: "neutral",
  },
  {
    id: "note-count",
    type: "text",
    x: COL_X0 - 8,
    y: BOTTOM_B + 42,
    w: 690,
    h: 20,
    label: `Targets from ${INPUTS} positions: ${nextTokenCount} with next-token prediction, ${mtpCount} with n = ${N} heads.`,
    tone: TARGET,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Next-token vs multi-token training targets",
  width: 860,
  height: BOTTOM_B + 76,
  groups: [
    {
      id: "g-ntp",
      title: "Next-token prediction (n = 1)",
      tone: "neutral",
      x: 8,
      y: TOP_A - 34,
      w: 844,
      h: TOK_H + 22 + CELL_H + 48,
    },
    {
      id: "g-mtp",
      title: `Multi-token prediction (n = ${N} heads)`,
      tone: TARGET,
      x: 8,
      y: TOP_B - 34,
      w: 844,
      h: TOK_H + 22 + N * CELL_H + 48,
    },
  ],
  shapes,
};

export default spec;
