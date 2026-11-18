// Constants and arithmetic for the "Design a Yield Root-Cause Assistant on a Fab Knowledge Graph" case study
// (/genai-system-design/case-studies/kg-semiconductor-case-study; design sheet SYSTEM-DESIGN/plans/genai-design/design/
// kg-semiconductor-case-study.md v2, after design review round 1; dossier research/kg-semiconductor-case-study.md,
// facts cited as "dossier F12"; review review/kg-semiconductor-case-study-design.md, cited as "review item 3").
// Specs in assets/diagrams/animated/kg-semi/ import from here, so the page, the figures and the tests share one set
// of numbers.
//
// This page is NOT Brightpost. It defines its own ILLUSTRATIVE fab ("the fab"): one 300 mm logic fab at a mature node,
// 40,000 wafer starts a month, an 800-step route, 1,100 tools. NO primary production write-up of an LLM + knowledge-
// graph root-cause system in a fab exists (dossier, research honesty note): every volume, mix, rate, latency, salary,
// licence fee, unit cost and the whole worked investigation below are ESTIMATES or invented illustrations unless a
// comment names a source. Paper results are quoted on the page with their paper and task, never used as inputs here.
//
// Sources used for numbers (dossier): trace sampling "from about once per second to every tens of milliseconds" and
// "hundreds of sensor parameters" (F33) set the 10 Hz × 200-parameter trace; 25-wafer FOUP lots (F32, F39);
// gpt-oss-120b fits one 80 GB GPU (F44) and is a reasoning model with low / medium / high effort (F49); ≈ 100 tokens
// a second per stream while an H100 serves ≈ 5,900 tokens a second (F45, a benchmark mirror; an estimate). Hosted
// list prices (only for the rejected hosted option) and the illustrative 2.5 USD GPU-hour come from the answer-engine
// preset so a price has one value across the site; maxOfParts (the maximum of independent normal draws) from the
// healthcare preset.
//
// Latency: parallel stages are the maximum of their draws (maxOfParts), at p50 and p95. p95 per path is p50 + the
// root-sum-square of stage spreads (p95 − p50). The gated case treats the stages on the shared model server as fully
// correlated: their spreads add linearly, then combine with the other stages by root-sum-square. Every model call
// includes its hidden reasoning tokens (review item 2). Routes are mixed with mixtureQuantile. Stages are normal
// approximations: a stage with a wide spread (trace summaries) puts some mass below zero, so its p50 is slightly
// optimistic and its p95 about right; the three trace draws hit one store, so treating them as independent
// understates their joint tail (review item 51).

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
  const independent = p50 + rss(stages.map((s) => s.p95 - s.p50));
  const modelSpread = sum(stages.filter((s) => s.model).map((s) => s.p95 - s.p50));
  const other = rss(stages.filter((s) => !s.model).map((s) => s.p95 - s.p50));
  const correlated = p50 + Math.sqrt(other * other + modelSpread * modelSpread);
  return { p50, p95Independent: independent, p95: correlated };
}
type PathResult = ReturnType<typeof path>;
/** Quantile q of a weighted mixture of paths. */
const mix = (parts: readonly { weight: number; path: PathResult }[], q: number) =>
  mixtureQuantile(
    parts.map((p) => ({ weight: p.weight, p50: p.path.p50, spread: p.path.p95 - p.path.p50 })),
    q
  );
const mixDist = (parts: readonly { weight: number; path: PathResult }[]): Dist => ({
  p50: mix(parts, 0.5),
  p95: mix(parts, 0.95),
});

/** Wilson 95% interval for a proportion p observed on n cases. */
export function wilson(p: number, n: number) {
  const z = 1.96;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { low: centre - half, high: centre + half, half };
}

/** ln Γ(x), Lanczos (g = 7, n = 9), for x > 0.5. */
function lgamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  const y = x - 1;
  let a = c[0];
  const t = y + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (y + i);
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a);
}
const lnChoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
/**
 * One-sided Fisher exact p, P(X ≥ a): a of n1 exposed units are "bad", b of n2 unexposed are. Used only to show why a
 * test design matters (review items R2-4, R2-8); no p-value is shown to engineers.
 */
function fisherGreater(a: number, n1: number, b: number, n2: number) {
  const N = n1 + n2;
  const K = a + b;
  let p = 0;
  for (let x = a; x <= Math.min(n1, K); x++) p += Math.exp(lnChoose(K, x) + lnChoose(N - K, n1 - x) - lnChoose(N, n1));
  return p;
}

/** Prices: illustrative on-site GPU hour and (for the rejected hosted option only) list prices as of November 2026. */
export const KS_PRICES = {
  gpuHour: PRICES.gpuHour, // 2.5 USD, illustrative: the site's all-in rate (capital ≈ 1.07 + power, space, support)
  gpuServerPrice: 300_000, // USD for an 8-GPU H100-class server (estimate), used only for the capital-hour check
  gpuServerYears: 4,
  hostedMid: PRICES.mid, // 2.00 input / 10.00 output USD per million tokens (Claude Sonnet 5.5 class), rejected option
  fullyLoadedPerYear: 300_000, // USD a person, illustrative; the same rate as the healthcare page
  engineerHour: 150, // USD, illustrative, for fab engineers' review, approval and verdict time
  graphLicencePerYear: 150_000, // USD, PLACEHOLDER: graph-database vendors do not publish enterprise prices
} as const;

/** Capital-only GPU hour: 300,000 ÷ (4 years × 8,760 hours × 8 GPUs) ≈ 1.07 USD, before power, space and support. */
export const GPU_CAPEX_HOUR = KS_PRICES.gpuServerPrice / (KS_PRICES.gpuServerYears * 8_760 * 8);

/** The illustrative fab (a mature logic node; leading-edge routes exceed 1,000 steps, F39). */
export const FAB = (() => {
  const wspm = 40_000; // wafer starts a month (estimate)
  const wafersPerDay = (wspm * 12) / 365; // 1,315.07
  const lotSize = 25; // one FOUP (dossier F32, F39)
  const lotsPerDay = wafersPerDay / lotSize; // 52.6
  const routeSteps = 800;
  const processShare = 0.7;
  const processSteps = routeSteps * processShare; // 560 process steps on equipment with FDC; 240 metrology/inspection
  const cycleDays = 60;
  const wipWafers = wafersPerDay * cycleDays; // 78,904 (Little's law)
  const tools = 1_100; // 800 process tools + 300 metrology and inspection tools
  const processTools = 800;
  const processChambers = processTools * 2.5; // 2,000
  const equipmentUnits = processChambers + (tools - processTools); // 2,300 (metrology tools count as one unit)
  const stepsPerChamber = 8; // re-entrant flow: a chamber is qualified for ≈ 8 steps of the route (review item 11)
  const qualifiedCells = processChambers * stepsPerChamber; // 16,000 chamber-step qualifications fab-wide
  const runsPerDay = lotsPerDay * routeSteps; // 42,082 lot-step executions at steady state
  const waferStepsPerDay = wafersPerDay * routeSteps; // 1,052,055 wafer-step rows
  const waferChamberTracesPerDay = wafersPerDay * processSteps; // 736,438 FDC traces (one per wafer per process step)
  const wafersPerChamberPerDay = waferChamberTracesPerDay / processChambers; // 368
  const secondsPerWaferInChamber = 120;
  const chamberUtilisation = (waferChamberTracesPerDay * secondsPerWaferInChamber) / (processChambers * 86_400); // 0.51
  // Sort lag for a wafer at step 412: the remaining 388 of 800 steps × 60 days ≈ 29 days (review item 5).
  const exampleStep = 412;
  const sortLagDays = ((routeSteps - exampleStep) / routeSteps) * cycleDays; // 29.1
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
    stepsPerChamber,
    qualifiedCells,
    runsPerDay,
    waferStepsPerDay,
    waferChamberTracesPerDay,
    wafersPerChamberPerDay,
    secondsPerWaferInChamber,
    chamberUtilisation,
    exampleStep,
    sortLagDays,
  };
})();

