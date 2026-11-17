// Constants and arithmetic for the "Design a Clinical Knowledge-Graph Assistant" case study (/genai-system-design/
// case-studies/kg-healthcare-case-study; design sheet SYSTEM-DESIGN/plans/genai-design/design/kg-healthcare-case-study.md
// v1, dossier research/kg-healthcare-case-study.md, facts cited as "dossier F12"). Specs in assets/diagrams/animated/
// kg-health/ import from here, so the page, the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost. It defines its own ILLUSTRATIVE hospital network ("the network"): 12 hospitals, 4,000
// beds, 140 clinics, 2M patients with records, 6,000 prescribers. NO production source publishes volume, latency or
// cost for a clinical GraphRAG assistant (dossier §9): every volume, mix, rate, latency, salary, licence fee and unit
// cost below is an ESTIMATE unless a comment names a source. Paper results are quoted with their paper and task.
//
// Sources used for numbers (dossier): CDS Hooks "on the order of 500 ms" (F23, a spec expectation, not a measurement);
// UMLS 2026AB 3,550,208 concepts (F1); SNOMED CT 360,000+ concepts (F7); ONC high-priority list 15 pairs (F15); n2c2
// 2019 human agreement 74.20% after adjudication (F30). Model list prices as of November 2026 are imported from the
// answer-engine preset so one price has one value across the site (mid-size Claude Sonnet 5.5 class 2.00 input /
// 0.10 cache read / 2.50 5-minute cache write / 10.00 output USD per million tokens; small Claude Haiku 5.5 class
// 0.10 / 0.01 / 0.125 / 0.50). Both run under the vendor's BAA (dossier F58). GPU hour 2.5 USD and encoder throughput
// 200,000 tokens a second a GPU are the answer-engine preset's illustrative values, reused.
//
// Latency: parallel stages are the maximum of their draws (maxOfN for identical calls, maxOfParts for different ones),
// at p50 and p95. p95 per path is p50 + the root-sum-square of stage spreads (p95 − p50), with a correlated case where
// the three model-provider stages (planner, first token, sentence) slow together, then mixed with the answers whose
// first sentence is dropped by the checker (restart).

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

/** P(exactly k of n) for a binomial with rate p. */
function binom(n: number, k: number, p: number) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * p ** k * (1 - p) ** (n - k);
}

/** Prices (imported list prices, as of November 2026) and illustrative infrastructure rates. */
export const KH_PRICES = {
  mid: PRICES.mid,
  small: PRICES.small,
  gpuHour: PRICES.gpuHour, // 2.5 USD, illustrative
  encoderTokensPerSecond: PRICES.smallEncoderTokensPerSecond, // 200,000, illustrative
  graphNodeHour: 4, // memory-optimised graph database node, illustrative
  dbNodeHour: 3, // PostgreSQL / search node, illustrative
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
  // prescriptions = 24,000. Each order fires the CDS Hooks order-select hook once (dossier F22).
  const inpatientOrders = occupiedBeds * 8; // 27,200
  const outpatientOrders = clinicVisitsPerDay * 0.8; // 24,000
  const ordersPerDay = inpatientOrders + outpatientOrders; // 51,200
  const ordersPeakHourShare = 0.1;
  const ordersPeakPerSecond = (ordersPerDay * ordersPeakHourShare) / 3_600; // 1.42
  // Notes: inpatient 3,400 × 6 a day = 20,400; outpatient 30,000 × 1.5 = 45,000; reports (radiology, pathology,
  // discharge) 15,000 → 80,400 a day at 700 tokens each.
  const notesPerDay = occupiedBeds * 6 + clinicVisitsPerDay * 1.5 + 15_000; // 80,400
  const noteTokens = 700;
  const mentionsPerNote = 40;
  const storedNotes = 150_000_000; // 10 years of history
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
    ordersPeakPerSecond,
    ordersBurstPerSecond: ordersPeakPerSecond * burst, // 5.7
    notesPerDay,
    noteTokens,
    noteTokensPerDay: notesPerDay * noteTokens, // 56.3M
    mentionsPerNote,
    mentionsPerDay: notesPerDay * mentionsPerNote, // 3.2M
    storedNotes,
    storedNoteTokens: storedNotes * noteTokens, // 105B
  };
})();

