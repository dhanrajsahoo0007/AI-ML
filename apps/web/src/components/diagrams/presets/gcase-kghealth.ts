// Constants and arithmetic for the "Design a Clinical Knowledge-Graph Assistant" case study (/genai-system-design/
// case-studies/kg-healthcare-case-study; design sheet SYSTEM-DESIGN/plans/genai-design/design/kg-healthcare-case-study.md
// v2, after design review round 1; dossier research/kg-healthcare-case-study.md, facts cited as "dossier F12"; review
// review/kg-healthcare-case-study-design.md). Specs in assets/diagrams/animated/kg-health/ import from here, so the page,
// the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost. It defines its own ILLUSTRATIVE hospital network ("the network"): 12 hospitals, 4,000
// beds, 140 clinics, 2M patients with records, 6,000 prescribers; v1 scope is adults (≥ 18), not on dialysis or
// continuous renal replacement. NO production source publishes volume, latency or cost for a clinical GraphRAG assistant
// (dossier §9): every volume, mix, rate, latency, salary, licence fee and unit cost below is an ESTIMATE unless a
// comment names a source. Paper results are quoted with their paper and task.
//
// Sources used for numbers (dossier): CDS Hooks "on the order of 500 ms" (F23, a spec expectation, not a measurement);
// UMLS 2026AB 3,550,208 concepts (F1); SNOMED CT 360,000+ concepts (F7); ONC high-priority list 15 pairs (F15); n2c2
// 2019 human agreement 74.20% after adjudication (F30); Eliquis label dose criteria and inhibitor rule (F66, F67).
// Model list prices as of November 2026 are imported from the answer-engine preset so one price has one value across
// the site (mid-size Claude Sonnet 5.5 class 2.00 input / 0.10 cache read / 2.50 5-minute cache write / 10.00 output USD
// per million tokens; small Claude Haiku 5.5 class 0.10 / 0.01 / 0.125 / 0.50). Both run under the vendor's BAA (F58);
// prompt caching and structured outputs are HIPAA-eligible features (F69). GPU hour 2.5 USD and encoder throughput
// 200,000 tokens a second a GPU are the answer-engine preset's illustrative values, reused.
//
// Latency: parallel stages are the maximum of their draws (maxOfParts, the product of the draws' normal CDFs), at p50
// and p95. p95 per path is p50 + the root-sum-square of stage spreads (p95 − p50), with a correlated case where the
// model-provider stages (first token, sentence, and the planner when it runs) slow together, then mixed with the answers
// whose first sentence is dropped by the checker (restart). Two planner routes (encoder 85%, small model 15%) are mixed.

import { mixtureQuantile, PRICES } from "./gcase-answer";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error < 1.5e-7). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
const Z95 = 1.6448536;

type Dist = { p50: number; p95: number };

/** Quantile q of the maximum of independent normal draws, each given by its p50 and p95 (bisection on Π CDF). */
export function maxOfParts(parts: readonly Dist[], q: number) {
  const cdf = (t: number) => parts.reduce((p, d) => p * phi(((t - d.p50) / (d.p95 - d.p50)) * Z95), 1);
  let lo = 0;
  let hi = 100_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const maxDist = (parts: readonly Dist[]): Dist => ({ p50: maxOfParts(parts, 0.5), p95: maxOfParts(parts, 0.95) });
const times = (n: number, d: Dist) => Array.from({ length: n }, () => d);

/** P(exactly k of n) for a binomial with rate p. */
function binom(n: number, k: number, p: number) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * p ** k * (1 - p) ** (n - k);
}

/** Wilson 95% interval for a proportion p observed on n cases: [low, high]. */
function wilson(p: number, n: number) {
  const z = 1.96;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [centre - half, centre + half] as const;
}

/** Prices (imported list prices, as of November 2026) and illustrative infrastructure rates. */
export const KH_PRICES = {
  mid: PRICES.mid,
  small: PRICES.small,
  gpuHour: PRICES.gpuHour, // 2.5 USD, illustrative
  encoderTokensPerSecond: PRICES.smallEncoderTokensPerSecond, // 200,000, illustrative
  // A small open LLM (8B class) inside the PHI zone, batched on one GPU (illustrative): prefill 20,000 tokens a second,
  // decode 2,500 output tokens a second across the batch.
  smallLlmPrefillPerSecond: 20_000,
  smallLlmDecodePerSecond: 2_500,
  serviceNodeHour: 1.5, // rules service instance holding the in-memory knowledge snapshot, illustrative
  dbNodeHour: 4, // PostgreSQL node with pgvector, illustrative
  searchNodeHour: 3, // passage search node (no PHI), illustrative
  storageGbMonth: 0.1, // backup and DR copies, illustrative
} as const;

