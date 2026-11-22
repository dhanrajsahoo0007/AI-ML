// Constants and arithmetic for the "Design a Code Assistant" case study (/genai-system-design/case-studies/
// code-assistant; design sheet SYSTEM-DESIGN/plans/genai-design/design/code-assistant.md, dossier
// research/code-assistant.md, cited as "dossier F12"). Specs in assets/diagrams/animated/code-assistant/ import from
// here, so the page, the figures and the tests share one set of numbers.
//
// This page defines its own product: an IDE coding assistant sold per seat (inline completion, chat over a repository,
// an agent mode). The running customer is Brightpost's engineering team, whose repo brightpost-orders and CSV bug come
// from presets/agents.ts (CODING_TASK), so the coding-agent-trace figure is reused unchanged.
//
// Every volume, mix, rate, throughput and unit cost below is ILLUSTRATIVE unless a comment names a source. Model list
// prices (as of November 2026) come from gcase-answer.ts PRICES (one price, one value across the site): mid-size model
// 2.00 input / 0.10 cache read / 2.50 cache write / 10.00 output USD per million tokens; small 0.10 / 0.01 / 0.125 /
// 0.50. The self-hosted completion and apply models are priced from PRICES.gpuHour (2.5 USD, illustrative). First token
// and decode speed of the hosted models come from production.ts LATENCY (400 ms, 4.4 ms per token).

import { PRICES } from "./gcase-answer";
import { LATENCY } from "./production";
import { CODING_CONTEXT, CODING_TASK } from "./agents";
import { EDIT_TOKENS } from "./agents-coding";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));
const r2 = (v: number) => Math.round(v * 100) / 100;

export { CODING_TASK };

/** Seats and active users (illustrative). */
export const SEATS = (() => {
  const seats = 100_000;
  const orgs = 1_500;
  const dauShare = 0.7; // share of seats active on a working day
  const dau = seats * dauShare; // 70,000
  return { seats, orgs, dauShare, dau, workingDaysPerMonth: 21, daysPerMonth: 30, brightpostDevelopers: 400 };
})();

/**
 * Completion funnel, per active developer per working day (illustrative). The client cache serves "typed-through"
 * continuations of a suggestion already on screen (Cody: about one request in ten reusable, dossier F13; Qoder: 23%
 * result-cache hits, dossier F14).
 *   triggered 1,250 pauses past the debounce → 250 from the client cache → 1,000 sent → 350 cancelled by a keystroke
 *   → 650 returned → 250 suppressed by the show/no-show filter → 400 shown → 120 accepted (30%)
 *   → 120 × 40 characters = 4,800 accepted characters → 80% still present after 10 minutes = 3,840 retained.
 *   Retained AI share = 3,840 ÷ (8,000 typed + 4,800 accepted) = 30%.
 */
export const FUNNEL = (() => {
  const triggered = 1_250;
  const clientCache = 250;
  const sent = triggered - clientCache; // 1,000
  const cancelled = 350;
  const returned = sent - cancelled; // 650
  const suppressed = 250;
  const shown = returned - suppressed; // 400
  const acceptRate = 0.3; // Cody "as high as 30%", Google 37% (dossier F13, F16)
  const accepted = shown * acceptRate; // 120
  const charsPerAccept = 40;
  const acceptedChars = accepted * charsPerAccept; // 4,800
  const retainedShare10Min = 0.8;
  const retainedChars = acceptedChars * retainedShare10Min; // 3,840
  const typedChars = 8_000;
  const retainedAiShare = retainedChars / (typedChars + acceptedChars); // 0.30
  return {
    triggered,
    clientCache,
    sent,
    cancelled,
    cancelShare: cancelled / sent, // 0.35
    returned,
    suppressed,
    suppressShare: suppressed / returned, // ≈ 0.385
    shown,
    acceptRate,
    accepted,
    charsPerAccept,
    acceptedChars,
    retainedShare10Min,
    retainedChars,
    typedChars,
    retainedAiShare,
  };
})();

/**
 * Two completion models in an A/B (illustrative, the evaluation figure): B shows fewer, safer suggestions. B's
 * acceptance is higher but its retained characters are lower, so raw acceptance would ship the worse model.
 *   A: 400 shown × 30% = 120 accepted × 40 chars × 80% = 3,840 retained.
 *   B: 300 shown × 36% = 108 accepted × 32 chars × 85% ≈ 2,938 retained.
 */
