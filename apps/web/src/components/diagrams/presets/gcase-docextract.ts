// Constants and arithmetic for the "Design a Document Extraction Pipeline" case study (/genai-system-design/case-studies/
// document-extraction-pipeline; design sheet SYSTEM-DESIGN/plans/genai-design/design/document-extraction-pipeline.md,
// dossier research/document-extraction-pipeline.md, cited as "dossier F12"). Specs in assets/diagrams/animated/
// doc-extract/ import from here, so the page, the figures and the tests share one set of numbers.
//
// Running example: Brightpost's accounts-payable team (supplier invoices and credit notes, statements, employee
// receipts). Every volume, mix, error rate, review time and latency below is ILLUSTRATIVE unless a comment names a
// source. Prices are list prices as of November 2026 (read 17 November 2026):
//   - small model (Claude Haiku 5.5 class) 0.10 input / 0.01 cache read / 0.125 cache write / 0.50 output USD per million
//     tokens; mid-size (Claude Sonnet 5.5 class) 2.00 / 0.10 / 2.50 / 10.00; Batch API −50% (dossier F36);
//   - OCR 1.50 USD per 1,000 pages (Textract DetectDocumentText, Azure Read, Google Enterprise OCR: F1, F8, F12);
//   - prebuilt invoice or receipt model 10 USD per 1,000 pages (Azure prebuilt, East US; Textract AnalyzeExpense the
//     same: F3, F12); Google invoice parser 0.10 USD a document of up to 10 pages (F10); custom extractor 30 per 1,000
//     pages (F9, F12).
// Image tokens = ceil(w / 28) × ceil(h / 28) (F34). Minimum cacheable prefix 512 tokens (F39).

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const round = (x: number, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp;

/** Standard normal CDF (Abramowitz and Stegun 7.1.26) and its inverse by bisection. */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
function bisect(f: (x: number) => number, target: number, lo: number, hi: number) {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const Z95 = bisect(phi, 0.95, -8, 8); // 1.645

/** A stage's latency as a normal fit to its p50 and p95 (ms). */
type Stage = { p50: number; p95: number };
/** Quantile q of the maximum of independent parallel stages (each a normal fit): solve Π F_i(t) = q. */
export function maxOf(stages: readonly Stage[], q: number) {
  const cdf = (t: number) => stages.reduce((p, s) => p * phi(((t - s.p50) / (s.p95 - s.p50)) * Z95), 1);
  return bisect(cdf, q, 0, 1_000_000);
}

/** One-sided 95% Poisson upper bound on the count when k events were seen (k = 0 → 3.00, the rule of three). */
export function poissonUpper95(k: number) {
  const cdfAtK = (lambda: number) => {
    let term = Math.exp(-lambda);
    let total = term;
    for (let i = 1; i <= k; i++) {
      term *= lambda / i;
      total += term;
    }
    return total;
  };
  // P(X ≤ k; λ) falls as λ rises: find λ where it equals 0.05.
  return bisect((l) => -cdfAtK(l), -0.05, 0, 1_000);
}

// ── Prices ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** USD per million tokens (dossier F36) and per page (F1, F3, F8, F12), as of November 2026. */
export const PRICES = {
  small: { input: 0.1, cached: 0.01, write: 0.125, output: 0.5 },
  mid: { input: 2.0, cached: 0.1, write: 2.5, output: 10.0 },
  batchDiscount: 0.5,
  ocrPerPage: 1.5 / 1_000, // 0.0015
  prebuiltPerPage: 10 / 1_000, // 0.01 (Azure prebuilt invoice and receipt; Textract AnalyzeExpense the same)
  googleInvoicePerDoc: 0.1, // a document of up to 10 pages
  customExtractorPerPage: 30 / 1_000, // 0.03
  renderPerPage: 0.0002, // CPU to rasterise, read the text layer and compare visible text (illustrative)
  clerkPerHour: 30, // fully loaded AP clerk, USD an hour (illustrative)
} as const;

// ── Volume (Brightpost accounts payable, illustrative) ────────────────────────────────────────────────────────────────

/**
 * Per month: 40,000 supplier invoices and credit notes (2 pages each on average), 1,000 statements (3 pages, reconciled,
 * never posted), 30,000 employee receipts (1 photo each), 1,000 other files (classified out, 1 page).
 *   documents 40,000 + 1,000 + 30,000 + 1,000 = 72,000; pages 80,000 + 3,000 + 30,000 + 1,000 = 114,000.
 * 21 working days; 35% of invoices arrive in the last 5 working days (month end):
 *   normal day 40,000 × 0.65 ÷ 16 = 1,625 invoices; month-end day 40,000 × 0.35 ÷ 5 = 2,800.
 * Peak hour = 15% of a day's arrivals: 0.15 × 2,800 = 420 invoices an hour. Receipts spread evenly: 30,000 ÷ 21 ≈ 1,429.
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
  const peakHourShare = 0.15;
  const peakHourInvoices = peakHourShare * monthEndDayInvoices; // 420
  const peakDocsPerSecond = (peakHourInvoices + receiptsPerDay * peakHourShare) / 3_600; // (420 + 214) ÷ 3,600 ≈ 0.18
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
    peakHourShare,
    peakHourInvoices,
    peakDocsPerSecond,
  };
})();

/**
 * Fields. Invoice: 12 header fields + 5 line items × 5 fields (description, quantity, unit price, VAT rate, net amount:
 * HMRC Notice 700 16.3.1 asks for quantity, VAT rate and net amount per item, dossier F51) = 37.
 * 8 critical fields gate posting: supplier, invoice number, invoice date, currency, net total, VAT total, gross total,
 * PO number. Line items are gated by arithmetic (Σ lines = net total; quantity × unit price = line net), not field by
 * field. Bank details are never extracted for payment: they come from the supplier master.
 * Receipt: 8 fields, 4 critical (merchant, date, total, VAT).
 */
export const FIELDS = {
  header: 12,
  lineItems: 5,
  lineFields: 5,
  perInvoice: 12 + 5 * 5, // 37
  critical: 8,
  receipt: 8,
  receiptCritical: 4,
} as const;

// ── The extraction call's context ────────────────────────────────────────────────────────────────────────────────────

/**
 * One page rasterised by us at 150 DPI (A4 1240 × 1754 px, the minimum Textract recommends, F5): ceil(1240/28) = 45 ×
 * ceil(1754/28) = 63 = 2,835 image tokens, inside the high-resolution tier's 4,784 so it is not resized and word boxes
 * map one to one (F34, F35). OCR words with ids: 350 words a page × 5 tokens ("w123 1,488.00") = 1,750 tokens.
 */
export const PAGE = (() => {
  const widthPx = 1_240;
  const heightPx = 1_754;
  const imageTokens = Math.ceil(widthPx / 28) * Math.ceil(heightPx / 28); // 45 × 63 = 2,835
  const wordsPerPage = 350;
  const tokensPerWord = 5;
  return {
    dpi: 150,
    widthPx,
    heightPx,
    imageTokens,
    wordsPerPage,
    tokensPerWord,
    wordTokens: wordsPerPage * tokensPerWord,
  };
})();

/**
 * The extraction call for a 2-page invoice (figure doc-extract/context-window). Stable blocks first, so they are cached
 * (1,500 ≥ the 512-token minimum, F39); images come after the cached prefix because adding images invalidates the
 * messages cache from that point (F39).
 *   stable 900 + 600 = 1,500; changing 400 + 5,670 + 3,500 = 9,570; total 11,070. Output 800 tokens (37 fields × ≈ 20,
 *   with word ids).
 */
export const CONTEXT = (() => {
  const pages = VOLUME.invoicePages;
  const blocks = [
    { id: "instructions", label: "Instructions", tokens: 900, stable: true },
    { id: "schema", label: "Schema", tokens: 600, stable: true },
    { id: "hints", label: "Supplier hints", tokens: 400, stable: false },
    { id: "images", label: "Page images", tokens: pages * PAGE.imageTokens, stable: false },
    { id: "words", label: "OCR words", tokens: pages * PAGE.wordTokens, stable: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 11,070
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,500
  const wordsOnlyChanging = 400 + pages * PAGE.wordTokens; // route A sends no image: 3,900
  return { blocks, total, stable, changing: total - stable, wordsOnlyChanging, output: 800, tieBreakOutput: 150 };
})();

// ── Unit costs (USD) ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Model calls, per invoice:
 *   page classifier (small, per page): 600 cached + 1,750 words + 30 out = 0.000006 + 0.000175 + 0.000015 = 0.000196
 *   route A, small, words only: 1,500 cached + 3,900 + 800 out = 0.000015 + 0.00039 + 0.0004 = 0.000805
 *   small VLM (route B): 1,500 cached + 9,570 + 800 out = 0.000015 + 0.000957 + 0.0004 = 0.001372
 *   mid VLM (route C): 1,500 × 0.10 + 9,570 × 2.00 + 800 × 10 per million = 0.00015 + 0.01914 + 0.008 = 0.02729
 *   mid tie-break (blind, disputed fields only): same input, 150 out = 0.00015 + 0.01914 + 0.0015 = 0.02079
 *   prebuilt second opinion: 2 pages × 0.01 = 0.02
 * Receipt (1 photo resized to 900 × 1,600 px: 33 × 58 = 1,914 image tokens; 120 words × 5 = 600 word tokens; 1,200-token
 * cached receipt prefix; 250 out): 0.000012 + 0.000251 + 0.000125 = 0.000388.
 */
export const UNIT = (() => {
  const s = PRICES.small;
  const m = PRICES.mid;
  const p = VOLUME.invoicePages;
  const classifierPage = usd(600, s.cached) + usd(PAGE.wordTokens, s.input) + usd(30, s.output);
  const routeA =
    usd(CONTEXT.stable, s.cached) + usd(CONTEXT.wordsOnlyChanging, s.input) + usd(CONTEXT.output, s.output);
  const smallVlm = usd(CONTEXT.stable, s.cached) + usd(CONTEXT.changing, s.input) + usd(CONTEXT.output, s.output);
  const midVlm = usd(CONTEXT.stable, m.cached) + usd(CONTEXT.changing, m.input) + usd(CONTEXT.output, m.output);
  const tieBreak =
    usd(CONTEXT.stable, m.cached) + usd(CONTEXT.changing, m.input) + usd(CONTEXT.tieBreakOutput, m.output);
  const prebuilt = p * PRICES.prebuiltPerPage;
  const perPageCommon = PRICES.ocrPerPage + PRICES.renderPerPage + classifierPage; // OCR runs on every page (hidden-text check)
  const commonPerInvoice = p * perPageCommon;
  const receiptImageTokens = Math.ceil(900 / 28) * Math.ceil(1_600 / 28); // 33 × 58 = 1,914
  const receiptVlm = usd(1_200, s.cached) + usd(receiptImageTokens + 600, s.input) + usd(250, s.output);
  // Stable-prefix cache writes: at most one per 5 minutes per model and schema; 288 a day × 1,500 tokens × 2.50 per
  // million (mid, the dearer) ≈ 1.08 USD a day (≈ 23 USD a month): inside the infrastructure line, not per document.
  const cacheWritesPerDay = 288 * usd(CONTEXT.stable, m.write);
  return {
    classifierPage,
    routeA,
    smallVlm,
    midVlm,
    tieBreak,
    prebuilt,
    perPageCommon,
    commonPerInvoice,
    receiptImageTokens,
    receiptVlm,
    cacheWritesPerDay,
  };
})();

// ── Difficulty router and the error model ───────────────────────────────────────────────────────────────────────────

/**
 * Routes (by page type and layout):
 *   A: born-digital PDF + known template (supplier seen ≥ 5 times with a stable layout fingerprint) → small model on
 *      the text-layer words; second method = the supplier's template rules (anchors learned from reviewed invoices).
 *   B: born-digital with a novel layout, or a scan or photo of print → small VLM on image + OCR words; second method =
 *      a prebuilt invoice model; any disagreement on a critical field → a blind mid-size tie-break on those fields.
 *   C: handwriting on critical fields, or a degraded scan (mean OCR word confidence < 0.80) → mid VLM; second method =
 *      the prebuilt model; disagreements go to people.
 *
 * Per critical field: p1 = primary error, p2 = second-method error, shared = share of the primary's errors that the
 * second method repeats with the same wrong value (correlated errors; the number that decides what agreement is worth
 * and is measured on the gold set). agreeWrong w = p1 × shared; disagree d = p1 + p2 − 2w (both-wrong-differently
 * ignored). Rules (arithmetic, VAT, HMRC VAT-number lookup, PO and goods receipt, card feed, duplicates, date
 * plausibility) catch rulesCatch of agree-wrong errors. Tie-break (route B): resolves tieResolve of disputed fields;
 * of those, tieWrong are resolved to the wrong value before rules.
 */
type RouteParams = { p1: number; p2: number; shared: number; tie?: { resolve: number; wrong: number } };
type Scenario = {
  mix: { A: number; B: number; C: number };
  routes: { A: RouteParams; B: RouteParams; C: RouteParams };
  rulesCatch: number;
  scoreCatch: number;
  scoreFlag: number;
  lineFail: number;
  exception: number;
  failure: number;
};

export const SCENARIOS = {
  /** Twelve months in: templates for the top suppliers, supplier hints from corrections, a recalibrated scorer. */
  steady: {
    mix: { A: 0.55, B: 0.4, C: 0.05 },
    routes: {
      A: { p1: 0.004, p2: 0.006, shared: 0.1 },
      B: { p1: 0.01, p2: 0.015, shared: 0.1, tie: { resolve: 0.7, wrong: 0.003 } },
      C: { p1: 0.03, p2: 0.06, shared: 0.1 },
    },
    rulesCatch: 0.85,
    scoreCatch: 0.3, // calibrated score below threshold on 30% of the agree-wrong fields that pass the rules
    scoreFlag: 0.002, // and on 0.2% of agreeing fields that are in fact correct (the price of the threshold)
    lineFail: 0.03, // lines do not add up (dropped or split rows)
    exception: 0.08, // business exceptions: PO price or quantity variance, no goods receipt, new supplier, duplicate suspicion, bank mismatch
    failure: 0.015, // unreadable, classifier unsure, missing pages, unsupported language → keyed by a person
  },
  /** Launch: fewer learned templates (A 35%), no supplier hints yet (primary errors × 2), template rules × 2. */
  launch: {
    mix: { A: 0.35, B: 0.6, C: 0.05 },
    routes: {
      A: { p1: 0.008, p2: 0.012, shared: 0.1 },
      B: { p1: 0.02, p2: 0.015, shared: 0.1, tie: { resolve: 0.7, wrong: 0.003 } },
      C: { p1: 0.045, p2: 0.06, shared: 0.1 },
    },
    rulesCatch: 0.85,
    scoreCatch: 0.6, // launch threshold set conservatively on the shadow-month labels
    scoreFlag: 0.01,
    lineFail: 0.05,
    exception: 0.08,
    failure: 0.02,
  },
} as const satisfies Record<string, Scenario>;

/** Per-route outcome for one invoice: flag rate, tie-break rate, escaped critical errors, flagged fields when flagged. */
function routeOutcome(r: RouteParams, sc: Pick<Scenario, "rulesCatch" | "scoreCatch" | "scoreFlag">, n: number) {
  const w = r.p1 * r.shared;
  const d = r.p1 + r.p2 - 2 * w;
  // Per field, goes to a person: an unresolved disagreement, or an agreement whose calibrated score is below threshold.
  const unresolved = (r.tie ? d * (1 - r.tie.resolve) : d) + sc.scoreFlag * (1 - d);
  const tieEscape = r.tie ? d * r.tie.resolve * r.tie.wrong : 0;
  const escapePerField = (w + tieEscape) * (1 - sc.rulesCatch) * (1 - sc.scoreCatch);
  const flag = 1 - (1 - unresolved) ** n;
  const tieBreakRate = r.tie ? 1 - (1 - d) ** n : 0; // invoices that call the mid model
  const escape = 1 - (1 - escapePerField) ** n; // invoice-level, before conditioning on not flagged
  const flaggedFields = flag > 0 ? (n * unresolved) / flag : 0; // expected flagged fields given ≥ 1
  return { agreeWrong: w, disagree: d, unresolved, escapePerField, flag, tieBreakRate, escape, flaggedFields };
}

/**
 * The outcome of a scenario: straight-through rate (STP), review mix, escape rate among auto-posted invoices.
 * STP = Σ_r mix_r × (1 − flag_r) × (1 − lineFail) × (1 − exception) × (1 − failure).
 * Escape (auto-posted invoices with a wrong critical field) = Σ_r mix_r × escape_r × (other passes) ÷ STP.
 */
export function outcome(sc: Scenario) {
  const n = FIELDS.critical;
  const r = {
    A: routeOutcome(sc.routes.A, sc, n),
    B: routeOutcome(sc.routes.B, sc, n),
    C: routeOutcome(sc.routes.C, sc, n),
  };
  const keys = ["A", "B", "C"] as const;
  const other = (1 - sc.lineFail) * (1 - sc.exception) * (1 - sc.failure);
  const fieldFlag = sum(keys.map((k) => sc.mix[k] * r[k].flag));
  const stp = sum(keys.map((k) => sc.mix[k] * (1 - r[k].flag))) * other;
  const escaped = sum(keys.map((k) => sc.mix[k] * r[k].escape)) * other;
  const escape = escaped / stp;
  const tieBreak = sc.mix.B * r.B.tieBreakRate; // share of all invoices
  const flaggedFields = sum(keys.map((k) => sc.mix[k] * r[k].flag * r[k].flaggedFields)) / fieldFlag;
  return { routes: r, fieldFlag, stp, escape, tieBreak, flaggedFields, other };
}

export const STEADY = outcome(SCENARIOS.steady);
export const LAUNCH = outcome(SCENARIOS.launch);

/** Sensitivity: if the second method repeats 30% of the primary's errors instead of 10%. */
export const SHARED_30 = outcome({
  ...SCENARIOS.steady,
  routes: {
    A: { ...SCENARIOS.steady.routes.A, shared: 0.3 },
    B: { ...SCENARIOS.steady.routes.B, shared: 0.3 },
    C: { ...SCENARIOS.steady.routes.C, shared: 0.3 },
  },
});

/** Ablation: one method only (no second opinion, no tie-break), rules and the score threshold still on. */
export const SINGLE_METHOD = (() => {
  const sc = SCENARIOS.steady;
  const escapePerField = (k: "A" | "B" | "C") => sc.routes[k].p1 * (1 - sc.rulesCatch) * (1 - sc.scoreCatch);
  const escaped = sum(
    (["A", "B", "C"] as const).map((k) => sc.mix[k] * (1 - (1 - escapePerField(k)) ** FIELDS.critical))
  );
  return { escape: escaped }; // see the sheet §13: several times the N1 bound
})();

// ── Review queue, sized in staff hours ───────────────────────────────────────────────────────────────────────────────

/**
 * Seconds per review (illustrative): field review 30 s + 12 s per flagged field (the clerk sees the page with the
 * flagged boxes highlighted); lines that do not add up 120 s; business exception 240 s; extraction failure 360 s (key
 * the invoice, as today's 6 minutes); audit 90 s (blind re-key of the 8 critical fields); receipt 40 s.
 * A flagged invoice may have several reasons; we count each reason's time (an upper bound).
 */
export const REVIEW = (() => {
  const t = { fieldBase: 30, perField: 12, lines: 120, exception: 240, failure: 360, audit: 90, receipt: 40 };
  const receiptFlag = 0.12; // no card-feed match, or extractors disagree (illustrative)
  const auditPerMonth = 1_000;
  const productiveHoursPerDay = 6;
  const make = (o: ReturnType<typeof outcome>, sc: Scenario) => {
    const fieldSeconds = t.fieldBase + t.perField * o.flaggedFields;
    const perInvoiceSeconds =
      o.fieldFlag * fieldSeconds + sc.lineFail * t.lines + sc.exception * t.exception + sc.failure * t.failure;
    const inv = VOLUME.invoices;
    const hours = {
      fields: (inv * o.fieldFlag * fieldSeconds) / 3_600,
      lines: (inv * sc.lineFail * t.lines) / 3_600,
      exceptions: (inv * sc.exception * t.exception) / 3_600,
      failures: (inv * sc.failure * t.failure) / 3_600,
      audit: (auditPerMonth * t.audit) / 3_600,
      receipts: (VOLUME.receipts * receiptFlag * t.receipt) / 3_600,
    };
    const totalHours = sum(Object.values(hours));
    const extractionHours = totalHours - hours.exceptions; // exceptions are AP work with or without extraction
    const receiptDayHours = (VOLUME.receiptsPerDay * receiptFlag * t.receipt) / 3_600;
    const dayHours = (invoices: number) =>
      (invoices * perInvoiceSeconds) / 3_600 + receiptDayHours + hours.audit / VOLUME.workingDays;
    const normalDayHours = dayHours(VOLUME.normalDayInvoices);
    const monthEndDayHours = dayHours(VOLUME.monthEndDayInvoices);
    return {
      fieldSeconds,
      perInvoiceSeconds,
      hours,
      totalHours,
      extractionHours,
      normalDayHours,
      monthEndDayHours,
      normalDayStaff: Math.ceil(normalDayHours / productiveHoursPerDay),
      monthEndDayStaff: Math.ceil(monthEndDayHours / productiveHoursPerDay),
      // Peak hour at month end: arrivals' review work in clerk-hours per hour; the backlog drains the same day when the
      // day's capacity (staff × 6 h) exceeds the day's demand.
      peakHourWorkHours: (VOLUME.peakHourInvoices * perInvoiceSeconds) / 3_600,
      monthlyUsd: totalHours * PRICES.clerkPerHour,
    };
  };
  const steady = make(STEADY, SCENARIOS.steady);
  const launch = make(LAUNCH, SCENARIOS.launch);
  // One STP point moved out of field review = 1% of invoices × the field-review time.
  const stpPointHours = (0.01 * VOLUME.invoices * steady.fieldSeconds) / 3_600;
  const manualHours = (VOLUME.invoices * 6 * 60) / 3_600; // today: 6 minutes an invoice = 4,000 h
  return {
    t,
    receiptFlag,
    auditPerMonth,
    productiveHoursPerDay,
    steady,
    launch,
    stpPointHours,
    stpPointUsd: stpPointHours * PRICES.clerkPerHour,
    manualHours,
    manualUsd: manualHours * PRICES.clerkPerHour,
  };
})();

// ── Cost per invoice, per page and per month ─────────────────────────────────────────────────────────────────────────

/**
 * Per invoice (steady): common (OCR, render, classifier on 2 pages) + route A small (55%) + route B small VLM + prebuilt
 * (40%) + tie-break on the B invoices that disagree + route C mid VLM + prebuilt (5%).
 */
export const COST = (() => {
  const u = UNIT;
  const mix = SCENARIOS.steady.mix;
  const perInvoiceModels =
    mix.A * u.routeA +
    mix.B * (u.smallVlm + u.prebuilt) +
    STEADY.tieBreak * u.tieBreak +
    mix.C * (u.midVlm + u.prebuilt);
  const perInvoice = u.commonPerInvoice + perInvoiceModels;
  const perInvoicePage = perInvoice / VOLUME.invoicePages;
  // Receipts: common for 1 page + receipt VLM + prebuilt receipt model only when the card feed has no match (20%).
  const receiptNoCardMatch = 0.2;
  const perReceipt = u.perPageCommon + u.receiptVlm + receiptNoCardMatch * PRICES.prebuiltPerPage;
  const otherPages = VOLUME.statements * VOLUME.statementPages + VOLUME.other; // 4,000 pages: classified only
  const otherUsd = otherPages * u.perPageCommon;
  const invoicesUsd = VOLUME.invoices * perInvoice;
  const receiptsUsd = VOLUME.receipts * perReceipt;
  const modelsMonthly = invoicesUsd + receiptsUsd + otherUsd;
  // LLM share (the part Batch would halve): everything except OCR, render and prebuilt.
  const llmPerInvoice =
    VOLUME.invoicePages * u.classifierPage +
    mix.A * u.routeA +
    mix.B * u.smallVlm +
    STEADY.tieBreak * u.tieBreak +
    mix.C * u.midVlm;
  const batchSavingMonthly =
    PRICES.batchDiscount * (VOLUME.invoices * llmPerInvoice + VOLUME.receipts * (u.classifierPage + u.receiptVlm));
  // Alternatives per invoice (same OCR and render, no routing):
  const midEverywhere = u.commonPerInvoice + u.midVlm + u.prebuilt;
  const midEverywhereDeltaMonthly = VOLUME.invoices * (midEverywhere - perInvoice);
  const breakEvenStpPoints = midEverywhereDeltaMonthly / REVIEW.stpPointUsd;
  const buy = {
    prebuiltOnly: VOLUME.invoicePages * PRICES.prebuiltPerPage, // 0.02, one method, no grounding to our schema
    googleInvoice: PRICES.googleInvoicePerDoc, // 0.10 for up to 10 pages
    customExtractor: VOLUME.invoicePages * PRICES.customExtractorPerPage, // 0.06
  };
  // All-in per month (illustrative): models and services + review people + 1 ML/platform engineer + infrastructure
  // (workflow engine, PostgreSQL, object storage for 7 years of originals ≈ 2.4 TB, render workers, review app).
  const engineerMonthly = 12_000;
  const infraMonthly = 800;
  const reviewMonthly = REVIEW.steady.monthlyUsd;
  const allInMonthly = modelsMonthly + reviewMonthly + engineerMonthly + infraMonthly;
  const allInPerDocument = allInMonthly / VOLUME.documents;
  const allInPerInvoiceExReceipts =
    (allInMonthly -
      receiptsUsd -
      (VOLUME.receipts * REVIEW.receiptFlag * REVIEW.t.receipt * PRICES.clerkPerHour) / 3_600) /
    VOLUME.invoices;
  return {
    perInvoiceModels,
    perInvoice,
    perInvoicePage,
    perReceipt,
    receiptNoCardMatch,
    otherUsd,
    invoicesUsd,
    receiptsUsd,
    modelsMonthly,
    llmPerInvoice,
    batchSavingMonthly,
    midEverywhere,
    midEverywhereDeltaMonthly,
    breakEvenStpPoints,
    buy,
    engineerMonthly,
    infraMonthly,
    reviewMonthly,
    allInMonthly,
    allInPerDocument,
    allInPerInvoiceExReceipts,
    peopleShare: reviewMonthly / allInMonthly,
    modelShare: modelsMonthly / allInMonthly,
  };
})();

// ── Latency per document type, p50 and p95 (ms, illustrative stage fits) ───────────────────────────────────────────

/**
 * Decode: small model 150 tokens a second at p50, 100 at p95; mid 60 and 40. First token: small words-only 500 / 1,500;
 * small VLM 1,000 / 2,000; mid 1,500 / 3,000; receipt VLM 800 / 1,600. No vendor publishes these: illustrative.
 * Parallel work is the maximum of its branches (maxOf), at p50 and p95; sequential stages add. p95 per path is the sum
 * of stage p95s, an upper bound (stage tails rarely coincide); the targets are minutes, so the bound is enough.
 */
export const LATENCY = (() => {
  const gen = (first: Stage, tokens: number, tpsP50: number, tpsP95: number): Stage => ({
    p50: first.p50 + (tokens / tpsP50) * 1_000,
    p95: first.p95 + (tokens / tpsP95) * 1_000,
  });
  const ingest: Stage = { p50: 300, p95: 1_000 }; // webhook, store original, hash, dedup lookup
  const render: Stage = { p50: 400, p95: 1_000 }; // rasterise, text layer, per page in parallel
  const ocrPage: Stage = { p50: 1_500, p95: 4_000 };
  const classify: Stage = { p50: 600, p95: 1_500 };
  const validate: Stage = { p50: 300, p95: 1_000 }; // grounding check, rules, ERP lookups (supplier, PO, GRN, duplicates)
  const score: Stage = { p50: 20, p95: 50 };
  const post: Stage = { p50: 500, p95: 2_000 }; // outbox → ERP
  const routeA = gen({ p50: 500, p95: 1_500 }, CONTEXT.output, 150, 100); // 5,833 / 9,500
  const smallVlm = gen({ p50: 1_000, p95: 2_000 }, CONTEXT.output, 150, 100); // 6,333 / 10,000
  const prebuilt: Stage = { p50: 4_000, p95: 12_000 }; // asynchronous analyse + poll, 2 pages
  const midVlm = gen({ p50: 1_500, p95: 3_000 }, CONTEXT.output, 60, 40); // 14,833 / 23,000
  const tieBreak = gen({ p50: 1_500, p95: 3_000 }, CONTEXT.tieBreakOutput, 60, 40); // 4,000 / 6,750
  const receiptVlm = gen({ p50: 800, p95: 1_600 }, 250, 150, 100); // 2,467 / 4,100
  const cardMatch: Stage = { p50: 100, p95: 300 };
  const ocr2 = { p50: maxOf([ocrPage, ocrPage], 0.5), p95: maxOf([ocrPage, ocrPage], 0.95) }; // two pages in parallel
  const pair = (a: Stage, b: Stage): Stage => ({ p50: maxOf([a, b], 0.5), p95: maxOf([a, b], 0.95) });
  const path = (stages: Stage[]) => ({
    p50: sum(stages.map((s) => s.p50)),
    p95: sum(stages.map((s) => s.p95)),
    stages,
  });
  // Digital (A): OCR for the hidden-text check runs beside extraction, off the critical path.
  const A = path([ingest, render, classify, routeA, validate, score, post]);
  const Bdigital = path([ingest, render, classify, pair(smallVlm, prebuilt), validate, score, post]);
  const Bscan = path([ingest, render, ocr2, classify, pair(smallVlm, prebuilt), validate, score, post]);
  const BscanTie = path([ingest, render, ocr2, classify, pair(smallVlm, prebuilt), tieBreak, validate, score, post]);
  const C = path([ingest, render, ocr2, classify, pair(midVlm, prebuilt), validate, score, post]);
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
    prebuilt,
    midVlm,
    tieBreak,
    receiptVlm,
    A,
    Bdigital,
    Bscan,
    BscanTie,
    C,
    receipt,
  };
})();

/** Targets (N3): straight-through invoice posted ≤ 2 min p50, ≤ 10 min p95; receipt result ≤ 30 s p95. */
export const TARGETS = {
  stpP50Ms: 120_000,
  stpP95Ms: 600_000,
  receiptP95Ms: 30_000,
  reviewedP95WorkingHours: 8,
} as const;

// ── Evaluation, gates and audit statistics ───────────────────────────────────────────────────────────────────────────

/**
 * Gold set: 2,000 invoices (A 700, B 900 = 300 novel digital + 600 scans, C 400 oversampled), 500 receipts, 300
 * multi-document and long files (splitting), 200 poisoned documents (hidden text, fake bank details, fake approvals).
 * 95% interval half-width on critical-field accuracy at 99%: 1.96 × √(0.99 × 0.01 ÷ 16,000) ≈ 0.15 points (all
 * routes); route B 7,200 fields ≈ 0.23. STP on 2,000 invoices at 80%: ± 1.75 points, so releases compare paired
 * (McNemar) on the same documents.
 * Audit: 1,000 auto-posted invoices a month, blind re-key; a quarter = 3,000. At the steady escape rate the expected
 * count is 3,000 × escape; N1 holds when the Poisson 95% upper bound ÷ 3,000 ≤ 0.3%.
 */
export const EVAL = (() => {
  const half = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  const quarter = 3_000;
  const expected = quarter * STEADY.escape;
  const k = Math.round(expected);
  const upper = poissonUpper95(k) / quarter;
  const kShared30 = Math.round(quarter * SHARED_30.escape);
  const kLaunch = Math.round(quarter * LAUNCH.escape);
  return {
    gold: { A: 700, B: 900, C: 400, invoices: 2_000, receipts: 500, splitting: 300, poisoned: 200 },
    criticalHalfWidth: half(0.99, 2_000 * FIELDS.critical), // 0.0015
    routeBHalfWidth: half(0.99, 900 * FIELDS.critical), // 0.0023
    stpHalfWidth: half(0.8, 2_000), // 0.0175
    auditQuarter: quarter,
    expectedEscapes: expected,
    k,
    upperBound: upper, // must be ≤ 0.003
    kShared30,
    upperBoundShared30: poissonUpper95(kShared30) / quarter,
    kLaunch,
    upperBoundLaunch: poissonUpper95(kLaunch) / quarter,
    ruleOfThree: poissonUpper95(0), // 3.00
    poisonedBound: poissonUpper95(0) / 200, // 0 of 200 followed → ≤ 1.5%
    n1: 0.003,
  };
})();

// ── The same design at the bank's 10M documents a month ──────────────────────────────────────────────────────────────

/**
 * 10,000,000 documents a month at 2 pages = 20M pages; review at the steady per-invoice review time
 * (REVIEW.steady.perInvoiceSeconds) → hours and staff at 126 productive hours a clerk a month; models at our per-invoice
 * cost; Batch would halve the LLM lines; a self-hosted 7B VLM is ≈ 176 USD per million pages on its authors' hardware
 * (dossier F23).
 */
export const SCALE = (() => {
  const docs = 10_000_000;
  const pages = docs * 2;
  const reviewHours = (docs * REVIEW.steady.perInvoiceSeconds) / 3_600;
  const staff = reviewHours / 126;
  const modelsMonthly = docs * COST.perInvoice;
  const batchSaving = docs * COST.llmPerInvoice * PRICES.batchDiscount;
  const selfHostedPerMonth = (pages / 1_000_000) * 176;
  const perSecondAverage = docs / (VOLUME.workingDays * 8 * 3_600); // over working hours
  return {
    docs,
    pages,
    reviewHours,
    staff,
    modelsMonthly,
    batchSaving,
    selfHostedPerMonth,
    perSecondAverage,
    stpPointStaff: (0.01 * docs * REVIEW.steady.fieldSeconds) / 3_600 / 126,
  };
})();

/** The worked invoice (figure doc-extract/invoice-fields): Harbourline Packaging, 3 lines. */
export const INVOICE = (() => {
  const lines = [
    { description: "Shipping boxes", quantity: 400, unitPrice: 2.0 },
    { description: "Packing tape", quantity: 200, unitPrice: 1.2 },
    { description: "Address labels", quantity: 1_000, unitPrice: 0.2 },
  ];
  const net = round(sum(lines.map((l) => l.quantity * l.unitPrice)), 2); // 800 + 240 + 200 = 1,240.00
  const vatRate = 0.2;
  const vat = round(net * vatRate, 2); // 248.00
  return {
    supplier: "Harbourline Packaging",
    number: "INV-20417",
    printedDate: "03/11/2026",
    isoDate: "2026-11-03",
    po: "PO-7731",
    lines,
    net,
    vatRate,
    vat,
    total: round(net + vat, 2), // 1,488.00
    fieldsOnInvoice: FIELDS.header + lines.length * FIELDS.lineFields, // 12 + 15 = 27
  };
})();

export { round };
