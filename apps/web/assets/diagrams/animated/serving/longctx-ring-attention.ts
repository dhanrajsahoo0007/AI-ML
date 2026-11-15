import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { LONG_PROMPT, MIN_BLOCK, RING, ROUND_GB, ROUND_TFLOP } from "@/components/diagrams/presets/production-longctx";

// Ring attention on four GPUs (long-context-ring-attention-and-kv-quantization). One 128,000-token prompt is cut into
// 4 blocks of 32,000 tokens. GPU i keeps query block Qi for the whole pass; the key/value blocks (KV0..KV3) travel
// round a ring, one hop per round. In round r, GPU i attends its Qi to the KV block it holds, KV((i − r + 1) mod 4),
// while it sends that block to GPU i+1 and receives the next one from GPU i−1. After 4 rounds (3 hops) every Qi has met
// every KVk and the partial results, combined with the running softmax statistics, give exact attention.
//
// Steps: 1 split the prompt, one block per GPU · 2 round 1: each GPU uses its own KV block (the diagonal) · 3 round 2:
// KV blocks moved one hop · 4 round 3 · 5 round 4: the last KV block arrives; nothing more to send · 6 the check that
// hiding the transfer works: per layer per round, 33.6 TFLOP of attention against 1.05 GB sent, and the minimum block
// size c ≥ F ÷ B.
//
// Working (Liu et al., 2023, arXiv 2310.01889, §3): per block pair 4·d·c² FLOPs; transfer 4·c·d bytes in bfloat16.
// d = 64 heads × 128 = 8,192, c = 32,000: 4 × 8,192 × 32,000² = 3.355e13 FLOPs = 33.6 TFLOP; 4 × 32,000 × 8,192 =
// 1.049e9 bytes = 1.05 GB. Overlap needs c ≥ F ÷ B: A100 312 TFLOPS ÷ NVLink 300 GB/s ≈ 1,040 tokens; ÷ InfiniBand
// 12.5 GB/s ≈ 24,960 tokens (the paper's Table 2 prints 1.0k and 24.5k). The paper counts only attention FLOPs and
// the sizes are the model of transformer/kv-cache-growth, so this is a bound, not a benchmark.
//
// Layout (860 × 682): top group x 16..844, y 16..262: blocks y 52..92, GPUs y 124..172, return arrow y 206; bottom
// group y 278..604: header y 306, rows from y 330 pitch 52, notes y 544. Tones (four plus neutral): blocks and the KV
// cells blue (data), GPUs teal (compute), outputs green (the model's result), the one highlight on the diagonal.

const W = 860;
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 18
) => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true }) as LayoutShape;

const D = RING.devices;
const GPU = { x0: 34, pitch: 216, w: 110, blockW: 150 };
const bx = (i: number) => GPU.x0 + i * GPU.pitch;
const gx = (i: number) => bx(i) + (GPU.blockW - GPU.w) / 2;
const BLOCK_Y = 52;
const GPU_Y = 124;
const BLOCK_TOKENS = RING.blockTokens;
const range = (i: number) => `${n(i * BLOCK_TOKENS)}–${n((i + 1) * BLOCK_TOKENS - 1)}`;

