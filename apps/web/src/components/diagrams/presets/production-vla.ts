// Constants and arithmetic for the Robotics & Vision-Language-Action Models page (specs in
// assets/diagrams/animated/multimodal/vla-*.ts and action-tokenization.ts).
//
// Sources (papers read 16 November 2026):
//   RT-2 (Brohan et al., 2023, arXiv 2307.15818): the action is 6-DoF end-effector displacement (position and
//     rotation), a gripper extension and a discrete episode-termination command; every continuous dimension is
//     discretised uniformly into 256 bins, so an action is 8 integers, written as a string such as "1 128 91 241 5 101
//     127"; for PaLM-E the 256 least-used tokens are overwritten with the action vocabulary; the 55 B model runs at 1-3
//     Hz, the 5 B model at about 5 Hz.
//   OpenVLA (Kim et al., 2024, arXiv 2406.09246): 7 B parameters (a Prismatic VLM: SigLIP + DinoV2 vision encoders, a
//     2-layer MLP projector, Llama 2 7 B); trained on 970 k robot episodes (Open X-Embodiment); 7-dimensional actions,
//     each dimension in one of 256 bins whose width divides the interval between the 1st and 99th quantile of the
//     training actions; the 256 least-used Llama tokens are overwritten; trained on 64 A100 GPUs for 14 days (21,500
//     A100-hours); inference needs 15 GB in bfloat16 and runs at about 6 Hz on one RTX 4090; beats RT-2-X (55 B) by 16.5
//     points of absolute success over 29 tasks with 7x fewer parameters.
//   pi0 (Black et al., 2024, arXiv 2410.24164): PaliGemma (3 B) plus a 300 M-parameter action expert initialised from
//     scratch = 3.3 B; flow matching produces an action chunk of H = 50 actions; control at up to 50 Hz; inference
//     every 0.8 s (after 16 actions) for the 20 Hz robots and every 0.5 s (after 25 actions) for the 50 Hz robots;
//     73 ms on-board inference per chunk on an RTX 4090 (14 ms image encoders + 32 ms observation pass + 27 ms flow).

/** OpenVLA's published numbers. 1,000 ÷ 6 = 167 ms per action; 7 tokens × 6 Hz = 42 tokens a second. */
export const OPENVLA = {
  params: "7 B",
  episodes: "970 k",
  dims: 7,
  bins: 256,
  hz: 6,
  periodMs: Math.round(1000 / 6),
  tokensPerSecond: 7 * 6,
  memoryGb: 15,
  gpu: "RTX 4090",
} as const;

/** pi0's published numbers. */
export const PI0 = {
  vlm: "3 B",
  expert: "300 M",
  total: "3.3 B",
  chunk: 50,
  maxHz: 50,
  flowSteps: 10,
  inferenceMs: 73,
} as const;

/** RT-2's published control rates (Hz). */
export const RT2 = { bins: 256, bigHz: "1-3", smallHz: "about 5" } as const;

// ── The tokenisation worked example ────────────────────────────────────────────────────────────────────────────────

/**
 * One step of a warehouse arm reaching for the kettle's tote. The values are ILLUSTRATIVE; so are the ranges (OpenVLA
 * sets each range from the 1st to 99th quantile of its training actions). Seven dimensions, 256 bins each:
 *   bin = min(255, floor((value − lo) ÷ (hi − lo) × 256));  decoded = lo + (bin + 0.5) × (hi − lo) ÷ 256.
 *   Δx = +0.012 m in [−0.02, 0.02]: (0.032 ÷ 0.04) × 256 = 204.8 → bin 204; bin width 0.04 ÷ 256 = 0.156 mm.
 */
export const ACTION_DIMS = [
  { name: "Δx", unit: "m", lo: -0.02, hi: 0.02, value: 0.012 },
  { name: "Δy", unit: "m", lo: -0.02, hi: 0.02, value: -0.004 },
  { name: "Δz", unit: "m", lo: -0.02, hi: 0.02, value: -0.015 },
  { name: "Δroll", unit: "rad", lo: -0.1, hi: 0.1, value: 0 },
  { name: "Δpitch", unit: "rad", lo: -0.1, hi: 0.1, value: 0.01 },
  { name: "Δyaw", unit: "rad", lo: -0.1, hi: 0.1, value: 0.05 },
  { name: "grip", unit: "", lo: 0, hi: 1, value: 1 },
] as const;

export const binOf = (value: number, lo: number, hi: number, bins = 256) =>
  Math.min(bins - 1, Math.max(0, Math.floor(((value - lo) / (hi - lo)) * bins)));

/** The bin's centre, the value the robot receives back: lo + (bin + 0.5) × width. */
export const decode = (bin: number, lo: number, hi: number, bins = 256) => lo + ((bin + 0.5) * (hi - lo)) / bins;

export const ACTION_TOKENS = ACTION_DIMS.map((d) => {
  const bin = binOf(d.value, d.lo, d.hi);
  return { ...d, bin, widthMm: ((d.hi - d.lo) / 256) * 1000, decoded: decode(bin, d.lo, d.hi) };
});
