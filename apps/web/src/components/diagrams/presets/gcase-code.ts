// Constants and arithmetic for the "Design a Code Assistant" case study (/genai-system-design/case-studies/
// code-assistant; design sheet SYSTEM-DESIGN/plans/genai-design/design/code-assistant.md v2, dossier
// research/code-assistant.md, cited as "dossier F12"; review review/code-assistant-design.md). Specs in
// assets/diagrams/animated/code-assistant/ import from here, so the page, the figures and the tests share one set of
// numbers.
//
// This page defines its own product: an IDE coding assistant sold per seat (inline completion and next-edit
// suggestions, chat over a repository, an agent mode). The running customer is Brightpost's engineering team, whose
// repo brightpost-orders and CSV bug come from presets/agents.ts (CODING_TASK, CODING_CONTEXT), so the
// coding-agent-trace figure is reused unchanged.
//
// Every volume, mix, rate, throughput, salary and unit cost below is ILLUSTRATIVE unless a comment names a source.
// Model list prices (as of November 2026) come from gcase-answer.ts PRICES: mid-size model 2.00 input / 0.10 cache
// read / 2.50 five-minute cache write / 10.00 output USD per million tokens; small 0.10 / 0.01 / 0.125 / 0.50. A
// one-hour cache write is 2 × input (Anthropic prompt-caching docs, dossier F73). Self-hosted GPUs use PRICES.gpuHour
// (2.5 USD, illustrative). Hosted first token and decode speed come from production.ts LATENCY (400 ms for a short
// prompt, 4.4 ms per token); longer prompts add prefill time (CHAT_BUDGET).

import { PRICES } from "./gcase-answer";
import { LATENCY } from "./production";
import { CODING_CONTEXT, CODING_TASK } from "./agents";
import { EDIT_TOKENS } from "./agents-coding";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export { CODING_TASK };

/** Seats and active users (illustrative). */
export const SEATS = (() => {
  const seats = 100_000;
  const dauShare = 0.7; // share of seats active on a working day
  const workingDaysPerMonth = 21;
  return {
    seats,
    orgs: 1_500,
    dauShare,
    dau: seats * dauShare, // 70,000
    workingDaysPerMonth,
    daysPerMonth: 30,
    usageDays: workingDaysPerMonth * dauShare, // 14.7 active days per seat-month
    brightpostDevelopers: 400,
  };
})();

// ── Completion: context, budget, triggers, fleet ───────────────────────────────────────────────────────────────

/**
 * Completion prompt (2,000 tokens), stable blocks first so the next request reuses the KV prefix (review item 14).
 * The snippet and recent-edit blocks are frozen and refreshed every 30 s (about 1 request in 8), not per keystroke.
 *   header 50 + language-server signatures 200 + snippets from open tabs 350 + recent edits 150 + prefix 950
 *   + suffix 300 = 2,000.
 *   Between two requests the prefix grows by about 10 typed tokens; in PSM order the suffix follows the prefix, so it
 *   is recomputed: new = 10 + 300 = 310. On a refresh (1 in 8) everything from the snippets on is new: 1,750.
 *   Average new tokens = 7/8 × 310 + 1/8 × 1,750 = 271.25 + 218.75 = 490; reused 1,510.
 */
