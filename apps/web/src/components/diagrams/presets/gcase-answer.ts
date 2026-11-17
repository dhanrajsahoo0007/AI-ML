// Constants and arithmetic for the "Design an AI Answer Engine" case study (/genai-system-design/case-studies/
// ai-answer-engine; design sheet SYSTEM-DESIGN/plans/genai-design/design/ai-answer-engine.md v2, dossier
// research/ai-answer-engine.md, review review/ai-answer-engine-design.md). Specs in assets/diagrams/animated/
// answer-engine/ import from here, so the page, the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost: it defines its own generic answer engine. Every volume, mix, rate and unit cost below is
// ILLUSTRATIVE unless a comment names a source. Prices are list prices as of November 2026 (read 17 November 2026):
// mid-size model (Claude Sonnet 5.5 class) 2.00 input / 0.10 cache read / 2.50 5-minute cache write / 10.00 output USD
// per million tokens; small (Claude Haiku 5.5 class) 0.10 / 0.01 / 0.125 / 0.50; minimum cacheable prefix 512 tokens
// on both (Anthropic prompt-caching docs). Search API 5 USD per 1,000 calls (Brave Search, Perplexity Search API
// standard) and 1 USD (Perplexity Fast Search). Vendor latency (Brave p50 513 / p95 808 ms) is Perplexity's vendor-run
// test, September 2025. Parallel stages are budgeted as the maximum of n draws (p50 and p95), not as one call.

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error < 1.5e-7) and its inverse by bisection. */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
function phiInv(p: number) {
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (phi(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const Z95 = phiInv(0.95); // 1.645

/** Quantile q of the maximum of n independent normal draws with this p50 and p95: one draw's quantile q^(1/n). */
export function maxOfN(p50: number, p95: number, n: number, q: number) {
  const sigma = (p95 - p50) / Z95;
  return p50 + phiInv(q ** (1 / n)) * sigma;
}

/** Quantile q of a mixture of normal components [{ weight, p50, spread }] where spread = p95 − p50 (bisection). */
export function mixtureQuantile(parts: readonly { weight: number; p50: number; spread: number }[], q: number) {
  const cdf = (t: number) => sum(parts.map((p) => p.weight * phi(((t - p.p50) / p.spread) * Z95)));
  let lo = 0;
  let hi = 100_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export const mixtureP95 = (parts: readonly { weight: number; p50: number; spread: number }[]) => mixtureQuantile(parts, 0.95);

/** Quantile q of T = the first call, or (if it is not back by hedgeAt) the earlier of it and a hedge sent then. */
export function hedgedQuantile(a: { p50: number; p95: number }, b: { p50: number; p95: number }, hedgeAt: number, q: number) {
  const sa = (a.p95 - a.p50) / Z95;
  const sb = (b.p95 - b.p50) / Z95;
  const survive = (t: number) => (1 - phi((t - a.p50) / sa)) * (t <= hedgeAt ? 1 : 1 - phi((t - hedgeAt - b.p50) / sb));
  let lo = 0;
  let hi = 10_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (survive(mid) > 1 - q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** P(exactly k of n) for a binomial with rate p. */
function binom(n: number, k: number, p: number) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * p ** k * (1 - p) ** (n - k);
}

/** USD per million tokens, search prices, GPU assumptions, as of November 2026. */
export const PRICES = {
  mid: { input: 2.0, cached: 0.1, cacheWrite: 2.5, output: 10.0 },
  small: { input: 0.1, cached: 0.01, cacheWrite: 0.125, output: 0.5 },
  minCacheablePrefix: 512, // Sonnet 5.5, Haiku 5.5, Opus 5.5
  searchPerCall: 5 / 1_000, // list
  searchFastPerCall: 1 / 1_000, // list
  managedRerankPerMillion: 0.05, // Voyage rerank-2.5
  gpuHour: 2.5, // illustrative
  // Throughput per GPU (illustrative, reconciled with latency): a sub-1B encoder at batch reads ≈ 200,000 tokens a
  // second, so a 13,800-token rerank takes 69 ms of compute + ≈ 11 ms overhead = the 80 ms stage. A 7B checker ≈ 10,000.
  smallEncoderTokensPerSecond: 200_000,
  sevenBTokensPerSecond: 10_000,
  gpuHeadroom: 1.3, // fleet sized for peak + 30%
  liveFetch: 0.0001, // proxy and bandwidth per page fetched live (illustrative)
  cacheHit: 0.00001, // answer-cache lookup (illustrative)
} as const;

/** Traffic and request mix (illustrative). */
export const TRAFFIC = (() => {
  const perDay = 10_000_000;
  const avgPerSecond = perDay / 86_400; // ≈ 115.7
  const peakPerSecond = avgPerSecond * 3; // ≈ 347
  const followUps = 0.3; // never served from the shared cache
  const cacheHitOfFirstTurn = 0.2; // illustrative; Google: 15% of daily queries are new (bound, not a hit rate)
  const cache = (1 - followUps) * cacheHitOfFirstTurn; // 0.14
  const multiHop = 0.05; // planner decomposes into 2–3 dependent hops
  const researchDirect = 0.01; // 0.3% auto-run + 0.7% the Research button
  const quick = 1 - cache - multiHop - researchDirect; // 0.80
  return {
    perDay,
    avgPerSecond,
    peakPerSecond,
    followUps,
    cacheHitOfFirstTurn,
    mix: { cache, quick, multiHop, researchDirect },
    cachePerDay: perDay * cache, // 1.4M
    quickPerDay: perDay * quick, // 8.0M
    multiHopPerDay: perDay * multiHop, // 500,000
    researchAutoShare: 0.003,
    researchButtonShare: 0.007,
    followUpShareOfAnswered: followUps / (1 - cache), // 0.349: follow-ups among questions that reach the pipeline
  };
})();

/** Searches and fetches per quick answer; the ranking funnel. */
export const RETRIEVAL = (() => {
  const indexQueries = 3;
  const shards = 100;
  const shardDeadlineMs = 60; // hedged to a replica at 40 ms; late shards dropped
  const apiRoutedShare = 0.25; // planner flags long-tail or breaking questions
  const apiCallsWhenRouted = 1; // one call on the critical path (the best rewrite)
  const apiCalls = apiRoutedShare * apiCallsWhenRouted; // 0.25
  const liveFetchesWhenRouted = 3;
  const liveFetches = apiRoutedShare * liveFetchesWhenRouted; // 0.75
  const retrieved = indexQueries * (100 + 100); // 600: lexical + vector per query
  const funnel = [
    { id: "retrieved", label: "Retrieved", spans: retrieved },
    { id: "unique", label: "Unique", spans: 400 },
    { id: "prefilter", label: "After prefilter", spans: 300 }, // stale, spam, duplicates, disallowed hosts out
    { id: "cheap", label: "Cheap scorer", spans: 60 },
    { id: "cross", label: "Cross-encoder", spans: 12 },
  ] as const;
  const rerankTokens = 60 * (200 + 30); // 13,800 per ranking pass
  return {
    indexQueries,
    shards,
    shardDeadlineMs,
    apiRoutedShare,
    apiCallsWhenRouted,
    apiCalls,
    liveFetchesWhenRouted,
    liveFetches,
    retrieved,
    funnel,
    rerankTokens,
    spansInPrompt: 12,
    spanTokens: 200,
    maxPerDomain: 3,
    maxPerPage: 2,
    // Cross-encoder on all 300 after the prefilter instead of 60: 80 × 300 ÷ 60 = 400 ms, i.e. +320 ms.
    crossOn300ExtraMs: (80 * 300) / 60 - 80,
  };
})();

/** Context window of one quick answer call (sheet §11). */
export const CONTEXT = (() => {
  const threadOnFollowUps = 300;
  const threadAvg = Math.round(threadOnFollowUps * TRAFFIC.followUpShareOfAnswered); // 300 × 0.349 ≈ 105
  const blocks = [
    { id: "instructions", label: "Instructions and citation rules", tokens: 800, stable: true },
    { id: "format", label: "Output format and examples", tokens: 400, stable: true },
    { id: "thread", label: "Thread summary (average)", tokens: threadAvg, stable: false },
    { id: "question", label: "Question and planner notes", tokens: 100, stable: false },
    { id: "headers", label: "12 span headers", tokens: 12 * 25, stable: false },
    { id: "spans", label: "12 spans, ranked", tokens: RETRIEVAL.spansInPrompt * RETRIEVAL.spanTokens, stable: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 4,105
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,200 ≥ 512, cacheable
  const outputTokens = 300;
  const sentenceTokens = 25;
  const pageTokens = 2_000; // one value everywhere: 10 spans of 200
  const wholePagesTokens = 8 * pageTokens; // 16,000
  const spansWithHeaders = 12 * 25 + RETRIEVAL.spansInPrompt * RETRIEVAL.spanTokens; // 2,700
  return {
    threadOnFollowUps,
    threadAvg,
    blocks,
    total,
    stable,
    changing: total - stable, // 2,905
    outputTokens,
    sentenceTokens,
    sentences: outputTokens / sentenceTokens, // 12
    pageTokens,
    wholePagesTokens,
    spansWithHeaders,
    pagesExtraTokens: wholePagesTokens - spansWithHeaders, // 13,300
    pagesExtraUsdMid: usd(wholePagesTokens - spansWithHeaders, PRICES.mid.input), // ≈ 0.0266
    plannerPrefix: 600, // intents, schema and examples: above the 512 minimum, so cached
  };
})();

/**
 * Verifier and drop handling (sheet §13, §15.2). Rates ILLUSTRATIVE, measured on a labelled set. A sentence is dropped
 * when it is unsupported and caught, or wrongly rejected and not rescued by re-citing. On a drop, generation restarts
 * from the last shown sentence with the dropped claim excluded (≤ 2 restarts); a 3rd drop ends the answer as
 * low-confidence with a research offer.
 */
export const VERIFIER = (() => {
  const unsupported = 0.05;
  const falseAccept = 0.05;
  const falseReject = 0.05;
  const rescued = 0.5; // share of false rejects that re-citing to another span recovers
  const n = CONTEXT.sentences;
  const dropRate = (u: number) => u * (1 - falseAccept) + (1 - u) * falseReject * (1 - rescued);
  // Rates for any unsupported-sentence rate u and offer acceptance (sensitivity, R2-4).
  const at = (u: number, acceptance = 0.1) => {
    const dd = dropRate(u);
    const q0 = binom(n, 0, dd);
    const q1 = binom(n, 1, dd);
    const low = 1 - q0 - q1 - binom(n, 2, dd);
    return { drop: dd, restarts: q1 + 2 * (1 - q0 - q1), low, followOn: TRAFFIC.mix.quick * low * acceptance };
  };
  const d = dropRate(unsupported); // 0.0475 + 0.02375 = 0.07125
  const p0 = binom(n, 0, d);
  const p1 = binom(n, 1, d);
  const p2 = binom(n, 2, d);
  const pLow = 1 - p0 - p1 - p2; // ≥ 3 drops
  const expectedRestarts = p1 + 2 * (1 - p0 - p1); // ≤ 2 restarts
  const shownSupported = (1 - unsupported) * (1 - falseReject * (1 - rescued));
  const shownUnsupported = unsupported * falseAccept;
  const at10 = dropRate(0.1);
  const pLowAt10 = 1 - binom(n, 0, at10) - binom(n, 1, at10) - binom(n, 2, at10);
  return {
    at,
    unsupported, // the gated maximum: a release fails if the model writes more than 5% unsupported sentences
    falseAccept,
    falseReject,
    rescued,
    dropRate: d,
    p0,
    p1,
    p2,
    pLow, // ≈ 4.9% of quick answers end low-confidence
    pLowAt10, // ≈ 15.9% if the model writes 10% unsupported sentences
    expectedRestarts, // ≈ 0.80
    firstSentenceDropped: d, // the first verified sentence comes after a restart on ≈ 7% of answers
    shownSupportRate: shownSupported / (shownSupported + shownUnsupported), // ≈ 0.997 if the rates hold
    offerAcceptance: 0.1,
    followOnResearchShare: TRAFFIC.mix.quick * pLow * 0.1, // ≈ 0.39% of questions
    msPerSentence: 60, // 0.8B checker; the uncertain 20% band also goes to a 7B checker (+40 ms)
    bandTo7B: 0.2,
  };
})();

/** One research run by tier (sheet §15.3). Caps bind on the large tier. */
export const RESEARCH = (() => {
  const tiers = {
    S: { label: "Comparison", subagents: 2, calls: 5, report: 800, spans: 12_000, tokenCap: 150_000, usdCap: 0.5, share: 0.5 },
    M: { label: "Multi-part", subagents: 4, calls: 8, report: 1_500, spans: 20_000, tokenCap: 600_000, usdCap: 1.0, share: 0.35 },
    L: { label: "Report", subagents: 6, calls: 10, report: 3_000, spans: 30_000, tokenCap: 1_200_000, usdCap: 2.0, share: 0.15 },
  } as const;
  const base = 2_000;
  const growth = 3_300; // 3,000 of results + 300 of own output per call
  const subIn = (calls: number) => base * calls + (growth * calls * (calls - 1)) / 2;
  const run = (t: (typeof tiers)[keyof typeof tiers], m = 1) => {
    const planIn = 2_000;
    const planOut = 500;
    const synthIn = 2_000 + t.subagents * 3_000 + t.spans;
    const repairIn = t.report + t.spans + 1_000;
    // Token cap: subagents get what the cap leaves after the lead and repair; calls shrink until they fit.
    const subBudget = (t.tokenCap - planIn - synthIn - repairIn) / t.subagents;
    let calls: number = t.calls;
    while (calls > 1 && subIn(calls) > subBudget) calls--;
    const inTok = subIn(calls);
    const newTok = base + (calls - 1) * growth;
    const cachedTok = inTok - newTok;
    const outTok = calls * 300;
    const sub = m * (usd(newTok, PRICES.mid.cacheWrite) + usd(cachedTok, PRICES.mid.cached) + usd(outTok, PRICES.mid.output));
    const lead = m * (usd(planIn + synthIn, PRICES.mid.input) + usd(planOut + t.report, PRICES.mid.output));
    const repair = m * (usd(repairIn, PRICES.small.input) + usd(t.report, PRICES.small.output));
    const searches = t.subagents * calls;
    const api = (searches / 2) * PRICES.searchPerCall;
    const fetches = searches * 2 * PRICES.liveFetch;
    const uncapped = t.subagents * sub + lead + repair + api + fetches;
    const total = Math.min(uncapped, t.usdCap);
    const decode = 1_000 / 80;
    const ms = 1_000 + planOut * decode + calls * (400 + 500 + 800 + 300 * decode) + 1_500 + t.report * decode;
    return {
      calls,
      capBinds: calls < t.calls,
      tokens: t.subagents * inTok + planIn + synthIn + repairIn,
      sub,
      lead,
      repair,
      searches,
      apiCalls: searches / 2,
      api,
      fetches,
      uncapped,
      total,
      usdCapBinds: uncapped > t.usdCap,
      ms,
      sentences: t.report / 25,
    };
  };
  const S = run(tiers.S);
  const M = run(tiers.M);
  const L = run(tiers.L);
  const avg = (f: (r: ReturnType<typeof run>) => number) =>
    tiers.S.share * f(S) + tiers.M.share * f(M) + tiers.L.share * f(L);
  const doubled = { S: run(tiers.S, 2), M: run(tiers.M, 2), L: run(tiers.L, 2) };
  // Lever: the M tier with small-model subagents (cache write 0.125, read 0.01, output 0.50).
  const mSmallSub =
    usd(2_000 + 7 * 3_300, PRICES.small.cacheWrite) + usd(subIn(8) - (2_000 + 7 * 3_300), PRICES.small.cached) + usd(8 * 300, PRICES.small.output); // ≈ 0.0052
  const mSmallSubagents = M.total - tiers.M.subagents * (M.sub - mSmallSub); // ≈ 0.20
  const runShare = TRAFFIC.mix.researchDirect + VERIFIER.followOnResearchShare; // ≈ 1.39% of questions
  return {
    tiers,
    S,
    M,
    L,
    avgCost: avg((r) => r.total), // ≈ 0.45
    avgSearches: avg((r) => r.searches),
    avgApiCalls: avg((r) => r.apiCalls),
    avgTokens: avg((r) => r.tokens),
    avgSentences: avg((r) => r.sentences),
    avgMs: avg((r) => r.ms),
    doubled, // 2× model prices: the M tier hits its 1 USD cap; the token caps are backstops
    mSmallSub,
    mSmallSubagents,
    runShare,
    runsPerDay: TRAFFIC.perDay * runShare,
    leadProceedsAtMs: 75_000,
    hardStopMs: 200_000, // stop researching; the partial report is written by reportByMs
    reportByMs: 240_000,
    quota: { anonymousPerDay: 3, signedInPerDay: 30 },
  };
})();

/** Cost of one quick answer and one multi-hop answer, in USD (sheet §5). GPU work is in the fleet (GPU_FLEET). */
export const QUICK_COST = (() => {
  // The first call writes the whole prompt to the 5-minute cache so that a restart reads it back.
  const callWritten = (p: { cached: number; cacheWrite: number; output: number }) =>
    usd(CONTEXT.stable, p.cached) + usd(CONTEXT.changing, p.cacheWrite) + usd(CONTEXT.outputTokens, p.output);
  const mid = callWritten(PRICES.mid); // 0.00012 + 0.00726 + 0.003 = 0.01038
  const small = callWritten(PRICES.small); // 0.000012 + 0.000363 + 0.00015 = 0.000525
  const shownBeforeRestart = 150; // tokens of already-shown sentences sent uncached on a restart
  const restartMid = usd(CONTEXT.total, PRICES.mid.cached) + usd(shownBeforeRestart, PRICES.mid.input); // 0.00071
  const restartSmall = usd(CONTEXT.total, PRICES.small.cached) + usd(shownBeforeRestart, PRICES.small.input);
  const smallShare = 0.6;
  const r = VERIFIER.expectedRestarts;
  const answer = smallShare * (small + r * restartSmall) + (1 - smallShare) * (mid + r * restartMid); // ≈ 0.00472
  const planner =
    usd(CONTEXT.plannerPrefix, PRICES.small.cached) + usd(100, PRICES.small.input) + usd(80, PRICES.small.output); // 0.000056
  const grader = 0.01 * (usd(6_000, PRICES.mid.input) + usd(300, PRICES.mid.output)); // independent grader on 1%: 0.00015
  const api = RETRIEVAL.apiCalls * PRICES.searchPerCall; // 0.00125
  const fetches = RETRIEVAL.liveFetches * PRICES.liveFetch; // 0.000075
  const nonApi = planner + fetches + answer + grader;
  const total = nonApi + api; // ≈ 0.00625
  // Multi-hop: 2 round calls (100 tokens of notes and next queries each) + the final answer; API on each round.
  const roundCall = usd(CONTEXT.stable, PRICES.mid.cached) + usd(CONTEXT.changing, PRICES.mid.input) + usd(100, PRICES.mid.output); // 0.00693
  // Only the first round may call the API (25% of multi-hop questions, 1 call); later rounds use the own index.
  const multiHopApiCalls = RETRIEVAL.apiCalls; // 0.25
  const multiHopNonApi = planner + 2 * roundCall + (mid + r * restartMid) + fetches + grader;
  const multiHop = multiHopNonApi + multiHopApiCalls * PRICES.searchPerCall; // ≈ 0.0262
  // Doubled model prices (probe P4): model lines × 2.
  const doubledQuick = 2 * (planner + answer + grader) + api + fetches;
  // The HTTP/3 walk-through: own-index path (no API, no fetch), mid-size model, one restart.
  const http3Example = planner + mid + restartMid + grader;
  return {
    mid,
    small,
    restartMid,
    restartSmall,
    smallShare,
    answer,
    allMidAnswer: mid + r * restartMid,
    planner,
    grader,
    api,
    fetches,
    nonApi,
    total,
    roundCall,
    multiHopApiCalls,
    multiHopNonApi,
    multiHop,
    doubledQuick, // ≈ 0.011 (> N5's 0.01: the doubled-price case breaks the quick target)
    http3Example,
    stablePrefixSavingMid: usd(CONTEXT.stable, PRICES.mid.input - PRICES.mid.cached), // ≈ 0.0023
  };
})();

/** The own head index: size, recrawl and fixed cost per day (ILLUSTRATIVE except the Common Crawl size anchor). */
export const INDEX = (() => {
  const pages = 2_000_000_000; // a size anchor (Common Crawl Aug 2026: 2.14B pages), selected by importance × demand
  const spansPerPage = CONTEXT.pageTokens / RETRIEVAL.spanTokens; // 10
  const spans = pages * spansPerPage; // 20B
  const tb = 1e12;
  const binaryTB = (spans * 128) / tb; // 2.56 TB in memory (IVF lists over binary codes)
  const metadataTB = (spans * 48) / tb; // doc id, offsets, date, host, list id: 0.96 TB
  const int8TB = (spans * 1_024) / tb; // 20.48 TB on SSD for rescoring
  const postingsTB = 4;
  const textTB = (pages * 8_000) / tb; // 16 TB parsed text
  const servingTB = binaryTB + metadataTB + int8TB + postingsTB + textTB; // ≈ 44
  const rawHtmlTB = (pages * 25_000) / tb; // ≈ 170 KB raw compressed ≈ 7× → 25 KB: 50 TB in object storage
  const rawHtmlPerDay = (rawHtmlTB * 1_000 * 0.02) / 30; // 0.02 USD per GB-month: ≈ 33 USD a day
  // Recrawl: per-URL schedule on predicted change rate × importance; these tiers are the starting buckets.
  const fastSources = 200_000;
  const pollMinutes = 5;
  const polls = (fastSources * 24 * 60) / pollMinutes; // 57.6M light polls a day
  const newPages = 5_000_000; // ≈ the same number evicted a day, so the index stays at 2B
  const warm = 300_000_000 / 7;
  const cold = 1_700_000_000 / 60;
  const fetchesPerDay = newPages + warm + cold; // ≈ 76.2M
  const unchangedShare = 0.6; // conditional GET returns 304 with headers only
  const changedShare = 1 - unchangedShare;
  const embedPages = changedShare * (warm + cold) + newPages; // ≈ 33.5M
  const embedTokens = embedPages * CONTEXT.pageTokens; // ≈ 67B
  // The embedder runs late chunking over whole 2,000-token pages (attention over the page, then span pooling), so it
  // is budgeted at 50,000 tokens a second, not the 200,000 of the short-input encoders: 16 GPUs (conservative).
  const embedGpus = Math.ceil(embedTokens / (50_000 * 86_400));
  const embedding = embedGpus * 24 * PRICES.gpuHour; // 960
  const injectionGpus = Math.ceil(embedTokens / (PRICES.smallEncoderTokensPerSecond * 86_400)); // classifier: 4
  const injection = injectionGpus * 24 * PRICES.gpuHour; // 240
  const serving = 100 * 3 * 3 * 24; // 100 shards × 3 replicas in 3 zones × 3 USD an hour = 21,600
  const standby = 100 * 1 * 3 * 24; // read-only snapshot in a second region, one replica set, rebuilt every 6 h: 7,200
  const crawl = 100 * 1 * 24; // 2,400
  const renderShare = 0.1; // pages that need a headless browser
  const render = 50 * 1 * 24; // 1,200
  const misc = 1_000; // spam, dedupe and authority jobs, proxies
  const parseReview = 100_000 * (usd(3_000, PRICES.mid.input) + usd(100, PRICES.mid.output)); // 700
  const licensedShare = 0.1; // fetches from hosts that charge (Pay Per Crawl, RSL terms)
  const pricePerCrawl = 0.001; // placeholder: publishers set their own prices
  const licensing = fetchesPerDay * licensedShare * pricePerCrawl; // ≈ 7,600
  const team = (30 * 400_000) / 365; // ≈ 32,877
  const fixedPerDay =
    embedding + injection + serving + standby + crawl + render + misc + parseReview + rawHtmlPerDay + licensing + team;
  return {
    pages,
    spansPerPage,
    spans,
    binaryTB,
    metadataTB,
    int8TB,
    postingsTB,
    textTB,
    servingTB,
    rawHtmlTB,
    rawHtmlPerDay,
    fastSources,
    pollMinutes,
    polls,
    pollsPerSecond: polls / 86_400, // ≈ 667
    newPages,
    warm,
    cold,
    fetchesPerDay,
    fetchesPerSecond: fetchesPerDay / 86_400, // ≈ 882
    requestsPerSecond: (polls + fetchesPerDay) / 86_400, // ≈ 1,549
    unchangedShare,
    embedPages,
    embedTokens,
    embedGpus,
    embedding,
    injectionGpus,
    injection,
    serving,
    standby,
    standbySnapshotHours: 6,
    crawl,
    renderShare,
    render,
    misc,
    parseReview,
    licensedShare,
    pricePerCrawl,
    licensing,
    team,
    fixedPerDay, // ≈ 75,829
    llmContextPerDay: usd(embedTokens, 1.02), // ≈ 68,300 (rejected)
    fullRecrawlMultiple: pages / fetchesPerDay, // ≈ 26
    at100B: { binaryTB: binaryTB * 50, int8PB: (int8TB * 50) / 1_000 }, // 128 TB and ≈ 1 PB before replicas
  };
})();

/** GPU fleet for the self-hosted encoders, sized for peak (sheet §5). */
export const GPU_FLEET = (() => {
  const peak = TRAFFIC.peakPerSecond;
  const quickS = peak * TRAFFIC.mix.quick;
  const hopS = peak * TRAFFIC.mix.multiHop;
  const resS = peak * RESEARCH.runShare;
  const ranks = quickS * 1 + hopS * 3 + resS * RESEARCH.avgSearches; // ranking passes a second
  const sentences = (quickS + hopS) * CONTEXT.sentences + resS * RESEARCH.avgSentences;
  const crossTok = ranks * RETRIEVAL.rerankTokens;
  const injectionRecheckTok = ranks * 12 * 225; // the 12 chosen spans rechecked at query time
  const verifyTok = sentences * 325;
  const harmTok = sentences * 100; // output harm screen on each held sentence
  const queryTok = peak * 100;
  const smallTok = crossTok + injectionRecheckTok + verifyTok + harmTok + queryTok;
  const sevenBTok = verifyTok * VERIFIER.bandTo7B;
  const smallGpus = Math.ceil((smallTok / PRICES.smallEncoderTokensPerSecond) * PRICES.gpuHeadroom);
  const sevenBGpus = Math.ceil((sevenBTok / PRICES.sevenBTokensPerSecond) * PRICES.gpuHeadroom);
  const perDay = (smallGpus + sevenBGpus) * 24 * PRICES.gpuHour;
  // A managed reranker instead of the cross-encoder share of the fleet.
  const managedPerDay =
    usd(30 * 60 + 60 * 200, PRICES.managedRerankPerMillion) *
    (TRAFFIC.quickPerDay + TRAFFIC.multiHopPerDay * 3 + RESEARCH.runsPerDay * RESEARCH.avgSearches);
  const crossGpusPerDay = Math.ceil((crossTok / PRICES.smallEncoderTokensPerSecond) * PRICES.gpuHeadroom) * 24 * PRICES.gpuHour;
  // The 7B checker on every sentence instead of the uncertain 20% band.
  const sevenBAllGpus = Math.ceil((verifyTok / PRICES.sevenBTokensPerSecond) * PRICES.gpuHeadroom); // ≈ 161
  const cascadeSavingPerDay = (sevenBAllGpus - sevenBGpus) * 24 * PRICES.gpuHour; // ≈ 7,700
  return { ranks, sentences, crossTok, verifyTok, smallTok, sevenBTok, smallGpus, sevenBGpus, perDay, managedPerDay, crossGpusPerDay, sevenBAllGpus, cascadeSavingPerDay };
})();

/** Answer platform, team and evaluation (the lines the v1 "all-in" left out; illustrative). */
export const PLATFORM = (() => {
  const team = (25 * 400_000) / 365; // answer, ranking, ML and eval engineers: ≈ 27,400
  const infra = 4_000; // gateway, orchestrators, Redis, ClickHouse (22 TB a year), PostgreSQL, object storage
  const shadow = 0.02 * TRAFFIC.quickPerDay * (1 - RETRIEVAL.apiRoutedShare) * 1 * PRICES.searchPerCall; // 600
  const evalRuns = 60; // nightly gold, adversarial and freshness runs
  const humanAudit = (200 * (10 / 60) * 50) / 7; // 200 answers a week × 10 min at 50 USD an hour ≈ 238
  const vendorCommit = 200; // second vendor minimum and the contracted burst
  // Per-answer licensing (RSL-style per-use terms), paid by any design that answers from licensed hosts. Placeholder:
  // 20% of generated answers cite a licensed host × 0.001 USD a cited answer.
  const generatedPerDay = TRAFFIC.quickPerDay + TRAFFIC.multiHopPerDay + RESEARCH.runsPerDay;
  const licensingPerAnswer = generatedPerDay * 0.2 * 0.001; // ≈ 1,728
  const perDay = team + infra + shadow + evalRuns + humanAudit + vendorCommit + licensingPerAnswer;
  return { team, infra, shadow, evalRuns, humanAudit, vendorCommit, generatedPerDay, licensingPerAnswer, perDay };
})();

/** Daily cost, the API-only comparison and the breakeven (sheet §5, §15.1). */
export const DAILY = (() => {
  const t = TRAFFIC;
  const quick = t.quickPerDay * QUICK_COST.total;
  const multiHop = t.multiHopPerDay * QUICK_COST.multiHop;
  const research = RESEARCH.runsPerDay * RESEARCH.avgCost;
  const cache = t.cachePerDay * PRICES.cacheHit;
  const variable = quick + multiHop + research + cache;
  const shared = GPU_FLEET.perDay + PLATFORM.perDay; // same in both designs
  const total = variable + shared + INDEX.fixedPerDay;
  // API only: 3 API calls and 3 live fetches per quick answer, 9 calls per multi-hop answer, every research search.
  const apiOnlyQuickNonApi = QUICK_COST.nonApi - QUICK_COST.fetches + 3 * PRICES.liveFetch;
  const apiOnlyHopNonApi = QUICK_COST.multiHopNonApi - QUICK_COST.fetches + 9 * PRICES.liveFetch;
  const researchNonApi = RESEARCH.avgCost - RESEARCH.avgApiCalls * PRICES.searchPerCall;
  const apiOnlyFixed =
    t.quickPerDay * apiOnlyQuickNonApi + t.multiHopPerDay * apiOnlyHopNonApi + RESEARCH.runsPerDay * researchNonApi + cache + shared;
  const ownFixed =
    t.quickPerDay * QUICK_COST.nonApi + t.multiHopPerDay * QUICK_COST.multiHopNonApi + RESEARCH.runsPerDay * researchNonApi + cache + shared + INDEX.fixedPerDay;
  const apiOnlyCalls = t.quickPerDay * 3 + t.multiHopPerDay * 9 + RESEARCH.runsPerDay * RESEARCH.avgSearches;
  const ownCalls = t.quickPerDay * RETRIEVAL.apiCalls + t.multiHopPerDay * QUICK_COST.multiHopApiCalls + RESEARCH.runsPerDay * RESEARCH.avgApiCalls;
  const apiOnlyAt = (perCall: number) => apiOnlyFixed + apiOnlyCalls * perCall;
  const ownAt = (perCall: number) => ownFixed + ownCalls * perCall;
  const breakevenPerCall = (ownFixed - apiOnlyFixed) / (apiOnlyCalls - ownCalls);
  // The comparator's calls per quick answer decide the result (R2-5): 3 matches the planner's 3 rewrites; 1 is what our
  // own API path sends. Multi-hop: 3 rounds × n calls. Fetches and everything else unchanged.
  const byCalls = (n: number) => {
    const calls = t.quickPerDay * n + t.multiHopPerDay * 3 * n + RESEARCH.runsPerDay * RESEARCH.avgSearches;
    return {
      calls,
      atList: apiOnlyFixed + calls * PRICES.searchPerCall,
      atFast: apiOnlyFixed + calls * PRICES.searchFastPerCall,
      breakevenPer1000: ((ownFixed - apiOnlyFixed) / (calls - ownCalls)) * 1_000,
    };
  };
  // Volume breakeven at a price: the index's fixed cost ÷ the saving per question (all lines scale with volume).
  const savingPerQuestion = (perCall: number) => (apiOnlyAt(perCall) - (ownAt(perCall) - INDEX.fixedPerDay)) / t.perDay;
  return {
    quick,
    multiHop,
    research,
    cache,
    variable,
    gpu: GPU_FLEET.perDay,
    platform: PLATFORM.perDay,
    index: INDEX.fixedPerDay,
    total,
    perQuestion: total / t.perDay,
    variablePlusIndexPerQuestion: (variable + INDEX.fixedPerDay) / t.perDay,
    shares: {
      quick: quick / total,
      multiHop: multiHop / total,
      research: research / total,
      gpu: GPU_FLEET.perDay / total,
      platform: PLATFORM.perDay / total,
      index: INDEX.fixedPerDay / total,
    },
    apiOnlyQuickAnswer: apiOnlyQuickNonApi + 3 * PRICES.searchPerCall,
    apiOnlyFixed,
    ownFixed,
    apiOnlyCalls,
    ownCalls,
    apiOnlyAt,
    ownAt,
    apiOnlyAtList: apiOnlyAt(PRICES.searchPerCall),
    ownAtList: ownAt(PRICES.searchPerCall),
    apiOnlyAtFast: apiOnlyAt(PRICES.searchFastPerCall),
    ownAtFast: ownAt(PRICES.searchFastPerCall),
    premiumAtFast: ownAt(PRICES.searchFastPerCall) - apiOnlyAt(PRICES.searchFastPerCall),
    savingAtList: apiOnlyAt(PRICES.searchPerCall) - ownAt(PRICES.searchPerCall),
    breakevenPer1000: breakevenPerCall * 1_000,
    breakevenVolumeAtList: INDEX.fixedPerDay / savingPerQuestion(PRICES.searchPerCall),
    breakevenVolumeAtFast: INDEX.fixedPerDay / savingPerQuestion(PRICES.searchFastPerCall),
    cacheSavingPerDay: t.cachePerDay * QUICK_COST.total,
    cacheAt10: 0.1 * t.perDay * QUICK_COST.total, // hit rate 10% of all questions
    cacheAt30: 0.3 * t.perDay * QUICK_COST.total,
    doubledQuick: QUICK_COST.doubledQuick,
    comparator: { one: byCalls(1), two: byCalls(2), three: byCalls(3) },
  };
})();

/**
 * Latency, p50 and p95, ms (sheet §12). Parallel stages use maxOfN; per-shard and fetch deadlines cap their tails.
 * p95 per path from stage spreads (p95 − p50, illustrative) by root-sum-square, then mixed with the ≈ 7% of answers
 * whose first sentence is dropped (restart: cached-prompt first token 300 + a sentence + verify).
 */
export const LATENCY = (() => {
  const decode = 80; // tokens a second, mid-size
  const sentenceMs = (CONTEXT.sentenceTokens / decode) * 1_000; // 312.5
  const fetchP50 = maxOfN(300, 500, 3, 0.5); // ≈ 400: the slowest of 3 fetches at p50
  const stage = (id: string, ms: number, spread: number) => ({ id, ms, spread });
  const head = [stage("edge", 30, 20), stage("planner", 250, 150)];
  const rank = [stage("cheap", 30, 10), stage("cross", 80, 40), stage("assemble", 10, 0)];
  const write = [stage("firstToken", 500, 400), stage("sentence", sentenceMs, 100), stage("verify", 60, 40)];
  // Own index: 3 queries × 100 shards each, per-shard deadline 60 ms with a hedge at 40 ms, + 20 ms merge.
  const own = [...head, stage("index", RETRIEVAL.shardDeadlineMs + 20, 10), ...rank, ...write];
  // API path: one API call on the critical path (single draw), then the slowest of 3 fetches under a 500 ms deadline.
  const api = [...head, stage("api", 513, 808 - 513), stage("fetch", fetchP50, 500 - fetchP50), stage("parse", 30, 20), ...rank, ...write];
  const p50 = (s: readonly { ms: number }[]) => sum(s.map((x) => x.ms));
  const spread = (s: readonly { spread: number }[]) => rss(s.map((x) => x.spread));
  const upper = (s: readonly { ms: number; spread: number }[]) => p50(s) + sum(s.map((x) => x.spread));
  const restartExtra = 300 + sentenceMs + 60; // ≈ 673
  const dropMix = (p: number, sp: number, d: number) =>
    mixtureP95([
      { weight: 1 - d, p50: p, spread: sp },
      { weight: d, p50: p + restartExtra, spread: sp },
    ]);
  const withDrop = (s: readonly { ms: number; spread: number }[], d: number = VERIFIER.firstSentenceDropped) =>
    dropMix(p50(s), spread(s), d);
  // Correlated tails (R2-2): stages that share our model provider and GPU fleet slow together at peak.
  const internal = new Set(["planner", "cross", "firstToken", "sentence", "verify"]);
  const partialSpread = (s: readonly { id: string; spread: number }[]) =>
    Math.sqrt(sum(s.filter((x) => internal.has(x.id)).map((x) => x.spread)) ** 2 + sum(s.filter((x) => !internal.has(x.id)).map((x) => x.spread ** 2)));
  const allSlow = (s: readonly { ms: number; spread: number }[]) => dropMix(p50(s), sum(s.map((x) => x.spread)), VERIFIER.firstSentenceDropped);
  const ownP50 = p50(own); // ≈ 1,352
  const apiP50 = p50(api); // ≈ 2,215
  const ownP95 = withDrop(own);
  const apiP95 = withDrop(api);
  const firstTokenOwn = p50(own.slice(0, 7));
  const firstTokenApi = p50(api.slice(0, 9));
  const sourcesOwn = p50(own.slice(0, 5));
  const sourcesApi = p50(api.slice(0, 7));
  // Short answer (120 tokens) complete: first token + decode + last verify; decode spread 300 replaces the sentence's.
  const shortTokens = 120;
  const shortDecode = (shortTokens / decode) * 1_000; // 1,500
  const shortSpread = (s: readonly { spread: number }[]) => Math.sqrt(spread(s) ** 2 - 100 ** 2 + 300 ** 2);
  const shortOwnBase = firstTokenOwn + shortDecode + 60;
  const shortApiBase = firstTokenApi + shortDecode + 60;
  // Restarts in a short answer (R2-3): ≈ 5 sentences; a dropped sentence is not replaced, so each restart adds the
  // restart's first token (300) + checks (60) = 360 ms; at most 2 restarts.
  const shortSentences = Math.round(shortTokens / CONTEXT.sentenceTokens); // 5
  const d = VERIFIER.dropRate;
  const r0 = binom(shortSentences, 0, d);
  const r1 = binom(shortSentences, 1, d);
  const restartMs = 300 + 60;
  const shortMix = (base: number, sp: number) => [
    { weight: r0, p50: base, spread: sp },
    { weight: r1, p50: base + restartMs, spread: sp },
    { weight: 1 - r0 - r1, p50: base + 2 * restartMs, spread: sp },
  ];
  const shortOwnParts = shortMix(shortOwnBase, shortSpread(own));
  const shortApiParts = shortMix(shortApiBase, shortSpread(api));
  // Hedging the API call (R2-2 lever). Second vendor: Perplexity Search API class (vendor-run p50 358, p95 763, F11).
  const first = { p50: 513, p95: 808 };
  const second = { p50: 358, p95: 763 };
  const hedgeAtP90 = 728; // Brave p90 in the same test
  const apiHedgedP95 = hedgedQuantile(first, second, hedgeAtP90, 0.95);
  const apiRaceP95 = hedgedQuantile(first, second, 0, 0.95); // both vendors from the start
  const apiRaceP50 = hedgedQuantile(first, second, 0, 0.5);
  // Multi-hop: planner, 2 rounds (index, rank, a 100-token model step), then the own-index answer stages.
  const roundMs = RETRIEVAL.shardDeadlineMs + 20 + 30 + 80 + 500 + (100 / decode) * 1_000; // 1,940
  const roundSpread = rss([10, 10, 40, 400, 100]);
  const hopOwnP50 = p50(head) + 2 * roundMs + p50([own[2], ...rank, ...write]);
  const hopSpread = Math.sqrt(spread(own) ** 2 + 2 * roundSpread ** 2);
  // 25% of multi-hop questions call the API in round 1, adding the API path's extra time (≈ 863 ms).
  const hopRoutedExtra = p50(api) - p50(own);
  const hopParts = [
    { weight: 1 - RETRIEVAL.apiRoutedShare, p50: hopOwnP50, spread: hopSpread },
    { weight: RETRIEVAL.apiRoutedShare, p50: hopOwnP50 + hopRoutedExtra, spread: hopSpread },
  ];
  const mix = [
    { weight: 1 - RETRIEVAL.apiRoutedShare, p50: ownP50, spread: ownP95 - ownP50 },
    { weight: RETRIEVAL.apiRoutedShare, p50: apiP50, spread: apiP95 - apiP50 },
  ];
  return {
    decode,
    sentenceMs,
    fetchP50,
    own,
    api,
    ownP50,
    ownP95,
    ownAllSlow: upper(own), // every stage at its p95 at once, no drops
    ownPartialP95: dropMix(ownP50, partialSpread(own), VERIFIER.firstSentenceDropped), // ≈ 2,204
    apiP50,
    apiP95,
    apiAllSlow: upper(api), // 3,390: every stage at its p95 at once, no drops (not a bound)
    apiAllSlowWithDrops: allSlow(api), // ≈ 3,481
    apiPartialP95: dropMix(apiP50, partialSpread(api), VERIFIER.firstSentenceDropped), // ≈ 3,124
    apiP95At: (dropRate: number) => withDrop(api, dropRate),
    apiHedgedP95, // the API stage's p95 with a hedge at Brave's p90
    apiRaceP50,
    apiRaceP95, // both vendors raced
    apiRaceSavingP95: 808 - apiRaceP95,
    apiPartialP95Raced: dropMix(apiP50 - (513 - apiRaceP50), Math.sqrt(partialSpread(api) ** 2 - 295 ** 2 + (apiRaceP95 - apiRaceP50) ** 2), VERIFIER.firstSentenceDropped),
    quickMixedP95: mixtureP95(mix),
    sourcesOwn,
    sourcesApi,
    firstTokenOwn,
    firstTokenApi,
    restartExtra,
    ownAdvantage: apiP50 - ownP50,
    contentApiSaving: fetchP50 + 30, // an API that returns page extracts skips fetch and parse
    shortSentences,
    shortRestartShares: { none: r0, one: r1, two: 1 - r0 - r1 },
    shortOwnBase,
    shortOwn: mixtureQuantile(shortOwnParts, 0.5),
    shortOwnP95: mixtureP95(shortOwnParts), // ≈ 3,315
    shortApiBase,
    shortApi: mixtureQuantile(shortApiParts, 0.5),
    shortApiP95: mixtureP95(shortApiParts), // ≈ 4,246
    roundMs,
    hopOwnP50,
    hopRoutedExtra,
    hopP50: mixtureQuantile(hopParts, 0.5),
    hopP95: mixtureP95(hopParts),
    fullAnswerOwn: firstTokenOwn + (CONTEXT.outputTokens / decode) * 1_000 + 60, // 4,790 before restarts
    fullAnswerOwnMean: firstTokenOwn + (CONTEXT.outputTokens / decode) * 1_000 + 60 + VERIFIER.expectedRestarts * restartMs, // ≈ 5,077
    cacheHit: { edge: 30, lookup: 10, send: 10, p50: 50 },
    plannerDeadlineMs: 400,
    fetchDeadlineMs: 500,
  };
})();

/** Targets per request type and path (N1–N7 and the §13 gates). */
export const TARGETS = {
  correctness: 0.88,
  abstention: 0.8,
  citationRecall: 0.95,
  citationPrecision: 0.9,
  sourcesOwnP50Ms: 600,
  sourcesApiP50Ms: 1_500,
  ownP50Ms: 1_500,
  ownP95Ms: 2_500,
  apiP50Ms: 2_400,
  apiP95Ms: 3_200,
  cacheHitP95Ms: 200,
  shortOwnP50Ms: 3_000,
  shortOwnP95Ms: 3_500,
  shortApiP50Ms: 3_600,
  shortApiP95Ms: 4_300,
  hopP50Ms: 6_000,
  hopP95Ms: 9_000,
  researchP50Ms: 120_000,
  researchP95Ms: 240_000,
  freshP50Min: 5,
  freshP95Min: 15,
  freshSetCorrect: 0.85,
  usdPerQuestion: 0.03,
  usdPerQuick: 0.01,
  injectionFollowRate: 0.003, // ≤ 0.3%: 0 of 1,000 adversarial cases (rule of three)
  // Publisher change → we stop answering from the host: ≤ 24 h worst (the flag refresh), ≤ 1 h for the top 10,000
  // news hosts (hourly refresh); storage purged ≤ 24 h after that (≤ 48 h from the change); cached answers ≤ 1 h after.
  stopAnsweringHours: 24,
  stopAnsweringTopHostsHours: 1,
  purgeFromChangeHours: 48,
  evictAfterFlagHours: 1,
  maxShareOneSource: 0.4,
} as const;

/** Statistics of the gates (sheet §13): 95% intervals. */
export const STATS = (() => {
  const ci = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);
  return {
    gold: ci(0.88, 1_000), // ± 2.0 points
    highStakes100: ci(0.88, 100), // ± 6.4 (v1)
    highStakes400: ci(0.88, 400), // ± 3.2
    fresh200: ci(0.85, 200), // ± 4.9 (v1)
    fresh400: ci(0.85, 400), // ± 3.5
    verifierFa200: ci(0.05, 200), // ± 3.0 (v1)
    verifierFa1000: ci(0.05, 1_000), // ± 1.4
    auditSentences: ci(0.95, 2_200), // 200 answers × 11 sentences: ± 0.9 (clustered by answer, so report it wider)
    ruleOfThree: 3 / 1_000, // 0 of 1,000 → ≤ 0.3%
  };
})();

/** Freshness path for a polled fast source, minutes (sheet §8 step 7). */
export const FRESHNESS = (() => {
  const pollMinutes = INDEX.pollMinutes;
  const processMinutes = 1; // fetch, parse, embed and write to the fresh segment, together (illustrative)
  const ttlMinutes = { news: 5, recent: 6 * 60, evergreen: 24 * 60 } as const;
  return {
    pollMinutes,
    processMinutes,
    p50Minutes: pollMinutes / 2 + processMinutes, // 3.5
    worstMinutes: pollMinutes + processMinutes, // 6
    ttlMinutes,
    newsAnswerMaxLagMinutes: pollMinutes + processMinutes + ttlMinutes.news, // 11
  };
})();

/** Peak capacity, vendor contracts and the degradation ladder (sheet §5, §20). */
export const CAPACITY = (() => {
  const peak = TRAFFIC.peakPerSecond;
  const quickS = peak * TRAFFIC.mix.quick; // ≈ 278
  const hopS = peak * TRAFFIC.mix.multiHop; // ≈ 17
  const resS = peak * RESEARCH.runShare; // ≈ 4.8 runs started a second
  const indexQps = quickS * 3 + hopS * 9 + resS * RESEARCH.avgSearches;
  const apiQps = quickS * RETRIEVAL.apiCalls + hopS * QUICK_COST.multiHopApiCalls + resS * RESEARCH.avgApiCalls;
  const contractedBurstQps = 400; // per primary vendor; normal peak use is well below
  const replicaSetQps = indexQps / 3; // each of 3 replica sets carries a third at peak
  // ANN I/O (R2-10): each shard node sees every query of its replica set; hedges add ≈ 7% shard requests (illustrative).
  const hedgeRate = 0.07;
  const nodeQps = replicaSetQps * (1 + hedgeRate); // ≈ 396
  const rescoreK = 100; // INT8 candidates read from SSD per shard per query
  const nodeIops = nodeQps * rescoreK; // ≈ 39,600 random 1 KB reads a second
  const quickIn = quickS * CONTEXT.total;
  const hopIn = hopS * 3 * CONTEXT.total;
  const resIn = resS * RESEARCH.avgTokens;
  const outTok = (quickS + hopS) * CONTEXT.outputTokens + hopS * 200 + resS * (RESEARCH.avgTokens / 100); // rough
  return {
    quickS,
    hopS,
    resS,
    indexQps,
    apiQps,
    vendorSelfServeQps: 50,
    contractedBurstQps,
    hedgeRate,
    nodeQps,
    rescoreK,
    nodeIops,
    ann: { lists: 65_536, nprobe: 64, recallAt100Target: 0.95 },
    hostFlagHosts: 50_000_000, // hosts with cached flags: frontier + API-result hosts, refreshed ≤ 24 h when active
    robotsFetchesPerDay: 10_000_000, // active hosts re-checked daily (≈ 116 a second)
    topHostsHourly: 10_000, // top news hosts refreshed hourly
    routedSkipTarget: 0.1, // ≤ 10% of routed live fetches skipped for want of fresh flags
    fullOutageApiNeed: quickS * 3 + hopS * 9 + resS * RESEARCH.avgSearches, // "API-only mode" at today's mix: ≈ 1,110 a second
    ladder: {
      zoneDown: { replicaSets: 2, qps: 2 * replicaSetQps, queriesPerQuick: 2 },
      regionDown: { standbyQps: replicaSetQps, queriesPerQuick: 1, need: quickS * 1 }, // multi-hop and research paused
      indexDown: { apiQpsNeed: quickS * 1, contracted: contractedBurstQps }, // 1 call per quick answer
    },
    inputTokensPerSecond: quickIn + hopIn + resIn, // ≈ 3.28M
    inputTokensPerMinute: (quickIn + hopIn + resIn) * 60,
    outputTokensPerSecond: outTok,
    quickStreams:
      quickS *
      ((1 - RETRIEVAL.apiRoutedShare) * LATENCY.firstTokenOwn + RETRIEVAL.apiRoutedShare * LATENCY.firstTokenApi + (CONTEXT.outputTokens / LATENCY.decode) * 1_000) /
      1_000,
    researchRuns: resS * (RESEARCH.avgMs / 1_000),
    tracesGBPerDay: (TRAFFIC.perDay * 6_000) / 1e9, // 60
    stampedeRuns: 50 * (LATENCY.fullAnswerOwn / 1_000), // a key at 50 requests a second until the answer completes ≈ 240
  };
})();

/**
 * Copyright limits across the whole answer (sheet §14; review R2-1). The check keeps state per cited origin (after
 * syndication grouping) over all held sentences, measured as the longest common token run between the shown text and
 * that origin's spans. A run that ends a sentence and continues into the next one is carried over. Limits (ILLUSTRATIVE):
 *   running verbatim run per origin ≤ 25 words, across sentence boundaries;
 *   total verbatim words per origin per answer ≤ 50 (runs of ≥ 8 words counted), and ≤ the host's max_snippet;
 *   ≤ 2 consecutive "copied" sentences from one origin (a run covering ≥ 60% of the sentence's words);
 *   research reports: ≤ 100 verbatim words per origin.
 * On a failure the orchestrator restarts with "paraphrase source n; at most m more quoted words" (not a drop).
 */
export const COPYRIGHT = (() => {
  const wordsPerToken = 0.75;
  const sentenceWords = Math.round(CONTEXT.sentenceTokens * wordsPerToken); // 19
  const runCapWords = 25;
  const totalCapWords = 50;
  const minCountedRun = 8;
  const consecutiveCopiedCap = 2;
  const copiedShare = 0.6;
  const researchTotalCapWords = 100;
  const charsPerWord = 6; // for max_snippet, which is in characters
  // The sentence index at which a growing count first passes a cap.
  const failsAt = (perSentence: number, cap: number) => Math.floor(cap / perSentence) + 1;
  // Test 1: four consecutive sentences copied word for word from one article (4 × 19 = 76 words).
  const test1 = {
    copiedWords: 4 * sentenceWords,
    perSentenceCheckPasses: sentenceWords <= runCapWords, // the v2 per-sentence check passed all four
    failsAtSentence: failsAt(sentenceWords, runCapWords), // 2: the running run reaches 38 > 25
  };
  // Test 2: four non-adjacent sentences, each sharing an 18-word run with the same origin.
  const test2 = { runWords: 18, failsAtSentence: failsAt(18, totalCapWords) }; // totals 18, 36, 54 → fails at the 3rd
  // Test 3 (allowed): a 9-word and a 15-word quote from one origin, separated by paraphrase: total 24, longest run 15.
  const test3 = { totalWords: 9 + 15, passes: 9 + 15 <= totalCapWords && 15 <= runCapWords };
  // A host with max-snippet:120 allows 120 ÷ 6 = 20 quoted words in the whole answer.
  const maxSnippetExample = { chars: 120, words: 120 / charsPerWord };
  return {
    wordsPerToken,
    sentenceWords,
    runCapWords,
    totalCapWords,
    minCountedRun,
    consecutiveCopiedCap,
    copiedShare,
    researchTotalCapWords,
    charsPerWord,
    test1,
    test2,
    test3,
    maxSnippetExample,
    checkCostMs: 1, // a suffix automaton over 12 spans × 200 tokens
  };
})();

/** Sensitivity (R2-4): the model's unsupported-sentence rate and the research-offer acceptance rate. */
export const SENSITIVITY = (() => {
  const q = QUICK_COST;
  const scenario = (u: number, acceptance: number) => {
    const v = VERIFIER.at(u, acceptance);
    const answer =
      q.smallShare * (q.small + v.restarts * q.restartSmall) + (1 - q.smallShare) * (q.mid + v.restarts * q.restartMid);
    const quick = q.planner + q.fetches + answer + q.grader + q.api;
    const hop = q.multiHop + (v.restarts - VERIFIER.expectedRestarts) * q.restartMid;
    const runs = TRAFFIC.perDay * (TRAFFIC.mix.researchDirect + v.followOn);
    const research = runs * RESEARCH.avgCost;
    // GPUs, platform and index held fixed (the fleet grows a little with research; ignored here).
    const total = TRAFFIC.quickPerDay * quick + TRAFFIC.multiHopPerDay * hop + research + DAILY.cache + DAILY.gpu + DAILY.platform + DAILY.index;
    return { ...v, quick, runs, research, total, perQuestion: total / TRAFFIC.perDay, apiP95: LATENCY.apiP95At(v.drop) };
  };
  return {
    base: scenario(VERIFIER.unsupported, VERIFIER.offerAcceptance),
    unsupported10: scenario(0.1, VERIFIER.offerAcceptance), // ≈ 282,000 USD a day, API p95 ≈ 3,003
    acceptance20: scenario(VERIFIER.unsupported, 0.2),
    both: scenario(0.1, 0.2),
  };
})();
