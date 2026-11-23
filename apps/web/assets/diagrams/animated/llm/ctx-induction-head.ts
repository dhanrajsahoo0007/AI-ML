import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// How an induction head completes [A][B] … [A] → [B], in four steps, with our own sentence:
// "Dr Ilsen fixed the pump. Later Dr" → next token "Ilsen". [A] = "Dr", [B] = "Ilsen".
//
// Facts checked against Olsson et al. (2022), "In-context Learning and Induction Heads", arXiv 2209.11895
// (Transformer Circuits Thread, published 8 March 2022):
// - Induction heads "implement a simple algorithm to complete token sequences like [A][B] … [A] → [B]".
// - In their models the circuit is two heads: "a 'previous token head' which copies information from the previous
//   token into the next token", and the induction head, which "uses that information to find tokens preceded by the
//   present token", then predicts that token again.
// - The in-context learning score (loss of the 500th token minus the average loss of the 50th) develops abruptly
//   "early in training (roughly 2.5 to 5 billion tokens)": under 0.15 nats before, about 0.4 nats after, at the same
//   point induction heads form.
// - Evidence is causal for small attention-only models and correlational for larger models with MLPs.
// The drawing is schematic: one strong arc per head, no measured weights.
//
// Colours follow the Transformer legend for data: the current token's query is blue, the key it matches teal, the
// copied value violet, the prediction green. The previous-token head's arcs are teal (as in attention-arcs-two-heads)
// and the induction head's arc is orange (attention).

const TOKENS = ["Dr", "Ilsen", "fixed", "the", "pump", ".", "Later", "Dr"];
const A = 0; // first "Dr"
const B = 1; // "Ilsen"
const NOW = 7; // the second "Dr"

const STEP_X = 88;
const BOX_W = 74;
const BOX_H = 40;
const cx = (i: number) => 430 - (STEP_X * TOKENS.length) / 2 + STEP_X / 2 + i * STEP_X;
const ROW_Y = 210;
const ROW_BOTTOM = ROW_Y + BOX_H;
const TIP = 9;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Half-ellipse from x = a to x = b; positive h bulges up from baseY, negative h bulges down. */
function arcPoints(a: number, b: number, h: number, baseY: number): [number, number][] {
  return Array.from({ length: 13 }, (_, k) => {
    const t = (Math.PI * k) / 12;
    const x = (a + b) / 2 - ((b - a) / 2) * Math.cos(t);
    return [round1(x), round1(baseY - h * Math.sin(t))];
  });
}

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 20
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step });

const shapes: LayoutShape[] = [];

// ── Step 1: the tokens ───────────────────────────────────────────────────────────────────────────────────────
TOKENS.forEach((t, i) =>
  shapes.push({
    id: `tok-${i}`,
    type: "box",
    x: cx(i) - BOX_W / 2,
    y: ROW_Y,
    w: BOX_W,
    h: BOX_H,
    label: t,
    sub: i === A ? "[A]" : i === B ? "[B]" : i === NOW ? "[A] again" : undefined,
    tone: i === NOW ? ROLE_TONE.query : "neutral",
    fill: "pastel",
    step: 1,
    quiet: i !== NOW || undefined,
  })
);
shapes.push(
  text("pos-note", 40, 24, 780, "The name “Dr Ilsen” appeared once. Now “Dr” appears again: what comes next?", 1)
);

// ── Step 2: previous-token head (earlier layer). Every token reads the one before it; arcs hang below the row. ──
const PREV_TONE: LayoutTone = "teal";
const PREV_DROP = 30;
for (let i = 1; i < TOKENS.length; i++) {
  const key = cx(i - 1) + 12;
  const query = cx(i) - 12;
  shapes.push(
    {
      id: `prev-arc-${i}`,
      type: "path",
      x: 0,
      y: 0,
      // Starts at the query's bottom edge and stops TIP px below the key, where a short arrow finishes it.
      points: [[query, ROW_BOTTOM], ...arcPoints(key, query, -PREV_DROP, ROW_BOTTOM + TIP).reverse()],
      smooth: true,
      tone: PREV_TONE,
      weight: i === B ? 0.7 : 0.25,
      step: 2,
    },
    {
      id: `prev-tip-${i}`,
      type: "arrow",
      x: key,
      y: ROW_BOTTOM + TIP + 1,
      w: 0,
      h: -TIP,
      tone: PREV_TONE,
      step: 2,
      quiet: true,
    }
  );
}
shapes.push(
  {
    id: "prev-cell",
    type: "cell",
    x: cx(B) - 50,
    y: ROW_BOTTOM + 62,
    w: 100,
    h: 26,
    label: "after “Dr”",
    tone: PREV_TONE,
    fill: "soft",
    step: 2,
  },
  text(
    "prev-note",
    cx(B) + 64,
    ROW_BOTTOM + 58,
    480,
    "Previous-token head (earlier layer): each token stores the one before it,\nso “Ilsen” now carries the note “I came after Dr”.",
    2,
    PREV_TONE,
    36
  )
);

// ── Step 3: induction head (later layer). The current "Dr" searches for a token whose note says "after Dr". ──
const IND_TONE = ROLE_TONE.attention;
const ARC_TOP = 70;
const indA = cx(B) + 8;
const indB = cx(NOW) - 8;
shapes.push(
  {
    id: "ind-arc",
    type: "path",
    x: 0,
    y: 0,
    points: [...arcPoints(indA, indB, ROW_Y - TIP - ARC_TOP, ROW_Y - TIP), [indB, ROW_Y]],
    smooth: true,
    tone: IND_TONE,
    weight: 0.75,
    step: 3,
  },
  { id: "ind-tip", type: "arrow", x: indA, y: ROW_Y - TIP - 1, w: 0, h: TIP, tone: IND_TONE, step: 3, quiet: true },
  text(
    "ind-note",
    cx(4) - 170,
    ARC_TOP + 36,
    340,
    "Induction head (later layer): the current “Dr”\nlooks for a token that came after a “Dr”\nand attends to “Ilsen”.",
    3,
    IND_TONE,
    52
  )
);

// ── Step 4: copy "Ilsen" forward as the prediction ───────────────────────────────────────────────────────────
const OUT_Y = ROW_BOTTOM + 112;
shapes.push(
  {
    id: "out",
    type: "box",
    x: cx(NOW) - 30,
    y: OUT_Y,
    w: 100,
    h: BOX_H,
    label: "Ilsen",
    sub: "next token",
    tone: ROLE_TONE.softmax,
    fill: "pastel",
    step: 4,
  },
  {
    id: "copy",
    type: "arrow",
    // Leaves the right half of the current token, clear of the previous-token arc under its left half.
    x: cx(NOW) + 20,
    y: ROW_BOTTOM,
    w: 0,
    h: OUT_Y - ROW_BOTTOM,
    label: "copy [B]",
    tone: ROLE_TONE.value,
    step: 4,
  },
  text(
    "copy-note",
    40,
    OUT_Y + 2,
    cx(NOW) - 50 - 60,
    "[A][B] … [A] → [B]: the head copies what followed last time.\nThe same move reuses a pattern from a few-shot example.",
    4,
    "neutral",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "An induction head completes a repeated pattern",
  width: 860,
  height: OUT_Y + BOX_H + 30,
  shapes,
  steps: [
    { title: "The sequence so far: “Dr Ilsen” … then “Dr” again" },
    { title: "Previous-token head: each token notes the token before it" },
    { title: "Induction head: the current “Dr” finds what came after “Dr” before" },
    { title: "Copy: predict “Ilsen”" },
  ],
};

export default spec;
