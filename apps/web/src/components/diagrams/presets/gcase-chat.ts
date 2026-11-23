// Constants and arithmetic for the "Design a ChatGPT-Style Chat Service" case study (/genai-system-design/case-studies/
// chatgpt-style-chat-service; design sheet SYSTEM-DESIGN/plans/genai-design/design/chatgpt-style-chat-service.md v1,
// dossier research/chatgpt-style-chat-service.md, facts cited as "dossier A9", "dossier B39", "dossier C6"). Specs in
// assets/diagrams/animated/chat-service/ import from here, so the page, the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost and NOT OpenAI. It defines its own ILLUSTRATIVE consumer chat product ("the assistant"),
// run by a company that trains and serves its own models on its own GPUs. Every volume, mix, rate, latency, gap
// distribution, router rate and unit cost below is ILLUSTRATIVE unless a comment names a source. Real-system facts used:
//   - KV bytes per token from the Llama 3 70B and 8B configs (80 / 32 layers, 8 KV heads, head dim 128; dossier B37–B39).
//     The design stores the KV cache in FP8 (1 byte), half the BF16 figure in B39.
//   - vLLM's default KV block is 16 tokens (B5); autoscaling on queue and KV use, not GPU utilisation (A37, B33, B34).
//   - Model list prices as of November 2026 are imported from the answer-engine preset (one price, one value across the
//     site): mid-size (Claude Sonnet 5.5 class) 2.00 input / 0.10 cache read / 2.50 5-minute cache write / 10.00 output
//     USD per million tokens. They are used ONLY for the "same tokens bought at list price" comparison; the design's own
//     cost per token is computed from GPU time at the answer-engine preset's illustrative 2.5 USD a GPU-hour.
//
// Capacity model (sheet §5, §12). One replica of the large model is 4 GPUs (80 GB, 3.35 TB/s each, H100-class figures)
// holding 70 GB of FP8 weights. In one second of replica time, at the peak operating point u (0.8, the headroom for
// bursts):
//   prefill costs 1 ÷ 16,000 s per computed prompt token, and
//   each decode step costs the weight read (70 GB ÷ 13.4 TB/s = 5.22 ms) + 12.2 ns per context token held in the batch
//   (163,840 B ÷ 13.4 TB/s), every sequence in the batch gaining one token per step.
// With a per-stream speed target s (tokens a second = steps a second) and Little's law for the batch (B = R × O ÷ s):
//   R × (p ÷ 16,000 + O × L × 12.2 ns) + s × 5.22 ms = u   →   R = (u − s × 5.22 ms) ÷ (p ÷ 16,000 + O × L × 12.2 ns)
// where R = turns a second a replica, p = prompt tokens computed per turn (after prefix-cache hits), O = output tokens,
// L = context tokens a sequence holds on average while it decodes. The KV check is B × L ≤ the KV budget. GPU
// utilisation appears nowhere: a continuously batched engine reads busy whenever any sequence runs.
//
// Latency (sheet §12): stages are normal fits to a p50 and p95; parallel stages are the maximum of their draws; a
// path's p95 is p50 + the root-sum-square of stage spreads (p95 − p50), with a correlated variant for stages that share
// a replica; paths are mixed with mixtureQuantile.

import { mixtureQuantile, PRICES } from "./gcase-answer";

const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));
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

