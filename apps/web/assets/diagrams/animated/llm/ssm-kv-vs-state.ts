import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { matrix, vector } from "@/components/diagrams/presets/transformer";

// Attention vs a state space layer at inference, over four tokens ("kites fly over hills", our own example).
// The attention layer keeps a key and a value for every token it has seen, so its cache gains a column per token.
// The SSM layer keeps one fixed-size state and overwrites it in place, so its memory never grows.
//
// Facts checked:
// - Gu & Dao (2023), Mamba, arXiv 2312.00752: recurrent (autoregressive) inference takes constant time per step and
//   needs no cache of previous elements; higher inference throughput comes from not needing a KV cache.
// - KV cache grows linearly with tokens (efficient-attention page; Lieber et al. 2024, Jamba, Table 1: 32 GB for
//   Mixtral vs 4 GB for Jamba at 256K tokens in 16-bit).
//
// Toy state (computed below, not measured): a diagonal SSM with N = 3 state rows and D = 4 channels,
//   h_t[n][d] = a[n] · h_{t−1}[n][d] + (1 − a[n]) · x_t[d],   a = [0.9, 0.6, 0.3], h_0 = 0.
// With b = 1 − a and x in [0, 1], every entry stays in [0, 1], so the value is also the cell's shade.
// Row 0 forgets slowly (keeps 90%), row 2 quickly (keeps 30%).
//   x(kites) = [0.9, 0.1, 0.4, 0.6]  → h_1 row 0 = 0.1·x = [.09 .01 .04 .06], row 1 = 0.4·x, row 2 = 0.7·x
//   x(fly)   = [0.2, 0.8, 0.5, 0.1]  → h_2 row 0 = 0.9·h_1 + 0.1·x = [.10 .09 .09 .06], …
//   x(over)  = [0.6, 0.3, 0.9, 0.2],  x(hills) = [0.1, 0.7, 0.2, 0.9]
// The thrown Error below guards the [0, 1] range.

const TOKENS = ["kites", "fly", "over", "hills"];
const X: number[][] = [
  [0.9, 0.1, 0.4, 0.6],
  [0.2, 0.8, 0.5, 0.1],
  [0.6, 0.3, 0.9, 0.2],
  [0.1, 0.7, 0.2, 0.9],
];
const DECAY = [0.9, 0.6, 0.3];

const round2 = (v: number) => Math.round(v * 100) / 100;
const states: number[][][] = [];
let h = DECAY.map(() => [0, 0, 0, 0]);
for (const x of X) {
  h = DECAY.map((a, n) => h[n].map((prev, d) => a * prev + (1 - a) * x[d]));
  states.push(h.map((row) => row.map(round2)));
}
if (states.flat(2).some((v) => v < 0 || v > 1)) throw new Error("state left [0, 1]");

const CELL = 28;
const PITCH = 180;
const cx = (t: number) => 260 + t * PITCH; // t = 0..3
const TOKEN_Y = 64;
const K_Y = 136;
const V_Y = K_Y + CELL;
const STATE_Y = 262;
const CACHE: LayoutTone = "orange";
const STATE: LayoutTone = "teal";

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 20
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true });

const shapes: LayoutShape[] = [
  text("title", 20, 18, 820, "One attention layer and one SSM layer read the same four tokens, one at a time", 1),
  text("row-cache", 10, K_Y + 4, 150, "Attention layer:\nKV cache, one column\nper token", 1, CACHE, 52),
  text("row-state", 10, STATE_Y + 16, 150, "SSM layer:\none fixed-size state,\nupdated in place", 1, STATE, 52),
];

TOKENS.forEach((tok, t) => {
  const step = t + 1;
  const left = cx(t) - 2 * CELL;
  shapes.push(
    {
      id: `tok-${t}`,
      type: "box",
      x: cx(t) - 50,
      y: TOKEN_Y,
      w: 100,
      h: 40,
      label: tok,
      sub: `token ${step}`,
      tone: "neutral",
      fill: "pastel",
      step,
    },
    {
      // Points at the newest column, the one this token adds.
      id: `tok-in-${t}`,
      type: "arrow",
      x: left + t * CELL + CELL / 2,
      y: TOKEN_Y + 40,
      w: 0,
      h: K_Y - TOKEN_Y - 40 - 2,
      tone: "neutral",
      step,
      quiet: true,
    },
    // The cache after token t: every earlier key and value is still there, plus the new ones.
    ...vector(`k-${t}`, left, K_Y, step, CACHE, {
      cell: CELL,
      labels: Array.from({ length: step }, (_, i) => `k${i + 1}`),
      step,
    }),
    ...vector(`v-${t}`, left, V_Y, step, CACHE, {
      cell: CELL,
      labels: Array.from({ length: step }, (_, i) => `v${i + 1}`),
      step,
    }),
    text(`cache-size-${t}`, left - 4, V_Y + CELL + 4, 4 * CELL + 8, `${step} × (k, v)`, step, CACHE),
    // The state after token t: same 3 × 4 shape every time.
    ...matrix(`h-${t}`, left, STATE_Y, states[t], STATE, { cell: CELL, showValues: true, step }),
    text(`state-name-${t}`, left - 4, STATE_Y + 3 * CELL + 4, 4 * CELL + 8, `h${step}: 12 numbers`, step, STATE)
  );
  if (t > 0) {
    shapes.push({
      id: `upd-${t}`,
      type: "arrow",
      x: cx(t - 1) + 2 * CELL + 4,
      y: STATE_Y + 1.5 * CELL,
      w: PITCH - 4 * CELL - 8,
      h: 0,
      tone: STATE,
      step,
      quiet: true,
    });
  }
});

const NOTE_Y = STATE_Y + 3 * CELL + 46;
shapes.push(
  text(
    "note",
    20,
    NOTE_Y,
    820,
    "Keep going: after 128,000 tokens the cache holds 128,000 columns in every attention layer,\n" +
      "while the state still holds the same 12 numbers. It cannot keep everything, so it must choose what to keep.",
    4,
    "neutral",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "KV cache grows, SSM state stays fixed",
  width: 860,
  height: NOTE_Y + 52,
  shapes,
  steps: [
    { title: "Token 1: the cache stores k1, v1; the state absorbs “kites”" },
    { title: "Token 2: the cache gains a column; the state is overwritten" },
    { title: "Token 3: three columns of cache; still 12 numbers of state" },
    { title: "Token 4: the cache keeps growing, the state never does" },
  ],
};

export default spec;
