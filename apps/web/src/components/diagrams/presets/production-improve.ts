// Constants and arithmetic for the continuous-improvement page (eval/improve-*.ts and the page's worked example).
// Brightpost's numbers come from presets/production.ts. Every count below is ILLUSTRATIVE (the figure shows the method,
// not measured data); the 50-trace sample and its top failure (14 of 50) match the error-analysis figure on the
// LLM Evaluation Fundamentals page.

import { DATASETS, REFUND_CASE, TRAFFIC } from "./production";

/** Monday: 50 thumbs-down traces are read; 14 are a refund above the limit sent without approval: 14 ÷ 50 = 28 %. */
export const WEEK = {
  sample: 50,
  topCount: 14,
  /** Tuesday: the 14 failures become test cases: 200 + 14 = 214. */
  goldenBefore: DATASETS.goldenSet,
  newCases: 14,
  /** Wednesday, offline. Old 200 cases: 172 pass before; 5 fixed and 3 broken, so 172 + 5 − 3 = 174 pass after. New 14: 0 → 13. */
  oldPassBefore: 172,
  fixed: 5,
  broken: 3,
  newPassBefore: 0,
  newPassAfter: 13,
  /** Thursday: a 5 % canary is 200,000 × 0.05 = 10,000 requests a day. */
  canaryShare: 0.05,
  /** Friday: the next Monday's 50 thumbs-down traces hold 3 refund failures (was 14). */
  nextMondayCount: 3,
  /** The refund limit the failing rule enforces (£30). */
  limit: REFUND_CASE.approvalLimit,
} as const;

export const goldenAfter = WEEK.goldenBefore + WEEK.newCases;
export const passBefore = WEEK.oldPassBefore + WEEK.newPassBefore;
export const passAfter = WEEK.oldPassBefore + WEEK.fixed - WEEK.broken + WEEK.newPassAfter;
export const rateBefore = passBefore / goldenAfter;
export const rateAfter = passAfter / goldenAfter;
export const canaryRequests = TRAFFIC.requestsPerDay * WEEK.canaryShare;
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)} %`;
