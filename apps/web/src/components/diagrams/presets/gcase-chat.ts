// Constants and arithmetic for the "Design a ChatGPT-Style Chat Service" case study (/genai-system-design/case-studies/
// chatgpt-style-chat-service; design sheet SYSTEM-DESIGN/plans/genai-design/design/chatgpt-style-chat-service.md v2,
// after design review round 1; dossier research/chatgpt-style-chat-service.md, facts cited as "dossier A9", "B39",
// "C6", "D4"; review review/chatgpt-style-chat-service-design.md). Specs in assets/diagrams/animated/chat-service/
// import from here, so the page, the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost and NOT OpenAI. It defines its own ILLUSTRATIVE consumer chat product ("the assistant"),
// run by a company that trains and serves its own models. Every volume, mix, rate, latency, gap distribution, router
// rate, throughput and unit cost below is ILLUSTRATIVE unless a comment names a source. Sources used for numbers:
//   - The flagship model is shaped like DeepSeek-V3 (61 layers, latent KV of 512 + 64 values a layer, 671B total and
//     37B active parameters, 8 of 256 experts a token; dossier D9-D11); KV stored in FP8 = 35,136 B a token.
//   - Serving follows DeepSeek's published V3/R1 system: prefill and decode on separate pools with expert parallelism,
//     a disk KV cache that served 56.3% of input tokens, about 73.7K input tokens a second per H800 node in prefill
//     (cache hits included) (D1-D5); multi-token prediction with 85-90% second-token acceptance (D12).
//   - Blackwell-class GPUs in NVL72 racks: per GPU about 186 GB, 8 TB/s, 5 PFLOP/s dense FP8, divided out of NVIDIA's
//     rack and superchip totals (D13, D14). H100 dense FP8 is about 1,979 TFLOP/s (D16).
//   - Model list prices (Claude Sonnet 5.5 class, as of November 2026) are imported from the answer-engine preset and
//     used ONLY for the "same tokens bought at list price" line. Our cost is GPU time at an illustrative 6 USD a
//     Blackwell-class GPU-hour (the site's H100-class figure, PRICES.gpuHour, is 2.5).
//
// Capacity (sheet §5, deep dive 3):
//   - Prefill pool: 8-GPU units computing 80,000 prompt tokens a second each, sized for the computed tokens a turn
//     (after prefix-cache hits) at utilisation rho = 0.6. Time to first token comes from a seeded simulation of one
//     unit's chunked-prefill queue (small jobs first), not from an assumed queue time (review item 1).
//   - Decode pools: 72-GPU expert-parallel units (one NVL72 rack). Per GPU a step costs t0 + B x (k x compute + L x KV
//     read + k x expert traffic); at stream speed s and k tokens a step, (s / k) x t_step = u gives the batch B.
//   - Prefix-cache tiers: the conversation's home prefill unit (rendezvous hash of conversation_id, bounded load), then
//     the regional KV store (NVMe), then recompute. Residency = capacity / new KV tokens written a second.
// GPU utilisation appears nowhere: a busy engine is not a full one.

import { PRICES } from "./gcase-answer";

const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error < 1.5e-7). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
const Z95 = 1.6448536;
const Z90 = 1.2815516;

type Dist = { p50: number; p95: number };

/** Lognormal CDF given its median and p90 (used for the gap between a user's turns). */
const lognormalCdf = (t: number, median: number, p90: number) =>
  phi(Math.log(t / median) / (Math.log(p90 / median) / Z90));

// ---------------------------------------------------------------------------------------------------------------------
// Traffic and product (illustrative)
// ---------------------------------------------------------------------------------------------------------------------

/** Users, turns, tiers and per-turn features (sheet §5). A turn = one user message and the assistant's reply. */
export const TRAFFIC = (() => {
  const dailyActiveUsers = 100_000_000;
  const turnsPerUser = 10;
  const perDay = dailyActiveUsers * turnsPerUser; // 1,000,000,000
  const avgPerSecond = perDay / 86_400; // ≈ 11,574
  const peakFactor = 2; // peak hour ÷ daily average for a product used across time zones (illustrative)
  const peakPerSecond = avgPerSecond * peakFactor; // ≈ 23,148
  const paidUserShare = 0.06; // anchor: 50M paying of 900M weekly ChatGPT users ≈ 5.6% (dossier A32)
  const paidTurnMultiplier = 3; // a paid user sends 3× the turns of a free user
  const paidTurnShare = (paidUserShare * paidTurnMultiplier) / (1 - paidUserShare + paidUserShare * paidTurnMultiplier); // 0.1607
  return {
    dailyActiveUsers,
    turnsPerUser,
    perDay,
    avgPerSecond,
    peakFactor,
    peakPerSecond,
    paidUserShare,
    paidTurnMultiplier,
    paidTurnShare,
    freeTurnShare: 1 - paidTurnShare, // 0.8393
    searchShare: 0.1, // turns that call web search
    fileShare: 0.03, // turns that ask about an uploaded file (chunks retrieved)
    recallShare: 0.3, // turns where memory recall adds snippets (past chats or this chat's folded turns)
    stopShare: 0.05, // answers the user stops, on average half-way
    disconnectShare: 0.03, // streams whose client drops before the end
  };
})();

/**
 * Conversation lengths (sheet §5): a mixture of geometric distributions, 80% short chats (mean 3 turns) and 20% long
 * ones (mean 18), so the mean is 6 turns and 1.2% of chats reach turn 50. A turn's index i has weight
 * w(i) = Σ share × P(n ≥ i) ÷ E[n] (the share of all turns that are some chat's i-th turn).
 */