/** The illustrative hospital network and its daily volumes (sheet §5). */
export const NETWORK = (() => {
  const hospitals = 12;
  const beds = 4_000;
  const occupancy = 0.85;
  const occupiedBeds = beds * occupancy; // 3,400
  const clinics = 140;
  const clinicVisitsPerDay = 30_000;
  const patientsWithRecords = 2_000_000;
  const activePatients = 1_200_000; // seen in the last 3 years
  const prescribers = 6_000; // doctors, nurse practitioners, physician associates, pharmacists
  const dailyActiveShare = 0.3;
  const questionsPerActiveUser = 4;
  const questionsPerDay = prescribers * dailyActiveShare * questionsPerActiveUser; // 7,200
  const mix = { safety: 0.4, record: 0.45, reference: 0.15 } as const;
  const peakHourShare = 0.12; // morning rounds, 08:00–09:00
  const burst = 4; // within-hour burst over the peak-hour mean
  const questionsPeakPerSecond = (questionsPerDay * peakHourShare) / 3_600; // 0.24
  // Medication orders: inpatient 3,400 occupied beds × 8 orders a bed-day = 27,200; outpatient 30,000 visits × 0.8
  // prescriptions = 24,000.
  const inpatientOrders = occupiedBeds * 8; // 27,200
  const outpatientOrders = clinicVisitsPerDay * 0.8; // 24,000
  const ordersPerDay = inpatientOrders + outpatientOrders; // 51,200
  // CDS Hooks calls (review item 21): order-select fires on each selection and draft change, ≈ 2 calls an order
  // (illustrative, 1.5–3); order-sign fires once per signing session of ≈ 2.5 orders. Cards are shown at order-sign
  // (the full draft set is known); order-select warms the cache and returns only critical cards.
  const selectCallsPerOrder = 2;
  const ordersPerSignSession = 2.5;
  const selectCalls = ordersPerDay * selectCallsPerOrder; // 102,400
  const signCalls = ordersPerDay / ordersPerSignSession; // 20,480
  const hookCalls = selectCalls + signCalls; // 122,880
  const ordersPeakHourShare = 0.1;
  const hookPeakPerSecond = (hookCalls * ordersPeakHourShare) / 3_600; // 3.41
  // Notes: inpatient 3,400 × 6 a day = 20,400; outpatient 30,000 × 1.5 = 45,000; reports (radiology, pathology,
  // discharge) 15,000 → 80,400 a day at 700 tokens each.
  const notesPerDay = occupiedBeds * 6 + clinicVisitsPerDay * 1.5 + 15_000; // 80,400
  const noteTokens = 700;
  const mentionsPerNote = 40;
  // Stored notes (round 1 item 19, R2-6): a modest growth curve, from ≈ 55,000 notes a day ten years ago (the network
  // already ran a certified EHR) to 80,400 today, linearly: average 67,700 × 3,650 ≈ 247M. At today's rate throughout
  // it would be 293.5M (sensitivity in COST.backfillAtTodaysRate).
  const avgNotesPerDayOverDecade = (55_000 + notesPerDay) / 2; // 67,700
  const storedNotes = Math.round((avgNotesPerDayOverDecade * 3_650) / 1e6) * 1e6; // 247.1M → 247,000,000
  return {
    hospitals,
    beds,
    occupancy,
    occupiedBeds,
    clinics,
    clinicVisitsPerDay,
    patientsWithRecords,
    activePatients,
    prescribers,
    dailyActiveShare,
    questionsPerActiveUser,
    questionsPerDay,
    mix,
    perType: {
      safety: questionsPerDay * mix.safety, // 2,880
      record: questionsPerDay * mix.record, // 3,240
      reference: questionsPerDay * mix.reference, // 1,080
    },
    peakHourShare,
    burst,
    questionsPeakPerSecond,
    questionsBurstPerSecond: questionsPeakPerSecond * burst, // 0.96
    inpatientOrders,
    outpatientOrders,
    ordersPerDay,
    selectCallsPerOrder,
    ordersPerSignSession,
    selectCalls,
    signCalls,
    hookCalls,
    hookPeakPerSecond,
    hookBurstPerSecond: hookPeakPerSecond * burst, // 13.7
    notesPerDay,
    noteTokens,
    noteTokensPerDay: notesPerDay * noteTokens, // 56.3M
    mentionsPerNote,
    mentionsPerDay: notesPerDay * mentionsPerNote, // 3.2M
    avgNotesPerDayOverDecade,
    storedNotes, // 247M
    storedNoteTokens: storedNotes * noteTokens, // 172.9B
    notesAtTodaysRate: notesPerDay * 3_650, // 293.5M
  };
})();

/**
 * The worked example (sheet §9), checked against the Eliquis label (F66, F67). Adult, nonvalvular atrial fibrillation,
 * intended dose 5 mg twice daily, age 82, weight 58 kg, female, serum creatinine 141 µmol/L from an outside lab,
 * itraconazole active. Units are converted at ingestion (UCUM); µmol/L ÷ 88.4 = mg/dL.
 */
export const EXAMPLE = (() => {
  const age = 82;
  const weightKg = 58;
  const female = true;
  const scrUmolL = 141;
  const scrMgDl = scrUmolL / 88.4; // 1.595 → shown as 1.6 mg/dL
  const criteria = [age >= 80, weightKg <= 60, scrMgDl >= 1.5]; // label: at least 2 of 3 (F66)
  const criteriaMet = criteria.filter(Boolean).length; // 3
  const afDose = criteriaMet >= 2 ? 2.5 : 5; // mg twice daily
  // Combined P-gp and strong CYP3A4 inhibitor (itraconazole): on 5 or 10 mg reduce by 50%; already at 2.5 mg: avoid (F67).
  const inhibitorAction = afDose <= 2.5 ? "avoid" : "reduce 50%";
  // Cockcroft–Gault, for rules whose label names creatinine clearance (not used by the apixaban AF rule):
  // (140 − age) × weight ÷ (72 × SCr mg/dL) × 0.85 if female = 58 × 58 ÷ 114.8 × 0.85 ≈ 24.9 mL/min.
  const crclCG = (((140 - age) * weightKg) / (72 * scrMgDl)) * (female ? 0.85 : 1);
  // Without unit normalisation, 141 read as mg/dL is 88× too high (the rule fires on nonsense or rejects the value).
  const unitErrorFactor = 88.4;
  return { age, weightKg, female, scrUmolL, scrMgDl, criteriaMet, afDose, inhibitorAction, crclCG, unitErrorFactor };
})();

/** Order-time cards: only alerts that depend on a note-derived fact (sheet §10.3). */
export const ORDER_CARDS = (() => {
  const deltaShare = 0.015; // illustrative: 1.5% of orders meet a rule only through a fact found in notes
  const cards = NETWORK.ordersPerDay * deltaShare; // 768
  const criticalShare = 0.1; // of delta cards, interruptive (critical indicator)
  const explainShare = 0.2; // clinicians click "Explain" on 20% of delta cards → one model call, checked like any answer
  // (restarts costed, R2-20); the card itself shows no restricted fact or quote to a user not entitled to it (R2-1)
  const interruptiveBudgetPerShift = 3; // per prescriber, WARNING-tier types only; hitting it flags the types to pharmacy
  // review and never demotes a card; high-criticality confirmed allergies and contraindicated pairs are exempt (R2-12)
  const acceptanceFloor = 0.3; // an interruptive card type below 30% acceptance is downgraded after review
  return {
    deltaShare,
    cardsPerDay: cards,
    criticalPerDay: cards * criticalShare, // 76.8
    explainsPerDay: cards * explainShare, // 153.6
    cardsPer100Orders: deltaShare * 100, // 1.5
    criticalPer100Orders: deltaShare * criticalShare * 100, // 0.15
    interruptiveBudgetPerShift,
    acceptanceFloor,
  };
})();

