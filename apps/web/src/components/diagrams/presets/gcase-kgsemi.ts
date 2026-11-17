// Constants and arithmetic for the "Design a Yield Root-Cause Assistant on a Fab Knowledge Graph" case study
// (/genai-system-design/case-studies/kg-semiconductor-case-study; design sheet SYSTEM-DESIGN/plans/genai-design/design/
// kg-semiconductor-case-study.md v1; dossier research/kg-semiconductor-case-study.md, facts cited as "dossier F12").
// Specs in assets/diagrams/animated/kg-semi/ import from here, so the page, the figures and the tests share one set
// of numbers.
//
// This page is NOT Brightpost. It defines its own ILLUSTRATIVE fab ("the fab"): one 300 mm logic fab, 40,000 wafer
// starts a month, an 800-step route, 1,100 tools. NO primary production write-up of an LLM + knowledge-graph
// root-cause system in a fab exists (dossier, research honesty note): every volume, mix, rate, latency, salary,
// licence fee and unit cost below is an ESTIMATE unless a comment names a source. Paper results are quoted on the
// page with their paper and task, not used as inputs here.
//
// Sources used for numbers (dossier): trace sampling "from about once per second to every tens of milliseconds" and
// "hundreds of sensor parameters" (F33) set the 10 Hz × 200-parameter trace; 25-wafer FOUP lots (F32, F39);
// gpt-oss-120b fits one 80 GB GPU (F44); ≈ 100 tokens a second per stream while an H100 serves ≈ 5,900 tokens a
// second (F45, a benchmark mirror; used as an estimate). Hosted-model list prices (only for the rejected hosted
// option) and the illustrative 2.5 USD GPU-hour are imported from the answer-engine preset so a price has one value
// across the site. maxOfParts (the maximum of independent normal draws) is imported from the healthcare preset.
//
// Latency: parallel stages are the maximum of their draws (maxOfParts), at p50 and p95. p95 per path is p50 + the
// root-sum-square of stage spreads (p95 − p50). The gated case treats the stages on the shared model server as fully
// correlated: their spreads add linearly, then combine with the other stages by root-sum-square. Mixed routes
// (template vs generated query, repaired queries) use mixtureQuantile.

import { mixtureQuantile, PRICES } from "./gcase-answer";
import { maxOfParts } from "./gcase-kghealth";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));

type Dist = { p50: number; p95: number };
type Stage = Dist & { id: string; model?: boolean };

const stage = (id: string, p50: number, p95: number, model = false): Stage => ({ id, p50, p95, model });
const maxDist = (parts: readonly Dist[]): Dist => ({ p50: maxOfParts(parts, 0.5), p95: maxOfParts(parts, 0.95) });
const par = (id: string, parts: readonly Dist[], model = false): Stage => ({ id, ...maxDist(parts), model });
const times = (n: number, d: Dist) => Array.from({ length: n }, () => d);

/** A path of sequential stages: p50 is the sum; p95 by root-sum-square (independent) and with model stages correlated. */
function path(stages: readonly Stage[]) {
  const p50 = sum(stages.map((s) => s.p50));
  const spreads = stages.map((s) => s.p95 - s.p50);
  const independent = p50 + rss(spreads);
  const modelSpread = sum(stages.filter((s) => s.model).map((s) => s.p95 - s.p50));
  const other = rss(stages.filter((s) => !s.model).map((s) => s.p95 - s.p50));
  const correlated = p50 + Math.sqrt(other * other + modelSpread * modelSpread);
  return { p50, p95Independent: independent, p95: correlated };
}

/** Wilson 95% interval for a proportion p observed on n cases. */
function wilson(p: number, n: number) {
  const z = 1.96;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { low: centre - half, high: centre + half, half };
}

/** ln Γ(x), Lanczos (g = 7, n = 9); accurate to ≈ 1e-13 for x > 0. */
function lgamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  const y = x - 1;
  let a = c[0];
  const t = y + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (y + i);
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a);
}
const lnChoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

/**
 * One-sided Fisher exact test: P(X ≥ a) where X = exposed wafers among the bad population (hypergeometric).
 * badN bad wafers of which badExposed ran on the candidate; goodN good wafers of which goodExposed did.
 * Returns log10 of the p-value (p-values of 1e-60 underflow nothing this way).
 */
export function fisherLog10(badExposed: number, badN: number, goodExposed: number, goodN: number) {
  const N = badN + goodN;
  const K = badExposed + goodExposed;
  const denom = lnChoose(N, badN);
  const terms: number[] = [];
  for (let x = badExposed; x <= Math.min(badN, K); x++) {
    terms.push(lnChoose(K, x) + lnChoose(N - K, badN - x) - denom);
  }
  const m = Math.max(...terms);
  const lnP = m + Math.log(sum(terms.map((t) => Math.exp(t - m))));
  return lnP / Math.LN10;
}