const ring: LayoutShape[] = [];
for (let i = 0; i < D; i++) {
  ring.push(
    {
      id: `block-${i}`,
      type: "box",
      x: bx(i),
      y: BLOCK_Y,
      w: GPU.blockW,
      h: 40,
      label: `Block ${i}`,
      sub: `tokens ${range(i)}`,
      tone: PROD_TONE.data,
      fill: "pastel",
      step: 1,
    },
    {
      id: `gpu-${i}`,
      type: "box",
      x: gx(i),
      y: GPU_Y,
      w: GPU.w,
      h: 48,
      label: `GPU ${i}`,
      sub: `keeps Q${i}`,
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 1,
    },
    { id: `down-${i}`, type: "arrow", x: 0, y: 0, from: `block-${i}`, to: `gpu-${i}`, step: 1 }
  );
}
for (let i = 0; i < D - 1; i++)
  ring.push({
    id: `hop-${i}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `gpu-${i}`,
    to: `gpu-${i + 1}`,
    label: i === 1 ? "KV block" : undefined,
    packet: true,
    step: 2,
  });
ring.push({
  id: "hop-wrap",
  type: "arrow",
  x: gx(D - 1) + GPU.w / 2,
  y: GPU_Y + 48,
  w: gx(0) - gx(D - 1),
  h: 0,
  via: [
    [gx(D - 1) + GPU.w / 2, 208],
    [gx(0) + GPU.w / 2, 208],
  ],
  dashed: true,
  label: "last GPU sends back to GPU 0",
  step: 2,
});

// The grid: five columns (four rounds and the result), four rows (one per GPU).
const GRID = { x: 128, y: 330, w: 112, h: 40, pitchX: 120, pitchY: 52 };
const gridX = (c: number) => GRID.x + c * GRID.pitchX;
const gridY = (r: number) => GRID.y + r * GRID.pitchY;
const grid: LayoutShape[] = [];
for (let i = 0; i < D; i++)
  grid.push({
    id: `row-${i}`,
    type: "box",
    x: 24,
    y: gridY(i),
    w: 90,
    h: GRID.h,
    label: `GPU ${i}`,
    sub: `Q${i}`,
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 1,
  });
for (let r = 0; r < D; r++) {
  const step = r + 2;
  grid.push(text(`head-${r}`, gridX(r), GRID.y - 28, GRID.w, `Round ${r + 1}`, step));
  for (let i = 0; i < D; i++) {
    const kv = (((i - r) % D) + D) % D; // the KV block GPU i holds in round r + 1
    grid.push({
      id: `cell-${r}-${i}`,
      type: "cell",
      x: gridX(r),
      y: gridY(i),
      w: GRID.w,
      h: GRID.h,
      label: `Q${i} × KV${kv}`,
      sub: kv === i ? "own block" : "arrived by ring",
      tone: PROD_TONE.data,
      fill: kv === i ? undefined : "pastel",
      weight: kv === i ? 0.6 : undefined,
      step,
      quiet: true,
      highlight: r === 0 && i === 0 ? true : undefined,
    });
  }
  grid.push(
    text(
      `send-${r}`,
      gridX(r),
      gridY(D - 1) + GRID.h + 8,
      GRID.w,
      r < D - 1 ? "next KV block\nin flight" : "nothing left\nto send",
      step,
      "neutral",
      36
    )
  );
}
grid.push(text("head-out", gridX(D), GRID.y - 28, GRID.w, "Result", 6));
for (let i = 0; i < D; i++)
  grid.push({
    id: `out-${i}`,
    type: "cell",
    x: gridX(D),
    y: gridY(i),
    w: GRID.w,
    h: GRID.h,
    label: `output ${i}`,
    sub: "met KV0–KV3",
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 6,
    quiet: true,
  });

const notes: LayoutShape[] = [
  text(
    "check",
    24,
    GRID.y + D * GRID.pitchY + 46,
    W - 48,
    `Per layer, per round: ${ROUND_TFLOP.toFixed(1)} TFLOP of attention against ${ROUND_GB.toFixed(2)} GB sent.\n` +
      `A block needs at least F ÷ B tokens: about ${n(MIN_BLOCK.nvlink)} on NVLink, ${n(MIN_BLOCK.infiniband)} on InfiniBand.\n` +
      `Here a block has ${n(BLOCK_TOKENS)} tokens, so the transfer hides behind the compute (A100 figures: illustrative).`,
    6,
    "neutral",
    54
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Ring attention: key/value blocks travel round four GPUs",
  width: W,
  height: 682,
  steps: [
    { title: "Cut the prompt into one block per GPU" },
    { title: "Round 1: every GPU uses its own KV block" },
    { title: "Round 2: KV blocks move one hop" },
    { title: "Round 3: another hop" },
    { title: "Round 4: the last block arrives" },
    { title: "Why the transfer costs nothing" },
  ],
  groups: [
    {
      id: "ring",
      title: `One ${n(LONG_PROMPT)}-token prompt, ${D} blocks of ${n(BLOCK_TOKENS)} tokens, a ring of ${D} GPUs`,
      tone: PROD_TONE.compute,
      x: 16,
      y: 16,
      w: 828,
      h: 232,
    },
    {
      id: "rounds",
      title: "Which pair each GPU computes, round by round",
      tone: PROD_TONE.data,
      x: 16,
      y: 278,
      w: 828,
      h: 384,
    },
  ],
  shapes: [...ring, ...grid, ...notes],
};

export default spec;