export const AB_EXAMPLE = (() => {
  const variant = (shown: number, accept: number, chars: number, kept: number) => ({
    shown,
    acceptRate: accept,
    accepted: shown * accept,
    retainedChars: Math.round(shown * accept * chars * kept),
  });
  return { a: variant(400, 0.3, 40, 0.8), b: variant(300, 0.36, 32, 0.85) };
})();

/**
 * What fills each path's context, in tokens (illustrative). "Reused" means a KV-prefix hit on the completion server
 * (the previous keystroke's prompt) or a prompt-cache read on the hosted model.
 *   completion 2,000 = path and language 50 + snippets from open tabs 400 + recent edits 150 + prefix 1,100 + suffix 300;
 *     reused 1,400 (header, snippets, edits and the prefix up to the last edit point), new 600 (300 + the suffix 300).
 *   chat (turn 1) 12,000 = instructions and tools 3,200 + repo rules 800 (cached 4,000) + open file 2,000
 *     + retrieved code 5,400 + question and selection 600 (uncached 8,000).
 *   agent step 1 = instructions 2,000 (with the root AGENTS.md) + tools 1,500 + task 300 (CODING_CONTEXT.step1, the
 *     concept page's harness) + a 1,500-token repo map this product adds = 5,300.
 *   agent average step (25-step task) = 30,000: the step-1 block + files read + history + tool results; 4,500 new a step.
 */
export const CONTEXT = (() => {
  const completion = [
    { id: "header", label: "Path and language", tokens: 50, reused: true },
    { id: "snippets", label: "Snippets from open tabs", tokens: 400, reused: true },
    { id: "edits", label: "Recent edits", tokens: 150, reused: true },
    { id: "prefix", label: "Code before the cursor", tokens: 800, reused: true },
    { id: "typed", label: "Lines since the last request", tokens: 300, reused: false },
    { id: "suffix", label: "Code after the cursor", tokens: 300, reused: false },
  ] as const;
  // The prefix (1,100) is reused up to the last edit point: 800 reused, 300 new; 50 + 400 + 150 + 800 = 1,400 reused.
  const completionTotal = sum(completion.map((b) => b.tokens)); // 2,000
  const completionReused = sum(completion.filter((b) => b.reused).map((b) => b.tokens)); // 1,400
  const chat = [
    { id: "instructions", label: "Instructions and tools", tokens: 3_200, cached: true },
    { id: "rules", label: "Repo rules (AGENTS.md)", tokens: 800, cached: true },
    { id: "open-file", label: "Open file", tokens: 2_000, cached: false },
    { id: "retrieved", label: "Retrieved code", tokens: 5_400, cached: false },
    { id: "question", label: "Question and selection", tokens: 600, cached: false },
  ] as const;
  const chatTotal = sum(chat.map((b) => b.tokens)); // 12,000
  const chatCached = sum(chat.filter((b) => b.cached).map((b) => b.tokens)); // 4,000
  const chatUncached = chatTotal - chatCached; // 8,000
  const repoMap = 1_500;
  const agentStep1 = [
    { id: "instructions", label: "Instructions and AGENTS.md", tokens: CODING_CONTEXT.step1.instructions },
    { id: "tools", label: "Tools", tokens: CODING_CONTEXT.step1.tools },
    { id: "task", label: "Task", tokens: CODING_CONTEXT.step1.task },
    { id: "repo-map", label: "Repo map", tokens: repoMap },
  ] as const;
  const agentStep1Total = sum(agentStep1.map((b) => b.tokens)); // 5,300
  // The CSV fix at step 9 on this product: the concept page's 24,000 + the repo map = 25,500.
  const csvStep9 = sum(Object.values(CODING_CONTEXT.step9)) + repoMap;
  return {
    completion,
    completionTotal,
    completionReused,
    completionNew: completionTotal - completionReused, // 600
    chat,
    chatTotal,
    chatCached,
    chatUncached,
    agentStep1,
    agentStep1Total,
    repoMap,
    csvStep9,
    agentAverage: 30_000,
    agentNewPerStep: 4_500,
    agentCompactAt: 100_000,
  };
})();