/** Sensor traces: why the samples stay in the FDC store (sheet §5, §7). */
export const TRACES = (() => {
  const parameters = 200; // per chamber trace ("hundreds of sensor parameters", F33)
  const hz = 10; // one sample per 100 ms (F33)
  const samplesPerTrace = parameters * hz * FAB.secondsPerWaferInChamber; // 240,000
  const samplesPerDay = samplesPerTrace * FAB.waferChamberTracesPerDay; // 1.77e11
  const bytesPerSample = 10; // 8-byte value + amortised timestamp and key (estimate)
  const rawBytesPerDay = samplesPerDay * bytesPerSample; // 1.77 TB
  const compression = 10; // assumed; measured per chunk in practice (dossier F47)
  const storedBytesPerDay = rawBytesPerDay / compression; // 177 GB
  const hotDays = 730;
  const storedHot = storedBytesPerDay * hotDays; // 129 TB
  const indicatorsPerTrace = 30; // FDC summary features per wafer-step
  const indicatorsPerDay = indicatorsPerTrace * FAB.waferChamberTracesPerDay; // 22.1M values
  const contextMatchTarget = 0.995; // traces matched to (wafer, run) by context; the rest quarantined (review item 19)
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
    contextMatchTarget,
  };
})();

/**
 * The knowledge graph (sheet §5, §7; review item R2-1). Retention is per kind, set by what a 5-year as-of replay needs:
 * EXECUTION (`Run` nodes and their edges, sort insertions, inspections) is kept 2 years in the graph; older execution is
 * read from the columnar store, which keeps 5 years. EVENTS (state changes, holds, SPC, maintenance, qualification,
 * part installs), LOTS and WAFERS (genealogy), recipe bodies and material lots are kept 5 years, so the timing,
 * genealogy and "what else changed" features exist for every replay case. Equipment, knowledge and cases are kept.
 * VERSIONS: nothing is overwritten. A correction (a work order's times edited, a mapping fixed, a backdated record)
 * writes a new version with `recorded_at`; the old version gets `superseded_at`. Valid time is `valid_from` /
 * `valid_to`. An as-of query at transaction time T reads versions with recorded_at ≤ T < superseded_at.
 */
export const GRAPH = (() => {
  const execDays = TRACES.hotDays; // 730: execution in the graph
  const keepDays = 1_826; // 5 years: events, genealogy, recipe bodies, material lots (the replay horizon)
  const correctionRate = 0.05; // share of event records that get one corrected version (illustrative; measured)
  const v = 1 + correctionRate; // versions per event record
  const nodes = {
    run: FAB.runsPerDay * execDays, // 30.72M lot-step executions (2 years)
    sortInsertion: FAB.wafersPerDay * 1.1 * execDays, // 1.056M (2 years; 5 years in the columnar store)
    inspection: FAB.wafersPerDay * 12 * 0.25 * execDays, // 2.88M (2 years; 5 years in the columnar store)
    wafer: FAB.wafersPerDay * keepDays, // 2.40M (5 years)
    lot: FAB.lotsPerDay * 1.2 * keepDays, // 115,262 (5 years)
    fdcHold: 200 * keepDays * v, // 383,460
    spcViolation: 400 * keepDays * v, // 766,920
    stateChange: FAB.processChambers * 6 * keepDays * v, // 23.0M
    maintenance: FAB.processChambers * 3 * 60 * v, // 378,000 (60 months)
    qualification: FAB.processChambers * 2 * 60 * v, // 252,000
    partInstall: FAB.processChambers * 1 * 60 * v, // 126,000
    recipeBody: 6_000 * 12, // 72,000 over 5 years
    materialLot: 300 * keepDays, // 547,800
    equipment: FAB.tools + FAB.processChambers, // 3,100
    testSide: 60 + 20 + 100, // probe cards, testers, test-program versions
    reticle: 3_000,
    stepDefAndRoute: 2_400 + 120,
    product: 40,
    knowledge: 1_500 + 20_000 + 12, // failure mechanisms + FMEA rows + signatures (versioned on approval)
    excursionCase: 300,
  };
  const nodeCount = sum(Object.values(nodes)); // ≈ 62.7M
  const edgesPerRun = 4 + 2.5 + 0.2; // IN_LOT, AT_STEP, ON_TOOL, USED_RECIPE_BODY + VISITED × 2.5 + USED_MATERIAL × 0.2
  const events =
    nodes.fdcHold +
    nodes.spcViolation +
    nodes.stateChange +
    nodes.maintenance +
    nodes.qualification +
    nodes.partInstall;
  const edges = {
    run: nodes.run * edgesPerRun, // 205.8M
    waferInLot: nodes.wafer,
    sort: nodes.sortInsertion,
    inspection: nodes.inspection,
    eventOnEquipment: events, // ≈ 24.9M
    holdOnWafer: nodes.fdcHold,
    qualifiedFor: FAB.qualifiedCells, // 16,000
    knowledge: 100_000,
  };
  const edgeCount = sum(Object.values(edges)); // ≈ 237.6M
  const bytesPerNode = 200; // with properties and indexes (estimate)
  const bytesPerEdge = 120; // with valid_from, valid_to, recorded_at, superseded_at
  const storeBytes = nodeCount * bytesPerNode + edgeCount * bytesPerEdge; // ≈ 41.1 GB: still in memory on 128 GB
  // A full 5-year graph (execution too) for comparison: runs × 2.5 more → ≈ 46M more Run nodes and ≈ 309M more edges.
  const fullFiveYearBytes =
    storeBytes + FAB.runsPerDay * (keepDays - execDays) * (bytesPerNode + edgesPerRun * bytesPerEdge); // ≈ 87.4 GB
  const waferChamberEdges = FAB.waferChamberTracesPerDay * execDays; // 537.6M if wafer-level visits were edges
  const samplesPerDayOverEdges = TRACES.samplesPerDay / edgeCount; // ≈ 744×
  return {
    execDays,
    keepDays,
    correctionRate,
    nodes,
    nodeCount,
    events,
    edges,
    edgeCount,
    storeBytes,
    fullFiveYearBytes,
    waferChamberEdges,
    samplesPerDayOverEdges,
  };
})();

