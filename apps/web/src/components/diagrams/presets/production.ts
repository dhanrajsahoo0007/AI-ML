// Shared legend, running example and builders for the production pages: the six GenAI groups Fine-Tuning &
// Adaptation, Evaluation, Inference & Serving, LLMOps & Observability, Safety, Security & Governance, and
// Multimodal & Voice (plan: SYSTEM-DESIGN/plans/production-pages-plan.md). Every figure in that track keeps one
// colour legend (PROD_TONE) and one running example (the Brightpost support assistant, already used on the cloud,
// RAG and agents pages), so a number that appears in two figures comes from one constant here.
//
// Page-only constants and builders go in presets/production-<short>.ts, importing from this file.

import { CORPUS, LATENCY_MS, PROMPT } from "./rag";
import { BRIGHTPOST } from "./agents";
import type { LayoutTone } from "../types";

// ── Colour legend ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One role, one tone, on every page of the track. The same meaning as on the RAG and agents pages where they overlap
 * (the model is green, the question orange, passages blue, stores violet, scores lime, embeddings pink).
 */
export const PROD_TONE = {
  /** The model: an LLM, a model call, a generated answer, a base model. */
  model: "green",
  /** Traffic: the user, a request, a prompt. On the fine-tuning pages: the weights being trained. */
  traffic: "orange",
  /** Data: documents, datasets, examples, logs, traces, images. */
  data: "blue",
  /** Compute: a GPU, an inference engine, a replica, a container; a tool or a robot action. */
  compute: "teal",
  /** Stores: a cache, a registry, an index, a trace store. On the multimodal pages: audio. */
  store: "violet",
  /** A check: an evaluation, a grader, a judge, a guardrail, a metric, an SLO. */
  check: "lime",
  /** Failure, attack, breach, drift alarm, budget overrun. */
  failure: "red",
  /** Infrastructure and control: gateway, router, queue, pipeline. On the fine-tuning pages: frozen weights. */
  infra: "neutral",
  /** Embeddings and vectors. */
  embedding: "pink",
} as const satisfies Record<string, LayoutTone>;

/** Fine-tuning pages: frozen weights neutral, trained weights orange (those figures show no request). */
export const FINETUNE_TONE = {
  frozen: PROD_TONE.infra,
  trained: PROD_TONE.traffic,
  data: PROD_TONE.data,
  model: PROD_TONE.model,
  check: PROD_TONE.check,
} as const satisfies Record<string, LayoutTone>;

/** Multimodal pages: text orange, images and video blue, audio violet. */
export const MODALITY_TONE = {
  text: PROD_TONE.traffic,
  image: PROD_TONE.data,
  audio: PROD_TONE.store,
  model: PROD_TONE.model,
  embedding: PROD_TONE.embedding,
} as const satisfies Record<string, LayoutTone>;

// ── Running example: the Brightpost support assistant ────────────────────────────────────────────────────────────

/** Re-exported so production pages import the shop, the refund case and the help centre from one place. */
export { BRIGHTPOST, CORPUS };

/**
 * Traffic. Working:
 *   200,000 requests a day (given).
 *   Average rate = 200,000 ÷ 86,400 s = 2.31 requests/s, written "2.3 requests/s".
 *   Peak = about 5 × average = 11.6, written "12 requests/s" (a busy hour after a sale; illustrative factor).
 */
export const TRAFFIC = {
  requestsPerDay: 200_000,
  secondsPerDay: 86_400,
  averagePerSecond: 2.3,
  peakFactor: 5,
  peakPerSecond: 12,
} as const;

/**
 * Tokens per request. Input is the RAG prompt from presets/rag.ts (200 instructions + 5 chunks × 400 + 15 question
 * = 2,215, written "≈ 2,200 tokens"). Output: 250 tokens (given).
 * Per day: 200,000 × 2,200 = 440,000,000 input tokens (440 M); 200,000 × 250 = 50,000,000 output tokens (50 M).
 */
export const TOKENS = {
  inputPerRequest: 2_200,
  inputExact: PROMPT.total,
  outputPerRequest: 250,
  inputPerDay: 440_000_000,
  outputPerDay: 50_000_000,
  inputPerDayLabel: "440 M",
  outputPerDayLabel: "50 M",
} as const;

/**
 * Latency targets for one answer, from presets/rag.ts LATENCY_MS: time to first token 400 ms, full answer 1,500 ms.
 * Decode speed implied: (1,500 − 400) ms for 250 tokens = 4.4 ms per token ≈ 227 tokens/s (illustrative).
 */
export const LATENCY = {
  firstTokenMs: LATENCY_MS.firstToken,
  fullAnswerMs: LATENCY_MS.fullAnswer,
  decodeMsPerToken: 4.4,
} as const;

/**
 * Evaluation and training sets (given):
 *   the golden set: 200 real tickets with reference answers;
 *   the fine-tuning set: 5,000 resolved tickets.
 */
export const DATASETS = {
  goldenSet: 200,
  fineTuneSet: 5_000,
} as const;

/** The refund case as every page tells it: order 4471, a cracked kettle, £42; refunds over £30 need approval. */
export const REFUND_CASE = {
  orderId: BRIGHTPOST.orderId,
  item: BRIGHTPOST.item,
  price: BRIGHTPOST.price,
  approvalLimit: BRIGHTPOST.approvalLimit,
  label: `order ${BRIGHTPOST.orderId}, a cracked ${BRIGHTPOST.item}, £${BRIGHTPOST.price}`,
} as const;

/** Format a number with thousands separators, as the pages print them ("200,000"). */
export const n = (value: number) => value.toLocaleString("en-GB");
