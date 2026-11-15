// Shared helpers and constants for the three LLMOps governance pages: Alerting & Dashboards, Experiment Tracking &
// Version Control, Model Registry & Governance (llmops/dashboard-rows, alert-symptom-vs-cause, experiment-*,
// compare-runs, registry-*, model-card). Brightpost's numbers come from presets/production.ts and
// production-release.ts; this file only derives from them. Anything not a Brightpost constant is ILLUSTRATIVE.

import type { LayoutShape, LayoutTone } from "../types";
import { PROD_TONE, LATENCY, TOKENS, TRAFFIC } from "./production";
import { QUALITY, halfWidth } from "./production-release";
import { PRICE } from "./production-batch";

const M = 1_000_000;

/**
 * Cost at the shared illustrative list price ($2 in, $10 out per million tokens):
 *   per request: 2,200 × 2 ÷ 1,000,000 = $0.0044 in; 250 × 10 ÷ 1,000,000 = $0.0025 out; $0.0069 together.
 *   per day: 440 M × $2 per M = $880 in; 50 M × $10 per M = $500 out; $1,380 together.
 */
export const OPS_COST = {
  perRequestIn: (TOKENS.inputPerRequest * PRICE.inputPerM) / M,
  perRequestOut: (TOKENS.outputPerRequest * PRICE.outputPerM) / M,
  perDay: (TOKENS.inputPerDay * PRICE.inputPerM) / M + (TOKENS.outputPerDay * PRICE.outputPerM) / M,
} as const;
export const costPerRequest = (outputTokens: number) =>
  (TOKENS.inputPerRequest * PRICE.inputPerM) / M + (outputTokens * PRICE.outputPerM) / M;

/** Decode speed implied by LATENCY.decodeMsPerToken: 1,000 ÷ 4.4 = 227 tokens/s. */
export const DECODE_TOKENS_PER_S = Math.round(1000 / LATENCY.decodeMsPerToken);

/** Two candidate runs scored on the 200-ticket golden set (illustrative counts, shared with the release pipeline). */
export const RUNS = {
  a: { id: "r-0187", prompt: "p12", pass: 184, refundOk: 12, outputTokens: TOKENS.outputPerRequest },
  b: { id: "r-0188", prompt: "p13", pass: 164, refundOk: 12, outputTokens: 290 },
} as const;
export { QUALITY, halfWidth, TRAFFIC, PROD_TONE };

export const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });

export const note = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true });

export const link = (
  id: string,
  from: string,
  to: string,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to, tone: PROD_TONE.infra, step, ...extra });
