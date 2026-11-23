// Constants and arithmetic for the "Design an LLM Platform and Gateway" case study (/genai-system-design/case-studies/
// llm-platform-gateway; design sheet SYSTEM-DESIGN/plans/genai-design/design/llm-platform-gateway.md v1, dossier
// research/llm-platform-gateway.md, cited as "dossier F12"). Specs in assets/diagrams/animated/llm-gateway/ import
// from here, so the page, the figures and the tests share one set of numbers.
//
// Running example: Brightpost's platform team runs ONE internal gateway that every team's model calls go through. The
// tenants are the Brightpost systems of the other case studies, with THEIR numbers imported from their presets (one
// value per fact per system): the support agent (gcase-support), the voice agent (gcase-voice), the employee assistant
// (gcase-enterprise), accounts-payable extraction (gcase-docextract), plus the concept page's catalogue writer and labs
// keys (production-gateway TEAM_KEYS). The concept pages' single-call support assistant (2,200 in / 250 out) is the
// simplified version of the same team; this page uses the support agent's own call shapes.
//
// Model prices: list prices as of November 2026 from presets/gcase-answer.ts PRICES (mid-size Claude Sonnet 5.5 class
// 2.00 input / 0.10 cache read / 2.50 5-minute write / 10.00 output USD per million; small Claude Haiku 5.5 class
// 0.10 / 0.01 / 0.125 / 0.50). Provider limits: Anthropic Scale tier, Sonnet 5.5 and Haiku 5.5 each 13,000 RPM,
// 10,000,000 ITPM (uncached input + cache writes only), 2,000,000 OTPM; monthly spend cap 200,000 USD (dossier F10–F13).
// Everything else (shares, durations, gateway spans, pod and GPU sizes, headcount) is ILLUSTRATIVE unless a comment
// names a dossier fact. p95 of a path = p50 + root-sum-square of stage spreads (independent tails); the stage-sum bound
// is given beside it.

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

// ── Provider limits (dossier F12, F13) ──────────────────────────────────────────────────────────────────────────────

/** Anthropic Scale tier, per model class (Sonnet 5.5 = mid, Haiku 5.5 = small), as of November 2026. */
export const PROVIDER_LIMITS = {
  mid: { rpm: 13_000, itpm: 10_000_000, otpm: 2_000_000 },
  small: { rpm: 13_000, itpm: 10_000_000, otpm: 2_000_000 },
  monthlySpendCapUsd: 200_000, // Scale tier; at the cap every request gets a 429 with no retry-after (F13)
  /** Guaranteed quotas may add up to at most this share of a provider limit; the rest is the shared burst pool. */
  guaranteedShareMax: 0.6,
} as const;

// ── Tenants: each team's own numbers, imported ──────────────────────────────────────────────────────────────────────

/**
 * Support agent (gcase-support). Per customer message, 1.65 mid calls in three shapes (50% no tool, 35% one, 15% two):
 *   uncached-or-written input (counts toward ITPM, F10): no tool 2,300; one tool 2,300 + 300 = 2,600; two tools 2,900
 *     → 0.5 × 2,300 + 0.35 × 2,600 + 0.15 × 2,900 = 2,495 a message;
 *   cache reads: no tool 2,700; one tool 2,700 + 5,000; two tools 2,700 + 5,300 + 5,600
 *     → 1,350 + 2,695 + 2,040 = 6,085 a message (all input = 8,580);
 *   output: 120; 30 + 120; 30 + 30 + 120 → 60 + 52.5 + 27 = 139.5 a message (84.5 a call).
 * Small calls through the gateway: the router (600 in, 50 out) and the supervisor (2,800 in, 40 out), 2 a message.
 * (The bad-actor classifier runs inside the support service, not through the gateway.)
 * Peak: 12 messages a second (TRAFFIC.peakPerSecond, a sale day) → 19.8 mid + 24 small calls a second.
 */
export const SUPPORT = (() => {
  const sh = SUP_VOLUME.shapes;
  const changing = SUP_CONTEXT.averageChanging; // 2,300
  const followNew = SUP_OUTPUT.followUpNewTokens; // 300
  const stable = SUP_CONTEXT.stable; // 2,700
  const total = SUP_CONTEXT.averageTotal; // 5,000
  const uncachedPerMessage = sh.none * changing + sh.one * (changing + followNew) + sh.two * (changing + 2 * followNew); // 2,495
  const cachedPerMessage =
    sh.none * stable + sh.one * (stable + total) + sh.two * (stable + (total + followNew) + (total + 2 * followNew)); // 6,085
  const outputPerMessage =
    sh.none * SUP_OUTPUT.reply +
    sh.one * (SUP_OUTPUT.toolCall + SUP_OUTPUT.reply) +
    sh.two * (2 * SUP_OUTPUT.toolCall + SUP_OUTPUT.reply); // 139.5
  const midCallsPerMessage = SUP_VOLUME.modelCallsPerMessage; // 1.65
  const peakMessagesPerSecond = TRAFFIC.peakPerSecond; // 12
  const small = { calls: 2, inputPerMessage: 600 + 2_800, outputPerMessage: 50 + 40 };
  return {
    uncachedPerMessage,
    cachedPerMessage,
    inputPerMessage: uncachedPerMessage + cachedPerMessage, // 8,580
    outputPerMessage,
    outputPerCall: outputPerMessage / midCallsPerMessage, // 84.5
    midCallsPerMessage,
    peakMessagesPerSecond,
    peakMidCallsPerSecond: peakMessagesPerSecond * midCallsPerMessage, // 19.8
    peakSmallCallsPerSecond: peakMessagesPerSecond * small.calls, // 24
    small,
    midCallsPerDay: SUP_VOLUME.modelCallsPerDay, // 330,000
    smallCallsPerDay: SUP_VOLUME.messagesPerDay * small.calls, // 400,000
    spendPerDay: SUP_COST.perDay, // ≈ 1,801 USD
    agentPerMessage: SUP_COST.agentPerMessage, // 0.00759 USD
  };
})();

