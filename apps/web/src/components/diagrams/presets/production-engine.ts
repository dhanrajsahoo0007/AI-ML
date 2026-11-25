// Constants for the LLM Inference Engine page (llm-inference-engine.mdx) and its figures in
// assets/diagrams/animated/serving/: engine-anatomy, paged-kv-cache and continuous-batching. One Brightpost answer
// inside one engine process: how much KV-cache memory it needs, what a contiguous reservation wastes, and how many
// answers fit at once. Shared names and numbers (tokens, traffic, latency) come from ./production.

import { LATENCY, TOKENS, TRAFFIC } from "./production";

/**
 * The model Brightpost serves on its own GPU: shaped like Llama 3.1 8B (its config.json: num_hidden_layers 32,
 * num_key_value_heads 8, head_dim 128, torch_dtype bfloat16, original_max_position_embeddings 8192). Weights are
 * about 8 B parameters × 2 bytes ≈ 16 GB. Used as an illustration; any GQA model of this shape gives the same sums.
 */
const ENGINE_MODEL = {
  name: "an 8B model shaped like Llama 3.1 8B",
  layers: 32,
  kvHeads: 8,
  headDim: 128,
  bytesPerValue: 2,
  weightsGB: 16,
} as const;

/**
 * KV cache per token = 2 (K and V) × 32 layers × 8 KV heads × 128 dims × 2 bytes = 131,072 bytes = 128 KiB.
 * One block of 16 tokens (vLLM's default block size, Kwon et al., 2023, §7.2) = 16 × 128 KiB = 2,048 KiB = 2 MiB.
 */
const PER_TOKEN_BYTES =
  2 * ENGINE_MODEL.layers * ENGINE_MODEL.kvHeads * ENGINE_MODEL.headDim * ENGINE_MODEL.bytesPerValue; // 131,072
const PER_TOKEN_KIB = PER_TOKEN_BYTES / 1024; // 128
const BLOCK_TOKENS = 16;
const BLOCK_MIB = (BLOCK_TOKENS * PER_TOKEN_KIB) / 1024; // 2

/**
 * One Brightpost answer: 2,200 prompt tokens + 250 answer tokens = 2,450 tokens (TOKENS in ./production).
 *
 * Contiguous reservation (one slab sized for the longest allowed sequence, as Orca's max_tokens reservation and the
 * systems measured in the vLLM paper do): the engine's maximum length is set to 8,192 tokens.
 *   reserved = 8,192 × 128 KiB = 1,048,576 KiB = 1,024 MiB = 1 GiB (512 blocks' worth)
 *   used at the end = 2,450 × 128 KiB = 313,600 KiB = 306.25 MiB (29.9 % of the slab)
 *   never used = 5,742 tokens × 128 KiB = 734,976 KiB = 717.75 MiB (70.1 %)
 *
 * Paged (16-token blocks handed out as tokens arrive):
 *   prompt = ⌈2,200 ÷ 16⌉ = 138 blocks (137 full, the last holds 8 tokens)
 *   finished answer = ⌈2,450 ÷ 16⌉ = 154 blocks = 308 MiB; the last block holds 2,450 − 153 × 16 = 2 tokens
 *   empty slots = 16 − 2 = 14 tokens × 128 KiB = 1,792 KiB = 1.75 MiB (1.75 ÷ 308 = 0.57 % of what it holds)
 *
 * A 40 GiB KV pool on one 80 GB GPU (illustrative: 80 GB less 16 GB of weights, activations and headroom):
 *   = 40 × 1,024 MiB ÷ 2 MiB = 20,480 blocks
 *   contiguous: 40 GiB ÷ 1 GiB = 40 answers at once
 *   paged: ⌊20,480 ÷ 154⌋ = 132 finished-size answers at once (132 × 154 = 20,328 ≤ 20,480; 133 × 154 = 20,482 >)
 *   132 ÷ 40 = 3.3 × as many
 *
 * Little's law at Brightpost's peak: 12 requests/s × 1.5 s per answer = 18 answers in flight.
 */
