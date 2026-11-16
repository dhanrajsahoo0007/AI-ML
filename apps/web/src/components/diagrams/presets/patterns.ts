// Shared legend, running example and builders for the System Design Patterns pages (/system-design/patterns; plan:
// SYSTEM-DESIGN/plans/patterns-expansion-plan.md §6). Every pattern figure keeps one colour legend (PATTERN_TONE)
// and one running example (Brightpost, the online shop already used on the cloud, RAG, agents and production
// pages), so a number that appears in two figures comes from one constant here.
//
// Builders are added only when a second page needs the same shape. `waterfall`, `meter` and `curve` live in
// presets/production.ts: import them from there, never copy them.

import { REFUND_CASE, n } from "./production";
import type { LayoutShape, LayoutTone } from "../types";

// ── Colour legend ────────────────────────────────────────────────────────────────────────────────────────────────

/** One role, one tone, on every pattern page. At most four tones plus neutral in one figure; red only for a failure. */
export const PATTERN_TONE = {
  /** Traffic: a user, a client, a request. */
  traffic: "orange",
  /** Compute: an app server, a worker, a replica. */
  compute: "teal",
  /** Stores: a database, a cache, an index, a durable log. */
  store: "violet",
  /** Data in motion: messages, events, records, files. */
  data: "blue",
  /** The pattern's own part: what the figure adds. */
  pattern: "green",
  /** A check or decision: a limiter, a health check, a vote, a metric. */
  check: "lime",
  /** Ids, hashes, tokens, clock counters. */
  id: "pink",
  /** Failure, overload, a lost or duplicated write. */
  fail: "red",
  /** Plumbing: load balancer, router, broker, network. */
  infra: "neutral",
} as const satisfies Record<string, LayoutTone>;

// ── Running example: Brightpost, the online shop ─────────────────────────────────────────────────────────────────────

/**
 * The shop's traffic. Working:
 *   2,000,000 daily active shoppers (given) × 20 product pages each = 40,000,000 product page views a day.
 *   Average read rate = 40,000,000 ÷ 86,400 s = 463 reads/s.
 *   Peak = about 5 × average = 2,315, written "2,300 reads/s" (lunchtime on a sale day; illustrative factor).
 *   Orders: 200,000 a day (given), average 200,000 ÷ 86,400 = 2.3 orders/s; sale-day peak 300 orders/s (given).
 */
export const SHOP = {
  shop: "Brightpost",
  shoppersPerDay: 2_000_000,
  pagesPerShopper: 20,
  pageViewsPerDay: 40_000_000,
  secondsPerDay: 86_400,
  averageReadsPerSecond: 463,
  peakFactor: 5,
  peakReadsPerSecond: 2_300,
  ordersPerDay: 200_000,
  averageOrdersPerSecond: 2.3,
  peakOrdersPerSecond: 300,
  catalogueProducts: 1_000_000,
  appServers: 40,
  homeRegion: "London",
  secondRegion: "Frankfurt",
} as const;

/** The flash sale (given): 10,000 kettles go on sale at 12:00 to 500,000 shoppers; a basket hold lasts 10 minutes. */
export const FLASH_SALE = {
  item: REFUND_CASE.item,
  stock: 10_000,
  shoppers: 500_000,
  startsAt: "12:00",
  holdMinutes: 10,
  /** At 12:00 the kettle's product page takes 30 % of all reads (given): 0.3 × 2,300 = 690 reads/s on one key. */
  hotKeyShare: 0.3,
  hotKeyReadsPerSecond: 690,
} as const;

/** The order every worked example follows: order 4471, a kettle, £42 (presets/production.ts REFUND_CASE). */
export const ORDER = {
  orderId: REFUND_CASE.orderId,
  item: REFUND_CASE.item,
  price: REFUND_CASE.price,
  label: `order ${REFUND_CASE.orderId}, a ${REFUND_CASE.item}, £${REFUND_CASE.price}`,
} as const;

export { n };

// ── Builders ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Rendered width of a 13 px semibold box label per character, on the safe side (lint uses 6.2). */
const LABEL_CHAR_W = 7.2;
/** Rendered width of a sub line per character, on the safe side (lint uses 4.8). */
const SUB_CHAR_W = 5.6;
const fits = (label: string, w: number, perChar = LABEL_CHAR_W) =>
  Math.max(...label.split("\n").map((l) => l.length)) * perChar <= w - 8;

