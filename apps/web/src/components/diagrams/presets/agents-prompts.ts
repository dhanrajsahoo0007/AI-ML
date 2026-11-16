// Constants for the prompt release figure (prompt-management-versioning.mdx, animated/agents/prompt-release-flow).
// The shop, the refund and the approval rule come from ./agents; the fixed set, its floor and the live prompt's score
// come from the production track (presets/production.ts, production-release.ts), so the two tracks quote the same
// numbers. Every canary count below is ILLUSTRATIVE and labelled so on the figure and the page.

import { BRIGHTPOST } from "./agents";
import { DATASETS } from "./production";
import { EVAL_RUN } from "./production-release";

/**
 * The change. v12 is live. v13 adds one refund-wording rule, because v12 sometimes told a customer "your refund is on
 * its way" while a £42 refund was still waiting for the support agent (refunds over £30 wait). v14 is the fix that
 * comes after the rollback.
 */
export const PROMPT_VERSIONS = {
  name: "brightpost-support",
  live: "v12",
  candidate: "v13",
  fix: "v14",
  rule: `Say a refund is approved only after create_refund returns "approved" in this conversation.`,
  fixRule: `Say a refund is approved only after create_refund or get_order shows it approved.`,
  example: `I've asked for your refund of £${BRIGHTPOST.price}; a support agent will confirm it.`,
} as const;

/**
 * Offline gate on the fixed set: 200 single-turn chats (DATASETS.goldenSet), floor 85 % = 170 (EVAL_RUN.floorPass).
 * v12 passes 184 (EVAL_RUN.goodPass). v13 passes 187: the 3 wording cases v12 failed now pass, nothing else changes
 * (illustrative). 187 ≥ 170 and 187 ≥ 184, so the gate passes v13.
 */
export const OFFLINE = {
  cases: DATASETS.goldenSet,
  floor: EVAL_RUN.floorPass,
  live: EVAL_RUN.goodPass,
  wordingFixed: 3,
  candidate: EVAL_RUN.goodPass + 3,
} as const;

/**
 * The canary: 5 % of conversations, split by conversation id. The canary gate reads the first 600 refund chats on v13
 * and compares them with v12 on the other 95 % (illustrative).
 *   First visits 450: both versions hand 36 to a person (8 %).
 *   Return visits ("did my refund go through?") 150: v12 hands off 12 (8 %); v13 hands off 78 (52 %), because the
 *   approval happened in an earlier conversation and v13's rule only counts this one.
 *   v12: 36 + 12 = 48 of 600 = 8 %. v13: 36 + 78 = 114 of 600 = 19 %.
 *   95 % interval at n = 600, p = 0.08: 1.96 × sqrt(0.08 × 0.92 / 600) = 1.96 × 0.0111 = ±2.2 points, so an
 *   11-point rise is five times the noise. The gate blocks a rise of more than 3 points.
 */
export const CANARY = {
  share: 0.05,
  refundChats: 600,
  firstVisits: 450,
  returnVisits: 150,
  firstHandoffs: 36,
  returnHandoffsLive: 12,
  returnHandoffsCandidate: 78,
  maxRisePoints: 3,
} as const;

export const CANARY_RATES = (() => {
  const live = (CANARY.firstHandoffs + CANARY.returnHandoffsLive) / CANARY.refundChats;
  const candidate = (CANARY.firstHandoffs + CANARY.returnHandoffsCandidate) / CANARY.refundChats;
  const noise = 1.96 * Math.sqrt((live * (1 - live)) / CANARY.refundChats);
  return {
    live,
    candidate,
    livePct: Math.round(live * 100),
    candidatePct: Math.round(candidate * 100),
    noisePoints: Math.round(noise * 1000) / 10,
  };
})();
if (CANARY.firstVisits + CANARY.returnVisits !== CANARY.refundChats) throw new Error("canary visits must sum");

/** After the rollback, 20 return-visit chats from the failing traces join the fixed set: 200 + 20 = 220 (illustrative). */
export const NEW_CASES = { added: 20, total: DATASETS.goldenSet + 20 } as const;

/** Langfuse's default client-side cache TTL (docs, checked 16 Nov 2026): a moved label reaches every worker in 60 s. */
export const CACHE_TTL_S = 60;