/**
 * Completion load and the self-hosted FIM fleet (illustrative).
 *   sent = 70,000 × 1,000 = 70 M a working day → 810 a second on average, × 3 at peak = 2,431.
 *   A cancelled request costs about half a full one (prefill done, decode stopped): load factor 0.65 + 0.35 × 0.5 = 0.825.
 *   Effective peak 2,005 a second; three regions, the busiest carrying 40% of the global peak = 802 a second.
 *   One GPU: prefill 600 new tokens at 60,000 tokens/s (10 ms) + decode 24 tokens at 3,200 tokens/s in batch (7.5 ms)
 *   = 17.5 ms of GPU time → 57 a second at full use; run at 70% for the latency target → 40 a second.
 *   Per region ceil(802 ÷ 40 × 1.3) = 27 GPUs; 81 in all.
 *   Autoscaled hours a month: weekday 10 peak hours at 100% + 14 at 40%; weekend days at 30%:
 *   81 × (21 × (10 + 14 × 0.4) + 9 × 24 × 0.3) = 81 × 392.4 = 31,784 GPU-hours × 2.5 USD = 79,461 USD ≈ 0.79 a seat.
 */
export const COMPLETION_LOAD = (() => {
  const sentPerDay = SEATS.dau * FUNNEL.sent; // 70,000,000
  const avgPerSecond = sentPerDay / 86_400; // ≈ 810.2
  const peakFactor = 3;
  const peakPerSecond = avgPerSecond * peakFactor; // ≈ 2,430.6
  const cancelCost = 0.5;
  const loadFactor = 1 - FUNNEL.cancelShare + FUNNEL.cancelShare * cancelCost; // 0.825
  const effectivePeak = peakPerSecond * loadFactor; // ≈ 2,005
  const regions = 3;
  const regionPeakShare = 0.4;
  const regionPeak = effectivePeak * regionPeakShare; // ≈ 802
  const prefillTokensPerSecond = 60_000;
  const decodeTokensPerSecond = 3_200; // batch of 16 at 5 ms a step
  const newPrefillTokens = CONTEXT.completionNew; // 600
  const outputTokens = 24;
  const gpuSecondsPerRequest = newPrefillTokens / prefillTokensPerSecond + outputTokens / decodeTokensPerSecond; // 0.0175
  const fullUsePerGpu = 1 / gpuSecondsPerRequest; // ≈ 57.1
  const utilisation = 0.7;
  const perGpu = fullUsePerGpu * utilisation; // 40
  const headroom = PRICES.gpuHeadroom; // 1.3
  const gpusPerRegion = Math.ceil((regionPeak / perGpu) * headroom); // 27
  const gpus = gpusPerRegion * regions; // 81
  const hoursPerWorkingDay = 10 + 14 * 0.4; // 15.6 full-fleet hours
  const hoursPerWeekendDay = 24 * 0.3; // 7.2
  const weekendDays = SEATS.daysPerMonth - SEATS.workingDaysPerMonth; // 9
  const gpuHoursPerMonth = gpus * (SEATS.workingDaysPerMonth * hoursPerWorkingDay + weekendDays * hoursPerWeekendDay); // ≈ 31,784
  const monthlyUsd = gpuHoursPerMonth * PRICES.gpuHour; // ≈ 79,461
  const perSeatMonth = monthlyUsd / SEATS.seats; // ≈ 0.79
  const alwaysOnPerSeat = (gpus * 24 * SEATS.daysPerMonth * PRICES.gpuHour) / SEATS.seats; // 1.458 without autoscaling
  // A hosted small model instead (list prices, PRICES.small): 1,400 cached + 600 uncached in, 24 out per request.
  const hostedPerRequest =
    usd(CONTEXT.completionReused, PRICES.small.cached) +
    usd(newPrefillTokens, PRICES.small.input) +
    usd(outputTokens, PRICES.small.output); // 0.000014 + 0.00006 + 0.000012 = 0.000086
  const hostedPerSeatMonth = (hostedPerRequest * sentPerDay * SEATS.workingDaysPerMonth) / SEATS.seats; // ≈ 1.26
  return {
    sentPerDay,
    avgPerSecond,
    peakPerSecond,
    loadFactor,
    effectivePeak,
    regions,
    regionPeak,
    gpuSecondsPerRequest,
    fullUsePerGpu,
    perGpu,
    gpusPerRegion,
    gpus,
    gpuHoursPerMonth,
    monthlyUsd,
    perSeatMonth,
    alwaysOnPerSeat,
    hostedPerRequest,
    hostedPerSeatMonth,
    outputTokens,
  };
})();