/** Prices: illustrative on-site GPU hour and (for the rejected hosted option only) list prices as of November 2026. */
export const KS_PRICES = {
  gpuHour: PRICES.gpuHour, // 2.5 USD, illustrative (sheet §5: the site's rate, at the upper end for on-site GPUs)
  gpuServerPrice: 300_000, // USD for an 8-GPU H100-class server (estimate)
  gpuServerYears: 4,
  hostedMid: PRICES.mid, // 2.00 input / 10.00 output USD per million tokens (Claude Sonnet 5.5 class), rejected option
  fullyLoadedPerYear: 300_000, // USD a person, illustrative; the same rate as the healthcare page
  engineerHour: 150, // USD, illustrative, for engineers' review time
  graphLicencePerYear: 150_000, // USD, PLACEHOLDER: graph-database vendors do not publish enterprise prices
} as const;

/** Capital-only GPU hour: 300,000 ÷ (4 years × 8,760 hours × 8 GPUs) ≈ 1.07 USD, before power, space and support. */
export const GPU_CAPEX_HOUR = KS_PRICES.gpuServerPrice / (KS_PRICES.gpuServerYears * 8_760 * 8);

/** The illustrative fab. */
export const FAB = (() => {
  const wspm = 40_000; // wafer starts a month (estimate for a mid-size 300 mm logic fab)
  const wafersPerDay = (wspm * 12) / 365; // 1,315.07
  const lotSize = 25; // one FOUP (dossier F32, F39)
  const lotsPerDay = wafersPerDay / lotSize; // 52.6
  const routeSteps = 800; // steps on the route (estimate; leading-edge logic exceeds 1,000, F39)
  const processShare = 0.7; // 560 process steps on equipment with FDC; 240 metrology and inspection steps
  const processSteps = routeSteps * processShare; // 560
  const cycleDays = 60; // estimate
  const wipWafers = wafersPerDay * cycleDays; // 78,904
  const tools = 1_100; // 800 process tools + 300 metrology and inspection tools
  const processTools = 800;
  const chambersPerProcessTool = 2.5;
  const processChambers = processTools * chambersPerProcessTool; // 2,000
  const equipmentUnits = processChambers + (tools - processTools); // 2,300 (metrology tools count as one unit)
  const runsPerDay = lotsPerDay * routeSteps; // 42,082 lot-step executions at steady state
  const waferStepsPerDay = wafersPerDay * routeSteps; // 1,052,055 wafer-step rows
  const waferChamberTracesPerDay = wafersPerDay * processSteps; // 736,438 (one FDC trace per wafer per process step)
  const wafersPerChamberPerDay = waferChamberTracesPerDay / processChambers; // 368
  const secondsPerWaferInChamber = 120; // estimate
  const chamberUtilisation = (waferChamberTracesPerDay * secondsPerWaferInChamber) / (processChambers * 86_400); // 0.51
  return {
    wspm,
    wafersPerDay,
    lotSize,
    lotsPerDay,
    routeSteps,
    processSteps,
    cycleDays,
    wipWafers,
    tools,
    processTools,
    processChambers,
    equipmentUnits,
    runsPerDay,
    waferStepsPerDay,
    waferChamberTracesPerDay,
    wafersPerChamberPerDay,
    secondsPerWaferInChamber,
    chamberUtilisation,
  };
})();

/** Sensor traces: why the samples stay in the FDC store (sheet §5, §7). */
export const TRACES = (() => {
  const parameters = 200; // per chamber trace ("hundreds of sensor parameters", F33)
  const hz = 10; // one sample per 100 ms (F33: "once per second to every tens of milliseconds")
  const samplesPerTrace = parameters * hz * FAB.secondsPerWaferInChamber; // 240,000
  const samplesPerDay = samplesPerTrace * FAB.waferChamberTracesPerDay; // 1.77e11
  const bytesPerSample = 10; // 8-byte value + amortised timestamp and key (estimate)
  const rawBytesPerDay = samplesPerDay * bytesPerSample; // 1.77 TB
  const compression = 10; // assumed; measured per chunk in practice (dossier F47)
  const storedBytesPerDay = rawBytesPerDay / compression; // 177 GB
  const hotDays = 730;
  const storedHot = storedBytesPerDay * hotDays; // 129 TB
  const indicatorsPerTrace = 30; // FDC summary features per wafer-step (mean, max, slope of key parameters per recipe step)
  const indicatorsPerDay = indicatorsPerTrace * FAB.waferChamberTracesPerDay; // 22.1M values
  return {
    parameters,
    hz,
    samplesPerTrace,
    samplesPerDay,
    rawBytesPerDay,
    compression,
    storedBytesPerDay,
    hotDays,
    storedHot,
    indicatorsPerTrace,
    indicatorsPerDay,
  };
})();

