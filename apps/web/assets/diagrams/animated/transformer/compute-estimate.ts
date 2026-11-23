import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// The page's worked compute estimate as a calculation, every number computed below:
//   C ≈ 6 · N · D = 6 × 7e9 × 2e12 = 8.4e22 FLOPs
//   ÷ 400 TFLOP/s = 4e14 FLOP/s effective per GPU → 8.4e22 / 4e14 = 2.1e8 GPU-seconds
//   ÷ 3,600 s per hour → 58,333 GPU-hours (the page: "about 58,000")
//   ÷ 1,000 GPUs → 58.3 hours = 2.43 days (the page says "roughly 2.5 days"; 2.4 is the closer rounding)
//
// Side panel, why 6: per parameter per token, the forward pass costs about 2 FLOPs (one multiply and one add) and the
// backward pass about twice that, 4 (gradients with respect to the activations and to the weights). Kaplan et al.
// (2020, arXiv 2001.08361) §2.1: C_forward ≈ 2N, backward ≈ 2 × forward, so C ≈ 6N per token; 6ND leaves out the
// attention term 2 · n_layer · n_ctx · d_attn, which is small next to 2N at moderate context lengths.
//
// Chinchilla's rule (Hoffmann et al., 2022, arXiv 2203.15556): about 20 tokens per parameter for compute-optimal
// training. Chinchilla: 70e9 parameters on 1.4e12 tokens → 1.4e12 / 70e9 = 20. Gopher: 280e9 on 300e9 tokens → 1.07.
// By 6ND they used similar compute: 6 × 70e9 × 1.4e12 = 5.88e23 and 6 × 280e9 × 300e9 = 5.04e23 FLOPs (the paper
// trained both with the same budget). This page's 7B model: 2e12 / 7e9 = 285.7 tokens per parameter, 14.3 × the
// Chinchilla ratio: over-trained on purpose, so it is cheaper to serve (the page's core concept 7).
//
// 400 TFLOP/s effective is about 40 % of an H100 SXM's dense bf16 peak of 989 TFLOP/s (400 / 989 = 0.40).

const N = 7e9;
const D = 2e12;
const FLOPS_PER = 6;
const GPU_RATE = 400e12;
const GPUS = 1000;
const C = FLOPS_PER * N * D; // 8.4e22
const GPU_SECONDS = C / GPU_RATE; // 2.1e8
const GPU_HOURS = GPU_SECONDS / 3600; // 58,333.3
const HOURS = GPU_HOURS / GPUS; // 58.3
const DAYS = HOURS / 24; // 2.43

const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};
/** 8.4e22 → "8.4 × 10²²" (one decimal unless the mantissa is a whole number, or always with `decimal`). */
function sci(v: number, decimal = false): string {
  const exp = Math.floor(Math.log10(v));
  const m = Math.round((v / 10 ** exp) * 10) / 10;
  const mant = Number.isInteger(m) && !decimal ? String(m) : m.toFixed(1);
  return `${mant} × 10${String(exp)
    .split("")
    .map((d) => SUP[d])
    .join("")}`;
}
const int = (v: number) => Math.round(v).toLocaleString("en-US");

const CHIN = { n: 70e9, d: 1.4e12 };
const GOPHER = { n: 280e9, d: 300e9 };
const ratio = (m: { n: number; d: number }) => m.d / m.n;

const IN_TONE: LayoutTone = "neutral";
const OUT_TONE: LayoutTone = "blue";

const text = (id: string, x: number, y: number, w: number, label: string, h = 20, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h: 44, label, sub, tone, ...extra });

/** Boxes in a row from x, with a sign between each pair. */
function row(
  id: string,
  x: number,
  y: number,
  terms: { label: string; sub?: string; w: number; tone?: LayoutTone; fill?: "pastel" }[],
  signs: string[],
  signW = 24
): LayoutShape[] {
  const out: LayoutShape[] = [];
  terms.forEach((t, i) => {
    out.push(box(`${id}-${i}`, x, y, t.w, t.label, t.sub, t.tone ?? IN_TONE, { fill: t.fill }));
    x += t.w;
    if (i < signs.length) {
      out.push(text(`${id}-sign${i}`, x, y, signW, signs[i], 44));
      x += signW;
    }
  });
  return out;
}

// ── Main calculation ─────────────────────────────────────────────────────────────────────────────────────────
// A grid of four rows, long-hand style: each row starts from the previous row's result (same blue), divides it by
// one more number, and lands its own result in the right-hand column.
const MAIN = { x: 16, y: 40, w: 584, h: 412 };
const COLS = [128, 112, 112, 128];
const SIGN_W = 24;
const GRID_X = 36;
const colLeft = (c: number) => GRID_X + COLS.slice(0, c).reduce((a, w) => a + w + SIGN_W, 0);
const ROW_PITCH = 68;
const rowTop = (r: number) => MAIN.y + 40 + r * ROW_PITCH;

const term = (id: string, r: number, c: number, label: string, sub: string, kind: "in" | "carry" | "out" = "in") =>
  box(id, colLeft(c), rowTop(r), COLS[c], label, sub, kind === "in" ? IN_TONE : OUT_TONE, {
    fill: kind === "out" ? "pastel" : kind === "carry" ? "soft" : undefined,
  });
const sign = (id: string, r: number, c: number, label: string) =>
  text(id, colLeft(c) + COLS[c], rowTop(r), SIGN_W, label, 44);

