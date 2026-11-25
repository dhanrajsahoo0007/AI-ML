// Constants and arithmetic for the Synthetic Data & Dataset Curation page only (finetune/synth-*). Brightpost's set
// sizes come from presets/production.ts; every count below that is not given there is ILLUSTRATIVE and labelled so on
// the figures. Facts: Self-Instruct (Wang et al. 2022, arXiv 2212.10560) starts from 175 seed tasks and keeps a new
// instruction only if its ROUGE-L similarity to every instruction already in the pool is below 0.7; Alpaca (Stanford
// CRFM 2023) generated 52K instructions with text-davinci-003 for under \$500.

import { DATASETS } from "./production";

/**
 * The synthetic pipeline for rare cases (refunds over £30, damaged goods in foreign addresses). Counts:
 *   150 real seed tickets, none from the golden set → 8,000 candidates from the teacher
 *   − 1,800 near duplicates = 6,200 → − 2,000 that fail a format check, the refund rule or the judge = 4,200 kept
 *   kept share = 4,200 ÷ 8,000 = 52.5 %; a person reads 100 of the 4,200 and finds 3 bad (3 %).
 */
export const SYNTH = { seeds: 150, candidates: 8_000, dupes: 1_800, rejected: 2_000, read: 100, badFound: 3 } as const;
export const SYNTH_AFTER_DEDUPE = SYNTH.candidates - SYNTH.dupes;
export const SYNTH_KEPT = SYNTH_AFTER_DEDUPE - SYNTH.rejected;
export const SYNTH_KEPT_SHARE = SYNTH_KEPT / SYNTH.candidates;

/**
 * Raw logs to the 5,000-ticket fine-tuning set (illustrative counts, last stage is DATASETS.fineTuneSet):
 *   40,000 tickets in 90 days → 11,500 resolved with an agent-approved reply → 9,800 after PII scrubbing and policy
 *   check → 6,900 after near-duplicate removal → 5,000 after capping routine intents (order status) and removing
 *   anything close to a golden ticket. 5,000 ÷ 40,000 = 12.5 % of the raw logs survive.
 */
export const CURATION = [
  { id: "raw", label: "Raw tickets", count: 40_000, sub: "90 days of logs" },
  { id: "resolved", label: "Resolved, reply approved", count: 11_500, sub: "an agent signed the reply" },
  { id: "clean", label: "PII removed, policy-checked", count: 9_800, sub: "no card numbers, no wrong refund rule" },
  { id: "unique", label: "Near duplicates removed", count: 6_900, sub: "one of each thread" },
  { id: "final", label: "Balanced, golden set out", count: DATASETS.fineTuneSet, sub: "the fine-tuning set" },
] as const;
export const CURATION_KEPT_SHARE = DATASETS.fineTuneSet / CURATION[0].count;

/**
 * Leakage. 20 of the 150 seeds were copied from the golden set by mistake.
 *   Candidates per seed = 8,000 ÷ 150 = 53.3; from 20 seeds = 1,067 candidates; × the kept share 0.525 = 560 near
 *   copies in the 4,200-example training set (13.3 %).
 *   The student has seen those 20 tickets: it passes 20 of 20. An honest 88 % pass rate would give 17.6, so the
 *   score is inflated by 2.4 tickets = 2.4 ÷ 200 = 1.2 points.
 */
export const LEAK = { goldenSeeds: 20, honestPass: 0.88 } as const;
export const LEAK_CANDIDATES = Math.round((SYNTH.candidates / SYNTH.seeds) * LEAK.goldenSeeds);
export const LEAK_IN_TRAINING = Math.round(LEAK_CANDIDATES * SYNTH_KEPT_SHARE);
export const LEAK_SHARE = LEAK_IN_TRAINING / SYNTH_KEPT;
export const LEAK_INFLATION_TICKETS = LEAK.goldenSeeds - LEAK.goldenSeeds * LEAK.honestPass;
export const LEAK_INFLATION_POINTS = (LEAK_INFLATION_TICKETS / DATASETS.goldenSet) * 100;
/** A candidate with ROUGE-L similarity of 0.7 or more to any golden ticket is dropped (Self-Instruct's own threshold; illustrative here). */
export const LEAK_THRESHOLD = 0.7;

/** A small seeded generator so the scatter figures are the same on every build. */
export function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