/** The columnar store (sheet §7): wafer-level execution, indicators, metrology, e-test; kept for the replay horizon. */
export const COLUMNAR = (() => {
  const replayDays = 1_826; // 5 years, the replay horizon (review item 8)
  const waferStepRows = FAB.waferStepsPerDay * replayDays; // 1.921B
  const bytesPerRow = 40; // compressed (estimate)
  const waferStepBytes = waferStepRows * bytesPerRow; // 76.8 GB
  const indicatorValues = TRACES.indicatorsPerDay * TRACES.hotDays; // 16.1B (2 years; older indicators aggregated)
  const indicatorBytes = indicatorValues * 4; // 64.5 GB
  const metrologyPerDay = FAB.wafersPerDay * 40 * 0.25 * 13; // 40 metrology steps, 25% sampled, 13 sites: 171,000
  const etestPerDay = FAB.wafersPerDay * 0.5 * 5 * 200; // half the wafers, 5 sites, 200 parameters: 657,500
  const apcPerDay = FAB.waferChamberTracesPerDay * 0.3 * 3; // 30% of steps under run-to-run control, 3 knobs: 663,000
  // 5-year values for replays (review item R2-14): metrology ≈ 0.31B, e-test ≈ 1.20B, APC ≈ 1.21B ≈ 2.7B values;
  // FDC indicators per wafer are kept 2 years, then aggregated to daily means per chamber and step.
  const fiveYearOtherValues = (metrologyPerDay + etestPerDay + apcPerDay) * replayDays; // ≈ 2.72B
  return {
    replayDays,
    waferStepRows,
    waferStepBytes,
    indicatorValues,
    indicatorBytes,
    metrologyPerDay,
    etestPerDay,
    apcPerDay,
    fiveYearOtherValues,
  };
})();

/** Engineers, questions and routes (illustrative). */
export const USERS = (() => {
  const engineers = 360; // yield 40, process and module 180, equipment 110, integration 30
  const perDay = engineers * 0.5 * 6; // 50% active × 6 questions: 1,080
  const mix = { lookup: 0.6, document: 0.25, investigation: 0.15 } as const;
  const lookups = perDay * mix.lookup; // 648
  const documents = perDay * mix.document; // 270
  const investigations = perDay * mix.investigation; // 162
  const excursionsFlaggedPerDay = 3; // most small, closed without a formal 8D
  const excursionsConfirmedPerYear = 60; // closed with a confirmed cause in an 8D report
  // Lookup routes (review items 1, 2, 23): 70% match a template; of those, 80% have their slots filled by the encoder
  // extractor + entity linker (no generative call), 20% need the model to fill slots; 40% of template lookups are
  // cross-store (graph ids → typed columnar call → graph). 30% need a generated query; 8% of those fail validation and
  // get ONE repair (cap 1). 0.5% of lookups hit the 5 s timeout (illustrative, measured from logs in practice).
  const templateShare = 0.7;
  const encoderSlotShare = 0.8;
  const crossStoreShare = 0.4;
  const repairShare = 0.08;
  const timeoutShare = 0.005;
  // Investigations: 60% launched from YMS with the lots selected (the plan is built by code); 40% typed as free text.
  const ymsLaunchShare = 0.6;
  const peakPerSecond = (perDay * 0.15) / 3_600; // 15% in the peak hour: 0.045
  const burstPerSecond = peakPerSecond * 4; // 0.18
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
    encoderSlotShare,
    crossStoreShare,
    repairShare,
    timeoutShare,
    ymsLaunchShare,
    peakPerSecond,
    burstPerSecond,
  };
})();

/**
 * The worked investigation (sheet §9, §15.3; INVENTED and illustrative, rebuilt after review item 5).
 *
 * Story: on day 0 the edge ring of chamber B of etch tool ETCH04 is replaced (work order WO-55120) with a new part
 * revision from a new part lot. From then on, wafers etched in chamber B at step 412 (M1 hard-mask etch) show an
 * edge-ring sort signature on 80% of wafers; the fab's background rate for the signature is 4%. Step 412 for product
 * PX7 runs on ETCH04 or ETCH05 (4 chambers each); dispatch sends a lot to one tool, which spreads its 25 wafers over
 * its 4 chambers (≈ 6.25 a chamber). Sort comes ≈ 29 days after step 412, so the first bad wafers reach sort on day 29;
 * today is day 40 and an engineer names 10 low-yield lots sorted this week.
 *
 * Design (review items 3, 4): the cohort is every PX7 wafer that passed step 412 in the 10 process days after the
 * change (time-matched, not sort-date-matched); the outcome is the signature per wafer; comparisons are WITHIN LOT
 * (chamber B wafers vs the same lots' wafers on sister chambers A, C, D, processed in the same hours), so everything a
 * lot shares (time, upstream route, resist, wet bench, sort tester) cancels. Discovery uses the named lots + 20 random
 * other lots; 50 held-out lots confirm only the pre-registered top 3. A before-window (10 days before day 0) gives the
 * change-point.
 */