/** One cell of an option column: a label, an optional second line and an optional tone ("fail" turns it red). */
export interface OptionRow {
  label: string;
  sub?: string;
  tone?: LayoutTone;
}

/** One option: its title (pastel, in its tone) and one row per property, in the same order as the row labels. */
export interface OptionColumn {
  id: string;
  title: string;
  tone: LayoutTone;
  rows: OptionRow[];
  /** Build step for the whole column (default 1). */
  step?: number;
  highlight?: boolean;
}

export interface OptionColumnsOpts {
  columns: OptionColumn[];
  /** Property names down the left, one per row. Omit for no label column. */
  rowLabels?: string[];
  colW?: number;
  labelW?: number;
  headH?: number;
  rowH?: number;
  gap?: number;
}

const OPT = { colW: 200, labelW: 130, headH: 44, rowH: 44, gap: 14 } as const;

/** Width and height of an `optionColumns` block. */
export function optionColumnsSize(opts: OptionColumnsOpts) {
  const colW = opts.colW ?? OPT.colW;
  const gap = opts.gap ?? OPT.gap;
  const labelW = opts.rowLabels ? (opts.labelW ?? OPT.labelW) + gap : 0;
  const rows = Math.max(...opts.columns.map((c) => c.rows.length));
  const headH = opts.headH ?? OPT.headH;
  const rowH = opts.rowH ?? OPT.rowH;
  return {
    width: labelW + opts.columns.length * colW + (opts.columns.length - 1) * gap,
    height: headH + rows * (rowH + gap),
  };
}

/**
 * Options side by side, compared on the same properties: a pastel title box per option and one paper box per
 * property under it, with the property names down the left. Used for "polling against log tailing" (outbox) and
 * "cache-aside, write-through, write-back" (caching). Throws when a label would not fit its box.
 */
export function optionColumns(idPrefix: string, x: number, y: number, opts: OptionColumnsOpts): LayoutShape[] {
  const colW = opts.colW ?? OPT.colW;
  const gap = opts.gap ?? OPT.gap;
  const headH = opts.headH ?? OPT.headH;
  const rowH = opts.rowH ?? OPT.rowH;
  const labelW = opts.labelW ?? OPT.labelW;
  const out: LayoutShape[] = [];
  const left = opts.rowLabels ? x + labelW + gap : x;
  const rowY = (i: number) => y + headH + gap + i * (rowH + gap);
  opts.rowLabels?.forEach((label, i) => {
    out.push({
      id: `${idPrefix}-rl-${i}`,
      type: "text",
      x,
      y: rowY(i),
      w: labelW,
      h: rowH,
      label,
      tone: PATTERN_TONE.infra,
    });
  });
  opts.columns.forEach((c, ci) => {
    const cx = left + ci * (colW + gap);
    if (!fits(c.title, colW)) throw new Error(`optionColumns ${idPrefix}: title "${c.title}" does not fit ${colW}`);
    out.push({
      id: `${idPrefix}-${c.id}`,
      type: "box",
      x: cx,
      y,
      w: colW,
      h: headH,
      label: c.title,
      tone: c.tone,
      fill: "pastel",
      step: c.step,
      highlight: c.highlight,
    });
    c.rows.forEach((r, ri) => {
      if (!fits(r.label, colW)) throw new Error(`optionColumns ${idPrefix}: "${r.label}" does not fit ${colW}`);
      if (r.sub && !fits(r.sub, colW, SUB_CHAR_W)) {
        throw new Error(`optionColumns ${idPrefix}: sub "${r.sub}" does not fit ${colW}`);
      }
      out.push({
        id: `${idPrefix}-${c.id}-${ri}`,
        type: "box",
        x: cx,
        y: rowY(ri),
        w: colW,
        h: rowH,
        label: r.label,
        sub: r.sub,
        tone: r.tone ?? PATTERN_TONE.infra,
        fill: r.tone === PATTERN_TONE.fail ? "soft" : "paper",
        step: c.step,
      });
    });
  });
  return out;
}
