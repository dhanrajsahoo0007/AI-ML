// Constants and arithmetic for the LLM Gateway page only (serving/gateway-*). Imports the running example from
// presets/production.ts so every shared Brightpost number (traffic, tokens per request, latency targets) is the shared
// one. Everything defined here that is not derived from those constants is ILLUSTRATIVE: Brightpost's other teams,
// their budgets, the per-span gateway timings and the fallback timings are round numbers chosen to teach, not
// measurements of any product.
//
// Product facts the page relies on (checked November 2026, cited on the page under Further reading):
//   LiteLLM proxy: virtual keys and teams carry max_budget (US dollars), budget_duration, tpm_limit and rpm_limit;
//     a key's tpm_limit or rpm_limit returns 429 when exceeded; fallbacks run after num_retries on the same model
//     group; a deployment goes into cooldown after allowed_fails failures (example values 3 and 30 s in the docs).
//     Published overhead benchmark: p50 2 ms, p95 8 ms, p99 13 ms at 1,170 requests/s on 4 instances against a mock
//     provider with Postgres and Redis disabled.
//   Portkey: retry {attempts, on_status_codes} with up to 5 attempts and exponential waits of 1, 2, 4, 8, 16 s;
//     strategy {mode: "fallback", on_status_codes}; request_timeout in milliseconds, a timed-out call returns 408.
//   Anthropic Messages API: limits in RPM, input tokens per minute and output tokens per minute; a 429 may carry
//     retry-after (seconds); the monthly spend-cap 429 never does, and retrying it fails until access resumes.

import { LATENCY, TOKENS, TRAFFIC, n } from "./production";

const M = 1_000_000;

/** Tokens one Brightpost answer uses: 2,200 in + 250 out = 2,450. */
export const TOKENS_PER_REQUEST = TOKENS.inputPerRequest + TOKENS.outputPerRequest;

/** One team's key on the gateway: what it used in a day and its daily budget, in millions of tokens. */
export interface TeamKey {
  key: string;
  app: string;
  /** Millions of input and output tokens the team sent (or tried to send) in one day. */
  inputM: number;
  outputM: number;
  /** Daily budget, millions of tokens. */
  budgetM: number;
}

/**
 * Three teams share Brightpost's gateway, each on its own key with a daily token budget.
 *   Support assistant: 200,000 requests × 2,200 = 440 M in; × 250 = 50 M out; 490 M of a 600 M budget (82 %).
 *   Catalogue writer (illustrative): 20,000 product descriptions a night × 800 tokens in = 16 M; × 400 out = 8 M;
 *     24 M of a 40 M budget (60 %).
 *   Labs (illustrative): a test script stuck in a loop asks for 40 M in + 5 M out = 45 M against a 30 M budget; the
 *     gateway refuses everything past 30 M, so 15 M tokens (a third of what it asked for) never reach a provider.
 */
export const TEAM_KEYS = {
  support: {
    key: "team-support",
    app: "Support assistant",
    inputM: TOKENS.inputPerDay / M,
    outputM: TOKENS.outputPerDay / M,
    budgetM: 600,
  },
  catalogue: { key: "team-catalogue", app: "Catalogue writer", inputM: 16, outputM: 8, budgetM: 40 },
  labs: { key: "team-labs", app: "Labs prototypes", inputM: 40, outputM: 5, budgetM: 30 },
} as const satisfies Record<string, TeamKey>;

/** Millions of tokens a team used or asked for in the day. */
export const usedM = (t: TeamKey) => t.inputM + t.outputM;

/**
 * The per-minute limit on the support key at peak.
 *   12 requests/s × 60 s = 720 requests a minute; × 2,450 tokens = 1,764,000 tokens a minute.
 *   Limit 2,000,000 tokens a minute (illustrative), so peak uses 88 % of it; 2,000,000 ÷ 1,764,000 = 1.13, so a surge
 *   of more than about 13 % over the peak starts drawing 429s.
 */