/**
 * Voice agent (gcase-voice). 7.2 model calls a call-minute, 30% mid and 70% small (its COST.blended). Each call:
 * 2,000 cached + 1,600 changing input, 25 out. Peak = a sale day's 192 concurrent calls → 192 × 7.2 ÷ 60 = 23.04
 * calls a second (6.91 mid, 16.13 small). Model spend a day = (agent 0.00885 + other 0.00235) × 32,000 min ≈ 358.5.
 */
export const VOICE = (() => {
  const callsPerMinute = VOICE_TURNS.callsPerMinute; // 7.2
  const midShare = 0.3;
  const peakCallsPerSecond = (VOICE_CALLS.salesDayConcurrent * callsPerMinute) / 60; // 23.04
  return {
    callsPerMinute,
    midShare,
    peakCallsPerSecond,
    peakMidCallsPerSecond: peakCallsPerSecond * midShare, // 6.912
    peakSmallCallsPerSecond: peakCallsPerSecond * (1 - midShare), // 16.128
    uncachedPerCall: VOICE_CONTEXT.changing, // 1,600
    cachedPerCall: VOICE_CONTEXT.stable, // 2,000
    outputPerCall: VOICE_TURNS.replyTokens, // 25
    callsPerDay: callsPerMinute * VOICE_CALLS.minutesPerDay, // 230,400
    spendPerDay: (VOICE_COST.agentModel + VOICE_COST.otherModel) * VOICE_CALLS.minutesPerDay, // ≈ 358.5
    firstTokenMs: 400, // the voice budget's model first token (gcase-voice BUDGET.firstToken)
  };
})();

/**
 * Employee assistant (gcase-enterprise). Calls a turn by type (answer 65%, lookup 15%, write 8%, agent 5%, other 7%):
 *   mid: 0.65 × 1 + 0.15 × 2 + 0.08 × 1 + 0.05 × 6 = 1.33;
 *   small: router 1 + checks (0.65 + 0.05) + other 0.07 + memory 1/3 = 2.103.
 * Uncached-or-written mid input a turn: 0.65 × 4,390 + 0.15 × (870 + 60 + 800) + 0.08 × 870 + 0.05 × Σ agent newIn
 * (870 + 1,840 + 860 + 860 + 1,840 + 860 = 7,130) = 2,853.5 + 259.5 + 69.6 + 356.5 = 3,539.1.
 * Output a turn (mid): 0.65 × 250 + 0.15 × (60 + 200) + 0.08 × 120 + 0.05 × 560 = 162.5 + 39 + 9.6 + 28 = 239.1.
 * Peak 0.757 turns a second (its COMPANY.peakPerSecond).
 */
export const ASSISTANT = (() => {
  const mix = ENT_COST.mix;
  const midCallsPerTurn = mix.answer * 1 + mix.lookup * 2 + mix.write * 1 + mix.agent * ENT_AGENT.calls.length; // 1.33
  const smallCallsPerTurn = 1 + mix.answer + mix.agent + mix.other + 1 / ENT_COMPANY.turnsPerConversation; // 2.103
  const agentNew = sum(ENT_AGENT.calls.map((c) => c.newIn));
  const c = ENT_CONTEXT;
  const uncachedPerTurn =
    mix.answer * c.changing +
    mix.lookup * (c.turnState + c.toolCallOut + c.toolResult) +
    mix.write * c.turnState +
    mix.agent * agentNew; // ≈ 3,539
  const outputPerTurn =
    mix.answer * c.answerOut +
    mix.lookup * (c.toolCallOut + c.lookupReplyOut) +
    mix.write * c.writeArgsOut +
    mix.agent * sum(ENT_AGENT.calls.map((x) => x.out)); // ≈ 239
  const peakTurnsPerSecond = ENT_COMPANY.peakPerSecond; // 0.757
  return {
    midCallsPerTurn,
    smallCallsPerTurn,
    uncachedPerTurn,
    outputPerTurn,
    peakTurnsPerSecond,
    peakCallsPerSecond: peakTurnsPerSecond * (midCallsPerTurn + smallCallsPerTurn), // ≈ 2.60
    callsPerWeekday: ENT_COMPANY.weekdayTurns * (midCallsPerTurn + smallCallsPerTurn), // ≈ 49,540
    spendPerDay: ENT_COST.perMonth / 30, // ≈ 159 USD (≈ 4,777 a month)
  };
})();

/**
 * Accounts-payable extraction (gcase-docextract). EU-only: its models run through Bedrock's EU geographic profile
 * (its sheet; dossier F34). Calls a document: 2 page-classifier calls + 1 extraction = 3 for an invoice; a receipt 2
 * (classifier + receipt read). Normal day 1,625 invoices + 1,428.6 receipts → 4,875 + 2,857 = 7,732 calls. Peak 0.176
 * documents a second × 3 ≈ 0.53 calls a second. Model spend 854.6 USD a month ≈ 28.5 a day.
 */
export const AP = (() => {
  const callsPerDay = AP_VOLUME.normalDayInvoices * 3 + AP_VOLUME.receiptsPerDay * 2; // ≈ 7,732
  return {
    callsPerDay,
    peakCallsPerSecond: AP_VOLUME.peakDocsPerSecond * 3, // ≈ 0.53
    spendPerDay: AP_COST.modelsMonthly / 30, // ≈ 28.5
    residency: "eu" as const,
  };
})();

/**
 * Catalogue writer (concept page, illustrative): 20,000 descriptions a night × 800 in + 400 out on the small model
 * through the Batch API (−50%, AP_PRICES.batchDiscount): 20,000 × (800 × 0.10 + 400 × 0.50) ÷ 1M × 0.5 = 2.80 USD.
 * Runs 01:00–05:00, never at the day peak. Batch keeps data 29 days and is not ZDR-eligible (F45): its tag allows it.
 */
