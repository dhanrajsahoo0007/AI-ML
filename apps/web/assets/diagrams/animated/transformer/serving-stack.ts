import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// A modern LLM serving stack, replacing the Mermaid under "Architecture" on the Efficient Attention page. Requests come
// in on the left and tokens stream out on the right; between them a scheduler batches continuously, prefill writes the
// prompt's keys and values into a paged KV cache, and the decode loop reads the whole cache and appends one token's
// keys and values per step. Side annotations (dashed): the FlashAttention kernel serves both prefill and decode; GQA
// makes every cache entry smaller.
//
// Facts checked:
// - Continuous (iteration-level) batching: the scheduler re-forms the batch at every decode step, so a finished
//   sequence's slot goes to a waiting request at once (Yu et al., 2022, Orca; vLLM, Kwon et al., 2023, arXiv
//   2309.06180). The grid: A finishes after step 3 and D starts in its slot at step 4; C finishes after step 1 and E
//   starts at step 2; B runs all 6 steps.
// - Prefill processes the whole prompt in large matrix multiplications (compute-bound); decode makes one token per
//   sequence per step and re-reads the weights and the whole KV cache (memory-bandwidth-bound). Page, core concept 1.
// - PagedAttention (Kwon et al., 2023, §4): the cache lives in fixed-size blocks allocated on demand, mapped per
//   sequence by a block table, so only a sequence's last block has empty slots; sequences with the same prefix share
//   its blocks (§4.4, shared prefix). Drawn with 4 tokens per block; vLLM's default block size is 16 tokens.
//   Sequence A: shared prefix block + 3 blocks (last one 1 of 4 filled) = 4 + 4 + 4 + 1 = 13 tokens.
//   Sequence B: shared prefix block + 2 blocks (last one 2 of 4 filled) = 4 + 4 + 2 = 10 tokens.
// - FlashAttention (Dao et al., 2022, arXiv 2205.14135) is an exact attention kernel used in both phases.
// - GQA (Ainslie et al., 2023, arXiv 2305.13245) stores fewer KV heads, so each token's cache entry is smaller
//   (8 KV heads instead of 64 cuts it 8×, page core concept 4).

const W = 880;
const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 18) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const free = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "arrow", x, y, w, h, tone: "neutral", ...opts });

// ── Top band: requests → scheduler → … → streamed tokens ──────────────────────────────────────────────────────

const SCHED = { x: 196, y: 56, w: 488, h: 156 };
const SLOTS = ["AAADDD", "BBBBBB", "CEEEEE"];
const NEW = new Set(["D", "E"]); // requests that join while others run
const COL = 36; // column pitch
const CW = 32; // cell width
const RH = 22; // row height
const ROW_PITCH = 26;
const GRID_W = 5 * COL + CW; // 212
const LABEL_W = 60;
const GRID_X = SCHED.x + (SCHED.w - (LABEL_W + 8 + GRID_W)) / 2 + LABEL_W + 8;
const GRID_Y = 102;

function scheduler(): LayoutShape[] {
  const out: LayoutShape[] = [text("step-title", GRID_X - LABEL_W - 8, GRID_Y - 24, LABEL_W, "step")];
  for (let c = 0; c < 6; c++) out.push(text(`step-${c}`, GRID_X + c * COL, GRID_Y - 24, CW, String(c + 1)));
  SLOTS.forEach((row, r) => {
    const y = GRID_Y + r * ROW_PITCH;
    out.push(text(`slot-${r}`, GRID_X - LABEL_W - 8, y + 2, LABEL_W, `slot ${r + 1}`));
    [...row].forEach((seq, c) =>
      out.push({
        id: `slot-${r}-${c}`,
        type: "cell",
        x: GRID_X + c * COL,
        y,
        w: CW,
        h: RH,
        label: seq,
        tone: "neutral",
        fill: NEW.has(seq) ? undefined : "paper",
        weight: NEW.has(seq) ? 0.7 : undefined,
        quiet: true,
      })
    );
  });
  out.push(
    text(
      "sched-note",
      SCHED.x + 16,
      GRID_Y + 3 * ROW_PITCH + 6,
      SCHED.w - 32,
      "D and E (shaded) join the batch the moment A and C finish."
    )
  );
  return out;
}

