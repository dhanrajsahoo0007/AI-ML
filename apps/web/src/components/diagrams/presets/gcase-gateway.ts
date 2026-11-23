// Constants and arithmetic for the "Design an LLM Platform and Gateway" case study (/genai-system-design/case-studies/
// llm-platform-gateway; design sheet SYSTEM-DESIGN/plans/genai-design/design/llm-platform-gateway.md v2, dossier
// research/llm-platform-gateway.md, cited as "dossier F12"; review review/llm-platform-gateway-design.md). Specs in
// assets/diagrams/animated/llm-gateway/ import from here, so the page, the figures and the tests share one set of numbers.
//
// Running example: Brightpost's platform team runs ONE internal gateway that every Brightpost model call goes through
// (the platform rule: no team holds a provider key). The tenants are the Brightpost systems of the other case studies,
// with THEIR numbers imported from their presets (one value per fact per system): the support agent (gcase-support),
// the voice agent (gcase-voice), the employee assistant (gcase-enterprise), accounts-payable extraction
// (gcase-docextract), plus the concept page's catalogue writer and labs keys (production-gateway TEAM_KEYS).
//
// Model prices: list prices as of November 2026 from presets/gcase-answer.ts PRICES (mid Claude Sonnet 5.5 class 2.00
// input / 0.10 cache read / 2.50 5-minute write / 10.00 output USD per million; small Claude Haiku 5.5 class 0.10 /
// 0.01 / 0.125 / 0.50). Provider A limits: Anthropic Scale tier, Sonnet 5.5 and Haiku 5.5 each 13,000 RPM, 10M ITPM
// (uncached input + cache writes only), 2M OTPM; spend cap 200,000 USD a month (dossier F10–F13). Provider B quota
// model: Bedrock deducts input + max_tokens at the start of a request and settles input + cache writes + output ×
// burndown; cache reads do not count; one TPM bucket for input and output (dossier F56). Sonnet 5.5's and Haiku 5.5's
// burndown is not listed (5× for ≤ 4.7, 10× for Opus 5.5 and Sonnet 5): this file uses 10× and shows 5×.
// Everything else (shares, durations, spans, bytes per token, pods, headcount, availability inputs) is ILLUSTRATIVE
// unless a comment names a dossier fact. p95 of a path = p50 + root-sum-square of stage spreads; the stage-sum bound is
// given beside it.

import { PRICES } from "./gcase-answer";
import {
  COMPANY as ENT_COMPANY,
  CONTEXT as ENT_CONTEXT,
  AGENT as ENT_AGENT,
  COST as ENT_COST,
} from "./gcase-enterprise";
import { VOLUME as AP_VOLUME, COST as AP_COST, PRICES as AP_PRICES } from "./gcase-docextract";
import {
  VOLUME as SUP_VOLUME,
  CONTEXT as SUP_CONTEXT,
  OUTPUT as SUP_OUTPUT,
  COST as SUP_COST,
  LATENCY_MS as SUP_LATENCY,
} from "./gcase-support";
import {
  CALLS as VOICE_CALLS,
  TURNS as VOICE_TURNS,
  CONTEXT as VOICE_CONTEXT,
  COST as VOICE_COST,
} from "./gcase-voice";
import { TEAM_KEYS, FALLBACK as CONCEPT_FALLBACK } from "./production-gateway";
import { BREAKER } from "./production-routing";
import { LATENCY, TRAFFIC } from "./production";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));
const M = 1_000_000;

// ── Provider limits ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A: Anthropic Scale tier per model class (F12, F13). B: Bedrock's quota model (F56); the granted quota is an input. */
export const PROVIDER_LIMITS = {
  mid: { rpm: 13_000, itpm: 10_000_000, otpm: 2_000_000 },
  /** Haiku 5.5 on A: Scale tier 10M ITPM; the design REQUESTS 15M (Custom tier, F12), because guaranteed small quotas need 7.3M. */
  small: { rpm: 13_000, itpm: 10_000_000, otpm: 2_000_000, itpmRequested: 15_000_000 },
  monthlySpendCapUsd: 200_000,
  guaranteedShareMax: 0.6,
  bedrock: { burndown: 10, burndownLow: 5 },
} as const;

// ── Tenants: each team's own numbers, imported ──────────────────────────────────────────────────────────────────────

/**
 * Support agent (gcase-support). Per customer message, 1.65 mid agent calls in three shapes (50% no tool, 35% one, 15%
 * two):
 *   uncached input 2,300 a message on every shape's first call + 300 a follow-up; the first call of a one- or two-tool
 *   message WRITES its 2,300 (cache_creation, billed 2.50, counted toward ITPM) so the follow-ups can read them;
 *   counted ITPM (input + writes) = 0.5 × 2,300 + 0.35 × 2,600 + 0.15 × 2,900 = 2,495 a message;
 *   cache reads 0.5 × 2,700 + 0.35 × (2,700 + 5,000) + 0.15 × (2,700 + 5,300 + 5,600) = 6,085 (all input 8,580);
 *   output 0.5 × 120 + 0.35 × 150 + 0.15 × 180 = 139.5 a message (84.5 a call).
 * Other model calls (all through the gateway): router and supervisor (small, 600 and 2,800 in, 50 and 40 out), the
 * bad-actor classifier (small, 600 in, 10 out, illustrative, 0.0001 USD in its sheet), hand-off summaries (mid,
 * 0.32 a conversation = 0.08 a message, 2,500 in + 100 out, illustrative, 0.006 USD), the conversation judge (small,
 * 0.25 a message, DEFERRED to an off-peak batch alias).
 * Peak 12 messages a second: on-path calls 12 × (1.65 + 2 + 1 + 0.08) = 56.76 a second.
 */
export const SUPPORT = (() => {
  const sh = SUP_VOLUME.shapes;
  const changing = SUP_CONTEXT.averageChanging; // 2,300
  const followNew = SUP_OUTPUT.followUpNewTokens; // 300
  const stable = SUP_CONTEXT.stable; // 2,700
  const total = SUP_CONTEXT.averageTotal; // 5,000
  const uncachedPerMessage = sh.none * changing + sh.one * (changing + followNew) + sh.two * (changing + 2 * followNew);
  const cachedPerMessage =
    sh.none * stable + sh.one * (stable + total) + sh.two * (stable + (total + followNew) + (total + 2 * followNew));
  const outputPerMessage =
    sh.none * SUP_OUTPUT.reply +
    sh.one * (SUP_OUTPUT.toolCall + SUP_OUTPUT.reply) +
    sh.two * (2 * SUP_OUTPUT.toolCall + SUP_OUTPUT.reply);
  const midCallsPerMessage = SUP_VOLUME.modelCallsPerMessage; // 1.65
  const peakMessagesPerSecond = TRAFFIC.peakPerSecond; // 12
  const perMessage = { router: 1, supervisor: 1, badActor: 1, handoff: 0.08, judge: 0.25 };
  const onPathPerMessage =
    midCallsPerMessage + perMessage.router + perMessage.supervisor + perMessage.badActor + perMessage.handoff; // 4.73
  const small = { inputPerMessage: 600 + 2_800 + 600, outputPerMessage: 50 + 40 + 10 }; // 4,000 / 100
  const messagesPerDay = SUP_VOLUME.messagesPerDay; // 200,000
  return {
    uncachedPerMessage, // 2,495
    cachedPerMessage, // 6,085
    inputPerMessage: uncachedPerMessage + cachedPerMessage, // 8,580
    inputPerCall: (uncachedPerMessage + cachedPerMessage) / midCallsPerMessage, // 5,200
    outputPerMessage, // 139.5
    outputPerCall: outputPerMessage / midCallsPerMessage, // 84.5
    midCallsPerMessage,
    peakMessagesPerSecond,
    perMessage,
    onPathPerMessage,
    peakMidCallsPerSecond: peakMessagesPerSecond * midCallsPerMessage, // 19.8
    peakOnPathPerSecond: peakMessagesPerSecond * onPathPerMessage, // 56.76
    small,
    callsPerDay: messagesPerDay * (onPathPerMessage + perMessage.judge), // 996,000
    deferredPerDay: messagesPerDay * perMessage.judge, // 50,000
    spendPerDay: SUP_COST.perDay, // ≈ 1,801 USD (its own sheet; includes every call above)
    agentPerMessage: SUP_COST.agentPerMessage, // 0.00759 USD
  };
})();