export const CATALOGUE = (() => {
  const items = 20_000;
  const input = (TEAM_KEYS.catalogue.inputM * M) / items; // 800
  const output = (TEAM_KEYS.catalogue.outputM * M) / items; // 400
  return {
    items,
    input,
    output,
    callsPerDay: items,
    spendPerDay: items * (usd(input, PRICES.small.input) + usd(output, PRICES.small.output)) * AP_PRICES.batchDiscount, // 2.80
    budgetTokensPerDay: TEAM_KEYS.catalogue.budgetM * M, // 40M
  };
})();

/**
 * Labs (concept page): 30M tokens a day of the mid model, its own key, at most 20 requests in flight, prompts capped
 * at 32,000 tokens (the rate-limiting page's per-prompt cap) and max_tokens capped at 2,048.
 * A worst-case request: 32,000 + 2,048 = 34,048 tokens; 32,000 × 2.00 + 2,048 × 10.00 per million = 0.0845 USD.
 * Duration of a worst-case request ≈ 600 ms prefill + 2,048 × 12.5 ms = 26.2 s, so 20 in flight ≈ 0.76 a second.
 * Calls a day ≈ 30M ÷ 5,000 tokens on a typical call (illustrative) = 6,000. Spend ≤ 30M at 90% in / 10% out
 * = 27M × 2.00 + 3M × 10.00 = 84 USD a day.
 */
export const LABS = (() => {
  const budgetTokens = TEAM_KEYS.labs.budgetM * M; // 30M
  const maxParallel = 20;
  const promptCap = 32_000;
  const maxTokensCap = 2_048;
  const worstTokens = promptCap + maxTokensCap; // 34,048
  const worstUsd = usd(promptCap, PRICES.mid.input) + usd(maxTokensCap, PRICES.mid.output); // 0.08448
  const worstDurationS = 0.6 + (maxTokensCap * 12.5) / 1_000; // 26.2
  return {
    budgetTokens,
    maxParallel,
    promptCap,
    maxTokensCap,
    worstTokens,
    worstUsd,
    worstDurationS,
    peakCallsPerSecond: maxParallel / worstDurationS, // 0.763
    callsPerDay: budgetTokens / 5_000, // 6,000
    spendPerDayMax: usd(0.9 * budgetTokens, PRICES.mid.input) + usd(0.1 * budgetTokens, PRICES.mid.output), // 84
  };
})();

// ── Traffic at the gateway ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * Calls a day: support 330,000 + 400,000; voice 230,400; assistant ≈ 49,540 (weekday); AP ≈ 7,732; catalogue 20,000;
 * labs 6,000 → ≈ 1.04M. Peak (sale day, daytime): support 19.8 + 24 = 43.8; voice 23.04; assistant 2.60; AP 0.53;
 * labs 0.76; catalogue 0 (night) → ≈ 70.7 calls a second. Model spend ≈ 1,801 + 358.5 + 159 + 28.5 + 2.8 + 84
 * ≈ 2,434 USD a day ≈ 73,000 a month (labs at its cap), 37% of the Scale-tier spend cap (Bedrock spend separate).
 */
export const TRAFFIC_GW = (() => {
  const perDay = {
    support: SUPPORT.midCallsPerDay + SUPPORT.smallCallsPerDay,
    voice: VOICE.callsPerDay,
    assistant: ASSISTANT.callsPerWeekday,
    ap: AP.callsPerDay,
    catalogue: CATALOGUE.callsPerDay,
    labs: LABS.callsPerDay,
  };
  const peak = {
    support: SUPPORT.peakMidCallsPerSecond + SUPPORT.peakSmallCallsPerSecond,
    voice: VOICE.peakCallsPerSecond,
    assistant: ASSISTANT.peakCallsPerSecond,
    ap: AP.peakCallsPerSecond,
    catalogue: 0,
    labs: LABS.peakCallsPerSecond,
  };
  const spendPerDay = {
    support: SUPPORT.spendPerDay,
    voice: VOICE.spendPerDay,
    assistant: ASSISTANT.spendPerDay,
    ap: AP.spendPerDay,
    catalogue: CATALOGUE.spendPerDay,
    labs: LABS.spendPerDayMax,
  };
  const callsPerDay = sum(Object.values(perDay)); // ≈ 1,043,700
  const peakPerSecond = sum(Object.values(peak)); // ≈ 70.7
  const spend = sum(Object.values(spendPerDay)); // ≈ 2,434
  const anthropicSpendPerMonth = (spend - AP.spendPerDay) * 30; // AP runs on Bedrock
  return {
    perDay,
    peak,
    spendPerDay,
    callsPerDay,
    peakPerSecond,
    spend,
    spendPerMonth: spend * 30, // ≈ 73,000
    anthropicSpendPerMonth, // ≈ 72,200
    capShare: anthropicSpendPerMonth / PROVIDER_LIMITS.monthlySpendCapUsd, // ≈ 0.36
    t0Peak: peak.support + peak.voice, // ≈ 66.8 (cell T0)
    otherPeak: peak.assistant + peak.ap + peak.labs, // ≈ 3.9 (cell T1–T3)
  };
})();

// ── Quotas in tokens per minute, per model class ───────────────────────────────────────────────────────────────────

