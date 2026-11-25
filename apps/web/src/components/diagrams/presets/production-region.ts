// Constants and arithmetic for the Multi-Region / Edge Deployment page (serving/edge-cloud-split.ts and
// serving/region-failover-headroom.ts, and the page's worked example). Brightpost's numbers come from
// presets/production.ts; this file only derives from them. Everything not a Brightpost constant is ILLUSTRATIVE.

import { LATENCY, TOKENS, TRAFFIC } from "./production";

// ── Edge against cloud: one request on three routes ────────────────────────────────────────────────────────────────

/** Prefill cost of the cloud model: 88 ms for a 2,200-token prompt (llm-serving-inference) = 0.04 ms per token. */
export const PREFILL_MS_PER_TOKEN = 0.04;

/** The two request sizes. "Easy" is a one-line status question; "hard" is Brightpost's full RAG request. */
export const EASY = { label: "Easy: where is my order?", tokensIn: 300, tokensOut: 60 } as const;
export const HARD = {
  label: "Hard: refund with policy passages",
  tokensIn: TOKENS.inputPerRequest,
  tokensOut: TOKENS.outputPerRequest,
} as const;

export type Request = { tokensIn: number; tokensOut: number };

/**
 * Three routes, all illustrative.
 *   device: a 3 B model at 4 bits on a phone: prefill 1 ms/token (1,000 tokens/s), decode 25 ms/token (40 tokens/s),
 *           no network.
 *   edge:   a small model on a GPU in a nearby point of presence: 20 ms round trip, 0.04 ms/token prefill,
 *           2 ms/token decode.
 *   cloud:  the large model in the home region: 120 ms round trip (a long-distance link), 0.04 ms/token prefill,
 *           4.4 ms/token decode (LATENCY.decodeMsPerToken, from the 400 ms / 1,500 ms targets).
 */
export const ROUTES = {
  device: { label: "On the device", networkMs: 0, prefillMsPerToken: 1, decodeMsPerToken: 25 },
  edge: { label: "Edge small model", networkMs: 20, prefillMsPerToken: PREFILL_MS_PER_TOKEN, decodeMsPerToken: 2 },
  cloud: {
    label: "Cloud large model",
    networkMs: 120,
    prefillMsPerToken: PREFILL_MS_PER_TOKEN,
    decodeMsPerToken: LATENCY.decodeMsPerToken,
  },
} as const;
export type RouteId = keyof typeof ROUTES;

/** Milliseconds per stage, the first-token time and the total for a request on a route. */
export function routeTimes(route: RouteId, req: Request) {
  const r = ROUTES[route];
  const network = r.networkMs;
  const prefill = req.tokensIn * r.prefillMsPerToken;
  const decode = req.tokensOut * r.decodeMsPerToken;
  const round = (v: number) => Math.round(v * 10) / 10;
  return {
    network,
    prefill: round(prefill),
    decode: round(decode),
    firstToken: round(network + prefill + r.decodeMsPerToken),
    total: round(network + prefill + decode),
  };
}

// ── Failover headroom: N regions, one fails ────────────────────────────────────────────────────────────────────────

/**
 * Prefill load of one request on one GPU: 2,200 tokens × 0.04 ms = 88 ms. A GPU is kept under 60 % busy with prefill so
 * decode steps and bursts have room (the llm-serving-inference sizing). Illustrative.
 */
export const GPU_SECONDS_PER_REQUEST = (TOKENS.inputPerRequest * PREFILL_MS_PER_TOKEN) / 1000;
export const GPU_BUSY_LIMIT = 0.6;

/** GPUs needed to serve `rate` requests/s: ceil(rate × 0.088 ÷ 0.6). */
export const gpusFor = (rate: number) => Math.ceil((rate * GPU_SECONDS_PER_REQUEST) / GPU_BUSY_LIMIT - 1e-9);

/**
 * The plan for `regions` regions sharing the peak. Normal share per region = peak ÷ N. After one fails, each survivor
 * takes peak ÷ (N − 1), so each region must be sized for that, and the fleet for N × peak ÷ (N − 1) = peak × N/(N − 1).
 */
export function failoverPlan(regions: number) {
  const peak = TRAFFIC.peakPerSecond;
  const normalShare = peak / regions;
  const sizedFor = peak / (regions - 1);
  return {
    regions,
    normalShare,
    sizedFor,
    fleetCapacity: regions * sizedFor,
    spare: regions * sizedFor - peak,
    spareFraction: (regions * sizedFor - peak) / peak,
    gpusPerRegion: gpusFor(sizedFor),
    gpusTotal: regions * gpusFor(sizedFor),
    gpusNormalShare: gpusFor(normalShare),
  };
}

/** One region and no failover: the GPUs the peak needs alone. */
export const singleRegionGpus = gpusFor(TRAFFIC.peakPerSecond);