/** The knowledge graph over a 2-year hot window (sheet §5, §7); excursion cases and knowledge are kept forever. */
export const GRAPH = (() => {
  const days = TRACES.hotDays; // 730
  const nodes = {
    run: FAB.runsPerDay * days, // 30.72M lot-step executions
    wafer: FAB.wafersPerDay * days, // 0.96M
    sortResult: FAB.wafersPerDay * days, // 0.96M (one wafer-sort summary per wafer: yield, bins, map signature)
    inspection: FAB.wafersPerDay * 12 * 0.25 * days, // 12 inspected layers, 25% of wafers sampled: 2.88M
    lot: FAB.lotsPerDay * 1.2 * days, // + 20% child lots from splits: 46,080
    fdcFault: 2_000 * days, // hold-level FDC faults (not every alarm): 1.46M
    spcViolation: 400 * days, // 0.29M
    maintenance: FAB.processChambers * 3 * 24, // PM 2 + unscheduled 1 a chamber a month: 144,000
    partInstall: FAB.processChambers * 1 * 24, // consumables (edge ring, focus ring, showerhead) a month: 48,000
    recipeVersion: 6_000 * 5, // 30,000
    equipment: FAB.tools + FAB.equipmentUnits, // tools + chambers and units: 3,400
    stepDef: 2_400,
    product: 40,
    knowledge: 1_500 + 20_000, // failure mechanisms + FMEA rows
    excursionCase: 300, // confirmed historical excursions (5 years, sheet §13)
  };
  const nodeCount = sum(Object.values(nodes)); // ≈ 37.6M
  const edgesPerRun = 5.3; // IN_LOT, AT_STEP, ON_TOOL, USED_RECIPE, USED_CHAMBER (1.3 on average)
  const edges = {
    run: nodes.run * edgesPerRun, // 162.8M
    waferInLot: nodes.wafer,
    sort: nodes.sortResult,
    inspection: nodes.inspection,
    eventOnEquipment: nodes.fdcFault + nodes.spcViolation + nodes.maintenance + nodes.partInstall, // 1.94M
    faultOnWafer: nodes.fdcFault, // 1.46M
    knowledge: 100_000, // KNOWN_CAUSE, DETECTED_BY, APPLIES_TO_STEP_TYPE … from FMEA and reports
  };
  const edgeCount = sum(Object.values(edges)); // ≈ 171M
  const bytesPerNode = 200; // with properties and indexes (estimate)
  const bytesPerEdge = 100;
  const storeBytes = nodeCount * bytesPerNode + edgeCount * bytesPerEdge; // ≈ 24.6 GB
  // Wafer-level chamber edges, if they were in the graph: one per wafer per process step.
  const waferChamberEdges = FAB.waferChamberTracesPerDay * days; // 537.6M, 3.1× the whole graph's edges
  // A day of samples against the whole graph: 1.77e11 ÷ 1.71e8 ≈ 1,000×.
  const samplesPerDayOverEdges = TRACES.samplesPerDay / edgeCount;
  return { days, nodes, nodeCount, edges, edgeCount, storeBytes, waferChamberEdges, samplesPerDayOverEdges };
})();

/** The columnar projection the statistics read (sheet §7). */
export const COLUMNAR = (() => {
  const waferStepRows = FAB.waferStepsPerDay * TRACES.hotDays; // 768M
  const bytesPerRow = 40; // compressed (estimate)
  const waferStepBytes = waferStepRows * bytesPerRow; // 30.7 GB
  const indicatorValues = TRACES.indicatorsPerDay * TRACES.hotDays; // 16.1B
  const bytesPerIndicator = 4; // compressed (estimate)
  const indicatorBytes = indicatorValues * bytesPerIndicator; // 64.5 GB
  return { waferStepRows, waferStepBytes, indicatorValues, indicatorBytes };
})();

/** Engineers and questions (illustrative). */
export const USERS = (() => {
  const engineers = 360; // yield 40, process and module 180, equipment 110, integration 30
  const activeShare = 0.5;
  const questionsPerActive = 6;
  const perDay = engineers * activeShare * questionsPerActive; // 1,080
  const mix = { lookup: 0.6, document: 0.25, investigation: 0.15 } as const;
  const lookups = perDay * mix.lookup; // 648
  const documents = perDay * mix.document; // 270
  const investigations = perDay * mix.investigation; // 162: ≈ 3 flagged excursions a day (most small, closed without a
  // formal 8D) + routine low-yield lots + reruns with other windows
  const excursionsFlaggedPerDay = 3;
  const excursionsConfirmedPerYear = 60; // closed with a confirmed cause in an 8D report (the replay set's source)
  const templateShare = 0.7; // lookups answered by an allow-listed template; 30% need a generated query
  const repairShare = 0.08; // generated queries that fail validation once and are repaired
  const peakHourShare = 0.15; // day-shift peak
  const peakPerSecond = (perDay * peakHourShare) / 3_600; // 0.045
  const burst = 4;
  const burstPerSecond = peakPerSecond * burst; // 0.18
  return {
    engineers,
    perDay,
    mix,
    lookups,
    documents,
    investigations,
    excursionsFlaggedPerDay,
    excursionsConfirmedPerYear,
    templateShare,
    repairShare,
    peakPerSecond,
    burstPerSecond,
  };
})();

/**
 * The worked investigation (sheet §9; illustrative). "Why did yield drop on lots N4H1022–N4H1031?" 10 lots, 250
 * wafers; 180 carry the edge-ring map signature. The good population: 2,400 wafers of the same product and route
 * sorted in the same 14 days without it.
 */