export const COMPLETION_CONTEXT = (() => {
  const blocks = [
    { id: "header", label: "Path and language", tokens: 50, frozen: "session" },
    { id: "lsp", label: "Signatures from the language server", tokens: 200, frozen: "file focus" },
    { id: "snippets", label: "Snippets from open tabs", tokens: 350, frozen: "30 s" },
    { id: "edits", label: "Recent edits", tokens: 150, frozen: "30 s" },
    { id: "prefix", label: "Code before the cursor", tokens: 950, frozen: "grows" },
    { id: "suffix", label: "Code after the cursor", tokens: 300, frozen: "recomputed" },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 2,000
  const typedBetweenRequests = 10;
  const suffix = 300;
  const newSteady = typedBetweenRequests + suffix; // 310
  const newOnRefresh = 350 + 150 + 950 + 300; // 1,750
  const refreshShare = 1 / 8;
  const newAvg = (1 - refreshShare) * newSteady + refreshShare * newOnRefresh; // 490
  return { blocks, total, newSteady, newOnRefresh, refreshShare, newAvg, reusedAvg: total - newAvg };
})();

/**
 * One completion GPU (illustrative; serving on vLLM or SGLang with chunked prefill, automatic prefix caching with a
 * per-organisation cache_salt (dossier F72), abort on cancel, sticky routing by developer).
 *   prefill 490 new tokens at 60,000 tokens/s = 8.2 ms of GPU time;
 *   decode in a batch of 64 at 6 ms a step, prompt-lookup drafting from the prefix and open files accepting 1.5
 *   tokens a step on average (model-free drafting, concept page speculative-decoding): 24 tokens = 16 steps; GPU time
 *   per request = 16 × 6 ÷ 64 = 1.5 ms. Total 9.7 ms → 104 a second at full use; run at 60% → 62 a second.
 *   Queue (M/D/1 mean wait at ρ = 0.6): ρ ÷ (2μ(1 − ρ)) = 0.6 ÷ (2 × 104 × 0.4) ≈ 7 ms.
 */
export const COMPLETION_GPU = (() => {
  const prefillTokensPerSecond = 60_000;
  const batch = 64;
  const stepMs = 6;
  const tokensPerStep = 1.5;
  const outputTokens = 24;
  const prefillMs = (COMPLETION_CONTEXT.newAvg / prefillTokensPerSecond) * 1_000; // 8.17
  const decodeGpuMs = ((outputTokens / tokensPerStep) * stepMs) / batch; // 1.5
  const gpuMs = prefillMs + decodeGpuMs; // 9.67
  const fullUse = 1_000 / gpuMs; // ≈ 103.5
  const utilisation = 0.6;
  const perGpu = fullUse * utilisation; // ≈ 62
  const queueMs = (utilisation / (2 * fullUse * (1 - utilisation))) * 1_000; // ≈ 7.2
  return {
    prefillMs,
    decodeGpuMs,
    gpuMs,
    fullUse,
    utilisation,
    perGpu,
    queueMs,
    batch,
    stepMs,
    tokensPerStep,
    outputTokens,
  };
})();

/**
 * Completion latency, last keystroke → ghost text, ms at p50 (illustrative stages; dossier F14 has the only public split).
 *   debounce 75 + context 15 + uplink 25 + gateway 5 + queue 7 + prefill 12 (8 compute + 4 scheduling)
 *   + first line 12 tokens ÷ 1.5 a step × 6 ms = 48 + filter 5 + downlink 25 + render 10 = 227 (target 300).
 *   p95 spreads: context 20, both network legs 60 (one route), queue 15, prefill 30 (a prefix miss of 2,000 tokens,
 *   and the morning burst on freshly scaled replicas), decode 40, render 10: √(…) ≈ 83 → ≈ 310 (target 500);
 *   adding the spreads (an upper bound) gives 402.
 *   Behind a corporate secure web gateway or VPN (+40 ms at p50, spread 60, illustrative 20–100): p50 267,
 *   p95 ≈ 267 + √(83² + 60²) ≈ 369; upper bound 502, at the target.
 */
export const COMPLETION_BUDGET = (() => {
  const debounce = 75;
  const stages = [
    { id: "debounce", label: "Debounce", ms: debounce, spread: 0 },
    { id: "context", label: "Gather context (client)", ms: 15, spread: 20 },
    { id: "uplink", label: "Network to region", ms: 25, spread: 60 }, // both legs' spread counted once, here
    { id: "gateway", label: "Gateway and auth", ms: 5, spread: 0 },
    { id: "queue", label: "Queue", ms: Math.round(COMPLETION_GPU.queueMs), spread: 15 },
    { id: "prefill", label: "Prefill (490 new tokens)", ms: 12, spread: 30 },
    {
      id: "decode",
      label: "First line (12 tokens, drafted)",
      ms: (12 / COMPLETION_GPU.tokensPerStep) * COMPLETION_GPU.stepMs,
      spread: 40,
    },
    { id: "filter", label: "Show or suppress", ms: 5, spread: 0 },
    { id: "downlink", label: "Network back", ms: 25, spread: 0 },
    { id: "render", label: "Render ghost text", ms: 10, spread: 10 },
  ] as const;
  const p50 = sum(stages.map((s) => s.ms)); // 227
  const spread = rss(stages.map((s) => s.spread)); // ≈ 82.6
  const proxy = { ms: 40, spread: 60 };
  return {
    stages,
    debounce,
    p50,
    spread,
    p95: p50 + spread, // ≈ 310
    p95UpperBound: p50 + sum(stages.map((s) => s.spread)), // 402
    proxyP50: p50 + proxy.ms, // 267
    proxyP95: p50 + proxy.ms + rss([spread, proxy.spread]), // ≈ 369
    proxyUpperBound: p50 + proxy.ms + sum(stages.map((s) => s.spread)) + proxy.spread, // 502
    afterDebounce: p50 - debounce, // 152: the time a request is exposed to the next keystroke
    targetP50: 300,
    targetP95: 500,
    typedThroughMs: 10,
    farUserP50: p50 + 100, // 327: a developer at 150 ms RTT; N2 is scoped to ≤ 50 ms RTT
  };
})();

/**
 * Keystroke timing (illustrative). Survival function of the gap after a key event: the share of gaps longer than t ms.
 * Typing comes in bursts of 100–300 ms between keys, so a short debounce fires on most keys (review item 2).
 */
const GAP_SURVIVAL: readonly (readonly [number, number])[] = [
  [0, 1],
  [50, 0.92],
  [75, 0.85],
  [150, 0.45],
  [225, 0.3],
  [250, 0.25],
  [500, 0.12],
  [1_000, 0.05],
  [5_000, 0],
];
export const gapSurvival = (t: number) => {
  for (let i = 1; i < GAP_SURVIVAL.length; i++) {
    const [t0, s0] = GAP_SURVIVAL[i - 1];
    const [t1, s1] = GAP_SURVIVAL[i];
    if (t <= t1) return s0 + ((s1 - s0) * (t - t0)) / (t1 - t0);
  }
  return 0;
};

/**
 * Completion funnel per active developer per working day, for a debounce d (illustrative).
 *   12,000 key events (8,000 typed characters plus deletions and moves) − 1,500 typed-through (the key matches the
 *   ghost text on screen; the client trims it, no request) = 10,500.
 *   Client rule: request at once after d only at a token boundary (40%: space, punctuation, newline, a finished
 *   identifier); mid-identifier only after a 250 ms pause.
 *   sent = 10,500 × 0.4 × S(d) + 10,500 × 0.6 × S(250).
 *   A request is cancelled if the next key lands before its ghost text, d + 152 ms after the last key:
 *   cancel share = (S(d) − S(d + 152)) ÷ S(d) at a boundary, (S(250) − S(402)) ÷ S(250) mid-identifier.
 *   A cancelled request costs 40% of a full one on average: a third are cancelled before the server starts (0), a
 *   third during queue or prefill (≈ 0.5), a third mid-decode (≈ 0.7).
 *   At d = 75: sent 3,570 + 1,575 = 5,145; cancelled ≈ 2,327 + 498 = 2,825 (55%); 2,320 complete;
 *   80% suppressed by the filter → 464 shown × 30% = 139 accepted × 40 characters × 80% kept at 10 minutes.
 */
export const funnelAt = (debounce: number) => {
  const keyEvents = 12_000;
  const typedThrough = 1_500;
  const rest = keyEvents - typedThrough; // 10,500
  const boundaryShare = 0.4;
  const midPause = 250;
  const exposed = COMPLETION_BUDGET.afterDebounce; // 152
  const sBoundary = gapSurvival(debounce);
  const sMid = gapSurvival(Math.max(midPause, debounce));
  const sentBoundary = rest * boundaryShare * sBoundary;
  const sentMid = rest * (1 - boundaryShare) * sMid;
  const cancelBoundary = (sBoundary - gapSurvival(debounce + exposed)) / sBoundary;
  const cancelMid = (sMid - gapSurvival(Math.max(midPause, debounce) + exposed)) / sMid;
  const sent = sentBoundary + sentMid;
  const cancelled = sentBoundary * cancelBoundary + sentMid * cancelMid;
  const cancelCost = 0.4;
  const equivalents = sent - cancelled * (1 - cancelCost); // full-request equivalents of GPU work
  const completed = sent - cancelled;
  const suppressShare = 0.8;
  const shown = completed * (1 - suppressShare);
  const acceptRate = 0.3; // Cody "as high as 30%", Google 37% (dossier F13, F16)
  const accepted = shown * acceptRate;
  const charsPerAccept = 40;
  const acceptedChars = accepted * charsPerAccept;
  const retainedChars = acceptedChars * 0.8;
  const typedChars = 8_000;
  return {
    debounce,
    keyEvents,
    typedThrough,
    sentBoundary,
    sentMid,
    sent,
    cancelBoundary,
    cancelMid,
    cancelled,
    cancelShare: cancelled / sent,
    equivalents,
    completed,
    shown,
    accepted,
    acceptedChars,
    retainedChars,
    retainedAiShare: retainedChars / (typedChars + acceptedChars),
    p50: debounce + COMPLETION_BUDGET.afterDebounce,
  };
};
export const FUNNEL = funnelAt(COMPLETION_BUDGET.debounce);
/** The debounce curve: a longer debounce sends fewer requests and cancels fewer, but adds to p50 one for one. */
export const DEBOUNCE_CURVE = [50, 75, 150, 250].map(funnelAt);

/**
 * Model A vs model B in an A/B (an illustration of the mechanism, not evidence): B shows a quarter fewer suggestions
 * with higher acceptance; its retained characters are lower. A: 400 × 30% × 40 × 0.8 = 3,840; B: 300 × 36% × 32 × 0.85.
 */
export const AB_EXAMPLE = (() => {
  const variant = (shown: number, accept: number, chars: number, kept: number) => ({
    shown,
    acceptRate: accept,
    accepted: shown * accept,
    charsPerAccept: chars,
    retainedChars: Math.round(shown * accept * chars * kept),
    retainedPerShown: r2(accept * chars * kept),
  });
  return { a: variant(400, 0.3, 40, 0.8), b: variant(300, 0.36, 32, 0.85) };
})();

/**
 * Completion fleet, sized per region from its own daily curve (review item 12).
 *   equivalents a day = 70,000 × 3,450 ≈ 242 M; mean over 24 h ≈ 2,795 a second.
 *   Regions carry 40%, 35% and 25% of daily volume; each peaks at 4 × its own 24-hour mean (its working hours).
 *   GPUs per region = ceil(share × 2,795 × 4 ÷ 62 × 1.3): 94 + 82 + 59 = 235.
 *   Autoscaled per region (weekday 10 peak hours + 14 at 40%; weekends 30%) = 235 × 392.4 GPU-hours, plus a
 *   pre-scale 30 minutes before each morning ramp (60% of the fleet × 0.5 h × 21 days).
 */
export const COMPLETION_FLEET = (() => {
  const equivalentsPerDay = SEATS.dau * FUNNEL.equivalents;
  const meanPerSecond = equivalentsPerDay / 86_400;
  const regionShares = [0.4, 0.35, 0.25];
  const regionPeakFactor = 4;
  const headroom = PRICES.gpuHeadroom; // 1.3
  const perRegion = regionShares.map((s) =>
    Math.ceil(((s * meanPerSecond * regionPeakFactor) / COMPLETION_GPU.perGpu) * headroom)
  );
  const gpus = sum(perRegion);
  const hoursPerGpu =
    SEATS.workingDaysPerMonth * (10 + 14 * 0.4) + (SEATS.daysPerMonth - SEATS.workingDaysPerMonth) * 24 * 0.3; // 392.4
  const prescaleHours = 0.6 * 0.5 * SEATS.workingDaysPerMonth; // 6.3 a GPU
  const gpuHoursPerMonth = gpus * (hoursPerGpu + prescaleHours);
  const gpuUsdPerMonth = gpuHoursPerMonth * PRICES.gpuHour;
  return {
    sentPerDay: SEATS.dau * FUNNEL.sent, // ≈ 360 M
    equivalentsPerDay,
    meanPerSecond,
    regionShares,
    perRegion,
    gpus,
    gpuHoursPerMonth,
    gpuUsdPerMonth,
    gpuPerSeat: gpuUsdPerMonth / SEATS.seats,
  };
})();

/**
 * Three ways to serve the completion model (review item 11), per seat a month, at 100,000 seats.
 *   (a) self-host an open-weight FIM model we fine-tune (Qwen2.5-Coder class, dossier F76): GPUs at 2.5 USD an hour
 *       + a 6-person model and serving team (25,000 USD a month each, loaded) + fine-tuning compute 6,400 GPU-hours.
 *   (b) the same model on a dedicated deployment at an inference provider: 4.0 USD a GPU-hour (illustrative 1.6×),
 *       a 2-person team, the same fine-tuning.
 *   (c) a per-token hosted FIM API (a Codestral-class endpoint exists, dossier F75; its price is not in PRICES, so the
 *       small-model list price stands in): every sent request billed, 1,510 cached × 0.01 + 490 × 0.10 + 24 × 0.50.
 *   Crossover of (a) and (b): fixed difference 100,000 USD a month ÷ variable difference (1.5 USD × GPU-hours a seat).
 */
export const SERVING_OPTIONS = (() => {
  const gpuHoursPerSeat = COMPLETION_FLEET.gpuHoursPerMonth / SEATS.seats; // ≈ 0.95
  const fineTuneUsd = 6_400 * PRICES.gpuHour; // 16,000
  const person = 25_000;
  const selfHost = (COMPLETION_FLEET.gpuUsdPerMonth + 6 * person + fineTuneUsd) / SEATS.seats;
  const providerGpuHour = 4.0;
  const dedicated = (COMPLETION_FLEET.gpuHoursPerMonth * providerGpuHour + 2 * person + fineTuneUsd) / SEATS.seats;
  const perRequest =
    usd(COMPLETION_CONTEXT.reusedAvg, PRICES.small.cached) +
    usd(COMPLETION_CONTEXT.newAvg, PRICES.small.input) +
    usd(COMPLETION_GPU.outputTokens, PRICES.small.output); // ≈ 0.0000761
  const hostedApi = (perRequest * COMPLETION_FLEET.sentPerDay * SEATS.workingDaysPerMonth) / SEATS.seats;
  const crossoverSeats = (4 * person) / (gpuHoursPerSeat * (providerGpuHour - PRICES.gpuHour));
  return { gpuHoursPerSeat, selfHost, dedicated, perRequest, hostedApi, crossoverSeats };
})();

// ── Chat ────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Chat turn (turn 1): 12,000 tokens = instructions and tools 3,200 + repo rules 800 (cached 4,000) + open file 2,000
 * + retrieved code 5,400 + question and selection 600 (uncached 8,000). Out 600 visible + 300 thinking.
 * A follow-up after more than 5 minutes misses the cache (5-minute lifetime, dossier F73): 30% of turns (illustrative)
 * write the 4,000 at 2.50 instead of reading at 0.10.
 *   cost = 0.7 × 4,000 × 0.10 + 0.3 × 4,000 × 2.50 + 8,000 × 2.00 + 900 × 10.00, per million = 0.0283 USD.
 */
export const CHAT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions and tools", tokens: 3_200, cached: true },
    { id: "rules", label: "Repo rules (AGENTS.md)", tokens: 800, cached: true },
    { id: "open-file", label: "Open file", tokens: 2_000, cached: false },
    { id: "retrieved", label: "Retrieved code", tokens: 5_400, cached: false },
    { id: "question", label: "Question and selection", tokens: 600, cached: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 12,000
  const cached = sum(blocks.filter((b) => b.cached).map((b) => b.tokens)); // 4,000
  const uncached = total - cached; // 8,000
  const out = 600 + 300;
  const missShare = 0.3;
  const perChat =
    (1 - missShare) * usd(cached, PRICES.mid.cached) +
    missShare * usd(cached, PRICES.mid.cacheWrite) +
    usd(uncached, PRICES.mid.input) +
    usd(out, PRICES.mid.output); // ≈ 0.0283
  return { blocks, total, cached, uncached, out, missShare, perChat };
})();