/**
 * Voice agent (gcase-voice). Per call-minute: 7.2 agent calls (of which 0.6 × 4 = 2.4 are speculative pre-emptive
 * generations, many cancelled), 30% mid; plus a turn detector 4 a minute (small, 300 in, illustrative), a judge 4 a
 * minute (DEFERRED), a briefing 0.5 a call = 0.125 a minute (mid), hedges 0.1 × 0.3 × 7.2 = 0.216 a minute (mid; the
 * gateway runs them, §15.2). Each agent call: 2,000 cached + 1,600 changing input, 25 out.
 * Peak = a sale day's 192 concurrent calls: on-path 192 × (7.2 + 4 + 0.125 + 0.216) ÷ 60 = 36.93 a second.
 */
export const VOICE = (() => {
  const callsPerMinute = VOICE_TURNS.callsPerMinute; // 7.2
  const midShare = 0.3;
  const conc = VOICE_CALLS.salesDayConcurrent; // 192
  const other = {
    detector: 4,
    judge: 4,
    briefing: 0.5 / VOICE_CALLS.minutesPerCall,
    hedge: 0.1 * 0.3 * callsPerMinute,
  };
  const onPathPerMinute = callsPerMinute + other.detector + other.briefing + other.hedge; // 11.541
  const speculativePerMinute = 0.6 * VOICE_TURNS.perMinute; // 2.4
  const minutes = VOICE_CALLS.minutesPerDay; // 32,000
  return {
    callsPerMinute,
    midShare,
    other,
    peakAgentCallsPerSecond: (conc * callsPerMinute) / 60, // 23.04
    peakMidCallsPerSecond: (conc * callsPerMinute * midShare) / 60, // 6.912
    peakSmallAgentCallsPerSecond: (conc * callsPerMinute * (1 - midShare)) / 60, // 16.128
    peakOnPathPerSecond: (conc * onPathPerMinute) / 60, // 36.93
    peakSpeculativePerSecond: (conc * speculativePerMinute) / 60, // 7.68
    uncachedPerCall: VOICE_CONTEXT.changing, // 1,600
    cachedPerCall: VOICE_CONTEXT.stable, // 2,000
    outputPerCall: VOICE_TURNS.replyTokens, // 25
    detectorInput: 300,
    callsPerDay: (onPathPerMinute + other.judge) * minutes, // 497,312
    deferredPerDay: other.judge * minutes, // 128,000
    spendPerDay: (VOICE_COST.agentModel + VOICE_COST.otherModel + VOICE_COST.hedges) * minutes, // ≈ 384
    firstTokenMs: 400,
  };
})();

/**
 * Employee assistant (gcase-enterprise), on a WEEKDAY basis (calls and spend alike):
 *   mid calls a turn 0.65 × 1 + 0.15 × 2 + 0.08 × 1 + 0.05 × 6 = 1.33; small 1 + 0.65 + 0.05 + 0.07 + 1/3 = 2.103;
 *   counted mid input a turn 0.65 × 4,390 + 0.15 × 1,730 + 0.08 × 870 + 0.05 × 7,130 = 3,539; output 239.1;
 *   cold mid input a turn (no cache) 0.65 × 7,876 + 0.15 × 23,706 + 0.08 × 11,423 + 0.05 × 48,896 ≈ 12,034;
 *   counted small input a turn: router 300 (its 800-token prefix is cached) + checks 0.70 × 4,070 + other 0.07 × 1,500 +
 *   memory 2,000 ÷ 3 ≈ 3,921.
 * Spend a weekday = 14,430 × 0.0110 + 964 ÷ 30 ≈ 191 USD.
 */
export const ASSISTANT = (() => {
  const mix = ENT_COST.mix;
  const midCallsPerTurn = mix.answer * 1 + mix.lookup * 2 + mix.write * 1 + mix.agent * ENT_AGENT.calls.length;
  const smallCallsPerTurn = 1 + mix.answer + mix.agent + mix.other + 1 / ENT_COMPANY.turnsPerConversation;
  const agentNew = sum(ENT_AGENT.calls.map((c) => c.newIn));
  const agentAll = sum(ENT_AGENT.calls.map((c) => c.newIn + c.cachedIn));
  const c = ENT_CONTEXT;
  const lookupAll = 2 * (10_553 + c.turnState) + c.toolCallOut + c.toolResult; // 23,706 (its CAPACITY.lookupIn)
  const uncachedPerTurn =
    mix.answer * c.changing +
    mix.lookup * (c.turnState + c.toolCallOut + c.toolResult) +
    mix.write * c.turnState +
    mix.agent * agentNew;
  const coldPerTurn =
    mix.answer * c.total + mix.lookup * lookupAll + mix.write * (10_553 + c.turnState) + mix.agent * agentAll;
  const outputPerTurn =
    mix.answer * c.answerOut +
    mix.lookup * (c.toolCallOut + c.lookupReplyOut) +
    mix.write * c.writeArgsOut +
    mix.agent * sum(ENT_AGENT.calls.map((x) => x.out));
  const smallInputPerTurn =
    300 + (mix.answer + mix.agent) * (300 + c.evidence + c.answerOut) + mix.other * 1_500 + 2_000 / 3;
  const peakTurnsPerSecond = ENT_COMPANY.peakPerSecond; // 0.757
  return {
    midCallsPerTurn,
    smallCallsPerTurn,
    uncachedPerTurn, // ≈ 3,539
    coldPerTurn, // ≈ 12,034
    outputPerTurn, // ≈ 239
    smallInputPerTurn, // ≈ 3,921
    peakTurnsPerSecond,
    peakOnPathPerSecond: peakTurnsPerSecond * (midCallsPerTurn + smallCallsPerTurn), // ≈ 2.60
    callsPerDay: ENT_COMPANY.weekdayTurns * (midCallsPerTurn + smallCallsPerTurn), // ≈ 49,540
    spendPerDay: ENT_COMPANY.weekdayTurns * ENT_COST.blended + ENT_COST.prefixWritesPerMonth / 30, // ≈ 191
    spendPerMonth: ENT_COST.perMonth, // ≈ 4,777
  };
})();