export const STATS = (() => {
  const windowDays = 10;
  const lotsPerDayAtStep = 8; // PX7 lots through step 412 a day
  const cohortLots = windowDays * lotsPerDayAtStep; // 80
  const cohortWafers = cohortLots * FAB.lotSize; // 2,000
  const etch04Lots = cohortLots / 2; // 40 (the other 40 ran on ETCH05)
  const background = 0.04; // signature rate on unaffected wafers
  const affectedRate = 0.8; // signature rate on chamber-B wafers after the swap
  const bWafers = etch04Lots * (FAB.lotSize / 4); // 250
  const bSignature = bWafers * affectedRate; // 200
  const otherWafers = cohortWafers - bWafers; // 1,750
  const otherSignature = otherWafers * background; // 70
  // The 10 named lots (all ran on ETCH04; passed step 412 on days 3–10, sorted on days 32–39): 62 wafers on B (50
  // with the signature), 188 elsewhere (8).
  const named = { lots: 10, bWafers: 62, bSig: 50, otherWafers: 188, otherSig: 8 };
  const namedSigShare = (named.bSig + named.otherSig) / (named.lots * FAB.lotSize); // 58 / 250 = 0.232
  // Discovery = 10 named + 20 random other lots (10 ETCH04, 10 ETCH05); held-out = the other 50 lots (20 ETCH04).
  const discovery = {
    lots: 30,
    wafers: 750,
    bWafers: 125,
    bSig: 100,
    sisterWafers: 375, // A, C, D wafers in the same 20 ETCH04 lots
    sisterSig: 15,
    etch05Wafers: 250,
    etch05Sig: 10,
  };
  const heldOut = {
    lots: 50,
    wafers: 1_250,
    bWafers: 125,
    bSig: 100,
    sisterWafers: 375,
    sisterSig: 15,
    etch05Wafers: 750,
    etch05Sig: 30,
  };
  // Check: discovery + held-out = cohort (B 250 / 200; elsewhere 1,750 / 70).
  const sumsCheck =
    discovery.bWafers + heldOut.bWafers === bWafers &&
    discovery.bSig + heldOut.bSig === bSignature &&
    discovery.sisterWafers + discovery.etch05Wafers + heldOut.sisterWafers + heldOut.etch05Wafers === otherWafers &&
    discovery.sisterSig + discovery.etch05Sig + heldOut.sisterSig + heldOut.etch05Sig === otherSignature;
  // Effect sizes shown to the engineer (Wilson intervals here; the page shows the lot-cluster bootstrap interval,
  // which is wider).
  const rate = (k: number, n: number) => ({ k, n, p: k / n, ci: wilson(k / n, n) });
  const heldOutB = rate(heldOut.bSig, heldOut.bWafers); // 80% [72.1, 86.1]
  const heldOutSister = rate(heldOut.sisterSig, heldOut.sisterWafers); // 4.0% [2.4, 6.5]
  const riskDifference = heldOutB.p - heldOutSister.p; // 0.76
  // Lot-cluster adjustment (review item R2-6): design effect 1 + (m − 1) × ICC with an ILLUSTRATIVE intra-lot
  // correlation of 0.1; m = 6.25 B wafers a lot, 18.75 sister wafers a lot. The page prints these intervals, labelled
  // as cluster-adjusted; the product computes a lot bootstrap at run time.
  const icc = 0.1;
  const deB = 1 + (FAB.lotSize / 4 - 1) * icc; // 1.525
  const deSister = 1 + (FAB.lotSize * 0.75 - 1) * icc; // 2.775
  const heldOutBCluster = wilson(heldOut.bSig / heldOut.bWafers, heldOut.bWafers / deB); // n_eff 82: ≈ 70.1–87.2% (sister ≈ 1.8–8.8%)
  const heldOutSisterCluster = wilson(heldOut.sisterSig / heldOut.sisterWafers, heldOut.sisterWafers / deSister);
  // Slot alias (review item R2-7): the cluster tool assigns chambers by slot from a varying start slot; chamber B
  // overlaps slot class 2 mod 4 with Jaccard 0.31 (illustrative), so the within-lot test is stratified by slot class.
  const slotClassJaccard = 0.31;
  const etch04LotsWithBSignature = { heldOut: 20, of: 20 }; // every held-out ETCH04 lot has signature wafers on B
  // Before and after the change on chamber B (the same window length): the change-point.
  const before = rate(10, bWafers); // 4.0% [2.2, 7.2]
  const after = rate(bSignature, bWafers); // 80% [74.6, 84.5]
  // Candidate family (review items 10, 11): chamber-at-step cells that ran cohort wafers (560 steps × ≈ 6 chambers)
  // + chamber at any step (1,200 chambers touched) + recipe bodies 300 + material lots 200 + maintenance windows 500 +
  // test side (probe cards, testers, programs) 90 + reticles 150.
  // Two families (review item R2-5). Within-lot kinds vary inside a lot: chamber at step (560 × ≈ 6), chamber at any
  // step (1,200), recipe bodies (300), maintenance and state windows (500): 5,360. Lot-level kinds take one value per
  // lot: material lots (200), test side (90), reticles (150): 440. E-test and metrology are evidence (continuous
  // summaries), not candidates; slot and batch position are stratification covariates (review item R2-7).
  const withinLot = FAB.processSteps * 6 + 1_200 + 300 + 500; // 5,360
  const lotLevel = 200 + 90 + 150; // 440
  const tests = withinLot + lotLevel; // 5,800
  const alpha = 0.05;
  const alphaWithin = 0.04; // α split across the two families (family-wise ≤ 0.05)
  const alphaLot = 0.01;
  const chanceHits = tests * alpha; // 290 at p < 0.05 each, both families
  const chanceHitsWithin = withinLot * alpha; // 268
  const chanceHitsLot = lotLevel * alpha; // 22
  const bonferroni = alpha / tests; // 8.6e-6
  const byFactor = Math.log(tests) + 0.5772; // 9.24: Benjamini–Yekutieli's cost under arbitrary dependence
  // Max-T (Westfall–Young): permute the signature labels within each lot 10,000 times; each candidate's adjusted p is
  // the share of permutations whose MAXIMUM statistic over all 5,800 candidates beats its observed one. Family-wise
  // error control under any dependence between candidates; the floor is 1 ÷ 10,001.
  const permutations = 10_000;
  const permutationFloor = 1 / (permutations + 1); // ≈ 1.0e-4
  const wordsPerCandidate = Math.ceil(discovery.wafers / 64); // 12 64-bit words of a wafer bitset
  const permutationWordOps = tests * wordsPerCandidate * permutations; // 696M AND-popcounts (≈ 0.5 s on a few cores)
  const preRegistered = 3; // top hypotheses carried to the held-out lots
  const confirmAlpha = alpha / preRegistered; // 0.0167
  // Early case (review item R2-8): confirmation needs held-out lots giving ≥ 80% power at the discovered effect; below
  // that the hypothesis is "unconfirmed, k more lots expected by day d". For this effect power is not the problem:
  const earlyOneLot = fisherGreater(5, 6, 1, 19); // 1 ETCH04 lot: 5 of 6 B wafers vs 1 of 19 sister: ≈ 6.5e-4
  const earlyTwoLots = fisherGreater(10, 12, 2, 38); // 2 lots: ≈ 3.9e-7
  // For a 10-point effect (14% vs 4%) at α 0.0167 one-sided and 80% power, normal approximation with equal groups and
  // the lot design effect: (2.128 + 0.842)² × (0.14 × 0.86 + 0.04 × 0.96) ÷ 0.10² ≈ 140 B wafers × 1.525 ≈ 214 B
  // wafers ≈ 34 ETCH04 lots (an overestimate: sister wafers are 3× more numerous).
  const zA = 2.128;
  const zB = 0.8416;
  const tenPointWafers = ((zA + zB) ** 2 * (0.14 * 0.86 + 0.04 * 0.96)) / 0.01; // ≈ 139.9

  // Lot-level candidates (one value per lot: resist lot, wet-bench batch) cannot vary within a lot; they form a second
  // family tested by permuting lot labels within process-day strata.
  const wet07 = { etch04Lots: 28, etch05Lots: 12 }; // WET07 (batch wet bench, step 414) processed 40 lots
  const lotBad = (lots: number, etch04: number) => etch04 / lots; // a lot is "bad" if ≥ 3 signature wafers: ETCH04 lots
  const wet07BadLotShare = lotBad(40, wet07.etch04Lots); // 0.70
  const otherWetBadLotShare = lotBad(40, etch04Lots - wet07.etch04Lots); // 0.30
  // Within the WET07 lots, the signature sits on the B wafers (80%) and not on the A, C, D wafers (4%) that went through
  // the same bath: WET07 is "checked and not supported".
  // Unconditional lot-level test (what a naive second family would do): 28 / 40 vs 12 / 40 bad lots, one-sided
  // Fisher p ≈ 3.5e-4: WET07 would be flagged (review item R2-4). The procedure is ordered: the within-lot family runs
  // first; lot-level candidates are then tested on the RESIDUAL wafers, those not explained by confirmed within-lot
  // hypotheses (here, the non-B wafers), permuted by lot within process days.
  const wet07Unconditional = fisherGreater(wet07.etch04Lots, 40, etch04Lots - wet07.etch04Lots, 40);
  const nonBPerEtch04Lot = FAB.lotSize - FAB.lotSize / 4; // 18.75
  const wet07Residual = {
    wafers: wet07.etch04Lots * nonBPerEtch04Lot + wet07.etch05Lots * FAB.lotSize, // 525 + 300 = 825
    otherWafers: (etch04Lots - wet07.etch04Lots) * nonBPerEtch04Lot + (40 - wet07.etch05Lots) * FAB.lotSize, // 925
    rate: background, // 33 / 825 = 4.0%
    otherRate: background, // 37 / 925 = 4.0%
  };
  const pr552 = { lots: 48, etch04Lots: 24, sigRateNonB: background, otherLotsSigRateNonB: background }; // 4% vs 4%
  // Intra-tool path (review item 12): ETCH04 is a cluster tool; a wafer etched in chamber B always strips in chamber 2.
  const stripPathJaccard = 1.0; // identical wafer sets: reported as one cluster "ETCH04 path B → strip 2"
  // Test side first (review item 10): 6 probe cards; the largest card share of signature wafers is 22% against its
  // 20% share of wafers tested; 0 of 30 sampled signature wafers recovered on retest.
  const probeCard = { cards: 6, maxSigShare: 0.22, maxTestedShare: 0.2, retested: 30, recovered: 0 };
  // Identity failure (review item 34): if FDC and CMMS name the chamber "E04_PM2" and MES "ETCH04-B" without a
  // mapping, the counts stay on ETCH04-B but the work order and traces attach to E04_PM2: the timing and sensor
  // features vanish and the confidence drops from high to medium.
  const traceShiftPct = 6.1; // DC bias in the main etch step, chamber-B wafers after vs before the swap
  // WIP at risk (review item 21): wafer passes through ETCH04-B (all its steps) in the 29 days not yet sorted.
  const wipAtRiskPasses = FAB.wafersPerChamberPerDay * Math.floor(FAB.sortLagDays); // 368 × 29 ≈ 10,678
  // Value of a day of faster containment (illustrative, review item R2-9): 368 wafer PASSES a day through chamber B
  // across its ≈ 8 steps, IF every step on B is affected like step 412 × 80% × 15% of die lost × 6,000 USD.
  const dieLossOnAffected = 0.15;
  const waferValue = 6_000; // USD, illustrative, mature node (review item 53)
  const dayOfContainment = FAB.wafersPerChamberPerDay * affectedRate * dieLossOnAffected * waferValue; // ≈ 265,000
  return {
    windowDays,
    cohortLots,
    cohortWafers,
    etch04Lots,
    background,
    affectedRate,
    bWafers,
    bSignature,
    otherWafers,
    otherSignature,
    named,
    namedSigShare,
    discovery,
    heldOut,
    sumsCheck,
    heldOutB,
    heldOutSister,
    riskDifference,
    etch04LotsWithBSignature,
    before,
    after,
    withinLot,
    lotLevel,
    tests,
    alphaWithin,
    alphaLot,
    chanceHits,
    chanceHitsWithin,
    chanceHitsLot,
    bonferroni,
    byFactor,
    permutations,
    permutationFloor,
    wordsPerCandidate,
    permutationWordOps,
    preRegistered,
    confirmAlpha,
    earlyOneLot,
    earlyTwoLots,
    tenPointWafers,
    wet07,
    wet07BadLotShare,
    otherWetBadLotShare,
    wet07Unconditional,
    wet07Residual,
    pr552,
    icc,
    deB,
    deSister,
    heldOutBCluster,
    heldOutSisterCluster,
    slotClassJaccard,
    stripPathJaccard,
    probeCard,
    traceShiftPct,
    wipAtRiskPasses,
    dieLossOnAffected,
    waferValue,
    dayOfContainment,
  };
})();