/** Graph, stores and index sizes (all ESTIMATES except where a dossier fact is named). */
export const SIZES = (() => {
  const umlsConcepts = 3_550_208; // UMLS 2026AB (F1); not loaded whole: only the sources below
  const snomedConcepts = 360_000; // SNOMED CT International, "more than 360,000" (F7)
  const rxnormConcepts = 300_000; // estimate (ingredients, clinical and branded drugs, packs)
  const loincTerms = 100_000; // estimate
  // + drug classes, dosing-rule nodes, label SET nodes (one per reference label, not per section) and guideline nodes
  const otherNodes = 240_000;
  const knowledgeNodes = snomedConcepts + rxnormConcepts + loincTerms + otherNodes; // ≈ 1.0M
  const knowledgeEdges = 12_000_000; // estimate: SNOMED inferred IS_A and attributes, RxNorm relations, ≈ 300,000 interactions
  // In-memory sizing (R2-8): ≈ 6 GB holds only for a compact layout (adjacency arrays, interned strings, provenance as ids
  // into a side table: ≈ 500 bytes an edge all-in); an object-per-edge graph library would need 10–20 GB. Peak per
  // instance: two snapshots during the atomic swap (6 + 6) + the linker index (3M names × 768 dims × 4 bytes ≈ 9.2 GB in
  // float32, + HNSW links ≈ 0.8 GB) + the per-drug expansion cache (≈ 3 GB) ≈ 25 GB, on a 64 GB instance (illustrative).
  const snapshotGB = 6;
  const linkerGB = (3_000_000 * 768 * 4) / 1e9 + 0.8; // ≈ 10.0
  const expansionCacheGB = 3;
  const peakMemoryGB = 2 * snapshotGB + linkerGB + expansionCacheGB; // ≈ 25
  const instanceMemoryGB = 64;
  const linkingNames = 3_000_000; // estimate: names and synonyms from SNOMED CT, RxNorm and LOINC only
  const codedFactsPerPatient = 850; // estimate: 30 meds, 2 allergies, 20 conditions, ≈ 800 lab results
  const codedFacts = NETWORK.activePatients * codedFactsPerPatient; // 1.02B rows
  const storedMentions = NETWORK.storedNotes * NETWORK.mentionsPerNote; // 9.88B rows
  const chunkTokens = 350;
  const chunks = NETWORK.storedNoteTokens / chunkTokens; // 494M
  const chunksPerActivePatient = chunks / NETWORK.activePatients; // ≈ 412 on average
  const chunksTail = 10_000; // a chronic inpatient over a decade
  const vectorBytes = 1_024; // 1,024 dims × INT8
  const chunkVectorsTB = (chunks * vectorBytes) / 1e12; // 0.51 TB
  const chunkTextTB = (NETWORK.storedNoteTokens * 4) / 1e12; // ≈ 4 bytes a token → 0.69 TB
  const factRowsTB = ((codedFacts + storedMentions) * 400) / 1e12; // ≈ 400 B a row with indexes → 4.4 TB
  // Passages are search-engine documents carrying concept ids, not graph nodes (review item 20).
  const passages = 1_500_000 + 200_000; // estimate: FDA label sections + guideline passages
  return {
    umlsConcepts,
    snomedConcepts,
    rxnormConcepts,
    loincTerms,
    otherNodes,
    knowledgeNodes,
    knowledgeEdges,
    snapshotGB,
    linkerGB,
    expansionCacheGB,
    peakMemoryGB,
    instanceMemoryGB,
    linkingNames,
    codedFactsPerPatient,
    codedFacts,
    storedMentions,
    chunkTokens,
    chunks,
    chunksPerActivePatient,
    chunksTail,
    vectorBytes,
    chunkVectorsTB,
    chunkTextTB,
    factRowsTB,
    phiStorageTB: chunkVectorsTB + chunkTextTB + factRowsTB, // ≈ 5.6 TB
    passages,
    // Exact search inside one patient: 412 × 1,024 ≈ 422,000 multiply-adds on average (< 1 ms); the 10,000-chunk tail is
    // ≈ 10M (single-digit ms).
    perPatientDotProducts: chunksPerActivePatient * 1_024,
    tailDotProducts: chunksTail * 1_024,
  };
})();

/** Context window of one drug-safety answer call (sheet §11). Record and reference calls are below it. */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions, citation and gap rules", tokens: 900, stable: true },
    { id: "format", label: "Output format and two examples", tokens: 400, stable: true },
    { id: "question", label: "Question, resolved drug and planner notes", tokens: 100, stable: false },
    // 8 active meds × 25 + 2 allergies × 30 (type, criticality, verification, reaction) + 10 conditions × 15 + 6 key labs
    // × 20 + age, sex, weight, derived renal estimates 40 + indication and intended dose 20
    {
      id: "patient",
      label: "Patient facts (structured, pseudonymised)",
      tokens: 8 * 25 + 2 * 30 + 10 * 15 + 6 * 20 + 40 + 20,
      stable: false,
    },
    // 2 alerts × 120 + the coverage list (what was checked, versions, data times, gaps) 100
    { id: "alerts", label: "Rule results and coverage", tokens: 2 * 120 + 100, stable: false },
    { id: "paths", label: "Graph paths and rule criteria behind the alerts", tokens: 10 * 30, stable: false },
    { id: "headers", label: "8 passage headers", tokens: 8 * 30, stable: false },
    // FDA label sections and openly licensed guidelines only; licensed monograph text is not sent (review item 35)
    { id: "passages", label: "8 label and guideline passages", tokens: 8 * 200, stable: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 4,470
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,300 ≥ 512, cacheable
  const patient = blocks.find((b) => b.id === "patient")!.tokens; // 590
  const alerts = blocks.find((b) => b.id === "alerts")!.tokens; // 340
  const paths = blocks.find((b) => b.id === "paths")!.tokens; // 300
  const outputTokens = 250; // 10 sentences of 25
  const sentenceTokens = 25;
  // Record question: no rule results or paths (−640); 5 of this patient's note chunks of 350 tokens (1,750) + 5 headers
  // of 18 (90) = 1,840 in place of the passages and headers (the same 1,840); a longer timeline summary (+300).
  // Note text is sent as is (PHI under the BAA), not pseudonymised (review item 11).
  const recordTotal = total - (alerts + paths) + 300; // 4,130
  // Reference question: no patient block, no patient rule results, no paths (review item 39).
  const referenceTotal = total - patient - alerts - paths; // 3,240
  // The whole chart instead: 850 coded facts × 25 tokens + the last 20 notes × 700 = 21,250 + 14,000 = 35,250 tokens.
  const wholeChart = SIZES.codedFactsPerPatient * 25 + 20 * NETWORK.noteTokens;
  return {
    blocks,
    total,
    stable,
    changing: total - stable, // 3,170
    outputTokens,
    sentenceTokens,
    sentences: outputTokens / sentenceTokens, // 10
    recordTotal,
    referenceTotal,
    wholeChart,
    plannerPrefix: 600, // intent schema and examples, above the 512 minimum, so cached; no PHI in the schema (F69)
  };
})();

/**
 * Sentence checks (sheet §13, §15.3). Rates ILLUSTRATIVE, measured on a labelled set; the unsupported rate is a release
 * gate the answer model must pass. A dropped sentence is not replaced: generation restarts from the last shown sentence
 * with the claim excluded (≤ 2 restarts). A 3rd drop replaces the explanation with the rules card and the evidence list.
 * shownUnsupportedShare assumes the checker's misses are independent of the model's errors: OPTIMISTIC (review item 37).
 */
export const CHECKS = (() => {
  const unsupported = 0.03; // gate: ≤ 3% unsupported sentences from the answer model on the clinician set
  const falseAccept = 0.05;
  const falseReject = 0.03;
  const n = CONTEXT.sentences;
  const drop = unsupported * (1 - falseAccept) + (1 - unsupported) * falseReject; // 0.0285 + 0.0291 = 0.0576
  const p0 = binom(n, 0, drop);
  const p1 = binom(n, 1, drop);
  const p2 = binom(n, 2, drop);
  const pFallback = 1 - p0 - p1 - p2; // ≥ 3 drops → rules card + evidence only
  const expectedRestarts = p1 + 2 * (1 - p0 - p1);
  const shownUnsupportedShare =
    (unsupported * falseAccept) / (unsupported * falseAccept + (1 - unsupported) * (1 - falseReject));
  return {
    unsupported,
    falseAccept,
    falseReject,
    drop,
    p0,
    p1,
    p2,
    pFallback, // ≈ 1.7%
    expectedRestarts, // ≈ 0.56
    shownUnsupportedShare, // ≈ 0.16% of shown sentences, if independent
    msPerSentence: 60,
  };
})();