export const EXAMPLE = (() => {
  const lots = 10;
  const wafers = lots * FAB.lotSize; // 250
  const bad = 180;
  const good = 2_400;
  const steps = FAB.routeSteps;
  const rowsRead = (bad + good) * steps; // 2.064M wafer-step rows
  // Candidates tested: 560 process steps × 4 qualified chambers + 300 recipe versions + 200 material lots +
  // 500 "maintenance in the window" indicators.
  const tests = FAB.processSteps * 4 + 300 + 200 + 500; // 3,240
  const alpha = 0.05;
  const nullHitsUncorrected = tests * alpha; // 162 "significant" cells expected by chance alone
  const bhFirstThreshold = alpha / tests; // 1.54e-5: the smallest p must beat this to start the BH list
  // Wafers in a lot travel together, so wafer-level Fisher p-values overstate significance. Two stages: Fisher +
  // Benjamini–Hochberg screens all 3,240 tests; the top 50 survivors are confirmed with a lot-blocked permutation test
  // (labels shuffled by lot, 10,000 permutations; smallest attainable p ≈ 1e-4) at 0.05 ÷ 50 = 0.001.
  const confirmSurvivors = 50;
  const permutations = 10_000;
  const permutationFloor = 1 / (permutations + 1); // ≈ 1.0e-4
  const confirmThreshold = alpha / confirmSurvivors; // 0.001
  // H1: chamber ETCH04-B at step 412 (M1 hard-mask etch).
  const h1 = { badExposed: 171, goodExposed: 600 };
  const h1BadShare = h1.badExposed / bad; // 0.950
  const h1GoodShare = h1.goodExposed / good; // 0.250
  const h1Log10P = fisherLog10(h1.badExposed, bad, h1.goodExposed, good); // ≈ −74
  // H2: WET07 at step 414 (post-etch clean), dispatched with ETCH04-B: same wafers.
  const h2 = { badExposed: 165, goodExposed: 640, overlapWithH1Bad: 160 };
  const h2Log10P = fisherLog10(h2.badExposed, bad, h2.goodExposed, good);
  const jaccardBad = h2.overlapWithH1Bad / (h1.badExposed + h2.badExposed - h2.overlapWithH1Bad); // 160 / 176 = 0.909
  const clusterThreshold = 0.8; // candidates whose bad-wafer sets overlap more than this are reported as one cluster
  // H3: photoresist lot PR-552 at M1 litho: plausible story, weak data.
  const h3 = { badExposed: 94, goodExposed: 1_080 };
  const h3Log10P = fisherLog10(h3.badExposed, bad, h3.goodExposed, good); // ≈ −1.4 (p ≈ 0.04)
  const h3SurvivesBh = 10 ** h3Log10P <= bhFirstThreshold; // false
  // Lot level vs wafer level: tool ETCH04 (chambers A–D) ran all 10 bad lots and 53 of the 96 good lots.
  const goodLots = good / FAB.lotSize; // 96
  const lotLevel = { badLots: 10, badLotsOnTool: 10, goodLotsOnTool: 53 };
  const lotLevelGoodShare = lotLevel.goodLotsOnTool / goodLots; // 0.552
  const lotLevelLog10P = fisherLog10(10, 10, 53, goodLots); // ≈ −2.5: suggestive, not decisive
  // Timing: edge ring on ETCH04-B replaced 9 days before the first bad wafer passed step 412.
  const daysFromChangeToFirstBad = 9;
  // Before and after the change on ETCH04-B: of its 600 good wafers, 560 passed step 412 before the edge-ring swap
  // and 40 after; all 171 bad wafers passed after it. After the swap, 171 ÷ (171 + 40) = 81% of the wafers it ran
  // (that were sorted) carry the signature.
  const h1GoodBeforeChange = 560;
  const h1GoodAfterChange = h1.goodExposed - h1GoodBeforeChange; // 40
  const h1BadShareAfterChange = h1.badExposed / (h1.badExposed + h1GoodAfterChange); // 0.810
  // Sensor evidence (trace summary): DC bias in the main etch step, bad wafers vs good wafers on the same chamber
  // before the swap.
  const traceShiftPct = 6.1;
  // Calibrated confidence bins (isotonic on replays): high = P(confirmed) ≥ 0.6, medium 0.3–0.6, low < 0.3.
  const confidenceBins = { high: 0.6, medium: 0.3 };
  // Splitting the chamber in two by a naming mismatch ("ETCH04-B" in MES, "E04_PM2" in FDC): 171 bad wafers split
  // 95 / 76 between two nodes, each under the 80% "suspect" line the old page used.
  const splitShares = [95 / bad, 76 / bad]; // 0.528, 0.422
  return {
    lots,
    wafers,
    bad,
    good,
    rowsRead,
    tests,
    nullHitsUncorrected,
    bhFirstThreshold,
    confirmSurvivors,
    permutations,
    permutationFloor,
    confirmThreshold,
    h1,
    h1BadShare,
    h1GoodShare,
    h1Log10P,
    h2,
    h2Log10P,
    jaccardBad,
    clusterThreshold,
    h3,
    h3Log10P,
    h3SurvivesBh,
    goodLots,
    lotLevel,
    lotLevelGoodShare,
    lotLevelLog10P,
    daysFromChangeToFirstBad,
    h1GoodBeforeChange,
    h1GoodAfterChange,
    h1BadShareAfterChange,
    traceShiftPct,
    confidenceBins,
    splitShares,
  };
})();