/**
 * Completion latency, last keystroke → ghost text, in ms at p50 (illustrative stages; dossier F14 gives the only public
 * split: trigger 30, context 130, prompt 40, network 200, inference 400 before optimisation).
 *   debounce 50 + context 15 + uplink 25 + gateway 5 + queue 10 + prefill 20 + first line (12 tokens × 5 ms) 60
 *   + filter 5 + downlink 25 + render 10 = 225 ms (target 300).
 *   p95 from stage spreads (p95 − p50): both network legs together 60 (one route), queue 30, prefill on a prefix miss 25
 *   (2,000 tokens instead of 600), decode 40 (a longer first line), context 20, render 10:
 *   √(60² + 30² + 25² + 40² + 20² + 10²) = 85 → ≈ 310 ms; adding the spreads (an upper bound) gives 410 (target 500).
 *   A hosted small model instead: 50 + 15 + 25 + 400 first token + 12 × 4.4 + 5 + 25 + 10 ≈ 583 ms at p50.
 */
export const COMPLETION_BUDGET = (() => {
  const stages = [
    { id: "debounce", label: "Debounce", ms: 50, spread: 0 },
    { id: "context", label: "Gather context (client)", ms: 15, spread: 20 },
    { id: "uplink", label: "Network to region", ms: 25, spread: 60 }, // both legs' spread counted once, here
    { id: "gateway", label: "Gateway and auth", ms: 5, spread: 0 },
    { id: "queue", label: "Queue", ms: 10, spread: 30 },
    { id: "prefill", label: "Prefill (600 new tokens)", ms: 20, spread: 25 },
    { id: "decode", label: "First line (12 tokens)", ms: 12 * 5, spread: 40 },
    { id: "filter", label: "Show or suppress", ms: 5, spread: 0 },
    { id: "downlink", label: "Network back", ms: 25, spread: 0 },
    { id: "render", label: "Render ghost text", ms: 10, spread: 10 },
  ] as const;
  const p50 = sum(stages.map((s) => s.ms)); // 225
  const spread = rss(stages.map((s) => s.spread)); // 85
  const p95 = p50 + spread; // 310
  const p95UpperBound = p50 + sum(stages.map((s) => s.spread)); // 410
  const hosted = 50 + 15 + 25 + LATENCY.firstTokenMs + 12 * LATENCY.decodeMsPerToken + 5 + 25 + 10; // ≈ 583
  const farUserExtraRttMs = 100; // a developer 150 ms RTT from the nearest region instead of 50
  return {
    stages,
    p50,
    spread,
    p95,
    p95UpperBound,
    targetP50: 300,
    targetP95: 500,
    typedThroughMs: 10, // client-cache continuation: render only
    hosted: r2(hosted),
    farUserP50: p50 + farUserExtraRttMs, // 325: misses the target, so regions are placed for ≤ 50 ms RTT
  };
})();

/**
 * Chat over the repository, first token in ms at p50 (illustrative).
 *   context 30 + max(local grep 100, server vector search 50 RTT + embed 20 + ANN 30 + proof filter 5 = 105)
 *   + upload of candidates 25 + rerank 80 + assemble 10 + model first token 400 + downlink 25 = 675.
 *   p95 spreads: network 60, retrieval 50, rerank 30, model first token 300: √(…) ≈ 311 → ≈ 986; upper bound 1,115.
 */
export const CHAT_BUDGET = (() => {
  const localGrep = 100;
  const serverVector = 50 + 20 + 30 + 5; // 105
  const retrieval = Math.max(localGrep, serverVector); // 105
  const p50 = 30 + retrieval + 25 + 80 + 10 + LATENCY.firstTokenMs + 25; // 675
  const spreads = [60, 50, 30, 300];
  const p95 = p50 + rss(spreads); // ≈ 986
  const p95UpperBound = p50 + sum(spreads); // 1,115
  return { localGrep, serverVector, retrieval, p50, p95, p95UpperBound, targetP50: 1_000, targetP95: 2_000 };
})();

