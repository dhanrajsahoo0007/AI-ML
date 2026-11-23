// Constants for the Rate Limiting & Throttling page (rate-limiting-throttling). Page-only; the shared running example
// lives in presets/production.ts and the per-minute numbers of the support key in presets/production-gateway.ts.

import { PROMPT } from "./rag";
import { LATENCY, TOKENS } from "./production";
import { SUPPORT_TPM } from "./production-gateway";

/**
 * The support key's two per-minute limits (illustrative; set by Brightpost's gateway, not a provider's figures).
 *   Requests: 1,000 a minute. A normal peak minute is 12 requests/s × 60 = 720 (72 %).
 *   Tokens: 2,000,000 a minute, input and output together (SUPPORT_TPM.limit). A normal peak minute is
 *   720 × 2,200 = 1,584,000 in + 720 × 250 = 180,000 out = 1,764,000 (88 %).
 */
export const KEY_LIMIT = {
  requestsPerMinute: 1_000,
  tokensPerMinute: SUPPORT_TPM.limit,
} as const;

/** A normal peak minute on the support key, from SUPPORT_TPM. */
export const NORMAL_MINUTE = {
  requests: SUPPORT_TPM.requestsPerMinute,
  inputTokens: SUPPORT_TPM.inputPerMinute,
  outputTokens: SUPPORT_TPM.outputPerMinute,
} as const;

/**
 * Five long prompts arrive in the same minute (illustrative): a customer pastes a long order history into the chat, five
 * times. Each is 150,000 tokens in and, as for any answer, 250 tokens out.
 *   5 × (150,000 + 250) = 751,250 tokens; requests 720 + 5 = 725 (72.5 %, up 0.7 %);
 *   tokens 1,764,000 + 751,250 = 2,515,250 (126 % of the limit, 515,250 over).
 * With a gateway cap of 32,000 tokens per prompt the five are 5 × (32,000 + 250) = 161,250 tokens; the minute is
 * 1,764,000 + 161,250 = 1,925,250 tokens (96 %), still under.
 */
export const LONG_PROMPTS = {
  count: 5,
  tokens: 150_000,
  cappedTokens: 32_000,
  outputTokens: TOKENS.outputPerRequest,
} as const;

export const longMinuteTokens = (promptTokens: number) =>
  LONG_PROMPTS.count * (promptTokens + LONG_PROMPTS.outputTokens);

/**
 * The shed order (illustrative). Per request now: 200 instructions + 5 chunks × 400 + 15 question = 2,215 input
 * (written 2,200) + 250 output = 2,450 tokens.
 *   Drop optional retrieval: keep 2 chunks, 200 + 2 × 400 + 15 = 1,015 input; 1,015 + 250 = 1,265 tokens a request,
 *     down 48 % (1 − 1,265 ÷ 2,450 = 0.484 using the rounded 2,200).
 *   Shorten answers: cap output at 150 tokens, 1,015 + 150 = 1,165 tokens; each answer saves 100 tokens × 4.4 ms of
 *     decode = 440 ms of GPU time.
 *   At 720 requests a minute: 720 × 1,165 = 838,800 tokens a minute, against 1,764,000 before (48 %).
 */
export const SHED = {
  keptChunks: 2,
  chunkTokens: 400,
  inputKept: PROMPT.instructionTokens + 2 * 400 + PROMPT.questionTokens, // 1,015
  outputCap: 150,
  perRequestBefore: TOKENS.inputPerRequest + TOKENS.outputPerRequest, // 2,450
  perRequestAfterRetrieval: PROMPT.instructionTokens + 2 * 400 + PROMPT.questionTokens + TOKENS.outputPerRequest, // 1,265
  perRequestAfterCap: PROMPT.instructionTokens + 2 * 400 + PROMPT.questionTokens + 150, // 1,165
  decodeMsSavedPerAnswer: Math.round((TOKENS.outputPerRequest - 150) * LATENCY.decodeMsPerToken), // 440
} as const;
