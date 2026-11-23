import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Block (semi-autoregressive) diffusion, for the "Block diffusion" part of the Architecture section on the Diffusion
// LLMs page. A 12-token answer is generated in 3 blocks of 4 tokens, left to right. Inside a block, masked
// diffusion runs for 2 denoising passes and commits the 2 most confident tokens per pass (low-confidence
// remasking). A finished block never changes again, so its keys and values can be cached and reused while later
// blocks are denoised.
// Steps: one per block.
//
// Sources: Arriola et al. (2025), "Block Diffusion", arXiv 2503.09573 (ICLR 2025): blocks are generated
// autoregressively, diffusion runs within each block, earlier blocks are cached as keys and values, and the output
// length is not fixed. LLaDA (Nie et al. 2025, arXiv 2502.09992, §2.4 and App. B) applies the same block-by-block
// order at sampling time ("semi-autoregressive" sampling), without a KV cache.
//
// Confidences are made up (CONF below); the kept tokens are computed from them:
//   block 1 pass 1: Boil .91, the .55, water .83, first .38 → keep Boil, water; pass 2: the .88, first .71 → keep both
//   block 2 pass 1: then .64, add .87, the .52, leaves .79 → keep add, leaves; pass 2: then .82, the .90
//   block 3 pass 1: and .58, wait .85, four .49, minutes .80 → keep wait, minutes; pass 2: and .84, four .77

const TOKENS = ["Boil", "the", "water", "first", "then", "add", "the", "leaves", "and", "wait", "four", "minutes"];
const BLOCK = 4;
const PASSES = 2;
const KEEP = BLOCK / PASSES; // 2 tokens per pass
const BLOCKS = TOKENS.length / BLOCK; // 3
// CONF[pass row][position in block]; a value is only read while that position is still masked.
const CONF = [
  [0.91, 0.55, 0.83, 0.38],
  [0, 0.88, 0, 0.71],
  [0.64, 0.87, 0.52, 0.79],
  [0.82, 0, 0.9, 0],
  [0.58, 0.85, 0.49, 0.8],
  [0.84, 0, 0.77, 0],
];

// For each pass row: which in-block positions were already committed, and which this pass commits.
interface Row {
  block: number;
  before: number[];
  kept: number[];
}
const rows: Row[] = [];
for (let b = 0; b < BLOCKS; b++) {
  let done: number[] = [];
  for (let p = 0; p < PASSES; p++) {
    const r = b * PASSES + p;
    const masked = [0, 1, 2, 3].filter((i) => !done.includes(i));
    const kept = [...masked].sort((x, y) => CONF[r][y] - CONF[r][x]).slice(0, KEEP);
    rows.push({ block: b, before: done, kept });
    done = [...done, ...kept];
  }
  if (done.length !== BLOCK) throw new Error(`block ${b + 1} not filled`);
}

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const CELLS_X = 96;
const PITCH = 60;
const CELL_W = 58;
const BLOCK_GAP = 16;
const cx = (i: number) => CELLS_X + i * PITCH + Math.floor(i / BLOCK) * BLOCK_GAP;
const ROW_TOP = 112;
const ROW_PITCH = 44;
const CELL_H = 36;
const rowY = (r: number) => ROW_TOP + r * ROW_PITCH;
const GROUP_Y = ROW_TOP - 40;
const GRID_BOTTOM = rowY(rows.length - 1) + CELL_H + 12;
const TOKEN: LayoutTone = ROLE_TONE.softmax; // committed in the current block (green)
const CACHED: LayoutTone = ROLE_TONE.key; // finished block, keys and values cached (teal)
const MASKED: LayoutTone = ROLE_TONE.masked;
const fmt = (c: number) => c.toFixed(2).replace(/^0\./, ".");

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const shapes: LayoutShape[] = [
  text(
    "rule",
    16,
    12,
    848,
    20,
    `Blocks of ${BLOCK} tokens, left to right; inside a block, ${PASSES} diffusion passes commit ${KEEP} tokens each`,
    "neutral",
    1,
    true
  ),
];

rows.forEach((row, r) => {
  const step = row.block + 1;
  shapes.push(text(`l-${r}`, 16, rowY(r), 72, CELL_H, `pass ${r + 1}`, "neutral", step));
  // Finished blocks: cached.
  for (let i = 0; i < row.block * BLOCK; i++) {
    shapes.push({
      id: `c-${r}-${i}`,
      type: "cell",
      x: cx(i),
      y: rowY(r),
      w: CELL_W,
      h: CELL_H,
      label: TOKENS[i],
      tone: CACHED,
      fill: "soft",
      step,
      quiet: true,
    });
  }
  // The current block.
  for (let j = 0; j < BLOCK; j++) {
    const i = row.block * BLOCK + j;
    const kept = row.kept.includes(j);
    const before = row.before.includes(j);
    shapes.push({
      id: `c-${r}-${i}`,
      type: "cell",
      x: cx(i),
      y: rowY(r),
      w: CELL_W,
      h: CELL_H,
      label: kept || before ? TOKENS[i] : "[M]",
      sub: kept ? fmt(CONF[r][j]) : undefined,
      tone: kept || before ? TOKEN : MASKED,
      fill: kept ? "pastel" : "soft",
      step,
      quiet: true,
    });
  }
});

const NOTE_Y = GRID_BOTTOM + 20;
const notes = [
  `Block 1: ${PASSES} passes. Attention inside the block is bidirectional.`,
  "Block 1 is final (teal): its keys and values are cached and reused.",
  "Each new block attends to the cached blocks; generation can stop after any block.",
];
notes.forEach((label, b) =>
  shapes.push(text(`note-${b}`, 150, NOTE_Y + b * 34, 580, 20, label, b === 0 ? TOKEN : CACHED, b + 1, false))
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Block (semi-autoregressive) diffusion",
  width: 880,
  height: NOTE_Y + BLOCKS * 34 + 10,
  steps: [
    { title: "Block 1: diffusion inside the block" },
    { title: "Block 2: block 1 is frozen and cached" },
    { title: "Block 3: the answer grows block by block" },
  ],
  groups: Array.from({ length: BLOCKS }, (_, b) => ({
    id: `g-block-${b}`,
    title: `Block ${b + 1}`,
    tone: "neutral" as const,
    x: cx(b * BLOCK) - 6,
    y: GROUP_Y,
    w: BLOCK * PITCH - (PITCH - CELL_W) + 12,
    h: GRID_BOTTOM - GROUP_Y,
  })),
  shapes,
};

export default spec;
