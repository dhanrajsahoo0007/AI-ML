import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Three attention masks over the same 5 tokens, side by side (rows = queries, the token that looks; columns = keys,
// the token it looks at). Green = may attend, grey = masked (set to −∞ before the softmax, so its weight is 0).
// Token 3's row is outlined in blue (the query tone) in every grid, matching the page's text.
//
// Facts checked:
// - Bidirectional: the encoder's self-attention, as in BERT (Devlin et al., 2018, arXiv 1810.04805, §3): every
//   position attends to every position, so the mask is all on. Token 3 sees 1, 2, 3, 4, 5.
// - Causal: the decoder's masked self-attention (Vaswani et al., 2017, arXiv 1706.03762, §3.2.3): position i
//   attends to positions 1..i, the lower triangle with the diagonal. Token 3 sees 1, 2, 3.
// - Prefix-LM (Raffel et al., 2019, arXiv 1910.10683, §3.2.1 and Figure 3, "causal with prefix"): fully visible
//   attention over the prefix (the prompt), causal after it. With a prefix of 3, rows 1–3 see columns 1–3 and
//   rows 4–5 see columns 1..i. Token 3 is the last prompt token and sees 1, 2, 3; token 1 also sees 2 and 3, which
//   is where it differs from the causal mask.

const N = 5;
const CELL = 32;
const SIDE = N * CELL;
const PANEL_W = 272;
const PANELS = [16, 304, 592];
const GROUP_Y = 36;
const GROUP_H = 324;
/** Top of every grid. */
const GY = 116;
/** The row the page talks about (1-based token 3). */
const MARK = 2;
const PREFIX = 3;
/** Token 3's row is pulled GAP px away from its neighbours so its blue outline can run between the rows. */
const GAP = 6;
/** Top of row r: rows after the marked one shift down by the gaps around it. */
const rowY = (r: number) => GY + r * CELL + (r >= MARK ? GAP : 0) + (r > MARK ? GAP : 0);
const GRID_H = SIDE + 2 * GAP;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

/** Left edge of the grid inside panel p: centred, nudged right to balance the row numbers. */
const gridX = (p: number) => PANELS[p] + (PANEL_W - SIDE) / 2 + 8;

interface MaskDef {
  id: string;
  title: string;
  can: (r: number, c: number) => boolean;
  sees: string;
  rule: string;
}

const MASKS: MaskDef[] = [
  {
    id: "bidi",
    title: "Bidirectional",
    can: () => true,
    sees: "Token 3 sees 1, 2, 3, 4, 5",
    rule: "Every token sees every token.",
  },
  {
    id: "causal",
    title: "Causal",
    can: (r, c) => c <= r,
    sees: "Token 3 sees 1, 2, 3 only",
    rule: "Each token sees itself and the past.",
  },
  {
    id: "prefix",
    title: "Prefix-LM (prompt of 3)",
    can: (r, c) => (r < PREFIX ? c < PREFIX : c <= r),
    sees: "Token 3 sees 1, 2, 3: the prompt",
    rule: "Both ways in the prompt, causal after.",
  },
];

function panel(p: number, m: MaskDef): LayoutShape[] {
  const gx = gridX(p);
  const out: LayoutShape[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const on = m.can(r, c);
      out.push({
        id: `${m.id}-${r}-${c}`,
        type: "cell",
        x: gx + c * CELL,
        y: rowY(r),
        w: CELL,
        h: CELL,
        tone: on ? ROLE_TONE.weight : ROLE_TONE.masked,
        weight: on ? 0.7 : undefined,
        quiet: true,
      });
    }
  for (let i = 0; i < N; i++) {
    out.push(text(`${m.id}-col-${i}`, gx + i * CELL, GY - 22, CELL, String(i + 1)));
    out.push(
      text(`${m.id}-row-${i}`, gx - 22, rowY(i), 18, String(i + 1), i === MARK ? ROLE_TONE.query : "neutral", CELL)
    );
  }
  // Token 3's row, outlined in the query tone (the row number sits inside the outline).
  const y1 = rowY(MARK) - GAP / 2;
  const y2 = rowY(MARK) + CELL + GAP / 2;
  const x1 = gx - 26;
  const x2 = gx + SIDE + 4;
  out.push({
    id: `${m.id}-mark`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
      [x1, y1],
    ],
    tone: ROLE_TONE.query,
  });
  out.push(text(`${m.id}-sees`, PANELS[p] + 8, GY + GRID_H + 14, PANEL_W - 16, m.sees, ROLE_TONE.query));
  out.push(text(`${m.id}-rule`, PANELS[p] + 8, GY + GRID_H + 38, PANEL_W - 16, m.rule));
  return out;
}

/** A bracket over columns [from, to) of panel p's grid, opening down, with a label above it. */
function bracket(id: string, p: number, from: number, to: number, label: string): LayoutShape[] {
  const gx = gridX(p);
  const x1 = gx + from * CELL + 3;
  const x2 = gx + to * CELL - 3;
  const y = 86;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, y + 6],
        [x1, y],
        [x2, y],
        [x2, y + 6],
      ],
      tone: "neutral",
    },
    text(`${id}-label`, x1 - 12, 62, x2 - x1 + 24, label),
  ];
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "Attention masks side by side",
  width: 880,
  height: 420,
  groups: MASKS.map((m, p) => ({
    id: `g-${m.id}`,
    title: m.title,
    tone: ROLE_TONE.block,
    x: PANELS[p],
    y: GROUP_Y,
    w: PANEL_W,
    h: GROUP_H,
  })),
  shapes: [
    ...MASKS.flatMap((m, p) => panel(p, m)),
    ...bracket("prompt", 2, 0, PREFIX, "prompt"),
    ...bracket("generated", 2, PREFIX, N, "generated"),
    text(
      "foot",
      16,
      376,
      848,
      "Rows are queries (the token that looks); columns are keys (the token it looks at).\nGreen: can see. Grey: masked, set to −∞ before the softmax, so its weight is 0.",
      "neutral",
      36
    ),
  ],
};

export default spec;