/**
 * Cost per chat and per agent task at list prices (PRICES), and agent wall-clock time (illustrative).
 *   chat: 4,000 cached × 0.10 + 8,000 uncached × 2.00 + 600 out × 10.00, per million = 0.0224 USD.
 *   agent step, mid: 25,500 cached × 0.10 + 4,500 new written to the cache × 2.50 + 400 out × 10 = 0.0178 USD.
 *   agent step, small (exploration subagent): 25,500 × 0.01 + 4,500 × 0.125 + 400 × 0.50 = 0.00102 USD.
 *   blended (40% of steps explore on the small model): 0.6 × 0.0178 + 0.4 × 0.00102 = 0.01109 → × 25 steps = 0.277 USD.
 *   no caching, all mid: 25 × (30,000 × 2.00 + 400 × 10) per million = 1.60 USD; caching and routing save 83%.
 *   p95 task: 60 steps at an average 60,000 tokens: 0.6 × 0.0208 + 0.4 × 0.00132 = 0.0130 × 60 = 0.78 USD.
 *   time, median: 25 × (400 + 400 × 4.4) ms = 54 s of model + 6 targeted test runs × 30 s + 19 other tools × 0.3 s
 *   = 240 s ≈ 4.0 minutes. p95: 60 × 2.16 s + 14 × 30 s + 1 full suite 180 s + 45 × 0.3 s = 743 s ≈ 12.4 minutes.
 */
export const AGENT = (() => {
  const chatOut = 600;
  const perChat =
    usd(CONTEXT.chatCached, PRICES.mid.cached) +
    usd(CONTEXT.chatUncached, PRICES.mid.input) +
    usd(chatOut, PRICES.mid.output); // 0.0224
  const out = 400;
  const step = (context: number, p: { cached: number; cacheWrite: number; output: number }) =>
    usd(context - CONTEXT.agentNewPerStep, p.cached) + usd(CONTEXT.agentNewPerStep, p.cacheWrite) + usd(out, p.output);
  const exploreShare = 0.4;
  const blended = (context: number) =>
    (1 - exploreShare) * step(context, PRICES.mid) + exploreShare * step(context, PRICES.small);
  const stepsMedian = 25;
  const stepsP95 = 60;
  const midStep = step(CONTEXT.agentAverage, PRICES.mid); // 0.0178
  const smallStep = step(CONTEXT.agentAverage, PRICES.small); // 0.0010175
  const blendedStep = blended(CONTEXT.agentAverage); // ≈ 0.01109
  const perTask = stepsMedian * blendedStep; // ≈ 0.277
  const perTaskNoCacheAllMid =
    stepsMedian * (usd(CONTEXT.agentAverage, PRICES.mid.input) + usd(out, PRICES.mid.output)); // 1.60
  const perTaskP95 = stepsP95 * blended(60_000); // ≈ 0.78
  const modelStepMs = LATENCY.firstTokenMs + out * LATENCY.decodeMsPerToken; // 2,160
  const testRunMs = 30_000;
  const fullSuiteMs = 180_000;
  const otherToolMs = 300;
  const medianMs = stepsMedian * modelStepMs + 6 * testRunMs + 19 * otherToolMs; // 239,700
  const p95Ms = stepsP95 * modelStepMs + 14 * testRunMs + fullSuiteMs + 45 * otherToolMs; // 743,100
  return {
    perChat,
    chatsPerDauDay: 10,
    out,
    exploreShare,
    stepsMedian,
    stepsP95,
    midStep,
    smallStep,
    blendedStep,
    perTask,
    perTaskNoCacheAllMid,
    cachingAndRoutingSaving: 1 - perTask / perTaskNoCacheAllMid, // ≈ 0.83
    perTaskP95,
    tasksPerDauDay: 4,
    modelStepMs,
    medianMinutes: medianMs / 60_000, // ≈ 4.0
    p95Minutes: p95Ms / 60_000, // ≈ 12.4
    caps: { steps: 150, inputTokens: 5_000_000, usd: 3, minutes: 30 },
    targets: { medianMinutes: 5, p95Minutes: 20, firstTextMs: 1_000, firstToolCallMs: 3_000 },
    cloudShare: 0.25,
    cloudVmUsdPerHour: 0.1, // 2 vCPU, 4 GB microVM, illustrative
    cloudMinutesPerTask: 5, // 1 minute of setup with network + 4 of agent work
    // The CSV fix (coding-agent-trace, 9 steps): context grows 5,300 → 25,500, average 15,400; 2 test runs, 5 other tools.
    csvFix: {
      steps: 9,
      avgContext: (CONTEXT.agentStep1Total + CONTEXT.csvStep9) / 2, // 15,400
      usd: 9 * blended((CONTEXT.agentStep1Total + CONTEXT.csvStep9) / 2), // ≈ 0.091
      minutes: (9 * modelStepMs + 2 * testRunMs + 5 * otherToolMs) / 60_000, // ≈ 1.35
    },
  };
})();