/** Hidden reasoning tokens per model call (review item 2). gpt-oss is a reasoning model with low / medium / high
 * effort (F49). Every call runs at LOW effort; 80 tokens is an illustrative budget until measured on site (the gate
 * uses the measured p50 and p95). Medium (≈ 300, illustrative) is evaluated for the writer only if the grader shows a
 * gain; its cost is in LATENCY.writerMediumExplanation. */
export const REASONING = { low: 80, medium: 300 } as const;

/** Prompt blocks (tokens; sheet §11). Visible output only; reasoning tokens are added per call. */
export const CONTEXT = (() => {
  const writer = {
    instructions: 1_000,
    format: 300,
    scope: 150, // question, lots, cohort rule, metric id, data-as-of per source
    populations: 200,
    hypotheses: 3 * 900, // per hypothesis: effects + intervals 150, timing and change-point 150, "what else changed" 200,
    // mechanism path 150, sensor summary 120, past case 130
    ruledOut: 250, // "checked and not supported" list with reasons
    passages: 6 * 250,
    headers: 300,
  };
  const writerIn = sum(Object.values(writer)); // 6,400
  const writerStable = writer.instructions + writer.format; // 1,300
  const writerOut = 3 * 130 + 150; // 540 visible: three hypotheses of 130 tokens + a 150-token summary
  const planner = { in: 1_500, out: 60 }; // compact plan JSON (free-text investigations only)
  const slotFill = { in: 1_800, out: 60 }; // when the encoder extractor cannot fill a template's slots
  const generate = { in: 3_600, out: 150 }; // schema subset 2,500 + 4 verified examples 800 + rules 200 + question 100
  const repair = { in: 3_800, out: 150 };
  const summary = { in: 1_200, out: 40 }; // one sentence under a lookup table (review item 45: one value, 40)
  const document = { in: 3_500, out: 250 };
  const fullSchema = 120 * 25 + 900 * 12; // 13,800 tokens of schema description
  const lotHistory = FAB.routeSteps * 40; // 32,000 tokens for one lot's raw history
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

/** Guards on every query the assistant runs, graph or columnar (sheet §6, §10, deep dive 2). */
export const QUERY_GUARDS = {
  maxRows: 1_000,
  maxHops: 4,
  maxEstimatedRows: 1_000_000, // EXPLAIN estimate: a heuristic for variable-length patterns; the caps are the bound
  timeoutMs: 5_000, // Neo4j db.transaction.timeout on the assistant-only replicas (server settings, F20); ClickHouse
  memoryMb: 512, // max_execution_time 5 s and max_memory_usage on the readonly=1 profile
  columnarMaxRowsToRead: 200_000_000,
  crossStoreKeyCap: 100_000, // ids passed from the graph to a columnar call; above it: "narrow the window"
  repairs: 1, // one repair round after a validation error (review item 23)
  templates: 40, // 28 graph, 12 cross-store
  perUserConcurrency: 2, // in-flight queries an engineer may have (gateway)
  timeWindowRequiredLabels: ["Run", "FdcHold", "SpcViolation", "StateChange", "Inspection"],
} as const;

/** Latency per request type for a reasoning budget per call, p50 and gated p95 (ms; estimates; sheet §12). */
function buildLatency(reasoning: number) {
  const decode = 100; // tokens a second per stream (F45, estimate)
  const decodeP95 = 70;
  const gen = (id: string, tokens: number) => stage(id, (tokens / decode) * 1_000, (tokens / decodeP95) * 1_000, true);
  const think = (id: string, tokens: number = reasoning) => gen(`${id} reasoning (${tokens} tokens)`, tokens);
  const edge = stage("edge", 50, 100); // TLS, SSO token, scope role, audit record
  const routeAndMatch = par("route ‖ template match", [
    { p50: 20, p95: 40 },
    { p50: 25, p95: 50 },
  ]);
  const slotsByEncoder = stage("slot extraction (encoder NER + date parser)", 25, 50);
  const link = stage("entity-link literals to master ids", 20, 50);
  const validate = stage("parse, allow-list, schema and value check", 15, 30);
  const explain = stage("EXPLAIN / columnar plan check", 30, 80);
  const execute = stage("execute on a read replica", 150, 1_000);
  const crossStore = stage("typed columnar call + forward genealogy", 180, 600);
  const render = stage("render table by code", 10, 20);
  const slotFillByModel = [
    stage("slot-fill first token", 250, 500, true),
    think("slot-fill"),
    gen("slot-fill (60)", 60),
  ];
  const run = [validate, explain, execute];

  const tEncGraph = path([edge, routeAndMatch, slotsByEncoder, link, ...run, render]);
  const tEncCross = path([edge, routeAndMatch, slotsByEncoder, link, ...run, crossStore, render]);
  const tLlmGraph = path([edge, routeAndMatch, ...slotFillByModel, link, ...run, render]);
  const tLlmCross = path([edge, routeAndMatch, ...slotFillByModel, link, ...run, crossStore, render]);
  const generateStages = [
    stage("schema linking", 30, 60),
    stage("generate first token", 400, 800, true),
    think("generate"),
    gen("generate query (150)", CONTEXT.generate.out),
  ];
  const generatedStages = [edge, routeAndMatch, ...generateStages, link, ...run, render];
  const generated = path(generatedStages);
  const repaired = path([
    edge,
    routeAndMatch,
    ...generateStages,
    link,
    validate,
    stage("repair first token", 400, 800, true),
    think("repair"),
    gen("repair query (150)", CONTEXT.repair.out),
    link,
    ...run, // re-validated, re-checked and executed (review item 23)
    render,
  ]);
  const timedOut = path([
    edge,
    routeAndMatch,
    slotsByEncoder,
    link,
    validate,
    explain,
    stage("timeout", 5_000, 5_050),
    render,
  ]);
  const timedOutGenerated = path([
    edge,
    routeAndMatch,
    ...generateStages,
    link,
    validate,
    explain,
    stage("timeout", 5_000, 5_050),
    render,
  ]);
  const u = USERS;
  const t = u.templateShare;
  // Timeouts (0.5% of lookups, review item R2-13): 0.3% on encoder templates, 0.2% on generated queries.
  const toT = 0.003;
  const toG = u.timeoutShare - toT;
  const lookupParts = [
    { weight: t * u.encoderSlotShare * (1 - u.crossStoreShare) - toT, path: tEncGraph },
    { weight: t * u.encoderSlotShare * u.crossStoreShare, path: tEncCross },
    { weight: t * (1 - u.encoderSlotShare) * (1 - u.crossStoreShare), path: tLlmGraph },
    { weight: t * (1 - u.encoderSlotShare) * u.crossStoreShare, path: tLlmCross },
    { weight: (1 - t) * (1 - u.repairShare) - toG, path: generated },
    { weight: (1 - t) * u.repairShare, path: repaired },
    { weight: toT, path: timedOut },
    { weight: toG, path: timedOutGenerated },
  ];
  const lookupResult = mixDist(lookupParts);
  const templateParts = lookupParts.slice(0, 4);
  const templateWeight = sum(templateParts.map((p) => p.weight));
  const templateResult = mixDist(templateParts.map((p) => ({ weight: p.weight / templateWeight, path: p.path })));
  const generatedResult = mixDist([
    { weight: 1 - u.repairShare, path: generated },
    { weight: u.repairShare, path: repaired },
  ]);
  const summaryAfter = path([stage("summary first token", 300, 600, true), think("summary"), gen("summary (40)", 40)]);

  // Document question: first verified sentence.
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
    think("answer"),
    gen("first sentence (25)", 25),
    stage("sentence check", 20, 50),
  ];
  const documentFirst = path(documentStages);

  // Investigation. Plan: from YMS (lots selected; built by code) or from free text (the model plans).
  const resolve = stage("resolve lots, child lots, wafers; metric from the semantic layer", 80, 200);
  const planYms = [edge, stage("read the YMS selection", 30, 80), resolve];
  const planText = [
    edge,
    stage("planner first token", 300, 600, true),
    think("planner"),
    gen("plan JSON (60)", 60),
    link,
    resolve,
  ];
  const middle = [
    par("cohort (time-matched) ‖ sort data and signatures", [
      { p50: 300, p95: 700 },
      { p50: 400, p95: 900 },
    ]),
    par("within-lot tests + 10,000-permutation max-T ‖ test-side check", [
      { p50: 1_000, p95: 2_200 },
      { p50: 100, p95: 250 },
    ]),
    stage("FDC indicator tests (top 20 × 30)", 600, 1_400),
    stage("cluster inseparable candidates", 50, 100),
    par("graph context + what-else-changed + WIP at risk ‖ 3 trace summaries ‖ past cases ‖ change-points", [
      { p50: 700, p95: 1_400 },
      ...times(3, { p50: 1_500, p95: 4_000 }),
      { p50: 80, p95: 190 },
      { p50: 100, p95: 250 },
    ]),
    stage("held-out confirmation of the top 3", 300, 700),
    stage("rank and calibrate", 30, 60),
  ];
  const writer = (reasoning: number) => [
    stage("writer first token (6,400-token prompt)", 600, 1_200, true),
    think("writer", reasoning),
    gen(`writer (${CONTEXT.writerOut})`, CONTEXT.writerOut),
    stage("final checks", 20, 50),
  ];
  const firstText = (reasoning: number) => [
    stage("writer first token (6,400-token prompt)", 600, 1_200, true),
    think("writer", reasoning),
    gen("first hypothesis text (130)", 130),
    stage("check", 20, 50),
  ];
  const w = u.ymsLaunchShare;
  const mixPlan = (a: Stage[], b: Stage[]) =>
    mixDist([
      { weight: w, path: path(a) },
      { weight: 1 - w, path: path(b) },
    ]);
  const plan = mixPlan(planYms, planText);
  const planTextOnly = path(planText);
  const hypotheses = mixPlan([...planYms, ...middle], [...planText, ...middle]);
  const hypothesesText = path([...planText, ...middle]);
  const firstHypothesisText = mixPlan(
    [...planYms, ...middle, ...firstText(reasoning)],
    [...planText, ...middle, ...firstText(reasoning)]
  );
  const explanation = mixPlan(
    [...planYms, ...middle, ...writer(reasoning)],
    [...planText, ...middle, ...writer(reasoning)]
  );
  const explanationText = path([...planText, ...middle, ...writer(reasoning)]);
  const writerMediumExplanation = mixPlan(
    [...planYms, ...middle, ...writer(REASONING.medium)],
    [...planText, ...middle, ...writer(REASONING.medium)]
  );
  // Breakpoint (p50, free-text route, the slower one): the explanation holds 15,000 ms while the visible + reasoning
  // tokens of planner and writer (60 + 80 + 540 + 80 = 760) decode at ≥ this speed.
  const decodedTokens = CONTEXT.planner.out + reasoning + CONTEXT.writerOut + reasoning; // 760
  const fixedText = explanationText.p50 - (decodedTokens / decode) * 1_000;
  const decodeBreakpointExplanation = (decodedTokens * 1_000) / (15_000 - fixedText);
  return {
    decode,
    decodeP95,
    tEncGraph,
    tEncCross,
    tLlmGraph,
    tLlmCross,
    generated,
    repaired,
    timedOut,
    timedOutGenerated,
    lookupResult,
    templateResult,
    generatedResult,
    summaryAfter,
    documentFirst,
    plan,
    planTextOnly,
    hypotheses,
    hypothesesText,
    firstHypothesisText,
    explanation,
    explanationText,
    writerMediumExplanation,
    decodeBreakpointExplanation,
    stages: {
      generatedStages,
      documentStages,
      planText,
      middle,
      // Added for the kg-semi/latency waterfall (no value changed): the encoder-slotted graph template route, and the
      // writer's stages at this reasoning budget.
      templateStages: [edge, routeAndMatch, slotsByEncoder, link, ...run, render],
      writerStages: writer(reasoning),
    },
  };
}
export const LATENCY = buildLatency(REASONING.low);

/** Targets (sheet §4 N5) and whether a latency budget meets them, at p50 and the gated p95. */
function targetRows(L: ReturnType<typeof buildLatency>) {
  const row = (id: string, label: string, d: Dist, targetP50: number, targetP95: number) => ({
    id,
    label,
    p50: d.p50,
    p95: d.p95,
    targetP50,
    targetP95,
    meets: d.p50 <= targetP50 && d.p95 <= targetP95,
  });
  return [
    row("lookup", "Lookup: result table, all routes mixed", L.lookupResult, 1_500, 5_000),
    row("lookupTemplate", "Lookup, template routes", L.templateResult, 1_000, 3_000),
    row("lookupGenerated", "Lookup, generated query (incl. one repair)", L.generatedResult, 4_000, 7_000),
    row("lookupRepaired", "Lookup, repaired query (named in the UI)", L.repaired, 7_000, 9_500),
    row("lookupTimedOut", 'Lookup, timed out ("query too broad")', L.timedOutGenerated, 8_500, 10_000),
    row("document", "Document question: first verified sentence", L.documentFirst, 2_000, 4_000),
    row("plan", "Investigation: plan shown (YMS and free text mixed)", L.plan, 2_000, 4_000),
    row("planText", "Investigation: plan shown, free-text route", L.planTextOnly, 2_000, 4_000),
    row("hypotheses", "Investigation: ranked hypotheses with evidence", L.hypotheses, 8_000, 15_000),
    row("hypothesesText", "Investigation: ranked hypotheses, free-text route", L.hypothesesText, 8_000, 15_000),
    row("explanation", "Investigation: explanation complete", L.explanation, 15_000, 25_000),
    row("explanationText", "Investigation: explanation complete, free-text route", L.explanationText, 15_000, 25_000),
  ];
}
export const TARGETS = targetRows(LATENCY);

/**
 * Reasoning-token breakpoints (review item R2-2): for each target row, the smallest budget per call (tokens) at which
 * the row stops meeting its target, with every other stage unchanged. 80 is budgeted, not measured; when the
 * measurement comes back, this table says which targets survive it.
 */
export const REASONING_BREAKPOINTS = (() => {
  const ids = TARGETS.map((r) => r.id);
  const fails = (r: number, id: string) => !targetRows(buildLatency(r)).find((x) => x.id === id)!.meets;
  return ids.map((id) => {
    let lo = 0;
    let hi = 2_000;
    if (!fails(hi, id)) return { id, tokens: Infinity };
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fails(mid, id)) hi = mid;
      else lo = mid;
    }
    return { id, tokens: hi };
  });
})();

