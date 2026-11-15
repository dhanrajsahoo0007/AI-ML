// Constants for the Long-Context Scaling page (Ring Attention & KV quantisation). Page-only; imports the shared
// legend and running example from presets/production.ts.
//
// The model is the one behind transformer/kv-cache-growth: 80 layers, 64 KV heads (full multi-head attention), head
// size 128. Per token the cache holds 2 (K and V) × 80 × 64 × 128 values = 1,310,720 values:
//   16-bit: × 2 bytes   = 2,621,440 bytes  ≈ 2.62 MB (exactly 2.5 MiB)
//    8-bit: × 1 byte    = 1,310,720 bytes  ≈ 1.31 MB
//    4-bit: × 0.5 byte  =   655,360 bytes  ≈ 0.66 MB
// (MB and GB are 10^6 and 10^9 bytes, as on the KV cache growth figure.) Scales and zero points are not counted: at a
// group size of 128 with a 16-bit scale and a 16-bit zero point they add 32 ÷ 128 = 0.25 bit per value.

export const KV_MODEL = { layers: 80, kvHeads: 64, dHead: 128 } as const;

/** Values in one token's cache: 2 × 80 × 64 × 128 = 1,310,720. */
export const VALUES_PER_TOKEN = 2 * KV_MODEL.layers * KV_MODEL.kvHeads * KV_MODEL.dHead;

/** Bytes of cache per token at `bits` bits per value. */
export const bytesPerToken = (bits: number) => (VALUES_PER_TOKEN * bits) / 8;

export const KV_BITS = [16, 8, 4] as const;

/** An illustrative KV budget: what is left for the cache on a multi-GPU node after the weights (illustrative). */
export const BUDGET_GB = 200;

/** The long prompt: 128,000 tokens (decimal "128k"). */
export const LONG_PROMPT = 128_000;

/** One 128,000-token sequence, in GB (10^9 bytes): 335.5, 167.8, 83.9. */
export const seqGB = (bits: number) => (bytesPerToken(bits) * LONG_PROMPT) / 1e9;

/** Tokens of context that fit in the budget: ⌊200e9 ÷ bytes per token⌋ = 76,293 · 152,587 · 305,175. */
export const tokensThatFit = (bits: number) => Math.floor((BUDGET_GB * 1e9) / bytesPerToken(bits));

// ── Ring attention ───────────────────────────────────────────────────────────────────────────────────────────────

/** Four GPUs, each holding a block of 128,000 ÷ 4 = 32,000 tokens. */
export const RING = {
  devices: 4,
  blockTokens: LONG_PROMPT / 4,
  hiddenSize: KV_MODEL.kvHeads * KV_MODEL.dHead,
} as const;

/**
 * Per layer, per round (Liu et al., 2023, §3): attention scores and their product with the values take
 * 4·d·c² FLOPs; sending a key block and a value block takes 4·c·d bytes in bfloat16 (2 bytes × 2 blocks).
 *   d = 64 × 128 = 8,192, c = 32,000:  4 × 8,192 × 32,000² = 3.355e13 FLOPs = 33.6 TFLOP
 *                                      4 × 32,000 × 8,192   = 1.049e9 bytes  = 1.05 GB
 */
export const ROUND_TFLOP = (4 * RING.hiddenSize * RING.blockTokens ** 2) / 1e12;
export const ROUND_GB = (4 * RING.blockTokens * RING.hiddenSize) / 1e9;

/** Minimum block size to hide the transfer: c ≥ F ÷ B (A100: 312 TFLOPS; NVLink 300 GB/s; InfiniBand 12.5 GB/s). */
export const MIN_BLOCK = { nvlink: Math.round(312e12 / 300e9), infiniband: Math.round(312e12 / 12.5e9) } as const;