/** Cost per call and per day (sheet §5, §12). */
export const COST = (() => {
  const p = KH_PRICES;
  // Mid-size answer call, whole prompt written to the 5-minute cache so a restart reads it back (caching is a
  // HIPAA-eligible feature, F69).
  const answerCall = (total: number, stable: number, out: number) =>
    usd(stable, p.mid.cached) + usd(total - stable, p.mid.cacheWrite) + usd(out, p.mid.output);
  const restart = (total: number) => usd(total, p.mid.cached) + usd(125, p.mid.input); // 125 shown tokens fed back
  // Sensitivity: no caching at all (every call and restart at the input price).
  const answerNoCache = (total: number, out: number) => usd(total, p.mid.input) + usd(out, p.mid.output);
  const restartNoCache = (total: number) => usd(total + 125, p.mid.input);
  // Planner: the small model runs only on the 15% of questions the encoder intent classifier is unsure of.
  const plannerShare = 0.15;
  const plannerCall = usd(CONTEXT.plannerPrefix, p.small.cached) + usd(120, p.small.input) + usd(80, p.small.output);
  const planner = plannerShare * plannerCall;
  const r = CHECKS.expectedRestarts;
  const perType = (total: number) =>
    planner + answerCall(total, CONTEXT.stable, CONTEXT.outputTokens) + r * restart(total);
  const perTypeNoCache = (total: number) =>
    planner + answerNoCache(total, CONTEXT.outputTokens) + r * restartNoCache(total);
  const safetyAnswer = answerCall(CONTEXT.total, CONTEXT.stable, CONTEXT.outputTokens);
  const safety = perType(CONTEXT.total);
  const record = perType(CONTEXT.recordTotal);
  const reference = perType(CONTEXT.referenceTotal);
  // "Explain" on an order card: rule result + paths + 4 passages, 150 tokens out, no planner; sentences checked as usual.
  const explainTokens = 1_300 + 100 + 590 + 340 + 300 + 4 * 230; // 3,550
  const explain = answerCall(explainTokens, 1_300, 150) + r * restart(explainTokens); // checked, restarts costed (R2-20)
  const t = NETWORK.perType;
  const llmPerDay =
    t.safety * safety + t.record * record + t.reference * reference + ORDER_CARDS.explainsPerDay * explain;
  const llmNoCachePerDay =
    t.safety * perTypeNoCache(CONTEXT.total) +
    t.record * perTypeNoCache(CONTEXT.recordTotal) +
    t.reference * perTypeNoCache(CONTEXT.referenceTotal) +
    ORDER_CARDS.explainsPerDay * answerNoCache(explainTokens, 150);

  // Note linking on encoders inside the PHI zone (review item 18). Passes over note tokens: NER, assertion, embedding (3);
  // candidate retrieval embeds each mention (≈ 10 tokens). The cross-encoder scores (mention, candidate) pairs and runs only
  // on ambiguous mentions (small margin between the top candidates, 25%, illustrative): 20 candidates × 100 tokens a pair.
  const ambiguousShare = 0.25;
  const pairTokens = 20 * 100;
  const linkTokensPerNoteMention = 10 + ambiguousShare * pairTokens; // 510
  const ingestTokens = NETWORK.noteTokensPerDay * 3 + NETWORK.mentionsPerDay * linkTokensPerNoteMention; // 168.8M + 1.64B
  const ingestGpuSeconds = ingestTokens / p.encoderTokensPerSecond; // ≈ 9,050 of 172,800 on 2 GPUs
  const gpus = 4; // 2 ingestion (availability, minutes-level freshness), 2 query (linker, cross-encoder, checker)
  const gpuPerDay = gpus * 24 * p.gpuHour; // 240
  const backfillTokens = NETWORK.storedNoteTokens * 3 + SIZES.storedMentions * linkTokensPerNoteMention;
  const backfillGpuHours = backfillTokens / p.encoderTokensPerSecond / 3_600;
  const backfillUsd = backfillGpuHours * p.gpuHour; // ≈ 7,720 GPU-hours ≈ 19,300 USD
  const backfillAtTodaysRate = backfillUsd * (NETWORK.notesAtTodaysRate / NETWORK.storedNotes); // ≈ 22,900
  // A hosted small LLM extracts facts from every stored note: input 172.9B × 0.10 + 800 output tokens a note (40 coded
  // mentions with spans and assertions at ≈ 20 tokens each) × 151M × 0.50, per million; ten years of notes go to a vendor.
  const llmOutPerNote = 800;
  const llmBackfillUsd =
    usd(NETWORK.storedNoteTokens, p.small.input) + usd(llmOutPerNote * NETWORK.storedNotes, p.small.output);
  // A small open LLM inside the PHI zone instead: prefill 172.9B ÷ 20,000 + decode 197.6B ÷ 2,500, GPU-seconds.
  const selfLlmBackfillGpuHours =
    (NETWORK.storedNoteTokens / p.smallLlmPrefillPerSecond +
      (llmOutPerNote * NETWORK.storedNotes) / p.smallLlmDecodePerSecond) /
    3_600;
  const selfLlmBackfillUsd = selfLlmBackfillGpuHours * p.gpuHour; // ≈ 60,900
  const selfLlmDailyGpuSeconds =
    NETWORK.noteTokensPerDay / p.smallLlmPrefillPerSecond +
    (NETWORK.notesPerDay * llmOutPerNote) / p.smallLlmDecodePerSecond; // ≈ 28,500

  // Stores (illustrative). Knowledge snapshot held in memory by 3 rules-service instances (no graph database server,
  // review item 12): 3 × 1.5 × 24 = 108. Fact store with note chunks and pgvector (one PHI store, review item 46): primary
  // + replica 2 × 4 × 24 = 192. Passage search (no PHI) 2 × 3 × 24 = 144. Gateway, orchestrator, audit, provenance,
  // traces 150. Storage and DR: PHI data ≈ 5.6 TB × 3 (primary volumes + 2 backup copies) × 0.10 USD a GB-month ÷ 30 ≈ 56,
  // + a warm standby (1 rules
  // instance + 1 database node in a second region) (1.5 + 4) × 24 = 132.
  const servicePerDay = 3 * 24 * p.serviceNodeHour;
  const factStorePerDay = 2 * 24 * p.dbNodeHour;
  const searchPerDay = 2 * 24 * p.searchNodeHour;
  const platformPerDay = 150;
  const storageDrPerDay =
    (SIZES.phiStorageTB * 1_000 * 3 * p.storageGbMonth) / 30 + (p.serviceNodeHour + p.dbNodeHour) * 24; // primary + 2 copies (R2-17)
  const infraPerDay = gpuPerDay + servicePerDay + factStorePerDay + searchPerDay + platformPerDay + storageDrPerDay;
  // Licences: vocabularies free in the US (RxNorm, UMLS, SNOMED CT US Edition in a member country, LOINC: F5, F8, F9,
  // F11). The curated drug-knowledge base is licensed; vendors do not publish prices: PLACEHOLDER 300,000 USD a year,
  // including an AI-use rider to check (review item 35).
  const drugKbPerDay = 300_000 / 365; // 822
  // People (illustrative): 3 clinical pharmacists or informaticists + 8 engineers + 3 ML engineers = 14 × 300,000 USD
  // fully loaded ÷ 365.
  const team = 14;
  const teamPerDay = (team * 300_000) / 365; // 11,507
  // Clinician grading: 600 questions × 2 graders × 6 minutes = 120 hours × 150 USD per monthly release (18,000) × 12 ÷
  // 365 = 592; weekly pharmacist audit: 100 answers × 5 minutes = 8.3 hours × 120 USD = 1,000 a week ÷ 7 = 143.
  const gradingPerRelease = 600 * 2 * (6 / 60) * 150;
  const gradingPerDay = (gradingPerRelease * 12) / 365;
  const auditPerDay = (100 * (5 / 60) * 120) / 7;
  const total = llmPerDay + infraPerDay + drugKbPerDay + teamPerDay + gradingPerDay + auditPerDay;
  // Self-hosting the answer model instead (70B class at FP8, 2 replicas × 4 GPUs): 8 × 24 × 2.5 = 480 USD a day; a lower
  // quality tier than the hosted mid-size model, so it must pass the same clinician gate.
  const selfHostAnswerPerDay = 8 * 24 * p.gpuHour;
  const supported = NETWORK.questionsPerDay + NETWORK.ordersPerDay; // 58,400 decisions supported a day
  return {
    plannerShare,
    plannerCall,
    safetyAnswer,
    safety, // ≈ 0.0110 USD
    record,
    reference,
    explainTokens,
    explain,
    llmPerDay, // ≈ 74 USD
    safetyNoCache: perTypeNoCache(CONTEXT.total), // ≈ 0.0166
    llmNoCachePerDay, // ≈ 113
    ambiguousShare,
    ingestTokens,
    ingestGpuSeconds,
    gpus,
    gpuPerDay,
    backfillGpuHours,
    backfillUsd,
    backfillAtTodaysRate,
    llmOutPerNote,
    llmBackfillUsd, // ≈ 116,100
    selfLlmBackfillGpuHours,
    selfLlmBackfillUsd,
    selfLlmDailyGpuSeconds,
    servicePerDay,
    factStorePerDay,
    searchPerDay,
    platformPerDay,
    storageDrPerDay,
    infraPerDay,
    drugKbPerDay,
    team,
    teamPerDay,
    gradingPerRelease,
    gradingPerDay,
    auditPerDay,
    total, // ≈ 14,160 USD a day
    perQuestion: total / NETWORK.questionsPerDay,
    perDecision: total / supported,
    // Upper-end average: model + the query half of the GPUs spread over all 7,200 questions, added to a safety question.
    marginalPerSafetyQuestion: safety + gpuPerDay / 2 / NETWORK.questionsPerDay,
    shares: {
      llm: llmPerDay / total,
      people: (teamPerDay + gradingPerDay + auditPerDay) / total,
      infra: infraPerDay / total,
      drugKb: drugKbPerDay / total,
    },
    selfHostAnswerPerDay,
    selfHostRatio: selfHostAnswerPerDay / llmPerDay,
    doubledLlmPerDay: llmPerDay * 2,
  };
})();