/** Model-server demand (reasoning tokens included) and the GPU fleet (sheet §5; review items 2, 24). */
export const FLEET = (() => {
  const u = USERS;
  const c = CONTEXT;
  const r = REASONING.low;
  // Calls a day: [count, input tokens, visible output tokens]; every call adds r reasoning tokens to its output.
  const calls = {
    planner: [u.investigations * (1 - u.ymsLaunchShare), c.planner.in, c.planner.out], // 64.8
    writer: [u.investigations, c.writerIn, c.writerOut], // 162
    slotFill: [u.lookups * u.templateShare * (1 - u.encoderSlotShare), c.slotFill.in, c.slotFill.out], // 90.7
    generate: [u.lookups * (1 - u.templateShare), c.generate.in, c.generate.out], // 194.4
    repair: [u.lookups * (1 - u.templateShare) * u.repairShare, c.repair.in, c.repair.out], // 15.6
    summary: [u.lookups, c.summary.in, c.summary.out], // 648
    document: [u.documents, c.document.in, c.document.out], // 270
    extraction: [50, 6_000, 1_500], // nightly: 50 new FMEA sheets, 8D reports or SOP revisions a day (batch GPU)
    replayWriter: [10, c.writerIn, c.writerOut], // 300 replayed cases a month through the writer
  } as const;
  const rows = Object.values(calls);
  const inPerDay = sum(rows.map(([n, i]) => n * i)); // ≈ 4.14M
  const outPerDay = sum(rows.map(([n, , o]) => n * (o + r))); // ≈ 422,600 incl. ≈ 120,400 reasoning
  const reasoningPerDay = sum(rows.map(([n]) => n * r));
  const streamSecondsPerDay = outPerDay / LATENCY.decode; // ≈ 4,226
  // Model-seconds on the critical path per question (first token + decode of reasoning and visible tokens), by type.
  const ms = (ttft: number, tokens: number) => ttft / 1_000 + tokens / LATENCY.decode;
  const modelSeconds = {
    investigation: ms(600, c.writerOut + r) + (1 - u.ymsLaunchShare) * ms(300, c.planner.out + r), // 6.8 + 0.68
    lookup:
      u.templateShare * (1 - u.encoderSlotShare) * ms(250, c.slotFill.out + r) +
      (1 - u.templateShare) * ms(400, c.generate.out + r) +
      (1 - u.templateShare) * u.repairShare * ms(400, c.repair.out + r) +
      ms(300, c.summary.out + r),
    document: ms(500, c.document.out + r),
  };
  const meanModelSeconds =
    u.mix.investigation * modelSeconds.investigation +
    u.mix.lookup * modelSeconds.lookup +
    u.mix.document * modelSeconds.document;
  const burstConcurrentStreams = u.burstPerSecond * meanModelSeconds; // ≈ 0.65
  const streamsPerGpuAt100 = 5_863 / 100; // ≈ 59 (F45, estimate)
  // Two hosts for availability (review item 24): host A = model replica + encoders; host B = model replica + batch
  // (and a standby encoder). 4 GPUs.
  const hosts = 2;
  const gpuCount = 4;
  const gpuPerDay = gpuCount * 24 * KS_PRICES.gpuHour; // 240 USD
  return {
    calls,
    inPerDay,
    outPerDay,
    reasoningPerDay,
    streamSecondsPerDay,
    modelSeconds,
    meanModelSeconds,
    burstConcurrentStreams,
    streamsPerGpuAt100,
    hosts,
    gpuCount,
    gpuPerDay,
  };
})();

