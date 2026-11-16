import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, TOKENS, n } from "@/components/diagrams/presets/production";
import { KV } from "@/components/diagrams/presets/production-engine";

// Where one Brightpost answer's KV cache lives (llm-inference-engine). The answer is 2,200 prompt tokens plus 250
// answer tokens = 2,450 tokens; each token's keys and values take 128 KiB in an 8B model shaped like Llama 3.1 8B.
//
// Steps: 1 contiguous: the engine reserves one slab for the longest allowed sequence (8,192 tokens = 1 GiB) when it
// admits the request; 70.1 % of it is never written · 2 paged: 16-token blocks of 2 MiB, handed out as tokens
// arrive, anywhere in the pool, found through a block table · 3 the only slack is the last block: 14 empty slots =
// 1.75 MiB · 4 what fits in a 40 GiB KV pool: 40 slabs against 132 paged answers, with Brightpost's 18 in flight.
//
// All numbers come from KV in presets/production-engine.ts, with the working there:
//   slab = 8,192 × 128 KiB = 1,024 MiB; used = 2,450 × 128 KiB = 306.25 MiB (29.9 %);
//   never used = 5,742 × 128 KiB = 717.75 MiB (70.1 %);
//   paged = ⌈2,450 ÷ 16⌉ = 154 blocks × 2 MiB = 308 MiB; last block 2 of 16 used, 14 × 128 KiB = 1.75 MiB (0.57 %);
//   pool 40 GiB = 20,480 blocks; 40 slabs; ⌊20,480 ÷ 154⌋ = 132 answers; peak 12/s × 1.5 s = 18 in flight.
// Physical block ids (7, 11, 3, 19) and the other answers' blocks in the pool slice are illustrative.
//
// Fact checks (Kwon et al., 2023, arXiv 2309.06180): earlier systems store a request's KV cache in one contiguous
// chunk sized for its maximum length, wasting reserved slots, internal and external fragmentation (§3.1); only
// 20.4 %–38.2 % of their KV memory held token states (Fig. 2). PagedAttention stores the cache in fixed-size blocks
// that need not be contiguous, allocated on demand and mapped by a block table, so only the last block of a sequence
// has empty slots (§4.2–4.3); default block size 16 (§7.2).
//
// Layout (860 wide): three dotted groups stacked. Slab: a bar x 40..820 at 780 ÷ 8,192 px per token. Paged: block
// table x 56..196, pool slice 4 × 10 cells from x 250, last block 4 × 4 from x 694. Fit: bars from x 160 at
// 640 ÷ 132 px per answer. Tones (four plus neutral): prompt tokens orange, answer tokens green, never-used memory
// red (the waste this figure is about), the KV pool groups violet (a store); other answers, free blocks, the
// 18-in-flight marker and frames neutral.

const W = 860;
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step = 1,
  tone: LayoutTone = "neutral",
  h = 18
) => ({ id, type: "text", x, y, w, h, label, tone, step }) as LayoutShape;
const MIB = (v: number) => `${n(v)} MiB`;

// ── Step 1: the contiguous slab ─────────────────────────────────────────────────────────────────────────────────
const SLAB = { x: 40, y: 74, w: 780, h: 40 };
const px = (tokens: number) => Math.round((tokens / KV.maxLen) * SLAB.w);
const promptW = px(TOKENS.inputPerRequest); // 209
const answerW = px(TOKENS.outputPerRequest); // 24

const slab: LayoutShape[] = [
  {
    id: "slab-prompt",
    type: "box",
    x: SLAB.x,
    y: SLAB.y,
    w: promptW,
    h: SLAB.h,
    label: `prompt\n${n(TOKENS.inputPerRequest)}`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
  },
  {
    id: "slab-answer",
    type: "box",
    x: SLAB.x + promptW,
    y: SLAB.y,
    w: answerW,
    h: SLAB.h,
    tone: PROD_TONE.model,
    fill: "pastel",
  },
  {
    id: "slab-unused",
    type: "box",
    x: SLAB.x + promptW + answerW,
    y: SLAB.y,
    w: SLAB.w - promptW - answerW,
    h: SLAB.h,
    label: `reserved, never written\n${n(KV.unusedTokens)} tokens = ${MIB(KV.unusedMiB)} (${KV.unusedPct} %)`,
    tone: PROD_TONE.failure,
    fill: "soft",
  },
  text(
    "slab-answer-label",
    SLAB.x + promptW - 38,
    SLAB.y - 22,
    100,
    `answer ${TOKENS.outputPerRequest}`,
    1,
    PROD_TONE.model
  ),
  text(
    "slab-used",
    SLAB.x,
    SLAB.y + SLAB.h + 8,
    SLAB.w,
    `In use when the answer ends: ${n(KV.requestTokens)} tokens × ${KV.perTokenKiB} KiB = ${MIB(KV.usedMiB)} ` +
      `(${KV.usedPct} % of the slab)`
  ),
];