// ── Middle band: prefill, FlashAttention, decode ─────────────────────────────────────────────────────────────

const MID_Y = 268;
const MID_H = 58;
const prefill: LayoutShape = {
  id: "prefill",
  type: "box",
  x: 230,
  y: MID_Y,
  w: 200,
  h: MID_H,
  label: "Prefill: whole prompt\nin parallel",
  sub: "compute-bound",
  tone: "neutral",
  fill: "pastel",
};
const flash: LayoutShape = {
  id: "flash",
  type: "box",
  x: 466,
  y: MID_Y,
  w: 150,
  h: MID_H,
  label: "FlashAttention\nkernel",
  sub: "exact, tiled",
  tone: ROLE_TONE.attention,
  fill: "pastel",
};
const decode: LayoutShape = {
  id: "decode",
  type: "box",
  x: 652,
  y: MID_Y,
  w: 208,
  h: MID_H,
  label: "Decode: one token\nper step",
  sub: "memory-bound",
  tone: "neutral",
  fill: "pastel",
};

// ── Bottom band: the paged KV cache ──────────────────────────────────────────────────────────────────────────

const CACHE = { x: 24, y: 400, w: 836, h: 196 };
const C = 16; // one token slot of one block row
const BLOCK = 4 * C; // 4 tokens per block
const BLOCK_GAP = 14;
const ROW_A = 432;
const ROW_B = 522;
const P = { x: 300, y: (ROW_A + ROW_B) / 2 };
const CHAIN_X = P.x + BLOCK + 44; // first block after the prefix

/** One block: a teal row of keys over a violet row of values, `filled` of 4 token slots used. */
function block(id: string, x: number, y: number, filled: number, tone?: LayoutTone): LayoutShape[] {
  const out: LayoutShape[] = [];
  for (let t = 0; t < 4; t++)
    (["k", "v"] as const).forEach((part, r) => {
      const used = t < filled;
      out.push({
        id: `${id}-${part}${t}`,
        type: "cell",
        x: x + t * C,
        y: y + r * C,
        w: C,
        h: C,
        tone: tone ?? (used ? (part === "k" ? ROLE_TONE.key : ROLE_TONE.value) : "neutral"),
        fill: used && !tone ? "pastel" : "soft",
        quiet: true,
      });
    });
  return out;
}

/** A sequence after the shared prefix: its blocks in a row, the last one partly filled. */
function chain(seq: "a" | "b", y: number, fills: number[]): LayoutShape[] {
  return fills.flatMap((f, i) => block(`${seq}${i + 1}`, CHAIN_X + i * (BLOCK + BLOCK_GAP), y, f));
}

/** Plain elbow line from the prefix block to the first block of a sequence. */
const fork = (id: string, y: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [P.x + BLOCK + 2, P.y + C],
    [P.x + BLOCK + 22, P.y + C],
    [P.x + BLOCK + 22, y + C],
    [CHAIN_X - 4, y + C],
  ],
  head: true,
  tone: "neutral",
});

const chainEnd = (n: number) => CHAIN_X + n * (BLOCK + BLOCK_GAP) - BLOCK_GAP;
const POOL_X = 700;
const POOL_Y = 512;

