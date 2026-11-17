// Constants and arithmetic for the "Design a Document Extraction Pipeline" case study (/genai-system-design/case-studies/
// document-extraction-pipeline; design sheet SYSTEM-DESIGN/plans/genai-design/design/document-extraction-pipeline.md v2,
// dossier research/document-extraction-pipeline.md (cited as "dossier F12"), review review/document-extraction-pipeline-
// design.md). Specs in assets/diagrams/animated/doc-extract/ import from here, so the page, the figures and the tests
// share one set of numbers.
//
// Running example: Brightpost's accounts-payable (AP) team. Every volume, mix, error rate, review time and latency below
// is ILLUSTRATIVE unless a comment names a source. Prices are list prices as of November 2026 (read 17 November 2026):
//   - small model (Claude Haiku 5.5 class) 0.10 input / 0.01 cache read / 0.125 cache write / 0.50 output USD per million
//     tokens; mid-size (Claude Sonnet 5.5 class) 2.00 / 0.10 / 2.50 / 10.00; Batch −50% (F36). These are first-party
//     API prices; the model runs through Bedrock London's EU cross-Region profile (Haiku 5.5 and Sonnet 5.5 are not
//     served in-Region in London, F73), whose prices are not verified here (F67), so the model lines are an estimate;
//   - OCR: Azure Read, UK South, 1.50 USD per 1,000 pages, 0.60 above 1M (F68);
//   - second method: Amazon Textract AnalyzeExpense, EU (London), 0.01 USD a page, 0.008 above 1M (F69). It runs its own
//     OCR, so the two methods do not share an OCR layer (review item 1);
//   - managed generative extractors for the build-or-buy line: Bedrock Data Automation custom output 0.040 USD a page for
//     ≤ 30 fields + 0.0005 a field above (F65); Azure Content Understanding ≈ 0.0084 USD a page in Microsoft's own
//     illustrative invoice example (F64).
// Image tokens = ceil(w / 28) × ceil(h / 28) (F34). Minimum cacheable prefix 512 tokens (F39).

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const prod = (xs: readonly number[]) => xs.reduce((p, x) => p * x, 1);
const round = (x: number, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp;

/** Standard normal CDF (Abramowitz and Stegun 7.1.26). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
/** Find x in [lo, hi] where an increasing f(x) reaches target. */
function bisect(f: (x: number) => number, target: number, lo: number, hi: number) {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const Z95 = bisect(phi, 0.95, -8, 8); // 1.645
const Z90 = bisect(phi, 0.9, -8, 8); // 1.282

/** A stage's latency (ms), fitted as a log-normal to its p50 and p95 (no mass below 0, a long right tail). */
type Stage = { p50: number; p95: number };
const lnCdf = (s: Stage) => (t: number) =>
  t <= 0 ? 0 : phi((Math.log(t) - Math.log(s.p50)) / ((Math.log(s.p95) - Math.log(s.p50)) / Z95));
/** Quantile q of the maximum of independent parallel stages: solve Π F_i(t) = q. */
export function maxOf(stages: readonly Stage[], q: number) {
  return bisect((t) => prod(stages.map((s) => lnCdf(s)(t))), q, 1, 10_000_000);
}

/** P(X ≤ k) for X ~ Poisson(λ). */
function poissonCdf(k: number, lambda: number) {
  let term = Math.exp(-lambda);
  let total = term;
  for (let i = 1; i <= k; i++) {
    term *= lambda / i;
    total += term;
  }
  return total;
}
/** One-sided 95% Poisson upper bound on the mean when k events were seen (k = 0 → 3.00, the rule of three). */
export function poissonUpper95(k: number) {
  return bisect((l) => -poissonCdf(k, l), -0.05, 0, 1_000);
}
/** Largest k whose 95% upper bound ÷ n stays ≤ limit (the most audited errors a pass allows). */
function maxPassingK(n: number, limit: number) {
  let k = -1;
  while (poissonUpper95(k + 1) / n <= limit) k++;
  return k;
}

// ── Prices ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const PRICES = {
  small: { input: 0.1, cached: 0.01, write: 0.125, output: 0.5 },
  mid: { input: 2.0, cached: 0.1, write: 2.5, output: 10.0 },
  batchDiscount: 0.5,
  ocrPerPage: 1.5 / 1_000, // Azure Read, UK South; 0.0006 above 1M pages a month
  ocrPerPageOver1M: 0.6 / 1_000,
  secondPerPage: 0.01, // Textract AnalyzeExpense, London; 0.008 above 1M
  secondPerPageOver1M: 0.008,
  bdaCustomPerPage: 0.04, // ≤ 30 fields
  bdaPerExtraField: 0.0005,
  contentUnderstandingPerPage: 0.0837 / 10, // Microsoft's illustrative 10-page invoice example
  renderPerPage: 0.0002, // CPU: rasterise, de-rotate, content-stream check (illustrative)
  clerkPerHour: 30, // fully loaded AP clerk, USD an hour (illustrative)
  usdPerGbp: 1.3, // illustrative, for the money-at-risk sums
} as const;

// ── Volume (Brightpost accounts payable, illustrative) ────────────────────────────────────────────────────────────────

/**
 * Per month: 40,000 supplier invoices and credit notes (2 pages on average), 1,000 statements (3 pages, reconciled
 * against the ledger, never posted), 30,000 employee receipts (1 photo), 1,000 other files (1 page: letters, junk).
 *   documents 72,000; pages 80,000 + 3,000 + 30,000 + 1,000 = 114,000.
 * 21 working days; 35% of invoices in the last 5: normal day 1,625, month-end day 2,800; peak hour 15% → 420.
 * 30% of invoices have no purchase order (utilities, services); they need budget-holder approval in the ERP, a business
 * control outside the AP queue and outside STP.
 */
export const VOLUME = (() => {
  const invoices = 40_000;
  const invoicePages = 2;
  const statements = 1_000;
  const statementPages = 3;
  const receipts = 30_000;
  const other = 1_000;
  const workingDays = 21;
  const monthEndDays = 5;
  const monthEndShare = 0.35;
  const documents = invoices + statements + receipts + other; // 72,000
  const pages = invoices * invoicePages + statements * statementPages + receipts + other; // 114,000
  const normalDayInvoices = (invoices * (1 - monthEndShare)) / (workingDays - monthEndDays); // 1,625
  const monthEndDayInvoices = (invoices * monthEndShare) / monthEndDays; // 2,800
  const receiptsPerDay = receipts / workingDays; // 1,428.6
  const peakHourInvoices = 0.15 * monthEndDayInvoices; // 420
  const peakDocsPerSecond = (peakHourInvoices + 0.15 * receiptsPerDay) / 3_600; // ≈ 0.18
  const burstUpload = 500; // a scanning-room or portal batch: queued by the workflow, drained at the OCR quota
  return {
    invoices,
    invoicePages,
    statements,
    statementPages,
    receipts,
    other,
    workingDays,
    monthEndDays,
    monthEndShare,
    documents,
    pages,
    normalDayInvoices,
    monthEndDayInvoices,
    receiptsPerDay,
    peakHourInvoices,
    peakDocsPerSecond,
    burstUpload,
    nonPoShare: 0.3,
  };
})();

/**
 * Fields. Invoice header (12): document kind (invoice or credit note: the sign), supplier (resolved to supplier_id),
 * supplier VAT number, bill-to entity (company code), invoice number, invoice date (tax point), due date, PO number,
 * currency, net total, VAT total, gross total. Lines: an array (1 to 200+; 5 on average) of description, quantity, unit
 * price, VAT rate, net (HMRC 16.3.1, F51): 5 × 5 = 25. 37 fields on the average invoice.
 * Critical (gate posting): the 11 header fields other than due date, in five rule families with different catch rates.
 */
export const FIELDS = {
  header: 12,
  lineItems: 5,
  lineFields: 5,
  perInvoice: 12 + 5 * 5, // 37
  receipt: 8,
  receiptCritical: 4,
  families: [
    { id: "amounts", fields: ["currency", "net", "vat", "gross"], rulesCatch: 0.95 }, // Σ lines, net + VAT = gross, PO, GRN
    { id: "kind", fields: ["doc_kind"], rulesCatch: 0.95 }, // title + sign of totals + credit-note reference to an invoice
    { id: "parties", fields: ["supplier_id", "supplier_vat", "bill_to"], rulesCatch: 0.9 }, // VAT number ↔ master (HMRC, VIES), sender domain, remit-to
    { id: "po", fields: ["po_number"], rulesCatch: 0.9 }, // the PO must exist, be open and belong to the supplier
    { id: "invoice_number", fields: ["invoice_number"], rulesCatch: 0.6 }, // only the supplier's pattern and sequence
    { id: "dates", fields: ["invoice_date"], rulesCatch: 0.7 }, // ≥ PO date, ≤ today, ≤ 90 days old, in sequence with numbers
  ],
} as const;
export const CRITICAL = sum(FIELDS.families.map((f) => f.fields.length)); // 11

// ── The extraction call's context ────────────────────────────────────────────────────────────────────────────────────

/**
 * OCR runs on the native scan (or a 300 DPI render of a born-digital page); the VLM gets a 150 DPI copy (A4 1240 × 1754
 * px → 45 × 63 = 2,835 image tokens, under the high-resolution tier's 4,784) and boxes are scaled by the DPI ratio.
 * OCR words carry an id and a coarse position (line, x and y in tenths): 350 words × 8 tokens = 2,800 tokens a page.
 *   stable 900 + 600 = 1,500; changing 400 + 5,670 + 5,600 = 11,670; total 13,170.
 * Output: fixed object keys, short integer word ids; counted on the schema at ≈ 35 tokens a field → 37 × 35 ≈ 1,300.
 */
export const PAGE = (() => {
  const widthPx = 1_240;
  const heightPx = 1_754;
  const imageTokens = Math.ceil(widthPx / 28) * Math.ceil(heightPx / 28); // 2,835
  const wordsPerPage = 350;
  const tokensPerWord = 8;
  return {
    vlmDpi: 150,
    ocrDpi: 300,
    widthPx,
    heightPx,
    imageTokens,
    wordsPerPage,
    tokensPerWord,
    wordTokens: wordsPerPage * tokensPerWord,
  };
})();

export const CONTEXT = (() => {
  const pages = VOLUME.invoicePages;
  const blocks = [
    { id: "instructions", label: "Instructions", tokens: 900, stable: true },
    { id: "schema", label: "Schema", tokens: 600, stable: true },
    { id: "hints", label: "Supplier hints", tokens: 400, stable: false },
    { id: "images", label: "Page images", tokens: pages * PAGE.imageTokens, stable: false },
    { id: "words", label: "OCR words", tokens: pages * PAGE.wordTokens, stable: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 13,170
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,500
  const changing = total - stable; // 11,670
  const wordsOnlyChanging = 400 + pages * PAGE.wordTokens; // route A: 6,000
  const imageOnlyChanging = 400 + pages * PAGE.imageTokens; // tie-break: 6,070
  return { blocks, total, stable, changing, wordsOnlyChanging, imageOnlyChanging, output: 1_300, tieBreakOutput: 150 };
})();

// ── Unit costs (USD) ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Small-model calls read the cached prefix (dense traffic). Mid-model calls (tie-breaks ≈ 135 and route C ≈ 81 a normal
 * day) arrive less often than every 5 minutes, so each pays a cache write on the 1,500-token prefix (review item 46).
 *   page classifier (small): 600 cached + 2,800 + 30 out = 0.000006 + 0.00028 + 0.000015 = 0.000301 a page
 *   route A (small, words): 1,500 cached + 6,000 + 1,300 out = 0.000015 + 0.0006 + 0.00065 = 0.001265
 *   small VLM (route B): 1,500 cached + 11,670 + 1,300 out = 0.000015 + 0.001167 + 0.00065 = 0.001832
 *   mid VLM (route C pre-fill): 1,500 written + 11,670 + 1,300 out = 0.00375 + 0.02334 + 0.013 = 0.04009
 *   mid tie-break, image only, disputed fields: 1,500 written + 6,070 + 150 out = 0.00375 + 0.01214 + 0.0015 = 0.01739
 *   second method (Textract AnalyzeExpense, own OCR): 2 pages × 0.01 = 0.02
 * Receipt: 900 × 1,600 photo copy (33 × 58 = 1,914 tokens) + 120 words × 8 = 960 + 1,200 cached + 300 out = 0.000437.
 */
export const UNIT = (() => {
  const s = PRICES.small;
  const m = PRICES.mid;
  const p = VOLUME.invoicePages;
  const classifierPage = usd(600, s.cached) + usd(PAGE.wordTokens, s.input) + usd(30, s.output);
  const routeA =
    usd(CONTEXT.stable, s.cached) + usd(CONTEXT.wordsOnlyChanging, s.input) + usd(CONTEXT.output, s.output);
  const smallVlm = usd(CONTEXT.stable, s.cached) + usd(CONTEXT.changing, s.input) + usd(CONTEXT.output, s.output);
  const midVlm = usd(CONTEXT.stable, m.write) + usd(CONTEXT.changing, m.input) + usd(CONTEXT.output, m.output);
  const tieBreak =
    usd(CONTEXT.stable, m.write) + usd(CONTEXT.imageOnlyChanging, m.input) + usd(CONTEXT.tieBreakOutput, m.output);
  const second = p * PRICES.secondPerPage;
  const perPageCommon = PRICES.ocrPerPage + PRICES.renderPerPage + classifierPage; // 0.002001
  const commonPerInvoice = p * perPageCommon; // 0.004002
  const receiptImageTokens = Math.ceil(900 / 28) * Math.ceil(1_600 / 28); // 1,914
  const receiptVlm =
    usd(1_200, s.cached) + usd(receiptImageTokens + 120 * PAGE.tokensPerWord, s.input) + usd(300, s.output);
  return {
    classifierPage,
    routeA,
    smallVlm,
    midVlm,
    tieBreak,
    second,
    perPageCommon,
    commonPerInvoice,
    receiptImageTokens,
    receiptVlm,
  };
})();

// ── Error model ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Routes: A born-digital + known template (small model on text-layer words; second = template anchors); B novel layout or
 * scan of print (small VLM on image + Azure Read words; second = Textract AnalyzeExpense on its own OCR; disputed fields
 * → a blind mid-size read of the image only); C handwriting on critical fields, degraded scans, languages Textract does
 * not read (F5): mid VLM + Textract PRE-FILL a review task; C never auto-posts (review item 3).
 *
 * Shared error = the share of the primary's errors the second method repeats with the same wrong value, built by cause
 * (illustrative shares; measured per route and cause on the gold set):
 *   B: OCR misreads 40% × 0.15 (two OCR engines) + field assignment 45% × 0.15 + normalisation 15% × 0.5 = 0.2025
 *   A: no OCR (text layer is exact): assignment 80% × 0.15 + normalisation 20% × 0.5 = 0.22
 * Raw text is compared before one shared normaliser runs; a date with day ≤ 12 from a supplier with < 5 invoices of
 * history is flagged, so most normalisation errors become flags, not escapes; the 0.5 is what is left.
 * Score threshold: catches scoreCatch of the agree-wrong fields that pass the rules, and flags scoreFlag of correct
 * agreements; one illustrative trade-off curve: scoreFlag = 0.002 × (c ÷ (1 − c))² (c = 0.5 → 0.2%, 0.7 → 1.1%).
 */
type RouteParams = { p1: number; p2: number; shared: number; tie?: { resolve: number; wrong: number } };
type Scenario = {
  mix: { A: number; B: number; C: number };
  routes: { A: RouteParams; B: RouteParams };
  scoreCatch: number;
  lineFail: number;
  exception: number;
  failure: number;
  holds: number;
};
export const scoreFlagFor = (c: number) => 0.002 * (c / (1 - c)) ** 2;

export const SHARED_BY_CAUSE = {
  B: {
    ocr: { share: 0.4, shared: 0.15 },
    assignment: { share: 0.45, shared: 0.15 },
    normalisation: { share: 0.15, shared: 0.5 },
  },
  A: { assignment: { share: 0.8, shared: 0.15 }, normalisation: { share: 0.2, shared: 0.5 } },
} as const;
const sharedOf = (causes: Record<string, { share: number; shared: number }>) =>
  sum(Object.values(causes).map((c) => c.share * c.shared));
export const SHARED = { A: sharedOf(SHARED_BY_CAUSE.A), B: sharedOf(SHARED_BY_CAUSE.B) }; // 0.22, 0.2025

/**
 * Policy holds (never auto-post, whatever the score), illustrative: new or ambiguous supplier match 1.5%; sender domain not
 * aligned 1.0%; any hidden text 0.1%; near-duplicate 0.5% (same supplier and gross within ± 60 days AND the same folded
 * number in any year, a page-1 perceptual-hash match, or the same PO with identical lines; a recurring invoice with a new
 * number and period passes) → 1 − 0.985 × 0.99 × 0.999 × 0.995 ≈ 3.1%. Value caps and the money rule are applied per
 * value band in `evaluate`, not as a flat share (review R2-1).
 */
const HOLDS = 1 - (1 - 0.015) * (1 - 0.01) * (1 - 0.001) * (1 - 0.005);

export const SCENARIOS = {
  steady: {
    mix: { A: 0.55, B: 0.4, C: 0.05 },
    routes: {
      A: { p1: 0.004, p2: 0.006, shared: SHARED.A },
      B: { p1: 0.01, p2: 0.015, shared: SHARED.B, tie: { resolve: 0.7, wrong: 0.02 } },
    },
    scoreCatch: 0.5, // the floor; `solve` raises it until the count escape meets the audit budget
    lineFail: 0.03,
    exception: 0.08,
    failure: 0.015,
    holds: HOLDS,
  },
  /** Launch: route A 35% (fewer templates); primary errors × 2 (A 0.4 → 0.8%, B 1 → 2%); anchors × 2; C unchanged
   * (reviewed anyway); lines 5%, failures 2%. */
  launch: {
    mix: { A: 0.35, B: 0.6, C: 0.05 },
    routes: {
      A: { p1: 0.008, p2: 0.012, shared: SHARED.A },
      B: { p1: 0.02, p2: 0.015, shared: SHARED.B, tie: { resolve: 0.7, wrong: 0.02 } },
    },
    scoreCatch: 0.5,
    lineFail: 0.05,
    exception: 0.08,
    failure: 0.02,
    holds: HOLDS,
  },
} as const satisfies Record<string, Scenario>;

type Catches = Partial<Record<(typeof FIELDS.families)[number]["id"], number>>;

/** One route at one threshold: per-field flag and escape by family; P(no flag and ≥ 1 escape) (review item 42). */
function routeOutcome(r: RouteParams, scoreCatch: number, catches: Catches = {}) {
  const scoreFlag = scoreFlagFor(scoreCatch);
  const w = r.p1 * r.shared;
  const d = r.p1 + r.p2 - 2 * w;
  const u = (r.tie ? d * (1 - r.tie.resolve) : d) + scoreFlag * (1 - d); // per field → a person
  const tieWrong = r.tie ? d * r.tie.resolve * r.tie.wrong : 0;
  const perField = FIELDS.families.flatMap((f) =>
    f.fields.map(() => (w + tieWrong) * (1 - (catches[f.id] ?? f.rulesCatch)) * (1 - scoreCatch))
  );
  const noFlag = (1 - u) ** CRITICAL;
  const flag = 1 - noFlag;
  const escapeJoint = noFlag - prod(perField.map((e) => 1 - u - e));
  const tieBreakRate = r.tie ? 1 - (1 - d) ** CRITICAL : 0;
  const flaggedFields = flag > 0 ? (CRITICAL * u) / flag : 0;
  return {
    agreeWrong: w,
    disagree: d,
    unresolved: u,
    scoreFlag,
    flag,
    escapeJoint,
    escapeAmongAuto: escapeJoint / noFlag,
    tieBreakRate,
    flaggedFields,
  };
}

// ── Money at risk ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Expected loss of one escape (illustrative): recovery work 2 h × 30 USD + 5% of the value never recovered. The money
 * rule: an invoice auto-posts only if (its route's escape among auto-posted at the band's threshold) × loss(value) ≤ the
 * review cost (43 s ≈ 0.36 USD); the threshold rises with value until that holds, or the invoice is reviewed. The model
 * uses the route's average Σ(1 − P(correct)), a simplification of the per-invoice sum the scorer computes in production.
 * Invoice values (illustrative, from AP history): log-normal, median £1,200, σ = 1.2 → mean 1,200 × e^0.72 ≈ £2,466;
 * 40 equal-probability bands. Caps: any invoice > £50,000 reviewed; non-PO (30%) > £5,000 reviewed.
 */
export const RISK = (() => {
  const recoveryUsd = 2 * PRICES.clerkPerHour;
  const unrecovered = 0.05;
  const reviewUsd = (43 * PRICES.clerkPerHour) / 3_600; // 0.358
  const loss = (gbp: number) => recoveryUsd + unrecovered * gbp * PRICES.usdPerGbp;
  const median = 1_200;
  const sigma = 1.2;
  const bands = Array.from({ length: 40 }, (_, i) => median * Math.exp(sigma * bisect(phi, (i + 0.5) / 40, -8, 8)));
  return {
    recoveryUsd,
    unrecovered,
    reviewUsd,
    loss,
    allowedError: (gbp: number) => reviewUsd / loss(gbp),
    median,
    sigma,
    mean: median * Math.exp((sigma * sigma) / 2),
    bands,
    examples: [1_488, 5_000, 20_000].map((gbp) => ({ gbp, lossUsd: loss(gbp), allowedError: reviewUsd / loss(gbp) })),
    caps: { nonPoGbp: 5_000, anyGbp: 50_000, twoApproversGbp: 100_000 },
    shareAboveAnyCap: bands.filter((v) => v > 50_000).length / bands.length,
    shareNonPoAboveCap: (VOLUME.nonPoShare * bands.filter((v) => v > 5_000).length) / bands.length,
  };
})();

/** N1 is judged on the uniform audit only: 1,500 blind re-keys a month (4,500 a quarter); the 500 a month drawn by value
 * are a separate sample for the value-weighted escape (review R2-2). */
export const AUDIT = (() => {
  const perMonth = 1_500;
  const valuePerMonth = 500;
  const quarter = 3 * perMonth; // 4,500
  const kMax = maxPassingK(quarter, 0.003); // 7: bound 13.15 ÷ 4,500 = 0.292%
  const budget = bisect((p) => -poissonCdf(kMax, quarter * p), -0.9, 0, 0.01); // P(pass) = 90% at ≈ 0.1035%
  const pass = (escape: number) => poissonCdf(kMax, quarter * escape);
  return { perMonth, valuePerMonth, quarter, kMax, budget, pass, doubleKeyShare: 0.1 };
})();

const GRID = Array.from({ length: 197 }, (_, i) => 0.5 + i * 0.0025); // score catch 0.50 … 0.99
/** Share of auto-approved invoices sent to review as labels before posting: random 2% + band samples (10% of fields
 * within 0.004 of the threshold, ≈ 2% of accepted fields) → 0.02 + 1 − (1 − 0.002)^11 ≈ 4.2% (review R2-7). */
export const SAMPLED = 0.02 + (1 - (1 - 0.02 * 0.1) ** CRITICAL);

/**
 * The STP model with the money rule inside it. For each value band and route: caps first; then the lowest threshold on
 * the grid at or above `floor` whose escape × loss ≤ review cost; if none, the band is reviewed.
 */
export function evaluate(sc: Scenario, floor = sc.scoreCatch, catches: Catches = {}) {
  const other = (1 - sc.lineFail) * (1 - sc.exception) * (1 - sc.failure) * (1 - sc.holds);
  const grid = GRID.filter((c) => c >= floor - 1e-9);
  const table = {
    A: grid.map((c) => ({ c, o: routeOutcome(sc.routes.A, c, catches) })),
    B: grid.map((c) => ({ c, o: routeOutcome(sc.routes.B, c, catches) })),
  };
  const nb = RISK.bands.length;
  let auto = 0,
    esc = 0,
    escValue = 0,
    autoValue = 0,
    flagged = 0,
    flaggedFieldsSum = 0,
    tie = 0,
    valueReview = 0,
    escLoss = 0,
    atFloor = 0;
  for (const v of RISK.bands) {
    const capAll = v > RISK.caps.anyGbp;
    const eligible = capAll ? 0 : v > RISK.caps.nonPoGbp ? 1 - VOLUME.nonPoShare : 1;
    for (const k of ["A", "B"] as const) {
      const m = sc.mix[k] / nb;
      valueReview += m * (1 - eligible);
      if (eligible === 0) continue;
      const hit = table[k].find((t) => t.o.escapeAmongAuto * RISK.loss(v) <= RISK.reviewUsd);
      if (!hit) {
        valueReview += m * eligible;
        continue;
      }
      if (hit.c <= floor + 1e-9) atFloor += m * eligible;
      const o = hit.o;
      const a = m * eligible * (1 - o.flag) * other;
      const e = m * eligible * o.escapeJoint * other;
      auto += a;
      esc += e;
      autoValue += a * v;
      escValue += e * v;
      escLoss += e * RISK.loss(v);
      flagged += m * eligible * o.flag;
      flaggedFieldsSum += m * eligible * o.flag * o.flaggedFields;
      tie += m * eligible * o.tieBreakRate;
    }
  }
  const stpPre = auto;
  return {
    floor,
    other,
    stpPre,
    stp: stpPre * (1 - SAMPLED), // sampled invoices are touched by a clerk before posting
    escape: esc / stpPre,
    valueWeightedEscape: escValue / autoValue,
    escapeLossPerInvoice: escLoss, // expected USD lost per invoice received
    fieldFlag: flagged,
    flaggedFields: flaggedFieldsSum / flagged,
    tieBreak: tie,
    valueReview, // share of all invoices reviewed by a cap or the money rule
    atFloorShare: atFloor / (sc.mix.A + sc.mix.B),
    A: table.A[0].o,
    B: table.B[0].o,
  };
}

/** Solve the floor: the lowest threshold at which the count escape meets the uniform-audit budget. */
export function solve(sc: Scenario, catches: Catches = {}) {
  for (const c of GRID.filter((x) => x >= sc.scoreCatch - 1e-9)) {
    const r = evaluate(sc, c, catches);
    if (r.escape <= AUDIT.budget) return { ...r, pass: AUDIT.pass(r.escape) };
  }
  const r = evaluate(sc, 0.99, catches);
  return { ...r, pass: AUDIT.pass(r.escape) };
}

export const STEADY = solve(SCENARIOS.steady);
export const LAUNCH = solve(SCENARIOS.launch);
/** N2 targets, restated in round 2 so the assumed rates meet them (steady ≈ 65.9%, launch ≈ 45.0%); the curves show where
 * they fail. */
export const N2 = { launch: 0.4, steady: 0.6 } as const;

/** Shared-error curve (review item 1): escape and audit pass at the steady floor; the floor that restores the budget. */
export const SHARED_CURVE = [0.1, 0.2, 0.3, 0.5].map((shared) => {
  const sc: Scenario = {
    ...SCENARIOS.steady,
    routes: { A: { ...SCENARIOS.steady.routes.A, shared }, B: { ...SCENARIOS.steady.routes.B, shared } },
  };
  const at = evaluate(sc, STEADY.floor);
  const fixed = solve({ ...sc, scoreCatch: STEADY.floor });
  return {
    shared,
    escape: at.escape,
    stp: at.stp,
    pass: AUDIT.pass(at.escape),
    floorNeeded: fixed.floor,
    stpAfter: fixed.stp,
    n2Fails: fixed.stp < N2.steady,
  };
});

/** Rules-catch curve for the two weak families (review R2-5): STP at steady and launch after re-solving. */
export const RULES_CURVE = [
  { label: "strong", invoice_number: 0.8, dates: 0.85 },
  { label: "assumed", invoice_number: 0.6, dates: 0.7 },
  { label: "weak", invoice_number: 0.4, dates: 0.5 },
].map((p) => {
  const catches: Catches = { invoice_number: p.invoice_number, dates: p.dates };
  const s = solve(SCENARIOS.steady, catches);
  const l = solve(SCENARIOS.launch, catches);
  return {
    ...p,
    steadyStp: s.stp,
    steadyFloor: s.floor,
    launchStp: l.stp,
    launchFloor: l.floor,
    steadyMeetsN2: s.stp >= N2.steady,
    launchMeetsN2: l.stp >= N2.launch,
  };
});

/** Ablation: one reader only, rules and the steady floor on. */
export const SINGLE_METHOD = evaluate(
  { ...SCENARIOS.steady, routes: { A: { p1: 0.004, p2: 0.004, shared: 1 }, B: { p1: 0.01, p2: 0.01, shared: 1 } } },
  STEADY.floor
);

/** Tie-break sensitivity: wrong on 5% of the disputes it resolves instead of 2% (review item 13). */
export const TIE_WRONG_5 = evaluate(
  {
    ...SCENARIOS.steady,
    routes: { ...SCENARIOS.steady.routes, B: { ...SCENARIOS.steady.routes.B, tie: { resolve: 0.7, wrong: 0.05 } } },
  },
  STEADY.floor
);

/** The second reader down (Textract outage): Azure's prebuilt model on the SAME OCR as the fallback, shared 0.5. */
export const FALLBACK = solve({
  ...SCENARIOS.steady,
  routes: { ...SCENARIOS.steady.routes, B: { p1: 0.01, p2: 0.015, shared: 0.5, tie: { resolve: 0.7, wrong: 0.02 } } },
});

// ── Calibration you can check at the threshold ───────────────────────────────────────────────────────────────────────

/**
 * Labels not chosen by the scorer: the uniform audit, a random 2% of auto-approved invoices, and threshold-band samples
 * (10% of auto-approved critical fields within 0.004 of their threshold, ≈ 2% of accepted fields). The ≈ 1,817 band
 * labels a quarter split by field count over the three threshold groups (amounts 4 fields at 0.995; PO and dates 2 at
 * 0.997; kind, parties and invoice number 5 at 0.998); a calibrated scorer expects labels × (1 − threshold) errors in
 * each: 3.30 + 0.99 + 1.65 ≈ 5.9 a quarter in the band. The alarm fires at the smallest k with P(X ≥ k) ≤ 2.5% under
 * that prediction (the same one-sided 97.5% as each group's interval): k = 12, a false alarm 1.9% of quarters, and a
 * band 3× worse trips it 94% of the time.
 */
export const CALIBRATION = (() => {
  const autoPerMonth = VOLUME.invoices * STEADY.stpPre;
  const randomSlice = 0.02 * autoPerMonth;
  const bandLabelsQuarter = autoPerMonth * CRITICAL * 0.02 * 0.1 * 3;
  const thresholds = { amounts: 0.995, kind: 0.998, parties: 0.998, po: 0.997, invoiceNumber: 0.998, dates: 0.997 };
  const quantile = (lambda: number, q: number) => {
    let k = 0;
    while (poissonCdf(k, lambda) < q) k++;
    return k;
  };
  const bands = [
    { label: "amounts", threshold: thresholds.amounts, fields: 4 },
    { label: "PO, dates", threshold: thresholds.po, fields: 2 },
    { label: "kind, parties, number", threshold: thresholds.kind, fields: 5 },
  ].map((g) => {
    const labels = (bandLabelsQuarter * g.fields) / CRITICAL;
    const expected = labels * (1 - g.threshold);
    const high = quantile(expected, 0.975);
    return { ...g, labels, expected, highErrors: high, accLow: 1 - high / labels };
  });
  const expected = sum(bands.map((b) => b.expected));
  const bandPredictedError = expected / bandLabelsQuarter; // ≈ 0.33%
  let alarmAt = 1;
  while (1 - poissonCdf(alarmAt - 1, expected) > 0.025) alarmAt++;
  const falseAlarm = 1 - poissonCdf(alarmAt - 1, expected);
  const detectTriple = 1 - poissonCdf(alarmAt - 1, 3 * expected);
  return {
    autoPerMonth,
    randomSlice,
    bandLabelsQuarter,
    bandPredictedError,
    expected,
    alarmAt,
    falseAlarm,
    detectTriple,
    thresholds,
    bands,
  };
})();

// ── Review queue, sized in staff hours at ≤ 85% utilisation ──────────────────────────────────────────────────────────

/**
 * Seconds per task (illustrative, measured in the review app): field review 30 + 12 per flagged field; lines 120;
 * business exception 240; failure 360 (key the invoice); route C pre-filled review 30 + 12 × 11 = 162; policy hold 90;
 * audit 90; random calibration slice and band samples at the field-review rate; receipt 40; other mail 60; statement
 * difference 300 (20% of statements); value review (a cap or the money rule) 162, as route C; low-confidence non-PO
 * coding 60 (3% of non-PO invoices; the rest is suggested from supplier history and confirmed by the budget holder in the
 * ERP). Staff = ceil(day's hours ÷ (6 productive h × 0.85)). Cost is the roster, not the hours of work (review R2-3):
 * the normal-day team is permanent, the month-end extra is flex for 5 days, 8 paid hours a clerk-day at 30 USD an hour.
 */
export const REVIEW = (() => {
  const t = {
    fieldBase: 30,
    perField: 12,
    lines: 120,
    exception: 240,
    failure: 360,
    routeC: 30 + 12 * CRITICAL,
    hold: 90,
    audit: 90,
    receipt: 40,
    other: 60,
    statementDiff: 300,
    valueReview: 30 + 12 * CRITICAL,
    coding: 60,
  };
  const receiptFlag = 0.12;
  const capacityPerClerk = 6 * 0.85; // 5.1 h of demand a day
  const make = (o: ReturnType<typeof evaluate>, sc: Scenario) => {
    const fieldSeconds = t.fieldBase + t.perField * o.flaggedFields;
    const perInvoiceSeconds =
      o.fieldFlag * fieldSeconds +
      sc.mix.C * t.routeC +
      sc.lineFail * t.lines +
      sc.exception * t.exception +
      sc.failure * t.failure +
      sc.holds * t.hold +
      o.valueReview * t.valueReview +
      VOLUME.nonPoShare * 0.03 * t.coding;
    const inv = VOLUME.invoices;
    const autoPerMonth = inv * o.stpPre;
    const hours = {
      fields: (inv * o.fieldFlag * fieldSeconds) / 3_600,
      routeC: (inv * sc.mix.C * t.routeC) / 3_600,
      lines: (inv * sc.lineFail * t.lines) / 3_600,
      exceptions: (inv * sc.exception * t.exception) / 3_600,
      failures: (inv * sc.failure * t.failure) / 3_600,
      holds: (inv * sc.holds * t.hold) / 3_600,
      valueReview: (inv * o.valueReview * t.valueReview) / 3_600,
      coding: (inv * VOLUME.nonPoShare * 0.03 * t.coding) / 3_600,
      audit: ((AUDIT.perMonth + AUDIT.valuePerMonth) * (1 + AUDIT.doubleKeyShare) * t.audit) / 3_600,
      calibration: (autoPerMonth * SAMPLED * fieldSeconds) / 3_600,
      receipts: (VOLUME.receipts * receiptFlag * t.receipt) / 3_600,
      other: (VOLUME.other * t.other) / 3_600,
      statements: (VOLUME.statements * 0.2 * t.statementDiff) / 3_600,
    };
    const totalHours = sum(Object.values(hours));
    const flatDayHours =
      (hours.audit + hours.calibration + hours.receipts + hours.other + hours.statements) / VOLUME.workingDays;
    const dayHours = (invoices: number) => (invoices * perInvoiceSeconds) / 3_600 + flatDayHours;
    const normalDayHours = dayHours(VOLUME.normalDayInvoices);
    const monthEndDayHours = dayHours(VOLUME.monthEndDayInvoices);
    const normalDayStaff = Math.ceil(normalDayHours / capacityPerClerk);
    const monthEndDayStaff = Math.ceil(monthEndDayHours / capacityPerClerk);
    return {
      fieldSeconds,
      perInvoiceSeconds,
      hours,
      totalHours,
      extractionHours: totalHours - hours.exceptions,
      normalDayHours,
      monthEndDayHours,
      normalDayStaff,
      monthEndDayStaff,
      normalUtilisation: normalDayHours / (normalDayStaff * 6),
      monthEndUtilisation: monthEndDayHours / (monthEndDayStaff * 6),
      oneOffSickMonthEnd: monthEndDayHours / ((monthEndDayStaff - 1) * 6),
      demandUsd: totalHours * PRICES.clerkPerHour,
      paidHours:
        normalDayStaff * VOLUME.workingDays * 8 + (monthEndDayStaff - normalDayStaff) * VOLUME.monthEndDays * 8,
      monthlyUsd:
        (normalDayStaff * VOLUME.workingDays * 8 + (monthEndDayStaff - normalDayStaff) * VOLUME.monthEndDays * 8) *
        PRICES.clerkPerHour,
      permanent: normalDayStaff,
      flex: monthEndDayStaff - normalDayStaff,
    };
  };
  const steady = make(STEADY, SCENARIOS.steady);
  const launch = make(LAUNCH, SCENARIOS.launch);
  const stpPointHours = (0.01 * VOLUME.invoices * steady.fieldSeconds) / 3_600;
  // Savings arrive in steps of one clerk: a permanent clerk carries 21 × 5.1 h of demand a month.
  const stpPointsPerClerk = (VOLUME.workingDays * capacityPerClerk) / stpPointHours;
  // Today: 6 minutes keying an invoice + the same exceptions, statement checks and other mail (receipts excluded both sides).
  const todayHours =
    (VOLUME.invoices * 360) / 3_600 + steady.hours.exceptions + steady.hours.statements + steady.hours.other;
  const nowHours = steady.totalHours - steady.hours.receipts;
  return {
    nowHours,
    reduction: todayHours / nowHours,
    t,
    receiptFlag,
    capacityPerClerk,
    steady,
    launch,
    stpPointHours,
    stpPointUsd: stpPointHours * PRICES.clerkPerHour,
    stpPointsPerClerk,
    clerkMonthUsd: VOLUME.workingDays * 8 * PRICES.clerkPerHour,
    todayHours,
    // Canary audits (sheet §13): 1,000 boosted blind re-keys per canary, one canary a month, at the audit rate:
    // 1,000 × 90 s ≈ 25 h a month. Owned by the AP-ops owner (0.5 FTE, in COST.engineeringMonthly), not the clerks, so
    // they are outside totalHours and the roster.
    apOps: { canaryAuditsPerMonth: 1_000, canaryAuditHours: (1_000 * t.audit) / 3_600 },
  };
})();

// ── Cost per path, per invoice and per month ─────────────────────────────────────────────────────────────────────────

export const COST = (() => {
  const u = UNIT;
  const mix = SCENARIOS.steady.mix;
  const path = {
    A: u.commonPerInvoice + u.routeA,
    B: u.commonPerInvoice + u.smallVlm + u.second,
    BTie: u.commonPerInvoice + u.smallVlm + u.second + u.tieBreak,
    C: u.commonPerInvoice + u.midVlm + u.second,
    receiptMatch: u.perPageCommon + u.receiptVlm,
    receiptNoMatch: u.perPageCommon + u.receiptVlm + PRICES.secondPerPage,
    classifiedOnly: u.perPageCommon,
  };
  const perInvoice = mix.A * path.A + mix.B * path.B + STEADY.tieBreak * u.tieBreak + mix.C * path.C;
  const receiptNoCardMatch = 0.2;
  const perReceipt = (1 - receiptNoCardMatch) * path.receiptMatch + receiptNoCardMatch * path.receiptNoMatch;
  const otherPages = VOLUME.statements * VOLUME.statementPages + VOLUME.other;
  const modelsMonthly = VOLUME.invoices * perInvoice + VOLUME.receipts * perReceipt + otherPages * path.classifiedOnly;
  const secondShare = ((mix.B + mix.C) * u.second) / perInvoice;
  const llmPerInvoice =
    VOLUME.invoicePages * u.classifierPage +
    mix.A * u.routeA +
    mix.B * u.smallVlm +
    STEADY.tieBreak * u.tieBreak +
    mix.C * u.midVlm;
  const batchSavingMonthly =
    PRICES.batchDiscount * (VOLUME.invoices * llmPerInvoice + VOLUME.receipts * (u.classifierPage + u.receiptVlm));
  // Levers (review items 44, 45):
  const tieBreakAllB = VOLUME.invoices * mix.B * u.tieBreak - VOLUME.invoices * STEADY.tieBreak * u.tieBreak;
  const secondPages = VOLUME.invoices * (mix.B + mix.C) * VOLUME.invoicePages + receiptNoCardMatch * VOLUME.receipts;
  const midEverywhere = u.commonPerInvoice + u.midVlm + u.second;
  const midEverywhereDeltaMonthly = VOLUME.invoices * (midEverywhere - perInvoice);
  // All-in (illustrative): engineering 2.5 FTE × 12,000 + AP-ops owner (gold set, thresholds) 0.5 × 6,000; infra 800.
  const engineeringMonthly = 2.5 * 12_000 + 0.5 * 6_000;
  const infraMonthly = 800;
  const reviewMonthly = REVIEW.steady.monthlyUsd;
  const allInMonthly = modelsMonthly + reviewMonthly + engineeringMonthly + infraMonthly;
  // Buy: an AP-automation product keeps review (similar hours) and needs 0.5 FTE of integration; breakeven fee per invoice.
  const buyEngineering = 0.5 * 12_000;
  // A vendor also replaces our infrastructure (review R2-14).
  const buyBreakevenFeePerInvoice =
    (engineeringMonthly + modelsMonthly + infraMonthly - buyEngineering) / VOLUME.invoices;
  const managed = {
    bdaPerInvoice: VOLUME.invoicePages * (PRICES.bdaCustomPerPage + (FIELDS.perInvoice - 30) * PRICES.bdaPerExtraField), // 2 × 0.0435
    contentUnderstandingPerInvoice: VOLUME.invoicePages * PRICES.contentUnderstandingPerPage,
  };
  return {
    path,
    perPage: Object.fromEntries(
      Object.entries(path).map(([k, v]) => [
        k,
        k.startsWith("receipt") || k === "classifiedOnly" ? v : v / VOLUME.invoicePages,
      ])
    ),
    perInvoice,
    perInvoicePage: perInvoice / VOLUME.invoicePages,
    perReceipt,
    receiptNoCardMatch,
    modelsMonthly,
    secondShare,
    llmPerInvoice,
    batchSavingMonthly,
    tieBreakAllB,
    secondPages,
    volumeTierNote: "Textract and Azure Read volume prices start above 1M pages a month (F68, F69)",
    midEverywhere,
    midEverywhereDeltaMonthly,
    engineeringMonthly,
    infraMonthly,
    reviewMonthly,
    allInMonthly,
    allInPerDocument: allInMonthly / VOLUME.documents,
    shares: {
      review: reviewMonthly / allInMonthly,
      engineering: engineeringMonthly / allInMonthly,
      models: modelsMonthly / allInMonthly,
    },
    buyBreakevenFeePerInvoice,
    managed,
  };
})();

/** Escapes are priced too (review item 8): what one STP point and the mid model buy, in review hours and in escapes. */
export const LEVERS = (() => {
  // In demand hours; on the roster an upgrade saves money only when it removes a clerk-day (REVIEW.stpPointsPerClerk).
  const breakEvenStpPoints = COST.midEverywhereDeltaMonthly / REVIEW.stpPointUsd;
  const escapesPerMonth = VOLUME.invoices * STEADY.stpPre * STEADY.escape;
  // Value-weighted: each band's escapes × its own loss (review R2-15), not the median invoice.
  const escapeLossMonthly = VOLUME.invoices * STEADY.escapeLossPerInvoice;
  const avgLossUsd = escapeLossMonthly / escapesPerMonth;
  // The mid model everywhere pays if it adds breakEvenStpPoints, or if it cuts escapes by midDelta ÷ escapeLossMonthly.
  return {
    breakEvenStpPoints,
    avgLossUsd,
    escapesPerMonth,
    escapeLossMonthly,
    escapeCutToPay: COST.midEverywhereDeltaMonthly / escapeLossMonthly,
  };
})();

// ── Latency (ms, p50 / p95; log-normal stage fits, illustrative) ────────────────────────────────────────────────────

/**
 * Decode: small 150 tokens a second at p50, 100 at p95; mid 60 and 40. First token: small words-only 500 / 1,500;
 * small VLM 1,000 / 2,000; mid 1,500 / 3,000; receipt 800 / 1,600. Parallel branches: maxOf on log-normal fits.
 * The p95 per path is the sum of stage p95s: a conservative estimate (stage tails rarely coincide), not a proof.
 */
export const LATENCY = (() => {
  const gen = (first: Stage, tokens: number, tpsP50: number, tpsP95: number): Stage => ({
    p50: first.p50 + (tokens / tpsP50) * 1_000,
    p95: first.p95 + (tokens / tpsP95) * 1_000,
  });
  const ingest: Stage = { p50: 300, p95: 1_000 };
  const render: Stage = { p50: 500, p95: 1_200 }; // rasterise, de-rotate, content-stream hidden-text check
  const ocrPage: Stage = { p50: 1_500, p95: 4_000 };
  const classify: Stage = { p50: 600, p95: 1_500 };
  const validate: Stage = { p50: 400, p95: 1_200 }; // grounding, rules, ERP and HMRC/VIES lookups (cached a day)
  const score: Stage = { p50: 20, p95: 50 };
  const post: Stage = { p50: 500, p95: 2_000 }; // outbox write; the ERP acknowledgement is asynchronous
  const routeA = gen({ p50: 500, p95: 1_500 }, CONTEXT.output, 150, 100);
  const smallVlm = gen({ p50: 1_000, p95: 2_000 }, CONTEXT.output, 150, 100);
  const second: Stage = { p50: 4_000, p95: 12_000 }; // Textract async analyse + poll, 2 pages
  const midVlm = gen({ p50: 1_500, p95: 3_000 }, CONTEXT.output, 60, 40);
  const tieBreak = gen({ p50: 1_500, p95: 3_000 }, CONTEXT.tieBreakOutput, 60, 40);
  const receiptVlm = gen({ p50: 800, p95: 1_600 }, 300, 150, 100);
  const cardMatch: Stage = { p50: 100, p95: 300 };
  const par = (xs: Stage[]): Stage => ({ p50: maxOf(xs, 0.5), p95: maxOf(xs, 0.95) });
  const ocr2 = par([ocrPage, ocrPage]);
  const path = (stages: Stage[]) => ({
    p50: sum(stages.map((s) => s.p50)),
    p95: sum(stages.map((s) => s.p95)),
    stages,
  });
  const A = path([ingest, render, classify, routeA, validate, score, post]);
  const Bscan = path([ingest, render, ocr2, classify, par([smallVlm, second]), validate, score, post]);
  const BscanTie = path([ingest, render, ocr2, classify, par([smallVlm, second]), tieBreak, validate, score, post]);
  const CPrefill = path([ingest, render, ocr2, classify, par([midVlm, second]), validate, score]);
  const receipt = path([ingest, { p50: 300, p95: 800 }, ocrPage, classify, receiptVlm, cardMatch, score, post]);
  return {
    ingest,
    render,
    ocrPage,
    ocr2,
    classify,
    validate,
    score,
    post,
    routeA,
    smallVlm,
    second,
    midVlm,
    tieBreak,
    receiptVlm,
    pairB: par([smallVlm, second]),
    pairC: par([midVlm, second]),
    A,
    Bscan,
    BscanTie,
    CPrefill,
    receipt,
  };
})();

/** N3: straight-through posted (outbox) ≤ 2 min p50 / 10 min p95; receipt ≤ 30 s p95; field review ≤ 8 working h p95;
 * exceptions ≤ 2 working days from when the blocking record (PO, goods receipt) arrives. */
export const TARGETS = {
  stpP50Ms: 120_000,
  stpP95Ms: 600_000,
  receiptP95Ms: 30_000,
  reviewedP95WorkingHours: 8,
  exceptionWorkingDays: 2,
} as const;

// ── Gold-set gates sized to pass a release as good as today (review item 4) ───────────────────────────────────────

/**
 * Gate 1, non-inferiority on invoice-level critical accuracy (all 11 right), paired on the same 2,000 invoices (C
 * reweighted to 5%): discordant pairs ≈ 2% → SE ≈ √(0.02 ÷ 2,000) = 0.32 points; margin δ = (z95 + z90) × SE ≈ 0.93
 * points passes an equal release 90% of the time; a drop of δ is stopped 95% of the time, a drop of 0.41 points 50%.
 * Gate 2, replayed escapes, paired: escapes only one release makes ≈ Poisson(1) each; pass when new − old ≤ 2. Both are
 * smoke tests with little power (a doubling passes gate 2 most of the time, review R2-4), so every release also runs a
 * canary: 10% of suppliers for 2 weeks (≈ 2,000 invoices) with the disagreement-rate alarm and 1,000 blind audits.
 */
export const GATES = (() => {
  const n = 2_000;
  const discordant = 0.02;
  const se = Math.sqrt(discordant / n);
  const margin = (Z95 + Z90) * se;
  const lambdaDiscordant = 1;
  // P(X − Y ≤ m) for independent Poisson(λ) X, Y.
  const skellamCdf = (m: number, l: number) => {
    let p = 0;
    for (let y = 0; y < 40; y++) {
      const py = (Math.exp(-l) * l ** y) / prod(Array.from({ length: y }, (_, i) => i + 1));
      p += py * poissonCdf(y + m, l);
    }
    return p;
  };
  // Canary power: route B invoices with a dispute ≈ 20.8%; 800 B invoices → ≈ 166 disputes a fortnight. The baseline
  // is the canary suppliers' own previous fortnight (also ≈ 166, itself noisy), not a known rate, so a 30% rise is a
  // two-sample z of 0.3 × 166 ÷ √(1.3 × 166 + 166) = 0.3 × √166 ÷ √2.3 ≈ 2.55, detected (one-sided 5%) with
  // P ≈ Φ(2.55 − 1.645) ≈ 82% (≈ 99% against a known baseline).
  const canaryInvoices = VOLUME.invoices * 0.1 * 0.5;
  const canaryDisputes = canaryInvoices * SCENARIOS.steady.mix.B * STEADY.B.tieBreakRate;
  const canaryPower30 = phi((0.3 * canaryDisputes) / Math.sqrt(2.3 * canaryDisputes) - Z95);
  const canaryPower30KnownBaseline = phi(0.3 * Math.sqrt(canaryDisputes) - Z95);
  // Canary audits: 1,000 at the steady escape; stop at k ≥ 3; P(stop) when escapes double.
  const lam = 1_000 * STEADY.escape;
  const canaryAuditFalseStop = 1 - poissonCdf(2, lam);
  const canaryAuditPowerDouble = 1 - poissonCdf(2, 2 * lam);
  return {
    canaryInvoices,
    canaryDisputes,
    canaryPower30,
    canaryPower30KnownBaseline,
    canaryAuditFalseStop,
    canaryAuditPowerDouble,
    credit: { creditNotes: 60, statements: 30, bound: poissonUpper95(0) / 90 },
    n,
    discordant,
    se,
    margin,
    passIfEqual: 0.9,
    escapeMargin: 2,
    escapePassIfEqual: skellamCdf(2, lambdaDiscordant),
    poisonedBound: poissonUpper95(0) / 200,
    classifierFiles: 300,
  };
})();

// ── Exactly-once posting keys (review item 5) ────────────────────────────────────────────────────────────────────────

/**
 * Business key: supplier id | invoice number with confusables folded | the supplier's numbering year | kind. The year is
 * the invoice date's year counted from the month the supplier restarts its numbering (January unless its profile says
 * otherwise), so INV-001 of January 2027 is a new invoice, not a duplicate of INV-001 of January 2026.
 */
export function postingKey(
  supplierId: string,
  invoiceNo: string,
  invoiceDateIso: string,
  kind: "invoice" | "credit",
  resetMonth = 1
) {
  // Keep the letter prefix; fold confusables only in the part from the first digit on; drop leading zeros there.
  const raw = invoiceNo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const i = raw.search(/\d/);
  const prefix = i < 0 ? raw : raw.slice(0, i);
  const rest =
    i < 0
      ? ""
      : raw
          .slice(i)
          .replace(/O/g, "0")
          .replace(/[IL]/g, "1")
          .replace(/S/g, "5")
          .replace(/^0+(?=\d)/, "");
  const [y, m] = invoiceDateIso.split("-").map(Number);
  const numberingYear = m >= resetMonth ? y : y - 1;
  return `${supplierId}|${prefix + rest}|Y${numberingYear}|${kind}`;
}
export const POSTING = {
  example: postingKey("SUP-0193", "INV-2O417", "2026-11-03", "invoice"), // the confusable "O" folds to the same key as INV-20417
  interfaceMaxMinutes: 30, // wait past the ERP interface's maximum processing time before any status read
  reconcile: "daily: approved outbox rows ↔ ERP documents by key; missing or doubled → AP lead",
} as const;

// ── Scale: the bank's 10M documents a month, with volume tiers (review item 27) ─────────────────────────────────────

export const SCALE = (() => {
  const docs = 10_000_000;
  const pages = docs * 2;
  const tier = (n: number, first: number, over: number) =>
    Math.min(n, 1_000_000) * first + Math.max(0, n - 1_000_000) * over;
  const mix = SCENARIOS.steady.mix;
  const ocr = tier(pages, PRICES.ocrPerPage, PRICES.ocrPerPageOver1M); // 12,900
  const secondPages = docs * (mix.B + mix.C) * 2; // 9M
  const second = tier(secondPages, PRICES.secondPerPage, PRICES.secondPerPageOver1M); // 74,000
  const llm = docs * COST.llmPerInvoice;
  const render = pages * PRICES.renderPerPage;
  const modelsMonthly = ocr + second + llm + render;
  const reviewHours = (docs * REVIEW.steady.perInvoiceSeconds) / 3_600;
  return {
    docs,
    pages,
    ocr,
    second,
    llm,
    modelsMonthly,
    secondShare: second / modelsMonthly,
    batchSaving: llm * PRICES.batchDiscount,
    reviewHours,
    staff: reviewHours / (21 * 6 * 0.85),
    stpPointStaff: (0.01 * docs * REVIEW.steady.fieldSeconds) / 3_600 / (21 * 6 * 0.85),
    perSecondAverage: docs / (21 * 8 * 3_600),
  };
})();

/** Storage (review items 30, 54): originals by type; words as compressed blobs per page; field records per version. */
export const STORAGE = (() => {
  const originalsGbMonth =
    (VOLUME.invoices * 0.3 + VOLUME.statements * 0.4 + VOLUME.receipts * 2 + VOLUME.other * 0.3) / 1_000; // ≈ 72.7 GB
  const retentionMonths = 84; // 6 years + the current year
  const fieldRows = VOLUME.invoices * FIELDS.perInvoice + VOLUME.receipts * FIELDS.receipt; // 1.72M a month
  const fieldGbPerVersion = (fieldRows * 300) / 1e9; // ≈ 0.52 GB
  const wordBlobGbMonth = (VOLUME.pages * PAGE.wordsPerPage * 40) / 4 / 1e9; // 40 B a word, 4× compression ≈ 0.4 GB
  return {
    originalsGbMonth,
    originalsTbRetained: (originalsGbMonth * retentionMonths) / 1_000,
    fieldRows,
    fieldGbPerVersion,
    versionsPerDoc: 1.5,
    wordBlobGbMonth,
  };
})();

/** The worked invoice (figure doc-extract/invoice-fields): Harbourline Packaging, a smudged digit in the total. */
export const INVOICE = (() => {
  const lines = [
    { description: "Shipping boxes", quantity: 400, unitPrice: 2.0 },
    { description: "Packing tape", quantity: 200, unitPrice: 1.2 },
    { description: "Address labels", quantity: 1_000, unitPrice: 0.2 },
  ];
  const net = round(sum(lines.map((l) => l.quantity * l.unitPrice)), 2); // 1,240.00
  const vat = round(net * 0.2, 2); // 248.00
  return {
    supplier: "Harbourline Packaging",
    number: "INV-20417",
    isoDate: "2026-11-03",
    po: "PO-7731",
    lines,
    net,
    vatRate: 0.2,
    vat,
    total: round(net + vat, 2), // 1,488.00
    misread: "1,438.00", // Azure Read on the smudged 8; Textract and the image-only tie-break read 1,488.00
    fieldsOnInvoice: FIELDS.header + lines.length * FIELDS.lineFields, // 27
  };
})();

export { round };

/** The difficulty router's cheap signals (design sheet §8 step 4, §10.2): a supplier's template counts as known after
 * ≥ 5 invoices; mean OCR confidence below 0.80, handwriting on a critical field or a language the second reader does
 * not read (F5) sends an invoice to route C. Thresholds illustrative, checked against labelled misroutes. */
export const ROUTER = { templateMinInvoices: 5, minMeanOcrConfidence: 0.8 } as const;

/**
 * The worked invoice field by field (figure doc-extract/invoice-fields, sheet §9 walk-through and §15.1). Raw text from
 * the primary (small VLM, citing Azure Read word ids) and the second reader (Textract on its own OCR); the one dispute
 * is the gross total: Azure Read word 311 reads "1,438.00" at word confidence 0.71, the VLM copies it, Textract reads
 * "1,488.00" with a box overlapping word 311 at IoU 0.90, and the blind image-only tie-break reads "1,488.00".
 * P(correct) per field is ILLUSTRATIVE (what the calibrated scorer might return); thresholds are CALIBRATION.thresholds.
 */
export const INVOICE_FIELDS = (() => {
  const t = CALIBRATION.thresholds;
  const total = INVOICE.total.toLocaleString("en-GB", { minimumFractionDigits: 2 });
  const rows = [
    { field: "kind", primary: "invoice", second: "invoice", threshold: t.kind, pCorrect: 0.9995 },
    { field: "supplier", primary: "Harbourline", second: "Harbourline", threshold: t.parties, pCorrect: 0.9993 },
    {
      field: "VAT number",
      primary: "GB 284 1937 06",
      second: "GB 284 1937 06",
      threshold: t.parties,
      pCorrect: 0.9996,
    },
    { field: "bill-to", primary: "Brightpost UK", second: "Brightpost UK", threshold: t.parties, pCorrect: 0.9994 },
    { field: "number", primary: INVOICE.number, second: INVOICE.number, threshold: t.invoiceNumber, pCorrect: 0.9989 },
    { field: "date", primary: "03/11/2026", second: "03/11/2026", threshold: t.dates, pCorrect: 0.9984 },
    { field: "PO", primary: INVOICE.po, second: INVOICE.po, threshold: t.po, pCorrect: 0.999 },
    { field: "currency", primary: "GBP", second: "GBP", threshold: t.amounts, pCorrect: 0.9997 },
    { field: "net", primary: "1,240.00", second: "1,240.00", threshold: t.amounts, pCorrect: 0.9993 },
    { field: "VAT", primary: "248.00", second: "248.00", threshold: t.amounts, pCorrect: 0.9992 },
    { field: "gross", primary: INVOICE.misread, second: total, threshold: t.amounts, pCorrect: 0.9971 },
  ];
  return { rows, disputed: "gross", word: 311, wordConfidence: 0.71, iou: 0.9, tieBreak: total };
})();

/**
 * Calibration checked where it decides (figure doc-extract/calibration, sheet §13). The quarter's ≈ 1,817 band labels
 * (CALIBRATION.bandLabelsQuarter) split by field count across the three threshold groups (amounts 4 fields at 0.995;
 * PO and dates 2 at 0.997; kind, parties and invoice number 5 at 0.998). If the scorer is calibrated, the errors in a
 * group are ≈ Poisson(labels × (1 − threshold)); `accLow` is the observed accuracy at the 97.5% count, the bottom of
 * the interval a calibrated scorer stays inside (the top is 100%: zero errors is likely). The intervals are wide (up
 * to a point of accuracy), which is why the alarm pools the band: ≥ CALIBRATION.alarmAt errors of ≈ 5.9 expected.
 */
export const CALIBRATION_BANDS = CALIBRATION.bands;

/** P(X = k) for X ~ Poisson(λ), for the band-alarm figure. */
export function poissonPmf(k: number, lambda: number) {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}