/**
 * AP extraction (gcase-docextract): UK or EU processing (Bedrock London's EU geographic profile; bank details masked by
 * AP before any model call). Normal day 1,625 invoices × 3 + 1,428.6 receipts × 2 = 7,732 calls; peak 0.176 documents
 * a second × 3 ≈ 0.53 calls a second; 854.6 USD a month ≈ 28.5 a day.
 */
export const AP = (() => ({
  callsPerDay: AP_VOLUME.normalDayInvoices * 3 + AP_VOLUME.receiptsPerDay * 2,
  peakOnPathPerSecond: AP_VOLUME.peakDocsPerSecond * 3,
  spendPerDay: AP_COST.modelsMonthly / 30,
  spendPerMonth: AP_COST.modelsMonthly,
  residency: "uk-or-eu" as const,
}))();

/** Catalogue writer: 20,000 × (800 in, 400 out) small, Batch API −50%: 2.80 USD a night; never at the day peak. */
export const CATALOGUE = (() => {
  const items = 20_000;
  const input = (TEAM_KEYS.catalogue.inputM * M) / items; // 800
  const output = (TEAM_KEYS.catalogue.outputM * M) / items; // 400
  const spendPerDay =
    items * (usd(input, PRICES.small.input) + usd(output, PRICES.small.output)) * AP_PRICES.batchDiscount;
  return { items, input, output, callsPerDay: items, spendPerDay, spendPerMonth: spendPerDay * 30 };
})();

/**
 * Labs: 30M mid tokens a day ≈ 84 USD (27M in × 2.00 + 3M out × 10.00), held as an 84 USD daily budget; ≤ 20 in
 * flight; prompts ≤ 32,000 tokens; max_tokens ≤ 2,048; ITPM cap 200,000. A worst request lasts 0.6 + 2,048 × 12.5 ms =
 * 26.2 s. Under its own ITPM cap at most ⌊200,000 ÷ 32,000⌋ = 6 worst-case prompts are admitted in a minute (review
 * item 35); the charge-after comparison below assumes 20 because those products also count ITPM after the call.
 * S (self-hosted, 2 GPUs, 3,600 USD a month) is charged to labs: 120 USD a day.
 */
export const LABS = (() => {
  const budgetTokens = TEAM_KEYS.labs.budgetM * M; // 30M
  const budgetUsd = usd(0.9 * budgetTokens, PRICES.mid.input) + usd(0.1 * budgetTokens, PRICES.mid.output); // 84
  const maxParallel = 20;
  const promptCap = 32_000;
  const maxTokensCap = 2_048;
  const itpmCap = 200_000;
  const worstTokens = promptCap + maxTokensCap; // 34,048
  const worstDurationS = 0.6 + (maxTokensCap * 12.5) / 1_000; // 26.2
  return {
    budgetTokens,
    budgetUsd,
    maxParallel,
    promptCap,
    maxTokensCap,
    itpmCap,
    worstTokens,
    worstDurationS,
    worstPerMinuteUnderCap: Math.floor(itpmCap / promptCap), // 6
    peakOnPathPerSecond: maxParallel / worstDurationS, // 0.763
    callsPerDay: budgetTokens / 5_000, // 6,000
    spendPerDay: budgetUsd,
    selfHostedPerDay: (2 * PRICES.gpuHour * 720) / 30, // 120
  };
})();