// ── Steps 2 and 3: blocks, the block table, the pool, the last block ───────────────────────────────────────────
const PAGED_Y = 164; // group top
const TABLE = { x: 56, y: PAGED_Y + 54, w: 64, h: 24, pitch: 28 };
const TABLE_ROWS: [string, string][] = [
  ["0", "7"],
  ["1", "11"],
  ["2", "3"],
  ["⋮", "⋮"],
  [String(KV.answerBlocks - 1), "19"],
];
const table: LayoutShape[] = [
  text("table-title", 40, PAGED_Y + 30, 172, "Block table", 2),
  text("table-logical", TABLE.x, TABLE.y - 2, TABLE.w, "logical", 2),
  text("table-physical", TABLE.x + TABLE.w + 12, TABLE.y - 2, TABLE.w, "physical", 2),
];
TABLE_ROWS.forEach(([logical, physical], r) => {
  const y = TABLE.y + 20 + r * TABLE.pitch;
  const last = r === TABLE_ROWS.length - 1;
  const tone = last ? PROD_TONE.model : r === 3 ? PROD_TONE.infra : PROD_TONE.traffic;
  table.push(
    {
      id: `table-l-${r}`,
      type: "cell",
      x: TABLE.x,
      y,
      w: TABLE.w,
      h: TABLE.h,
      label: logical,
      tone: PROD_TONE.infra,
      fill: "paper",
      step: 2,
      quiet: true,
    },
    {
      id: `table-p-${r}`,
      type: "cell",
      x: TABLE.x + TABLE.w + 12,
      y,
      w: TABLE.w,
      h: TABLE.h,
      label: physical,
      tone,
      fill: r === 3 ? "paper" : "pastel",
      step: 2,
      quiet: true,
    }
  );
});
table.push(
  text("table-total", 40, TABLE.y + 20 + 5 * TABLE.pitch + 2, 172, `${KV.answerBlocks} blocks = ${MIB(KV.pagedMiB)}`, 2)
);

const POOL = { x: 250, y: TABLE.y + 20, cols: 10, rows: 4, w: 36, h: 24, pitch: 40, rowPitch: 28 };
const MINE: Record<number, LayoutTone> = { 7: PROD_TONE.traffic, 11: PROD_TONE.traffic, 3: PROD_TONE.traffic };
MINE[19] = PROD_TONE.model; // the newest block sits at the right edge, next to its zoom
const FREE = new Set([2, 6, 10, 15, 18, 21, 24, 27, 31, 34, 37, 39]);
const pool: LayoutShape[] = [
  text("pool-title", POOL.x, PAGED_Y + 30, POOL.cols * POOL.pitch - 4, "A slice of the GPU's block pool", 2),
];
for (let i = 0; i < POOL.cols * POOL.rows; i++) {
  const mine = MINE[i];
  const free = FREE.has(i);
  pool.push({
    id: `pool-${i}`,
    type: "cell",
    x: POOL.x + (i % POOL.cols) * POOL.pitch,
    y: POOL.y + Math.floor(i / POOL.cols) * POOL.rowPitch,
    w: POOL.w,
    h: POOL.h,
    label: mine ? String(i) : undefined,
    tone: mine ?? PROD_TONE.infra,
    fill: mine ? "pastel" : free ? "paper" : undefined,
    weight: mine || free ? undefined : 0.3, // other answers' blocks: a grey that shows in both themes
    step: 2,
    quiet: true,
  });
}
pool.push(
  text(
    "pool-key",
    POOL.x - 10,
    POOL.y + POOL.rows * POOL.rowPitch + 2,
    POOL.cols * POOL.pitch + 16,
    "Numbered: this answer's blocks. Grey: other answers. Blank: free.",
    2
  )
);