/** Order-time cards (CDS Hooks order-select): only alerts that depend on a note-derived fact (sheet §10.3). */
export const ORDER_CARDS = (() => {
  const deltaShare = 0.015; // illustrative: 1.5% of orders meet a rule only through a fact found in notes
  const cards = NETWORK.ordersPerDay * deltaShare; // 768
  const criticalShare = 0.1; // of delta cards, interruptive (critical indicator)
  const explainShare = 0.2; // clinicians click "Explain" on 20% of delta cards → one LLM call
  return {
    deltaShare,
    cardsPerDay: cards,
    criticalPerDay: cards * criticalShare, // 76.8
    explainsPerDay: cards * explainShare, // 153.6
    cardsPer100Orders: deltaShare * 100, // 1.5
    criticalPer100Orders: deltaShare * criticalShare * 100, // 0.15
  };
})();

/** Graph, stores and index sizes (all ESTIMATES except where a dossier fact is named). */
export const SIZES = (() => {
  const umlsConcepts = 3_550_208; // UMLS 2026AB (F1); not loaded whole: only the sources below
  const snomedConcepts = 360_000; // SNOMED CT International, "more than 360,000" (F7)
  const rxnormConcepts = 300_000; // estimate (ingredients, clinical and branded drugs, packs)
  const loincTerms = 100_000; // estimate
  const knowledgeNodes = snomedConcepts + rxnormConcepts + loincTerms + 240_000; // + classes, label and guideline sections ≈ 1.0M
  const knowledgeEdges = 12_000_000; // estimate: SNOMED IS_A and attributes, RxNorm relations, ≈ 300,000 interaction edges
  const linkingNames = 3_000_000; // estimate: names and synonyms from SNOMED CT, RxNorm and LOINC only
  const codedFactsPerPatient = 850; // estimate: 30 meds, 2 allergies, 20 conditions, ≈ 800 lab results
  const codedFacts = NETWORK.activePatients * codedFactsPerPatient; // 1.02B rows
  const storedMentions = NETWORK.storedNotes * NETWORK.mentionsPerNote; // 6.0B rows
  const chunkTokens = 350;
  const chunks = NETWORK.storedNoteTokens / chunkTokens; // 300M
  const chunksPerActivePatient = chunks / NETWORK.activePatients; // 250
  const vectorBytes = 1_024; // 1,024 dims × INT8
  const chunkVectorsTB = (chunks * vectorBytes) / 1e12; // 0.31 TB
  const passages = 1_500_000 + 200_000; // estimate: FDA label sections + guideline passages
  return {
    umlsConcepts,
    snomedConcepts,
    rxnormConcepts,
    loincTerms,
    knowledgeNodes,
    knowledgeEdges,
    linkingNames,
    codedFactsPerPatient,
    codedFacts,
    storedMentions,
    chunkTokens,
    chunks,
    chunksPerActivePatient,
    vectorBytes,
    chunkVectorsTB,
    passages,
    // Exact search inside one patient's chunks: 250 × 1,024 INT8 dot products ≈ 256,000 multiply-adds (< 1 ms of CPU).
    perPatientDotProducts: chunksPerActivePatient * 1_024,
  };
})();

