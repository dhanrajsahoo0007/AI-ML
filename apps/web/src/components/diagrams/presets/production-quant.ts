// Constants and arithmetic for the Quantization & Optimization page (serving/quant-*.ts specs and the page's worked
// example). Every number the figures and the page share comes from here.
//
// Sources:
//   Dettmers et al. (2022, arXiv 2208.07339), LLM.int8(): per-row absmax scaling; outlier feature dimensions of
//   magnitude ≥ 6.0 (about 0.1 % of dimensions) kept in 16 bit; outliers become systematic at about 6.7 B parameters.
//   Frantar et al. (2022, arXiv 2210.17323), GPTQ; Lin et al. (2023, arXiv 2306.00978), AWQ; Xiao et al. (2022,
//   arXiv 2211.10438), SmoothQuant.
//
// The number-line figure uses the simplest scheme: symmetric "absmax" rounding to signed 4-bit integers in −7..7
// (the code −8 is left unused so zero sits in the middle). scale = max|w| ÷ 7; code = round(w ÷ scale); the
// dequantised value is code × scale; error = |w − code × scale|.

/** The model sizes and widths of the memory figure (bytes = parameters × bits ÷ 8). */
export const QUANT_MODELS = [
  { id: "7b", label: "7 B", params: 7e9 },
  { id: "70b", label: "70 B", params: 70e9 },
] as const;
export const QUANT_BITS = [16, 8, 4] as const;
/** The GPU in the memory figure: 80 GB (decimal gigabytes). */
export const GPU_GB = 80;
/** Illustrative memory bandwidth for the "read the weights once" time: 3 TB/s (as on the speculative decoding page). */
export const BANDWIDTH_TB_S = 3;

/** Weight bytes in GB (10^9 bytes) for `params` parameters at `bits` bits each. 70 B at 16 bit: 70e9 × 16 ÷ 8 = 140. */
export const weightsGB = (params: number, bits: number) => (params * bits) / 8 / 1e9;
/** Milliseconds to read `gb` once at the illustrative bandwidth: 140 GB ÷ 3,000 GB/s = 46.7 ms. */
export const readMs = (gb: number) => (gb / (BANDWIDTH_TB_S * 1000)) * 1000;
/** Extra bits per weight from group scales: one 16-bit scale per group (plus an optional 16-bit zero point). */
export const groupOverheadBits = (group: number, zeroPoint = false) => (16 * (zeroPoint ? 2 : 1)) / group;

/** Round half away from zero is never hit by the figure's weights; Math.round is enough. */
export function absmaxQuantise(weights: number[], levels = 7) {
  const scale = Math.max(...weights.map(Math.abs)) / levels;
  return {
    scale,
    items: weights.map((w) => {
      const code = Math.max(-levels, Math.min(levels, Math.round(w / scale)));
      const value = code * scale;
      return { w, code, value, error: Math.abs(w - value) };
    }),
  };
}

/**
 * The six everyday weights (16-bit values) and the one outlier. Step 1 quantises the six alone; step 2 adds the
 * outlier to the same group, which stretches the scale.
 *   Six alone:    max 0.91, scale 0.13; errors 0.06, 0.05, 0.01, 0.04, 0.01, 0.00; mean 0.028.
 *   With outlier: max 2.80, scale 0.40; errors on the six 0.04, 0.07, 0.12, 0.09, 0.02, 0.11; mean 0.075 (2.7× larger).
 */
export const QUANT_WEIGHTS = [-0.84, -0.47, -0.12, 0.09, 0.38, 0.91] as const;
export const QUANT_OUTLIER = 2.8;
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