/**
 * Edit application (illustrative token counts; speeds from Cursor's 2024 post, dossier F19: about 1,000 tokens/s with
 * speculative edits, about 13× vanilla, so vanilla ≈ 77 tokens/s).
 *   400-line file ≈ 4,000 tokens: vanilla 52 s, speculative 4.0 s.
 *   2,000-line file ≈ 20,000 tokens: vanilla 260 s, speculative 20 s; rewrite only the enclosing function (40 lines,
 *   400 tokens): 0.4 s. Search-and-replace: about 40 tokens from the agent model (EDIT_TOKENS.replace) ≈ 0.18 s.
 *   Speculation: draft 16 tokens from the original file, one verify pass of about 16 ms (illustrative) → 1,000 tokens/s
 *   while the draft matches; at an edit the first mismatch ends the run and the drafter re-aligns on the next n-gram.
 */
export const APPLY = (() => {
  const tokensPerLine = 10;
  const speculativeTokensPerSecond = 1_000;
  const speedUp = 13;
  const vanillaTokensPerSecond = speculativeTokensPerSecond / speedUp; // ≈ 76.9
  const seconds = (lines: number, tps: number) => (lines * tokensPerLine) / tps;
  const appliesPerDauDay = 5;
  const avgRewriteTokens = 2_000;
  const sequencesPerGpu = 8;
  const gpuSecondsPerApply = avgRewriteTokens / speculativeTokensPerSecond / sequencesPerGpu; // 0.25
  const gpuHoursPerMonth = (SEATS.dau * appliesPerDauDay * gpuSecondsPerApply * SEATS.workingDaysPerMonth) / 3_600; // ≈ 510
  return {
    tokensPerLine,
    speculativeTokensPerSecond,
    vanillaTokensPerSecond,
    draftLength: 16,
    file400: { vanilla: seconds(400, vanillaTokensPerSecond), speculative: seconds(400, speculativeTokensPerSecond) }, // 52, 4
    file2000: {
      vanilla: seconds(2_000, vanillaTokensPerSecond),
      speculative: seconds(2_000, speculativeTokensPerSecond),
    }, // 260, 20
    region40: seconds(40, speculativeTokensPerSecond), // 0.4
    searchReplaceTokens: EDIT_TOKENS.replace, // 40
    searchReplaceSeconds: (EDIT_TOKENS.replace * LATENCY.decodeMsPerToken) / 1_000, // 0.176
    appliesPerDauDay,
    gpuHoursPerMonth,
    perSeatMonth: (gpuHoursPerMonth * PRICES.gpuHour) / SEATS.seats, // ≈ 0.013
  };
})();

/**
 * Repository index for Brightpost's monorepo (illustrative sizes; Merkle cost from dossier F24: 3.2 MB of names and
 * SHA-256 hashes for 50,000 files ≈ 64 bytes a file).
 *   50,000 files × 2,000 tokens = 100 M tokens; 400-token syntactic chunks → 250,000 chunks.
 *   512-dimension int8 vectors: 250,000 × 512 B = 128 MB, × 1.5 for the graph = 192 MB.
 *   First full embed: 100 M ÷ 200,000 tokens/s (PRICES.smallEncoderTokensPerSecond) = 500 GPU-seconds (50 s on 10 GPUs,
 *   ≈ 0.35 USD). Daily churn: 1% of files (500) × 5 chunks × 30% changed = 750 chunks = 300,000 tokens re-embedded.
 *   One changed file at depth 6 with fan-out 20: 6 × 20 = 120 hashes × 32 B ≈ 3.8 KB compared, not 3.2 MB.
 */