/** Context window of one drug-safety answer call (sheet §11). Record and reference calls are below it. */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions, citation and abstention rules", tokens: 900, stable: true },
    { id: "format", label: "Output format and two examples", tokens: 400, stable: true },
    { id: "question", label: "Question and planner notes", tokens: 100, stable: false },
    // 8 active meds × 25 + 2 allergies × 20 + 10 conditions × 15 + 6 key labs × 20 + age, sex, weight, pregnancy 30
    {
      id: "patient",
      label: "Patient facts (pseudonymised)",
      tokens: 8 * 25 + 2 * 20 + 10 * 15 + 6 * 20 + 30,
      stable: false,
    },
    // 2 alerts × 120 + the coverage list (what was checked, versions, missing inputs) 100
    { id: "alerts", label: "Rule results and coverage", tokens: 2 * 120 + 100, stable: false },
    { id: "paths", label: "Graph paths behind the alerts", tokens: 10 * 30, stable: false },
    { id: "headers", label: "8 passage headers", tokens: 8 * 30, stable: false },
    { id: "passages", label: "8 label and guideline passages", tokens: 8 * 200, stable: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 4,420
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,300 ≥ 512, cacheable
  const outputTokens = 250; // 10 sentences of 25
  const sentenceTokens = 25;
  // Record question: no rule results or paths (−640); 5 of this patient's note chunks of 350 tokens (1,750) + 5 headers
  // of 18 (90) = 1,840 in place of the label passages (the same 1,840); a longer timeline summary (+300) →
  // 4,420 − 640 + 300 = 4,080. Reference question: no patient block (−540) → 3,880.
  const recordTotal = total - (340 + 300) + 300; // 4,080
  const referenceTotal = total - 540; // 3,880
  // The whole chart instead: 850 coded facts × 25 tokens + the last 20 notes × 700 = 21,250 + 14,000 = 35,250 tokens.
  const wholeChart = SIZES.codedFactsPerPatient * 25 + 20 * NETWORK.noteTokens;
  return {
    blocks,
    total,
    stable,
    changing: total - stable, // 3,120
    outputTokens,
    sentenceTokens,
    sentences: outputTokens / sentenceTokens, // 10
    recordTotal,
    referenceTotal,
    wholeChart,
    plannerPrefix: 600, // intent schema and examples, above the 512 minimum, so cached
  };
})();

