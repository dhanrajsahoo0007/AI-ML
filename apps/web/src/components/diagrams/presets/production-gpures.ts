// Constants and arithmetic for the GPU/TPU Resource Management page (serving/gpu-sharing-modes, gpu-bin-packing and
// gpu-priority-queue). Page-only; imports the shared Brightpost numbers from presets/production.ts.
//
// Sources:
//   NVIDIA MIG user guide, "Supported MIG Profiles" (H100 80GB): 1g.10gb x7, 1g.20gb x4, 2g.20gb x3, 3g.40gb x2,
//   4g.40gb x1, 7g.80gb x1; a GPU has 7 compute slices and 8 memory slices (checked November 2026).
//   Llama 3 configs (Hugging Face): 8 B = 32 layers, 8 KV heads, hidden 4096, 32 heads (head dim 128);
//   70 B = 80 layers, 8 KV heads, hidden 8192, 64 heads (head dim 128). Grouped-query attention: 8 KV heads each.
//   Kubernetes pod priority and preemption docs; vLLM engine arguments (`--scheduling-policy priority`).

import { LATENCY, TOKENS, TRAFFIC } from "./production";

/** One H100-class GPU: 80 GB (decimal gigabytes, 10^9 bytes). */
export const GPU_GB = 80;
/** Illustrative reserve per GPU for the CUDA context, activations and headroom: 10 % of 80 GB. */
export const RESERVE_GB = 8;

/** KV bytes per token = 2 (K and V) x layers x KV heads x head dim x 2 bytes (16-bit cache). */
export const kvBytesPerToken = (layers: number, kvHeads: number, headDim: number) => 2 * layers * kvHeads * headDim * 2;
/** 70 B model: 2 x 80 x 8 x 128 x 2 = 327,680 bytes per token. */
export const KV_70B = kvBytesPerToken(80, 8, 128);
/** 8 B model: 2 x 32 x 8 x 128 x 2 = 131,072 bytes per token. */
export const KV_8B = kvBytesPerToken(32, 8, 128);

/** Tokens one request holds at its longest: 2,200 prompt + 250 answer = 2,450. */
export const REQUEST_TOKENS = TOKENS.inputPerRequest + TOKENS.outputPerRequest;
/** GB of KV cache one request holds at full length. 70 B: 2,450 x 327,680 = 0.803 GB. 8 B: 2,450 x 131,072 = 0.321 GB. */
export const requestKvGB = (bytesPerToken: number) => (REQUEST_TOKENS * bytesPerToken) / 1e9;
/** Requests in flight at peak (Little's law): 12 requests/s x 1.5 s = 18. */
export const IN_FLIGHT = Math.round(TRAFFIC.peakPerSecond * (LATENCY.fullAnswerMs / 1000));
/** Requests whose full-length KV cache fits in `gb` of KV budget (rounded down). */
export const requestsThatFit = (gb: number, bytesPerToken: number) => Math.floor(gb / requestKvGB(bytesPerToken));

/** Weights in GB at 8 bits: parameters x 1 byte. */
export const fp8GB = (paramsB: number) => paramsB;
/** Weights in GB at 16 bits: parameters x 2 bytes. */
export const fp16GB = (paramsB: number) => paramsB * 2;

/** The plans. Plan A: the 70 B model (FP8, 70 GB) alone on one GPU. KV budget = 80 - 70 - 8 = 2 GB. */
export const PLAN_A = { weights: fp8GB(70), kv: GPU_GB - fp8GB(70) - RESERVE_GB } as const;
/** Plan B: the 70 B model split over two GPUs (tensor parallel): 35 GB each, KV budget 80 - 35 - 8 = 37 GB each. */
export const PLAN_B_BIG = { weights: fp8GB(70) / 2, kv: GPU_GB - fp8GB(70) / 2 - RESERVE_GB } as const;
/** Plan B, third GPU: 8 B FP8 triage (8 GB) + 8 B FP16 summariser (16 GB); KV budget 80 - 24 - 8 = 48 GB. */
export const PLAN_B_SMALL = {
  triage: fp8GB(8),
  summariser: fp16GB(8),
  kv: GPU_GB - fp8GB(8) - fp16GB(8) - RESERVE_GB,
} as const;

/** Priority-queue figure: one request per 100 ms slot (illustrative); 8 batch requests wait ahead of one interactive. */
export const SLOT_MS = 100;
export const BATCH_AHEAD = 8;
/** First come first served: the interactive request waits for 8 slots = 800 ms (over the 400 ms first-token target). */
export const FIFO_WAIT_MS = BATCH_AHEAD * SLOT_MS;