/** Daily cost, all in (sheet §5, §12). */
export const COST = (() => {
  const p = KS_PRICES;
  const infra = {
    gpus: FLEET.gpuPerDay, // 240
    graph: 3 * 4 * 24, // primary + 2 assistant-only read replicas, 128 GB RAM class, 4 USD an hour each: 288
    columnar: 3 * 3.5 * 24, // 3 nodes holding 5 years of wafer-step rows: 252
    traceApi: 2 * 1 * 24, // read API in front of the fab's existing FDC store: 48
    search: 2 * 2.5 * 24, // report and SOP index: 120
    platform: 150, // orchestrator, ingest log and workers, gateway, audit, traces
  };
  const infraPerDay = sum(Object.values(infra)); // 1,098
  const graphLicencePerDay = p.graphLicencePerYear / 365; // 411 (placeholder)
  const team = { knowledgeEngineers: 2, dataEngineers: 4, mlEngineers: 2, yieldAnalyst: 1, sre: 1 };
  const teamSize = sum(Object.values(team)); // 10
  const peoplePerDay = (teamSize * p.fullyLoadedPerYear) / 365; // 8,219
  const review = (100 * 2 * (3 / 60) * p.engineerHour * 12) / 365; // lookup grading: 49
  // Fab engineers' time (review item 28): approving the 20,000-row FMEA backlog once (1 min a row = 333 h, 50,000 USD,
  // spread over 2 years) + 300 new rows a month + 10 minutes of verdict and evidence per flagged excursion.
  const backlogUsd = ((20_000 * 1) / 60) * p.engineerHour; // 50,000
  const engineerTime =
    backlogUsd / 730 +
    ((300 / 60) * p.engineerHour) / 30.4 +
    USERS.excursionsFlaggedPerDay * (10 / 60) * p.engineerHour;
  // ≈ 68.5 + 24.7 + 75 = 168
  const perDay = infraPerDay + graphLicencePerDay + peoplePerDay + review + engineerTime; // ≈ 9,946
  const shares = {
    people: peoplePerDay / perDay,
    infra: infraPerDay / perDay,
    gpus: infra.gpus / perDay,
    licence: graphLicencePerDay / perDay,
    engineers: (review + engineerTime) / perDay,
  };
  const perQuestion = perDay / USERS.perDay; // ≈ 9.21
  const gpuPerQuestion = infra.gpus / USERS.perDay; // 0.22
  // The rejected option, like for like (review item 24): every generative call (reasoning counted as output, the same
  // counts assumed) at the mid-size list price, plus the 2 encoder GPUs a hosted design still runs on site.
  const m = p.hostedMid;
  const hostedTokens = usd(FLEET.inPerDay, m.input) + usd(FLEET.outPerDay, m.output); // ≈ 12.5
  const hostedEncoders = 2 * 24 * p.gpuHour; // 120
  const hostedPerDay = hostedTokens + hostedEncoders; // ≈ 132.5
  const boundaryPremium = infra.gpus - hostedPerDay; // ≈ 107.5 USD a day
  const boundaryShare = boundaryPremium / perDay; // ≈ 1.1%
  const dayOverCost = STATS.dayOfContainment / perDay; // ≈ 26.7×, IF the assistant shortens containment by a full day
  return {
    infra,
    infraPerDay,
    graphLicencePerDay,
    team,
    teamSize,
    peoplePerDay,
    review,
    backlogUsd,
    engineerTime,
    perDay,
    shares,
    perQuestion,
    gpuPerQuestion,
    hostedTokens,
    hostedEncoders,
    hostedPerDay,
    boundaryPremium,
    boundaryShare,
    dayOverCost,
  };
})();