/**
 * Chat first token, ms at p50 (illustrative). Default retrieval is local grep and symbols; the embeddings arm adds a
 * server vector search in parallel (max of the two).
 *   context 30 + retrieval 100 + candidate upload 25 + fusion 5 + rerank 80 (35 candidates × 400 tokens = 14,000 ÷
 *   200,000 tokens/s = 70 ms + 10) + assemble 10 + provider hop 40 + first token 700 (400 + 6,000 uncached tokens
 *   beyond 2,000 at 20,000 tokens/s of provider prefill) + downlink 25 = 1,015 (target 1,200).
 *   p95 spreads: network 60, retrieval 50, rerank 30, provider hop 20, first token 600 (queueing on long prompts):
 *   √(…) ≈ 606 → ≈ 1,621 (target 2,500); upper bound 1,775.
 */
export const CHAT_BUDGET = (() => {
  const rerankCandidates = 35;
  const rerankMs = ((rerankCandidates * 400) / PRICES.smallEncoderTokensPerSecond) * 1_000 + 10; // 80
  const firstToken = LATENCY.firstTokenMs + ((CHAT.uncached - 2_000) / 20_000) * 1_000; // 700
  const localGrep = 100;
  const serverVector = 50 + 20 + 30 + 5; // 105 (embeddings arm)
  const rest = 30 + 25 + 5 + rerankMs + 10 + 40 + firstToken + 25;
  const p50 = rest + localGrep; // 1,015
  const p50Embeddings = rest + Math.max(localGrep, serverVector); // 1,020
  const spreads = [60, 50, 30, 20, 600];
  const p95 = p50 + rss(spreads); // ≈ 1,621
  return {
    rerankCandidates,
    rerankMs,
    firstToken,
    p50,
    p50Embeddings,
    p95,
    p95UpperBound: p50 + sum(spreads), // 1,775
    targetP50: 1_200,
    targetP95: 2_500,
    firstStatusMs: 300, // "searching 3 files…" shown while retrieval runs
  };
})();

