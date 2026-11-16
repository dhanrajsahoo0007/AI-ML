// Constants and arithmetic for the Streaming & Time to First Token page (serving/stream-*.ts specs and the page's
// worked example). Every Brightpost number comes from presets/production.ts; this file only derives from it.
//
// Definitions (vLLM metrics design doc, checked November 2026; DistServe, Zhong et al., OSDI 2024):
//   time to first token (TTFT): from arrival to the first output token;
//   time per output token (TPOT): (end-to-end latency − TTFT) ÷ (output tokens − 1), one value per request;
//   inter-token latency (ITL): the gap between two consecutive streamed outputs, one sample per output event.
//
// Hold-back window, abandonment rate and the cancel time are ILLUSTRATIVE choices for the worked example.

import { LATENCY, TOKENS, TRAFFIC } from "./production";

/**
 * Brightpost's TPOT. Working: (1,500 − 400) ms ÷ (250 − 1) tokens = 1,100 ÷ 249 = 4.42 ms, written "4.4 ms" (the same
 * value as LATENCY.decodeMsPerToken, which divides by 250).
 */
export const TPOT_MS =
  Math.round(((LATENCY.fullAnswerMs - LATENCY.firstTokenMs) / (TOKENS.outputPerRequest - 1)) * 10) / 10;

/**
 * The output guardrail's hold-back window: text reaches the screen only once the 30 tokens after it have been
 * generated and checked (about one sentence; illustrative). Working: first visible text at 400 + 30 × 4.4 = 532 ms.
 */
export const HOLD_BACK = {
  tokens: 30,
  delayMs: Math.round(30 * LATENCY.decodeMsPerToken),
  firstTextMs: LATENCY.firstTokenMs + Math.round(30 * LATENCY.decodeMsPerToken),
} as const;

/**
 * The customer who leaves mid-answer (worked example; illustrative). The tab closes at 620 ms.
 *   Tokens already generated: (620 − 400) ÷ 4.4 = 50.
 *   Tokens still to come: 250 − 50 = 200, which take 200 × 4.4 = 880 ms of a batch slot if nobody stops them.
 *   If 5 % of answers are abandoned (illustrative): 200,000 × 0.05 = 10,000 a day × 200 = 2,000,000 tokens a day
 *   generated for nobody.
 */
const closedAtMs = 620;
const sentTokens = Math.round((closedAtMs - LATENCY.firstTokenMs) / LATENCY.decodeMsPerToken);
const leftTokens = TOKENS.outputPerRequest - sentTokens;
const abandonedPerDay = TRAFFIC.requestsPerDay * 0.05;
export const CANCEL = {
  closedAtMs,
  sentTokens,
  leftTokens,
  wastedMs: Math.round(leftTokens * LATENCY.decodeMsPerToken),
  abandonRate: 0.05,
  abandonedPerDay,
  wastedTokensPerDay: abandonedPerDay * leftTokens,
} as const;
