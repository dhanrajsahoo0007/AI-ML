import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// The U-shaped curve from "Lost in the Middle: How Language Models Use Long Contexts" (Liu et al., 2023; TACL 2024;
// arXiv 2307.03172 v3). Multi-document question answering: each prompt holds 20 retrieved Wikipedia passages
// (about 4K tokens), exactly one of which contains the answer; the experiment moves that passage from first to last.
//
// Exact numbers, not an illustrative shape. Checked against arXiv 2307.03172 v3:
// - Table 6 (Appendix G.2, 20 total retrieved documents), GPT-3.5-Turbo accuracy when the answer passage is at
//   index 0, 4, 9, 14, 19 (positions 1, 5, 10, 15, 20): 75.8%, 57.2%, 53.8%, 55.4%, 63.2%.
// - Table 1: GPT-3.5-Turbo closed-book (no passages at all) 56.1%; oracle (only the answer passage) 88.3%.
// - §1: "when relevant information is placed in the middle of its input context, GPT-3.5-Turbo's performance on the
//   multi-document question task is lower than its performance when predicting without any documents".
// - Figure 1 labels the high ends primacy bias (start) and recency bias (end).
// Positions 10 and 15 (53.8%, 55.4%) are below closed-book (56.1%), so they are drawn red. Position 5 (57.2%) is
// 1.1 points above it. Straight segments join the five measured points; the paper measured no positions in between.

const POINTS: { pos: number; acc: number }[] = [
  { pos: 1, acc: 75.8 },
  { pos: 5, acc: 57.2 },
  { pos: 10, acc: 53.8 },
  { pos: 15, acc: 55.4 },
  { pos: 20, acc: 63.2 },
];
const CLOSED_BOOK = 56.1;
const ORACLE = 88.3;

// Plot area: positions 1–20 across, accuracy 40–90% up (7.2 px per point).
const X0 = 130;
const X1 = 650;
const Y_TOP = 80; // 90%
const Y_BOT = 440; // 40%
const px = (pos: number) => Math.round((X0 + ((pos - 1) * (X1 - X0)) / 19) * 10) / 10;
const py = (acc: number) => Math.round((Y_BOT - ((acc - 40) * (Y_BOT - Y_TOP)) / 50) * 10) / 10;

const text = (id: string, x: number, y: number, w: number, label: string, h = 20, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const line = (id: string, points: [number, number][], tone: LayoutTone, weight: number, dashed = false) =>
  ({ id, type: "path", x: 0, y: 0, points, tone, weight, dashed: dashed || undefined }) as LayoutShape;

const shapes: LayoutShape[] = [];

// Grid and y-axis labels every 10 points.
for (let a = 40; a <= 90; a += 10) {
  shapes.push(
    line(
      `grid-${a}`,
      [
        [X0 - 10, py(a)],
        [X1 + 10, py(a)],
      ],
      "neutral",
      a === 40 ? 0.3 : 0.06
    ),
    text(`y-${a}`, X0 - 64, py(a) - 10, 44, `${a}%`)
  );
}
shapes.push(text("y-title", X0 - 74, Y_TOP - 38, 70, "Accuracy", 20));

// x-axis ticks at the five measured positions.
for (const p of POINTS) {
  shapes.push(
    line(
      `xtick-${p.pos}`,
      [
        [px(p.pos), Y_BOT],
        [px(p.pos), Y_BOT + 6],
      ],
      "neutral",
      0.3
    ),
    text(`x-${p.pos}`, px(p.pos) - 20, Y_BOT + 10, 40, String(p.pos))
  );
}
shapes.push(
  text("x-title", X0, Y_BOT + 34, X1 - X0, "Position of the passage that holds the answer (1 = first of 20)", 20)
);

// Reference lines: oracle (ceiling) and closed-book (no passages).
shapes.push(
  line(
    "oracle",
    [
      [X0 - 10, py(ORACLE)],
      [X1 + 10, py(ORACLE)],
    ],
    "green",
    0.35,
    true
  ),
  text("oracle-label", X1 + 16, py(ORACLE) - 18, 184, "Oracle: only the answer\npassage, 88.3%", 36, "green"),
  line(
    "closed",
    [
      [X0 - 10, py(CLOSED_BOOK)],
      [X1 + 10, py(CLOSED_BOOK)],
    ],
    "red",
    0.35,
    true
  ),
  text("closed-label", X1 + 16, py(CLOSED_BOOK) - 18, 184, "Closed-book: no passages\nat all, 56.1%", 36, "red")
);

// The measured curve.
shapes.push({
  id: "curve",
  type: "path",
  x: 0,
  y: 0,
  points: POINTS.map((p) => [px(p.pos), py(p.acc)] as [number, number]),
  tone: "blue",
  weight: 0.6,
});
for (const p of POINTS) {
  const below = p.acc < CLOSED_BOOK;
  shapes.push(
    {
      id: `pt-${p.pos}`,
      type: "circle",
      x: px(p.pos),
      y: py(p.acc),
      w: 12,
      tone: below ? "red" : "blue",
      fill: "pastel",
    },
    // Values sit above each point, except the low middle ones, which go below the closed-book line.
    text(
      `v-${p.pos}`,
      // Position 5's value sits up and to the right, clear of the line coming down from position 1.
      p.pos === 5 ? px(p.pos) + 4 : px(p.pos) - 30,
      below ? py(p.acc) + 10 : py(p.acc) - 30,
      60,
      `${p.acc.toFixed(1)}%`,
      20,
      below ? "red" : "blue"
    )
  );
}

// Annotations for the two ends and the middle.
shapes.push(
  text("primacy", px(1) + 16, py(75.8) - 10, 120, "Start: primacy", 20, "blue"),
  text("recency", px(20) - 126, py(63.2) - 10, 110, "End: recency", 20, "blue"),
  text("middle", px(7), py(45) - 10, px(18) - px(7), "Middle: worse than giving no passages", 20, "red"),
  text("model", X0, 20, X1 - X0, "GPT-3.5-Turbo, 20 retrieved passages (about 4K tokens), one holds the answer", 20)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Lost in the middle: accuracy by position",
  width: 860,
  height: Y_BOT + 70,
  shapes,
};

export default spec;