// ── Traffic at the gateway ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * Calls a day (all model calls; judges deferred to the night): support 996,000; voice 497,312; assistant ≈ 49,540;
 * AP ≈ 7,732; catalogue 20,000; labs 6,000 → ≈ 1.58M. On-path peak: support 56.76 + voice 36.93 + assistant 2.60 +
 * AP 0.53 + labs 0.76 ≈ 97.6 a second. Model spend a weekday ≈ 1,801 + 384 + 191 + 28.5 + 2.80 + 84 ≈ 2,491 USD; a
 * month ≈ 54,036 + 11,513 + 4,777 + 855 + 84 + 2,520 ≈ 73,800 (A's share 72,900 = 36.5% of the spend cap).
 */
export const TRAFFIC_GW = (() => {
  const perDay = {
    support: SUPPORT.callsPerDay,
    voice: VOICE.callsPerDay,
    assistant: ASSISTANT.callsPerDay,
    ap: AP.callsPerDay,
    catalogue: CATALOGUE.callsPerDay,
    labs: LABS.callsPerDay,
  };
  const peak = {
    support: SUPPORT.peakOnPathPerSecond,
    voice: VOICE.peakOnPathPerSecond,
    assistant: ASSISTANT.peakOnPathPerSecond,
    ap: AP.peakOnPathPerSecond,
    catalogue: 0,
    labs: LABS.peakOnPathPerSecond,
  };
  const spendPerDay = {
    support: SUPPORT.spendPerDay,
    voice: VOICE.spendPerDay,
    assistant: ASSISTANT.spendPerDay,
    ap: AP.spendPerDay,
    catalogue: CATALOGUE.spendPerDay,
    labs: LABS.spendPerDay,
  };
  const spendPerMonth =
    SUPPORT.spendPerDay * 30 +
    VOICE.spendPerDay * 30 +
    ASSISTANT.spendPerMonth +
    AP.spendPerMonth +
    CATALOGUE.spendPerMonth +
    LABS.spendPerDay * 30;
  const anthropicPerMonth = spendPerMonth - AP.spendPerMonth;
  return {
    perDay,
    peak,
    spendPerDay,
    callsPerDay: sum(Object.values(perDay)), // ≈ 1,576,600
    deferredPerDay: SUPPORT.deferredPerDay + VOICE.deferredPerDay, // 178,000
    peakPerSecond: sum(Object.values(peak)), // ≈ 97.6
    spend: sum(Object.values(spendPerDay)), // ≈ 2,491 a weekday
    spendPerMonth, // ≈ 73,800
    anthropicPerMonth, // ≈ 72,900
    capShare: anthropicPerMonth / PROVIDER_LIMITS.monthlySpendCapUsd, // ≈ 0.365
    cells: { support: peak.support, voice: peak.voice, other: peak.assistant + peak.ap + peak.labs }, // 56.8 / 36.9 / 3.9
  };
})();

// ── Quotas in tokens per minute, per model class (provider A) ───────────────────────────────────────────────────────

/**
 * Mid, peak need (counted input = uncached + writes; output):
 *   support 720 × 2,495 = 1,796,400 ITPM, 720 × 139.5 = 100,440 OTPM; hand-offs 57.6 a minute × 2,500 = 144,000 ITPM
 *   and × 100 = 5,760 OTPM;
 *   voice 414.7 × 1,600 = 663,552 ITPM; × 25 = 10,368 OTPM; briefings and hedges 192 × 0.341 = 65.5 a minute ×
 *   1,600 = 104,800 ITPM (illustrative sizes);
 *   assistant 45.4 × 3,539 = 160,700 ITPM; 10,860 OTPM; labs cap 200,000 / 20,000.
 *   → 3.07M ITPM at peak (31%); guaranteed 1.5 × need ≈ 4.60M (46%, under the 60% rule).
 * Small, peak need: support 720 × 4,000 = 2,880,000; voice agent 967.7 × 1,600 = 1,548,288 + detector 768 × 300 =
 *   230,400; assistant 45.4 × 3,921 = 178,000 → 4.84M; guaranteed 1.5 × = 7.26M = 73% of 10M, over the 60% rule:
 *   the design requests 15M (48%).
 */
export const QUOTAS = (() => {
  const headroom = 1.5;
  const m = SUPPORT.peakMessagesPerSecond * 60; // 720
  const voiceMidPerMin = VOICE.peakMidCallsPerSecond * 60; // 414.7
  const voiceExtraMidPerMin = VOICE_CALLS.salesDayConcurrent * (VOICE.other.briefing + VOICE.other.hedge); // 65.5
  const turnsPerMin = ASSISTANT.peakTurnsPerSecond * 60; // 45.4
  const need = {
    support: {
      itpm: m * SUPPORT.uncachedPerMessage + m * SUPPORT.perMessage.handoff * 2_500,
      otpm: m * SUPPORT.outputPerMessage + m * SUPPORT.perMessage.handoff * 100,
    },
    voice: {
      itpm: voiceMidPerMin * VOICE.uncachedPerCall + voiceExtraMidPerMin * 1_600,
      otpm: voiceMidPerMin * VOICE.outputPerCall + voiceExtraMidPerMin * 25,
    },
    assistant: { itpm: turnsPerMin * ASSISTANT.uncachedPerTurn, otpm: turnsPerMin * ASSISTANT.outputPerTurn },
    labs: { itpm: LABS.itpmCap, otpm: 20_000 },
  };
  const peakItpm = sum(Object.values(need).map((n) => n.itpm));
  const peakOtpm = sum(Object.values(need).map((n) => n.otpm));
  const guaranteedItpm = headroom * peakItpm;
  const smallNeed = {
    support: m * SUPPORT.small.inputPerMessage, // 2,880,000
    voice:
      VOICE.peakSmallAgentCallsPerSecond * 60 * VOICE.uncachedPerCall +
      VOICE_CALLS.salesDayConcurrent * VOICE.other.detector * VOICE.detectorInput,
    assistant: turnsPerMin * ASSISTANT.smallInputPerTurn,
  };
  const smallPeak = sum(Object.values(smallNeed));
  return {
    headroom,
    need,
    peakItpm, // ≈ 3.07M
    peakItpmShare: peakItpm / PROVIDER_LIMITS.mid.itpm, // ≈ 0.31
    peakOtpm, // ≈ 0.15M
    peakOtpmShare: peakOtpm / PROVIDER_LIMITS.mid.otpm,
    guaranteedItpm, // ≈ 4.60M
    guaranteedShare: guaranteedItpm / PROVIDER_LIMITS.mid.itpm,
    supportGuaranteedItpm: headroom * need.support.itpm, // ≈ 2.91M
    supportGuaranteedOtpm: headroom * need.support.otpm, // ≈ 159,300
    burstPool: PROVIDER_LIMITS.mid.itpm - guaranteedItpm, // ≈ 5.4M
    smallNeed,
    smallPeak, // ≈ 4.84M
    smallGuaranteedShare: (headroom * smallPeak) / PROVIDER_LIMITS.small.itpm, // ≈ 0.73 → request 15M
    smallGuaranteedShareRequested: (headroom * smallPeak) / PROVIDER_LIMITS.small.itpmRequested, // ≈ 0.48
    adaptive: { remainingFloor: 0.2, t0QueueMs: 200 },
  };
})();

// ── Reserve, then settle ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Two reservations, two purposes:
 *   MONEY (budgets): an UPPER BOUND, so a budget cannot be overspent. Input is reserved as UTF-8 bytes (a byte-level
 *   tokenizer never makes more tokens than bytes; images reserved from their dimensions; + 50 tokens a message and
 *   600 a tool definition of overhead), priced at the highest input price the alias can be billed (the 5-minute write,
 *   2.50; 4.00 if the alias uses the 1-hour TTL), plus max_tokens × output. Server-side `fallbacks` and server tools are
 *   stripped (422 if an alias has not declared them), so no call can bill more than one attempt.
 *   → overshoot = 0 by construction. Held per support call ≈ 5,200 tokens × 4 bytes (illustrative) × 2.50 + 512 ×
 *   10.00 per million = 0.0520 + 0.00512 = 0.0571 USD; 28.85 in flight hold 1.65 USD of a ≈ 54,000 USD month.
 *   RATE (per-minute buckets): an ESTIMATE, as the provider's own ITPM is (F10): characters ÷ 4, cached span included
 *   (the registry forecasts, it does not admit), + max_tokens of OTPM; corrected at settlement. Rate overshoot is
 *   bounded by the burst pool and the provider's own limit, not by the budget.
 *   Held at peak: ITPM 28.85 × 5,200 = 150,000 (5.2% of support's 2.91M a minute); OTPM 28.85 × (512 − 84.5) =
 *   12,330 (7.7% of 159,300). With max_tokens unset at 4,096: 115,700 (73%).
 * Comparison on labs' day (84 USD): charge-after products overshoot by everything in flight, 20 × 0.0845 = 1.69 USD
 * (2.0%; 680,960 tokens = 2.27% of 30M), and more if their check is stale (+ 0.763 × 20 s × 0.0845 = 1.29 USD → 3.5%,
 * illustrative 20 s).
 */
export const RESERVE = (() => {
  const bytesPerToken = 4; // illustrative for English text; the reservation uses the real byte count
  const supportCallMs = LATENCY.firstTokenMs + SUPPORT.outputPerCall * 12.5; // 1,456.8
  const inFlight = (SUPPORT.peakMidCallsPerSecond * supportCallMs) / 1_000; // 28.85
  const maxTokens = 512;
  const unsetMaxTokens = 4_096;
  const maxInputPrice = PRICES.mid.cacheWrite; // 2.50 (5-minute TTL aliases)
  const heldMoneyPerCall = usd(SUPPORT.inputPerCall * bytesPerToken, maxInputPrice) + usd(maxTokens, PRICES.mid.output);
  const heldOtpm = (cap: number) => inFlight * (cap - SUPPORT.outputPerCall);
  const worstUsd = usd(LABS.promptCap, PRICES.mid.input) + usd(LABS.maxTokensCap, PRICES.mid.output); // 0.08448
  const chargeAfterUsd = LABS.maxParallel * worstUsd; // 1.69
  const lagS = 20;
  const lagUsd = LABS.peakOnPathPerSecond * lagS * worstUsd; // 1.29
  const labsHeldPerCall =
    usd(LABS.promptCap * bytesPerToken, maxInputPrice) + usd(LABS.maxTokensCap, PRICES.mid.output); // 0.3405
  return {
    bytesPerToken,
    supportCallMs,
    inFlight,
    maxTokens,
    maxInputPrice,
    heldMoneyPerCall, // 0.0571
    heldMoneyInFlight: inFlight * heldMoneyPerCall, // 1.65
    heldItpm: inFlight * SUPPORT.inputPerCall, // 150,000
    heldItpmShare: (inFlight * SUPPORT.inputPerCall) / QUOTAS.supportGuaranteedItpm, // ≈ 0.052
    heldOtpm: heldOtpm(maxTokens), // ≈ 12,330
    heldOtpmShare: heldOtpm(maxTokens) / QUOTAS.supportGuaranteedOtpm, // ≈ 0.077
    heldOtpmUnset: heldOtpm(unsetMaxTokens), // ≈ 115,700
    heldOtpmUnsetShare: heldOtpm(unsetMaxTokens) / QUOTAS.supportGuaranteedOtpm, // ≈ 0.73
    overshoot: {
      reserved: 0,
      chargeAfterUsd,
      chargeAfterShare: chargeAfterUsd / LABS.budgetUsd, // 0.020
      chargeAfterTokens: LABS.maxParallel * LABS.worstTokens, // 680,960
      chargeAfterTokenShare: (LABS.maxParallel * LABS.worstTokens) / LABS.budgetTokens, // 0.0227
      chargeAfterLaggedUsd: chargeAfterUsd + lagUsd, // 2.98
      chargeAfterLaggedShare: (chargeAfterUsd + lagUsd) / LABS.budgetUsd, // 0.035
      lagS,
    },
    labsHeldPerCall, // 0.34 USD
    labsHeldMax: LABS.maxParallel * labsHeldPerCall, // 6.81 USD: the last ≤ 8% of labs' day is refused early, then released
    /**
     * A mass cache miss (a deploy) as a RATE: every support call counts its full input, 720 × 8,580 = 6.18M a minute
     * against its guaranteed 2.91M; the 3.27M excess comes from the 5.4M burst pool (T0 borrows first), leaving 2.13M.
     */
    massMissItpm: SUPPORT.peakMessagesPerSecond * 60 * SUPPORT.inputPerMessage, // 6,177,600
    massMissExcess: SUPPORT.peakMessagesPerSecond * 60 * SUPPORT.inputPerMessage - QUOTAS.supportGuaranteedItpm,
    labsAskedTokens: (TEAM_KEYS.labs.inputM + TEAM_KEYS.labs.outputM) * M, // 45M
    /** Large-ceiling aliases (thinking): incremental reservation in 4,096-token chunks; overshoot ≤ in flight × chunk. */
    incrementalChunk: 4_096,
  };
})();

// ── Gateway overhead budget (targets to be measured; dossier F5–F7, F41 for scale) ─────────────────────────────────

/**
 * Spans before the request leaves for the provider, p50 / spread (p95 − p50), ms, illustrative:
 *   hop app → cell router 0.5 / 1; cell router → replica 0.5 / 1; auth (workload identity, cached) 1 / 1; parse body,
 *   count bytes, hash the prefix 0.3 / 0.5 (support's ≈ 20 KB; labs' 128 KB ≈ 2 ms); reserve (one Redis script) 2 / 3;
 *   regex + dictionary pass 0.3 / 0.3; route and translate 1 / 1.
 *   Plain: 5.6 p50; p95 5.6 + √(1 + 1 + 1 + 0.25 + 9 + 0.09 + 1) = 9.3 (stage sum 13.4).
 *   CPU name scan (spaCy-class NER called directly; F41 median 13.5 ms on 523 characters, hardware not stated):
 *   13.5 / 16.5 → NER path 19.1 p50; p95 19.1 + √(13.34 + 272.25) = 36.0 (stage sum 43.4).
 * Targets (N1): plain p50 ≤ 8, p95 ≤ 20; NER p50 ≤ 30, p95 ≤ 60. Both rules met. Measured for comparison: LiteLLM 2–12
 * ms p50 by instance count with Redis off (F5, F6), 47 ms p99 a pod at 100 RPS with Redis on (F7).
 * The tenants' 400 ms first token is measured at their service, so it includes these spans: A's share is 394.4 ms.
 * Support pre-scans each new message during its own 30 ms case-load stage: NER 13.5 p50, 30 p95 → hidden at both.
 */
export const OVERHEAD = (() => {
  const spans = [
    { id: "hop", label: "Hop to the cell router", p50: 0.5, spread: 1, ner: false },
    { id: "cell", label: "Cell router to replica", p50: 0.5, spread: 1, ner: false },
    { id: "auth", label: "Workload identity", p50: 1, spread: 1, ner: false },
    { id: "parse", label: "Parse, count bytes, hash", p50: 0.3, spread: 0.5, ner: false },
    { id: "reserve", label: "Reserve (Redis)", p50: 2, spread: 3, ner: false },
    { id: "regex", label: "Regex and dictionary", p50: 0.3, spread: 0.3, ner: false },
    { id: "ner", label: "Name scan (CPU NER)", p50: 13.5, spread: 16.5, ner: true },
    { id: "route", label: "Route and translate", p50: 1, spread: 1, ner: false },
  ] as const;
  const path = (withNer: boolean) => {
    const s = spans.filter((x) => withNer || !x.ner);
    const p50 = sum(s.map((x) => x.p50));
    return { p50, p95: p50 + rss(s.map((x) => x.spread)), stageSum: sum(s.map((x) => x.p50 + x.spread)) };
  };
  const plain = path(false);
  const ner = path(true);
  const targets = { plain: { p50: 8, p95: 20 }, ner: { p50: 30, p95: 60 } };
  return {
    spans,
    plain, // 5.6 / 9.3 / 13.4
    ner, // 19.1 / 36.0 / 43.4
    targets,
    meets:
      plain.p50 <= targets.plain.p50 &&
      plain.stageSum <= targets.plain.p95 &&
      ner.p50 <= targets.ner.p50 &&
      ner.stageSum <= targets.ner.p95,
    providerShareMs: LATENCY.firstTokenMs - plain.p50, // 394.4
    prescan: {
      overlapMs: SUP_LATENCY.gateway,
      nerP50: 13.5,
      nerP95: 30,
      exposedP50: 0,
      exposedP95: Math.max(0, 30 - SUP_LATENCY.gateway),
    },
    measured: { litellm4: { p50: 2, p95: 8, p99: 13 }, litellm2: { p50: 12, p95: 29, p99: 43 }, podP99At100: 47 },
    gpuNerRef: { chars: 317, avg: 38.11, p95: 86.47 }, // F40, the rejected GPU option
    podKneeRps: 100,
    podDesignRps: 50,
    holdChars: 20,
    holdMs: 5 * 12.5, // only after "[" + an upper-case placeholder type, only on aliases with redaction
  };
})();

// ── Fallback, B's quota, what the warm share buys ───────────────────────────────────────────────────────────────────

/**
 * B's TPM need if it carries T0 cold at the sale-day peak (Bedrock: input + cache writes + output × burndown; input +
 * max_tokens deducted at the start, F56). Mid:
 *   support 720 × 8,580 = 6,177,600 input + 100,440 × 10 = 1,004,400 → 7.18M (6.68M at 5×); start deductions 1,188 ×
 *   (5,200 + 512) = 6.79M, lower than the settled count;
 *   voice 414.7 × 3,600 = 1,492,992 + 10,368 × 10 = 103,680 → 1.60M (1.54M at 5×);
 *   → T0 mid ≈ 8.78M TPM (8.22M at 5×). The assistant (≈ 0.65M cold) goes to C instead, to keep B for T0.
 * Small: support 2,880,000 + 72,000 × 10 = 3.60M; voice 967.7 × 3,600 + 24,192 × 10 + detector 230,400 = 3.95M →
 *   ≈ 7.55M TPM.
 * Quota to request (1.2 × need): mid 10.5M TPM, small 9.1M TPM on the EU geographic profile, + a TPD. Until granted,
 * B carries voice first and support up to its quota; the rest of support hands off to people (its own path).
 * Cold cost per support message: no cache 8,580 × 2.00 + 139.5 × 10 = 0.01856 (× 2.44); every call writing 8,580 ×
 * 2.50 + 1,395 = 0.02285 (× 3.01) of 0.00759; B's own price unverified.
 * Warm share 5%: buys a live code path, connection pools, quota in use and a measured B quality canary; it does NOT
 * keep B's caches warm (Bedrock caches per serving machine and the EU profile spreads Regions, F36), so cold numbers
 * above are the plan.
 */
export const FAILOVER = (() => {
  const bd = PROVIDER_LIMITS.bedrock.burndown;
  const bdLow = PROVIDER_LIMITS.bedrock.burndownLow;
  const m = SUPPORT.peakMessagesPerSecond * 60;
  const voiceMid = VOICE.peakMidCallsPerSecond * 60;
  const voiceSmall = VOICE.peakSmallAgentCallsPerSecond * 60;
  const voiceIn = VOICE.uncachedPerCall + VOICE.cachedPerCall; // 3,600
  const supportMid = (b: number) => m * SUPPORT.inputPerMessage + m * SUPPORT.outputPerMessage * b;
  const voiceMidNeed = (b: number) => voiceMid * voiceIn + voiceMid * VOICE.outputPerCall * b;
  const midNeed = supportMid(bd) + voiceMidNeed(bd); // ≈ 8.78M
  const midNeedLow = supportMid(bdLow) + voiceMidNeed(bdLow); // ≈ 8.22M
  const smallNeed =
    m * SUPPORT.small.inputPerMessage +
    m * SUPPORT.small.outputPerMessage * bd +
    voiceSmall * voiceIn +
    voiceSmall * VOICE.outputPerCall * bd +
    VOICE_CALLS.salesDayConcurrent * VOICE.other.detector * VOICE.detectorInput; // ≈ 7.55M
  const coldNoCache = usd(SUPPORT.inputPerMessage, PRICES.mid.input) + usd(SUPPORT.outputPerMessage, PRICES.mid.output);
  const coldWrites =
    usd(SUPPORT.inputPerMessage, PRICES.mid.cacheWrite) + usd(SUPPORT.outputPerMessage, PRICES.mid.output);
  return {
    firstUnluckyMs: CONCEPT_FALLBACK.userFirstTokenMs, // 3,450
    breaker: { window: BREAKER.window, trips: BREAKER.failuresToTrip, openS: BREAKER.openS, probes: BREAKER.probes },
    openPathMs: LATENCY.firstTokenMs + 150, // 550 (150 ms cold penalty, illustrative)
    voiceFast429Ms: 50 + VOICE.firstTokenMs + 150, // 600
    voiceSilentMs: 2 * VOICE.firstTokenMs + VOICE.firstTokenMs + 150, // 1,350
    supportStartDeduction: SUPPORT.peakMidCallsPerSecond * 60 * (SUPPORT.inputPerCall + RESERVE.maxTokens), // ≈ 6.79M
    midNeed,
    midNeedLow,
    smallNeed,
    midRequest: 1.2 * midNeed, // ≈ 10.5M
    smallRequest: 1.2 * smallNeed, // ≈ 9.1M
    assistantColdMid: ASSISTANT.peakTurnsPerSecond * 60 * ASSISTANT.coldPerTurn, // ≈ 0.55M (+ output)
    coldCountedRatio: SUPPORT.inputPerMessage / SUPPORT.uncachedPerMessage, // 3.44
    coldNoCacheUsd: coldNoCache, // 0.01856
    coldWritesUsd: coldWrites, // 0.02285
    coldCostRatio: { low: coldNoCache / SUPPORT.agentPerMessage, high: coldWrites / SUPPORT.agentPerMessage }, // 2.44 / 3.01
    warmShare: 0.05,
    returnStepPerMinute: 0.25, // to be sized from A's ramp rule (F14) once measured
  };
})();

/** Availability of T0 (sheet §4 N2, §15.5). Inputs illustrative; the arithmetic is the point. */
export const AVAILABILITY = (() => {
  const monthMin = 30 * 24 * 60; // 43,200
  const gatewayMin = 2; // both Regions of a T0 cell bad at once, or a bad release before rollback
  const aDownMin = 43.2; // A at 99.9% for T0's alias (illustrative; one provider gave 262 min in Dec 2024, F38)
  const pBGivenA = 0.2; // B unusable when A is down: same weights and vendor (F37 reached Bedrock), or quota short
  const incidents = 2;
  const detectMin = 0.5; // per incident: calls before the breaker opens and the 3,450 ms first calls
  const badMin = gatewayMin + aDownMin * pBGivenA + incidents * detectMin; // 11.64
  const target = 0.9995;
  const budget = monthMin * (1 - target); // 21.6
  const for9999 = (monthMin * 0.0001 - gatewayMin - incidents * detectMin) / aDownMin; // 0.0306
  const badMonth = gatewayMin + 262 * pBGivenA + incidents * detectMin; // 55.4
  return {
    monthMin,
    gatewayMin,
    aDownMin,
    pBGivenA,
    incidents,
    detectMin,
    badMin, // 11.64
    availability: 1 - badMin / monthMin, // 0.99973
    target, // 99.95%
    budget, // 21.6
    pBGivenAFor9999: for9999, // ≈ 0.031: needed for 99.99%
    badMonthMin: badMonth, // 55.4 in an F38-sized month
    badMonthAvailability: 1 - badMonth / monthMin, // 0.99872
    sliThresholdMs: 2 * LATENCY.firstTokenMs, // 800: a call is good if its first token arrives ≤ 800 ms
  };
})();

/** Fallback chain per alias, with tags. A Anthropic API; B Bedrock EU profile; C a second family; S self-hosted. */
export const CHAINS = [
  {
    alias: "support-agent",
    cell: "support",
    residency: "any",
    schema: "strict-tools",
    chain: ["A", "B"],
    last: "hand off to a person (support's own path)",
  },
  {
    alias: "voice-agent",
    cell: "voice",
    residency: "any",
    schema: "strict-tools",
    chain: ["A", "B"],
    last: "apology and transfer (voice's own path)",
  },
  {
    alias: "assistant-answer",
    cell: "other",
    residency: "any",
    schema: "tools",
    chain: ["A", "C"],
    last: "'answers are slower than usual' banner",
  },
  {
    alias: "ap-extract",
    cell: "other",
    residency: "uk-or-eu",
    schema: "json-schema",
    chain: ["B"],
    last: "queue and wait (never leaves the UK or EU)",
  },
  {
    alias: "catalogue-batch",
    cell: "other",
    residency: "any",
    schema: "none",
    chain: ["A-batch"],
    last: "run the next night",
  },
  { alias: "labs", cell: "other", residency: "any", schema: "none", chain: ["A", "S"], last: "fail with 503" },
] as const;

// ── Prompt-cache-aware routing ──────────────────────────────────────────────────────────────────────────────────────

/**
 * What breaks support's prefix costs, per message, on its 6,085 cached tokens:
 *   caching switched off (no breakpoints): 6,085 × (2.00 − 0.10) − the write premiums no longer paid (0.35 × 2,300 +
 *   0.15 × 2,600) × 0.50 = 0.011562 − 0.000598 = 0.010964 → × 200,000 ≈ 2,193 USD a day;
 *   a NON-DETERMINISTIC change with breakpoints in place (a per-request id before the breakpoint): every call writes
 *   at 2.50 instead of reading at 0.10: 6,085 × 2.40 = 0.014604 → ≈ 2,921 USD a day (1.6 × support's whole bill).
 *   A DETERMINISTIC change (sorted JSON keys on every replica) costs one write per prefix per workspace per TTL.
 * Key buckets for an OpenAI-class provider before GPT-5.6 (≈ 15 requests a minute per prefix and key, F30): only the
 * assistant's answers on C use one: 45.4 turns × 1.33 = 60.4 mid calls a minute → ⌈60.4 ÷ 15⌉ = 5 buckets.
 */
export const STICKY = (() => {
  const sh = SUP_VOLUME.shapes;
  const writePremium = PRICES.mid.cacheWrite - PRICES.mid.input; // 0.50
  const off =
    usd(SUPPORT.cachedPerMessage, PRICES.mid.input - PRICES.mid.cached) -
    usd(
      sh.one * SUP_CONTEXT.averageChanging + sh.two * (SUP_CONTEXT.averageChanging + SUP_OUTPUT.followUpNewTokens),
      writePremium
    );
  const writes = usd(SUPPORT.cachedPerMessage, PRICES.mid.cacheWrite - PRICES.mid.cached);
  const assistantRpm = ASSISTANT.peakTurnsPerSecond * 60 * ASSISTANT.midCallsPerTurn; // 60.4
  return {
    offPerMessage: off, // 0.010964
    offPerDay: off * SUP_VOLUME.messagesPerDay, // ≈ 2,193
    writesPerMessage: writes, // 0.014604
    writesPerDay: writes * SUP_VOLUME.messagesPerDay, // ≈ 2,921
    rpmPerKey: 15,
    assistantRpm,
    assistantBuckets: Math.ceil(assistantRpm / 15), // 5
    idleMinutes: { fiveMinuteTtl: 5, oneHourTtl: 60 },
  };
})();

// ── Redaction ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Per-tenant policy. "Dictionary" = the per-conversation value → placeholder map applied to all outgoing text. */
export const REDACTION = [
  {
    tenant: "Support agent",
    data: "customer PII",
    inline: "regex + dictionary on all text; NER on unseen text (pre-scanned)",
    cards: "block",
    onScannerDown: "regex + dictionary ≤ 15 min, then hand-offs; privacy owner paged",
  },
  {
    tenant: "Voice agent",
    data: "customer PII (spoken)",
    inline: "regex + dictionary; NER on unseen text, pre-scanned as each turn is transcribed",
    cards: "block",
    onScannerDown: "regex + dictionary ≤ 15 min, then transfer",
  },
  {
    tenant: "Employee assistant",
    data: "internal, permission-filtered",
    inline: "secrets regex",
    cards: "block",
    onScannerDown: "n/a",
  },
  {
    tenant: "AP extraction",
    data: "supplier details (bank details masked by AP)",
    inline: "card regex on text",
    cards: "block",
    onScannerDown: "n/a",
  },
  { tenant: "Catalogue", data: "public product text", inline: "card regex", cards: "block", onScannerDown: "n/a" },
  {
    tenant: "Labs",
    data: "no customer data allowed",
    inline: "regex + NER, block on any hit",
    cards: "block",
    onScannerDown: "fail closed",
  },
] as const;

/** Redaction gates (95%, normal approximation; pass on the LOWER bound) and the dictionary's cost. */
export const REDACTION_EVAL = (() => {
  const margin = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  return {
    structured: { n: 1_000, target: 0.99, margin: margin(0.99, 1_000) }, // ± 0.0062
    names: { n: 800, target: 0.95, margin: margin(0.95, 800) }, // ± 0.0151
    cards: { n: 1_000, upperIfZero: 3 / 1_000 }, // 0 of 1,000 → ≤ 0.3% at 95%
    carryOver: { conversations: 500, turns: 4 }, // 0 raw values from earlier turns in later calls
    dictionaryMs: 0.1, // exact-match (Aho–Corasick) over ≈ 20 KB
    dictionaryTtl: "conversation idle + 1 h",
    cpuNerMs: 13.5,
    gpuNerMs: 38.11,
    regexMs: 0.2,
  };
})();

// ── Capacity, cells, platform cost ──────────────────────────────────────────────────────────────────────────────────

/**
 * Three cells (support, voice, T1–T3), each active-active in London and Ireland; each Region carries its cell alone at
 * 1.5 × peak, 50 RPS a pod, + 1 spare: support 56.76 × 1.5 = 85.1 → 2 + 1 = 3; voice 36.93 × 1.5 = 55.4 → 2 + 1 = 3;
 * other 3.9 × 1.5 = 5.8 → 1 + 1 = 2 → 8 a Region, 16 pods. CPU name-scanner pods 2 a Region.
 * Infra a month (illustrative): pods 16 × 0.20 × 720 = 2,304; scanner pods 4 × 0.20 × 720 = 576; Redis 6 × 150 = 900;
 * metering 900; canaries 2,679 → 7,359. Team 4 engineers (on-call shared with SRE) × 400,000 ÷ 12 = 133,333.
 * → ≈ 140,700 a month ≈ 0.0030 USD a call (model ≈ 0.0016 a call); ≈ 1.9 × the model spend it carries.
 * Canaries: 50 prompts × 144 runs = 7,200 a day a target; mid ≈ 1,000 in + 200 out = 0.004 USD → 28.8 a day; three mid
 * targets (A, B, C at mid prices, illustrative) + two small (A, B: 0.0002 → 1.44) ≈ 89.3 a day ≈ 2,679 a month.
 */
export const CAPACITY = (() => {
  const design = OVERHEAD.podDesignRps;
  const pods = (peak: number) => Math.ceil((peak * 1.5) / design) + 1;
  const perRegion = {
    support: pods(TRAFFIC_GW.cells.support),
    voice: pods(TRAFFIC_GW.cells.voice),
    other: pods(TRAFFIC_GW.cells.other),
  };
  const regions = 2;
  const gatewayPods = regions * sum(Object.values(perRegion)); // 16
  const scannerPods = regions * 2;
  const canaryMid = 7_200 * (usd(1_000, PRICES.mid.input) + usd(200, PRICES.mid.output)); // 28.8
  const canarySmall = 7_200 * (usd(1_000, PRICES.small.input) + usd(200, PRICES.small.output)); // 1.44
  const canariesMonthly = (3 * canaryMid + 2 * canarySmall) * 30; // 2,679
  const infra = {
    gatewayPods: gatewayPods * 0.2 * 720,
    scannerPods: scannerPods * 0.2 * 720,
    redis: regions * 3 * 150,
    metering: 900,
    canaries: canariesMonthly,
  };
  const infraMonthly = sum(Object.values(infra)); // ≈ 7,359
  const teamMonthly = (4 * 400_000) / 12; // 133,333
  const platformMonthly = infraMonthly + teamMonthly; // ≈ 140,700
  return {
    perRegion,
    regions,
    gatewayPods,
    scannerPods,
    canariesPerDayPerTarget: 7_200,
    canaryMidPerDay: canaryMid,
    canariesMonthly,
    infra,
    infraMonthly,
    teamMonthly,
    platformMonthly,
    platformPerCall: platformMonthly / (TRAFFIC_GW.callsPerDay * 30), // ≈ 0.0030
    modelPerCall: TRAFFIC_GW.spendPerMonth / (TRAFFIC_GW.callsPerDay * 30), // ≈ 0.0016
    platformToModel: platformMonthly / TRAFFIC_GW.spendPerMonth, // ≈ 1.9
    redisOpsPerSecond: TRAFFIC_GW.peakPerSecond * 2 + 10, // ≈ 205
    meteringGbPerDay: TRAFFIC_GW.callsPerDay / M, // ≈ 1.58
    meteringGb400Days: (TRAFFIC_GW.callsPerDay * 400) / M, // ≈ 631
    thin: { engineers: 1, monthly: 400_000 / 12 + 1_500 }, // the thin start (§15.5): ≈ 34,800
  };
})();

/** Fail open or closed, per dependency and cell (sheet §15.5). */
export const FAILURE_POLICY = [
  {
    dependency: "Counter store (Redis)",
    t0: "open: local counters at limit ÷ replicas in the Region, ≤ 15 min, page",
    other: "assistant open ≤ 5 min; AP, catalogue, labs closed",
  },
  {
    dependency: "Budget ledger",
    t0: "open with a page (support at minute 16 is worse than overspend)",
    other: "closed",
  },
  {
    dependency: "Name scanner",
    t0: "regex + dictionary ≤ 15 min (signed tenant exception), then the tenant's human path",
    other: "labs closed",
  },
  {
    dependency: "Config store / control plane",
    t0: "last-known-good routes; keys from the signed deny-list (10 s pull); key data older than 24 h → unknown keys refused",
    other: "same",
  },
  { dependency: "Metering store", t0: "spool to a replicated local queue, replay", other: "same" },
  {
    dependency: "Provider A",
    t0: "B (voice first, support to its quota)",
    other: "assistant to C; labs to S or closed",
  },
] as const;

/** Release and alias-change gates. The release-gate figure fails one ("determinism"). */
export const GATES = [
  { id: "overhead", label: "Overhead p95, a pod at 2 × design load", target: "≤ 20 ms plain, ≤ 60 ms NER" },
  { id: "determinism", label: "Same input → same bytes across replicas and versions", target: "0 diffs" },
  { id: "cache", label: "Cache-read share on a 1-hour replay vs direct", target: "≥ direct − 1 point" },
  { id: "budget", label: "Budget overshoot under a labs-shaped loop", target: "0" },
  {
    id: "redaction",
    label: "Recall, lower bound (structured / names); carry-over",
    target: "≥ 99% / ≥ 95%; 0 raw values",
  },
  { id: "fallback", label: "Target on the tenant's gold set (paired, MDD stated)", target: "not lower by ≥ 5 points" },
  { id: "drill", label: "Production: one T0 alias 100% on B, 10 min", target: "SLI ≥ 99% good calls" },
  { id: "reconcile", label: "Metered vs provider usage, daily", target: "gap ≤ 1%" },
] as const;

/** Gold-set power: support's 200 tickets, ≈ 10% discordant pairs → 95% interval on the difference ≈ ± 4.4 points. */
export const GATE_POWER = (() => {
  const n = 200;
  const discordant = 0.1;
  return { n, discordant, mdd: 1.96 * Math.sqrt(discordant / n) }; // ≈ 0.044
})();

export const CANARIES = { prompts: 50, everyMinutes: 10, perDay: 50 * 6 * 24 } as const;

export const AUDIT = {
  rowBytes: 1_000,
  metadataDays: 400,
  bodiesDefault: "not stored",
  bodiesOptInDays: 30,
  dictionary: "encrypted per conversation (KMS), idle + 1 h, deleted on close",
  endUser: "HMAC with a rotating platform key",
} as const;

/**
 * Walk-through (sheet §9): the support agent's first call on the two-tool kettle message, 11:00 on sale day.
 *   Money reserved (upper bound): 5,000 tokens ≈ 20,000 bytes × 2.50 + 512 × 10.00 per million = 0.05 + 0.00512 =
 *   0.05512 USD; rate reserved: 5,000 ITPM (estimate) + 512 OTPM.
 *   Settled from usage: 2,700 cache read × 0.10 + 2,300 cache write × 2.50 + 30 out × 10.00 = 0.00027 + 0.00575 +
 *   0.0003 = 0.00632 USD (support's own cost model charges this write to the message); refund 0.0488 USD; rate settles
 *   to 2,300 ITPM (the write) and 30 OTPM.
 */
export const WALKTHROUGH = (() => {
  const cached = SUP_CONTEXT.stable; // 2,700
  const written = SUP_CONTEXT.averageChanging; // 2,300
  const out = SUP_OUTPUT.toolCall; // 30
  const bytes = (cached + written) * RESERVE.bytesPerToken; // 20,000
  const reserved = usd(bytes, RESERVE.maxInputPrice) + usd(RESERVE.maxTokens, PRICES.mid.output);
  const settled = usd(cached, PRICES.mid.cached) + usd(written, PRICES.mid.cacheWrite) + usd(out, PRICES.mid.output);
  return {
    cached,
    written,
    out,
    bytes,
    reserved, // 0.05512
    settled, // 0.00632
    refund: reserved - settled, // 0.0488
    leavesAtMs: OVERHEAD.plain.p50, // 5.6
    firstTokenMs: LATENCY.firstTokenMs, // 400 at the support service; A's share 394.4
  };
})();

/** Self-hosted pool S: 2 GPUs, London, open-weights 8B class on vLLM behind an endpoint picker (F33); charged to labs. */
export const SELF_HOSTED = { gpus: 2, monthlyUsd: 2 * PRICES.gpuHour * 720, region: "London" } as const;