/**
 * Sentence checks (sheet §13, §15.3). Rates ILLUSTRATIVE, measured on a labelled set; the unsupported rate is a release
 * gate the answer model must pass. A dropped sentence is not replaced: generation restarts from the last shown sentence
 * with the claim excluded (≤ 2 restarts). A 3rd drop replaces the explanation with the rules card and the evidence list.
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
    shownUnsupportedShare, // ≈ 0.16% of shown sentences
    msPerSentence: 60,
  };
})();

/** Cost per call and per day (sheet §5, §12). */
export const COST = (() => {
  const p = KH_PRICES;
  // Mid-size answer call, whole prompt written to the 5-minute cache so a restart reads it back.
  const answerCall = (total: number, stable: number, out: number) =>
    usd(stable, p.mid.cached) + usd(total - stable, p.mid.cacheWrite) + usd(out, p.mid.output);
  const restart = (total: number) => usd(total, p.mid.cached) + usd(125, p.mid.input); // 125 shown tokens fed back
  const planner = usd(CONTEXT.plannerPrefix, p.small.cached) + usd(120, p.small.input) + usd(80, p.small.output);
  const safetyAnswer = answerCall(CONTEXT.total, CONTEXT.stable, CONTEXT.outputTokens); // 0.01043
  const safety = planner + safetyAnswer + CHECKS.expectedRestarts * restart(CONTEXT.total);
  const record =
    planner +
    answerCall(CONTEXT.recordTotal, CONTEXT.stable, CONTEXT.outputTokens) +
    CHECKS.expectedRestarts * restart(CONTEXT.recordTotal);
  const reference =
    planner +
    answerCall(CONTEXT.referenceTotal, CONTEXT.stable, CONTEXT.outputTokens) +
    CHECKS.expectedRestarts * restart(CONTEXT.referenceTotal);
  // "Explain" on an order card: rule result + paths + 4 passages, 150 tokens out, no planner.
  const explain = answerCall(1_300 + 100 + 540 + 340 + 300 + 4 * 230, 1_300, 150);
  const t = NETWORK.perType;
  const llmPerDay =
    t.safety * safety + t.record * record + t.reference * reference + ORDER_CARDS.explainsPerDay * explain;
  // GPUs inside the PHI zone. Ingestion: 56.3M note tokens × 3 encoder passes (NER, linking, assertion) + 1 embedding
  // pass = 225M tokens ÷ 200,000 a second = 1,126 GPU-seconds a day; run on 2 GPUs for availability and minutes-level
  // freshness. Query side (linker, cross-encoder, checker): 2 GPUs. 4 × 24 × 2.5 = 240 USD a day.
  const ingestTokens = NETWORK.noteTokensPerDay * 4;
  const ingestGpuSeconds = ingestTokens / p.encoderTokensPerSecond;
  const gpus = 4;
  const gpuPerDay = gpus * 24 * p.gpuHour;
  // Backfill of 10 years: 105B tokens × 4 passes ÷ 200,000 = 2.1M GPU-seconds = 583 GPU-hours ≈ 1,460 USD once.
  const backfillGpuHours = (NETWORK.storedNoteTokens * 4) / p.encoderTokensPerSecond / 3_600;
  const backfillUsd = backfillGpuHours * p.gpuHour;
  // The rejected alternative: a small LLM extracts facts from every stored note: 105B input × 0.10 + 150 output tokens
  // a note × 150M × 0.50, per million = 10,500 + 11,250 = 21,750 USD, and ten years of notes go to the vendor.
  const llmBackfillUsd = usd(NETWORK.storedNoteTokens, p.small.input) + usd(150 * NETWORK.storedNotes, p.small.output);
  // Stores (illustrative): knowledge graph 3 replicas; patient fact store PostgreSQL primary + replica; note-chunk
  // vectors and passage index on 3 search nodes; gateway, orchestrator, audit, provenance and traces 150.
  const graphPerDay = 3 * 24 * p.graphNodeHour; // 288
  const factStorePerDay = 2 * 24 * p.dbNodeHour; // 144
  const searchPerDay = 3 * 24 * p.dbNodeHour; // 216
  const platformPerDay = 150;
  const infraPerDay = gpuPerDay + graphPerDay + factStorePerDay + searchPerDay + platformPerDay; // 1,038
  // Licences: vocabularies free in the US (RxNorm, UMLS, SNOMED CT US Edition in a member country, LOINC: F5, F8, F9,
  // F11). The curated drug-knowledge base is licensed; vendors do not publish prices: PLACEHOLDER 300,000 USD a year.
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
  // Self-hosting the answer model instead (70B class, 2 nodes × 8 GPUs for availability): 16 × 24 × 2.5 = 960 USD a day.
  const selfHostAnswerPerDay = 16 * 24 * p.gpuHour;
  const supported = NETWORK.questionsPerDay + NETWORK.ordersPerDay; // 58,400 decisions supported a day
  return {
    planner,
    safetyAnswer,
    safety, // ≈ 0.0109 USD: planner 0.000058 + answer 0.01043 + 0.56 restarts × 0.00069
    record,
    reference,
    explain,
    llmPerDay, // ≈ 75 USD
    ingestTokens,
    ingestGpuSeconds,
    gpus,
    gpuPerDay,
    backfillGpuHours,
    backfillUsd,
    llmBackfillUsd,
    graphPerDay,
    factStorePerDay,
    searchPerDay,
    platformPerDay,
    infraPerDay,
    drugKbPerDay,
    team,
    teamPerDay,
    gradingPerRelease,
    gradingPerDay,
    auditPerDay,
    total, // ≈ 14,170 USD a day
    perQuestion: total / NETWORK.questionsPerDay, // ≈ 1.97 USD all-in
    perDecision: total / supported, // ≈ 0.24 USD
    marginalPerSafetyQuestion: safety + gpuPerDay / 2 / NETWORK.questionsPerDay, // model + query GPUs ≈ 0.027
    shares: {
      llm: llmPerDay / total,
      people: (teamPerDay + gradingPerDay + auditPerDay) / total,
      infra: infraPerDay / total,
      drugKb: drugKbPerDay / total,
    },
    selfHostAnswerPerDay,
    selfHostRatio: selfHostAnswerPerDay / llmPerDay, // ≈ 13×
    doubledLlmPerDay: llmPerDay * 2,
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
  const firstToken = s("firstToken", 500, 900); // ≈ 4,400-token prompt, mid-size, illustrative
  const checks = s("checks", CHECKS.msPerSentence, 100);
  const traversal = { p50: 12, p95: 35 }; // one templated traversal on the in-memory knowledge graph
  const traversals = maxDist(Array.from({ length: 6 }, () => traversal)); // 6 templates in parallel: ≈ 29 / 45
  const fhirRead = { p50: 150, p95: 400 }; // one FHIR read from the EHR (estimate)
  const fhir = maxDist(Array.from({ length: 4 }, () => fhirRead)); // meds, allergies, conditions, labs in parallel: ≈ 302 / 490
  const planner = { p50: 300, p95: 600 }; // small model, JSON schema, 600-token cached prefix
  // Planner and FHIR reads start together (the patient is in the launch context). The max of two near-equal medians
  // (300, 302) is ≈ 379 at p50, later than either.
  const head = maxDist([planner, fhir]);
  const factStore = { p50: 10, p95: 25 };

  const pathP = (stages: readonly { p50: number; p95: number }[]) => ({
    p50: sum(stages.map((x) => x.p50)),
    p95: sum(stages.map((x) => x.p50)) + rss(stages.map((x) => x.p95 - x.p50)),
  });

  // Order-select card, with the EHR's prefetch (meds, allergies, conditions, labs come in the hook call).
  const orderStages = [
    s("edge", 15, 30), // TLS, JWT verify (F24)
    s("prefetch", 5, 10), // parse the prefetched FHIR bundle
    { id: "rules", ...maxDist([traversals, factStore]) }, // traversals ‖ note-derived facts for this patient
    s("card", 5, 10), // dedupe against coded-only results, assemble cards; audit written asynchronously
  ];
  const order = pathP(orderStages);
  // Without prefetch the service would read FHIR itself: + the slowest of 4 reads.
  const orderNoPrefetch = pathP([...orderStages, { id: "fhir", ...fhir }]);

  // Drug-safety question, to the alerts event and to the first verified sentence.
  const toAlerts = [
    s("edge", 40, 80), // SMART token, care-team check (cached), audit
    { id: "head", ...head },
    s("link", 50, 90), // embed the drug mention, ANN over 3M names, rerank top 20
    { id: "traverse", ...traversals },
    s("alertsOut", 10, 20),
  ];
  const toContext = [s("passages", 60, 120), s("rerank", 80, 120), s("context", 10, 20)];
  const write = [firstToken, sentence, checks];
  const safetyAlerts = pathP(toAlerts);
  const safetyFirst = pathP([...toAlerts, ...toContext, ...write]);
  // Correlated case: planner, first token and sentence share the model provider; their spreads add linearly.
  const indep = [...toAlerts, ...toContext, ...write].filter((x) => !["head", "firstToken", "sentence"].includes(x.id));
  const correlatedSpread = head.p95 - head.p50 + (firstToken.p95 - firstToken.p50) + (sentence.p95 - sentence.p50);
  const safetyFirstCorrelatedP95 = safetyFirst.p50 + rss([...indep.map((x) => x.p95 - x.p50), correlatedSpread]);
  // Restart after a dropped first sentence: cached-prompt first token 300 + a sentence + checks = 672.5 ms.
  const restartMs = 300 + sentence.p50 + checks.p50;
  const withDrops = (p50: number, p95: number) =>
    mixtureQuantile(
      [
        { weight: 1 - CHECKS.drop, p50, spread: p95 - p50 },
        { weight: CHECKS.drop, p50: p50 + restartMs, spread: p95 - p50 },
      ],
      0.95
    );
  const safetyFirstP95 = withDrops(safetyFirst.p50, safetyFirst.p95);
  const safetyFirstCorrelatedP95WithDrops = withDrops(safetyFirst.p50, safetyFirstCorrelatedP95);

  // Complete answer: first token, then 250 tokens at 80 a second (p95 at 65), last check 60; each restart (a dropped
  // sentence is not replaced) adds the restart first token 300 + checks 60 = 360 ms, at most 2.
  const genP50 = (CONTEXT.outputTokens / decode) * 1_000; // 3,125
  const genP95 = (CONTEXT.outputTokens / decodeP95) * 1_000; // 3,846
  const beforeFirstToken = [...toAlerts, ...toContext];
  const completeBase = pathP([...beforeFirstToken, firstToken, s("generate", genP50, genP95), checks]);
  const restartAdd = 300 + CHECKS.msPerSentence; // 360
  const completeParts = [
    { weight: CHECKS.p0, p50: completeBase.p50, spread: completeBase.p95 - completeBase.p50 },
    { weight: CHECKS.p1, p50: completeBase.p50 + restartAdd, spread: completeBase.p95 - completeBase.p50 },
    {
      weight: 1 - CHECKS.p0 - CHECKS.p1,
      p50: completeBase.p50 + 2 * restartAdd,
      spread: completeBase.p95 - completeBase.p50,
    },
  ];
  const safetyComplete = { p50: mixtureQuantile(completeParts, 0.5), p95: mixtureQuantile(completeParts, 0.95) };

  // Record question: no rule traversal on the path; question embedding 10 + exact search in one patient's 250 chunks 5
  // + patient fact query 20 (in parallel with the chunk search) instead of link + traverse.
  const recordStages = [
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
    ...write,
  ];
  const recordFirst = pathP(recordStages);
  const recordFirstP95 = withDrops(recordFirst.p50, recordFirst.p95);

  return {
    decode,
    traversals,
    fhir,
    head,
    order, // ≈ 54 / 77 ms
    orderNoPrefetch, // ≈ 356 / 545 ms: over 500 at p95, so prefetch is required
    safetyAlerts, // ≈ 508 / 743 ms
    safetyFirst, // ≈ 1,530 / 2,012 ms (independent tails, no drops)
    safetyFirstP95, // ≈ 2,146 with drops
    safetyFirstCorrelatedP95WithDrops, // ≈ 2,364: the gated value
    restartMs,
    safetyComplete, // ≈ 4,537 / 5,508 ms
    recordFirst, // ≈ 1,411 / 1,889 ms
    recordFirstP95, // ≈ 2,023 with drops
  };
})();

/** Targets (sheet §4 N5) and whether the budget meets them. */
export const TARGETS = (() => {
  const L = LATENCY;
  const rows = [
    { id: "order", label: "Order-select card", p50: L.order.p50, p95: L.order.p95, targetP50: 200, targetP95: 500 },
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
      label: "Safety question: first verified sentence (correlated tails, drops)",
      p50: L.safetyFirst.p50,
      p95: L.safetyFirstCorrelatedP95WithDrops, // ≈ 2,364: the gated value
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
      p95: L.recordFirstP95,
      targetP50: 2_000,
      targetP95: 3_000,
    },
  ] as const;
  return rows.map((r) => ({ ...r, meets: r.p50 <= r.targetP50 && r.p95 <= r.targetP95 }));
})();