// ── Agent ───────────────────────────────────────────────────────────────────────────────────────────────────────

type ModelPrice = { input: number; cached: number; cacheWrite: number; output: number };

/**
 * One agent run, step by step (review item 1). Context at step 1 = `start` (of which `startCached` is a prefix hot
 * from the organisation's other sessions); each step adds `growth` (its visible output plus the tool result, trimmed
 * to a short message). Step k reads the previous step's context from the cache and writes the rest; output = visible
 * + thinking. When the next context would pass `compactAt`, a compaction call (reads the context, writes a 3,000-token
 * summary) resets it to start + 3,000 summary + 2,000 file-state list, all written fresh.
 */
export function simulateRun(p: {
  steps: number;
  start: number;
  startCached: number;
  growth: number;
  visible: number;
  thinking: (step: number) => number;
  price: ModelPrice;
  compactAt?: number;
  inputCap?: number;
  usdCap?: number;
}) {
  let context = p.start;
  let cachedPrefix = p.startCached;
  let usdTotal = 0;
  let inputTotal = 0;
  let outputTotal = 0;
  let contextSum = 0;
  let compactions = 0;
  let stepsRun = 0;
  for (let k = 1; k <= p.steps; k++) {
    if (p.inputCap && inputTotal + context > p.inputCap) break;
    if (p.usdCap && usdTotal >= p.usdCap) break;
    const out = p.visible + p.thinking(k);
    usdTotal +=
      usd(cachedPrefix, p.price.cached) + usd(context - cachedPrefix, p.price.cacheWrite) + usd(out, p.price.output);
    inputTotal += context;
    outputTotal += out;
    contextSum += context;
    stepsRun = k;
    const next = context + p.growth;
    if (p.compactAt && next > p.compactAt) {
      usdTotal += usd(context, p.price.cached) + usd(3_000, p.price.output); // the compaction call
      outputTotal += 3_000;
      context = p.start + 3_000 + 2_000;
      cachedPrefix = p.startCached;
      compactions++;
    } else {
      cachedPrefix = context;
      context = next;
    }
  }
  return {
    usd: usdTotal,
    inputTokens: inputTotal,
    outputTokens: outputTotal,
    avgContext: contextSum / stepsRun,
    lastContext: context,
    compactions,
    stepsRun,
  };
}