/** Evaluation sets, intervals and bounds (sheet §13; review items 8, 30, 31, 32). */
export const EVAL = (() => {
  const cases = USERS.excursionsConfirmedPerYear * 5; // 300 confirmed excursions
  const warmUp = 30; // the first 30 cases only train (rolling origin: each case is scored by a ranker fitted on cases
  // closed before its detection date, with knowledge edges approved before that date)
  const gated = cases - warmUp; // 270
  // Replay fidelity (review item R2-1): cases detected in the last 2 years (≈ 120) replay exactly (graph execution,
  // events, knowledge and per-wafer FDC indicators as of then); the older 150 scored cases replay with execution read
  // from the columnar store and the sensor feature from daily aggregated indicators. Both classes are reported.
  const exactCases = USERS.excursionsConfirmedPerYear * (GRAPH.execDays / 365); // 120
  const approxCases = gated - exactCases; // 150
  const hit3Exact = wilson(0.7, exactCases); // ± ≈ 8.0
  const hit3 = { target: 0.7, ci: wilson(0.7, gated) }; // ± ≈ 5.4
  const hit1 = { target: 0.45, ci: wilson(0.45, gated) }; // ± ≈ 5.9
  const coverageTarget = 0.9; // share of confirmed causes whose candidate kind the system tests at all
  // Paired comparison with the YMS commonality screen on the same 270 cases (McNemar): with 20% discordant pairs, the
  // smallest difference detectable at 80% power and α = 0.05 is (1.96 + 0.84) × √0.2 ÷ √270 ≈ 7.6 points.
  const discordant = 0.2;
  const mcnemarMdd = ((1.959964 + 0.841621) * Math.sqrt(discordant)) / Math.sqrt(gated);
  const seeded = { n: 2_000, timeConfounded: 500, detect: 0.9, nulls: 1_000, falseHigh: 0.05 };
  const detect = wilson(seeded.detect, seeded.n); // ± 1.3
  const falseHigh = wilson(seeded.falseHigh, seeded.nulls); // ± 1.4
  const queries = { template: 300, crossStoreInTemplate: 100, generated: 150, misspelled: 50 };
  const templateCi = wilson(0.95, queries.template); // ± ≈ 2.5
  const generatedCi = wilson(0.8, queries.generated); // ± ≈ 6.4
  const highBin = { n: 100, observed: 0.6, ci: wilson(0.6, 100) }; // lower bound ≈ 0.50: the gate is the lower bound
  const ruleOfThree = (n: number) => 3 / n;
  const leakage = { prompts: 200, bound: ruleOfThree(200) }; // 0 leaks → ≤ 1.5% at 95%
  const bypass = { attempts: 300, bound: ruleOfThree(300) }; // 0 executed → ≤ 1.0% at 95%
  const extraction = { triples: 1_000, precision: 0.9, ci: wilson(0.9, 1_000) }; // ± 1.9
  return {
    cases,
    warmUp,
    gated,
    exactCases,
    approxCases,
    hit3Exact,
    hit3,
    hit1,
    coverageTarget,
    discordant,
    mcnemarMdd,
    seeded,
    detect,
    falseHigh,
    queries,
    templateCi,
    generatedCi,
    highBin,
    leakage,
    bypass,
    extraction,
  };
})();

/** Freshness: pipeline lag and source lag (sheet §4 N7; review item 9). */
export const FRESHNESS = {
  mesTrackOutToGraphP50Ms: 5_000, // pipeline lag
  mesTrackOutToGraphP95Ms: 60_000,
  stateChangeSourceLagP95Min: 2, // E10 state transitions from MES or the equipment interface
  fdcHoldToGraphP95Ms: 60_000,
  recipeDownloadToGraphP95Min: 5,
  sortUploadToGraphP95Min: 15,
  cmmsSourceLagMedianHours: 3, // work orders opened or closed after the work (illustrative; measured per source)
  quarantineHoldMin: 10, // early events wait and retry before quarantine (review item 38)
  backdatedFlagDays: 30, // a late event inside a recent answer's window flags that answer
  gapAfterMin: 10, // a source more than 10 minutes behind is a gap on any answer that used it
  documentsToGraphDays: 1,
} as const;
