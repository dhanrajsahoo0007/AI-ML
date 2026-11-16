// Constants used only by the deep-research figures (deep-research-agents.mdx). The research question, the asker and
// the three workers come from ./agents-multi (RESEARCH), so this page and multi-agent-systems tell the same story:
// Brightpost's support manager asks "Why are kettle refunds up this month?" and a lead agent splits it across a
// refund-records worker, a help-centre worker (search_help) and a customer-reviews worker. This file adds the plan,
// the findings with their sources, and the search log the stopping rules read. Every count here is illustrative.

import { BRIGHTPOST, TOOLS } from "./agents";
import { RESEARCH } from "./agents-multi";

// ── The plan ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How the lead pins the question down before any search. "This month" is the first half of November (the question is
 * asked on 16 Nov), compared with the same days of October; "up" is a rate, refunds per 100 kettles sold, so a month
 * that simply sold more kettles does not look like a problem.
 */
export const SCOPE = {
  period: "1–15 Nov vs 1–15 Oct",
  measure: "refunds per 100 kettles sold",
} as const;

/**
 * One sub-question per worker (same order and ids as RESEARCH.workers), each with where it looks and when it is done.
 * `short` is the label drawn in figures.
 */
export const SUB_QUESTIONS = [
  {
    id: RESEARCH.workers[0].id,
    worker: RESEARCH.workers[0].label,
    short: "Refund rate and reasons,\nOct vs Nov?",
    source: "refund records",
    tools: "query_refunds",
    doneWhen: "both rates found",
  },
  {
    id: RESEARCH.workers[1].id,
    worker: RESEARCH.workers[1].label,
    short: "Did the damage rule\nchange?",
    source: "help centre",
    tools: TOOLS.searchHelp.name,
    doneWhen: "edit history read",
  },
  {
    id: RESEARCH.workers[2].id,
    worker: RESEARCH.workers[2].label,
    short: "What do reviews say\nwent wrong?",
    source: "public review sites",
    tools: "web_search, fetch_page",
    doneWhen: "no new sources",
  },
] as const;

// ── The findings and their sources ──────────────────────────────────────────────────────────────────────────────

/**
 * Illustrative counts. October 1–15: 600 kettles sold, 9 refunds = 1.5 per 100. November 1–15: 620 sold, 31 refunds
 * = 5.0 per 100 (31 / 620 = 0.05). Of the 31, 26 give the reason "arrived cracked"; 24 of those 26 went with the new
 * courier Brightpost started using on 1 Nov. Seven reviews since 3 Nov mention a cracked spout or a thin box, all on
 * one review site.
 */
export const COUNTS = {
  oct: { sold: 600, refunds: 9 },
  nov: { sold: 620, refunds: 31 },
  cracked: 26,
  newCourier: 24,
  reviews: 7,
  courierFrom: "1 Nov",
} as const;

/** Refunds per 100 sold, to one decimal place: 1.5 in October, 5.0 in November. */
export const per100 = (m: { sold: number; refunds: number }) => Math.round((1000 * m.refunds) / m.sold) / 10;

/**
 * The sources the report cites. S1 and S4 come from the refund-records worker (S4 only in round 2, when the reviewer
 * asks for it), S2 from the help-centre worker, S3 from the reviews worker. All ids are this example's own.
 */
export const SOURCES = [
  { id: "S1", name: "Refund records", where: "query_refunds, Oct and Nov" },
  { id: "S2", name: `Help article "${BRIGHTPOST.helpArticle}"`, where: "search_help, edit history" },
  { id: "S3", name: "Review site, kettle page", where: "fetch_page, 7 reviews" },
  { id: "S4", name: "Refunds joined to shipments", where: "query_refunds, round 2" },
] as const;

/**
 * One row per report sentence: the note a worker extracted (a claim, the source id it came from), the sentence the
 * lead wrote, and the round the note arrived in. The courier sentence has no note in round 1: the lead inferred it,
 * which is the claim the reviewer sends back on multi-agent-systems (RESEARCH.gap, "1 claim unsourced").
 */
export const CLAIMS = [
  {
    id: "c1",
    note: `Nov: ${COUNTS.nov.refunds} refunds, ${COUNTS.nov.sold} sold`,
    source: "S1",
    sentence: `Refunds rose from ${per100(COUNTS.oct).toFixed(1)} to ${per100(COUNTS.nov).toFixed(1)} per 100 sold`,
    round: 1,
  },
  {
    id: "c2",
    note: `${COUNTS.cracked} of ${COUNTS.nov.refunds}: "arrived cracked"`,
    source: "S1",
    sentence: `${COUNTS.cracked} of ${COUNTS.nov.refunds} arrived cracked`,
    round: 1,
  },
  {
    id: "c3",
    note: "Rule last edited in March",
    source: "S2",
    sentence: "The refund rule did not change",
    round: 1,
  },
  {
    id: "c4",
    note: `${COUNTS.reviews} reviews: cracked spout, thin box`,
    source: "S3",
    sentence: "Reviews blame the packaging",
    round: 1,
  },
  {
    id: "c5",
    note: `${COUNTS.newCourier} of ${COUNTS.cracked} cracked: new courier`,
    source: "S4",
    sentence: `The rise began with a new courier on ${COUNTS.courierFrom}`,
    round: 2,
  },
] as const;

// ── Stopping rules: the reviews worker's search log ─────────────────────────────────────────────────────────────

/**
 * The reviews worker's searches, and how many sources each one added that it had not seen (pages it then fetched).
 * Search 1 finds 4 new pages, search 2 finds 2, search 3 finds 1, search 4 finds 0. After each search that finds
 * something new, the worker fetches the best new page (the other results' snippets are enough to count them): 3
 * fetches. Calls = 4 searches + 3 fetches = 7 of its 10 (max_tool_calls in the task on multi-agent-systems).
 * Saturation: search 4 adds no new source, so the worker stops with 3 calls unspent. Confidence ("two independent
 * sources agree") is not met: every review found is on the same site, so the worker reports its claim at medium
 * confidence instead of searching on.
 */
export const SEARCH_LOG = [
  { n: 1, query: "brightpost kettle review", newSources: 4 },
  { n: 2, query: "brightpost kettle cracked", newSources: 2 },
  { n: 3, query: "brightpost kettle cracked spout november", newSources: 1 },
  { n: 4, query: "brightpost courier damaged kettle", newSources: 0 },
] as const;

export const WORKER_BUDGET = {
  maxToolCalls: 10,
  searches: SEARCH_LOG.length,
  fetches: 3,
} as const;

/** 7: the reviews worker's tool calls when it stops. */
export const REVIEWS_CALLS = WORKER_BUDGET.searches + WORKER_BUDGET.fetches;

/**
 * The whole run's tool calls (illustrative): refund records 3 in round 1 (October, November, reasons) and 2 in round
 * 2 (the shipment join and a check), help centre 2 (search_help, the edit history), reviews 7. Total 3 + 2 + 2 + 7 =
 * 14 of the team's 30-call cap (3 workers × 10). The lead allows at most 2 rounds.
 */
export const RUN_CALLS = {
  records: 3,
  recordsRound2: 2,
  help: 2,
  reviews: REVIEWS_CALLS,
  cap: 3 * WORKER_BUDGET.maxToolCalls,
  maxRounds: 2,
} as const;

export const RUN_CALLS_TOTAL = RUN_CALLS.records + RUN_CALLS.recordsRound2 + RUN_CALLS.help + RUN_CALLS.reviews;