export const SUPPORT_TPM = {
  requestsPerMinute: TRAFFIC.peakPerSecond * 60,
  /** 720 × 2,200 = 1,584,000 input tokens a minute. */
  inputPerMinute: TRAFFIC.peakPerSecond * 60 * TOKENS.inputPerRequest,
  /** 720 × 250 = 180,000 output tokens a minute. */
  outputPerMinute: TRAFFIC.peakPerSecond * 60 * TOKENS.outputPerRequest,
  tokensPerMinute: TRAFFIC.peakPerSecond * 60 * TOKENS_PER_REQUEST,
  limit: 2_000_000,
} as const;

/**
 * One request that falls back (illustrative timings, the shared 400 ms first token).
 *   Provider A answers 429 with retry-after: 1 s after 50 ms.
 *   The gateway waits the 1 s and retries once; A accepts but sends no first token within the 2 s timeout.
 *   The gateway sends the same request to provider B, whose first token arrives 400 ms later.
 *   First token for the user: 50 + 1,000 + 2,000 + 400 = 3,450 ms, against 400 ms on a normal day.
 *   Provider A is then left alone for 30 s (a cooldown), so the next requests go straight to B.
 */
export const FALLBACK = (() => {
  const first429Ms = 50;
  const retryAfterMs = 1_000;
  const firstTokenTimeoutMs = 2_000;
  const fallbackFirstTokenMs = LATENCY.firstTokenMs;
  const retryAtMs = first429Ms + retryAfterMs;
  const fallbackAtMs = retryAtMs + firstTokenTimeoutMs;
  return {
    first429Ms,
    retryAfterMs,
    firstTokenTimeoutMs,
    retryAtMs,
    fallbackAtMs,
    userFirstTokenMs: fallbackAtMs + fallbackFirstTokenMs,
    normalFirstTokenMs: LATENCY.firstTokenMs,
    cooldownS: 30,
  } as const;
})();

/** Seconds with two decimals at most, as the figures print them: 1050 → "1.05 s". */
export const sec = (ms: number) => `${Number((ms / 1000).toFixed(2))} s`;

/**
 * What the gateway adds to one Brightpost request on a cache miss (illustrative timings).
 *   Key and limits: 3 ms (key lookup in memory, one counter read in a shared store).
 *   Cache lookup: 3 ms (an exact-match hash lookup; a miss).
 *   Input guardrail: 20 ms (a PII and policy classifier on the prompt).
 *   → the request leaves for the provider at 3 + 3 + 20 = 26 ms.
 *   Provider call: 1,500 ms for the full answer, first token after 400 ms (LATENCY).
 *   Output guardrail: 10 ms on the final chunk (earlier chunks are checked while they stream).
 *   Log and spend: 5 ms, written after the reply, off the user's path.
 *   First token: 26 + 400 = 426 ms (the gateway adds 26 ms, 26 ÷ 426 = 6 %).
 *   Reply done: 26 + 1,500 + 10 = 1,536 ms (the gateway adds 36 ms, 36 ÷ 1,536 = 2.3 %).
 */
export const OVERHEAD = (() => {
  const keyMs = 3;
  const cacheMs = 3;
  const inputGuardMs = 20;
  const outputGuardMs = 10;
  const logMs = 5;
  const sendAtMs = keyMs + cacheMs + inputGuardMs;
  const providerMs = LATENCY.fullAnswerMs;
  const firstTokenMs = sendAtMs + LATENCY.firstTokenMs;
  const doneMs = sendAtMs + providerMs + outputGuardMs;
  const addedMs = sendAtMs + outputGuardMs;
  return {
    keyMs,
    cacheMs,
    inputGuardMs,
    outputGuardMs,
    logMs,
    sendAtMs,
    providerMs,
    firstTokenMs,
    doneMs,
    addedMs,
    firstTokenShare: sendAtMs / firstTokenMs,
    doneShare: addedMs / doneMs,
  } as const;
})();

/** "490 M" style label for millions of tokens. */
export const mLabel = (millions: number) => `${n(millions)} M`;