/** Audit and trace volumes (review item 32): one AuditEvent per request listing every resource read. */
export const AUDIT = (() => {
  const requests = NETWORK.questionsPerDay + NETWORK.hookCalls; // 130,080
  const eventKB = 4; // one AuditEvent with ≈ 6–10 entity references
  const answerKB = 20; // stored answer with the content of every fact read (replay shows stored inputs)
  const auditMB = (requests * eventKB) / 1_000; // ≈ 520
  const answersMB = (NETWORK.questionsPerDay * answerKB) / 1_000; // 144
  // R2-11: each order card is stored with the content of its inputs (20 KB); each no-card hook call keeps a hash of its
  // inputs plus snapshot and configuration versions (0.5 KB), so "why did this card fire, or not, on 3 May?" is answerable.
  const cardsMB = (ORDER_CARDS.cardsPerDay * answerKB) / 1_000; // ≈ 15
  const noCardMB = ((NETWORK.hookCalls - ORDER_CARDS.cardsPerDay) * 0.5) / 1_000; // ≈ 61
  return {
    requests,
    eventKB,
    answerKB,
    auditMB,
    answersMB,
    cardsMB,
    noCardMB,
    totalMB: auditMB + answersMB + cardsMB + noCardMB, // ≈ 740
    retentionYears: 6,
  };
})();