/** Prompt blocks (tokens; sheet §11). */
export const CONTEXT = (() => {
  const writer = {
    instructions: 1_000, // write hypotheses, never "the root cause is"; cite evidence ids; quote numbers only from evidence
    format: 300,
    scope: 150, // question, lots, window, signature, data-as-of times
    populations: 200, // bad and good definitions and counts
    hypotheses: 5 * 800, // per hypothesis: stats 150 + events 200 + mechanism path 150 + sensor summary 120 + past case 180
    passages: 6 * 250, // FMEA rows and report excerpts linked to the mechanisms
    headers: 300,
  };
  const writerIn = sum(Object.values(writer)); // 7,450
  const writerStable = writer.instructions + writer.format; // 1,300 (kept as a prefix; the server caches it)
  const writerOut = 5 * 90 + 150; // 600: five hypotheses of 90 tokens + a 150-token summary
  const planner = { in: 1_600, out: 120 }; // instructions + intent schema 1,300 + question 100 + lot list 200
  const slotFill = { in: 1_800, out: 60 }; // template catalogue entry + slots schema + question
  const generate = { in: 3_600, out: 150 }; // schema subset 2,500 + 4 verified examples 800 + rules 200 + question 100
  const repair = { in: 3_800, out: 150 }; // the generation prompt + the validator's error
  const summary = { in: 1_200, out: 60 }; // result rows (capped) + the query + instructions
  const document = { in: 3_500, out: 250 }; // 8 passages + headers + instructions
  // Whole-graph context as a ghost bar: the schema alone (120 labels and relation types × 25 tokens of description
  // + 900 properties × 12) ≈ 13,800 tokens before a single fact; a lot's full history is 800 runs × 40 = 32,000.
  const fullSchema = 120 * 25 + 900 * 12; // 13,800
  const lotHistory = FAB.routeSteps * 40; // 32,000
  return {
    writer,
    writerIn,
    writerStable,
    writerOut,
    planner,
    slotFill,
    generate,
    repair,
    summary,
    document,
    fullSchema,
    lotHistory,
  };
})();

/** Guards on every graph query the assistant runs (sheet §6, §10, deep dive 2). */
export const QUERY_GUARDS = {
  maxRows: 1_000, // LIMIT injected or checked
  maxHops: 4, // variable-length patterns bounded to *1..4
  maxEstimatedRows: 1_000_000, // EXPLAIN estimate above this → rejected before it runs
  timeoutMs: 5_000, // db.transaction.timeout for the assistant's role (dossier F20)
  memoryMb: 512, // db.memory.transaction.max for the assistant's role (dossier F20)
  repairs: 2, // at most two repair rounds after a validation error
  templates: 40, // allow-listed parameterised patterns
  timeWindowRequiredLabels: ["Run", "FdcFault", "SpcViolation", "Inspection"], // must filter on an indexed time range
} as const;

