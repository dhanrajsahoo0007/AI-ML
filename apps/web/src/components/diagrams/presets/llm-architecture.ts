// Arithmetic quoted in the prose of "Transformer architecture" that no figure spec draws. The figures carry their own
// numbers (path-length, input-embedding-sum, causal-mask, output-head, cross-attention, tensor-shapes); this module
// holds the rest, so the page reads every number from a file instead of computing it by hand.
//
// Base model, from Vaswani et al. (2017, arXiv 1706.03762 v7): N = 6 layers per stack (§3.1), d_model = 512,
// h = 8, d_k = d_v = 64 (§3.2.2), d_ff = 2048 (§3.3), a shared BPE vocabulary of about 37,000 tokens (§5.1), one
// weight matrix shared by both embedding layers and the pre-softmax Linear (§3.4). Table 3 lists the base model at
// 65 × 10⁶ parameters, 100K steps, 12 hours on 8 P100 GPUs (§5.2); the learning-rate schedule uses
// warmup_steps = 4000 (§5.3), the warm-up Post-LN needs (Xiong et al. 2020, arXiv 2002.04745: Pre-LN trains
// without it).
//
// Weights per layer (matrices only, biases and norms left out):
//   attention  W_Q, W_K, W_V, W_O: 4 × 512 × 512           = 1,048,576
//   FFN        W_1 (512 × 2048) + W_2 (2048 × 512)          = 2,097,152
//   encoder layer = 1 attention + FFN                       = 3,145,728  (FFN share 2,097,152 / 3,145,728 = 2/3)
//   decoder layer = 2 attention (self + cross) + FFN        = 4,194,304
//   6 encoder + 6 decoder layers                            = 18,874,368 + 25,165,824 = 44,040,192
//   embedding table 37,000 × 512                            = 18,944,000
//   total with one shared table                             = 62,984,192 ≈ 63.0M; biases, norms bring it to ~65M
//   untied (three separate tables) would add 2 × 18,944,000 = 37,888,000 more, about 101M in all.
//
// Generic block, model width d: attention 4d², ReLU FFN with d_ff = 4d is 2 · d · 4d = 8d², so FFN / block = 8 / 12
// = 2/3. Llama's SwiGLU FFN (Touvron et al. 2023, arXiv 2302.13971 §2.2) has three matrices with hidden size
// (2/3) · 4d, so 3 · d · (8/3)d = 8d²: the same parameter count as the ReLU FFN.
//
// KV cache of the base decoder (self-attention only): per token per layer one key and one value of 512 →
// 2 × 512 = 1,024 values; × 6 layers = 6,144 values per token. "<s> Ich liebe" (3 tokens) → 18,432 values, which at
// 2 bytes (16-bit) is 36,864 bytes = 36 KiB. (Cross-attention keys and values of "I love tea" are computed once from
// the encoder output: another 3 × 1,024 × 6 = 18,432 values.)
// GPT-3 175B (Brown et al. 2020, arXiv 2005.14165, Table 2.1: 96 layers, d_model 12,288, 96 heads of 128;
// §2.1: n_ctx = 2,048):
// 2 × 96 × 12,288 = 2,359,296 values per token = 4,718,592 bytes ≈ 4.5 MiB at 16-bit; × 2,048 tokens
// = 9,663,676,416 bytes ≈ 9.0 GiB for one full-length sequence.
//
// Output head for the tensor-shapes example: 3 positions × 37,000 = 111,000 logits per pass, of which inference uses
// the last 37,000.

export const BASE = { layers: 6, dModel: 512, heads: 8, dK: 64, dFF: 2048, vocab: 37_000 } as const;

const { layers, dModel, dFF, vocab } = BASE;

export const ATTN_WEIGHTS = 4 * dModel * dModel; // 1,048,576
export const FFN_WEIGHTS = 2 * dModel * dFF; // 2,097,152
export const ENC_LAYER = ATTN_WEIGHTS + FFN_WEIGHTS; // 3,145,728
export const DEC_LAYER = 2 * ATTN_WEIGHTS + FFN_WEIGHTS; // 4,194,304
export const FFN_SHARE = FFN_WEIGHTS / ENC_LAYER; // 2/3
export const STACKS = layers * (ENC_LAYER + DEC_LAYER); // 44,040,192
export const EMBED = vocab * dModel; // 18,944,000
export const TOTAL_TIED = STACKS + EMBED; // 62,984,192
export const UNTIED_EXTRA = 2 * EMBED; // 37,888,000

/** Values the decoder's self-attention cache holds per token: one key and one value per layer. */
export const kvPerToken = (nLayers: number, width: number) => 2 * nLayers * width;
export const KV_BASE_TOKEN = kvPerToken(layers, dModel); // 6,144
export const KV_BASE_PROMPT = 3 * KV_BASE_TOKEN; // 18,432 for "<s> Ich liebe"
export const KV_BASE_PROMPT_BYTES = 2 * KV_BASE_PROMPT; // 36,864

export const GPT3 = { layers: 96, dModel: 12_288, ctx: 2_048 } as const;
export const KV_GPT3_TOKEN = kvPerToken(GPT3.layers, GPT3.dModel); // 2,359,296
export const KV_GPT3_SEQ_BYTES = 2 * KV_GPT3_TOKEN * GPT3.ctx; // 9,663,676,416 ≈ 9.0 GiB

export const LOGITS_PER_PASS = 3 * vocab; // 111,000
