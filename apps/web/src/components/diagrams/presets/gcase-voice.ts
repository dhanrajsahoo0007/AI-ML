// Constants and arithmetic for the "Design a Voice Agent for a Call Centre" case study (/genai-system-design/
// case-studies/voice-agent-call-centre; design sheet SYSTEM-DESIGN/plans/genai-design/design/voice-agent-call-centre.md).
// Specs in assets/diagrams/animated/voice-agent/ import from here. The model's first token comes from
// presets/production.ts and the concept page's budget from presets/production-speech.ts, so the two pages cannot drift.
//
// Prices as of November 2026 (dossier, read 17 November 2026): mid-size model (Claude Sonnet 5.5 class) 2.00 / 0.10
// cached / 10.00 USD per million tokens; small (Claude Haiku 5.5 class) 0.10 / 0.01 / 0.50; Deepgram Nova-3 streaming
// 0.0048 USD a minute (promo); ElevenLabs Flash 0.04 USD per 1,000 characters; gpt-realtime-2 audio 32 in, 0.40 cached,
// 64 out per million. Everything else is ILLUSTRATIVE unless a comment names a source.

import { LATENCY } from "./production";
import { VOICE_BUDGET } from "./production-speech";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;

/** Calls and concurrency (illustrative volumes). */
export const CALLS = (() => {
  const perDay = 8_000;
  const minutesPerCall = 4;
  const busyHourShare = 0.12;
  const busyHourCalls = perDay * busyHourShare; // 960
  const busyConcurrent = (busyHourCalls * minutesPerCall) / 60; // 64
  const salesDayMultiple = 3;
  return {
    perDay,
    minutesPerCall,
    minutesPerDay: perDay * minutesPerCall, // 32,000
    busyHourCalls,
    busyConcurrent,
    busyP999: Math.round(busyConcurrent + 3.1 * Math.sqrt(busyConcurrent)), // 64 + 3.1 × 8 ≈ 89
    salesDayConcurrent: busyConcurrent * salesDayMultiple, // 192 ≈ 200
    sizedFor: 250,
  };
})();

/** Turns and model calls per minute. */
export const TURNS = (() => {
  const perMinute = 4; // one caller turn every 15 s
  const replyTokens = 25; // 50% talk share at 150 words a minute ≈ 19 words
  const callsPerTurn = 1.2 + 0.6; // tools + preemptive generation (50–70% more, Deepgram Flux 2025)
  return {
    perMinute,
    replyTokens,
    callsPerTurn,
    callsPerMinute: perMinute * callsPerTurn, // 7.2
    mix: { noTool: 0.75, tool: 0.15, help: 0.1 },
  };
})();

/** Context window of one model call (node `damaged_item`, turn 9). */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions and voice style", tokens: 1_000, stable: true },
    { id: "node", label: "Node prompt", tokens: 400, stable: true },
    { id: "tools", label: "Node tools", tokens: 600, stable: true },
    { id: "case", label: "Case state", tokens: 300, stable: false },
    { id: "turns", label: "Recent turns, as heard", tokens: 800, stable: false },
    { id: "tool-results", label: "Tool results", tokens: 300, stable: false },
    { id: "evidence", label: "Evidence", tokens: 170, stable: false },
    { id: "caller", label: "Caller's turn", tokens: 30, stable: false },
  ] as const;
  const total = blocks.reduce((s, b) => s + b.tokens, 0); // 3,600
  const stable = blocks.filter((b) => b.stable).reduce((s, b) => s + b.tokens, 0); // 2,000
  return { blocks, total, stable, changing: total - stable };
})();

/** Cost of one call minute, in USD. */
export const COST = (() => {
  const call = (input: number, cached: number, output: number) =>
    usd(CONTEXT.stable, cached) + usd(CONTEXT.changing, input) + usd(TURNS.replyTokens, output);
  const mid = call(2.0, 0.1, 10.0); // 0.00365
  const small = call(0.1, 0.01, 0.5); // 0.00019
  const blended = 0.7 * small + 0.3 * mid; // 0.00123
  const agentModel = TURNS.callsPerMinute * blended; // 0.0089
  const otherModel = 4 * 0.0001 + 4 * 0.0003 + (0.5 * 0.006) / 4; // detector + judge + briefing = 0.0024
  const recognition = 0.0048;
  const speechChars = 0.5 * 150 * 6; // 450 characters of agent speech a minute
  const synthesis = (speechChars * 0.04) / 1_000; // 0.018
  const telephony = 0.007 + 0.002; // carrier and SIP + media and CPU models, illustrative
  const speculativeSynthesis = 0.6 * 0.4 * synthesis; // first clause of wasted speculative turns: 0.004
  const hedges = 0.1 * 0.3 * TURNS.callsPerMinute * mid; // 0.0008
  const perMinute = agentModel + otherModel + recognition + synthesis + telephony + speculativeSynthesis + hedges; // ≈ 0.048
  // Speech-to-speech: caller audio 1 token per 100 ms, agent audio 1 per 50 ms (OpenAI realtime costs guide).
  const s2sBase = usd(600, 32) + usd(0.5 * 1_200, 64) + telephony; // 0.0192 + 0.0384 + 0.009 = 0.067
  const rebilledPerMinute = (300 * (15 * 16)) / 2 / CALLS.minutesPerCall; // 36,000 a call ÷ 4 = 9,000
  return {
    mid,
    small,
    blended,
    agentModel,
    allMidModel: TURNS.callsPerMinute * mid, // 0.026
    smallSplitSaving: 1 - agentModel / (TURNS.callsPerMinute * mid), // ≈ 66%
    otherModel,
    recognition,
    synthesis,
    telephony,
    speculativeSynthesis,
    hedges,
    perMinute,
    perCall: perMinute * CALLS.minutesPerCall, // ≈ 0.19
    perDay: perMinute * CALLS.minutesPerDay, // ≈ 1,540
    s2sBase,
    s2sCachedRebill: usd(rebilledPerMinute, 0.4), // 0.0036
    s2sUncachedRebill: usd(rebilledPerMinute, 32) + usd((2_000 * 16) / CALLS.minutesPerCall, 4), // 0.288 + 0.032
  };
})();

