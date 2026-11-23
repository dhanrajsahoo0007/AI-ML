// Constants and arithmetic for the LoRA, QLoRA & PEFT page and the Distillation & Small Models page
// (finetune/lora-*, qlora-*, peft-*, distill-* specs). Every number the figures and the pages share comes from here.
//
// Sources: Hu et al. (2021, arXiv 2106.09685) LoRA: h = W0·x + (α/r)·B·A·x, A random Gaussian, B zero at the start.
// Dettmers et al. (2023, arXiv 2305.14314) QLoRA: NF4 base, double quantisation, paged optimisers; "regular 16-bit
// finetuning of a LLaMA 65B parameter model requires more than 780 GB" (= 65e9 × 12 bytes); constants per weight
// 32/64 = 0.5 bit, with double quantisation 8/64 + 32/(64·256) = 0.127 bit. Liu et al. (2024, arXiv 2402.09353) DoRA.
// Hinton et al. (2015, arXiv 1503.02531) distillation.

/** A square attention matrix: d × d. */
export const LORA_D = 4096;
export const LORA_RANKS = [4, 8, 16, 64] as const;
/** Parameters of the two factors for a d × d matrix at rank r: B is d × r, A is r × d, so 2 × d × r. 2 × 4,096 × 8 = 65,536. */
export const loraParams = (d: number, r: number) => 2 * d * r;
/** The full matrix: 4,096 × 4,096 = 16,777,216. */
export const fullParams = (d: number) => d * d;
/** Trainable share, in percent: 65,536 ÷ 16,777,216 = 0.39 %. */
export const loraPercent = (d: number, r: number) => (loraParams(d, r) / fullParams(d)) * 100;

/**
 * A 7 B-class decoder (LLaMA-7B shape, Touvron et al. 2023): hidden 4,096, feed-forward 11,008, 32 layers, 6.74 B
 * parameters. LoRA on all linear layers (q, k, v, o: 4,096 → 4,096; gate, up, down: 4,096 ↔ 11,008) costs, per layer,
 * r × (4 × (4,096 + 4,096) + 3 × (4,096 + 11,008)) = r × 78,080; over 32 layers r × 2,498,560.
 *   r = 8: 19,988,480 · r = 16: 39,976,960 (0.59 % of 6.74 B) · r = 64: 159,907,840 (2.37 %).
 */
export const LLAMA7 = { hidden: 4096, ffn: 11008, layers: 32, params: 6.74e9 } as const;
export const loraAllLinear = (r: number, m: { hidden: number; ffn: number; layers: number } = LLAMA7) =>
  m.layers * r * (4 * (m.hidden + m.hidden) + 3 * (m.hidden + m.ffn));

/**
 * LLaMA-65B shape (Touvron et al. 2023): hidden 8,192, feed-forward 22,016, 80 layers. LoRA r = 64 on all linear layers:
 * 80 × 64 × (4 × 16,384 + 3 × (8,192 + 22,016)) = 80 × 64 × 156,160 = 799,539,200 (about 0.8 B numbers).
 */
export const LLAMA65 = { hidden: 8192, ffn: 22016, layers: 80, params: 65e9 } as const;

/** LoRA scale α/r. With α fixed at 16: r = 4 → 4, r = 8 → 2, r = 16 → 1, r = 64 → 0.25. With α = 2r it stays 2. */
export const loraScale = (alpha: number, r: number) => alpha / r;

/** QLoRA memory. Bytes per parameter: 16-bit weight 2; the 12-byte full fine-tune is 2 weight + 2 gradient + 8 Adam. */
export const FULL_FT_BYTES = 12;
/** NF4 with block size 64: 4 bits + 0.5 bit of 32-bit constants = 4.5 bits; double quantisation: 4 + 0.127 = 4.127. */
export const NF4_BITS = 4.5;
export const NF4_DQ_BITS = 4.127;
export const gb = (params: number, bytesPerParam: number) => (params * bytesPerParam) / 1e9;
export const gbBits = (params: number, bits: number) => (params * bits) / 8 / 1e9;
/** The two model sizes: 7 B, and 65 B as in the QLoRA paper. */
export const QLORA_MODELS = [
  { id: "7b", label: "7 B", params: 7e9 },
  { id: "65b", label: "65 B", params: 65e9 },
] as const;