/** Evaluation sets and their 95% confidence half-widths (sheet §13). */
export const EVAL = (() => {
  const half = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  const ruleOfThree = (n: number) => 3 / n; // 95% upper bound on a rate after 0 failures in n
  const highPriorityCases = 15 * 10; // 15 pairs (F15) × 10 orderable variants (brand, generic, combination, class member)
  const majorSample = 2_000;
  const linkingNotes = 200;
  const linkingMentions = linkingNotes * NETWORK.mentionsPerNote; // 8,000
  const medMentions = 1_600;
  const problemMentions = 3_000;
  const clinicianSet = 600;
  const abstentionSet = 150;
  return {
    highPriorityCases,
    highPriorityUpperMiss: ruleOfThree(highPriorityCases), // 2%
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
    abstentionHalfWidth: half(0.95, abstentionSet), // ± 3.5 points
    checkerSentences: 2_000,
    checkerUnsupported: 500,
    checkerFalseAcceptHalfWidth: half(CHECKS.falseAccept, 500), // ± 1.9 points
    humanAgreementCeiling: 0.742, // n2c2 2019 after adjudication (F30)
  };
})();

/** Freshness and abstention rates (sheet §4 N7, §15.3). ESTIMATES. */
export const FRESHNESS = {
  projectionP50Seconds: 30, // EHR event → patient fact store
  projectionP95Minutes: 5,
  noteLinkedP95Minutes: 15, // signed note → linked facts
  kbPromoteDays: 7, // vendor release → regression gate → live
  labWindowDays: 90, // a renal-dosed drug needs an eGFR within 90 days, or the answer names it as missing (illustrative)
  partialAbstainShare: 0.08, // safety questions with at least one missing or stale input, named in the answer
  fullAbstainShare: 0.02, // drug not linkable or not in the knowledge base: rules cannot run
} as const;
