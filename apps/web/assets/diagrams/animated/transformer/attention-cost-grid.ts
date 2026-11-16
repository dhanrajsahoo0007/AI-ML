import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Why attention cost grows with the square of the sequence length. Self-attention scores every query against every
// key, so n tokens give an n × n score matrix (per head). Three grids for n = 4, 8 and 16, drawn with the same square
// size, so the area shows the growth: 4² = 16, 8² = 64, 16² = 256 pairs. Doubling n multiplies the pairs by
// (2n)² / n² = 4, and with them the work to compute Q Kᵀ (about n² · d_k multiply-adds per head) and the memory to hold
// the score and weight matrices (n² entries per head). The page's "Cost" section: projections and the feed-forward
// layers grow only linearly in n, so they double.
//
// Memory if the score matrix is stored (the "Cost" section's long-context example): at n = 32,768 tokens,
// n² = 1,073,741,824 entries; at 2 bytes each (16-bit) that is 2,147,483,648 bytes ≈ 2.1 GB, per head and per layer.
// FlashAttention (Dao et al. 2022, arXiv 2205.14135, §3.1, Theorem 1) computes the same exact result in tiles and
// "requires O(N) additional memory beyond inputs and output", so it never stores that matrix.
//
// Each grid is drawn with paths (a border plus 2 · (n − 1) inner lines), not n² cells: 3 borders + 6 + 14 + 30 lines
// + labels is about 63 shapes, far under the 250-shape cap. (Paths render under boxes and cells, so a filled box
// behind the lines would hide them.)

const NS = [4, 8, 16];
const CELL = 18;
const GAP = 120;
const LEFT = 64;
const BASE = 340; // shared bottom edge of the three grids
const side = (n: number) => n * CELL;
const gridX = (i: number) => LEFT + NS.slice(0, i).reduce((acc, n) => acc + side(n) + GAP, 0);
const gridY = (n: number) => BASE - side(n);
const TONE = ROLE_TONE.score;

function grid(n: number, i: number): LayoutShape[] {
  const x = gridX(i);
  const y = gridY(n);
  const s = side(n);
  const line = (id: string, points: [number, number][], weight = 0.35): LayoutShape => ({
    id,
    type: "path",
    x: 0,
    y: 0,
    points,
    tone: TONE,
    weight,
  });
  const lines: LayoutShape[] = [];
  for (let k = 1; k < n; k++) {
    lines.push(
      line(`g${n}-v${k}`, [
        [x + k * CELL, y],
        [x + k * CELL, y + s],
      ])
    );
    lines.push(
      line(`g${n}-h${k}`, [
        [x, y + k * CELL],
        [x + s, y + k * CELL],
      ])
    );
  }
  return [
    line(
      `g${n}`,
      [
        [x, y],
        [x + s, y],
        [x + s, y + s],
        [x, y + s],
        [x, y],
      ],
      0.6
    ),
    ...lines,
    {
      id: `g${n}-n`,
      type: "text",
      x: x + s / 2 - 60,
      y: y - 28,
      w: 120,
      h: 20,
      label: `n = ${n} tokens`,
      tone: "neutral",
    },
    {
      id: `g${n}-pairs`,
      type: "text",
      x: x + s / 2 - 60,
      y: BASE + 10,
      w: 120,
      h: 36,
      label: `${n * n} pairs\n(${n} × ${n})`,
      tone: TONE,
    },
  ];
}

/** "n × 2" arrow from grid i to grid i + 1, at the middle height of the smaller grid, with "pairs × 4" under it. */
function growth(i: number): LayoutShape[] {
  const n = NS[i];
  const x0 = gridX(i) + side(n) + 8;
  const x1 = gridX(i + 1) - 8;
  const y = gridY(n) + side(n) / 2;
  const ratio = (NS[i + 1] * NS[i + 1]) / (n * n);
  return [
    { id: `grow-${i}`, type: "arrow", x: x0, y, w: x1 - x0, h: 0, label: `n × ${NS[i + 1] / n}` },
    {
      id: `grow-${i}-pairs`,
      type: "text",
      x: x0,
      y: y + 14,
      w: x1 - x0,
      h: 20,
      label: `pairs × ${ratio}`,
      tone: TONE,
    },
  ];
}

const NOTE_Y = BASE + 66;
const spec: LayoutSpec = {
  kind: "layout",
  title: "Attention cost: n tokens make n × n pairs",
  width: 872,
  height: NOTE_Y + 58,
  shapes: [
    ...NS.flatMap(grid),
    ...growth(0),
    ...growth(1),
    {
      id: "note",
      type: "text",
      x: 36,
      y: NOTE_Y,
      w: 800,
      h: 50,
      label:
        "Each square is one query–key score (rows: queries, columns: keys), the same size in all three grids.\n" +
        "Doubling n quadruples the pairs, so score-matrix work and memory per head grow 4×;\n" +
        "the projections and the feed-forward layers only double.",
      tone: "neutral",
    },
  ],
};

export default spec;