/**
 * The agent (illustrative). Main loop on the mid model; exploration in `explore` subagents on the small model, each a
 * run of its own whose 1,500-token summary is part of the main loop's growth (review item 23).
 *   Step 1 = instructions 2,000 (with the root AGENTS.md) + tools 1,500 + task 300 (CODING_CONTEXT.step1) + repo map
 *   1,500 = 5,300, of which 3,500 (instructions and tools) is a hot prefix.
 *   Median task: 20 main steps growing 2,500 a step (5,300 → 52,800, average 29,050; under the 100,000 compaction
 *   point) + 3 explore runs of 6 small-model steps (3,000 → 18,000, 200 visible out each, a 1,500-token summary).
 *   Thinking budget per step type (review item 21): plan 2,000 (1 step), edit 800 (7), check 400 (4), search or read
 *   200 (8): 10,800 a task, 540 a step on average. Visible output 300 a step.
 */
export const AGENT = (() => {
  const repoMap = 1_500;
  const step1 = [
    { id: "instructions", label: "Instructions and AGENTS.md", tokens: CODING_CONTEXT.step1.instructions },
    { id: "tools", label: "Tools", tokens: CODING_CONTEXT.step1.tools },
    { id: "task", label: "Task", tokens: CODING_CONTEXT.step1.task },
    { id: "repo-map", label: "Repo map", tokens: repoMap },
  ] as const;
  const start = sum(step1.map((b) => b.tokens)); // 5,300
  const startCached = CODING_CONTEXT.step1.instructions + CODING_CONTEXT.step1.tools; // 3,500
  const growth = 2_500;
  const visible = 300;
  const compactAt = 100_000;
  // Median task: step 1 a search (so the first tool call comes fast), step 2 the plan, then 7 edits, 4 checks and the
  // other 7 searches or reads (order changes cost little).
  const medianTypes = [
    "read",
    "plan",
    ...Array(3).fill("read"),
    ...Array(7).fill("edit"),
    ...Array(4).fill("check"),
    ...Array(4).fill("read"),
  ];
  const thinkingOf: Record<string, number> = { plan: 2_000, edit: 800, check: 400, read: 200 };
  const thinkingMedian = (k: number) => thinkingOf[medianTypes[k - 1] ?? "read"];
  const thinkingAvg = 540;
  const main = simulateRun({
    steps: 20,
    start,
    startCached,
    growth,
    visible,
    thinking: thinkingMedian,
    price: PRICES.mid,
    compactAt,
  });
  const explore = simulateRun({
    steps: 6,
    start: 3_000,
    startCached: 2_000,
    growth: 3_000,
    visible: 200,
    thinking: () => 0,
    price: PRICES.small,
  });
  const exploreRun = explore.usd + usd(1_500, PRICES.small.output); // + the summary
  const exploreRuns = 3;
  const resumeMissShare = 0.1; // tasks that wait > 5 minutes for an approval and lose the cache once
  const resumeMiss = resumeMissShare * usd(main.avgContext, PRICES.mid.cacheWrite - PRICES.mid.cached);
  const perTask = main.usd + exploreRuns * exploreRun + resumeMiss; // 0.344 + 0.011 + 0.007 ≈ 0.363
  // Without caching (every input token at the input price) and with exploration on the mid model:
  const mainUncached = simulateRun({
    steps: 20,
    start,
    startCached: 0,
    growth,
    visible,
    thinking: thinkingMedian,
    price: { ...PRICES.mid, cached: PRICES.mid.input, cacheWrite: PRICES.mid.input },
  });
  const exploreOnMid =
    simulateRun({
      steps: 6,
      start: 3_000,
      startCached: 2_000,
      growth: 3_000,
      visible: 200,
      thinking: () => 0,
      price: PRICES.mid,
    }).usd + usd(1_500, PRICES.mid.output);
  const exploreUncachedSmall =
    simulateRun({
      steps: 6,
      start: 3_000,
      startCached: 0,
      growth: 3_000,
      visible: 200,
      thinking: () => 0,
      price: { ...PRICES.small, cached: PRICES.small.input, cacheWrite: PRICES.small.input },
    }).usd + usd(1_500, PRICES.small.output);
  const perTaskNoCache = mainUncached.usd + exploreRuns * exploreUncachedSmall;
  // p95 task: 50 main steps (compaction once), 6 explore runs; thinking at the same average mix.
  const p95Main = simulateRun({
    steps: 50,
    start,
    startCached,
    growth,
    visible,
    thinking: () => thinkingAvg,
    price: PRICES.mid,
    compactAt,
  });
  const perTaskP95 =
    p95Main.usd + 6 * exploreRun + resumeMissShare * usd(p95Main.avgContext, PRICES.mid.cacheWrite - PRICES.mid.cached);
  // Thinking sensitivity: 2,000 thinking tokens on every step.
  const heavyThinking = simulateRun({
    steps: 20,
    start,
    startCached,
    growth,
    visible,
    thinking: () => 2_000,
    price: PRICES.mid,
    compactAt,
  });
  const perTaskHeavyThinking = heavyThinking.usd + exploreRuns * exploreRun + resumeMiss;
  // Caps on a long task: 2 USD binds first, before 6 M input tokens, 120 steps and 30 minutes (values printed below).
  const longRun = {
    steps: 120,
    start,
    startCached,
    growth,
    visible,
    thinking: () => thinkingAvg,
    price: PRICES.mid,
    compactAt,
  };
  const capped = simulateRun({ ...longRun, usdCap: 2, inputCap: 6_000_000 });
  const tokenCapped = simulateRun({ ...longRun, inputCap: 6_000_000 });

  // Time. Main step = first token 400 + (visible + thinking) × 4.4 ms. Small model: 200 ms first token, 2 ms a token.
  const mainModelMs = 20 * LATENCY.firstTokenMs + main.outputTokens * LATENCY.decodeMsPerToken; // 81,920
  const exploreMs = exploreRuns * (6 * 200 + (6 * 200 + 1_500) * 2); // 19,800
  const toolMs = 4 * 30_000 + 4 * 2_000 + 7 * 50 + 5 * 300; // tests, diagnostics, edits, greps and reads = 129,850
  const medianMs = mainModelMs + exploreMs + toolMs; // ≈ 231,570
  const p95Ms =
    50 * LATENCY.firstTokenMs +
    50 * (visible + thinkingAvg) * LATENCY.decodeMsPerToken +
    6 * 6_600 +
    10 * 30_000 +
    180_000 +
    10 * 2_000 +
    30 * 300;
  const heavyThinkingMs =
    20 * LATENCY.firstTokenMs + heavyThinking.outputTokens * LATENCY.decodeMsPerToken + exploreMs + toolMs;
  const cappedMs =
    capped.stepsRun * (LATENCY.firstTokenMs + (visible + thinkingAvg) * LATENCY.decodeMsPerToken) + 20 * 30_000;
  // The CSV fix (coding-agent-trace): 9 steps on the mid model, growing 2,525 a step (5,300 → 25,500), no exploration;
  // thinking: 2 edits, 3 checks, 4 searches, reads or the summary.
  const csvTypes = ["read", "read", "edit", "check", "check", "read", "edit", "check", "read"];
  const csv = simulateRun({
    steps: 9,
    start,
    startCached,
    growth: (25_500 - start) / 8,
    visible,
    thinking: (k) => thinkingOf[csvTypes[k - 1]],
    price: PRICES.mid,
  });
  const csvMs = 9 * LATENCY.firstTokenMs + csv.outputTokens * LATENCY.decodeMsPerToken + 2 * 30_000 + 3 * 300;
  return {
    step1,
    start,
    startCached,
    repoMap,
    growth,
    visible,
    compactAt,
    thinkingOf,
    thinkingAvg,
    main,
    exploreRun,
    exploreRuns,
    resumeMiss,
    perTask,
    perTaskNoCache,
    cachingSaving: 1 - (main.usd + exploreRuns * exploreRun) / perTaskNoCache, // caching alone
    routingSaving: exploreRuns * (exploreOnMid - exploreRun), // USD a task saved by exploring on the small model
    perTaskP95,
    p95Compactions: p95Main.compactions,
    perTaskHeavyThinking,
    caps: { inputTokens: 6_000_000, usd: 2, steps: 120, minutes: 30 },
    capped: {
      steps: capped.stepsRun,
      usd: capped.usd,
      minutes: cappedMs / 60_000,
      tokenCapSteps: tokenCapped.stepsRun,
    },
    medianMinutes: medianMs / 60_000, // ≈ 3.9
    p95Minutes: p95Ms / 60_000,
    heavyThinkingMinutes: heavyThinkingMs / 60_000,
    firstTextMs: LATENCY.firstTokenMs + 50, // + network
    firstToolCallMs: LATENCY.firstTokenMs + (visible + thinkingOf.read) * LATENCY.decodeMsPerToken, // step 1 is a search: 2,600
    targets: { medianMinutes: 5, p95Minutes: 20, firstTextMs: 1_000, firstToolCallMs: 3_000 },
    csvFix: { usd: csv.usd, minutes: csvMs / 60_000, lastContext: 25_500 },
  };
})();