/** Latency per request type, p50 and p95 (ms; all stage numbers are estimates; sheet §12). */
export const LATENCY = (() => {
  const decode = 100; // tokens a second per stream on the on-site model (dossier F45, estimate)
  const decodeP95 = 70;
  const gen = (id: string, tokens: number) => stage(id, (tokens / decode) * 1_000, (tokens / decodeP95) * 1_000, true);
  const edge = stage("edge", 50, 100); // TLS, SSO token, data-scope lookup, audit record
  const router = { p50: 20, p95: 40 }; // encoder intent classifier
  const templateMatch = { p50: 25, p95: 50 }; // embed + nearest of 40 templates
  const routeAndMatch = par("route ‖ template match", [router, templateMatch]);
  const validate = stage("parse, allow-list, schema check", 15, 30);
  const explain = stage("EXPLAIN cost check", 30, 80);
  const execute = stage("execute on a read replica", 150, 1_000);
  const render = stage("render table by code", 10, 20);

  // Lookup answered by a template (70%).
  const lookupTemplateStages = [
    edge,
    routeAndMatch,
    stage("slot-fill first token", 250, 500, true),
    gen("slot-fill decode (60 tokens)", CONTEXT.slotFill.out),
    validate,
    explain,
    execute,
    render,
  ];
  const lookupTemplate = path(lookupTemplateStages);
  // Lookup that needs a generated query (30%); 8% of those fail validation once and are repaired.
  const generateStages = [
    stage("schema linking", 30, 60),
    stage("generate first token", 400, 800, true),
    gen("generate decode (150 tokens)", CONTEXT.generate.out),
  ];
  const lookupGeneratedStages = [edge, routeAndMatch, ...generateStages, validate, explain, execute, render];
  const lookupGenerated = path(lookupGeneratedStages);
  const lookupRepaired = path([
    ...lookupGeneratedStages,
    stage("repair first token", 400, 800, true),
    gen("repair decode (150 tokens)", CONTEXT.repair.out),
    validate,
    explain,
  ]);
  const ts = USERS.templateShare;
  const rs = USERS.repairShare;
  const lookupMixParts = [
    { weight: ts, p50: lookupTemplate.p50, spread: lookupTemplate.p95 - lookupTemplate.p50 },
    { weight: (1 - ts) * (1 - rs), p50: lookupGenerated.p50, spread: lookupGenerated.p95 - lookupGenerated.p50 },
    { weight: (1 - ts) * rs, p50: lookupRepaired.p50, spread: lookupRepaired.p95 - lookupRepaired.p50 },
  ];
  const lookupResult = { p50: mixtureQuantile(lookupMixParts, 0.5), p95: mixtureQuantile(lookupMixParts, 0.95) };
  const summaryAfter = path([stage("summary first token", 300, 600, true), gen("summary decode (40 tokens)", 40)]);

  // Document question (how-to, SOP, past report): first verified sentence.
  const documentStages = [
    edge,
    stage("route", 20, 40),
    stage("embed", 15, 30),
    par("BM25 ‖ vector search", [
      { p50: 30, p95: 70 },
      { p50: 40, p95: 90 },
    ]),
    stage("rerank 40 candidates", 60, 120),
    stage("assemble context", 10, 20),
    stage("first token (3,500-token prompt)", 500, 1_000, true),
    gen("first sentence (25 tokens)", 25),
    stage("sentence check", 20, 50),
  ];
  const documentFirst = path(documentStages);

  // Investigation: plan → populations → commonality → evidence → ranked hypotheses (rendered by code) → explanation.
  const planStages = [
    edge,
    stage("planner first token", 300, 600, true),
    gen("planner decode (120 tokens)", CONTEXT.planner.out),
    stage("resolve lots, child lots, wafers", 80, 200),
  ];
  const plan = path(planStages); // the `plan` event: lots, wafers, window and signature echoed back
  const yms = { p50: 400, p95: 900 }; // sort results and wafer-map signatures for the bad lots
  const goodPop = { p50: 300, p95: 700 }; // select the good population in the columnar store
  const graphContext = { p50: 600, p95: 1_200 }; // 6 templates × top 10 clusters on 2 replicas, batched
  const trace = { p50: 1_500, p95: 4_000 }; // trace-store summary for one candidate (bad vs good wafers, 2 parameters)
  const pastCases = { p50: 80, p95: 190 }; // embed + vector search over report chunks + graph match on signature
  const hypothesesStages = [
    ...planStages,
    par("sort data ‖ good population", [yms, goodPop]),
    stage("commonality tests (2.06M rows, 3,240 tests)", 900, 2_000),
    stage("FDC indicator tests (top 20 cells × 30)", 600, 1_400),
    stage("cluster confounded candidates", 50, 100),
    par("graph context ‖ 3 trace summaries ‖ past cases", [graphContext, ...times(3, trace), pastCases]),
    stage("rank and calibrate", 30, 60),
  ];
  const hypotheses = path(hypothesesStages); // the `hypotheses` event: ranked table with evidence, by code
  const explanationStages = [
    ...hypothesesStages,
    stage("writer first token (7,450-token prompt)", 600, 1_200, true),
    gen("writer decode (600 tokens)", CONTEXT.writerOut),
    stage("final checks", 20, 50),
  ];
  const explanation = path(explanationStages);
  const firstHypothesisText = path([
    ...hypothesesStages,
    stage("writer first token (7,450-token prompt)", 600, 1_200, true),
    gen("first hypothesis text (90 tokens)", 90),
    stage("check", 20, 50),
  ]);
  const evidenceGroup = par("evidence", [graphContext, ...times(3, trace), pastCases]);
  // Decode-speed breakpoints at p50: the planner (120) and writer (600) decode at `decode`; the rest is fixed.
  // explanation: 13,075 − 7,200 + 720 × 1,000 ÷ d ≤ 15,000 → d ≥ 78.9 tokens a second;
  // hypotheses: 6,456 − 1,200 + 120 × 1,000 ÷ d ≤ 8,000 → d ≥ 43.7.
  const fixedExplanation = explanation.p50 - ((CONTEXT.planner.out + CONTEXT.writerOut) / decode) * 1_000;
  const decodeBreakpointExplanation = ((CONTEXT.planner.out + CONTEXT.writerOut) * 1_000) / (15_000 - fixedExplanation);
  const fixedHypotheses = hypotheses.p50 - (CONTEXT.planner.out / decode) * 1_000;
  const decodeBreakpointHypotheses = (CONTEXT.planner.out * 1_000) / (8_000 - fixedHypotheses);
  // Values (p50 / gated p95, ms): lookup template 1,135 / 2,128; generated 2,215 / 3,563; repaired 4,160 / 6,414;
  // lookup mixed 1,373 / 3,201; document 975 / 1,590; plan 1,630 / 2,455; evidence group 2,745 / 4,724; hypotheses
  // 6,456 / 9,029; first hypothesis text 7,976 / 11,009; explanation 13,075 / 17,749.
  return {
    decode,
    decodeP95,
    lookupTemplate,
    lookupGenerated,
    lookupRepaired,
    lookupResult,
    summaryAfter,
    documentFirst,
    plan,
    hypotheses,
    firstHypothesisText,
    explanation,
    evidenceGroup,
    decodeBreakpointExplanation,
    decodeBreakpointHypotheses,
    stages: { lookupTemplateStages, lookupGeneratedStages, documentStages, hypothesesStages, explanationStages },
  };
})();

