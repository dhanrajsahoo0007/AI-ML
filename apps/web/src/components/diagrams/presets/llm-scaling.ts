// The running example of "Scaling Laws and LLM Training": one compute budget, C = 8.4 × 10²² FLOPs, the budget of
// the page's 7B-on-2T model (`animated/transformer/compute-estimate`), spent three ways. Every number the page quotes
// beyond that figure's is computed below; the working is written out here.
//
// ── 1. The budget (Kaplan et al. 2020, arXiv 2001.08361 §2.1: C ≈ 6 · N · D) ────────────────────────────────────
//   C = 6 × 7e9 × 2e12 = 8.4e22 FLOPs
//
// ── 2. Chinchilla-optimal split of the same C (Hoffmann et al. 2022, arXiv 2203.15556; ~20 tokens per parameter,
//       Table 3: 10B → 205.1B tokens and 1.23e22 FLOPs, 20.5 tokens per parameter) ───────────────────────────────
//   D = 20 · N and C = 6 · N · D = 120 · N²  →  N = √(C / 120) = √(7e20) = 2.646e10 (26.5B)
//   D = 20 × 2.646e10 = 5.29e11 (529B tokens). Check: 6 × 2.646e10 × 5.29e11 = 8.4e22.
//   The 7B model spends the same C on 2T tokens: 2e12 / 7e9 = 286 tokens per parameter, 14.3× the ratio.
//
// ── 3. Growing the budget 10× (Hoffmann Table 2: N_opt ∝ C^a, D_opt ∝ C^b) ─────────────────────────────────────
//   Chinchilla, a = b = 0.5 (Approach 1; Approach 3 gives 0.46 / 0.54): 10^0.5 = 3.16× each
//     → 26.5B × 3.16 = 83.7B parameters on 529B × 3.16 = 1.67T tokens (still 20 per parameter)
//   Kaplan, a = 0.73, b = 0.27 (Hoffmann §1: "5.5×" model, "1.8×" tokens): 10^0.73 = 5.37×, 10^0.27 = 1.86×
//     → 26.5B × 5.37 = 142B parameters on 529B × 1.86 = 985B tokens: 6.9 tokens per parameter.
//   Both spend 8.4e23 FLOPs (5.37 × 1.86 = 10). Kaplan's rule drifts towards big, under-trained models such as
//   Gopher (280B on 300B tokens, 1.1 per parameter).
//
// ── 4. Serving cost: forward pass ≈ 2 · N FLOPs per token (Kaplan §2.1) ──────────────────────────────────────────
//   7B: 1.4e10 FLOPs per generated token; 26.5B: 5.29e10; ratio 26.5 / 7 = 3.78×. Same training bill, the 7B
//   model is 3.78× cheaper per token to serve; the price is a higher loss than the 26.5B model would reach.
//
// ── 5. Time at a stated utilization ──────────────────────────────────────────────────────────────────────────
//   H100 SXM dense bf16 peak 989 TFLOP/s; 400 TFLOP/s effective is 400 / 989 = 40 % model-FLOPs utilization (MFU).
//   8.4e22 / 4e14 = 2.1e8 GPU-seconds = 58,333 GPU-hours = 2,431 GPU-days → 2.43 days on 1,000 GPUs.
//   Llama 3 405B (Dubey et al. 2024, arXiv 2407.21783 §1, Table 4): 6 × 405e9 × 15.6e12 = 3.79e25 FLOPs (paper:
//   3.8e25), 15.6e12 / 405e9 = 38.5 tokens per parameter; at 400 TFLOP/s per GPU on 16,384 GPUs (Table 4):
//   3.79e25 / (4e14 × 16,384) = 5.78e6 s = 66.9 days of pure compute. Their own scaling law (§3.2.1) asked for
//   402B on 16.55T tokens: 41.2 tokens per parameter.
//
// ── 6. Memory for the 7B model (Rajbhandari et al. 2019, arXiv 1910.02054 §3.1, §5) ────────────────────────────
//   Mixed-precision Adam: 2 (bf16 weights) + 2 (bf16 gradients) + 12 (fp32 master, momentum, variance) = 16 B per
//   parameter → 16 × 7e9 = 112 GB of model states, more than one 80 GB H100 before any activations.
//   ZeRO over N_d = 64 data-parallel GPUs:
//     stage 1 (optimizer states): 4Ψ + 12Ψ / 64 = 28 + 1.31 = 29.3 GB per GPU
//     stage 2 (+ gradients):      2Ψ + 14Ψ / 64 = 14 + 1.53 = 15.5 GB per GPU
//     stage 3 (+ weights):        16Ψ / 64      = 1.75 GB per GPU
//
// ── 7. Pipeline bubble (Narayanan et al. 2021, arXiv 2104.04473 §2.2.1: bubble / ideal time = (p − 1) / m) ──────
//   p = 3 stages, m = 4 micro-batches (the `parallelism-3d` figure): 2 / 4 = 50 % extra time; m = 32: 2 / 32 = 6.3 %.
//
// ── 8. Post-training is cheap (Ouyang et al. 2022, arXiv 2203.02155 §5.1, §3.2) ───────────────────────────────
//   175B SFT 4.9 PF/s-days + PPO-ptx 60 PF/s-days = 64.9 vs GPT-3 pre-training 3,640: 64.9 / 3,640 = 1.8 %.
//   Datasets: SFT about 13k prompts, reward model 33k, PPO 31k.

const sq = (v: number) => Math.sqrt(v);

/** Tokens per parameter for compute-optimal training (Hoffmann et al. 2022). */
const CHINCHILLA_RATIO = 20;

/** The page's budget: the 7B model on 2T tokens, C = 6ND. */
export const BUDGET = { n: 7e9, d: 2e12, c: 6 * 7e9 * 2e12 };

/** The Chinchilla-optimal split of a budget C: D = 20N, C = 6ND = 120N². */
function chinchillaSplit(c: number) {
  const n = sq(c / (6 * CHINCHILLA_RATIO));
  return { n, d: CHINCHILLA_RATIO * n };
}

/** Grow a split by `factor` in compute with exponents a (parameters) and b (tokens), a + b = 1. */
function grow(start: { n: number; d: number }, factor: number, a: number) {
  return { n: start.n * factor ** a, d: start.d * factor ** (1 - a) };
}

export const OPTIMAL = chinchillaSplit(BUDGET.c); // 26.5B on 529B
export const TEN_X = {
  chinchilla: grow(OPTIMAL, 10, 0.5), // 83.7B on 1.67T
  kaplan: grow(OPTIMAL, 10, 0.73), // 142B on 985B
};

/** Mixed-precision Adam bytes per parameter and ZeRO per-GPU memory (GB) for the 7B model on 64 GPUs. */
export const ZERO = (() => {
  const psi = BUDGET.n;
  const nd = 64;
  const gb = (bytes: number) => bytes / 1e9;
  return {
    bytesPerParam: 16,
    baseline: gb(16 * psi),
    stage1: gb(4 * psi + (12 * psi) / nd),
    stage2: gb(2 * psi + (14 * psi) / nd),
    stage3: gb((16 * psi) / nd),
  };
})();

/** Pipeline bubble as a fraction of ideal time, (p − 1) / m. */
export const bubble = (p: number, m: number) => (p - 1) / m;