export const INDEX = (() => {
  const files = 50_000;
  const tokensPerFile = 2_000;
  const tokens = files * tokensPerFile; // 100 M
  const chunkTokens = 400;
  const chunks = tokens / chunkTokens; // 250,000
  const vectorBytes = 512;
  const vectorMB = (chunks * vectorBytes) / 1_000_000; // 128
  const indexMB = vectorMB * 1.5; // 192
  const merkleMB = 3.2; // dossier F24
  const bytesPerFileEntry = (merkleMB * 1_000_000) / files; // 64
  const fullEmbedGpuSeconds = tokens / PRICES.smallEncoderTokensPerSecond; // 500
  const churnFiles = files * 0.01; // 500
  const churnChunks = churnFiles * 5 * 0.3; // 750
  const depth = 6;
  const fanOut = 20;
  return {
    files,
    tokens,
    chunks,
    vectorMB,
    indexMB,
    merkleMB,
    bytesPerFileEntry,
    fullEmbedGpuSeconds,
    fullEmbedSecondsOn10Gpus: fullEmbedGpuSeconds / 10, // 50
    fullEmbedUsd: (fullEmbedGpuSeconds / 3_600) * PRICES.gpuHour, // ≈ 0.35
    churnFiles,
    churnChunks,
    churnTokens: churnChunks * chunkTokens, // 300,000
    oneFileCompareKB: (depth * fanOut * 32) / 1_000, // 3.84
    embeddingsMinFiles: 1_000, // embeddings only on repos above this (dossier F28: +2.6% retention above 1,000 files)
    syncDebounceS: 30,
    syncBackstopMin: 5,
    freshness: { localGrepS: 1, embeddingsP95Min: 2 },
    reuseFirstQueryMs: 525, // Cursor median with index reuse (dossier F27, vendor)
    perSeatMonth: 0.05, // vector store memory and the sync service, lumped, illustrative
  };
})();

/**
 * Cost per seat per month at median usage (USD). Usage on working days only: per DAU-day × 21 × 0.7.
 *   completion 0.79 + chat 0.0224 × 10 × 21 × 0.7 = 3.29 + agent 0.277 × 4 × 21 × 0.7 = 16.30
 *   + cloud VMs 0.25 × 4 × 21 × 0.7 × (5 ÷ 60 × 0.10) = 0.12 + apply 0.013 + index 0.05 ≈ 20.6 (target ≤ 25).
 */
export const COST = (() => {
  const usageDays = SEATS.workingDaysPerMonth * SEATS.dauShare; // 14.7 active days a seat-month
  const completion = COMPLETION_LOAD.perSeatMonth;
  const chat = AGENT.perChat * AGENT.chatsPerDauDay * usageDays; // ≈ 3.29
  const agent = AGENT.perTask * AGENT.tasksPerDauDay * usageDays; // ≈ 16.30
  const cloudVm =
    AGENT.cloudShare * AGENT.tasksPerDauDay * usageDays * ((AGENT.cloudMinutesPerTask / 60) * AGENT.cloudVmUsdPerHour); // ≈ 0.12
  const apply = APPLY.perSeatMonth;
  const index = INDEX.perSeatMonth;
  const perSeatMonth = completion + chat + agent + cloudVm + apply + index; // ≈ 20.6
  return {
    usageDays,
    completion,
    chat,
    agent,
    cloudVm,
    apply,
    index,
    perSeatMonth,
    agentShare: agent / perSeatMonth, // ≈ 0.79
    target: 25,
    heavyUserAgentMonth: AGENT.perTaskP95 * 12 * SEATS.workingDaysPerMonth, // 12 p95 tasks a day ≈ 197: why usage is pooled and capped
  };
})();

/**
 * Evaluation sizes (illustrative). Online: a 10% arm = 7,000 active developers a day; with a per-user coefficient of
 * variation of 1.0 the minimum detectable relative change in retained characters is ≈ 2.8 × √(2 ÷ 7,000) ≈ 4.7%
 * (95% confidence, 80% power, user-level means over a week). Offline: 300 past issues × 3 runs; at a 60% solve rate the
 * 95% interval on one run is ± 1.96 × √(0.6 × 0.4 ÷ 300) ≈ ± 5.5 points, so releases compare paired, per task.
 */
export const EVAL = (() => {
  const armUsers = SEATS.dau * 0.1; // 7,000
  const mde = 2.8 * Math.sqrt(2 / armUsers); // ≈ 0.047
  const suiteTasks = 300;
  const runs = 3;
  const solveRate = 0.6;
  const ci = 1.96 * Math.sqrt((solveRate * (1 - solveRate)) / suiteTasks); // ≈ 0.055
  return {
    armUsers,
    mde,
    suiteTasks,
    runs,
    solveRate,
    ci,
    suiteRunUsd: suiteTasks * runs * AGENT.perTask, // ≈ 250
    passHat3: solveRate ** runs, // 0.216 if runs were independent; reported per task, not assumed
    swebenchVerifiedTasks: 500, // dossier F51
    swebenchAuditedFlawed: 0.594, // of 138 audited (dossier F52)
    swebenchProBroken: 0.3, // dossier F53
  };
})();