/** Quantile q of the maximum of independent normal draws, each given by its p50 and p95 (bisection on Π CDF). */
function maxOfParts(parts: readonly Dist[], q: number) {
  const cdf = (t: number) => parts.reduce((p, d) => p * phi(((t - d.p50) / (d.p95 - d.p50)) * Z95), 1);
  let lo = 0;
  let hi = 100_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const maxDist = (parts: readonly Dist[]): Dist => ({ p50: maxOfParts(parts, 0.5), p95: maxOfParts(parts, 0.95) });

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
  return { window: w, blocks, total, cachedIfHit, newTokens, naiveBlocks, naive, ratio: naive / total };
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
// Hardware, KV cache and the capacity model (sheet §5, §12, deep dive 3)
// ---------------------------------------------------------------------------------------------------------------------

/** One replica of the large model (4 GPUs) and one of the small model (1 GPU). Hardware figures are illustrative. */
export const HARDWARE = (() => {
  const gpusPerReplica = 4;
  const hbmPerGpu = 80e9;
  const bandwidth = gpusPerReplica * 3.35e12; // 13.4 TB/s
  const weightBytes = 70e9; // 70B parameters in FP8
  const runtimeBytes = 30e9; // activations, CUDA graphs, fragmentation reserve
  const kvBudgetBytes = gpusPerReplica * hbmPerGpu - weightBytes - runtimeBytes; // 220 GB
  const kvBytesPerToken = 2 * 80 * 8 * 128 * 1; // K and V × 80 layers × 8 KV heads × 128 dims × 1 byte (FP8) = 163,840
  const kvBytesPerTokenBf16 = 2 * kvBytesPerToken; // 327,680 = 320 KiB (dossier B39)
  const kvTokens = kvBudgetBytes / kvBytesPerToken; // 1,342,773
  const flopsPerToken = 2 * 70e9;
  const prefillPerSecond = 16_000; // ≈ 4 × 989 TFLOP/s dense FP8 × 0.57 ÷ 1.4e11 FLOP a token = 16,107, rounded
  const weightReadSec = weightBytes / bandwidth; // 5.224 ms a decode step
  const kvReadSecPerToken = kvBytesPerToken / bandwidth; // 12.23 ns per context token per step
  const dramTokens = 768e9 / kvBytesPerToken; // 768 GB of host memory per replica for offloaded KV blocks: 4.69M tokens
  const hostLinkBytesPerSecond = 50e9; // host-to-GPU copy, per replica (illustrative)
  const prefillShareForOneRequest = 0.5; // chunked prefill: one prompt gets about half of each step → 8,000 tokens a s
  const small = {
    gpus: 1,
    weightBytes: 8e9, // 8B parameters in FP8
    kvBytesPerToken: 2 * 32 * 8 * 128 * 1, // 65,536 (Llama 3.1 8B config, FP8)
    kvTokens: 60e9 / (2 * 32 * 8 * 128), // 915,527
    prefillPerSecond: 35_000, // ≈ 989 TFLOP/s × 0.57 ÷ 1.6e10 = 35,234, rounded
    weightReadSec: 8e9 / 3.35e12, // 2.388 ms
    kvReadSecPerToken: (2 * 32 * 8 * 128) / 3.35e12, // 19.56 ns
  };
  return {
    gpusPerReplica,
    hbmPerGpu,
    bandwidth,
    weightBytes,
    runtimeBytes,
    kvBudgetBytes,
    kvBytesPerToken,
    kvBytesPerTokenBf16,
    kvTokens,
    flopsPerToken,
    prefillPerSecond,
    weightReadSec,
    kvReadSecPerToken,
    dramTokens,
    hostLinkBytesPerSecond,
    prefillShareForOneRequest,
    small,
    replicaHourUsd: gpusPerReplica * PRICES.gpuHour, // 10 USD
    maxOccupancy: 0.9, // above this the engine starts preempting sequences
    blockTokens: 16, // vLLM default (dossier B5)
  };
})();

/** Pools and their operating points (illustrative): the per-stream speed target and the planning utilisation. */
export const POOLS = {
  u: 0.8, // peak operating point: 20% headroom for bursts and replica loss inside a region
  fastSpeed: 40, // tokens a second per stream, p50 at peak
  reasoningSpeed: 60, // smaller batches, faster steps: thinking is waiting time
  fastOutput: BLOCKS.assistantMessage, // 450
  reasoningOutput: BLOCKS.thinking + BLOCKS.reasoningAnswer, // 2,600
  sticky: 0.92, // follow-ups that reach the replica holding their prefix (8% diverted by the load guard or churn)
  reasoningFollowsReasoning: 0.3, // reasoning turns whose previous turn also ran on the reasoning pool (can hit)
  gapMedianSec: 60, // gap between a user's turns: lognormal, median 60 s, p90 20 minutes (illustrative)
  gapP90Sec: 1_200,
} as const;

type Hw = { prefillPerSecond: number; weightReadSec: number; kvReadSecPerToken: number };

/** Turns a second one replica sustains at operating point u (the capacity equation in the header). */
export function turnsPerSecond(p: number, out: number, ctx: number, speed: number, u: number, hw: Hw = HARDWARE) {
  return (u - speed * hw.weightReadSec) / (p / hw.prefillPerSecond + out * ctx * hw.kvReadSecPerToken);
}

/**
 * Serve the turn mix on the large model under a context policy (sheet §5, deep dive 3). Iterates to a fixed point,
 * because the prefix-cache hit rate depends on how long a replica keeps a conversation's KV blocks, which depends on
 * how many new blocks it writes a second, which depends on the hit rate.
 */
export function serve(policy: "compact" | "naive", u: number = POOLS.u, hostMemory = true) {
  const W = CONVERSATION.weights;
  const win = W.map((_, k) => windowAt(k + 1));
  const prompt = (k: number) => (policy === "compact" ? win[k].prompt : win[k].naive);
  const compaction = (k: number) => policy === "compact" && win[k].compactionTurn;
  const first = W[0];
  const compactionShare = sum(W.map((w, k) => (compaction(k) ? w : 0)));
  const followShare = 1 - first - compactionShare;
  const promptAvg = sum(W.map((w, k) => w * prompt(k)));
  const missTokens = (k: number) => prompt(k) - BLOCKS.systemPrompt; // the global prefix hits on every warm replica
  // Miss sizes over follow-up turns (for the miss path's p50 and p95).
  const followIdx = W.map((_, k) => k).filter((k) => k > 0 && !compaction(k));
  const followW = sum(followIdx.map((k) => W[k]));
  const missAvg = sum(followIdx.map((k) => W[k] * missTokens(k))) / followW;
  const sorted = [...followIdx].sort((a, b) => missTokens(a) - missTokens(b));
  const quantile = (q: number) => {
    let acc = 0;
    for (const k of sorted) {
      acc += W[k] / followW;
      if (acc >= q) return missTokens(k);
    }
    return missTokens(sorted[sorted.length - 1]);
  };
  const compactionTokens =
    compactionShare > 0 ? sum(W.map((w, k) => (compaction(k) ? w * missTokens(k) : 0))) / compactionShare : 0;
  const compactionP95 = (() => {
    const idx = W.map((_, k) => k)
      .filter((k) => compaction(k))
      .sort((a, b) => missTokens(a) - missTokens(b));
    let acc = 0;
    for (const k of idx) {
      acc += W[k] / (compactionShare || 1);
      if (acc >= 0.95) return missTokens(k);
    }
    return idx.length ? missTokens(idx[idx.length - 1]) : 0;
  })();

  let tHbm = 120;
  let tTotal = 600;
  let out = {} as ReturnType<typeof step>;
  function step() {
    const fHbm = lognormalCdf(tHbm, POOLS.gapMedianSec, POOLS.gapP90Sec);
    const fTotal = lognormalCdf(tTotal, POOLS.gapMedianSec, POOLS.gapP90Sec);
    const hbm = POOLS.sticky * fHbm;
    const dram = POOLS.sticky * (fTotal - fHbm);
    const miss = 1 - hbm - dram;
    const newTok = win[0].newTokens; // 488
    // Prompt tokens computed per fast turn, averaged over turn indices.
    const pFirst = prompt(0) - BLOCKS.systemPrompt;
    const pFollow = (hbm + dram) * newTok + miss * missAvg;
    const pCompaction = compactionShare > 0 ? compactionTokens - BLOCKS.userHeader * (hbm + dram) : 0;
    const pFast = first * pFirst + followShare * pFollow + compactionShare * pCompaction;
    const ctxFast = promptAvg + POOLS.fastOutput / 2;
    const rFast = turnsPerSecond(pFast, POOLS.fastOutput, ctxFast, POOLS.fastSpeed, u);
    const batchFast = (rFast * POOLS.fastOutput) / POOLS.fastSpeed;
    const kvUsedFast = batchFast * ctxFast;
    // Reasoning turns: a hit only when the previous turn was also reasoning on the same replica; the next fast turn
    // re-prefills the stripped turn (750 tokens), charged here.
    const hitR = POOLS.reasoningFollowsReasoning * (hbm + dram);
    const pReason = (1 - first) * (hitR * newTok + (1 - hitR) * missAvg) + first * pFirst + BLOCKS.reasoningRePrefill;
    const ctxReason = promptAvg + POOLS.reasoningOutput / 2;
    const rReason = turnsPerSecond(pReason, POOLS.reasoningOutput, ctxReason, POOLS.reasoningSpeed, u);
    const batchReason = (rReason * POOLS.reasoningOutput) / POOLS.reasoningSpeed;
    const kvUsedReason = batchReason * ctxReason;
    // Residency: idle HBM and host memory divided by the new KV tokens the replica writes a second (LRU eviction).
    const writeRate = rFast * (pFast + POOLS.fastOutput);
    const hbmIdle = Math.max(0, HARDWARE.maxOccupancy * HARDWARE.kvTokens - kvUsedFast);
    return {
      fHbm,
      fTotal,
      hit: {
        first,
        hbm: followShare * hbm,
        dram: followShare * dram,
        miss: followShare * miss,
        compaction: compactionShare,
      },
      followHit: hbm + dram,
      pFirst,
      pFollow,
      pCompaction,
      pFast,
      ctxFast,
      rFast,
      batchFast,
      kvUsedFast,
      occupancyFast: kvUsedFast / HARDWARE.kvTokens,
      hitR,
      pReason,
      ctxReason,
      rReason,
      batchReason,
      kvUsedReason,
      occupancyReason: kvUsedReason / HARDWARE.kvTokens,
      writeRate,
      hbmIdle,
      residencyHbmSec: hbmIdle / writeRate,
      residencyTotalSec: (hbmIdle + (hostMemory ? HARDWARE.dramTokens : 0)) / writeRate,
      missShareOfPrefill: (followShare * miss * missAvg) / pFast,
    };
  }
  for (let i = 0; i < 30; i++) {
    out = step();
    tHbm = out.residencyHbmSec;
    tTotal = out.residencyTotalSec;
  }
  return {
    policy,
    u,
    promptAvg,
    missAvg,
    missP50: quantile(0.5),
    missP95: quantile(0.95),
    compactionShare,
    compactionP95,
    ...out,
  };
}

/** The design's operating point and the "keep everything" comparison (sheet §5, deep dive 3). */
export const CAPACITY = (() => {
  const compact = serve("compact");
  const naive = serve("naive");
  const peak = TRAFFIC.peakPerSecond;
  const fastPerSecond = peak * ROUTER.fastShare; // ≈ 21,143
  const reasoningPerSecond = peak * ROUTER.reasoningShare; // ≈ 2,005
  const fleet = (s: ReturnType<typeof serve>) => {
    const fastReplicas = Math.ceil(fastPerSecond / s.rFast);
    const reasoningReplicas = Math.ceil(reasoningPerSecond / s.rReason);
    const gpus = (fastReplicas + reasoningReplicas) * HARDWARE.gpusPerReplica;
    return { fastReplicas, reasoningReplicas, gpus };
  };
  // Turn 50 of the example chat decoding a fast answer: KV held per sequence and how many fit.
  const kvPerSeqGb = (tokens: number) => (tokens * HARDWARE.kvBytesPerToken) / 1e9;
  const turn50 = {
    compactGb: kvPerSeqGb(TURN50.total + POOLS.fastOutput), // 14,600 × 163,840 B ≈ 2.39 GB
    naiveGb: kvPerSeqGb(TURN50.naive + POOLS.fastOutput), // 60,500 × 163,840 B ≈ 9.91 GB
    compactFit: Math.floor((HARDWARE.maxOccupancy * HARDWARE.kvTokens) / (TURN50.total + POOLS.fastOutput)), // 82
    naiveFit: Math.floor((HARDWARE.maxOccupancy * HARDWARE.kvTokens) / (TURN50.naive + POOLS.fastOutput)), // 19
    // Decode step at the design's batch if every sequence were a turn-50 sequence: KV read per step vs the 25 ms budget.
    // Decode step if the design's whole batch (≈ 35 sequences) were turn-50 sequences: weights + KV read per step.
    compactStepMs:
      (HARDWARE.weightReadSec + compact.batchFast * (TURN50.total + 225) * HARDWARE.kvReadSecPerToken) * 1_000,
    naiveStepMs:
      (HARDWARE.weightReadSec + compact.batchFast * (TURN50.naive + 225) * HARDWARE.kvReadSecPerToken) * 1_000,
    missPrefillMs:
      ((TURN50.total - BLOCKS.systemPrompt) / (HARDWARE.prefillPerSecond * HARDWARE.prefillShareForOneRequest)) * 1_000,
    naiveMissPrefillMs:
      ((TURN50.naive - BLOCKS.systemPrompt) / (HARDWARE.prefillPerSecond * HARDWARE.prefillShareForOneRequest)) * 1_000,
    hitPrefillMs: (TURN50.newTokens / (HARDWARE.prefillPerSecond * HARDWARE.prefillShareForOneRequest)) * 1_000,
  };
  // If every follow-up missed (round-robin routing, no affinity): same policy, follow-up hit rate 0.
  const noAffinity = (() => {
    const pFast = compact.hit.first * compact.pFirst + (1 - compact.hit.first) * compact.missAvg;
    const rFast = turnsPerSecond(pFast, POOLS.fastOutput, compact.ctxFast, POOLS.fastSpeed, POOLS.u);
    return { pFast, rFast, fastReplicas: Math.ceil(fastPerSecond / rFast) };
  })();
  const design = fleet(compact);
  const hbmOnly = (() => {
    const s = serve("compact", POOLS.u, false);
    return { followHit: s.followHit, rFast: s.rFast, ...fleet(s) };
  })();
  const keepAll = fleet(naive);
  return {
    compact,
    naive,
    fastPerSecond,
    reasoningPerSecond,
    design,
    keepAll,
    noAffinity,
    hbmOnly,
    turn50,
    costRatioReasoning: compact.rFast / compact.rReason, // GPU time of a reasoning turn ÷ a fast turn
    gpuSavingCompaction: 1 - design.gpus / keepAll.gpus,
    concurrentStreams:
      fastPerSecond * (POOLS.fastOutput / POOLS.fastSpeed) +
      reasoningPerSecond * (POOLS.reasoningOutput / POOLS.reasoningSpeed),
  };
})();

/** The router's operating points priced (sheet deep dive 2): per 1,000 auto turns. */
export const ROUTER_COST = (() => {
  const ratio = CAPACITY.costRatioReasoning; // a reasoning turn costs ≈ 4.6 fast turns of GPU time
  const thinkSec = BLOCKS.thinking / POOLS.reasoningSpeed; // 33 s of waiting before the answer starts
  const rows = ROUTER.points.map((pt) => {
    const pos = 1_000 * ROUTER.needsReasoning; // 60
    const neg = 1_000 - pos; // 940
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
// Latency (sheet §12): time to first token per path, p50 and p95
// ---------------------------------------------------------------------------------------------------------------------

/** Stage budgets (ms, illustrative normal fits) and path totals. */
export const LATENCY = (() => {
  const c = CAPACITY.compact;
  const perRequestPrefill = HARDWARE.prefillPerSecond * HARDWARE.prefillShareForOneRequest; // 8,000 tokens a second
  const ms = (tokens: number) => (tokens / perRequestPrefill) * 1_000;
  const S = {
    edge: { p50: 15, p95: 40 }, // TLS on a reused connection, WAF, load balancer
    auth: { p50: 6, p95: 15 }, // session, tier, token-bucket check in Redis
    inputSafety: { p50: 12, p95: 25 }, // ~1B classifier on the message
    router: ROUTER.latencyMs,
    contextLoad: { p50: 8, p95: 25 }, // conversation cache read + assembly
    recall: { p50: 18, p95: 45 }, // memory index lookup, on 30% of turns
    queue: { p50: 40, p95: 250 }, // scheduler wait at u = 0.8
    firstStep: { p50: 25, p95: 40 },
    network: { p50: 20, p95: 60 },
  };
  const noRecall = maxDist([S.inputSafety, S.router, S.contextLoad]);
  const withRecall = maxDist([S.inputSafety, S.router, S.contextLoad, S.recall]);
  const groupParts = [
    { weight: 1 - TRAFFIC.recallShare, p50: noRecall.p50, spread: noRecall.p95 - noRecall.p50 },
    { weight: TRAFFIC.recallShare, p50: withRecall.p50, spread: withRecall.p95 - withRecall.p50 },
  ];
  const group: Dist = { p50: mixtureQuantile(groupParts, 0.5), p95: mixtureQuantile(groupParts, 0.95) };
  // Prefill before the first token. A non-search turn's new tokens: the 150-token message, + 300 recalled on 30%
  // (p50 240 tokens, p95 450). The first turn adds the 700-token user header. Misses re-read their whole context
  // except the global 2,500-token prefix (p50 6,816, p95 15,258 tokens over follow-up turns, from serve()).
  const prefill = {
    hit: { p50: ms(240), p95: ms(450) },
    first: { p50: ms(940), p95: ms(1_150) },
    miss: { p50: ms(c.missP50), p95: ms(c.missP95) },
    compaction: { p50: ms(c.pCompaction), p95: ms(c.compactionP95) },
  };
  const kvLoad = {
    p50: ((c.promptAvg * HARDWARE.kvBytesPerToken) / HARDWARE.hostLinkBytesPerSecond) * 1_000, // ≈ 30 ms
    p95: (((c.missP95 + BLOCKS.systemPrompt) * HARDWARE.kvBytesPerToken) / HARDWARE.hostLinkBytesPerSecond) * 1_000,
  };
  const front = [S.edge, S.auth, group, S.queue];
  const back = [S.firstStep, S.network];
  const path = (mid: Dist[]) => {
    const stages = [...front, ...mid, ...back];
    const p50 = sum(stages.map((d) => d.p50));
    const spreads = stages.map((d) => d.p95 - d.p50);
    // Correlated: queue, prefill, KV load and the first step share one replica, so their spreads add.
    const corr = [S.queue, ...mid, S.firstStep].map((d) => d.p95 - d.p50);
    const indep = [S.edge, S.auth, group, S.network].map((d) => d.p95 - d.p50);
    return { p50, p95: p50 + rss(spreads), p95Corr: p50 + sum(corr) + rss(indep) };
  };
  const paths = {
    first: path([prefill.first]),
    hbm: path([prefill.hit]),
    dram: path([kvLoad, prefill.hit]),
    miss: path([prefill.miss]),
    compaction: path([prefill.compaction]),
  };
  // Mix the paths by their shares of fast turns; 3% of turns (risky input) hold one 32-token window: + 800 ms.
  const holdMs = (32 / POOLS.fastSpeed) * 1_000;
  const holdShare = 0.03;
  const mix = (useCorr: boolean) => {
    const parts = (Object.keys(paths) as (keyof typeof paths)[]).flatMap((id) => {
      const p = paths[id];
      const w = c.hit[id];
      const p95 = useCorr ? p.p95Corr : p.p95;
      return [
        { weight: w * (1 - holdShare), p50: p.p50, spread: p95 - p.p50 },
        { weight: w * holdShare, p50: p.p50 + holdMs, spread: p95 - p.p50 },
      ];
    });
    return { p50: mixtureQuantile(parts, 0.5), p95: mixtureQuantile(parts, 0.95) };
  };
  const fast = { ...mix(false), p95Corr: mix(true).p95 };
  // Turn 50 of the example chat: hit (450 new tokens) and miss (11,650 tokens).
  const turn50Hit = path([{ p50: ms(TURN50.newTokens), p95: ms(TURN50.newTokens) + 10 }]);
  const turn50Miss = path([
    { p50: ms(TURN50.total - BLOCKS.systemPrompt), p95: ms(TURN50.total - BLOCKS.systemPrompt) + 60 },
  ]);
  // Search turns: the model emits a tool call (30 tokens at 40 a second), search runs, 2,000 result tokens prefill.
  const toolCall = { p50: (30 / POOLS.fastSpeed) * 1_000, p95: (30 / POOLS.fastSpeed) * 1_000 * 1.4 };
  const searchApi = { p50: 700, p95: 1_500 }; // illustrative; see the answer-engine page for vendor-run numbers
  const resultPrefill = { p50: ms(BLOCKS.searchResult), p95: ms(BLOCKS.searchResult) + 60 };
  const searchStatus = path([prefill.hit, toolCall]); // "Searching…" is shown when the tool call is parsed
  const searchAnswer = path([prefill.hit, toolCall, searchApi, resultPrefill, S.firstStep]);
  // Reasoning: the "Thinking" status goes out at admission; the answer starts after the thinking tokens.
  const think = { p50: (BLOCKS.thinking / POOLS.reasoningSpeed) * 1_000, p95: (4_500 / POOLS.reasoningSpeed) * 1_000 };
  const reasonPrefill = {
    p50: ms((1 - c.hitR) * c.missP50 + c.hitR * 240),
    p95: ms(c.missP95),
  };
  const reasoningStatus = { p50: sum([...front, S.network].map((d) => d.p50)), p95: 0 };
  reasoningStatus.p95 = reasoningStatus.p50 + rss([...front, S.network].map((d) => d.p95 - d.p50));
  const reasoningAnswer = path([reasonPrefill, think]);
  // Streaming: a decode step at the design's batch + the largest prefill chunk (512 tokens) bounds the gap.
  const decodeStepMs = (HARDWARE.weightReadSec + c.batchFast * c.ctxFast * HARDWARE.kvReadSecPerToken) * 1_000;
  const chunkMs = (512 / HARDWARE.prefillPerSecond) * 1_000;
  return {
    S,
    group,
    prefill,
    kvLoad,
    paths,
    holdMs,
    holdShare,
    fast,
    turn50Hit,
    turn50Miss,
    searchStatus,
    searchAnswer,
    reasoningStatus,
    reasoningAnswer,
    think,
    decodeStepMs,
    chunkMs,
    interTokenP95Ms: decodeStepMs + chunkMs,
    perRequestPrefill,
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Streaming, cancel and resume (sheet §6, Step 2, deep dive 4)
// ---------------------------------------------------------------------------------------------------------------------

/** GPU time one output token costs at the design's batch (replica-seconds): weights shared by the batch + own KV read. */
const decodeCostPerToken = (batch: number, ctx: number) =>
  HARDWARE.weightReadSec / batch + ctx * HARDWARE.kvReadSecPerToken;

export const STREAM = (() => {
  const c = CAPACITY.compact;
  const perTokenFast = decodeCostPerToken(c.batchFast, c.ctxFast); // ≈ 0.26 ms of replica time
  const perTokenReason = decodeCostPerToken(c.batchReason, c.ctxReason); // ≈ 0.31 ms
  const fastTurns = TRAFFIC.perDay * ROUTER.fastShare;
  const reasonTurns = TRAFFIC.perDay * ROUTER.reasoningShare;
  const graceSec = 10; // a dropped client may reattach within 10 s (mobile network change, tab reload)
  // Stop: 5% of answers, half-way on average. Saved only if the cancel reaches the engine (hop by hop).
  const stopFastTokens = fastTurns * TRAFFIC.stopShare * (POOLS.fastOutput / 2);
  const stopReasonTokens = reasonTurns * TRAFFIC.stopShare * (POOLS.reasoningOutput / 2);
  // Disconnect: 3% of streams, half-way. A fast answer has 225 tokens (5.6 s) left: inside the grace window, so it
  // finishes and is waiting when the user returns. A reasoning answer has 1,300 tokens (21.7 s) left: after 10 s
  // (600 tokens at 60 a second) with no client, it is cancelled; 700 tokens saved.
  const fastRemainingSec = POOLS.fastOutput / 2 / POOLS.fastSpeed;
  const reasonRemainingTokens = POOLS.reasoningOutput / 2;
  const reasonSavedTokens = reasonRemainingTokens - graceSec * POOLS.reasoningSpeed;
  const disconnectReasonTokens = reasonTurns * TRAFFIC.disconnectShare * reasonSavedTokens;
  const savedReplicaSec = stopFastTokens * perTokenFast + (stopReasonTokens + disconnectReasonTokens) * perTokenReason;
  const savedUsdPerDay = (savedReplicaSec / 3_600) * HARDWARE.replicaHourUsd;
  // Resume buffer: every event of a response is kept 10 minutes after the response ends (≈ 8 KB a response).
  const bufferRetentionSec = 600;
  const bytesPerResponse = 8_000;
  const bufferedResponses = TRAFFIC.peakPerSecond * bufferRetentionSec + CAPACITY.concurrentStreams;
  return {
    perTokenFastMs: perTokenFast * 1_000,
    perTokenReasonMs: perTokenReason * 1_000,
    graceSec,
    stopFastTokens,
    stopReasonTokens,
    fastRemainingSec,
    reasonSavedTokens,
    disconnectReasonTokens,
    savedReplicaSec,
    savedUsdPerDay,
    keepAliveSec: 15, // SSE comment line every 15 s (dossier C34)
    bufferRetentionSec,
    bytesPerResponse,
    bufferedResponses, // ≈ 14.2M at peak
    bufferGb: (bufferedResponses * bytesPerResponse) / 1e9, // ≈ 114 GB
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Conversation storage (sheet §7, deep dive 4)
// ---------------------------------------------------------------------------------------------------------------------

export const STORAGE = (() => {
  const bytesPerToken = 4;
  const metadataPerMessage = 250; // ids, parent id, model, route, timestamps, safety verdict, token counts
  const rawPerTurn = BLOCKS.turn * bytesPerToken + 2 * metadataPerMessage; // 2,900 B
  const compression = 2;
  const perTurn = rawPerTurn / compression; // 1,450 B
  const replicas = 3;
  const perDayTb = (TRAFFIC.perDay * perTurn) / 1e12; // 1.45 TB
  const peak = TRAFFIC.peakPerSecond;
  return {
    rawPerTurn,
    perTurn,
    perDayTb,
    perDayReplicatedTb: perDayTb * replicas, // 4.35 TB
    perYearReplicatedPb: (perDayTb * replicas * 365) / 1_000, // ≈ 1.59 PB before deletions
    messageWritesPeak: peak * 2, // user + assistant message: ≈ 46,300 a second
    conversationUpdatesPeak: peak, // leaf pointer, updated_at, title
    summaryWritesPeak: peak * CAPACITY.compact.compactionShare, // ≈ 850 a second
    cacheHitRate: 0.95, // conversation cache (Redis) in front of the store for context assembly
    storeReadsPeak: peak * (1 - 0.95), // ≈ 1,160 a second
    avgConversationKb: (CONVERSATION.meanTurns * rawPerTurn) / 1_000, // ≈ 17 KB
    turn50ConversationKb: (50 * rawPerTurn) / 1_000, // ≈ 145 KB
    deleteWithinDays: 30, // hard delete after a soft delete (OpenAI states 30 days, dossier A23; ours is illustrative)
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Limits and tiers, counted in tokens (sheet §6, §14)
// ---------------------------------------------------------------------------------------------------------------------

export const LIMITS = {
  // Per user. Cached input is not counted (as in Anthropic's ITPM, dossier C6); output counts as generated.
  free: { fastOutputPer5h: 20_000, uncachedInputPer5h: 200_000, reasoningOutputPerDay: 15_000 },
  paid: { fastOutputPer5h: 200_000, uncachedInputPer5h: 2_000_000, reasoningOutputPerWeek: 600_000 },
  windowHours: 5, // fixed window from the first message (as the Claude help centre describes, dossier C21)
  burstTurnsPerMinute: 30, // anti-abuse, per user and per IP range
  maxOutputFast: 2_000, // reserved at admission, refunded when the turn ends
  freeOverLimitShare: 0.04, // free turns served by the small model because the user's window is spent (illustrative)
  // How many average answers a window buys.
  freeAnswersPer5h: 20_000 / BLOCKS.assistantMessage, // ≈ 44
  freeReasoningTurnsPerDay: 15_000 / (BLOCKS.thinking + BLOCKS.reasoningAnswer), // ≈ 5.8
} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Safety (sheet §14)
// ---------------------------------------------------------------------------------------------------------------------

export const SAFETY = (() => {
  const classifierTokensPerGpuSecond = 247_000; // ~1B classifier: 989 TFLOP/s × 0.5 ÷ 2e9 FLOP a token
  const inputTokensPerTurn = 450; // the message + the last turn for context
  const inputTps = TRAFFIC.peakPerSecond * inputTokensPerTurn; // ≈ 10.4M tokens a second
  const outputTps = CAPACITY.fastPerSecond * POOLS.fastOutput + CAPACITY.reasoningPerSecond * BLOCKS.reasoningAnswer; // visible only
  const gpus = Math.ceil(((inputTps + outputTps) / classifierTokensPerGpuSecond) * PRICES.gpuHeadroom);
  return {
    windowTokens: 32,
    exposureTokens: 64, // stream-then-check: at most the window being checked + the next one before the stop lands
    holdShare: LATENCY.holdShare, // risky-input turns hold each window until checked
    holdMs: LATENCY.holdMs,
    inputTps,
    outputTps,
    gpus, // ≈ 115 with 30% headroom
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Cost per day (sheet §5, §12)
// ---------------------------------------------------------------------------------------------------------------------

/** Turns a second one small-model GPU sustains (8B, 1 GPU) on the same context mix. */
export const SMALL = (() => {
  const c = CAPACITY.compact;
  const at = (u: number) => turnsPerSecond(c.pFast, POOLS.fastOutput, c.ctxFast, POOLS.fastSpeed, u, HARDWARE.small);
  return { rPerGpu: at(POOLS.u), rPerGpuHot: at(0.95), largePerGpu: c.rFast / HARDWARE.gpusPerReplica, at };
})();

export const COST = (() => {
  const day = (gpus: number) => gpus * 24 * PRICES.gpuHour;
  const large = CAPACITY.design.gpus; // reserved for the peak: there are no spare GPUs to autoscale into (dossier A38)
  // Small pool: over-limit free turns at peak + background jobs averaged over the day.
  const freeFastPeak = TRAFFIC.peakPerSecond * TRAFFIC.freeTurnShare * (1 - ROUTER.free); // ≈ 17,950 a second
  const fallbackGpus = Math.ceil((freeFastPeak * LIMITS.freeOverLimitShare) / SMALL.rPerGpu);
  const small = HARDWARE.small;
  const gpuSec = (inTokens: number, outTokens: number) =>
    inTokens / small.prefillPerSecond + outTokens * (small.weightReadSec / 32 + inTokens * small.kvReadSecPerToken);
  const compactionsPerDay = TRAFFIC.perDay * CAPACITY.compact.compactionShare; // ≈ 36.6M
  const summaryIn = BLOCKS.summaryPerFold * 3 + BLOCKS.foldSize * (BLOCKS.turn + EXTRAS) + 300; // ≈ 8,700 tokens
  const summariserGpus = (compactionsPerDay * gpuSec(summaryIn, BLOCKS.summaryPerFold)) / 86_400;
  // Memory extraction once a chat goes idle, only on the 25% a cheap filter flags; reads the chat + memory list.
  const extractIn = CONVERSATION.meanTurns * (BLOCKS.turn + EXTRAS) + BLOCKS.savedMemories; // ≈ 6,100
  const memoryGpus = (CONVERSATION.conversationsPerDay * 0.25 * gpuSec(extractIn, 50)) / 86_400;
  const titleGpus = (CONVERSATION.conversationsPerDay * gpuSec(BLOCKS.turn, 12)) / 86_400;
  const backgroundGpus = Math.ceil((summariserGpus + memoryGpus + titleGpus) * PRICES.gpuHeadroom);
  const routerGpus = 20; // encoder replicas across regions (illustrative)
  const lines = {
    large: day(large),
    small: day(fallbackGpus + backgroundGpus),
    safety: day(SAFETY.gpus),
    router: day(routerGpus),
    platform: 25_000, // gateways, chat services, Redis, conversation store, PostgreSQL, egress (illustrative)
    team: (150 * 400_000) / 365, // serving, chat backend, safety and eval engineers: ≈ 164,400
  };
  const total = sum(Object.values(lines));
  // The same tokens bought at mid-size list price (Sonnet 5.5 class), with provider prompt caching: computed tokens
  // written to the 5-minute cache, the rest read from it, output at the output price.
  const c = CAPACITY.compact;
  const listTurn = (computed: number, cachedRead: number, out: number) =>
    usd(computed, PRICES.mid.cacheWrite) + usd(cachedRead, PRICES.mid.cached) + usd(out, PRICES.mid.output);
  const listFast = listTurn(c.pFast, c.promptAvg - c.pFast, POOLS.fastOutput);
  const listReason = listTurn(c.pReason, c.promptAvg - (c.pReason - BLOCKS.reasoningRePrefill), POOLS.reasoningOutput);
  const listPerDay = TRAFFIC.perDay * (ROUTER.fastShare * listFast + ROUTER.reasoningShare * listReason);
  // GPU cost per turn at the peak operating point (if the fleet were always that busy).
  const fastTurnUsd = HARDWARE.replicaHourUsd / 3_600 / c.rFast;
  const reasonTurnUsd = HARDWARE.replicaHourUsd / 3_600 / c.rReason;
  return {
    largeGpus: large,
    fallbackGpus,
    summariserGpus,
    memoryGpus,
    titleGpus,
    backgroundGpus,
    routerGpus,
    lines,
    total,
    perTurn: total / TRAFFIC.perDay,
    gpuShare: (lines.large + lines.small + lines.safety + lines.router) / total,
    fastTurnUsd,
    reasonTurnUsd,
    listFast,
    listReason,
    listPerDay,
    averageUtilisation: 1 / TRAFFIC.peakFactor, // the large fleet averages half its peak load
    keepAllExtraUsd: day(CAPACITY.keepAll.gpus - CAPACITY.design.gpus),
    noAffinityExtraUsd: day(
      (CAPACITY.noAffinity.fastReplicas - CAPACITY.design.fastReplicas) * HARDWARE.gpusPerReplica
    ),
  };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Graceful degradation at peak (sheet §20, deep dive 3)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * GPUs needed at the peak after each rung, against what is left when a region is lost (2/3 of the fleet) or capacity
 * halves. Rungs are cumulative; paid users stay on the large model throughout.
 */
export const DEGRADE = (() => {
  const c = CAPACITY.compact;
  const peak = TRAFFIC.peakPerSecond;
  const gpr = HARDWARE.gpusPerReplica;
  const fastR = (u: number) => turnsPerSecond(c.pFast, POOLS.fastOutput, c.ctxFast, POOLS.fastSpeed, u);
  const reasonR = (u: number, thinking: number) =>
    turnsPerSecond(
      c.pReason,
      thinking + BLOCKS.reasoningAnswer,
      c.promptAvg + (thinking + BLOCKS.reasoningAnswer) / 2,
      POOLS.reasoningSpeed,
      u
    );
  const paid = peak * TRAFFIC.paidTurnShare;
  const free = peak * TRAFFIC.freeTurnShare;
  const paidReason = paid * ROUTER.paid;
  const paidFast = paid - paidReason;
  const freeReason = free * ROUTER.free;
  const freeFast = free - freeReason;
  const newFreeChats = free * CONVERSATION.weights[0]; // first turns of free users: ≈ 3,240 a second
  const need = (o: {
    u: number;
    thinking: number;
    freeReasonOn: boolean;
    freeOnSmall: boolean;
    shedNewFree: boolean;
  }) => {
    const fr = o.freeReasonOn ? freeReason : 0;
    let ff = freeFast + (o.freeReasonOn ? 0 : freeReason);
    if (o.shedNewFree) ff -= newFreeChats;
    const large =
      ((paidFast + (o.freeOnSmall ? 0 : ff)) / fastR(o.u)) * gpr + ((paidReason + fr) / reasonR(o.u, o.thinking)) * gpr;
    const smallGpus = o.freeOnSmall ? ff / SMALL.at(o.u) : 0;
    return { large, small: smallGpus, total: large + smallGpus };
  };
  const base = { u: POOLS.u, thinking: BLOCKS.thinking, freeReasonOn: true, freeOnSmall: false, shedNewFree: false };
  const rungs = [
    { id: 0, label: "Normal: u = 0.8", ...need(base) },
    { id: 1, label: "Run hot: u = 0.95 (queues grow)", ...need({ ...base, u: 0.95 }) },
    { id: 2, label: "Free tier: no reasoning", ...need({ ...base, u: 0.95, freeReasonOn: false }) },
    {
      id: 3,
      label: "Free tier on the small model",
      ...need({ ...base, u: 0.95, freeReasonOn: false, freeOnSmall: true }),
    },
    {
      id: 4,
      label: "Paid thinking capped at 1,000 tokens",
      ...need({ ...base, u: 0.95, freeReasonOn: false, freeOnSmall: true, thinking: 1_000 }),
    },
    {
      id: 5,
      label: "Shed new free chats (429, retry-after)",
      ...need({ ...base, u: 0.95, freeReasonOn: false, freeOnSmall: true, thinking: 1_000, shedNewFree: true }),
    },
  ];
  const fleet = CAPACITY.design.gpus;
  const regionLoss = (fleet * 2) / 3;
  const halved = fleet / 2;
  const firstFit = (avail: number) => rungs.find((r) => r.total <= avail)?.id ?? -1;
  return { rungs, fleet, regionLoss, halved, regionLossRung: firstFit(regionLoss), halvedRung: firstFit(halved) };
})();

// ---------------------------------------------------------------------------------------------------------------------
// Evaluation statistics (sheet §13) and targets (sheet §4)
// ---------------------------------------------------------------------------------------------------------------------

export const STATS = (() => {
  const ci = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  return {
    pairwise3000: ci(0.5, 3_000), // ± 1.8 points on a 50% win rate
    compactionProbes2000: ci(0.95, 2_000), // ± 0.96 points at 95% retention
    routerRecall300: ci(0.8, ROUTER.labelledSet * ROUTER.needsReasoning), // ± 4.5 points (300 positives)
    routerFpr4700: ci(0.02, ROUTER.labelledSet * (1 - ROUTER.needsReasoning)), // ± 0.4 points
    leakRuleOfThree: 3 / 3_000, // 0 of 3,000 cross-user probes → ≤ 0.1%
    canaryTurnsPerDay: TRAFFIC.perDay * 0.01, // 10M turns on a 1% canary
    thumbsDown1pct: ci(0.03, TRAFFIC.perDay * 0.01), // ± 0.01 points a day at a 3% rate
  };
})();

export const TARGETS = (() => {
  const L = LATENCY;
  const rows = [
    {
      id: "fast",
      label: "Fast turn, first token (all paths, 3% held)",
      p50: L.fast.p50,
      p95: L.fast.p95Corr,
      targetP50: 500,
      targetP95: 1_600,
    },
    {
      id: "hit",
      label: "Fast turn on a cache hit (HBM or host memory)",
      p50: L.paths.dram.p50,
      p95: L.paths.dram.p95Corr,
      targetP50: 300,
      targetP95: 600,
    },
    {
      id: "searchStatus",
      label: "Search turn: Searching shown",
      p50: L.searchStatus.p50,
      p95: L.searchStatus.p95Corr,
      targetP50: 1_000,
      targetP95: 2_000,
    },
    {
      id: "searchAnswer",
      label: "Search turn: answer's first token",
      p50: L.searchAnswer.p50,
      p95: L.searchAnswer.p95Corr,
      targetP50: 2_500,
      targetP95: 3_500,
    },
    {
      id: "reasonStatus",
      label: "Reasoning turn: Thinking shown",
      p50: L.reasoningStatus.p50,
      p95: L.reasoningStatus.p95,
      targetP50: 500,
      targetP95: 1_000,
    },
    {
      id: "reasonAnswer",
      label: "Reasoning turn: answer's first token",
      p50: L.reasoningAnswer.p50,
      p95: L.reasoningAnswer.p95Corr,
      targetP50: 40_000,
      targetP95: 90_000,
    },
    {
      id: "gap",
      label: "Gap between streamed tokens",
      p50: 1_000 / POOLS.fastSpeed,
      p95: L.interTokenP95Ms,
      targetP50: 25,
      targetP95: 100,
    },
  ].map((r) => ({ ...r, meets: r.p50 <= r.targetP50 && r.p95 <= r.targetP95, headroomP95: r.targetP95 - r.p95 }));
  return {
    rows,
    allMet: rows.every((r) => r.meets),
    usdPerTurn: 0.003,
    availability: 0.999,
    compactionRetention: 0.95,
    routerRecall: 0.75, // gated as the lower bound: 0.80 measured − 4.5 points
    routerFprMax: 0.03,
    safetyExposureTokens: 64,
    memoryLeaks: 0,
  };
})();
