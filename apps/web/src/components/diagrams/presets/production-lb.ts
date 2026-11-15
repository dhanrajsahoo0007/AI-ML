// Constants and arithmetic for the Load Balancing & Auto-Scaling page (serving/lb-*.ts, cold-start-timeline.ts and the
// page's worked example). Brightpost's numbers come from presets/production.ts; this file only derives from them.
// Everything below that is not a Brightpost constant is ILLUSTRATIVE and labelled so on the figures.

import { TOKENS } from "./production";

// ── Routing: nine requests, three replicas ──────────────────────────────────────────────────────────────────────────

/**
 * A burst of nine requests (prompt + answer tokens), in arrival order; illustrative lengths. Most are short follow-ups
 * (300–700 tokens) and three are long, such as a customer pasting a whole order history (7,000–9,000).
 * Total = 400+600+8,000+500+300+7,000+450+700+9,000 = 26,950; even share over 3 replicas = 8,983.
 */
export const LB_REQUESTS = [
  { id: "A", tokens: 400 },
  { id: "B", tokens: 600 },
  { id: "C", tokens: 8_000 },
  { id: "D", tokens: 500 },
  { id: "E", tokens: 300 },
  { id: "F", tokens: 7_000 },
  { id: "G", tokens: 450 },
  { id: "H", tokens: 700 },
  { id: "I", tokens: 9_000 },
] as const;

export const LB_REPLICAS = 3;
/** Illustrative budget of tokens in flight per replica (what its KV cache and batch can hold at the latency target). */
export const LB_BUDGET = 12_000;

export type Placement = { id: string; tokens: number }[][];

/** Round-robin: request i goes to replica i mod 3, whatever it costs. */
export function roundRobin(): Placement {
  const out: Placement = Array.from({ length: LB_REPLICAS }, () => []);
  LB_REQUESTS.forEach((r, i) => out[i % LB_REPLICAS].push(r));
  return out;
}

/** Least tokens in flight: each request goes to the replica with the fewest tokens so far (ties: lowest number). */
export function leastTokens(): Placement {
  const out: Placement = Array.from({ length: LB_REPLICAS }, () => []);
  const load = (p: { tokens: number }[]) => p.reduce((a, r) => a + r.tokens, 0);
  for (const r of LB_REQUESTS) {
    let best = 0;
    for (let i = 1; i < LB_REPLICAS; i++) if (load(out[i]) < load(out[best])) best = i;
    out[best].push(r);
  }
  return out;
}

export const placementLoads = (p: Placement) => p.map((rs) => rs.reduce((a, r) => a + r.tokens, 0));

// ── Prefix-aware routing: turn 2 of a conversation ─────────────────────────────────────────────────────────────────

/**
 * Prefill cost per token: one prompt of 2,200 tokens on an 8 B model is 2 × 8e9 × 2,200 = 35.2 TFLOP; at an
 * illustrative 400 TFLOP/s that is 88 ms (the llm-serving-inference worked example), so 88 ÷ 2,200 = 0.04 ms/token.
 *
 * Turn 2 of a conversation: the 2,200-token prompt of turn 1, the 250-token answer and a 20-token follow-up make a
 * 2,470-token prompt. A prefix cache keeps only full blocks of 16 tokens (vLLM's default): 2,200 ÷ 16 = 137.5, so 137
 * blocks = 2,192 tokens are reused, and 2,470 − 2,192 = 278 tokens are prefilled.
 *   Miss (another replica): 2,470 × 0.04 = 98.8 ms. Hit: 278 × 0.04 = 11.1 ms. Saved: 87.7 ms (89 % of the prompt).
 */
export const PREFIX = {
  msPerToken: 88 / TOKENS.inputPerRequest,
  turn1: TOKENS.inputPerRequest,
  answer: TOKENS.outputPerRequest,
  followUp: 20,
  blockTokens: 16,
  turn2: TOKENS.inputPerRequest + TOKENS.outputPerRequest + 20,
  cachedTokens: Math.floor(TOKENS.inputPerRequest / 16) * 16,
  get newTokens() {
    return this.turn2 - this.cachedTokens;
  },
  get missMs() {
    return Math.round(this.turn2 * this.msPerToken * 10) / 10;
  },
  get hitMs() {
    return Math.round(this.newTokens * this.msPerToken * 10) / 10;
  },
};

// ── Cold start of one replica, 16 GB of weights ───────────────────────────────────────────────────────────────────

/**
 * An 8 B model at 16 bits: 8e9 × 2 bytes = 16 GB. Every rate is ILLUSTRATIVE; measure yours.
 *   Pull the engine image: 8 GB at 0.2 GB/s = 40 s.
 *   Download the weights: 16 GB at 1 GB/s = 16 s.
 *   Load into GPU memory: 16 GB at 2 GB/s = 8 s.
 *   Warm up (compile kernels, capture graphs, first dummy requests): 35 s.
 *   Total 99 s. With the image already on the node, the weights on a local disk and a compile cache kept: 0 + 0 + 8 +
 *   15 = 23 s.
 */
export const COLD = {
  weightsGB: 16,
  imageGB: 8,
  slow: { pull: 40, download: 16, load: 8, warm: 35 },
  fast: { pull: 0, download: 0, load: 8, warm: 15 },
} as const;
export const coldTotal = (p: { pull: number; download: number; load: number; warm: number }) =>
  p.pull + p.download + p.load + p.warm;