/**
 * Cloud tasks (illustrative). A microVM (2 vCPU, 4 GB, 0.10 USD an hour) per task. Setup from a per-repository
 * environment snapshot rebuilt on lockfile change: 1 minute on a hit (80%), 8 minutes on a miss (clone + install
 * through the registry mirror). Snapshot builds: 7,500 repositories × 2 a day × 10 minutes; storage 5 GB each at
 * 0.02 USD per GB-month.
 */
export const CLOUD = (() => {
  const vmUsdPerHour = 0.1;
  const hitShare = 0.8;
  const setupMinutes = hitShare * 1 + (1 - hitShare) * 8; // 2.4
  const taskMinutes = setupMinutes + AGENT.medianMinutes;
  const perTask = (taskMinutes / 60) * vmUsdPerHour;
  const snapshotBuildsUsd = 7_500 * 2 * (10 / 60) * vmUsdPerHour * SEATS.daysPerMonth; // 7,500
  const snapshotStorageUsd = 7_500 * 5 * 0.02; // 750
  return {
    share: 0.25,
    setupMinutes,
    setupHitMinutes: 1,
    setupMissMinutes: 8,
    perTask,
    snapshotsPerSeat: (snapshotBuildsUsd + snapshotStorageUsd) / SEATS.seats,
  };
})();