/**
 * Peak need per tenant on the mid model (uncached-or-written input and output a minute, F10, F11):
 *   support:   720 messages × 2,495 = 1,796,400 ITPM; 720 × 139.5 = 100,440 OTPM; 1,188 RPM.
 *   voice:     6.912 × 60 = 414.7 calls × 1,600 = 663,552 ITPM; × 25 = 10,368 OTPM; 415 RPM.
 *   assistant: 0.757 × 60 = 45.4 turns × 3,539 = 160,700 ITPM; × 239.1 = 10,860 OTPM; 60 RPM.
 *   labs:      its own cap: 200,000 ITPM, 20,000 OTPM (illustrative).
 * Guaranteed quota = 1.5 × peak need (labs at its cap); sum ITPM ≈ 2.69 + 1.00 + 0.24 + 0.20 = 4.13M = 41% of 10M,
 * under the 60% guaranteed share; the rest is a shared burst pool lent by tier (T0 first).
 * Small model: support 720 × 3,400 = 2,448,000 ITPM; voice 16.128 × 60 × 1,600 = 1,548,288 ITPM.
 */
export const QUOTAS = (() => {
  const headroom = 1.5;
  const need = {
    support: {
      itpm: SUPPORT.peakMessagesPerSecond * 60 * SUPPORT.uncachedPerMessage,
      otpm: SUPPORT.peakMessagesPerSecond * 60 * SUPPORT.outputPerMessage,
      rpm: SUPPORT.peakMidCallsPerSecond * 60,
    },
    voice: {
      itpm: VOICE.peakMidCallsPerSecond * 60 * VOICE.uncachedPerCall,
      otpm: VOICE.peakMidCallsPerSecond * 60 * VOICE.outputPerCall,
      rpm: VOICE.peakMidCallsPerSecond * 60,
    },
    assistant: {
      itpm: ASSISTANT.peakTurnsPerSecond * 60 * ASSISTANT.uncachedPerTurn,
      otpm: ASSISTANT.peakTurnsPerSecond * 60 * ASSISTANT.outputPerTurn,
      rpm: ASSISTANT.peakTurnsPerSecond * 60 * ASSISTANT.midCallsPerTurn,
    },
  };
  const labs = { itpm: 200_000, otpm: 20_000, rpm: 120 };
  const guaranteed = {
    support: { itpm: need.support.itpm * headroom, otpm: need.support.otpm * headroom },
    voice: { itpm: need.voice.itpm * headroom, otpm: need.voice.otpm * headroom },
    assistant: { itpm: need.assistant.itpm * headroom, otpm: need.assistant.otpm * headroom },
    labs,
  };
  const sumItpm = sum(Object.values(guaranteed).map((g) => g.itpm));
  const sumOtpm = sum(Object.values(guaranteed).map((g) => g.otpm));
  const peakItpm = need.support.itpm + need.voice.itpm + need.assistant.itpm + labs.itpm;
  const peakRpm = need.support.rpm + need.voice.rpm + need.assistant.rpm + labs.rpm;
  const peakOtpm = need.support.otpm + need.voice.otpm + need.assistant.otpm + labs.otpm; // ≈ 141,700
  const smallItpm = {
    support: SUPPORT.peakMessagesPerSecond * 60 * SUPPORT.small.inputPerMessage, // 2,448,000
    voice: VOICE.peakSmallCallsPerSecond * 60 * VOICE.uncachedPerCall, // 1,548,288
  };
  return {
    headroom,
    need,
    guaranteed,
    sumItpm, // ≈ 4.13M
    sumOtpm, // ≈ 0.20M
    guaranteedItpmShare: sumItpm / PROVIDER_LIMITS.mid.itpm, // ≈ 0.41
    guaranteedOtpmShare: sumOtpm / PROVIDER_LIMITS.mid.otpm, // ≈ 0.10
    peakItpm, // ≈ 2.82M
    peakOtpm,
    peakOtpmShare: peakOtpm / PROVIDER_LIMITS.mid.otpm, // ≈ 0.071
    peakItpmShare: peakItpm / PROVIDER_LIMITS.mid.itpm, // ≈ 0.28
    peakRpm, // ≈ 1,783
    peakRpmShare: peakRpm / PROVIDER_LIMITS.mid.rpm, // ≈ 0.14
    smallItpm,
    smallItpmShare: (smallItpm.support + smallItpm.voice) / PROVIDER_LIMITS.small.itpm, // ≈ 0.40
  };
})();