const divisions = [
  { prev: [sci(C), "FLOPs"], by: [sci(GPU_RATE), "FLOP/s per GPU"], out: [sci(GPU_SECONDS), "GPU-seconds"] },
  { prev: [sci(GPU_SECONDS), "GPU-seconds"], by: ["3,600", "seconds per hour"], out: [int(GPU_HOURS), "GPU-hours"] },
  {
    prev: [int(GPU_HOURS), "GPU-hours"],
    by: [int(GPUS), "GPUs"],
    out: [`${HOURS.toFixed(1)} hours`, `≈ ${DAYS.toFixed(1)} days`],
  },
];
const notes = ["400 TFLOP/s effective:\n≈ 40 % of H100 bf16 peak", "", "on one cluster,\nwith no failures"];

const main: LayoutShape[] = [
  term("f-6", 0, 0, `${FLOPS_PER} FLOPs`, "per param per token"),
  sign("f-x1", 0, 0, "×"),
  term("f-n", 0, 1, sci(N), "parameters N"),
  sign("f-x2", 0, 1, "×"),
  term("f-d", 0, 2, sci(D), "tokens D"),
  sign("f-eq", 0, 2, "="),
  term("f-c", 0, 3, sci(C), "FLOPs C", "out"),
  ...divisions.flatMap((d, k): LayoutShape[] => {
    const r = k + 1;
    const last = k === divisions.length - 1;
    const out: LayoutShape[] = [
      term(`d${k}-prev`, r, 1, d.prev[0], d.prev[1], "carry"),
      sign(`d${k}-div`, r, 1, "÷"),
      term(`d${k}-by`, r, 2, d.by[0], d.by[1]),
      sign(`d${k}-eq`, r, 2, "="),
      { ...term(`d${k}-out`, r, 3, d.out[0], d.out[1], "out"), highlight: last || undefined },
    ];
    if (notes[k]) out.push(text(`d${k}-note`, MAIN.x + 8, rowTop(r) + 4, COLS[0] + 16, notes[k], 36));
    return out;
  }),
  text(
    "main-note",
    MAIN.x + 12,
    rowTop(4) + 28,
    MAIN.w - 24,
    "Real runs take longer: failures, restarts and lower utilization. 6ND also leaves out\n" +
      "attention's own FLOPs, which stay small next to the weights' at moderate context lengths.",
    36
  ),
];

// ── Side panel: why 6, and Chinchilla's rule ─────────────────────────────────────────────────────────────────
const SIDE = { x: 620, w: 244 };
const WHY = { y: 40, h: 136 };
const why: LayoutShape[] = [
  ...row(
    "why",
    SIDE.x + 12,
    WHY.y + 36,
    [
      { label: "2", sub: "forward", w: 60 },
      { label: "4", sub: "backward", w: 60 },
      { label: "6", sub: "per token", w: 60, tone: OUT_TONE, fill: "pastel" },
    ],
    ["+", "="],
    20
  ),
  text(
    "why-note",
    SIDE.x + 8,
    WHY.y + 88,
    SIDE.w - 16,
    "FLOPs per parameter per token: a\nmultiply and an add going forward,\ntwice that for the gradients.",
    44
  ),
];

const CH = { y: 206, h: 246 };
const COL = { name: 72, num: 48 };
const tableX = SIDE.x + 12;
const TABLE_Y = CH.y + 60;
const tableRows = [
  { name: "Chinchilla", n: "70B", d: "1.4T", r: ratio(CHIN).toFixed(0), tone: OUT_TONE, fill: "pastel" as const },
  { name: "Gopher", n: "280B", d: "300B", r: ratio(GOPHER).toFixed(1) },
  { name: "This 7B", n: "7B", d: "2T", r: `≈ ${ratio({ n: N, d: D }).toFixed(0)}` },
];
const colX = [0, COL.name, COL.name + COL.num, COL.name + 2 * COL.num].map((dx) => tableX + dx);
const colW = [COL.name, COL.num, COL.num, COL.num];
const chinchilla: LayoutShape[] = [
  text("ch-head", SIDE.x + 8, CH.y + 18, SIDE.w - 16, "About 20 tokens per parameter", 18),
  ...["", "N", "D", "D / N"].map((l, c) => text(`ch-col${c}`, colX[c], TABLE_Y - 22, colW[c], l, 18)),
  ...tableRows.flatMap((r, i) =>
    [r.name, r.n, r.d, r.r].map((label, c): LayoutShape => ({
      id: `ch-${i}-${c}`,
      type: "cell",
      x: colX[c],
      y: TABLE_Y + i * 26,
      w: colW[c],
      h: 26,
      label,
      tone: c === 3 && r.fill ? r.tone : "neutral",
      fill: c === 3 && r.fill ? "pastel" : "paper",
    }))
  ),
  text(
    "ch-note",
    SIDE.x + 8,
    TABLE_Y + 3 * 26 + 10,
    SIDE.w - 16,
    `Chinchilla used about Gopher's\ncompute (${sci(6 * CHIN.n * CHIN.d).split(" ")[0]} vs ${sci(6 * GOPHER.n * GOPHER.d, true)} FLOPs)\nand won.`,
    52
  ),
  text(
    "ch-note2",
    SIDE.x + 8,
    TABLE_Y + 3 * 26 + 66,
    SIDE.w - 16,
    `This 7B runs ${(ratio({ n: N, d: D }) / 20).toFixed(0)}× past the ratio:\ncheaper to serve.`,
    36
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Estimating training compute with 6ND",
  width: 880,
  height: MAIN.y + MAIN.h + 16,
  groups: [
    { id: "main", title: "7B parameters on 2T tokens", tone: "neutral", ...MAIN },
    { id: "why", title: "Why 6?", tone: "neutral", x: SIDE.x, w: SIDE.w, ...WHY },
    { id: "chinchilla", title: "Chinchilla's rule", tone: "neutral", x: SIDE.x, w: SIDE.w, ...CH },
  ],
  shapes: [...main, ...why, ...chinchilla],
};

export default spec;