// ── Edit application ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Edit application, end to end from the agent's step to the diff on screen (review item 26). The speculative speed
 * is Cursor's 2024 figure for a 70B model (dossier F19, vendor), held as our design point at a batch of 8 or less.
 *   search-and-replace: one edit step (400 + (60 + 800 thinking) × 4.4) + 10 ms harness ≈ 4.2 s.
 *   sketch + fast apply of the enclosing 40-line region: (400 + (150 + 800) × 4.4) + 50 network + 10 prefill + 30
 *   first token + 400 tokens at 1,000/s ≈ 5.1 s.
 *   whole file by the agent model: 400-line file 400 + (4,000 + 800) × 4.4 ≈ 21.5 s; 2,000-line file ≈ 91.9 s.
 *   Fleet floor: 3 regions × 2 replicas × 720 hours = 4,320 GPU-hours (use is 510) → 0.108 USD a seat.
 */
export const APPLY = (() => {
  const step = (visibleTokens: number) =>
    LATENCY.firstTokenMs + (visibleTokens + AGENT.thinkingOf.edit) * LATENCY.decodeMsPerToken;
  const tokensPerLine = 10;
  const speculative = 1_000;
  const vanilla = speculative / 13; // ≈ 77 tokens/s (dossier F19: about 13×)
  const regionTokens = 40 * tokensPerLine;
  const searchReplaceS = (step(60) + 10) / 1_000; // ≈ 4.19
  const sketchApplyS = (step(150) + 50 + 10 + 30 + (regionTokens / speculative) * 1_000) / 1_000; // ≈ 5.07
  const wholeFile400S = step(400 * tokensPerLine) / 1_000; // ≈ 21.5
  const wholeFile2000S = step(2_000 * tokensPerLine) / 1_000; // ≈ 91.9
  const floorGpuHours = 3 * 2 * 720;
  const useGpuHours = (SEATS.dau * 5 * (2_000 / speculative / 8) * SEATS.workingDaysPerMonth) / 3_600; // ≈ 510
  return {
    tokensPerLine,
    speculative,
    vanilla,
    draftLength: 16,
    rewrite2000: { vanilla: (2_000 * tokensPerLine) / vanilla, speculative: (2_000 * tokensPerLine) / speculative }, // 260 s, 20 s
    searchReplaceTokens: EDIT_TOKENS.replace, // 40 (concept page); 60 with path and anchors
    searchReplaceS,
    sketchApplyS,
    wholeFile400S,
    wholeFile2000S,
    floorGpuHours,
    useGpuHours,
    perSeat: (Math.max(floorGpuHours, useGpuHours) * PRICES.gpuHour) / SEATS.seats, // 0.108
    hostedApplyVendorTps: 10_500, // Morph morph-v3-fast, vendor claim (dossier F77)
  };
})();

// ── Repository index ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Indexes for Brightpost's monorepo (illustrative sizes; Merkle cost from dossier F24: 3.2 MB for 50,000 files = 64
 * bytes an entry including the name).
 *   Local sparse n-gram index (dossier F61): source 50,000 × 8 KB = 400 MB; index ≈ 0.3 × source = 120 MB; build at
 *   50 MB/s = 8 s. A 1M-file monorepo: 8 GB of source → 2.4 GB of index and 160 s: index the scopes the developer
 *   checks out (5%, ≈ 120 MB) and search the rest on a server index the git host builds per commit.
 *   One-file sync: a balanced tree over 50,000 files at fan-out 20 is ceil(log₂₀ 50,000) = 4 levels:
 *   4 × 20 × 64 B ≈ 5.1 KB compared in 4 round trips (≈ 200 ms at 50 ms RTT).
 *   Embeddings arm (large repos only): 100 M tokens ÷ 400 = 250,000 chunks × 512 B = 128 MB (× 1.5 graph = 192 MB);
 *   first embed 100 M ÷ 200,000 tokens/s = 500 GPU-seconds; daily churn 500 files × 5 chunks × 30% = 750 chunks.
 */
export const INDEX = (() => {
  const files = 50_000;
  const sourceMB = (files * 8_000) / 1_000_000; // 400
  const localIndexMB = sourceMB * 0.3; // 120
  const buildS = sourceMB / 50; // 8
  const levels = Math.ceil(Math.log(files) / Math.log(20)); // 4
  const entryBytes = (3.2 * 1_000_000) / files; // 64
  const tokens = files * 2_000; // 100 M
  const chunks = tokens / 400; // 250,000
  return {
    files,
    sourceMB,
    localIndexMB,
    buildS,
    monorepo1M: { sourceGB: 8, indexGB: 2.4, buildS: 160, localScopeShare: 0.05 },
    levels,
    entryBytes,
    oneFileCompareKB: (levels * 20 * entryBytes) / 1_000, // 5.12
    oneFileSyncMs: levels * 50, // 200
    tokens,
    chunks,
    vectorMB: (chunks * 512) / 1_000_000, // 128
    vectorIndexMB: ((chunks * 512) / 1_000_000) * 1.5, // 192
    fullEmbedGpuSeconds: tokens / PRICES.smallEncoderTokensPerSecond, // 500
    churnChunks: files * 0.01 * 5 * 0.3, // 750
    embeddingsArmMinFiles: 1_000, // the bucket Cursor reported (+2.6% retention, dossier F28), used only to pick the arm
    syncDebounceS: 30,
    freshness: { localGrepS: 1, embeddingsP95Min: 2, newCloneFirstQueryS: buildS },
    perSeat: 0.05, // sync service, server-side scope search and the embeddings arm, lumped
  };
})();

