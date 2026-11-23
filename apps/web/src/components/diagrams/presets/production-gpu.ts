// Constants and arithmetic for the GPU Performance for LLMs page (serving/gpu-*.ts specs and the page's worked
// example). Every number the figures and the page share comes from here.
//
// Sources (checked November 2026):
//   NVIDIA H100 product page / datasheet, SXM column: 80 GB HBM3, 3.35 TB/s memory bandwidth, 900 GB/s NVLink, BF16
//   Tensor Core 1,979 TFLOPS and FP8 3,958 TFLOPS, both printed "with sparsity". Dense rates are half the printed
//   figures: BF16 989.5 TFLOPS (written 989), FP8 1,979 TFLOPS.
//   Williams, Waterman and Patterson (2009), "Roofline: an insightful visual performance model for multicore
//   architectures", Communications of the ACM 52(4): attainable performance = min(peak compute, bandwidth × intensity),
//   with intensity in operations per byte of memory traffic (the paper's "operational intensity"); the ridge point is
//   where the two limits meet.

import { LATENCY, TOKENS, TRAFFIC } from "./production";

/** The one GPU the roofline is drawn for. */
export const H100 = {
  name: "H100 SXM",
  /** Dense BF16 Tensor Core TFLOPS: NVIDIA prints 1,979 "with sparsity"; dense is half. */
  bf16Tflops: 989,
  /** Dense FP8 Tensor Core TFLOPS (3,958 with sparsity ÷ 2). */
  fp8Tflops: 1_979,
  /** HBM3 bandwidth, TB/s. */
  bandwidthTBs: 3.35,
  memoryGB: 80,
  asOf: "November 2026",
} as const;

/** Ridge point, FLOPs per byte: 989e12 ÷ 3.35e12 = 295.2. */
export const RIDGE = (H100.bf16Tflops * 1e12) / (H100.bandwidthTBs * 1e12);

/** Attainable TFLOPS at an arithmetic intensity (FLOPs per byte): min(peak, bandwidth × intensity). */
export const attainableTflops = (intensity: number) => Math.min(H100.bf16Tflops, H100.bandwidthTBs * intensity);

/**
 * Arithmetic intensity of one weight matrix multiply with `m` token rows (the batch, or the prompt length) against a
 * k × n matrix in 16-bit: FLOPs = 2·m·k·n; bytes = 2·(m·k + k·n + m·n) (inputs, weights, outputs, 2 bytes each).
 * The square 8,192 × 8,192 matrix is the hidden size of a Llama-style 70 B model.
 *   m = 1:     134.2 MFLOP ÷ 134.3 MB = 1.0
 *   m = 32:    4.29 GFLOP ÷ 135.3 MB  = 31.75
 *   m = 2,200: 295.3 GFLOP ÷ 206.3 MB = 1,431
 */
export const matmulIntensity = (m: number, k = 8_192, n = 8_192) => (2 * m * k * n) / (2 * (m * k + k * n + m * n));

/** The three places the prefill-and-decode figure marks. */
export const PHASES = {
  decode1: { label: "Decode, batch 1", rows: 1 },
  decode32: { label: "Decode, batch 32", rows: 32 },
  prefill: { label: "Prefill, 2,200 tokens", rows: TOKENS.inputPerRequest },
} as const;

/** Weight read for the worked example: a 70 B model in 8 bits is 70 GB; one H100 reads it in 70 ÷ 3,350 = 20.9 ms. */
export const WORKED = {
  weightsGB: 70,
  readMs: (70 / (H100.bandwidthTBs * 1000)) * 1000,
  /** Time per token the latency target allows (LATENCY.decodeMsPerToken = 4.4 ms) and the bytes a GPU reads in it. */
  budgetMs: LATENCY.decodeMsPerToken,
  gbPerBudget: (LATENCY.decodeMsPerToken / 1000) * H100.bandwidthTBs * 1000,
  /** Sequences in flight at peak, by Little's law: 12 requests/s × 1.5 s = 18. */
  inFlight: TRAFFIC.peakPerSecond * (LATENCY.fullAnswerMs / 1000),
} as const;

/** Log10 helpers: the roofline is drawn log-log, so data are mapped to decades before they reach `curve`. */
export const lg = (v: number) => Math.log10(v);
export const fromLg = (v: number) => Math.round(10 ** v);