/** Targets (sheet §4 N5) and whether the budget meets them, at p50 and the gated (correlated) p95. */
export const TARGETS = (() => {
  const L = LATENCY;
  const rows = [
    {
      id: "lookup",
      label: "Lookup: result table (template or generated, mixed)",
      ...pick(L.lookupResult),
      targetP50: 2_000,
      targetP95: 4_000,
    },
    {
      id: "lookupGenerated",
      label: "Lookup, generated query (no repair)",
      ...pick(L.lookupGenerated),
      targetP50: 3_000,
      targetP95: 6_000,
    },
    {
      id: "document",
      label: "Document question: first verified sentence",
      ...pick(L.documentFirst),
      targetP50: 2_000,
      targetP95: 4_000,
    },
    { id: "plan", label: "Investigation: plan shown", ...pick(L.plan), targetP50: 2_000, targetP95: 4_000 },
    {
      id: "hypotheses",
      label: "Investigation: ranked hypotheses with evidence",
      ...pick(L.hypotheses),
      targetP50: 8_000,
      targetP95: 15_000,
    },
    {
      id: "explanation",
      label: "Investigation: explanation complete",
      ...pick(L.explanation),
      targetP50: 15_000,
      targetP95: 25_000,
    },
  ];
  return rows.map((r) => ({ ...r, meets: r.p50 <= r.targetP50 && r.p95 <= r.targetP95 }));
  function pick(d: { p50: number; p95: number }) {
    return { p50: d.p50, p95: d.p95 };
  }
})();

/** Model-server demand and the GPU fleet (sheet §5). */
export const FLEET = (() => {
  const u = USERS;
  const c = CONTEXT;
  const gen = u.lookups * (1 - u.templateShare);
  const outPerDay =
    u.investigations * (c.planner.out + c.writerOut) +
    u.lookups * u.templateShare * c.slotFill.out +
    gen * c.generate.out +
    gen * u.repairShare * c.repair.out +
    u.lookups * c.summary.out +
    u.documents * c.document.out; // ≈ 282,000 output tokens a day
  const inPerDay =
    u.investigations * (c.planner.in + c.writerIn) +
    u.lookups * u.templateShare * c.slotFill.in +
    gen * c.generate.in +
    gen * u.repairShare * c.repair.in +
    u.lookups * c.summary.in +
    u.documents * c.document.in; // ≈ 4.76M input tokens a day
  const streamSecondsPerDay = outPerDay / LATENCY.decode; // ≈ 2,800
  // Model-seconds a question (prefill + decode on the critical path), weighted by mix:
  const modelSeconds = {
    investigation: (300 + 1_200 + 600 + 6_000) / 1_000, // 8.1
    lookup: (u.templateShare * (250 + 600) + (1 - u.templateShare) * (400 + 1_500) + 300 + 400) / 1_000, // 1.87
    document: (500 + 2_500) / 1_000, // 3.0 (250 tokens at 100 a second)
  };
  const meanModelSeconds =
    u.mix.investigation * modelSeconds.investigation +
    u.mix.lookup * modelSeconds.lookup +
    u.mix.document * modelSeconds.document;
  const burstConcurrentStreams = u.burstPerSecond * meanModelSeconds; // ≈ 0.6
  const streamsPerGpuAt100 = 5_863 / 100; // ≈ 59 streams at 100 tokens a second each (dossier F45, estimate)
  const gpus = { answerReplicas: 2, encoders: 1, batch: 1 }; // two model replicas for availability; encoders
  // (router, embeddings, reranker, wafer-map classifier); nightly extraction and evaluation replays.
  const gpuCount = sum(Object.values(gpus)); // 4
  const gpuPerDay = gpuCount * 24 * KS_PRICES.gpuHour; // 240 USD
  return {
    outPerDay,
    inPerDay,
    streamSecondsPerDay,
    modelSeconds,
    meanModelSeconds,
    burstConcurrentStreams,
    streamsPerGpuAt100,
    gpus,
    gpuCount,
    gpuPerDay,
  };
})();