export const CONVERSATION = (() => {
  const classes = [
    { share: 0.8, mean: 3 },
    { share: 0.2, mean: 18 },
  ] as const;
  const meanTurns = sum(classes.map((c) => c.share * c.mean)); // 6
  const survive = (i: number) => sum(classes.map((c) => c.share * (1 - 1 / c.mean) ** (i - 1))); // P(n ≥ i)
  const maxTurn = 600;
  const weights = Array.from({ length: maxTurn }, (_, k) => survive(k + 1) / meanTurns); // index k ↔ turn k + 1
  const priorTurnsAvg = sum(weights.map((w, k) => w * k)); // 11 = (0.8 × 6 + 0.2 × 306) ÷ 6
  const reach50 = survive(50); // 0.2 × (17/18)^49 ≈ 0.0121
  const conversationsPerDay = TRAFFIC.perDay / meanTurns; // ≈ 166.7M
  return {
    classes,
    meanTurns,
    survive,
    weights,
    maxTurn,
    priorTurnsAvg,
    reach50,
    conversationsPerDay,
    reach50PerDay: conversationsPerDay * reach50, // ≈ 2.0M chats a day reach turn 50
    turnsAtOrPast50: sum(weights.slice(49)), // share of all turns with index ≥ 50
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// The window (sheet §11): blocks, the compaction policy, turn 50
// ---------------------------------------------------------------------------------------------------------------------

/** Token sizes of the blocks (illustrative) and the compaction policy (sheet §11, deep dive 1). */
export const BLOCKS = {
  instructions: 1_700, // product instructions, safety policy, formatting rules
  toolDefs: 800, // search, code, image, memory tools
  systemPrompt: 2_500, // instructions + tool definitions: identical for every user of one prompt version
  customInstructions: 150,
  savedMemories: 500, // 20 saved memories × 25 tokens, chosen at the conversation's start
  profileLine: 50, // name, locale, today's date
  userHeader: 700, // custom instructions + saved memories + profile line: stable for one conversation
  userMessage: 150,
  assistantMessage: 450, // fast answer, visible tokens
  turn: 600, // one raw user + assistant pair
  searchResult: 2_000, // 5 results × 400 tokens
  fileChunks: 1_600, // 4 chunks × 400 tokens of an uploaded file
  fileWhole: 15_000, // the same 30-page file sent whole
  recallSnippets: 300, // 2 snippets × 150 tokens
  // Compaction: when 16 raw turns have built up, fold the oldest 8 into the summary in one batch (one cache miss);
  // the summary gains 300 tokens a fold, capped at 2,000. Tool results and file chunks fold with their turns.
  rawLimit: 16,
  foldSize: 8,
  summaryPerFold: 300,
  summaryCap: 2_000,
  // Reasoning turns: 2,000 hidden thinking tokens (median effort) + a 600-token answer; thinking is stripped from the
  // history afterwards, so the next turn re-prefills that answer and its user message (750 tokens).
  thinking: 2_000,
  reasoningAnswer: 600,
  reasoningRePrefill: 750,
} as const;

/** Expected extras a turn carries (search 10% × 2,000 + file 3% × 1,600 + recall 30% × 300 = 338). */
const EXTRAS =
  TRAFFIC.searchShare * BLOCKS.searchResult +
  TRAFFIC.fileShare * BLOCKS.fileChunks +
  TRAFFIC.recallShare * BLOCKS.recallSnippets;

/** The window at turn i under the policy (expected tokens) and under "keep everything" (sheet §11). */
export function windowAt(i: number) {
  const k = i - 1; // prior turns
  const folds = k >= BLOCKS.rawLimit ? Math.floor((k - BLOCKS.rawLimit) / BLOCKS.foldSize) + 1 : 0;
  const raw = k - BLOCKS.foldSize * folds;
  const summary = Math.min(BLOCKS.summaryCap, BLOCKS.summaryPerFold * folds);
  const rawPerTurn = BLOCKS.turn + EXTRAS; // 938
  const newTokens = BLOCKS.userMessage + EXTRAS; // 488: the user message and this turn's tool, file and recall tokens
  const fixed = BLOCKS.systemPrompt + BLOCKS.userHeader; // 3,200
  const prompt = fixed + summary + raw * rawPerTurn + newTokens;
  const naive = fixed + k * rawPerTurn + newTokens; // no compaction (files still as chunks: flatters "naive")
  const compactionTurn = k >= BLOCKS.rawLimit && (k - BLOCKS.rawLimit) % BLOCKS.foldSize === 0;
  return { k, folds, raw, summary, rawPerTurn, newTokens, prompt, naive, compactionTurn };
}

/** Turn 50 of one long chat, block by block (the context-layout figure, sheet §11). */
export const TURN50 = (() => {
  const w = windowAt(50); // folds 5 (before turns 17, 25, 33, 41, 49), raw turns 41–49, summary 1,500
  const blocks = [
    { id: "system", label: "System prompt and tool definitions", tokens: BLOCKS.systemPrompt, scope: "global" },
    { id: "header", label: "Custom instructions, saved memories, profile", tokens: BLOCKS.userHeader, scope: "user" },
    { id: "summary", label: "Summary of turns 1–40", tokens: w.summary, scope: "conversation" },
    { id: "recent", label: "Turns 41–49 word for word", tokens: w.raw * BLOCKS.turn, scope: "conversation" },
    { id: "search", label: "Search results from turn 47", tokens: BLOCKS.searchResult, scope: "conversation" },
    { id: "file", label: "File chunks from turn 44", tokens: BLOCKS.fileChunks, scope: "conversation" },
    { id: "recall", label: "Recalled snippets for this turn", tokens: BLOCKS.recallSnippets, scope: "new" },
    { id: "message", label: "Turn 50 message", tokens: BLOCKS.userMessage, scope: "new" },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 14,150
  const cachedIfHit = sum(blocks.filter((b) => b.scope !== "new").map((b) => b.tokens)); // 13,700
  const newTokens = total - cachedIfHit; // 450
  // The same chat with nothing removed: 49 raw turns, six search results (turns 9, 18, 26, 33, 40, 47), the file whole.
  const naiveBlocks = [
    { id: "system", tokens: BLOCKS.systemPrompt },
    { id: "header", tokens: BLOCKS.userHeader },
    { id: "turns", tokens: 49 * BLOCKS.turn }, // 29,400
    { id: "search", tokens: 6 * BLOCKS.searchResult }, // 12,000
    { id: "file", tokens: BLOCKS.fileWhole }, // 15,000
    { id: "recall", tokens: BLOCKS.recallSnippets },
    { id: "message", tokens: BLOCKS.userMessage },
  ] as const;
  const naive = sum(naiveBlocks.map((b) => b.tokens)); // 60,050
  // What removes the 45,900 tokens (three mechanisms, not one): folding raw turns into the summary 29,400 → 6,900
  // (22,500); tool results living only until their turn folds 12,000 → 2,000 (10,000); files as chunks 15,000 → 1,600
  // (13,400).
  const causes = {
    compaction: 49 * BLOCKS.turn - (w.summary + w.raw * BLOCKS.turn), // 22,500
    toolLifetime: 6 * BLOCKS.searchResult - BLOCKS.searchResult, // 10,000
    fileChunks: BLOCKS.fileWhole - BLOCKS.fileChunks, // 13,400
  };
  return { window: w, blocks, total, cachedIfHit, newTokens, naiveBlocks, naive, ratio: naive / total, causes };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Router: fast or reasoning (sheet §10, deep dive 2)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Router operating points (illustrative ROC points of a small classifier, measured on a labelled set of auto turns).
 * A turn "needs reasoning" when, on a pairwise-graded set, the reasoning answer beats the fast one by the gate margin;
 * 6% of auto turns do. Users can also pick Thinking themselves (1% of free turns, 8% of paid turns).
 */
export const ROUTER = (() => {
  const needsReasoning = 0.06;
  const points = [
    { id: "A", label: "Conservative", recall: 0.6, fpr: 0.005 },
    { id: "B", label: "Chosen", recall: 0.8, fpr: 0.02 },
    { id: "C", label: "Eager", recall: 0.95, fpr: 0.1 },
  ] as const;
  const chosen = points[1];
  const autoShare = (pt: { recall: number; fpr: number }) => needsReasoning * pt.recall + (1 - needsReasoning) * pt.fpr;
  const explicitFree = 0.01;
  const explicitPaid = 0.08;
  const auto = autoShare(chosen); // 0.048 + 0.0188 = 0.0668
  const free = explicitFree + (1 - explicitFree) * auto; // 0.0761
  const paid = explicitPaid + (1 - explicitPaid) * auto; // 0.1415
  const reasoningShare = TRAFFIC.freeTurnShare * free + TRAFFIC.paidTurnShare * paid; // ≈ 0.0866
  return {
    needsReasoning,
    points,
    chosen,
    autoShare,
    explicitFree,
    explicitPaid,
    auto,
    free,
    paid,
    reasoningShare,
    fastShare: 1 - reasoningShare,
    regenerateAfterMiss: 0.35, // share of wrongly fast answers that the user regenerates with Thinking (illustrative)
    latencyMs: { p50: 6, p95: 12 }, // a ~300M-parameter encoder on the message and conversation features
    labelledSet: 5_000, // auto turns, pairwise graded → 300 positives
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Model and hardware (sheet §5, §10.3; v2 after review item 3)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The flagship model is a sparse mixture-of-experts with latent attention, shaped like DeepSeek-V3 (config: 61 layers,
 * 256 routed experts, 8 per token, kv_lora_rank 512 + rope dim 64; 671B total, 37B active; dossier D9–D11). The KV
 * cache is the compressed latent: 61 × (512 + 64) values a token, stored in FP8. GPUs are Blackwell-class in an
 * NVL72 rack: per GPU ≈ 186 GB HBM, ≈ 8 TB/s, ≈ 5 PFLOP/s dense FP8 (NVIDIA prints rack and superchip totals; per-GPU
 * values are divided out, dossier D13, D14). Prefill and decode run on separate pools (as DeepSeek serves V3/R1, D1–D3).
 * Every throughput below is ILLUSTRATIVE and anchored where a source exists.
 */
export const HARDWARE = (() => {
  const gpu = { hbm: 186e9, bandwidth: 8e12, bandwidthEfficiency: 0.8, fp8Dense: 5e15, nvlink: 1.8e12 };
  const model = {
    totalParams: 671e9,
    activeParams: 37e9,
    layers: 61,
    moeLayers: 58, // the first 3 layers are dense (first_k_dense_replace 3, D9)
    hidden: 7_168,
    expertsPerToken: 8,
    kvBytesPerToken: 61 * (512 + 64) * 1, // 35,136 B in FP8 (70,272 in BF16)
  };
  const effBw = gpu.bandwidth * gpu.bandwidthEfficiency; // 6.4 TB/s achieved
  // Prefill unit: 8 GPUs holding the whole model in FP8 (671 GB ÷ 8 = 83.9 GB a GPU).
  // Rate anchor: DeepSeek's H800 node prefilled ≈ 73.7K input tokens a second INCLUDING cache hits, with 56.3% of
  // input tokens from its disk KV cache (D4, D5): ≈ 73.7K × 0.437 = 32.2K computed a node. Scaled by dense FP8 FLOPs,
  // 5 ÷ 1.979 PFLOP/s a GPU (D14, D16) = 2.53×: ≈ 81,400. Rounded down to 80,000 computed tokens a second a unit.
  const prefill = {
    gpus: 8,
    tokensPerSecond: 80_000,
    stepTokens: 4_096, // chunked-prefill token budget a step
    stepOverheadSec: 0.003,
    // KV memory for cached prefixes: HBM after weights and runtime ((186 − 83.9 − 22) GB × 8 = 641 GB) + 1.5 TB of
    // the Grace host memory (≈ 240 GB a GPU on the superchip, part kept for the OS and buffers).
    cacheBytes: (gpu.hbm - model.totalParams / 8 - 22e9) * 8 + 1.5e12,
  };
  // Decode unit: one NVL72 rack, experts spread 72 ways (EP72) inside one NVLink domain.
  const expertBytesPerGpu = model.totalParams / 72; // 9.32 GB
  const replicatedBytes = 14e9; // attention, shared expert and dense layers replicated for data parallelism (illustrative)
  const decode = {
    gpus: 72,
    // Fixed cost a step: read this GPU's experts and replicated weights + 1 ms of launch and synchronisation.
    t0: (expertBytesPerGpu + replicatedBytes) / effBw + 0.001, // ≈ 4.65 ms
    computePerToken: (2 * model.activeParams) / (gpu.fp8Dense * 0.25), // 59.2 µs at 25% of dense FP8 peak
    kvReadPerToken: model.kvBytesPerToken / effBw, // 5.49 ns per context token per step
    // Dispatch + combine: 8 experts × 7,168 values × 1 byte × 58 MoE layers × 2 = 6.65 MB a token over NVLink at 60%.
    commPerToken: (2 * model.expertsPerToken * model.hidden * model.moeLayers) / (gpu.nvlink * 0.6),
    mtpTokensPerStep: 1.7, // multi-token prediction accepted a step (DeepSeek: 85–90% second-token acceptance, 1.8× TPS, D12)
    kvTokensPerGpu: (gpu.hbm - expertBytesPerGpu - replicatedBytes - 20e9) / model.kvBytesPerToken, // ≈ 4.06M
  };
  const kvStore = {
    bytesPerRegion: 5e15, // 5 PB of NVMe per region for KV blocks (illustrative; DeepSeek serves 56% of input from disk, D5)
    readBytesPerSecondPerUnit: 25e9, // into one prefill unit
    requestSec: 0.003,
  };
  const rdmaBytesPerSecondPerUnit = 8 * 50e9; // prefill → decode KV transfer (400 Gb/s a GPU)
  return {
    gpu,
    model,
    effBw,
    prefill,
    prefillCacheTokens: prefill.cacheBytes / model.kvBytesPerToken, // ≈ 61M tokens a unit
    decode,
    kvStore,
    storeTokensPerRegion: kvStore.bytesPerRegion / model.kvBytesPerToken, // ≈ 142B tokens
    rdmaBytesPerSecondPerUnit,
    gpuHourUsd: 6.0, // Blackwell-class GPU-hour, illustrative (the site's H100-class figure is PRICES.gpuHour = 2.5)
    ssdUsdPerGbMonth: 0.03, // illustrative
    small: {
      // An 8B dense model (Llama 3.1 8B config: 32 layers, 8 KV heads, head dim 128; KV in FP8) on one GPU, co-located.
      kvBytesPerToken: 2 * 32 * 8 * 128,
      prefillPerSecond: (gpu.fp8Dense * 0.25) / (2 * 8e9), // ≈ 78,000
      t0: 8e9 / effBw, // 1.25 ms
      computePerToken: (2 * 8e9) / (gpu.fp8Dense * 0.25), // 12.8 µs
      kvReadPerToken: (2 * 32 * 8 * 128) / effBw, // 10.2 ns
    },
  };
})();

/** Operating points (illustrative). */
export const POOLS = {
  prefillRho: 0.6, // offered prefill work ÷ capacity at peak (measured busy with step overhead ≈ 0.69); §12 ρ table
  prefillRhoHot: 0.8, // rung 2 of the ladder (measured busy ≈ 0.88)
  decodeU: 0.8, // decode busy fraction at peak
  fastSpeed: 60, // tokens a second a stream (v1: 40; review nit 39)
  reasoningSpeed: 100, // thinking is waiting: smaller batches, faster steps
  fastOutput: BLOCKS.assistantMessage, // 450
  reasoningOutput: BLOCKS.thinking + BLOCKS.reasoningAnswer, // 2,600
  gapMedianSec: 60, // gap between a user's turns: lognormal, median 60 s, p90 20 minutes (illustrative)
  gapP90Sec: 1_200,
  regionalPeakFactor: 1.2, // each region's own peak is 2.4× its average; peaks are offset, so Σ regional peaks = 1.2 × global
  regions: 3,
  prefillAheadWaste: 1 / (17 / 18), // folds whose chat never returns (long chats continue with probability 17/18)
} as const;

/** Rendezvous-hashing diversion (bounded load): the share of follow-ups whose home unit is over its bound. */
export const diversion = (rho: number) => 0.03 * (rho / 0.5) ** 2; // 3% at ρ = 0.5, 9.7% at ρ = 0.9 (illustrative)

// ---------------------------------------------------------------------------------------------------------------------
// Prefix-cache tiers and prompt tokens computed (sheet §5, deep dive 3)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Where a follow-up's prefix is found: on its home prefill unit (rendezvous hash of conversation_id), in the regional
 * KV store (any unit loads it in ≈ 13 ms), or nowhere (recompute). Residency of each tier = its capacity ÷ the new KV
 * tokens it receives a second (LRU), against the gap between turns. After a fold, a low-priority "prefill-ahead"
 * builds the new prefix on the home unit, so the compaction turn hits; the work is counted in the prefill load.
 */
export function cacheModel(
  policy: "compact" | "naive",
  opts: { store?: boolean; affinity?: boolean; rho?: number } = {}
) {
  const store = opts.store ?? true;
  const affinity = opts.affinity ?? true;
  const rho = opts.rho ?? POOLS.prefillRho;
  const W = CONVERSATION.weights;
  const win = W.map((_, k) => windowAt(k + 1));
  const prompt = (k: number) => (policy === "compact" ? win[k].prompt : win[k].naive);
  const compaction = (k: number) => policy === "compact" && win[k].compactionTurn;
  const first = W[0];
  const compactionShare = sum(W.map((w, k) => (compaction(k) ? w : 0)));
  const followShare = 1 - first - compactionShare;
  const promptAvg = sum(W.map((w, k) => w * prompt(k)));
  const missTokens = (k: number) => prompt(k) - BLOCKS.systemPrompt;
  const followIdx = W.map((_, k) => k).filter((k) => k > 0 && !compaction(k));
  const followW = sum(followIdx.map((k) => W[k]));
  const missAvg = sum(followIdx.map((k) => W[k] * missTokens(k))) / followW;
  const compactionTokens =
    compactionShare > 0
      ? sum(W.map((w, k) => (compaction(k) ? w * (missTokens(k) - BLOCKS.userHeader) : 0))) / compactionShare
      : 0;
  const newTok = win[0].newTokens; // 488
  const pFirst = prompt(0) - BLOCKS.systemPrompt; // 1,188
  const sticky = affinity ? 1 - diversion(rho) : 0;
  const unitRate = HARDWARE.prefill.tokensPerSecond * rho; // computed tokens a second a unit
  let tLocal = 600;
  let tStore = 20_000;
  let out = {} as ReturnType<typeof step>;
  function step() {
    const fLocal = lognormalCdf(tLocal, POOLS.gapMedianSec, POOLS.gapP90Sec);
    const fStore = store ? lognormalCdf(tStore, POOLS.gapMedianSec, POOLS.gapP90Sec) : 0;
    const local = sticky * fLocal;
    const fromStore = Math.max(0, fStore - local);
    const miss = 1 - local - fromStore;
    const pFollow = (local + fromStore) * newTok + miss * missAvg;
    const pCompaction = compactionTokens * POOLS.prefillAheadWaste; // background, never on the critical path
    const pReasonExtra = ROUTER.reasoningShare * BLOCKS.reasoningRePrefill; // thinking stripped: 750 next turn
    const computed = first * pFirst + followShare * pFollow + compactionShare * pCompaction + pReasonExtra;
    const continuation = TRAFFIC.searchShare * BLOCKS.searchResult; // part of newTok already; listed for the sim
    const output = ROUTER.fastShare * POOLS.fastOutput + ROUTER.reasoningShare * BLOCKS.reasoningAnswer; // KV kept
    // Residency. A unit writes its computed tokens + the answers' KV pushed back from decode.
    const turnsPerUnit = unitRate / computed;
    const tLocalNext = HARDWARE.prefillCacheTokens / (turnsPerUnit * (computed + output));
    const regionWrite = (TRAFFIC.peakPerSecond / POOLS.regions) * (computed + output);
    const tStoreNext = HARDWARE.storeTokensPerRegion / regionWrite;
    return {
      fLocal,
      fStore,
      hit: {
        first,
        local: followShare * local,
        store: followShare * fromStore,
        miss: followShare * miss,
        compaction: compactionShare,
      },
      followHit: local + fromStore,
      pFirst,
      pFollow,
      pCompaction,
      computed,
      continuation,
      output,
      tokenHitShare: 1 - computed / promptAvg,
      residencyLocalSec: tLocalNext,
      residencyStoreSec: tStoreNext,
      missShareOfComputed: (followShare * miss * missAvg) / computed,
    };
  }
  for (let i = 0; i < 40; i++) {
    out = step();
    tLocal = out.residencyLocalSec;
    tStore = out.residencyStoreSec;
  }
  return { policy, store, affinity, rho, sticky, promptAvg, missAvg, compactionTokens, newTok, ...out };
}

// ---------------------------------------------------------------------------------------------------------------------
// The prefill queue, simulated (sheet §12; review item 1)
// ---------------------------------------------------------------------------------------------------------------------

/** Seeded PRNG (mulberry32) so the preset, the figures and the tests print the same numbers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
/** A stage drawn from a normal fit to its p50 and p95, floored at 20% of the p50. */
const draw = (r: () => number, d: Dist) => Math.max(0.2 * d.p50, d.p50 + ((d.p95 - d.p50) / Z95) * normal(r));
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

type Job = { arrival: number; tokens: number; cls: 0 | 1 | 2; kind: "turn" | "cont" | "bg"; tag: number };

/**
 * One prefill unit as a chunked-prefill server: every step takes up to 4,096 tokens, small jobs first (≤ 2,048
 * tokens: hits and search continuations), then large jobs (misses), then background prefill-ahead; FCFS inside a
 * class; a job finishes at the end of the step that holds its last token. Step time = tokens ÷ 80,000 + 3 ms.
 * Arrivals are Poisson at the rate that gives utilisation ρ. Turn sizes are drawn from the exact per-turn distribution
 * (turn index from the conversation mixture, then hit / store / miss / first / compaction, recall and file draws).
 */
export function simulatePrefill(rho: number, turns = 60_000, seed = 7) {
  const r = rng(seed);
  const c = cacheModel("compact", { rho });
  const W = CONVERSATION.weights;
  const cum: number[] = [];
  W.reduce((acc, w, k) => ((cum[k] = acc + w), acc + w), 0);
  const pickIndex = () => {
    const u = r() * cum[cum.length - 1];
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const followLocal = c.hit.local / (c.hit.local + c.hit.store + c.hit.miss);
  const followStore = c.hit.store / (c.hit.local + c.hit.store + c.hit.miss);
  const P = HARDWARE.prefill;
  // Draw the jobs first, then set the arrival rate from their mean work.
  type Turn = {
    tokens: number;
    path: "first" | "local" | "store" | "miss" | "compaction";
    search: boolean;
    prefix: number;
    k: number;
  };
  const drawn: Turn[] = [];
  for (let i = 0; i < turns; i++) {
    const k = pickIndex();
    const w = windowAt(k + 1);
    const fresh =
      BLOCKS.userMessage +
      (r() < TRAFFIC.recallShare ? BLOCKS.recallSnippets : 0) +
      (r() < TRAFFIC.fileShare ? BLOCKS.fileChunks : 0) +
      (r() < ROUTER.reasoningShare ? BLOCKS.reasoningRePrefill : 0);
    const search = r() < TRAFFIC.searchShare;
    let path: Turn["path"];
    let tokens: number;
    if (k === 0) {
      path = "first";
      tokens = BLOCKS.userHeader + fresh;
    } else if (w.compactionTurn) {
      path = "compaction";
      tokens = fresh;
    } else {
      const u = r();
      path = u < followLocal ? "local" : u < followLocal + followStore ? "store" : "miss";
      tokens = path === "miss" ? w.prompt - BLOCKS.systemPrompt - (w.newTokens - fresh) : fresh;
    }
    drawn.push({ tokens, path, search, prefix: w.prompt, k });
  }
  const bgPerTurn = c.hit.compaction * c.pCompaction; // background tokens per turn
  const meanWork = sum(drawn.map((d) => d.tokens + (d.search ? BLOCKS.searchResult : 0))) / turns + bgPerTurn;
  const lambda = (rho * P.tokensPerSecond) / meanWork; // turns a second a unit
  const jobs: Job[] = [];
  let t = 0;
  drawn.forEach((d, i) => {
    t += -Math.log(1 - r()) / lambda;
    jobs.push({ arrival: t, tokens: d.tokens, cls: d.tokens <= 2_048 ? 0 : 1, kind: "turn", tag: i });
    if (d.search) jobs.push({ arrival: t + 1.2 + r(), tokens: BLOCKS.searchResult, cls: 0, kind: "cont", tag: i });
    if (r() < c.hit.compaction * POOLS.prefillAheadWaste) {
      jobs.push({ arrival: t + r(), tokens: Math.max(500, c.pCompaction), cls: 2, kind: "bg", tag: i });
    }
  });
  jobs.sort((a, b) => a.arrival - b.arrival);
  const queues: { job: Job; left: number }[][] = [[], [], []];
  const sojourn = new Map<string, number>();
  let clock = 0;
  let next = 0;
  let busy = 0;
  while (next < jobs.length || queues.some((q) => q.length)) {
    if (!queues.some((q) => q.length)) clock = Math.max(clock, jobs[next].arrival);
    while (next < jobs.length && jobs[next].arrival <= clock) {
      const j = jobs[next++];
      queues[j.cls].push({ job: j, left: j.tokens });
    }
    let budget = P.stepTokens;
    const finished: Job[] = [];
    for (const q of queues) {
      while (budget > 0 && q.length) {
        const take = Math.min(budget, q[0].left);
        q[0].left -= take;
        budget -= take;
        if (q[0].left <= 0) finished.push(q.shift()!.job);
      }
    }
    const used = P.stepTokens - budget;
    const dt = used / P.tokensPerSecond + P.stepOverheadSec;
    clock += dt;
    busy += dt;
    for (const j of finished) sojourn.set(`${j.kind}:${j.tag}`, clock - j.arrival);
  }
  return {
    rho,
    lambda,
    meanWork,
    measuredBusy: busy / clock,
    drawn,
    turnSojourn: drawn.map((_, i) => sojourn.get(`turn:${i}`)! * 1_000), // ms
    contSojourn: drawn.map((d, i) => (d.search ? sojourn.get(`cont:${i}`)! * 1_000 : NaN)),
    cache: c,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Decode pools and the fleet (sheet §5, deep dive 3)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Decode, per GPU of a 72-GPU expert-parallel unit. A step costs t0 (this GPU's weights) + for each of its B
 * sequences: k tokens of compute and expert traffic + one read of the sequence's latent KV. With k tokens a step (MTP)
 * a stream at s tokens a second takes s ÷ k steps a second, so at busy fraction u: (s ÷ k) × t_step = u, giving
 *   B = (u × k ÷ s − t0) ÷ (k × compute + L × kvRead + k × comm),   GPU throughput = B × s,   turns a second = B × s ÷ O.
 */
export function decodeRate(
  speed: number,
  out: number,
  ctx: number,
  u: number = POOLS.decodeU,
  k: number = HARDWARE.decode.mtpTokensPerStep
) {
  const d = HARDWARE.decode;
  const perSeq = k * d.computePerToken + ctx * d.kvReadPerToken + k * d.commPerToken;
  const batch = (u * (k / speed) - d.t0) / perSeq;
  return {
    batch,
    perSeqUs: perSeq * 1e6,
    stepMs: (d.t0 + batch * perSeq) * 1_000,
    tokensPerGpu: batch * speed,
    turnsPerGpu: (batch * speed) / out,
    kvOccupancy: (batch * ctx) / d.kvTokensPerGpu,
  };
}

export const CAPACITY = (() => {
  const c = cacheModel("compact");
  const peak = TRAFFIC.peakPerSecond;
  const fastPerSecond = peak * ROUTER.fastShare; // ≈ 21,143
  const reasoningPerSecond = peak * ROUTER.reasoningShare; // ≈ 2,005
  const ctxFast = c.promptAvg + POOLS.fastOutput / 2;
  const ctxReason = c.promptAvg + POOLS.reasoningOutput / 2;
  const fast = decodeRate(POOLS.fastSpeed, POOLS.fastOutput, ctxFast);
  const reason = decodeRate(POOLS.reasoningSpeed, POOLS.reasoningOutput, ctxReason);
  const F = POOLS.regionalPeakFactor;
  const P = HARDWARE.prefill;
  const prefillUnits = (computed: number, rho: number = POOLS.prefillRho) =>
    Math.ceil((F * peak * computed) / (P.tokensPerSecond * rho));
  const racks = (perSecond: number, rate: ReturnType<typeof decodeRate>) =>
    Math.ceil((F * perSecond) / rate.turnsPerGpu / 72);
  const fleet = (computed: number, f = fast, r = reason) => {
    const pu = prefillUnits(computed);
    const fr = racks(fastPerSecond, f);
    const rr = racks(reasoningPerSecond, r);
    return {
      prefillUnits: pu,
      prefillGpus: pu * 8,
      fastRacks: fr,
      reasoningRacks: rr,
      decodeGpus: (fr + rr) * 72,
      gpus: pu * 8 + (fr + rr) * 72,
    };
  };
  const design = fleet(c.computed);
  // What each layer buys (same decode pools unless stated).
  const noStore = cacheModel("compact", { store: false });
  const noAffinity = cacheModel("compact", { affinity: false });
  const neither = cacheModel("compact", { store: false, affinity: false });
  const keepAllCache = cacheModel("naive");
  const keepAll = fleet(
    keepAllCache.computed,
    decodeRate(POOLS.fastSpeed, POOLS.fastOutput, keepAllCache.promptAvg + POOLS.fastOutput / 2),
    decodeRate(POOLS.reasoningSpeed, POOLS.reasoningOutput, keepAllCache.promptAvg + POOLS.reasoningOutput / 2)
  );
  const deepseekHitShare = 0.563; // share of input tokens DeepSeek served from its disk cache (D5)
  const atDeepseekHit = fleet(c.promptAvg * (1 - deepseekHitShare));
  // Keep everything at DeepSeek's hit share: bigger prompts, so more computed tokens on every miss.
  const keepAllAtDeepseekHit = fleet(
    keepAllCache.promptAvg * (1 - deepseekHitShare),
    decodeRate(POOLS.fastSpeed, POOLS.fastOutput, keepAllCache.promptAvg + POOLS.fastOutput / 2),
    decodeRate(POOLS.reasoningSpeed, POOLS.reasoningOutput, keepAllCache.promptAvg + POOLS.reasoningOutput / 2)
  );
  const noMtp = fleet(
    c.computed,
    decodeRate(POOLS.fastSpeed, POOLS.fastOutput, ctxFast, POOLS.decodeU, 1),
    decodeRate(POOLS.reasoningSpeed, POOLS.reasoningOutput, ctxReason, POOLS.decodeU, 1)
  );
  const halfDecode = (() => {
    const half = (x: ReturnType<typeof decodeRate>) => ({ ...x, turnsPerGpu: x.turnsPerGpu / 2 });
    return fleet(c.computed, half(fast), half(reason));
  })();
  // Turn 50 of the example chat in one decode batch of the design's size.
  const kvGb = (tokens: number) => (tokens * HARDWARE.model.kvBytesPerToken) / 1e9;
  const d = HARDWARE.decode;
  const k = d.mtpTokensPerStep;
  const stepAt = (ctx: number) =>
    (d.t0 + fast.batch * (k * d.computePerToken + ctx * d.kvReadPerToken + k * d.commPerToken)) * 1_000;
  const turn50 = {
    compactGb: kvGb(TURN50.total + POOLS.fastOutput), // 14,600 tokens ≈ 0.51 GB
    naiveGb: kvGb(TURN50.naive + POOLS.fastOutput), // 60,500 ≈ 2.13 GB
    compactFit: Math.floor((0.9 * d.kvTokensPerGpu) / (TURN50.total + POOLS.fastOutput)),
    naiveFit: Math.floor((0.9 * d.kvTokensPerGpu) / (TURN50.naive + POOLS.fastOutput)),
    compactStepMs: stepAt(TURN50.total + 225),
    naiveStepMs: stepAt(TURN50.naive + 225), // the budget is u × k ÷ s = 22.7 ms
    stepBudgetMs: ((POOLS.decodeU * k) / POOLS.fastSpeed) * 1_000,
    missPrefillMs: ((TURN50.total - BLOCKS.systemPrompt) / P.tokensPerSecond) * 1_000, // 146 ms on an idle unit
    naiveMissPrefillMs: ((TURN50.naive - BLOCKS.systemPrompt) / P.tokensPerSecond) * 1_000, // 719 ms
    storeLoadMs:
      ((TURN50.cachedIfHit * HARDWARE.model.kvBytesPerToken) / HARDWARE.kvStore.readBytesPerSecondPerUnit) * 1_000 + 3,
    transferMs: ((TURN50.total * HARDWARE.model.kvBytesPerToken) / HARDWARE.rdmaBytesPerSecondPerUnit) * 1_000,
  };
  const gpuSecFast = 1 / fast.turnsPerGpu + (c.computed * 8) / (P.tokensPerSecond * POOLS.prefillRho);
  const gpuSecReason =
    1 / reason.turnsPerGpu + ((c.computed + BLOCKS.reasoningRePrefill) * 8) / (P.tokensPerSecond * POOLS.prefillRho);
  return {
    cache: c,
    fastPerSecond,
    reasoningPerSecond,
    ctxFast,
    ctxReason,
    fast,
    reason,
    design,
    noStore: { followHit: noStore.followHit, ...fleet(noStore.computed) },
    noAffinity: { followHit: noAffinity.followHit, ...fleet(noAffinity.computed) },
    neither: { followHit: neither.followHit, ...fleet(neither.computed) },
    keepAll: { computed: keepAllCache.computed, promptAvg: keepAllCache.promptAvg, ...keepAll },
    atDeepseekHit,
    keepAllAtDeepseekHit,
    noMtp,
    halfDecode,
    turn50,
    gpuSecFast,
    gpuSecReason,
    costRatioReasoning: gpuSecReason / gpuSecFast,
    reasoningGpuShare: (design.reasoningRacks * 72) / design.gpus,
    prefillGpuShare: design.prefillGpus / design.gpus,
    concurrentStreams:
      fastPerSecond * (POOLS.fastOutput / POOLS.fastSpeed) +
      reasoningPerSecond * (POOLS.reasoningOutput / POOLS.reasoningSpeed),
    // KV-store reads at peak, all regions (GB a second): what affinity saves, since without it hits come from the store.
    storeReadsPeakGBps: (peak * (c.hit.store * c.promptAvg) * HARDWARE.model.kvBytesPerToken) / 1e9,
    storeReadsNoAffinityGBps: (peak * (noAffinity.hit.store * c.promptAvg) * HARDWARE.model.kvBytesPerToken) / 1e9,
  };
})();

/** The router's operating points priced (sheet deep dive 2): per 1,000 auto turns. */
export const ROUTER_COST = (() => {
  const ratio = CAPACITY.costRatioReasoning;
  const thinkSec = BLOCKS.thinking / POOLS.reasoningSpeed; // 20 s
  const rows = ROUTER.points.map((pt) => {
    const pos = 1_000 * ROUTER.needsReasoning;
    const neg = 1_000 - pos;
    const tp = pos * pt.recall;
    const fn = pos - tp;
    const fp = neg * pt.fpr;
    const reasoning = tp + fp;
    const regenerated = fn * ROUTER.regenerateAfterMiss;
    const badAnswersKept = fn - regenerated;
    const gpuFastEq = 1_000 - reasoning + reasoning * ratio + regenerated * ratio;
    return { ...pt, tp, fn, fp, reasoning, regenerated, badAnswersKept, gpuFastEq, needlessWaitSec: fp * thinkSec };
  });
  return { ratio, thinkSec, rows, chosen: rows[1] };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Latency (sheet §12): a Monte Carlo over the simulated prefill queue and the stage fits
// ---------------------------------------------------------------------------------------------------------------------

export const STAGES = {
  edge: { p50: 15, p95: 40 },
  auth: { p50: 6, p95: 15 },
  inputSafety: { p50: 12, p95: 25 },
  router: ROUTER.latencyMs,
  contextLoad: { p50: 8, p95: 25 },
  recall: { p50: 18, p95: 45 },
  admission: { p50: 2, p95: 6 }, // rendezvous hash + bounded-load check at the inference router
  network: { p50: 20, p95: 60 },
  search: { p50: 700, p95: 1_500 }, // illustrative; see the answer-engine page for vendor-run numbers
} as const;

function latencyAt(rho: number, turns: number) {
  const sim = simulatePrefill(rho, turns);
  const r = rng(11);
  const kvB = HARDWARE.model.kvBytesPerToken;
  const fastStepMs = ((POOLS.decodeU * HARDWARE.decode.mtpTokensPerStep) / POOLS.fastSpeed) * 1_000; // 22.7
  const reasonStepMs = ((POOLS.decodeU * HARDWARE.decode.mtpTokensPerStep) / POOLS.reasoningSpeed) * 1_000; // 13.6
  const holdMs = (32 / POOLS.fastSpeed) * 1_000; // risky-input turns hold one 32-token window
  const fast: number[] = [];
  const hits: number[] = [];
  const misses: number[] = [];
  const searchStatus: number[] = [];
  const searchAnswer: number[] = [];
  const reasonStatus: number[] = [];
  const reasonAnswer: number[] = [];
  const thinkSigma = Math.log(4_500 / 2_000) / Z95;
  sim.drawn.forEach((d, i) => {
    const S = STAGES;
    const group = Math.max(
      draw(r, S.inputSafety),
      draw(r, S.router),
      draw(r, S.contextLoad),
      r() < TRAFFIC.recallShare ? draw(r, S.recall) : 0
    );
    const front = draw(r, S.edge) + draw(r, S.auth) + group + draw(r, S.admission);
    const load =
      d.path === "store"
        ? ((d.prefix * kvB) / HARDWARE.kvStore.readBytesPerSecondPerUnit + HARDWARE.kvStore.requestSec) * 1_000
        : 0;
    const transfer = ((d.prefix * kvB) / HARDWARE.rdmaBytesPerSecondPerUnit) * 1_000;
    const pre = front + load + sim.turnSojourn[i] + transfer;
    const net = draw(r, S.network);
    const ttft = pre + r() * fastStepMs + fastStepMs + net + (r() < 0.03 ? holdMs : 0);
    if (!d.search) {
      fast.push(ttft);
      if (d.path === "local" || d.path === "compaction") hits.push(ttft);
      if (d.path === "miss") misses.push(ttft);
    } else {
      const toolCall = (30 / POOLS.fastSpeed) * 1_000;
      const status = pre + r() * fastStepMs + toolCall;
      searchStatus.push(status + net);
      const cont =
        sim.contSojourn[i] + (((d.prefix + BLOCKS.searchResult) * kvB) / HARDWARE.rdmaBytesPerSecondPerUnit) * 1_000;
      searchAnswer.push(status + draw(r, S.search) + cont + r() * fastStepMs + fastStepMs + net);
    }
    reasonStatus.push(front + net);
    const think = 2_000 * Math.exp(thinkSigma * normal(r));
    reasonAnswer.push(pre + r() * reasonStepMs + (think / POOLS.reasoningSpeed) * 1_000 + net);
  });
  const q = (xs: number[]) => ({ p50: quantile(xs, 0.5), p95: quantile(xs, 0.95), n: xs.length });
  return {
    rho,
    measuredBusy: sim.measuredBusy,
    lambda: sim.lambda,
    fast: q(fast),
    hit: q(hits),
    miss: q(misses),
    searchStatus: q(searchStatus),
    searchAnswer: q(searchAnswer),
    reasonStatus: q(reasonStatus),
    reasonAnswer: q(reasonAnswer),
    prefillWaitSmall: q(sim.turnSojourn.filter((_, i) => sim.drawn[i].tokens <= 2_048)),
    prefillWaitLarge: q(sim.turnSojourn.filter((_, i) => sim.drawn[i].tokens > 2_048)),
    fastStepMs,
    reasonStepMs,
    holdMs,
  };
}

export const LATENCY = (() => {
  const main = latencyAt(POOLS.prefillRho, 60_000);
  // Fast-turn p95 against prefill-unit load (figure `chat-service/prefill-load`).
  const byRho = [0.3, 0.5, 0.6, 0.7, 0.8, 0.9].map((rho) => {
    const l = rho === POOLS.prefillRho ? main : latencyAt(rho, 15_000);
    return {
      rho,
      busy: l.measuredBusy,
      fastP50: l.fast.p50,
      fastP95: l.fast.p95,
      missP95: l.miss.p95,
      searchP95: l.searchAnswer.p95,
    };
  });
  // Decode is not stalled by prefill (separate pools); a gap is one step, longest when the batch is full: k ÷ s = 28.3 ms.
  const interTokenP95Ms = (HARDWARE.decode.mtpTokensPerStep / POOLS.fastSpeed) * 1_000;
  return { ...main, byRho, interTokenP95Ms };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Streaming, cancel and resume (sheet §6, deep dive 4)
// ---------------------------------------------------------------------------------------------------------------------

export const STREAM = (() => {
  const C = CAPACITY;
  const gpuSecPerFastToken = 1 / C.fast.tokensPerGpu;
  const gpuSecPerReasonToken = 1 / C.reason.tokensPerGpu;
  const fastTurns = TRAFFIC.perDay * ROUTER.fastShare;
  const reasonTurns = TRAFFIC.perDay * ROUTER.reasoningShare;
  const graceSec = 10;
  const stopFastTokens = fastTurns * TRAFFIC.stopShare * (POOLS.fastOutput / 2);
  const stopReasonTokens = reasonTurns * TRAFFIC.stopShare * (POOLS.reasoningOutput / 2);
  // Disconnect half-way: a fast answer has 225 tokens (3.75 s) left, inside the grace: it finishes. A reasoning answer
  // has 1,300 tokens (13 s) left: cancelled after 10 s (1,000 tokens), so 300 are saved.
  const fastRemainingSec = POOLS.fastOutput / 2 / POOLS.fastSpeed;
  const reasonSavedTokens = POOLS.reasoningOutput / 2 - graceSec * POOLS.reasoningSpeed;
  const disconnectReasonTokens = reasonTurns * TRAFFIC.disconnectShare * reasonSavedTokens;
  const savedGpuSec =
    stopFastTokens * gpuSecPerFastToken + (stopReasonTokens + disconnectReasonTokens) * gpuSecPerReasonToken;
  const bufferRetentionSec = 600;
  const bytesPerResponse = 12_000; // ≈ 150 numbered events with JSON framing; reasoning adds status events
  const bufferedResponses = TRAFFIC.peakPerSecond * bufferRetentionSec + C.concurrentStreams;
  return {
    graceSec,
    fastRemainingSec,
    reasonSavedTokens,
    savedGpuSec,
    savedGpusAverage: savedGpuSec / 86_400, // capacity, not cash: the fleet is reserved for the peak (review item 30)
    savedUsdIfSized: (savedGpuSec / 3_600) * HARDWARE.gpuHourUsd,
    keepAliveSec: 15,
    bufferedResponses,
    bufferGb: (bufferedResponses * bytesPerResponse) / 1e9,
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Conversation storage and deletion (sheet §7)
// ---------------------------------------------------------------------------------------------------------------------

export const STORAGE = (() => {
  const rawPerTurn = BLOCKS.turn * 4 + 2 * 250; // 2,900 B
  const perTurn = rawPerTurn / 2;
  const perDayTb = (TRAFFIC.perDay * perTurn) / 1e12;
  const peak = TRAFFIC.peakPerSecond;
  return {
    rawPerTurn,
    perTurn,
    perDayTb,
    perDayReplicatedTb: perDayTb * 3,
    perYearReplicatedPb: (perDayTb * 3 * 365) / 1_000,
    messageWritesPeak: peak * 2,
    conversationUpdatesPeak: peak,
    summaryWritesPeak: peak * CAPACITY.cache.hit.compaction,
    storeReadsPeak: peak * 0.05,
    avgConversationKb: (CONVERSATION.meanTurns * rawPerTurn) / 1_000,
    turn50ConversationKb: (50 * rawPerTurn) / 1_000,
    crossRegionRpoSec: 5, // asynchronous replication of the conversation store (illustrative)
    deletion: {
      cachesMin: 1,
      recallAndFileIndexHours: 1,
      kvBlocksMin: 15,
      storeDays: 30,
      backupsByKeyDestruction: true,
    },
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Limits (sheet §6, §10.11): fixed 5-hour windows; input charged at the policy's expected cost, not the cache outcome
// ---------------------------------------------------------------------------------------------------------------------

export const LIMITS = (() => {
  const c = CAPACITY.cache;
  // Charged input a turn = new tokens + this turn's share of fold work, whatever the cache did (review item 13).
  const chargedInputPerTurn = c.newTok + c.hit.compaction * c.compactionTokens; // ≈ 488 + 0.0366 × ~8,200
  return {
    free: { outputPer5h: 20_000, chargedInputPer5h: 200_000, reasoningOutputPerDay: 15_000 },
    paid: { outputPer5h: 200_000, chargedInputPer5h: 2_000_000, reasoningOutputPerWeek: 600_000 },
    windowHours: 5, // fixed window from the first message, reset shown to the user (dossier C21, A25)
    burstTurnsPerMinute: 30,
    maxOutputFast: 2_000,
    freeOverLimitShare: 0.04,
    chargedInputPerTurn,
    freeAnswersPer5h: 20_000 / BLOCKS.assistantMessage, // ≈ 44
    freeInputTurnsPer5h: 200_000 / chargedInputPerTurn,
    freeReasoningTurnsPerDay: 15_000 / (BLOCKS.thinking + BLOCKS.reasoningAnswer),
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Safety (sheet §14)
// ---------------------------------------------------------------------------------------------------------------------

export const SAFETY = (() => {
  const classifierTokensPerGpuSecond = 750_000; // ~1B classifier: 5 PFLOP/s × 0.3 ÷ 2e9 FLOP a token (illustrative)
  const inputTps = TRAFFIC.peakPerSecond * 450;
  const outputTps = CAPACITY.fastPerSecond * POOLS.fastOutput + CAPACITY.reasoningPerSecond * BLOCKS.reasoningAnswer;
  const thinkingTps = CAPACITY.reasoningPerSecond * BLOCKS.thinking; // monitored, not shown
  // Incremental (KV-cached) classifiers read each token once. Rescoring the whole answer at every 32-token window
  // would read an average answer ≈ (windows + 1) ÷ 2 times: 450 tokens = 14 windows → 7.5×.
  const windows = Math.ceil(POOLS.fastOutput / 32);
  const gpus = Math.ceil(((inputTps + outputTps + thinkingTps) / classifierTokensPerGpuSecond) * PRICES.gpuHeadroom);
  return {
    windowTokens: 32,
    exposureTokens: 64,
    holdShare: 0.03,
    holdMs: LATENCY.holdMs,
    inputTps,
    outputTps,
    thinkingTps,
    rescoreFactor: (windows + 1) / 2,
    gpus,
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Small model, cost, degradation (sheet §5, §12, §20)
// ---------------------------------------------------------------------------------------------------------------------

/** Turns a second one small-model GPU sustains, co-located (prefill and decode on the same GPU), no MTP. */
export const SMALL = (() => {
  const s = HARDWARE.small;
  const ctx = CAPACITY.ctxFast;
  const at = (u: number, computed: number = CAPACITY.cache.computed) =>
    (u - POOLS.fastSpeed * s.t0) /
    (computed / s.prefillPerSecond + POOLS.fastOutput * (s.computePerToken + ctx * s.kvReadPerToken));
  return { rPerGpu: at(POOLS.decodeU), rPerGpuHot: at(0.95), at };
})();

export const COST = (() => {
  const day = (gpus: number) => gpus * 24 * HARDWARE.gpuHourUsd;
  const C = CAPACITY;
  const s = HARDWARE.small;
  const freeFastPeak = TRAFFIC.peakPerSecond * TRAFFIC.freeTurnShare * (1 - ROUTER.free);
  const fallbackGpus = Math.ceil((freeFastPeak * LIMITS.freeOverLimitShare) / SMALL.rPerGpu);
  const gpuSec = (inTokens: number, outTokens: number) =>
    inTokens / s.prefillPerSecond + outTokens * (s.t0 / 32 + s.computePerToken + inTokens * s.kvReadPerToken);
  const compactionsPerDay = TRAFFIC.perDay * C.cache.hit.compaction;
  // The summariser rewrites the summary each fold: it reads the prior summary (average ≈ 1,000) + 8 raw turns + 300.
  const summaryIn = 1_000 + BLOCKS.foldSize * (BLOCKS.turn + EXTRAS) + 300;
  const summariserGpus = (compactionsPerDay * gpuSec(summaryIn, BLOCKS.summaryPerFold)) / 86_400;
  const extractIn = CONVERSATION.meanTurns * BLOCKS.turn + BLOCKS.savedMemories; // user-authored turns only (review item 5)
  const memoryGpus = (CONVERSATION.conversationsPerDay * 0.25 * gpuSec(extractIn, 50)) / 86_400;
  const titleGpus = (CONVERSATION.conversationsPerDay * gpuSec(BLOCKS.turn, 12)) / 86_400;
  // Thinking summaries for the "Thinking" stream: the small model reads the thinking tokens, writes 40 every ~5 s.
  const thinkingSummaryGpus = (C.reasoningPerSecond * gpuSec(BLOCKS.thinking, 4 * 40)) / 2; // peak, ÷ 2 for the day
  const backgroundGpus = Math.ceil(
    (summariserGpus + memoryGpus + titleGpus + thinkingSummaryGpus) * PRICES.gpuHeadroom
  );
  const routerGpus = 8;
  const storeUsdPerDay = (POOLS.regions * HARDWARE.kvStore.bytesPerRegion * HARDWARE.ssdUsdPerGbMonth) / 1e9 / 30.4;
  const lines = {
    prefill: day(C.design.prefillGpus),
    decode: day(C.design.decodeGpus),
    small: day(fallbackGpus + backgroundGpus),
    safety: day(SAFETY.gpus),
    router: day(routerGpus),
    kvStore: storeUsdPerDay,
    platform: 25_000,
    team: (150 * 400_000) / 365,
  };
  const total = sum(Object.values(lines));
  const c = C.cache;
  const listTurn = (computed: number, cachedRead: number, out: number) =>
    usd(computed, PRICES.mid.cacheWrite) + usd(cachedRead, PRICES.mid.cached) + usd(out, PRICES.mid.output);
  const listFast = listTurn(c.computed, c.promptAvg - c.computed, POOLS.fastOutput);
  const listReason = listTurn(c.computed + BLOCKS.reasoningRePrefill, c.promptAvg - c.computed, POOLS.reasoningOutput);
  const listPerDay = TRAFFIC.perDay * (ROUTER.fastShare * listFast + ROUTER.reasoningShare * listReason);
  return {
    fallbackGpus,
    summariserGpus,
    memoryGpus,
    titleGpus,
    thinkingSummaryGpus,
    backgroundGpus,
    routerGpus,
    lines,
    total,
    perTurn: total / TRAFFIC.perDay,
    gpuShare: (lines.prefill + lines.decode + lines.small + lines.safety + lines.router) / total,
    fastTurnUsd: (C.gpuSecFast / 3_600) * HARDWARE.gpuHourUsd,
    reasonTurnUsd: (C.gpuSecReason / 3_600) * HARDWARE.gpuHourUsd,
    listFast,
    listReason,
    listPerDay,
    extraUsd: {
      noStore: day(C.noStore.gpus - C.design.gpus),
      noAffinity: day(C.noAffinity.gpus - C.design.gpus),
      neither: day(C.neither.gpus - C.design.gpus),
      keepAll: day(C.keepAll.gpus - C.design.gpus),
      keepAllAtDeepseekHit: day(C.keepAllAtDeepseekHit.gpus - C.atDeepseekHit.gpus),
      atDeepseekHit: day(C.atDeepseekHit.gpus - C.design.gpus),
      noMtp: day(C.noMtp.gpus - C.design.gpus),
    },
  };
})();

/**
 * GPUs needed at the global peak after each rung (no regional headroom), against what is left when a region is lost
 * (2/3 of the fleet) or capacity halves. Rungs are cumulative; paid users stay on the large model throughout. Prefill
 * and decode are counted together. A region loss also brings a cold transient (FAILOVER below).
 */
export const DEGRADE = (() => {
  const C = CAPACITY;
  const c = C.cache;
  const peak = TRAFFIC.peakPerSecond;
  const paid = peak * TRAFFIC.paidTurnShare;
  const free = peak * TRAFFIC.freeTurnShare;
  const newFree = free * CONVERSATION.weights[0];
  const need = (o: {
    u: number;
    rho: number;
    thinking: number;
    freeReason: boolean;
    freeSmall: boolean;
    shedNew: boolean;
  }) => {
    const ctxR = c.promptAvg + (o.thinking + BLOCKS.reasoningAnswer) / 2;
    const fastR = decodeRate(POOLS.fastSpeed, POOLS.fastOutput, C.ctxFast, o.u).turnsPerGpu;
    const reasonR = decodeRate(POOLS.reasoningSpeed, o.thinking + BLOCKS.reasoningAnswer, ctxR, o.u).turnsPerGpu;
    const fr = o.freeReason ? free * ROUTER.free : 0;
    let ff = free - fr - (o.shedNew ? newFree : 0);
    const paidR = paid * ROUTER.paid;
    const largeFast = paid - paidR + (o.freeSmall ? 0 : ff);
    const largeTurns = largeFast + paidR + fr;
    const prefill = ((largeTurns * c.computed) / (HARDWARE.prefill.tokensPerSecond * o.rho)) * 8;
    const decode = largeFast / fastR + (paidR + fr) / reasonR;
    const small = o.freeSmall ? ff / SMALL.at(o.u) : 0;
    if (!o.freeSmall) ff = 0;
    return { prefill, decode, small, total: prefill + decode + small };
  };
  const base = {
    u: POOLS.decodeU,
    rho: POOLS.prefillRho,
    thinking: BLOCKS.thinking,
    freeReason: true,
    freeSmall: false,
    shedNew: false,
  };
  const hot = { u: 0.95, rho: POOLS.prefillRhoHot };
  const rungs = [
    { id: 0, label: "Normal", ...need(base) },
    { id: 1, label: "Free tier: no reasoning", ...need({ ...base, freeReason: false }) },
    { id: 2, label: "Run hot: decode 0.95, prefill ρ 0.8", ...need({ ...base, ...hot, freeReason: false }) },
    { id: 3, label: "Free tier on the small model", ...need({ ...base, ...hot, freeReason: false, freeSmall: true }) },
    {
      id: 4,
      label: "Paid thinking capped at 1,000 tokens",
      ...need({ ...base, ...hot, freeReason: false, freeSmall: true, thinking: 1_000 }),
    },
    {
      id: 5,
      label: "Shed new free chats (429, retry-after)",
      ...need({ ...base, ...hot, freeReason: false, freeSmall: true, thinking: 1_000, shedNew: true }),
    },
  ];
  const fleet = C.design.gpus;
  const regionLoss = (fleet * 2) / 3;
  const halved = fleet / 2;
  const firstFit = (avail: number) => rungs.find((r) => r.total <= avail)?.id ?? -1;
  return { rungs, fleet, regionLoss, halved, regionLossRung: firstFit(regionLoss), halvedRung: firstFit(halved) };
})();

/**
 * The first minutes after a region is lost (review item 16): its users arrive with no KV in the surviving regions, so
 * each of their chats misses once (≈ 7,800 tokens instead of 488). Paid failover turns recompute on the large model;
 * free failover turns take their first turn on the small model (then stay warm there until the region returns).
 */
export const FAILOVER = (() => {
  const C = CAPACITY;
  const c = C.cache;
  const peak = TRAFFIC.peakPerSecond;
  const survivingPrefill = (C.design.prefillUnits * 2) / 3; // units
  const capacityAt09 = survivingPrefill * HARDWARE.prefill.tokensPerSecond * 0.9;
  const own = (2 / 3) * peak * c.computed;
  const coldPaid = (1 / 3) * peak * TRAFFIC.paidTurnShare * c.missAvg;
  const coldFree = (1 / 3) * peak * TRAFFIC.freeTurnShare * c.missAvg;
  const smallGpusForColdFree = ((1 / 3) * peak * TRAFFIC.freeTurnShare) / SMALL.at(0.95, c.missAvg);
  return {
    capacityAt09,
    own,
    coldPaid,
    coldFree,
    paidFits: own + coldPaid <= capacityAt09,
    allFits: own + coldPaid + coldFree <= capacityAt09,
    smallGpusForColdFree,
    rpoSec: STORAGE.crossRegionRpoSec,
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Evaluation statistics (sheet §13) and targets (sheet §4)
// ---------------------------------------------------------------------------------------------------------------------

export const STATS = (() => {
  const ci = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  return {
    pairwise3000: ci(0.5, 3_000),
    compactionProbes2000: ci(0.95, 2_000),
    routerRecall300: ci(0.8, ROUTER.labelledSet * ROUTER.needsReasoning),
    routerFpr4700: ci(0.02, ROUTER.labelledSet * (1 - ROUTER.needsReasoning)),
    leakRuleOfThree: 3 / 3_000,
    poisonRuleOfThree: 3 / 2_000, // 0 planted memories in 2,000 poisoning attempts → ≤ 0.15%
    canaryTurnsPerDay: TRAFFIC.perDay * 0.01,
    thumbsDown1pct: ci(0.03, TRAFFIC.perDay * 0.01),
  };
})();

export const TARGETS = (() => {
  const L = LATENCY;
  const rows = [
    {
      id: "fast",
      label: "Fast turn, first token (all paths, 3% held)",
      p50: L.fast.p50,
      p95: L.fast.p95,
      targetP50: 300,
      targetP95: 600,
    },
    {
      id: "hit",
      label: "Fast turn, prefix on its home unit",
      p50: L.hit.p50,
      p95: L.hit.p95,
      targetP50: 250,
      targetP95: 500,
    },
    {
      id: "miss",
      label: "Fast turn, full miss (recompute)",
      p50: L.miss.p50,
      p95: L.miss.p95,
      targetP50: 600,
      targetP95: 1_200,
    },
    {
      id: "searchStatus",
      label: "Search turn: Searching shown",
      p50: L.searchStatus.p50,
      p95: L.searchStatus.p95,
      targetP50: 800,
      targetP95: 1_200,
    },
    {
      id: "searchAnswer",
      label: "Search turn: answer's first token",
      p50: L.searchAnswer.p50,
      p95: L.searchAnswer.p95,
      targetP50: 2_000,
      targetP95: 3_000,
    },
    {
      id: "reasonStatus",
      label: "Reasoning turn: Thinking shown",
      p50: L.reasonStatus.p50,
      p95: L.reasonStatus.p95,
      targetP50: 300,
      targetP95: 600,
    },
    {
      id: "reasonAnswer",
      label: "Reasoning turn: answer's first token",
      p50: L.reasonAnswer.p50,
      p95: L.reasonAnswer.p95,
      targetP50: 30_000,
      targetP95: 60_000,
    },
    {
      id: "gap",
      label: "Gap between streamed tokens",
      p50: 1_000 / POOLS.fastSpeed,
      p95: L.interTokenP95Ms,
      targetP50: 25,
      targetP95: 60,
    },
  ].map((r) => ({ ...r, meets: r.p50 <= r.targetP50 && r.p95 <= r.targetP95, headroomP95: r.targetP95 - r.p95 }));
  return {
    rows,
    allMet: rows.every((r) => r.meets),
    usdPerTurn: 0.003,
    availability: 0.999,
    compactionRetention: 0.95,
    routerRecall: 0.75,
    routerFprMax: 0.03,
    safetyExposureTokens: 64,
    memoryLeaks: 0,
    plantedMemories: 0,
  };
})();