/** Latency, p50 and p95, ms (sheet §12). All stage numbers are ESTIMATES. */
export const LATENCY = (() => {
  const s = (id: string, p50: number, p95: number) => ({ id, p50, p95 });
  const decode = 80; // tokens a second (the answer-engine value for the same model class)
  const decodeP95 = 65;
  const sentence = s(
    "sentence",
    (CONTEXT.sentenceTokens / decode) * 1_000,
    (CONTEXT.sentenceTokens / decode) * 1_000 + 100
  ); // 312.5
  const checks = s("checks", CHECKS.msPerSentence, 100);
  const firstTokenP50 = 500; // ≈ 4,500-token prompt, mid-size, illustrative
  const firstTokenP95 = 900; // illustrative; the target holds up to the breakpoint computed below
  // Seven drug-centric templates in parallel on the in-memory snapshot (review item 16): expand from the seed drug to
  // interacting ingredients and classes, dosing rules, contraindicated conditions, cross-reacting allergen classes,
  // duplicate classes and risk properties; then an in-code join with the patient's facts (2 / 5 ms).
  const template = { p50: 12, p95: 35 };
  const expansion = maxDist(times(7, template)); // ≈ 30 / 46
  const join = s("join", 2, 5);
  // FHIR reads (review items 7, 14): MedicationRequest, MedicationStatement, MedicationAdministration (72 h),
  // AllergyIntolerance, Condition at 150 / 400 each; the lab Observation read filtered to the LOINC codes the templates
  // need with a date floor at 250 / 600 (paged, slower).
  const fhirRead = { p50: 150, p95: 400 };
  const labRead = { p50: 250, p95: 600 };
  const fhir = maxDist([...times(5, fhirRead), labRead]); // ≈ 374 / 612
  const classifier = { p50: 20, p95: 40 }; // encoder intent and mention classifier (85% of questions)
  const planner = { p50: 300, p95: 600 }; // small model, JSON schema (the other 15%)
  const headEncoder = maxDist([classifier, fhir]);
  const headPlanner = maxDist([planner, fhir]);
  const factStore = { p50: 10, p95: 25 };
  const plannerShare = COST.plannerShare;

  const pathP = (stages: readonly { p50: number; p95: number }[]) => ({
    p50: sum(stages.map((x) => x.p50)),
    p95: sum(stages.map((x) => x.p50)) + rss(stages.map((x) => x.p95 - x.p50)),
  });
  const mix2 = (a: Dist, b: Dist, wb: number, q: number) =>
    mixtureQuantile(
      [
        { weight: 1 - wb, p50: a.p50, spread: a.p95 - a.p50 },
        { weight: wb, p50: b.p50, spread: b.p95 - b.p50 },
      ],
      q
    );

  // Order-select / order-sign call, with the EHR's prefetch. Round 2 (R2-1): the hook's `context.userId` is looked up in
  // the cached entitlements table (5 / 10 ms) and note-derived facts are filtered by security label BEFORE the join, so a
  // card never quotes or uses a restricted fact the user may not see. R2-9: dose-dependent rules run in a second phase on
  // the criteria dose from the dosing rules (1 / 2 ms, in code).
  const entitle = s("entitle", 5, 10);
  const phase2 = s("phase2", 1, 2);
  const orderStages = [
    s("edge", 15, 30), // TLS, JWT verify (F24): the EHR's identity
    entitle, // the user's entitlements from context.userId
    s("prefetch", 5, 10), // parse the prefetched FHIR bundle; UCUM normalisation
    { id: "rules", ...maxDist([expansion, factStore]) }, // drug-centric expansion ‖ label-filtered note-derived facts
    join,
    phase2,
    s("card", 5, 10), // diff against the EHR's local alert configuration, assemble cards; card and inputs stored async
  ];
  const order = pathP(orderStages);
  const orderNoPrefetch = pathP([...orderStages, { id: "fhir", ...fhir }]);

  // Drug-safety question. Linking (review item 6): coded drug from context or exact / normalised RxNorm string match first,
  // embedding candidates only as a fallback; 50 / 90 ms budgets the fallback (the common case is faster).
  const toAlerts = (head: Dist) => [
    s("edge", 40, 80), // SMART token, patient-context check, care-team check and entitlements (cached), audit
    { id: "head", ...head },
    s("link", 50, 90),
    { id: "expand", ...expansion },
    join,
    phase2,
    s("alertsOut", 10, 20),
  ];
  const toContext = [s("passages", 60, 120), s("rerank", 80, 120), s("context", 10, 20)];
  // Correlated tails: first token and sentence (and the planner when it runs) share the model provider.
  const corrP95 = (stages: readonly { id: string; p50: number; p95: number }[], plannerCorrelated: boolean) => {
    const corrIds = plannerCorrelated ? ["head", "firstToken", "sentence"] : ["firstToken", "sentence"];
    const indep = stages.filter((x) => !corrIds.includes(x.id));
    const corrSpread = sum(stages.filter((x) => corrIds.includes(x.id)).map((x) => x.p95 - x.p50));
    return sum(stages.map((x) => x.p50)) + rss([...indep.map((x) => x.p95 - x.p50), corrSpread]);
  };
  const safetyFirstFor = (head: Dist, ftP50: number, ftP95: number, plannerCorrelated: boolean) => {
    const stages = [...toAlerts(head), ...toContext, s("firstToken", ftP50, ftP95), sentence, checks];
    const base = pathP(stages);
    return { p50: base.p50, p95: base.p95, p95Corr: corrP95(stages, plannerCorrelated) };
  };
  // Restart after a dropped first sentence: cached-prompt first token 300 + a sentence + checks = 672.5 ms.
  const restartMs = 300 + sentence.p50 + checks.p50;
  const withDrops = (d: Dist): Dist => {
    const parts = [
      { weight: 1 - CHECKS.drop, p50: d.p50, spread: d.p95 - d.p50 },
      { weight: CHECKS.drop, p50: d.p50 + restartMs, spread: d.p95 - d.p50 },
    ];
    return { p50: mixtureQuantile(parts, 0.5), p95: mixtureQuantile(parts, 0.95) };
  };
  const alertsEnc = pathP(toAlerts(headEncoder));
  const alertsPlan = pathP(toAlerts(headPlanner));
  const safetyAlerts = {
    p50: mix2(alertsEnc, alertsPlan, plannerShare, 0.5),
    p95: mix2(alertsEnc, alertsPlan, plannerShare, 0.95),
  };
  const gatedFirst = (ftP50: number, ftP95: number) => {
    const e = safetyFirstFor(headEncoder, ftP50, ftP95, false);
    const pl = safetyFirstFor(headPlanner, ftP50, ftP95, true);
    const eD = withDrops({ p50: e.p50, p95: e.p95Corr });
    const pD = withDrops({ p50: pl.p50, p95: pl.p95Corr });
    return { p50: mix2(eD, pD, plannerShare, 0.5), p95: mix2(eD, pD, plannerShare, 0.95) };
  };
  const safetyFirstIndependent = safetyFirstFor(headEncoder, firstTokenP50, firstTokenP95, false); // encoder route, no drops
  const safetyFirst = gatedFirst(firstTokenP50, firstTokenP95); // the gated value: both routes, correlated tails, drops
  /** Bisection: the largest x in [lo, hi] for which ok(x) holds, assuming ok is monotone (true below the breakpoint). */
  const breakpoint = (lo0: number, hi0: number, ok: (x: number) => boolean) => {
    let lo = lo0;
    let hi = hi0;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  // First-sentence breakpoint (round 1 item 15): vendor first-token p95 at which the gated p95 reaches 3,000 ms, with the
  // median at 500 and (R2-16) at 800.
  const firstTokenP95Breakpoint = breakpoint(firstTokenP50 + 1, 5_000, (x) => gatedFirst(firstTokenP50, x).p95 < 3_000);
  const firstTokenP95BreakpointAtMedian800 = breakpoint(801, 5_000, (x) => gatedFirst(800, x).p95 < 3_000);

  // Complete answer: first token, then the output at the decode speed (p95 at 65/80 of it), last check 60; each restart
  // (a dropped sentence is not replaced) adds the restart first token 300 + checks 60 = 360 ms, at most 2. Encoder route.
  const restartAdd = 300 + CHECKS.msPerSentence; // 360
  const completeFor = (ftP50: number, ftP95: number, decodeP50: number, outTokens: number): Dist => {
    const genP50 = (outTokens / decodeP50) * 1_000;
    const genP95 = (outTokens / (decodeP50 * (decodeP95 / decode))) * 1_000;
    const base = pathP([
      ...toAlerts(headEncoder),
      ...toContext,
      s("firstToken", ftP50, ftP95),
      s("generate", genP50, genP95),
      checks,
    ]);
    const spread = base.p95 - base.p50;
    const parts = [
      { weight: CHECKS.p0, p50: base.p50, spread },
      { weight: CHECKS.p1, p50: base.p50 + restartAdd, spread },
      { weight: 1 - CHECKS.p0 - CHECKS.p1, p50: base.p50 + 2 * restartAdd, spread },
    ];
    return { p50: mixtureQuantile(parts, 0.5), p95: mixtureQuantile(parts, 0.95) };
  };
  const safetyComplete = completeFor(firstTokenP50, firstTokenP95, decode, CONTEXT.outputTokens);
  // R2-7: the complete-answer p50 is the binding target. Decode-speed breakpoint: the p50 decode rate below which the
  // complete p50 exceeds 5,000 ms (≈ 70 tokens a second). Lever: cap the output at 200 tokens (8 sentences).
  const decodeP50Breakpoint = breakpoint(
    20,
    200,
    (x) => completeFor(firstTokenP50, firstTokenP95, x, CONTEXT.outputTokens).p50 > 5_000
  );
  const cappedOutput = 200;
  const completeAt65 = completeFor(firstTokenP50, firstTokenP95, 65, CONTEXT.outputTokens);
  const completeCappedAt65 = completeFor(firstTokenP50, firstTokenP95, 65, cappedOutput);
  const capSavingMs = ((CONTEXT.outputTokens - cappedOutput) / decode) * 1_000; // 625 at 80 a second
  const completeAtMedian800 = completeFor(800, 1_300, decode, CONTEXT.outputTokens);
  const firstAtMedian800 = gatedFirst(800, 1_300);

  // Record question (R2-15): both planner routes, correlated model stages, drops, as on the safety path. Question
  // embedding 10 + exact search in one patient's chunks (pgvector, 5 / 15) ‖ fact query (20 / 50), then rerank, context.
  const recordStagesFor = (head: Dist, ftP50: number, ftP95: number) => [
    s("edge", 40, 80),
    { id: "head", ...head },
    s("embed", 10, 20),
    {
      id: "facts",
      ...maxDist([
        { p50: 5, p95: 15 },
        { p50: 20, p95: 50 },
      ]),
    },
    s("rerank", 80, 120),
    s("context", 10, 20),
    s("firstToken", ftP50, ftP95),
    sentence,
    checks,
  ];
  const recordGated = (ftP50: number, ftP95: number) => {
    const e = recordStagesFor(headEncoder, ftP50, ftP95);
    const pl = recordStagesFor(headPlanner, ftP50, ftP95);
    const eD = withDrops({ p50: sum(e.map((x) => x.p50)), p95: corrP95(e, false) });
    const pD = withDrops({ p50: sum(pl.map((x) => x.p50)), p95: corrP95(pl, true) });
    return { p50: mix2(eD, pD, plannerShare, 0.5), p95: mix2(eD, pD, plannerShare, 0.95) };
  };
  const recordBase = pathP(recordStagesFor(headEncoder, firstTokenP50, firstTokenP95)); // encoder route, independent
  const recordFirst = recordGated(firstTokenP50, firstTokenP95);
  const recordAtBreakpoint = recordGated(firstTokenP50, firstTokenP95Breakpoint);

  return {
    decode,
    expansion,
    fhir,
    headEncoder,
    headPlanner,
    order,
    orderNoPrefetch,
    safetyAlerts,
    safetyFirstIndependent,
    safetyFirst,
    firstTokenP95,
    firstTokenP95Breakpoint,
    firstTokenP95BreakpointAtMedian800,
    restartMs,
    safetyComplete,
    decodeP50Breakpoint,
    completeAt65,
    cappedOutput,
    completeCappedAt65,
    capSavingMs,
    completeAtMedian800,
    firstAtMedian800,
    recordBase,
    recordFirst,
    recordAtBreakpoint,
  };
})();

/** Targets (sheet §4 N5) and whether the budget meets them. */
export const TARGETS = (() => {
  const L = LATENCY;
  const rows = [
    { id: "order", label: "Order hook card", p50: L.order.p50, p95: L.order.p95, targetP50: 200, targetP95: 500 },
    {
      id: "alerts",
      label: "Safety question: alerts shown",
      p50: L.safetyAlerts.p50,
      p95: L.safetyAlerts.p95,
      targetP50: 600,
      targetP95: 1_000,
    },
    {
      id: "first",
      label: "Safety question: first verified sentence (both routes, correlated tails, drops)",
      p50: L.safetyFirst.p50,
      p95: L.safetyFirst.p95,
      targetP50: 2_000,
      targetP95: 3_000,
    },
    {
      id: "complete",
      label: "Safety question: complete",
      p50: L.safetyComplete.p50,
      p95: L.safetyComplete.p95,
      targetP50: 5_000,
      targetP95: 7_000,
    },
    {
      id: "record",
      label: "Record question: first verified sentence",
      p50: L.recordFirst.p50,
      p95: L.recordFirst.p95,
      targetP50: 2_000,
      targetP95: 3_000,
    },
  ] as const;
  return rows.map((r) => ({ ...r, meets: r.p50 <= r.targetP50 && r.p95 <= r.targetP95 }));
})();

/** Evaluation sets and their 95% intervals (sheet §13). */
export const EVAL = (() => {
  const half = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  const ruleOfThree = (n: number) => 3 / n; // 95% upper bound on a rate after 0 failures in n
  const highPriorityCases = 15 * 10; // 15 pairs (F15) × 10 orderable variants
  // R2-2: the interaction gate is EXHAUSTIVE, not sampled. Every interaction edge (≈ 300,000), each entered as ≈ 10
  // orderable products (EHR medication id or NDC → crosswalk → rule), is run through the rules: 3M cases × 30 ms =
  // 25 CPU-hours, ≈ 23 minutes on 64 cores. 100% required. A 2,000-case sample remains only for patient contexts that
  // cannot be enumerated (dose, route, renal state), stratified by class and weighted by 12-month order frequency.
  const interactionEdges = 300_000;
  const productsPerPair = 10;
  const exhaustiveCases = interactionEdges * productsPerPair; // 3M
  const exhaustiveCpuHours = (exhaustiveCases * 0.03) / 3_600; // 25
  const exhaustiveMinutesOn64 = (exhaustiveCpuHours * 60) / 64; // ≈ 23
  const majorSample = 2_000; // patient-context sample, 2,000 of 2,000; bound "per order at observed frequencies"
  const linkingNotes = 200;
  const linkingMentions = linkingNotes * NETWORK.mentionsPerNote; // 8,000
  const medMentions = 1_600;
  const problemMentions = 3_000;
  const clinicianSet = 600;
  const abstentionSet = 150;
  // Slices added after review (counts illustrative): outside-lab units 200, allergy semantics (intolerance, refuted,
  // NKDA vs empty) 150, look-alike drug names 100, cumulative risk 100, route and dose form 100, wrong patient and merges
  // 20, restricted notes 50 (30 panel + 20 order-hook cases, R2-1), conflicts 50, untemplated safety questions 50, unmapped
  // and inactive codes 100, dosing combinations 32 (0–3 criteria × inhibitor yes / no × intended 5 or 2.5 mg × indication
  // AF / VTE, R2-9).
  const slices = {
    units: 200,
    allergy: 150,
    lasa: 100,
    cumulative: 100,
    route: 100,
    wrongPatient: 20,
    restricted: 50,
    conflicts: 50,
    untemplated: 50,
    unmapped: 100,
    dosingGrid: 4 * 2 * 2 * 2,
  };
  // Retrospective replay: 12 months of de-identified orders with pharmacist interventions.
  const replayOrders = NETWORK.ordersPerDay * 365; // 18.7M
  return {
    highPriorityCases,
    highPriorityUpperMiss: ruleOfThree(highPriorityCases), // 2%
    interactionEdges,
    productsPerPair,
    exhaustiveCases,
    exhaustiveCpuHours,
    exhaustiveMinutesOn64,
    majorSample,
    majorUpperMissAtZero: ruleOfThree(majorSample), // 0.15%
    linkingNotes,
    linkingMentions,
    medMentions,
    medHalfWidth: half(0.95, medMentions), // ± 1.1 points
    problemMentions,
    problemHalfWidth: half(0.85, problemMentions), // ± 1.3 points
    clinicianSet,
    clinicianHalfWidth: half(0.95, clinicianSet), // ± 1.7 points
    abstentionSet,
    abstentionWilson: wilson(0.95, abstentionSet), // ≈ 90.25% – 97.50%
    checkerSentences: 2_000,
    checkerUnsupported: 500,
    checkerFalseAcceptHalfWidth: half(CHECKS.falseAccept, 500), // ± 1.9 points
    unitsWilsonAtZero: wilson(0, slices.units), // 0 of 200 errors → upper ≈ 1.9%
    humanAgreementCeiling: 0.742, // n2c2 2019 after adjudication (F30)
    slices,
    replayOrders,
  };
})();

/** Freshness, recency and abstention rates (sheet §4 N7, §15.3). ESTIMATES. */
export const FRESHNESS = {
  projectionP50Seconds: 30, // EHR feed (HL7 v2 via the interface engine) → fact store
  projectionP95Minutes: 5,
  noteLinkedP95Minutes: 15, // signed note → linked facts
  kbPromoteDays: 7, // routine vendor release → regression gate → live
  urgentPromoteHours: 24, // pharmacist-authored local edge for a boxed warning, recall or new contraindication
  renalRecencyInpatientHours: 48, // a renal input for an inpatient older than this is stale
  renalRecencyOutpatientDays: 90,
  weightRecencyOutpatientDays: 30, // R2-4: weight is a dosing criterion too; inpatient: this admission
  // Dose and indication from free text need a tap when the record does not confirm them (no matching draft order,
  // indication not on the problem list), R2-4.
  medAdministrationWindowHours: 72,
  partialAbstainShare: 0.08, // safety questions with at least one missing or stale input, named in the answer
  fullAbstainShare: 0.02, // drug not linkable, not mapped or not covered: rules cannot run
  confirmTapShare: 0.03, // safety questions where the resolved drug needs a tap to confirm (low score or look-alike)
} as const;

/**
 * Figure support (added by the figures agent; no existing value changed): the p50 stage lists of the three request types
 * as LATENCY builds them (sheet §12), so the sequence and waterfall figures draw one set of numbers. Each stage value is
 * the same literal or computed draw LATENCY uses; the totals are checked against LATENCY in the comments.
 */
export const WALK = (() => {
  const st = (id: string, label: string, ms: number) => ({ id, label, ms });
  const rulesDraw = maxOfParts(
    [
      { p50: LATENCY.expansion.p50, p95: LATENCY.expansion.p95 },
      { p50: 10, p95: 25 },
    ],
    0.5
  ); // expansions ‖ label-filtered note facts ≈ 30
  // Order hook card (LATENCY.order.p50 ≈ 64): edge 15, entitlements 5, prefetch 5, rules ≈ 30, join 2, phase 2 1, card 5.
  const order = [
    st("edge", "TLS, JWT", 15),
    st("entitle", "Entitlements", 5),
    st("prefetch", "Prefetch, UCUM", 5),
    st("rules", "Expansions ‖ note facts", rulesDraw),
    st("join", "Join + phase 2", 2 + 1),
    st("card", "Delta cards", 5),
  ];
  // Safety question, encoder route: edge 40, classifier ‖ 6 FHIR reads LATENCY.headEncoder.p50 ≈ 374, resolve 50,
  // expansions ≈ 30, join 2, phase 2 1, alerts event 10 → alerts ≈ 507; passages 60, rerank 80, context 10 → 657; first
  // token 500 → 1,157; first sentence 312.5 → 1,469.5; checks 60 → first verified sentence ≈ 1,530.
  const safety = [
    st("edge", "Token, care team, audit", 40),
    st("head", "Classifier ‖ 6 FHIR reads", LATENCY.headEncoder.p50),
    st("link", "Resolve the drug", 50),
    st("expand", "7 expansions, join, phase 2", LATENCY.expansion.p50 + 2 + 1),
    st("alerts", "alerts event", 10),
    st("passages", "Passages + rerank + context", 60 + 80 + 10),
    st("firstToken", "Model: first token", 500),
    st("sentence", "First sentence (25 tokens)", (CONTEXT.sentenceTokens / LATENCY.decode) * 1_000),
    st("checks", "Sentence checks", CHECKS.msPerSentence),
  ];
  // Record question, encoder route (LATENCY.recordBase.p50 ≈ 1,407): edge 40, head ≈ 374, embed 10, chunks ‖ facts ≈ 20,
  // rerank 80, context 10, first token 500, sentence 312.5, checks 60.
  const record = [
    st("edge", "Token, care team, audit", 40),
    st("head", "Classifier ‖ 6 FHIR reads", LATENCY.headEncoder.p50),
    st(
      "facts",
      "Embed; chunks ‖ facts",
      10 +
        maxOfParts(
          [
            { p50: 5, p95: 15 },
            { p50: 20, p95: 50 },
          ],
          0.5
        )
    ),
    st("rerank", "Rerank + context", 80 + 10),
    st("firstToken", "Model: first token", 500),
    st("sentence", "First sentence", (CONTEXT.sentenceTokens / LATENCY.decode) * 1_000),
    st("checks", "Sentence checks", CHECKS.msPerSentence),
  ];
  const total = (xs: readonly { ms: number }[]) => sum(xs.map((x) => x.ms));
  const upTo = (xs: readonly { id: string; ms: number }[], id: string) =>
    total(xs.slice(0, xs.findIndex((x) => x.id === id) + 1));
  return {
    order,
    safety,
    record,
    orderMs: total(order), // ≈ 64
    alertsMs: upTo(safety, "alerts"), // ≈ 507
    contextMs: upTo(safety, "passages"), // ≈ 657
    firstTokenMs: upTo(safety, "firstToken"), // ≈ 1,157
    firstSentenceMs: upTo(safety, "sentence"), // ≈ 1,470
    safetyFirstMs: total(safety), // ≈ 1,530
    recordFirstMs: total(record), // ≈ 1,407
  };
})();
