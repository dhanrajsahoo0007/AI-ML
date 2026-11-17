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
  gpuHour: PRICES.gpuHour, // 2.5 USD, illustrative; an amortised on-site H100-class GPU hour lands near this (sheet §5)
  hostedMid: PRICES.mid, // 2.00 input / 10.00 output USD per million tokens (Claude Sonnet 5.5 class), rejected option
  fullyLoadedPerYear: 300_000, // USD a person, illustrative; the same rate as the healthcare page
  engineerHour: 150, // USD, illustrative, for engineers' review time
  graphLicencePerYear: 150_000, // USD, PLACEHOLDER: graph-database vendors do not publish enterprise prices
} as const;

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
  const investigations = perDay * mix.investigation; // 162 (≈ 3 new excursions a day + routine low-yield lots + reruns)
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