function cache(): LayoutShape[] {
  return [
    // Legend, under the group's title tab.
    { id: "leg-k", type: "cell", x: 48, y: 432, w: C, h: C, tone: ROLE_TONE.key, fill: "pastel", quiet: true },
    text("leg-k-text", 68, 431, 40, "keys", ROLE_TONE.key),
    { id: "leg-v", type: "cell", x: 116, y: 432, w: C, h: C, tone: ROLE_TONE.value, fill: "pastel", quiet: true },
    text("leg-v-text", 136, 431, 52, "values", ROLE_TONE.value),
    text("leg-block", 40, 456, 170, "one block = 4 tokens"),
    // The shared prefix, stored once.
    ...block("p", P.x, P.y, 4),
    text("p-label", P.x - 124, P.y - 2, 116, "shared prefix\n(system prompt)", "neutral", 36),
    fork("fork-a", ROW_A),
    fork("fork-b", ROW_B),
    ...chain("a", ROW_A, [4, 4, 1]),
    ...chain("b", ROW_B, [4, 2]),
    text("a-label", chainEnd(3) + 12, ROW_A + 7, 110, "sequence A", "neutral"),
    text("b-label", chainEnd(2) + 12, ROW_B + 7, 110, "sequence B", "neutral"),
    // Free blocks, handed out on demand.
    text("pool-label", POOL_X - 6, POOL_Y - 26, 2 * BLOCK + BLOCK_GAP + 12, "free blocks"),
    ...block("free1", POOL_X, POOL_Y, 0, "neutral"),
    ...block("free2", POOL_X + BLOCK + BLOCK_GAP, POOL_Y, 0, "neutral"),
    text(
      "cache-note",
      CACHE.x + 16,
      CACHE.y + CACHE.h - 30,
      CACHE.w - 32,
      "Blocks are allocated as a sequence grows, so only its last block has empty slots."
    ),
  ];
}

// ── GQA, below the cache ─────────────────────────────────────────────────────────────────────────────────────

const GQA_Y = CACHE.y + CACHE.h + 44;
const gqa: LayoutShape = {
  id: "gqa",
  type: "box",
  x: 120,
  y: GQA_Y,
  w: 200,
  h: 44,
  label: "GQA: fewer KV heads",
  sub: "smaller K and V per token",
  tone: "neutral",
  fill: "pastel",
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "An LLM serving stack: batching, prefill, paged KV cache and decode",
  width: W,
  height: GQA_Y + 44 + 28,
  groups: [
    { id: "g-sched", title: "Scheduler: continuous batching", tone: "neutral", ...SCHED },
    { id: "g-cache", title: "Paged KV cache", tone: "neutral", ...CACHE },
  ],
  shapes: [
    {
      id: "requests",
      type: "box",
      x: 24,
      y: 112,
      w: 132,
      h: 44,
      label: "Incoming\nrequests",
      tone: "neutral",
    },
    ...scheduler(),
    {
      id: "tokens",
      type: "box",
      x: 728,
      y: 112,
      w: 132,
      h: 44,
      label: "Streamed\ntokens",
      tone: "neutral",
    },
    prefill,
    flash,
    decode,
    ...cache(),
    gqa,
    // Flow.
    free("req>sched", 156, 134, SCHED.x - 156, 0),
    free("sched>prefill", 330, SCHED.y + SCHED.h + 4, 0, MID_Y - 4 - (SCHED.y + SCHED.h + 4), {
      label: "new prompts",
    }),
    free("sched>decode", 672, SCHED.y + SCHED.h + 4, 0, MID_Y - 4 - (SCHED.y + SCHED.h + 4), {
      label: "running batch",
    }),
    free("decode>tokens", 820, MID_Y - 4, 0, 112 + 44 + 4 - (MID_Y - 4), { label: "each step" }),
    free("prefill>cache", 330, MID_Y + MID_H + 4, 0, CACHE.y - 4 - (MID_Y + MID_H + 4), {
      label: "write prompt K, V",
    }),
    free("decode>cache", 694, MID_Y + MID_H + 4, 0, CACHE.y - 4 - (MID_Y + MID_H + 4), {
      label: "append new K, V",
    }),
    free("cache>decode", 816, CACHE.y - 4, 0, MID_Y + MID_H + 4 - (CACHE.y - 4), { label: "read all K, V" }),
    // Side annotations.
    { id: "flash>prefill", type: "arrow", x: 0, y: 0, from: "flash", to: "prefill", dashed: true, tone: "orange" },
    { id: "flash>decode", type: "arrow", x: 0, y: 0, from: "flash", to: "decode", dashed: true, tone: "orange" },
    free("gqa>cache", 220, GQA_Y - 4, 0, CACHE.y + CACHE.h + 4 - (GQA_Y - 4), { dashed: true }),
    text(
      "block-size",
      360,
      GQA_Y + 4,
      480,
      "Drawn with 4 tokens per block; vLLM's default is 16.\nThe decode loop runs once per generated token.",
      "neutral",
      36
    ),
  ],
};

export default spec;