const MAX_LEN = 8_192;
const REQUEST_TOKENS = TOKENS.inputPerRequest + TOKENS.outputPerRequest; // 2,450
const PROMPT_BLOCKS = Math.ceil(TOKENS.inputPerRequest / BLOCK_TOKENS); // 138
const ANSWER_BLOCKS = Math.ceil(REQUEST_TOKENS / BLOCK_TOKENS); // 154
const LAST_BLOCK_TOKENS = REQUEST_TOKENS - (ANSWER_BLOCKS - 1) * BLOCK_TOKENS; // 2
const POOL_GIB = 40;
const POOL_BLOCKS = (POOL_GIB * 1024) / BLOCK_MIB; // 20,480
const RESERVED_MIB = (MAX_LEN * PER_TOKEN_KIB) / 1024; // 1,024
const USED_MIB = (REQUEST_TOKENS * PER_TOKEN_KIB) / 1024; // 306.25
const UNUSED_TOKENS = MAX_LEN - REQUEST_TOKENS; // 5,742
const UNUSED_MIB = (UNUSED_TOKENS * PER_TOKEN_KIB) / 1024; // 717.75
const SLACK_TOKENS = BLOCK_TOKENS - LAST_BLOCK_TOKENS; // 14
const SLACK_MIB = (SLACK_TOKENS * PER_TOKEN_KIB) / 1024; // 1.75
const PAGED_MIB = ANSWER_BLOCKS * BLOCK_MIB; // 308
const FIT_CONTIGUOUS = Math.floor((POOL_GIB * 1024) / RESERVED_MIB); // 40
const FIT_PAGED = Math.floor(POOL_BLOCKS / ANSWER_BLOCKS); // 132

export const KV = {
  perTokenBytes: PER_TOKEN_BYTES,
  perTokenKiB: PER_TOKEN_KIB,
  blockTokens: BLOCK_TOKENS,
  blockMiB: BLOCK_MIB,
  maxLen: MAX_LEN,
  requestTokens: REQUEST_TOKENS,
  promptBlocks: PROMPT_BLOCKS,
  answerBlocks: ANSWER_BLOCKS,
  lastBlockTokens: LAST_BLOCK_TOKENS,
  slackTokens: SLACK_TOKENS,
  slackMiB: SLACK_MIB,
  reservedMiB: RESERVED_MIB,
  usedMiB: USED_MIB,
  unusedTokens: UNUSED_TOKENS,
  unusedMiB: UNUSED_MIB,
  /** 29.9 */
  usedPct: Math.round((USED_MIB / RESERVED_MIB) * 1000) / 10,
  /** 70.1 */
  unusedPct: Math.round((UNUSED_MIB / RESERVED_MIB) * 1000) / 10,
  pagedMiB: PAGED_MIB,
  /** 0.57 */
  slackPct: Math.round((SLACK_MIB / PAGED_MIB) * 10000) / 100,
  poolGiB: POOL_GIB,
  poolBlocks: POOL_BLOCKS,
  fitContiguous: FIT_CONTIGUOUS,
  fitPaged: FIT_PAGED,
  /** 3.3 */
  fitRatio: Math.round((FIT_PAGED / FIT_CONTIGUOUS) * 10) / 10,
  /** 12 requests/s × 1.5 s = 18 answers in flight at the peak. */
  inFlightAtPeak: Math.round(TRAFFIC.peakPerSecond * (LATENCY.fullAnswerMs / 1000)),
} as const;

/**
 * The continuous-batching figure: four batch slots, ten decode iterations (one forward pass each), eight waiting
 * requests with illustrative lengths in iterations (a real Brightpost answer is 250 iterations; these are shrunk to
 * fit). Lengths: A 3, B 8, C 4, D 6, E 5, F 4, G 3, H 2, I 2, J 2; every request is waiting at iteration 1.
 *
 * Static: A–D run together and the batch ends when B (8) ends; E–H start at iteration 9.
 * Continuous: a slot refills the iteration after it frees, in queue order:
 *   A ends after 3 → E at 4 (to 8); C ends after 4 → F at 5 (to 8); D ends after 6 → G at 7 (to 9);
 *   E, B and F end after 8 → H, I, J at 9 (to 10); G ends after 9 and the queue is empty, so slot 4 idles at 10.
 * Busy slot-iterations in 1–8: static 3 + 8 + 4 + 6 = 21 of 32 (66 %); continuous 32 of 32 (100 %).
 * Answers finished by the end of iteration 8: static 4 (A–D); continuous 6 (A–F).
 * E starts at iteration 9 under static batching (waits 8), at iteration 4 under continuous (waits 3).
 */
export const BATCH_ROWS = {
  static: ["AAA.....EE", "BBBBBBBBFF", "CCCC....GG", "DDDDDD..HH"],
  continuous: ["AAAEEEEEHH", "BBBBBBBBII", "CCCCFFFFJJ", "DDDDDDGGG."],
} as const;