/** Daily cost, all in (sheet §5, §12). */
export const COST = (() => {
  const p = KS_PRICES;
  const infra = {
    gpus: FLEET.gpuPerDay, // 240
    graph: 3 * 4 * 24, // primary + 2 read replicas, 128 GB RAM class, 4 USD an hour each (amortised, estimate): 288
    columnar: 3 * 3 * 24, // 216
    traceApi: 2 * 1 * 24, // read API in front of the fab's existing FDC store: 48
    search: 2 * 2.5 * 24, // report and SOP index (BM25 + vectors): 120
    platform: 150, // orchestrator, ingest workers, message bus share, audit, traces
  };
  const infraPerDay = sum(Object.values(infra)); // 1,062
  const graphLicencePerDay = p.graphLicencePerYear / 365; // 411 (placeholder)
  const team = { knowledgeEngineers: 2, dataEngineers: 4, mlEngineers: 2, yieldAnalyst: 1, sre: 1 };
  const teamSize = sum(Object.values(team)); // 10
  const peoplePerDay = (teamSize * p.fullyLoadedPerYear) / 365; // 8,219
  const review = (100 * 2 * (3 / 60) * p.engineerHour * 12) / 365; // 100 lookups × 2 graders × 3 min monthly: 49
  const perDay = infraPerDay + graphLicencePerDay + peoplePerDay + review; // ≈ 9,742
  const shares = {
    people: peoplePerDay / perDay,
    infra: infraPerDay / perDay,
    licence: graphLicencePerDay / perDay,
    gpus: infra.gpus / perDay,
  };
  const perQuestion = perDay / USERS.perDay; // ≈ 9.0
  const gpuPerQuestion = infra.gpus / USERS.perDay; // ≈ 0.22
  // The rejected option: the same tokens to a hosted mid-size model at list prices (no caching assumed).
  const m = p.hostedMid;
  const u = USERS;
  const c = CONTEXT;
  const call = (i: number, o: number) => usd(i, m.input) + usd(o, m.output);
  const genLookups = u.lookups * (1 - u.templateShare);
  const hostedPerDay =
    u.investigations * (call(c.planner.in, c.planner.out) + call(c.writerIn, c.writerOut)) +
    u.lookups * u.templateShare * call(c.slotFill.in, c.slotFill.out) +
    genLookups * call(c.generate.in, c.generate.out) +
    genLookups * u.repairShare * call(c.repair.in, c.repair.out) +
    u.lookups * call(c.summary.in, c.summary.out) +
    u.documents * call(c.document.in, c.document.out); // ≈ 12.3 USD
  const boundaryPremium = infra.gpus - hostedPerDay; // ≈ 228 USD a day for keeping models on site
  const boundaryShare = boundaryPremium / perDay; // ≈ 2.3%
  // Why it pays (illustrative): a bad chamber exposes ≈ 368 wafers a day at one step; at 8% yield loss on a
  // 6,000-USD wafer, a day of faster containment is worth ≈ 177,000 USD.
  const wafersExposedPerDay = FAB.wafersPerChamberPerDay; // 368
  const yieldLoss = 0.08;
  const waferValue = 6_000;
  const dayOfContainment = wafersExposedPerDay * yieldLoss * waferValue; // ≈ 176,700
  const dayOverCost = dayOfContainment / perDay; // ≈ 18×
  return {
    infra,
    infraPerDay,
    graphLicencePerDay,
    team,
    teamSize,
    peoplePerDay,
    review,
    perDay,
    shares,
    perQuestion,
    gpuPerQuestion,
    hostedPerDay,
    boundaryPremium,
    boundaryShare,
    wafersExposedPerDay,
    yieldLoss,
    waferValue,
    dayOfContainment,
    dayOverCost,
  };
})();

/** Evaluation sets and their 95% intervals (sheet §13). */
export const EVAL = (() => {
  const historical = { n: USERS.excursionsConfirmedPerYear * 5, hit3: 0.7, hit1: 0.45 }; // 300 confirmed, 5 years
  const seeded = { n: 2_000, detect: 0.9, nulls: 1_000, falseHigh: 0.05 }; // synthetic chamber offsets; null replays
  const queries = { n: 500, template: 0.95, generated: 0.8, wrongButValid: 0.05 };
  const extraction = { triples: 1_000, precision: 0.9 };
  const leakage = { prompts: 200 }; // attempts to read recipe values outside the user's scope: 0 allowed
  return {
    historical,
    hit3: wilson(historical.hit3, historical.n), // ± ≈ 5.1 points
    hit1: wilson(historical.hit1, historical.n), // ± ≈ 5.6
    seeded,
    detect: wilson(seeded.detect, seeded.n), // ± ≈ 1.3
    falseHigh: wilson(seeded.falseHigh, seeded.nulls), // ± ≈ 1.4
    queries,
    template: wilson(queries.template, queries.n * USERS.templateShare), // 350 template questions: ± ≈ 2.3
    generated: wilson(queries.generated, queries.n * (1 - USERS.templateShare)), // 150 generated: ± ≈ 6.4
    extraction,
    leakage,
  };
})();

/** Freshness targets (sheet §4 N7). */
export const FRESHNESS = {
  mesTrackOutToGraphP50Ms: 5_000,
  mesTrackOutToGraphP95Ms: 60_000,
  fdcFaultToGraphP95Ms: 60_000,
  maintenanceToGraphP95Min: 5,
  recipeChangeToGraphP95Min: 5,
  sortUploadToGraphP95Min: 15,
  documentsToGraphDays: 1, // nightly extraction, then human approval before edges are live
} as const;
