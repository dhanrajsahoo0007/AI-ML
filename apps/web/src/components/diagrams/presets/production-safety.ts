// Helpers and constants for the Wave 6 safety pages that share this module: responsible-ai-and-alignment,
// guardrails-output-validation, hallucination-safety-detection. Brightpost's numbers come from presets/production.ts.

import { LATENCY, PROD_TONE, REFUND_CASE } from "./production";
import type { LayoutShape, LayoutTone } from "../types";

// ── Small shape helpers ─────────────────────────────────────────────────────────────────────────────────────────────

/** An annotation, 12.5 px, sized to its text (lint does not measure text shapes). */
export function note(
  id: string,
  x: number,
  y: number,
  label: string,
  step = 1,
  tone: LayoutTone = PROD_TONE.infra,
  w?: number
): LayoutShape {
  return { id, type: "text", x, y, w: w ?? Math.round(label.length * 6.8) + 10, h: 20, label, tone, step, quiet: true };
}

/** A pastel block with ink text. */
export function blk(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step = 1,
  highlight?: boolean
): LayoutShape {
  return { id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, highlight: highlight || undefined };
}

/** A neutral arrow between two shapes. */
export function arr(
  id: string,
  from: string,
  to: string,
  step = 1,
  label?: string,
  extra: Partial<LayoutShape> = {}
): LayoutShape {
  return { id, type: "arrow", x: 0, y: 0, from, to, label, tone: PROD_TONE.infra, step, ...extra };
}

// ── Hallucination detection: the claim check (halluc-claim-check) ───────────────────────────────────────────────────

/**
 * One Brightpost answer split into five claims, each checked against the retrieved passages. The passage texts are
 * ILLUSTRATIVE help-centre sentences. Faithfulness (RAGAS definition) = supported claims ÷ total claims:
 *   claims 1 to 3 are supported by passages 1 to 3; claim 4 ("within 2 days") has no passage; claim 5 ("refund £42
 *   with no approval") is contradicted by the passage "Refunds over £30 need approval".
 *   Supported = 3, total = 5, faithfulness = 3 ÷ 5 = 0.60.
 */
export const CLAIMS = [
  {
    text: "Returns accepted within 30 days",
    verdict: "supported",
    passage: "Returns accepted within 30 days of delivery",
  },
  {
    text: "Return postage is free for faulty items",
    verdict: "supported",
    passage: "Faulty items: return postage is free",
  },
  {
    text: "Refunds go to the original card",
    verdict: "supported",
    passage: "Refunds go to the original payment method",
  },
  { text: "Refunds arrive within 2 days", verdict: "unsupported", passage: "" },
  {
    text: `Cracked kettle: refund £${REFUND_CASE.price}, no approval`,
    verdict: "contradicted",
    passage: `Refunds over £${REFUND_CASE.approvalLimit} need approval`,
  },
] as const;
export const CLAIM_STATS = {
  total: CLAIMS.length,
  supported: CLAIMS.filter((c) => c.verdict === "supported").length,
  score: CLAIMS.filter((c) => c.verdict === "supported").length / CLAIMS.length,
} as const;

/**
 * Self-consistency (SelfCheckGPT) cost, ILLUSTRATIVE choice of 4 extra samples: the answer is 250 tokens
 * (TOKENS.outputPerRequest), so 1 answer + 4 samples = 5 × 250 = 1,250 output tokens, five times the output of one.
 */
export const SELF_CHECK = { extraSamples: 4, outputTokens: 250, totalTokens: 250 * (1 + 4), multiple: 1 + 4 } as const;

// ── Output validation: streaming hold-back window (outval-streaming) and retries (outval-repair-loop) ──────────────────

/**
 * Hold-back window. Decode speed is LATENCY.decodeMsPerToken = 4.4 ms per token. A check that takes 50 ms
 * (ILLUSTRATIVE, a small classifier) needs ceil(50 ÷ 4.4) = ceil(11.4) = 12 tokens held back, so the text it must
 * judge has not yet reached the customer. Delay added to the last shown token: 12 × 4.4 = 52.8 ms, about 53 ms.
 */
export const HOLD_BACK = {
  checkMs: 50,
  msPerToken: LATENCY.decodeMsPerToken,
  tokens: Math.ceil(50 / LATENCY.decodeMsPerToken),
  delayMs: Math.round(Math.ceil(50 / LATENCY.decodeMsPerToken) * LATENCY.decodeMsPerToken),
} as const;

/**
 * Retries. If every attempt takes the full answer time (LATENCY.fullAnswerMs = 1,500 ms, no streaming), a cap of 2
 * retries means at most 3 attempts: 3 × 1,500 = 4,500 ms before the fallback. Validator time is ignored.
 */
export const RETRY = {
  maxRetries: 2,
  attempts: 3,
  worstCaseMs: 3 * LATENCY.fullAnswerMs,
} as const;
