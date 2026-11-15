// Constants for the LLM Serving & Inference page (llm-serving-inference.mdx) and its figures in
// assets/diagrams/animated/serving/: request-path and latency-budget. Brightpost's whole serving system at its peak of
// 12 requests a second: the latency budget of one answer and the replica count the worked example arrives at. Shared
// names and numbers come from ./production; the model shape and KV-cache sizes come from ./production-engine, so the
// serving page and the engine page quote the same memory figures.

import { PROMPT } from "./rag";
import { LATENCY, TOKENS, TRAFFIC } from "./production";
import { KV } from "./production-engine";

/**
 * The latency budget of one answer, in milliseconds, measured from the moment the request reaches a replica
 * (illustrative budget, not a measurement; the gateway's few milliseconds before that are on llm-gateway). The two
 * targets come from LATENCY (presets/rag.ts LATENCY_MS): first token at 400 ms, full answer at 1,500 ms.
 *   queue wait at the replica             = 80 ms (illustrative)
 *   prefill of the 2,200-token prompt     = 400 − 80 = 320 ms (what is left of the first-token target)
 *   → time to first token                 = 80 + 320 = 400 ms
 *   decode of 250 tokens at 4.4 ms each   = 250 × 4.4 = 1,100 ms (LATENCY.decodeMsPerToken)
 *   → full answer                         = 400 + 1,100 = 1,500 ms
 * Decode rate per answer = 1,000 ÷ 4.4 = 227 tokens/s.
 */
const QUEUE_MS = 80;
const PREFILL_MS = LATENCY.firstTokenMs - QUEUE_MS; // 320
const DECODE_MS = Math.round(TOKENS.outputPerRequest * LATENCY.decodeMsPerToken); // 1,100

export const BUDGET = {
  queueMs: QUEUE_MS,
  prefillMs: PREFILL_MS,
  firstTokenMs: QUEUE_MS + PREFILL_MS, // 400
  decodeMs: DECODE_MS,
  fullAnswerMs: QUEUE_MS + PREFILL_MS + DECODE_MS, // 1,500
  decodeTokensPerSec: Math.round(1000 / LATENCY.decodeMsPerToken), // 227
} as const;

if (BUDGET.firstTokenMs !== LATENCY.firstTokenMs || BUDGET.fullAnswerMs !== LATENCY.fullAnswerMs) {
  throw new Error("production-serving: the latency budget no longer adds up to the LATENCY targets");
}

/**
 * Sizing Brightpost's replicas at the peak (the worked example and the request-path figure's three replicas).
 *
 * Token rates at 12 requests/s:
 *   prompt tokens = 12 × 2,200 = 26,400 tokens/s; output tokens = 12 × 250 = 3,000 tokens/s
 *   prompt share  = 2,200 ÷ (2,200 + 250) = 89.8 % ≈ 90 % of all tokens
 * Answers in flight (Little's law): 12 × 1.5 s = 18 (KV.inFlightAtPeak).
 * KV memory for them (paged, ./production-engine): 18 × 308 MiB = 5,544 MiB = 5.4 GiB, next to 16 GB of weights:
 *   memory is not the limit at this traffic.
 * Prefill arithmetic: a forward pass costs about 2 FLOPs per parameter per token (Kaplan et al., 2020, arXiv
 *   2001.08361, C_forward ≈ 2N; the attention term adds about 4 % at 2,200 tokens for this shape and is left out):
 *   per request = 2 × 8 × 10⁹ × 2,200 = 3.52 × 10¹³ FLOPs = 35.2 TFLOP
 *   sustained per GPU = 400 TFLOP/s (illustrative: about 40 % of an H100 SXM's 989 dense BF16 TFLOP/s; NVIDIA lists
 *   1,979 with sparsity, checked November 2026)
 *   GPU time per request = 35.2 ÷ 400 = 0.088 s = 88 ms
 *   at the peak = 12 × 0.088 = 1.056 GPU-seconds of prefill every second: more than one GPU
 *   at the average = 2.3 × 0.088 = 0.20 GPU-seconds per second
 * Replicas: keep prefill under 60 % of each GPU so decode steps and bursts have room (illustrative target):
 *   peak = ⌈1.056 ÷ 0.6⌉ = ⌈1.76⌉ = 2; plus one spare for a failed replica or a burst = 3
 *   average = ⌈0.20 ÷ 0.6⌉ = 1, but never fewer than 2 so one failure does not take the service down
 * Prefix cache: the 200 instruction tokens are identical in every prompt, so a prefix cache skips
 *   200 ÷ 2,200 = 9 % of prefill.
 */
const PARAMS_B = 8;
const SUSTAINED_TFLOPS = 400;
const H100_DENSE_BF16_TFLOPS = 989;
const TARGET_BUSY = 0.6;
const PREFILL_TFLOP = (2 * PARAMS_B * 1e9 * TOKENS.inputPerRequest) / 1e12; // 35.2
const PREFILL_GPU_S = PREFILL_TFLOP / SUSTAINED_TFLOPS; // 0.088
const PEAK_GPU = TRAFFIC.peakPerSecond * PREFILL_GPU_S; // 1.056
const AVG_GPU = TRAFFIC.averagePerSecond * PREFILL_GPU_S; // 0.2024
const PEAK_REPLICAS = Math.ceil(PEAK_GPU / TARGET_BUSY); // 2

export const SIZING = {
  promptTokensPerSec: TRAFFIC.peakPerSecond * TOKENS.inputPerRequest, // 26,400
  outputTokensPerSec: TRAFFIC.peakPerSecond * TOKENS.outputPerRequest, // 3,000
  promptSharePct: Math.round((TOKENS.inputPerRequest / (TOKENS.inputPerRequest + TOKENS.outputPerRequest)) * 100), // 90
  inFlight: KV.inFlightAtPeak, // 18
  kvInFlightMiB: KV.inFlightAtPeak * KV.pagedMiB, // 5,544
  kvInFlightGiB: Math.round(((KV.inFlightAtPeak * KV.pagedMiB) / 1024) * 10) / 10, // 5.4
  paramsB: PARAMS_B,
  prefillTflopPerRequest: Math.round(PREFILL_TFLOP * 10) / 10, // 35.2
  sustainedTflops: SUSTAINED_TFLOPS,
  h100DenseTflops: H100_DENSE_BF16_TFLOPS,
  sustainedPct: Math.round((SUSTAINED_TFLOPS / H100_DENSE_BF16_TFLOPS) * 100), // 40
  prefillMsPerRequest: Math.round(PREFILL_GPU_S * 1000), // 88
  peakGpu: Math.round(PEAK_GPU * 1000) / 1000, // 1.056
  avgGpu: Math.round(AVG_GPU * 100) / 100, // 0.2
  targetBusyPct: TARGET_BUSY * 100, // 60
  peakReplicas: PEAK_REPLICAS, // 2
  spare: 1,
  replicasAtPeak: PEAK_REPLICAS + 1, // 3
  minReplicas: 2,
  prefixSharePct: Math.round((PROMPT.instructionTokens / TOKENS.inputPerRequest) * 100), // 9
} as const;