/**
 * One turn, in ms, at p50, from the end of the caller's speech to audio at the caller's ear. Recognition commit 150–300
 * ms in sources (≈ 150 ms ElevenLabs Scribe v2 Realtime; "under 300 ms" Nova-3); design point 200 (illustrative).
 *   sequential:  100 + 300 wait + 400 + 100 + 200 + 100                         = 1,200
 *   preemptive:  100 + max(300, 200 + 400 + 100 + 200) + 100                    = 1,100
 *   tool turn:   filler at 100 + 200 + 400 + 50 clip + 100 ≈ 850; reply 2,100
 */
export const BUDGET = (() => {
  const leg = 100;
  const wait = 300;
  const backstop = 600;
  const commit = 200;
  const firstToken = LATENCY.firstTokenMs; // 400
  const msPerToken = 10; // 100 tokens a second (Voice AI primer, 2026)
  const clause = 10 * msPerToken; // 100
  const synthesis = 200; // first audible sound, measured 197–198 ms for ElevenLabs Flash (Vapi, Coval 2026)
  const toolCall = 30 * msPerToken; // 300
  const tool = 300;
  const clipStart = 50;
  const retrieval = 210;
  const sequential = leg + wait + firstToken + clause + synthesis + leg;
  const speak = commit + firstToken + clause + synthesis; // 900: work after speech ends
  const preemptive = leg + Math.max(wait, speak) + leg;
  const fillerHeard = leg + commit + firstToken + clipStart + leg; // 850
  const toolReply = leg + commit + firstToken + toolCall + tool + firstToken + clause + synthesis + leg; // 2,100
  const helpReply = preemptive + retrieval; // 1,310
  const freeWait = speak; // any wait up to this after speech ends costs no latency
  // p95 from stage spreads (illustrative p95 − p50), assuming independent stages; phone legs together (one route).
  const noToolSpread = Math.sqrt(200 ** 2 + 100 ** 2 + 250 ** 2 + 50 ** 2 + 200 ** 2); // ≈ 394
  const p95NoTool = preemptive + noToolSpread; // ≈ 1,494
  const p95Tool = toolReply + Math.sqrt(noToolSpread ** 2 + 300 ** 2 + 250 ** 2); // ≈ 2,655
  const p95Help = helpReply + Math.sqrt(noToolSpread ** 2 + 100 ** 2); // ≈ 1,716
  const bargeInStop = 216 + 30 + 20 + leg; // ≈ 370 (LiveKit adaptive interruption, 2026: median 216 ms of audio)
  return {
    leg,
    wait,
    backstop,
    commit,
    firstToken,
    clause,
    synthesis,
    toolCall,
    tool,
    retrieval,
    sequential,
    preemptive,
    fillerHeard,
    toolReply,
    helpReply,
    freeWait,
    p95NoTool,
    p95Tool,
    p95Help,
    bargeInStop,
    conceptPage: VOICE_BUDGET.total, // 1,000 on the concept page
  };
})();

/** End-of-turn benchmark points (LiveKit eot-bench, June 2026, vendor): false cut-off rate at a wait budget. */
export const TURN_DETECTORS = [
  {
    name: "Audio turn model (LiveKit v1)",
    points: [
      { waitMs: 300, cutoffs: 0.099 },
      { waitMs: 600, cutoffs: 0.045 },
    ],
  },
  {
    name: "Fused recogniser (Deepgram Flux)",
    points: [
      { waitMs: 300, cutoffs: 0.129 },
      { waitMs: 600, cutoffs: 0.099 },
    ],
  },
] as const;

/** Storage and capacity. */
export const CAPACITY = (() => {
  const callsPerWorker = 25;
  const recordingKBPerMinute = (2 * 16 * 60) / 8; // two channels of Opus at 16 kbit/s = 240 KB
  return {
    workers: Math.ceil((CALLS.sizedFor / callsPerWorker) * 1.5), // 15
    peakModelCallsPerSecond: (CALLS.sizedFor * TURNS.callsPerMinute) / 60, // 30
    peakInputTokensPerMinute: ((CALLS.sizedFor * TURNS.callsPerMinute) / 60) * CONTEXT.total * 60, // ≈ 6.5 M
    recordingKBPerMinute,
    recordingGBPerDay: (recordingKBPerMinute * CALLS.minutesPerDay) / 1_000_000, // ≈ 7.7
    handoffsPerDay: CALLS.perDay * 0.5, // 4,000
    busyHourErlangs: (CALLS.busyHourCalls * 0.5 * 6) / 60, // 480 × 6 ÷ 60 = 48
  };
})();