// ── Seat economics ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Cost per seat a month on the MEAN seat, with a heavy-user tail (review item 3). Active seats split (illustrative):
 * light 60% (1 agent task, 4 chats a day), median 30% (4 tasks, 10 chats), heavy 10% (12 tasks at twice the median
 * cost, 25 chats). Usage on 14.7 active days a seat-month.
 *   Fixed per seat: completion (self-host, team and fine-tuning included) + cloud snapshots + apply floor + rerank
 *   floor (one encoder GPU a region: 3 × 720 × 2.5 ÷ 100,000 = 0.054) + index 0.05.
 *   Usage: agent and chat at list prices, plus cloud VMs for 25% of tasks.
 *   Pricing control: each seat brings a 20 USD pooled usage allowance to its organisation (the Copilot pattern of pooled
 *   credits, dossier F58); usage above the pool is billed to the organisation per credit. Included cost per seat =
 *   fixed + min(mean usage, 20).
 */
export const COST = (() => {
  const segments = [
    { id: "light", share: 0.6, tasks: 1, taskCostFactor: 1, chats: 4 },
    { id: "median", share: 0.3, tasks: 4, taskCostFactor: 1, chats: 10 },
    { id: "heavy", share: 0.1, tasks: 12, taskCostFactor: 2, chats: 25 },
  ] as const;
  const rerankFloor = (3 * 720 * PRICES.gpuHour) / SEATS.seats; // 0.054
  const fixed = SERVING_OPTIONS.selfHost + CLOUD.snapshotsPerSeat + APPLY.perSeat + rerankFloor + INDEX.perSeat;
  const usageOf = (s: (typeof segments)[number]) =>
    SEATS.usageDays *
    (s.tasks * s.taskCostFactor * AGENT.perTask + s.chats * CHAT.perChat + CLOUD.share * s.tasks * CLOUD.perTask);
  const bySegment = segments.map((s) => ({ id: s.id, share: s.share, usage: usageOf(s), total: fixed + usageOf(s) }));
  const meanUsage = sum(bySegment.map((s) => s.share * s.usage));
  const meanSeat = fixed + meanUsage;
  const pool = 20;
  const included = fixed + Math.min(meanUsage, pool);
  const agentMean = SEATS.usageDays * sum(segments.map((s) => s.share * s.tasks * s.taskCostFactor * AGENT.perTask));
  return {
    segments,
    fixed,
    completion: SERVING_OPTIONS.selfHost,
    rerankFloor,
    bySegment,
    meanUsage,
    meanSeat, // ≈ 29.7
    agentMean,
    agentShareOfMean: agentMean / meanSeat,
    p90Seat: bySegment[1].total, // the 90th percentile seat sits at the top of the median segment
    heavySeat: bySegment[2].total,
    pool,
    included, // ≈ 24.5 ≤ 25
    overagePerSeat: Math.max(0, meanUsage - pool), // billed to the organisation
    target: 25,
  };
})();

// ── Evaluation ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Evaluation sizes (illustrative). Online A/B: a 10% arm (7,000 developers) against the other 90% (63,000), per-user
 * CV 1.0: MDE ≈ 2.8 × √(1/7,000 + 1/63,000) ≈ 3.5%; with organisation clustering (design effect 1.5, illustrative)
 * × √1.5 ≈ 4.3%. A 25% arm: 2.8 × √(1/17,500 + 1/52,500) × √1.5 ≈ 3.0%.
 * Offline: 300 past issues × 3 runs; at a 60% solve rate one run's 95% interval is ± 5.5 points, so releases are
 * compared paired, per task. SWE-bench Verified floor: 59.4% of the 138 hardest audited tasks = 82 tasks = 16.4% of 500.
 */
export const EVAL = (() => {
  const mde = (treat: number, control: number, deff = 1) => 2.8 * Math.sqrt(1 / treat + 1 / control) * Math.sqrt(deff);
  const arm10 = SEATS.dau * 0.1;
  const arm25 = SEATS.dau * 0.25;
  const designEffect = 1.5;
  return {
    arm10,
    mde10: mde(arm10, SEATS.dau - arm10), // ≈ 0.0353
    mde10Clustered: mde(arm10, SEATS.dau - arm10, designEffect), // ≈ 0.0432
    mde25Clustered: mde(arm25, SEATS.dau - arm25, designEffect), // ≈ 0.0299
    rollbackDrop10: 0.05, // at or above the clustered MDE of the 10% arm
    suiteTasks: 300,
    runs: 3,
    ci: 1.96 * Math.sqrt((0.6 * 0.4) / 300), // ≈ 0.055
    suiteRunUsd: 300 * 3 * AGENT.perTask,
    swebenchAudited: 138,
    swebenchFlawedOfAudited: 0.594,
    swebenchFloor: r3((0.594 * 138) / 500), // 0.164 (Epoch's floor, dossier F55)
    swebenchProBroken: 0.3, // dossier F53
    embeddingsArm: { orgsPerArm: 150, weeks: 4 }, // MDE set at launch from the observed intra-organisation correlation
  };
})();