const LAST = { x: 694, y: POOL.y, w: 28, h: 20, pitch: 32, rowPitch: 24 };
const last: LayoutShape[] = [
  text("last-title", LAST.x - 14, PAGED_Y + 30, 4 * LAST.pitch + 24, `Block 19 (logical ${KV.answerBlocks - 1})`, 3),
];
for (let i = 0; i < KV.blockTokens; i++) {
  const used = i < KV.lastBlockTokens;
  last.push({
    id: `last-${i}`,
    type: "cell",
    x: LAST.x + (i % 4) * LAST.pitch,
    y: LAST.y + Math.floor(i / 4) * LAST.rowPitch,
    w: LAST.w,
    h: LAST.h,
    tone: used ? PROD_TONE.model : PROD_TONE.infra,
    fill: used ? "pastel" : "paper",
    step: 3,
    quiet: true,
  });
}
last.push(
  {
    id: "last-zoom",
    type: "arrow",
    x: 0,
    y: 0,
    from: "pool-19",
    to: "last-4",
    dashed: true,
    tone: PROD_TONE.infra,
    step: 3,
  },
  text(
    "last-note",
    LAST.x - 20,
    LAST.y + 4 * LAST.rowPitch + 4,
    4 * LAST.pitch + 36,
    `${KV.lastBlockTokens} of ${KV.blockTokens} slots used.\n${KV.slackTokens} empty × ${KV.perTokenKiB} KiB\n` +
      `= ${KV.slackMiB} MiB (${KV.slackPct} %)`,
    3,
    "neutral",
    54
  )
);

// ── Step 4: what fits in the pool ─────────────────────────────────────────────────────────────────────────────
const FIT_Y = 434; // group top
const BAR = { x: 170, y: FIT_Y + 40, h: 30, pitch: 40, max: 640 };
const perAnswer = BAR.max / KV.fitPaged; // 4.85 px per answer
const markerX = Math.round(BAR.x + KV.inFlightAtPeak * perAnswer); // 257
const fit: LayoutShape[] = [
  text("fit-contiguous-label", 30, BAR.y + 6, 130, "1 GiB slabs", 4),
  {
    id: "fit-contiguous",
    type: "box",
    x: BAR.x,
    y: BAR.y,
    w: Math.round(KV.fitContiguous * perAnswer),
    h: BAR.h,
    label: `${KV.fitContiguous} answers`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 4,
  },
  text("fit-paged-label", 30, BAR.y + BAR.pitch + 6, 130, "16-token blocks", 4),
  {
    id: "fit-paged",
    type: "box",
    x: BAR.x,
    y: BAR.y + BAR.pitch,
    w: BAR.max,
    h: BAR.h,
    label: `${KV.fitPaged} answers at once, ${KV.fitRatio} × as many`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 4,
    highlight: true,
  },
  {
    id: "fit-peak",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [markerX, BAR.y - 8],
      [markerX, BAR.y + BAR.pitch + BAR.h + 8],
    ],
    dashed: true,
    tone: PROD_TONE.infra,
    step: 4,
  },
  text(
    "fit-peak-label",
    markerX - 90,
    BAR.y + BAR.pitch + BAR.h + 10,
    180,
    `Brightpost's peak: ${KV.inFlightAtPeak} in flight`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Paged KV cache: blocks on demand instead of one slab per request",
  width: W,
  height: 640,
  steps: [
    { title: "Contiguous: reserve the longest possible answer up front" },
    { title: "Paged: hand out 16-token blocks as tokens arrive" },
    { title: "The only slack is the last block" },
    { title: "What fits in a 40 GiB KV pool" },
  ],
  groups: [
    {
      id: "contiguous",
      title: `Contiguous: one slab of ${n(KV.maxLen)} tokens × ${KV.perTokenKiB} KiB = 1 GiB per answer`,
      tone: PROD_TONE.store,
      x: 16,
      y: 16,
      w: 828,
      h: 132,
    },
    {
      id: "paged",
      title: `Paged: ${KV.blockMiB} MiB blocks of ${KV.blockTokens} tokens, handed out on demand`,
      tone: PROD_TONE.store,
      x: 16,
      y: PAGED_Y,
      w: 828,
      h: 250,
    },
    {
      id: "fit",
      title: `What fits in a ${KV.poolGiB} GiB KV pool (${n(KV.poolBlocks)} blocks)`,
      tone: PROD_TONE.store,
      x: 16,
      y: FIT_Y,
      w: 828,
      h: 150,
    },
  ],
  shapes: [
    ...slab,
    ...table,
    ...pool,
    ...last,
    ...fit,
    text(
      "footnote",
      20,
      FIT_Y + 160,
      W - 40,
      `${KV.perTokenKiB} KiB per token = 2 (K and V) × 32 layers × 8 KV heads × 128 dims × 2 bytes, for an 8B model ` +
        "shaped like Llama 3.1 8B.\nBlock ids and the 40 GiB pool are illustrative.",
      1,
      "neutral",
      36
    ),
  ],
};

export default spec;