/** Distillation (Hinton et al. 2015): q_i = exp(z_i / T) ÷ Σ_j exp(z_j / T). */
export const softmax = (z: readonly number[], t: number) => {
  const e = z.map((x) => Math.exp(x / t));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};
/** KL(p ‖ q) in nats. */
export const kl = (p: readonly number[], q: readonly number[]) => p.reduce((a, x, i) => a + x * Math.log(x / q[i]), 0);
/**
 * Four candidate first words of a reply to the refund case, with the teacher's logits and a student part-way through
 * training (illustrative). At T = 1 teacher: 0.865, 0.117, 0.016, 0.002. At T = 4: 0.455, 0.276, 0.167, 0.102.
 * Student at T = 4: 0.325, 0.325, 0.197, 0.153. KL(teacher ‖ student) at T = 4 = 0.039; × T² = 0.63.
 */
export const DISTILL_TOKENS = ["Refund", "Replace", "Escalate", "Decline"] as const;
export const TEACHER_LOGITS = [6, 4, 2, 0] as const;
export const STUDENT_LOGITS = [3, 3, 1, 0] as const;
export const DISTILL_T = 4;

/**
 * Daily cost, from the Brightpost traffic (440 M input and 50 M output tokens a day). Prices per million tokens are
 * ILLUSTRATIVE, not any provider's list: teacher \$3 in / \$15 out; student \$0.15 in / \$0.60 out.
 *   teacher: 440 × 3 + 50 × 15 = 1,320 + 750 = \$2,070 a day · student: 440 × 0.15 + 50 × 0.60 = 66 + 30 = \$96 a day.
 *   ratio 21.6×; a year: 2,070 × 365 = \$755,550 vs 96 × 365 = \$35,040.
 * One-off labelling of the 5,000 training prompts by the teacher: 5,000 × 2,200 = 11 M in, 5,000 × 250 = 1.25 M out →
 * 11 × 3 + 1.25 × 15 = 33 + 18.75 = \$51.75.
 */
export const PRICE = { teacher: { in: 3, out: 15 }, student: { in: 0.15, out: 0.6 } } as const;
export const dailyCost = (p: { in: number; out: number }, inM: number, outM: number) => p.in * inM + p.out * outM;

// ── Small shape helpers shared by the finetune specs ─────────────────────────────────────────────────────────────

import type { LayoutShape, LayoutTone } from "../types";

/** A one-line (or "\n" multi-line) annotation, centred in a w × h box at (x, y). Tone defaults to neutral. */
export const note = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  opts: { tone?: LayoutTone; step?: number; h?: number } = {}
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: opts.h ?? 18 * label.split("\n").length,
  label,
  tone: opts.tone ?? "neutral",
  step: opts.step,
});

/** A pastel block. */
export const blockBox = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  opts: { sub?: string; step?: number; highlight?: boolean } = {}
): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h,
  label,
  sub: opts.sub,
  tone,
  fill: "pastel",
  step: opts.step,
  highlight: opts.highlight,
});

/** An arrow between two shape ids, with optional route points. */
export const link = (
  id: string,
  from: string,
  to: string,
  opts: { step?: number; via?: [number, number][]; dashed?: boolean } = {}
): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to, step: opts.step, via: opts.via, dashed: opts.dashed });

/** A left-aligned annotation: the box is sized to the text so it starts at x. */
export const leftNote = (
  id: string,
  x: number,
  y: number,
  label: string,
  opts: { tone?: LayoutTone; step?: number } = {}
): LayoutShape => note(id, x, y, Math.ceil(Math.max(...label.split("\n").map((l) => l.length)) * 5.7) + 8, label, opts);