// ── Reserve, then settle ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Admission reserves: counted input split by the prefix registry into expected-cached (the bytes up to the request's
 * last cache breakpoint, seen on this provider and workspace within the TTL) and expected-uncached, plus max_tokens of
 * output. Settlement replaces it with the usage the provider reports (cumulative message_delta counts, F47), or the
 * gateway's own count when a stream ends without usage (F48).
 *
 * Held-back output in flight, support mid calls at peak: a call lasts 400 ms + 84.5 tokens × 12.5 ms = 1,456 ms, so
 * 19.8 × 1.457 = 28.8 are in flight. With max_tokens 512: 28.85 × (512 − 84.5) = 12,330 output tokens held = 8.2% of
 * support's 150,660 OTPM quota. With an unset 4,096: 28.85 × 4,011.5 = 115,700 = 77%, so the gateway caps max_tokens per
 * alias (512 for support).
 *
 * Overshoot bound for one key (labs, 20 in flight, worst request 34,048 tokens):
 *   charge after the response (no reservation; Envoy/Agent Router, Kong, Cloudflare, F23, F24, F46):
 *     ≤ in-flight × worst = 20 × 34,048 = 680,960 tokens = 2.27% of 30M;
 *     + a check that reads a store L = 20 s behind (F21's dashboard lag): 0.763 a second × 20 s × 34,048 ≈ 519,800
 *       more → ≈ 1.20M = 4.0%;
 *   reserve then settle: output ≤ max_tokens (the provider stops there), so only the input estimate can be short:
 *     ≤ in-flight × ε × prompt = 20 × 2% × 32,000 = 12,800 tokens = 0.043% (ε illustrative; counts are estimates, F50).
 * The cost of the reservation is the held-back budget above, not money.
 */
export const RESERVE = (() => {
  const supportCallMs = LATENCY.firstTokenMs + SUPPORT.outputPerCall * 12.5; // 1,456.8
  const inFlight = (SUPPORT.peakMidCallsPerSecond * supportCallMs) / 1_000; // 28.8
  const maxTokens = 512;
  const unsetMaxTokens = 4_096;
  const heldAt = (cap: number) => inFlight * (cap - SUPPORT.outputPerCall);
  const supportOtpmQuota = QUOTAS.guaranteed.support.otpm; // 150,660
  const epsilon = 0.02;
  const lagS = 20;
  const chargeAfter = LABS.maxParallel * LABS.worstTokens; // 680,960
  const lagExtra = LABS.peakCallsPerSecond * lagS * LABS.worstTokens; // ≈ 519,800
  const reserved = LABS.maxParallel * epsilon * LABS.promptCap; // 12,800
  return {
    supportCallMs,
    inFlight,
    maxTokens,
    unsetMaxTokens,
    held: heldAt(maxTokens), // ≈ 12,330
    heldShare: heldAt(maxTokens) / supportOtpmQuota, // ≈ 0.082
    heldUnset: heldAt(unsetMaxTokens), // ≈ 115,700
    heldUnsetShare: heldAt(unsetMaxTokens) / supportOtpmQuota, // ≈ 0.77
    epsilon,
    lagS,
    overshoot: {
      chargeAfter,
      chargeAfterShare: chargeAfter / LABS.budgetTokens, // 0.0227
      chargeAfterLagged: chargeAfter + lagExtra, // ≈ 1.20M
      chargeAfterLaggedShare: (chargeAfter + lagExtra) / LABS.budgetTokens, // ≈ 0.040
      reserved,
      reservedShare: reserved / LABS.budgetTokens, // 0.00043
    },
    /** The labs loop of the concept page: 45M asked for against 30M; reserve-then-settle refuses the last 15M. */
    labsAskedTokens: (TEAM_KEYS.labs.inputM + TEAM_KEYS.labs.outputM) * M,
    /**
     * The general bound: overshoot ≤ ε × the input reserved in flight, so a key's parallel cap keeps in-flight input
     * ≤ 5% of its budget (ε 2% → ≤ 0.1%, N3). Labs: 20 × 32,000 = 640,000 = 2.1% of 30M.
     * A predicted cache read that misses adds (input − read price) on those tokens and counts toward ITPM: support at
     * peak, 28.85 calls × 2,700 = 77,890 tokens over its 2.69M-a-minute bucket (2.9%) during a mass miss (a deploy),
     * and 28.85 × 2,700 × 1.90 per million ≈ 0.148 USD of its month.
     */
    labsInFlightShare: (LABS.maxParallel * LABS.promptCap) / LABS.budgetTokens, // 0.0213
    missExcessTokens: inFlight * SUP_CONTEXT.stable, // ≈ 77,890
    missExcessShare: (inFlight * SUP_CONTEXT.stable) / QUOTAS.guaranteed.support.itpm, // ≈ 0.029
    missExcessUsd: usd(inFlight * SUP_CONTEXT.stable, PRICES.mid.input - PRICES.mid.cached), // ≈ 0.148
  };
})();

// ── Gateway overhead budget (illustrative spans; dossier F5–F7, F40, F41 for scale) ─────────────────────────────────

/**
 * Spans before the request leaves for the provider, p50 and spread (p95 − p50), ms:
 *   hop app → gateway (same Region) 0.5 / 1; auth and key (in memory) 1 / 1; reserve (one Redis script) 2 / 3;
 *   regex scan 0.2 / 0.3 (F41: 0.20 ms median); NER on the new text only (≈ 200 characters, GPU + ONNX) 20 / 25
 *   (F40 measured 38 / 86 ms at 317 characters: a load test must confirm 20 / 45 on the shorter text); route and
 *   translate 1 / 1.
 *   Plain path: 0.5 + 1 + 2 + 0.2 + 1 = 4.7 ms p50; p95 = 4.7 + √(1 + 1 + 9 + 0.09 + 1) = 8.2 (stage sum 11.0).
 *   NER path: 24.7 ms p50; p95 = 24.7 + √(12.09 + 625) = 49.9 (stage sum 56.0).
 * Targets (N1): plain p50 ≤ 5, p95 ≤ 15; NER p50 ≤ 30, p95 ≤ 60. Both met at p50 and p95, both ways.
 * The tenants' sheets measure the model's first token at their own service (400 ms for support and voice), so the
 * gateway's span is part of it: the provider's share is 400 − 4.7 = 395.3 ms on the plain path.
 * Pre-scan: the support service sends each new customer message to /v1/scan while it loads the case (its 30 ms
 * stage, gcase-support LATENCY_MS.gateway); NER (20 ms p50) finishes inside it, so the router and agent calls hit the
 * scan cache and take the plain path. At p95 the scan (45 ms) can outlast the 30 ms stage: the first call waits ≤ 15 ms. Settle and the metering row are written after the
 * stream, off the user's path.
 */
export const OVERHEAD = (() => {
  const spans = [
    { id: "hop", label: "Hop to the gateway", p50: 0.5, spread: 1, ner: false },
    { id: "auth", label: "Auth and key", p50: 1, spread: 1, ner: false },
    { id: "reserve", label: "Reserve (Redis)", p50: 2, spread: 3, ner: false },
    { id: "regex", label: "Regex scan", p50: 0.2, spread: 0.3, ner: false },
    { id: "ner", label: "Name scan (NER)", p50: 20, spread: 25, ner: true },
    { id: "route", label: "Route and translate", p50: 1, spread: 1, ner: false },
  ] as const;
  const path = (withNer: boolean) => {
    const s = spans.filter((x) => withNer || !x.ner);
    const p50 = sum(s.map((x) => x.p50));
    return { p50, p95: p50 + rss(s.map((x) => x.spread)), stageSum: sum(s.map((x) => x.p50 + x.spread)) };
  };
  const plain = path(false);
  const ner = path(true);
  const targets = { plain: { p50: 5, p95: 15 }, ner: { p50: 30, p95: 60 } };
  return {
    spans,
    plain, // 4.7 / 8.2 / 11.0
    ner, // 24.7 / 49.9 / 56.0
    targets,
    meets:
      plain.p50 <= targets.plain.p50 &&
      plain.stageSum <= targets.plain.p95 &&
      ner.p50 <= targets.ner.p50 &&
      ner.stageSum <= targets.ner.p95,
    providerShareMs: LATENCY.firstTokenMs - plain.p50, // 395.3
    prescan: {
      overlapMs: SUP_LATENCY.gateway, // 30
      hiddenAtP50: 20 <= SUP_LATENCY.gateway,
      exposedAtP95Ms: Math.max(0, 20 + 25 - SUP_LATENCY.gateway), // 15
    },
    measured: { litellm4: { p50: 2, p95: 8, p99: 13 }, litellm2: { p50: 12, p95: 29, p99: 43 } }, // F5, F6
    podKneeRps: 100, // per-pod p99 47 ms at 100 RPS, 651 ms at 200 (F7)
    podDesignRps: 50, // size at half the knee
    unredactHoldChars: 20, // longest placeholder, e.g. "[PERSON_7f3a9c]" plus margin
    unredactHoldMs: 5 * 12.5, // ≤ 5 tokens held at 12.5 ms a token = 62.5 ms, only on tokens that open a placeholder
  };
})();

// ── Fallback and what it breaks ─────────────────────────────────────────────────────────────────────────────────────

/**
 * The first unlucky support request before the breaker opens: 429 at 50 ms, retry-after 1 s, retry, no first token by
 * the 2 s deadline, then provider B: 50 + 1,000 + 2,000 + 400 = 3,450 ms (production-gateway FALLBACK). The breaker
 * (production-routing BREAKER) trips at 10 failures in 20 calls and stays open 30 s; while open, calls go straight to
 * B: first token 400 + a cold-cache penalty of 150 ms (illustrative) = 550 ms. Voice does not wait: its deadline is
 * 2 × 400 = 800 ms; a 429 or 529 goes to B at once (50 + 400 + 150 = 600 ms), a silent A costs 800 + 400 + 150 = 1,350.
 *
 * Cold caches on B (caches live per organisation or workspace and on the serving machine, F28, F31, F36):
 *   counted input per support message rises from 2,495 to 8,580 = ×3.44, which is what B's limiter and any ramp limit
 *   (F14) see; cost per message, fully cold (all input at 2.00, output at 10.00): 8,580 × 2.00 + 139.5 × 10.00 per
 *   million = 0.01856 against 0.00759 warm = ×2.44 (an upper bound: B's cache warms within minutes).
 * Warm share: 5% of T0 traffic always runs on B (illustrative) so its caches, quotas and code path stay alive.
 */
export const FAILOVER = (() => {
  const coldPenaltyMs = 150;
  const voiceDeadlineMs = 2 * VOICE.firstTokenMs; // 800
  const coldCountedRatio = SUPPORT.inputPerMessage / SUPPORT.uncachedPerMessage; // 3.44
  const coldMessageUsd =
    usd(SUPPORT.inputPerMessage, PRICES.mid.input) + usd(SUPPORT.outputPerMessage, PRICES.mid.output); // 0.01856
  return {
    firstUnluckyMs: CONCEPT_FALLBACK.userFirstTokenMs, // 3,450
    breaker: { window: BREAKER.window, trips: BREAKER.failuresToTrip, openS: BREAKER.openS, probes: BREAKER.probes },
    openPathMs: LATENCY.firstTokenMs + coldPenaltyMs, // 550
    voiceDeadlineMs,
    voiceFast429Ms: 50 + VOICE.firstTokenMs + coldPenaltyMs, // 600
    voiceSilentMs: voiceDeadlineMs + VOICE.firstTokenMs + coldPenaltyMs, // 1,350
    coldPenaltyMs,
    coldCountedRatio,
    coldItpmSupport: QUOTAS.need.support.itpm * coldCountedRatio, // ≈ 6.18M counted a minute on B
    coldMessageUsd,
    coldCostRatio: coldMessageUsd / SUPPORT.agentPerMessage, // ≈ 2.44
    warmShare: 0.05,
    /** One provider alone: OpenAI's 11 Dec 2024 outage, 15:16–19:38 PST = 262 min (F38) = 0.61% of a 30-day month. */
    outageMinutes: 262,
    outageMonthShare: 262 / (30 * 24 * 60), // 0.00606 → 99.39% for that month
  };
})();

/**
 * Fallback chain per alias, with the tags a target must match. A = Anthropic API (global inference, F35); B = the same
 * models on Bedrock's EU geographic profile (F34); C = a second model family's own API; S = self-hosted pool (London).
 */
export const CHAINS = [
  {
    alias: "support-agent",
    tier: "T0",
    residency: "any",
    schema: "strict-tools",
    chain: ["A", "B"],
    last: "hand off to a person (support's own path)",
  },
  {
    alias: "voice-agent",
    tier: "T0",
    residency: "any",
    schema: "strict-tools",
    chain: ["A", "B"],
    last: "voice agent's apology and transfer",
  },
  {
    alias: "assistant-answer",
    tier: "T1",
    residency: "any",
    schema: "tools",
    chain: ["A", "B", "C"],
    last: "'answers are slower than usual' banner",
  },
  {
    alias: "ap-extract",
    tier: "T2",
    residency: "eu",
    schema: "json-schema",
    chain: ["B"],
    last: "queue and wait (never leaves the EU)",
  },
  {
    alias: "catalogue-batch",
    tier: "T2",
    residency: "any",
    schema: "none",
    chain: ["A-batch", "S"],
    last: "run the next night",
  },
  { alias: "labs", tier: "T3", residency: "any", schema: "none", chain: ["A"], last: "fail with 503" },
] as const;

// ── Prompt-cache-aware routing ──────────────────────────────────────────────────────────────────────────────────────

/**
 * What a gateway change that breaks support's prefix would cost: every cached token (6,085 a message) is paid at the
 * input price instead of the cache-read price, less the write premiums no longer paid (one tool 2,300 × 0.50, two
 * tools 2,600 × 0.50 per million):
 *   6,085 × (2.00 − 0.10) ÷ 1M − (0.35 × 2,300 + 0.15 × 2,600) × 0.50 ÷ 1M = 0.011562 − 0.000598 = 0.010964 USD a
 *   message → × 200,000 = ≈ 2,193 USD a day, more than support's whole model bill (≈ 1,801).
 * Sticky keys for providers that route by prefix hash + key with ≈ 15 requests a minute per combination (F30):
 * support's 19.8 mid calls a second = 1,188 a minute over one prefix → ⌈1,188 ÷ 15⌉ = 80 key buckets
 * (bucket = hash(conversation id) mod 80, so a conversation stays on one bucket).
 */
export const STICKY = (() => {
  const writePremium = PRICES.mid.cacheWrite - PRICES.mid.input; // 0.50
  const sh = SUP_VOLUME.shapes;
  const perMessage =
    usd(SUPPORT.cachedPerMessage, PRICES.mid.input - PRICES.mid.cached) -
    usd(
      sh.one * SUP_CONTEXT.averageChanging + sh.two * (SUP_CONTEXT.averageChanging + SUP_OUTPUT.followUpNewTokens),
      writePremium
    );
  const rpmPerKey = 15;
  const supportRpm = SUPPORT.peakMidCallsPerSecond * 60; // 1,188
  return {
    brokenPrefixPerMessage: perMessage, // ≈ 0.010964
    brokenPrefixPerDay: perMessage * SUP_VOLUME.messagesPerDay, // ≈ 2,193
    rpmPerKey,
    supportRpm,
    buckets: Math.ceil(supportRpm / rpmPerKey), // 80
    stickyIdleMinutes: 60, // OpenRouter's pattern (F32)
  };
})();

// ── Redaction policy per tenant ─────────────────────────────────────────────────────────────────────────────────────

/** Data class, what runs inline, what happens when the scanner is down. */
export const REDACTION = [
  {
    tenant: "Support agent",
    data: "customer PII",
    inline: "regex + NER on new text",
    cards: "block",
    onScannerDown: "regex only, alert (DPA covers names)",
  },
  {
    tenant: "Voice agent",
    data: "customer PII (spoken)",
    inline: "regex only",
    cards: "block",
    onScannerDown: "n/a; NER runs later on the log copy",
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
    data: "supplier and bank details",
    inline: "none (EU route + DPA)",
    cards: "n/a (images)",
    onScannerDown: "n/a",
  },
  { tenant: "Catalogue", data: "public product text", inline: "none", cards: "block", onScannerDown: "n/a" },
  {
    tenant: "Labs",
    data: "no customer data allowed",
    inline: "regex + NER, block on any hit",
    cards: "block",
    onScannerDown: "fail closed",
  },
] as const;

/** Redaction gate sizes and margins (95%, normal approximation). */
export const REDACTION_EVAL = (() => {
  const structured = { n: 1_000, target: 0.99 };
  const names = { n: 800, target: 0.95 };
  const margin = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  return {
    structured: { ...structured, margin: margin(structured.target, structured.n) }, // ± 0.0062
    names: { ...names, margin: margin(names.target, names.n) }, // ± 0.0151
    nerRefMs: { charsTested: 317, gpuOnnx: { avg: 38.11, p95: 86.47, p99: 99.26 }, cpu: { avg: 177.13, p95: 294.57 } }, // F40
    regexMedianMs: 0.2, // F41
    presidioMedianMs: 37.59, // F41
  };
})();

// ── Capacity, cells and platform cost ───────────────────────────────────────────────────────────────────────────────

/**
 * Two cells (T0: support and voice; T1–T3: the rest), each active-active in London and Ireland; each Region sized to
 * carry its cell alone at 1.5 × peak. T0: 66.84 × 1.5 = 100.3 RPS ÷ 50 a pod → 3 pods + 1 spare = 4 a Region. T1–T3:
 * 3.9 × 1.5 = 5.8 RPS → 1 pod + 1 spare = 2 a Region. 12 pods in all.
 * Counter store: one Redis per cell per Region (4), 2 calls a request (reserve, settle) + 1 per 10 s of stream ≈ 150
 * operations a second at peak.
 * Metering: ≈ 1.04M rows a day × 1 KB ≈ 1.04 GB a day; 400 days ≈ 417 GB raw (columnar compression shrinks it).
 * Platform cost a month (illustrative): pods 12 × 0.20 × 720 = 1,728; Redis 4 × 150 = 600; NER GPUs 2 × 2.50 × 720 =
 * 3,600; metering store 900 → 6,828; team 2 engineers × 400,000 ÷ 12 = 66,667 → ≈ 73,500 a month, about the model
 * spend it carries (≈ 73,000): ≈ 0.0023 USD a call.
 */
export const CAPACITY = (() => {
  const designRps = OVERHEAD.podDesignRps;
  const podsFor = (peak: number) => Math.ceil((peak * 1.5) / designRps) + 1;
  const t0PerRegion = podsFor(TRAFFIC_GW.t0Peak); // 4
  const otherPerRegion = podsFor(TRAFFIC_GW.otherPeak); // 2
  const regions = 2;
  const pods = regions * (t0PerRegion + otherPerRegion); // 12
  const infra = {
    pods: pods * 0.2 * 720,
    redis: 4 * 150,
    nerGpus: 2 * PRICES.gpuHour * 720,
    metering: 900,
  };
  const infraMonthly = sum(Object.values(infra)); // 6,828
  const teamMonthly = (2 * 400_000) / 12; // 66,667
  const platformMonthly = infraMonthly + teamMonthly;
  return {
    t0PerRegion,
    otherPerRegion,
    regions,
    pods,
    redisOpsPerSecond: TRAFFIC_GW.peakPerSecond * 2 + 10, // ≈ 150 (streams add ≈ 10)
    meteringGbPerDay: TRAFFIC_GW.callsPerDay / 1_000_000, // ≈ 1.04
    meteringGb400Days: (TRAFFIC_GW.callsPerDay * 400) / 1_000_000, // ≈ 417
    infra,
    infraMonthly,
    teamMonthly,
    platformMonthly, // ≈ 73,500
    perCallUsd: platformMonthly / (TRAFFIC_GW.callsPerDay * 30), // ≈ 0.0023
    modelPerCallUsd: TRAFFIC_GW.spend / TRAFFIC_GW.callsPerDay, // ≈ 0.0023
  };
})();

/** Fail open or closed, per dependency and tier (sheet §15.5). */
export const FAILURE_POLICY = [
  {
    dependency: "Counter store (Redis)",
    t0: "open: local counters at limit ÷ replicas, ≤ 15 min, alert",
    other: "closed: 503",
  },
  { dependency: "Budget ledger", t0: "open ≤ 15 min, then closed", other: "closed" },
  { dependency: "NER scanner", t0: "support: regex only + alert; voice: n/a", other: "labs: closed" },
  { dependency: "Config store", t0: "serve last-known-good, never fail", other: "serve last-known-good" },
  { dependency: "Metering write", t0: "open: spool to local disk, replay", other: "open: spool" },
  { dependency: "Provider A", t0: "fall back to B", other: "assistant to B then C; labs closed" },
] as const;

// ── Evaluation and release gates ────────────────────────────────────────────────────────────────────────────────────

/** Gates for a gateway release or an alias change. Values illustrative; the release-gate figure fails one. */
export const GATES = [
  { id: "overhead", label: "Overhead p95 at 2 × peak a pod", target: "≤ 15 ms plain, ≤ 60 ms NER" },
  { id: "bytes", label: "Prompt bytes unchanged (golden requests)", target: "0 diffs" },
  { id: "cache", label: "Cache-read share on replay vs direct", target: "≥ direct − 1 point" },
  { id: "budget", label: "Overshoot, 1,000 parallel on a 1M budget", target: "≤ 0.1%" },
  { id: "redaction", label: "Redaction recall (structured / names)", target: "≥ 99% / ≥ 95%" },
  { id: "fallback", label: "Fallback target on the tenant's gold set", target: "not lower (paired)" },
  { id: "chaos", label: "Provider A killed for 5 min", target: "T0 errors ≤ 1%" },
  { id: "reconcile", label: "Metered vs invoiced, daily", target: "gap ≤ 1%" },
] as const;

/** Quality canaries per provider: a fixed set every 10 minutes (illustrative), against F37-type silent degradation. */
export const CANARIES = { prompts: 50, everyMinutes: 10, perDay: 50 * 6 * 24 } as const; // 7,200 a day per provider

/** Audit and retention (sheet §14). */
export const AUDIT = {
  rowBytes: 1_000,
  metadataDays: 400,
  bodiesDefault: "not stored",
  bodiesOptInDays: 30,
  placeholderMap: "in memory for the request only",
} as const;

/**
 * Self-hosted pool S (illustrative): 2 GPUs in London running an open-weights 8B-class model on vLLM with prefix
 * caching, behind an endpoint picker that scores replicas by cached prefix and queue depth (dossier F33). Used by labs
 * and as the catalogue job's second target. 2 × 2.50 × 720 = 3,600 USD a month, charged to the teams that use it.
 */
export const SELF_HOSTED = { gpus: 2, monthlyUsd: 2 * PRICES.gpuHour * 720, region: "London" } as const;

/**
 * The walk-through call (sheet §9): the support agent's first call on the kettle message at 11:00 on sale day.
 *   Reserve: 2,700 expected cached × 0.10 + 2,300 uncached × 2.00 + 512 max_tokens × 10.00 per million
 *          = 0.00027 + 0.0046 + 0.00512 = 0.00999 USD; tokens: 2,300 ITPM, 512 OTPM.
 *   Settle (a 30-token tool call): 0.00027 + 0.0046 + 0.0003 = 0.00517 USD; refund 0.00482 USD and 482 OTPM.
 *   Pre-scanned during the 30 ms case load, so it takes the plain path: leaves for A at 4.7 ms; first token at 400 ms
 *   as the support service measures it (the provider's share 395.3 ms).
 */
export const WALKTHROUGH = (() => {
  const cached = SUP_CONTEXT.stable; // 2,700
  const uncached = SUP_CONTEXT.averageChanging; // 2,300
  const maxTokens = RESERVE.maxTokens; // 512
  const out = SUP_OUTPUT.toolCall; // 30
  const base = usd(cached, PRICES.mid.cached) + usd(uncached, PRICES.mid.input);
  const reserved = base + usd(maxTokens, PRICES.mid.output);
  const settled = base + usd(out, PRICES.mid.output);
  return {
    cached,
    uncached,
    maxTokens,
    out,
    reserved, // 0.00999
    settled, // 0.00517
    refund: reserved - settled, // 0.00482
    refundOtpm: maxTokens - out, // 482
    leavesAtMs: OVERHEAD.plain.p50, // 4.7 (the message was pre-scanned during the case load)
    firstTokenMs: LATENCY.firstTokenMs, // 400 as the support service sees it; the provider's share 395.3
  };
})();
