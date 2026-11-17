// Constants and arithmetic for the "Design an Enterprise AI Assistant" case study (/genai-system-design/case-studies/
// conversational-assistant-design; design sheet SYSTEM-DESIGN/plans/genai-design/design/conversational-assistant-design.md,
// dossier research/conversational-assistant-design.md). Specs in assets/diagrams/animated/enterprise-assistant/ import
// from here, so the page, the figures and the tests share one set of numbers.
//
// Running example: Brightpost (presets/agents.ts, rag.ts, gcase-support.ts), here as an EMPLOYER: an assistant for its
// own staff (support, warehouse, finance and the rest), over about 10 million documents across nine connectors. It is
// SINGLE-TENANT: one company, one deployment (the sheet says what changes if it were sold to many companies).
//
// Every headcount, volume, mix, rate, lag and unit cost below is ILLUSTRATIVE unless a comment names a source.
// Model prices are list prices as of November 2026 (Claude pricing docs, read 17 November 2026, dossier F63): mid-size
// (Claude Sonnet 5.5 class) 2.00 input / 0.10 cache read / 2.50 5-minute cache write / 4.00 1-hour cache write / 10.00
// output USD per million tokens; small (Claude Haiku 5.5 class, prompts ≤ 100K) 0.10 / 0.01 / 0.125 / 0.20 / 0.50.
// Minimum cacheable prefix 512 tokens on both (dossier F62). Seat prices: Microsoft 365 Copilot 30 USD a user a month
// (Microsoft, dossier F12); Gemini Enterprise 30 and Gemini Business 21 (press, dossier F97).
// Parallel stages are budgeted as the slowest of n draws; p95 per path is a root-sum-square of stage spreads
// (p95 − p50), which assumes stage tails are independent; the stage-sum upper bound is given where it matters.

import { BRIGHTPOST } from "./agents";
import { FUNNEL } from "./gcase-support";
import { CORPUS } from "./rag";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error < 1.5e-7) and its inverse by bisection. */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
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

/** Quantile q of the slowest of n independent normal draws with this p50 and p95: one draw's quantile q^(1/n). */
function maxOfN(p50: number, p95: number, n: number, q: number) {
  return p50 + phiInv(q ** (1 / n)) * ((p95 - p50) / Z95);
}

/** 95% normal-approximation margin, in points, for a rate p measured on n cases. */
const margin95 = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n) * 100;

// ── Prices ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** USD per million tokens, as of November 2026 (dossier F63); infrastructure unit costs are illustrative. */
export const PRICES = {
  mid: { input: 2.0, cached: 0.1, cacheWrite5m: 2.5, cacheWrite1h: 4.0, output: 10.0 },
  small: { input: 0.1, cached: 0.01, cacheWrite5m: 0.125, cacheWrite1h: 0.2, output: 0.5 },
  minCacheablePrefix: 512,
  gpuHour: 2.5, // illustrative
  searchNodeHour: 1.2, // 64 GB memory node, illustrative
  engineerYear: 400_000, // fully loaded, illustrative (same figure as the answer-engine page)
  seatPrice: 30, // Microsoft 365 Copilot list, and Gemini Enterprise (press); USD a user a month
  seatPriceBusiness: 21, // Gemini Business (press); Microsoft 365 Copilot Business list
} as const;

// ── The company and its use ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Brightpost as an employer (illustrative). 5,000 staff; everyone gets a seat.
 *   400 support + 3,000 warehouse + 150 finance + 550 engineering and product + 900 other = 5,000.
 *   Daily active 60% → 3,000; 6 turns each (Glean reports "five queries per day" per employee, vendor, dossier F11)
 *   → 18,000 turns a day, averaged over all seven days (the warehouses work weekends).
 *   70% of turns fall in 10 office hours: 12,600 ÷ 36,000 s = 0.35 a second; peak 3× ≈ 1.05 turns a second.
 *   A conversation averages 3 turns → 6,000 conversations a day. Per seat a month: 18,000 × 30 ÷ 5,000 = 108 turns.
 */
export const COMPANY = (() => {
  const departments = [
    { id: "support", label: "Support", staff: 400 },
    { id: "warehouse", label: "Warehouse", staff: 3_000 },
    { id: "finance", label: "Finance", staff: 150 },
    { id: "engineering", label: "Engineering and product", staff: 550 },
    { id: "other", label: "Other (HR, marketing, buying, ops)", staff: 900 },
  ] as const;
  const staff = sum(departments.map((d) => d.staff)); // 5,000
  const seats = staff;
  const dailyActiveShare = 0.6;
  const dailyActive = seats * dailyActiveShare; // 3,000
  const turnsPerActiveUser = 6;
  const turnsPerDay = dailyActive * turnsPerActiveUser; // 18,000
  const officeShare = 0.7;
  const officeHours = 10;
  const officePerSecond = (turnsPerDay * officeShare) / (officeHours * 3_600); // 0.35
  const peakFactor = 3;
  const peakPerSecond = officePerSecond * peakFactor; // 1.05
  const turnsPerConversation = 3;
  const daysPerMonth = 30;
  return {
    name: BRIGHTPOST.shop,
    departments,
    staff,
    seats,
    dailyActiveShare,
    dailyActive,
    turnsPerActiveUser,
    turnsPerDay,
    officeShare,
    officePerSecond,
    peakFactor,
    peakPerSecond,
    turnsPerConversation,
    conversationsPerDay: turnsPerDay / turnsPerConversation, // 6,000
    daysPerMonth,
    turnsPerMonth: turnsPerDay * daysPerMonth, // 540,000
    turnsPerSeatMonth: (turnsPerDay * daysPerMonth) / seats, // 108
  };
})();

// ── Corpus and index ─────────────────────────────────────────────────────────────────────────────────────────────

/** Chunks per document with Brightpost's chunker (rag.ts CORPUS: 400-token chunks, 50 overlap, stride 350), ≥ 1. */
const chunksFor = (tokens: number) =>
  Math.max(1, Math.ceil((tokens - CORPUS.overlapTokens) / CORPUS.stride));

/**
 * Indexed sources (illustrative counts). Email and Slack direct messages are NOT indexed: they are searched live as the
 * user (federated, late-bound). Business records (WMS stock, ERP purchase orders, HR leave) are not documents: they are
 * read live through tools.
 *   Helpdesk: the support page's 16,000 hand-offs a day (gcase-support FUNNEL) × 120 days kept in the index = 1.92M.
 *   SharePoint 2.4M × 9 + Confluence 0.3M × 5 + Jira 0.9M × 2 + Slack 4.0M × 1 + helpdesk 1.92M × 3 + GitHub 0.48M × 3
 *   = 21.6 + 1.5 + 1.8 + 4.0 + 5.76 + 1.44 = 36.1M chunks; 10.0M documents; 11.4B tokens of text.
 */
export const SOURCES = (() => {
  const helpdeskDays = 120;
  const list = [
    { id: "sharepoint", label: "SharePoint and OneDrive files", docs: 2_400_000, tokens: 3_000, sensitive: false },
    { id: "confluence", label: "Confluence pages", docs: 300_000, tokens: 1_500, sensitive: false },
    { id: "jira", label: "Jira issues", docs: 900_000, tokens: 600, sensitive: false },
    { id: "slack", label: "Slack threads (channels, not DMs)", docs: 4_000_000, tokens: 300, sensitive: false },
    {
      id: "helpdesk",
      label: "Helpdesk cases (last 120 days)",
      docs: FUNNEL.handedOff * helpdeskDays,
      tokens: 800,
      sensitive: true,
    },
    { id: "github", label: "GitHub READMEs, docs, issues", docs: 480_000, tokens: 1_000, sensitive: false },
  ].map((s) => ({ ...s, chunksPerDoc: chunksFor(s.tokens), chunks: s.docs * chunksFor(s.tokens) }));
  const docs = sum(list.map((s) => s.docs)); // 10,000,000
  const chunks = sum(list.map((s) => s.chunks)); // 36,100,000
  const textTokens = sum(list.map((s) => s.docs * s.tokens)); // 11.406B
  return {
    list,
    helpdeskDays,
    docs,
    chunks,
    textTokens,
    avgChunksPerDoc: chunks / docs, // 3.61
    sharepointChunksPerDoc: chunksFor(3_000), // 9
    federated: ["Outlook mail and calendar", "Slack direct messages"],
    liveRecords: ["Warehouse management (WMS)", "ERP (purchase orders, invoices)", "HR (leave, policies)"],
  };
})();

/**
 * Index sizing. 1,024-dim embeddings stored INT8 (1,024 B) in memory, rescored from float on SSD; HNSW M = 16 →
 * 2 × 16 × 4 B = 128 B of links per vector; metadata (ACL principals, acl_version, source, label, dates) ≈ 200 B.
 *   Vectors 36.1M × 1,024 B = 36.97 GB (float32 would be 147.9 GB); links 4.62 GB; metadata 7.22 GB;
 *   BM25 postings ≈ 30% of 11.4B tokens × 4 B = 13.69 GB → ≈ 62.5 GB in memory per replica.
 *   4 shards (≈ 15.6 GB each) × 2 replicas in two zones = 8 nodes of 64 GB.
 *   Exact scan when a filter leaves ≤ 50,000 chunks: 50,000 × 1,024 B = 51 MB, ≈ 5 ms at 10 GB/s (illustrative).
 */
export const INDEX = (() => {
  const dims = 1_024;
  const vectorBytes = dims; // INT8
  const linkBytes = 2 * 16 * 4; // 128
  const metadataBytes = 200;
  const vectorsGB = (SOURCES.chunks * vectorBytes) / 1e9; // 36.97
  const float32GB = (SOURCES.chunks * dims * 4) / 1e9; // 147.9
  const linksGB = (SOURCES.chunks * linkBytes) / 1e9; // 4.62
  const metadataGB = (SOURCES.chunks * metadataBytes) / 1e9; // 7.22
  const postingsGB = (SOURCES.textTokens * 4 * 0.3) / 1e9; // 13.69
  const memoryGB = vectorsGB + linksGB + metadataGB + postingsGB; // 62.5
  const shards = 4;
  const replicas = 2;
  const exactScanBelowChunks = 50_000;
  return {
    dims,
    vectorBytes,
    linkBytes,
    metadataBytes,
    vectorsGB,
    float32GB,
    linksGB,
    metadataGB,
    postingsGB,
    memoryGB,
    shards,
    replicas,
    nodes: shards * replicas, // 8
    perShardGB: memoryGB / shards, // 15.6
    exactScanBelowChunks,
    exactScanMB: (exactScanBelowChunks * vectorBytes) / 1e6, // 51.2
    exactScanMs: 5,
  };
})();

// ── Identity and permissions ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Principals and permission changes (illustrative). Chunks carry principal ids (Entra users and groups, Slack channel
 * ids, Confluence and Jira groups), never expanded user lists; a user's principal set is resolved per request.
 *   Average user: 120 principals (p99 1,500, managers and admins).
 *   Document ACL changes: 20,000 a day × 3.61 chunks = 72,200 chunk patches; container (folder, site, space) changes:
 *   300 a day × 2,000 documents × 3.61 = 2,166,000 → 2.24M metadata-only patches a day ≈ 26 a second; no re-embedding.
 *   Largest container: one SharePoint site of 50,000 files × 9 chunks = 450,000 patches at 5,000 a second = 90 s.
 *   Membership changes: 2,000 a day → 2,000 principal-store rows. Flattened to users instead, one joiner to a group that
 *   reads 200,000 documents would rewrite 200,000 × 3.61 = 722,000 chunks.
 */
export const PRINCIPALS = (() => {
  const perUserAvg = 120;
  const perUserP99 = 1_500;
  const docAclChangesPerDay = 20_000;
  const containerChangesPerDay = 300;
  const docsPerContainer = 2_000;
  const docPatches = docAclChangesPerDay * SOURCES.avgChunksPerDoc; // 72,200
  const containerPatches = containerChangesPerDay * docsPerContainer * SOURCES.avgChunksPerDoc; // 2,166,000
  const patchesPerDay = docPatches + containerPatches; // 2,238,200
  const patchRatePerSecond = 5_000;
  const largestSiteFiles = 50_000;
  const largestSitePatches = largestSiteFiles * SOURCES.sharepointChunksPerDoc; // 450,000
  const groupDocs = 200_000;
  return {
    perUserAvg,
    perUserP99,
    docAclChangesPerDay,
    containerChangesPerDay,
    docsPerContainer,
    docPatches,
    containerPatches,
    patchesPerDay,
    patchesPerSecondAvg: patchesPerDay / 86_400, // 25.9
    patchRatePerSecond,
    largestSiteFiles,
    largestSitePatches,
    largestSiteSeconds: largestSitePatches / patchRatePerSecond, // 90
    membershipChangesPerDay: 2_000,
    flattenedRewriteChunks: groupDocs * SOURCES.avgChunksPerDoc, // 722,000
  };
})();

/**
 * Permission propagation (the centre of the design). Seconds.
 *   Event path, p50: source notification 30 (illustrative, inside Microsoft Graph's "less than 1 minute" average for
 *   driveItem, dossier F38; its stated maximum is 6 hours) + queue 1 + fetch the effective permissions 2 + map to
 *   principals 0.1 + patch index and ACL store 1 + index refresh 1 = 35.1 s.
 *   The document is marked DIRTY 1 s after the event arrives; dirty documents are checked live at answer time, so the
 *   window after the event lands is ≈ 1 s, and the rest of the lag is the source's own notification delay.
 *   Bound for a single item: a permissions-only delta poll every 10 minutes per site or drive (3,000 → 5 calls a
 *   second) + processing 5.1 s → 605 s ≈ 10 min. Container change: + subtree job ≤ 90 s → ≤ 11.6 min.
 *   Membership: Entra group changes polled by delta every 5 min (Graph lists user and group notification latency as
 *   "Unknown", dossier F38) → ≤ 5 min; Slack member_left_channel events (best effort, retried to 5 min, dossier F41) +
 *   a 10-minute reconcile. Offboarding: the account is disabled in the IdP; the gateway refuses the next turn.
 *   Live-checked (late-bound) at answer time: helpdesk cases, documents labelled Confidential or above, dirty
 *   documents; email and Slack DMs are federated and never copied, so their lag is the source's.
 */
export const PROPAGATION = (() => {
  const event = [
    { id: "notify", label: "Source notifies", s: 30 },
    { id: "queue", label: "Queue", s: 1 },
    { id: "fetch", label: "Fetch permissions", s: 2 },
    { id: "map", label: "Map to principals", s: 0.1 },
    { id: "patch", label: "Patch index and ACL store", s: 1 },
    { id: "refresh", label: "Index refresh", s: 1 },
  ] as const;
  const eventP50 = sum(event.map((e) => e.s)); // 35.1
  const processing = eventP50 - event[0].s; // 5.1
  const pollMinutes = 10;
  const pollSites = 3_000;
  const singleItemBoundS = pollMinutes * 60 + processing; // 605.1
  const containerBoundS = singleItemBoundS + PRINCIPALS.largestSiteSeconds; // 695.1
  return {
    event,
    eventP50,
    processing,
    dirtyAfterS: 1,
    pollMinutes,
    pollSites,
    pollCallsPerSecond: pollSites / (pollMinutes * 60), // 5
    singleItemBoundS,
    singleItemBoundMin: singleItemBoundS / 60, // 10.1
    containerBoundMin: containerBoundS / 60, // 11.6
    membershipPollMinutes: 5,
    slackReconcileMinutes: 10,
    targetP50S: 60,
    targetMaxMin: 15,
    graphNotifyMaxHours: 6, // Microsoft's stated maximum for driveItem notifications (dossier F38)
  };
})();

// ── Retrieval ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Hybrid retrieval with the permission filter inside both searches, then a personal ranker and a cross-encoder.
 *   100 BM25 + 100 ANN = 200 → 160 unique → personal ranker (gradient-boosted: RRF rank, BM25, vector score, recency,
 *   30-day views, author in the asker's team or frequent collaborators, department affinity, source prior) → 50 →
 *   cross-encoder → 8 chunks (≤ 3 per document).
 *   Cross-encoder input 50 × (400 + 30) = 21,500 tokens at 200,000 tokens a second a GPU = 107.5 ms → a 120 ms stage.
 */
export const RETRIEVAL = (() => {
  const funnel = [
    { id: "retrieved", label: "Retrieved (BM25 + ANN, filtered)", chunks: 200 },
    { id: "unique", label: "Unique", chunks: 160 },
    { id: "personal", label: "Personal ranker", chunks: 50 },
    { id: "cross", label: "Cross-encoder", chunks: 8 },
  ] as const;
  const rerankTokens = 50 * (CORPUS.chunkTokens + 30); // 21,500
  const encoderTokensPerSecond = 200_000;
  return {
    funnel,
    rerankTokens,
    encoderTokensPerSecond,
    rerankComputeMs: (rerankTokens / encoderTokensPerSecond) * 1_000, // 107.5
    chunksInPrompt: 8,
    maxPerDocument: 3,
    chunkTokens: CORPUS.chunkTokens,
    headerTokens: 40,
    federatedShareOfAnswers: 0.08, // the router predicts a mailbox or DM question
    sensitiveShareOfAnswers: 0.3, // ≥ 1 chunk from a live-checked source in the top 8
    sensitiveDocsWhenPresent: 3,
  };
})();

// ── Tools and context ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Tool catalogue: 106 tools over nine systems, ≈ 600 tokens a definition (illustrative; Anthropic's example is 58 tools
 * ≈ 55K tokens, ≈ 950 a tool, dossier F50).
 *   All loaded: 106 × 600 = 63,600 + core 2,000 + instructions 1,200 = 66,800-token prefix.
 *   Bundle (the router picks one connector's tools): average 106 ÷ 9 = 11.8 tools × 600 = 7,067 → prefix 10,267.
 *   Tool search (agent path): instructions 1,200 + core 2,000 + the search tool 500 = 3,700; each search loads 3 tools
 *   × 600 = 1,800 tokens inline; 2 searches a task → 7,300 tokens of tool context vs 66,800 (89% fewer).
 *   Anthropic's example: ≈ 77K → ≈ 8.7K before any work (≈ 89%; stated "85%"), ONE example setup (dossier F51).
 *   Loading everything is cheap in dollars once cached (66,800 × 0.10 per million = 0.0067 USD a call) but degrades tool
 *   choice past 30–50 tools (vendor guidance, dossier F52), and per-user tool lists would change the cached prefix
 *   (tools come first in the cache order, dossier F61).
 */
export const TOOLS = (() => {
  const connectors = [
    { id: "jira", label: "Jira", tools: 14 },
    { id: "confluence", label: "Confluence", tools: 8 },
    { id: "files", label: "SharePoint and OneDrive", tools: 10 },
    { id: "slack", label: "Slack", tools: 10 },
    { id: "mail", label: "Mail and calendar", tools: 12 },
    { id: "helpdesk", label: "Helpdesk", tools: 14 },
    { id: "wms", label: "Warehouse (WMS)", tools: 12 },
    { id: "erp", label: "ERP", tools: 16 },
    { id: "hr", label: "HR", tools: 10 },
  ] as const;
  const count = sum(connectors.map((c) => c.tools)); // 106
  const tokensPerTool = 600;
  const instructions = 1_200;
  const core = 2_000; // search_knowledge, fetch_document, remember / forget, my_profile (4 × 500)
  const searchTool = 500;
  const loadedPerSearch = 3 * tokensPerTool; // 1,800
  const allLoaded = instructions + core + count * tokensPerTool; // 66,800
  const bundleTools = count / connectors.length; // 11.78
  const bundlePrefix = instructions + core + Math.round(bundleTools * tokensPerTool); // 10,267
  const searchPrefix = instructions + core + searchTool; // 3,700
  const searchTask = searchPrefix + 2 * loadedPerSearch; // 7,300
  return {
    connectors,
    count,
    tokensPerTool,
    instructions,
    core,
    searchTool,
    loadedPerSearch,
    allLoaded,
    bundleTools,
    bundlePrefix,
    searchPrefix,
    searchTask,
    searchSaving: 1 - searchTask / allLoaded, // 0.891
    bundleSaving: 1 - bundlePrefix / allLoaded, // 0.846
    allLoadedCachedUsd: usd(allLoaded, PRICES.mid.cached), // 0.00668
    accuracyDegradesAbove: "30–50 tools",
    anthropicExample: { tools: 58, defsTokens: 55_000, before: 77_000, after: 8_700, stated: 0.85 },
    codeExecutionExample: { before: 150_000, after: 2_000, stated: 0.987 }, // one example, scenario not named (dossier F55)
  };
})();

/**
 * The answer call's context (knowledge turn). 3,200 stable tokens (instructions + core tools) are cached; the rest
 * changes every turn. 1,200 + 2,000 + 200 + 600 + 70 + 8 × 40 + 8 × 400 = 7,590 tokens; output 250.
 */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions and citation rules", tokens: TOOLS.instructions, stable: true },
    { id: "core-tools", label: "Core tool definitions", tokens: TOOLS.core, stable: true },
    { id: "memory", label: "Memory (≤ 5 items)", tokens: 200, stable: false },
    { id: "conversation", label: "Summary + last 2 turns", tokens: 600, stable: false },
    { id: "question", label: "Question and router notes", tokens: 70, stable: false },
    {
      id: "headers",
      label: "8 source headers",
      tokens: RETRIEVAL.chunksInPrompt * RETRIEVAL.headerTokens,
      stable: false,
    },
    {
      id: "chunks",
      label: "8 permitted chunks",
      tokens: RETRIEVAL.chunksInPrompt * RETRIEVAL.chunkTokens,
      stable: false,
    },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 7,590
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 3,200
  const turnState = 200 + 600 + 70; // memory + conversation + question = 870, shared by every model path
  return {
    blocks,
    total,
    stable,
    changing: total - stable, // 4,390
    turnState,
    evidence: RETRIEVAL.chunksInPrompt * (RETRIEVAL.chunkTokens + RETRIEVAL.headerTokens), // 3,520
    answerOut: 250,
    toolCallOut: 60,
    writeArgsOut: 120,
    lookupReplyOut: 200,
    toolResult: 800,
  };
})();

// ── Cost per turn ────────────────────────────────────────────────────────────────────────────────────────────────

/** The agent task: six model calls, two tool searches, three tool calls (illustrative). */
export const AGENT = (() => {
  // Output of each call, and what comes back before the next call (a tool search loads 1,800 tokens of definitions).
  const steps = [
    { kind: "search", out: 40, result: TOOLS.loadedPerSearch },
    { kind: "tool", out: 60, result: CONTEXT.toolResult },
    { kind: "tool", out: 60, result: CONTEXT.toolResult },
    { kind: "search", out: 40, result: TOOLS.loadedPerSearch },
    { kind: "tool", out: 60, result: CONTEXT.toolResult },
    { kind: "answer", out: 300, result: 0 },
  ] as const;
  // Call i reads everything before it from the cache, writes its new tokens to the cache, and pays its output.
  let context = TOOLS.searchPrefix; // 3,700 cached
  let fresh: number = CONTEXT.turnState; // 870 new tokens on the first call
  const calls = steps.map((s) => {
    const cost =
      usd(context, PRICES.mid.cached) + usd(fresh, PRICES.mid.cacheWrite5m) + usd(s.out, PRICES.mid.output);
    const row = { kind: s.kind, cachedIn: context, newIn: fresh, out: s.out, cost };
    context += fresh + s.out;
    fresh = s.result;
    return row;
  });
  const cost = sum(calls.map((c) => c.cost)); // ≈ 0.0268
  return {
    steps,
    calls,
    cost,
    finalContext: context, // 11,130
    toolSearches: steps.filter((s) => s.kind === "search").length, // 2
    toolCalls: steps.filter((s) => s.kind === "tool").length, // 3
    caps: { calls: 10, contextTokens: 60_000, usd: 0.15, seconds: 60 },
  };
})();

/**
 * Cost of each turn type, USD.
 *   Router (small): 800 cached + 300 in + 40 out = 0.000008 + 0.00003 + 0.00002 = 0.000058.
 *   Answer (mid): 3,200 × 0.10 + 4,390 × 2.00 + 250 × 10.00, per million = 0.00032 + 0.00878 + 0.0025 = 0.0116.
 *   Grounding check (small, after the answer): (300 + 3,520 + 250) × 0.10 + 40 × 0.50 = 0.000407 + 0.00002 = 0.000427.
 *   Lookup: call 1 = 10,267 × 0.10 + 870 × 2.50 (written: call 2 reads it) + 60 × 10 = 0.00380;
 *           call 2 = 11,197 × 0.10 + 800 × 2.00 + 200 × 10 = 0.00472 → 0.00852.
 *   Write, to the confirmation card: 10,267 × 0.10 + 870 × 2.00 + 120 × 10 = 0.00397; executing is code, the reply a
 *   template.
 *   Agent: 0.0268 (AGENT) + grounding check.
 *   Other (small model: chit-chat, help, "forget that"): 1,500 × 0.10 + 150 × 0.50 = 0.000225.
 *   Memory extraction (small, once a conversation): 2,000 × 0.10 + 60 × 0.50 = 0.00023 ÷ 3 turns = 0.0000767 a turn.
 *   Mix: answer 65%, lookup 15%, write 8%, agent 5%, other 7%.
 *   Blended = 0.000058 + 0.0000767 + 0.65 × 0.012027 + 0.15 × 0.00852 + 0.08 × 0.00397 + 0.05 × 0.027233 + 0.07 ×
 *   0.000225 ≈ 0.0109 USD a turn.
 */
export const COST = (() => {
  const router = usd(800, PRICES.small.cached) + usd(300, PRICES.small.input) + usd(40, PRICES.small.output);
  const answer =
    usd(CONTEXT.stable, PRICES.mid.cached) +
    usd(CONTEXT.changing, PRICES.mid.input) +
    usd(CONTEXT.answerOut, PRICES.mid.output);
  const groundingCheck =
    usd(300 + CONTEXT.evidence + CONTEXT.answerOut, PRICES.small.input) + usd(40, PRICES.small.output);
  const lookupCall1 =
    usd(TOOLS.bundlePrefix, PRICES.mid.cached) +
    usd(CONTEXT.turnState, PRICES.mid.cacheWrite5m) +
    usd(CONTEXT.toolCallOut, PRICES.mid.output);
  const lookupCall2 =
    usd(TOOLS.bundlePrefix + CONTEXT.turnState + CONTEXT.toolCallOut, PRICES.mid.cached) +
    usd(CONTEXT.toolResult, PRICES.mid.input) +
    usd(CONTEXT.lookupReplyOut, PRICES.mid.output);
  const lookup = lookupCall1 + lookupCall2;
  const write =
    usd(TOOLS.bundlePrefix, PRICES.mid.cached) +
    usd(CONTEXT.turnState, PRICES.mid.input) +
    usd(CONTEXT.writeArgsOut, PRICES.mid.output);
  const agent = AGENT.cost;
  const other = usd(1_500, PRICES.small.input) + usd(150, PRICES.small.output);
  const memoryPerConversation = usd(2_000, PRICES.small.input) + usd(60, PRICES.small.output);
  const memoryPerTurn = memoryPerConversation / COMPANY.turnsPerConversation;
  const mix = { answer: 0.65, lookup: 0.15, write: 0.08, agent: 0.05, other: 0.07 } as const;
  const byType = {
    answer: answer + groundingCheck,
    lookup,
    write,
    agent: agent + groundingCheck,
    other,
  };
  const blended =
    router +
    memoryPerTurn +
    mix.answer * byType.answer +
    mix.lookup * byType.lookup +
    mix.write * byType.write +
    mix.agent * byType.agent +
    mix.other * byType.other; // ≈ 0.0109
  // Prefix cache writes, upper bound: 9 bundle prefixes + the answer and agent prefixes, each rewritten once an hour
  // on the 1-hour TTL: 24 × (9 × 10,267 + 3,200 + 3,700) × 4.00 per million ≈ 9.5 USD a day.
  const prefixWritesPerDay =
    24 * usd(9 * TOOLS.bundlePrefix + CONTEXT.stable + TOOLS.searchPrefix, PRICES.mid.cacheWrite1h);
  const perDay = COMPANY.turnsPerDay * blended + prefixWritesPerDay; // ≈ 206
  // Without bundles, loading all 106 tools on lookup and write turns: + (66,800 − 10,267) cached tokens a call.
  const allToolsExtraPerTurn =
    (2 * mix.lookup + mix.write) * usd(TOOLS.allLoaded - TOOLS.bundlePrefix, PRICES.mid.cached);
  return {
    router,
    answer,
    groundingCheck,
    lookupCall1,
    lookupCall2,
    lookup,
    write,
    agent,
    other,
    memoryPerConversation,
    memoryPerTurn,
    mix,
    byType,
    blended,
    prefixWritesPerDay,
    perDay,
    perMonth: perDay * COMPANY.daysPerMonth, // ≈ 6,190
    perSeatMonth: (perDay * COMPANY.daysPerMonth) / COMPANY.seats, // ≈ 1.24
    allToolsExtraPerTurn, // ≈ 0.0021 a turn on average
    doubledPrices: 2 * blended, // ≈ 0.022 a turn if model prices double
  };
})();

/**
 * Infrastructure, team and the all-in cost (illustrative).
 *   Search: 8 nodes × 1.20 × 24 = 230.4 USD a day. GPUs: 2 (one per zone: embedder, cross-encoder, injection classifier)
 *   × 2.50 × 24 = 120. Connectors 6 workers × 0.40 × 24 = 57.6; PostgreSQL (ACL store, principals, memory, audit) 40;
 *   Redis 15; ClickHouse traces 30; object storage 1.5; evaluation and canaries 10 → 504.5 USD a day.
 *   GPU load check: re-embedding ≈ 330,000 changed chunks × 400 = 132M tokens a day at 50,000 a second = 0.73 GPU-hours;
 *   reranking at peak 1.05 turns × 65% answers ≈ 0.68 a second × 21,500 = 14,700 tokens a second = 0.07 of a GPU.
 *   Two GPUs are for availability, not load.
 *   Team: 5 engineers × 400,000 = 2.0M USD a year = 166,667 a month.
 *   All-in a month: model 6,190 + infra 15,135 + team 166,667 ≈ 188,000 → ≈ 37.6 USD a seat; ≈ 0.35 USD a turn.
 */
export const PLATFORM = (() => {
  const lines = [
    { id: "search", label: "Search cluster (8 nodes)", perDay: INDEX.nodes * PRICES.searchNodeHour * 24 },
    { id: "gpus", label: "GPUs (2, one per zone)", perDay: 2 * PRICES.gpuHour * 24 },
    { id: "connectors", label: "Connector workers (6)", perDay: 6 * 0.4 * 24 },
    { id: "postgres", label: "PostgreSQL: ACLs, principals, memory, audit", perDay: 40 },
    { id: "redis", label: "Redis: principal and token caches", perDay: 15 },
    { id: "traces", label: "ClickHouse traces", perDay: 30 },
    { id: "objects", label: "Object storage (originals)", perDay: 1.5 },
    { id: "eval", label: "Evaluation and canaries", perDay: 10 },
  ] as const;
  const infraPerDay = sum(lines.map((l) => l.perDay)); // 504.5
  const infraPerMonth = infraPerDay * COMPANY.daysPerMonth; // 15,135
  const engineers = 5;
  const teamPerMonth = (engineers * PRICES.engineerYear) / 12; // 166,667
  const modelPerMonth = COST.perMonth;
  const allInPerMonth = modelPerMonth + infraPerMonth + teamPerMonth; // ≈ 187,990
  const reembedTokensPerDay = 330_000 * CORPUS.chunkTokens; // 132M
  return {
    lines,
    infraPerDay,
    infraPerMonth,
    engineers,
    teamPerMonth,
    modelPerMonth,
    allInPerMonth,
    perSeatMonth: allInPerMonth / COMPANY.seats, // ≈ 37.6
    perTurn: allInPerMonth / COMPANY.turnsPerMonth, // ≈ 0.348
    modelShare: modelPerMonth / allInPerMonth, // ≈ 3.3%
    teamShare: teamPerMonth / allInPerMonth, // ≈ 88.7%
    reembedTokensPerDay,
    reembedGpuHours: reembedTokensPerDay / 50_000 / 3_600, // 0.73
  };
})();

/**
 * Build or buy. Buying a seat product at 30 USD still needs 2 engineers for custom connectors (WMS, helpdesk), actions
 * and evaluation (66,667 a month, illustrative).
 *   Buy at 5,000 seats: 150,000 + 66,667 = 216,667 a month; build ≈ 188,000 → build ≈ 28,700 a month cheaper.
 *   Breakeven seats: build fixed (team + infra) 181,802 + 1.24 a seat = buy 66,667 + 30 a seat → ≈ 4,000 seats; if
 *   buying needed no engineers, ≈ 6,320.
 *   Breakeven seat price at 5,000 seats: (188,000 − 66,667) ÷ 5,000 ≈ 24.3 USD; at the 21 USD business tier, buy wins.
 */
export const BUILD_BUY = (() => {
  const integrationEngineers = 2;
  const buyFixed = (integrationEngineers * PRICES.engineerYear) / 12; // 66,667
  const buildFixed = PLATFORM.teamPerMonth + PLATFORM.infraPerMonth; // 181,802
  const buildPerSeat = COST.perSeatMonth; // ≈ 1.24
  const buy = (seats: number, price: number = PRICES.seatPrice) => buyFixed + seats * price;
  const build = (seats: number) => buildFixed + seats * buildPerSeat;
  const seats = COMPANY.seats;
  return {
    integrationEngineers,
    buyFixed,
    buildFixed,
    buildPerSeat,
    buy,
    build,
    buyAt5000: buy(seats), // 216,667
    buildAt5000: build(seats), // ≈ 188,000
    buildSaves: buy(seats) - build(seats), // ≈ 28,700
    breakevenSeats: (buildFixed - buyFixed) / (PRICES.seatPrice - buildPerSeat), // ≈ 4,000
    breakevenSeatsNoIntegration: buildFixed / (PRICES.seatPrice - buildPerSeat), // ≈ 6,320
    breakevenPrice: (build(seats) - buyFixed) / seats, // ≈ 24.3
    buyAtBusinessTier: buy(seats, PRICES.seatPriceBusiness), // 171,667
  };
})();

// ── Latency per request type ─────────────────────────────────────────────────────────────────────────────────────

type Stage = { id: string; label: string; p50: number; spread: number };
const path = (stages: readonly Stage[]) => {
  const p50 = sum(stages.map((s) => s.p50));
  return { stages, p50, p95: p50 + rss(stages.map((s) => s.spread)), upper: p50 + sum(stages.map((s) => s.spread)) };
};

/**
 * Latency per request type, ms (illustrative stage times; p95 by root-sum-square of spreads).
 *   Answer, first token: edge and principals 20 + router 300 + embed 15 + filtered hybrid search 40 + ACL-store
 *   re-check 5 + personal ranker 10 + cross-encoder 120 + context 10 + first token 600 = 1,120; p95 ≈ 1,774 (stage-sum bound 2,195).
 *   Sources are shown at 510 ms. Sensitive path: + the slowest of 3 live checks (one check p50 120 / p95 400; slowest
 *   of 3 p50 ≈ 260; p95 capped by the 400 ms deadline, a late document is dropped) → 1,380 / ≈ 2,049 (stage-sum bound 2,595: the target relies on tails not all coinciding).
 *   Federated path (mailbox or DMs searched live, p50 500 / p95 1,200, in parallel with the index) → 1,580 / ≈ 2,536 (stage-sum bound 3,295).
 *   Complete answer: + 250 tokens at 80 a second (3,125 ms, spread 781) → 4,245 / ≈ 5,264 (plain);
 *   sensitive 4,504 / ≈ 5,533; federated 4,705 / ≈ 5,940.
 *   Lookup: 20 + 300 + 600 + 60 tokens 750 + token broker 5 + tool 300 + first token 500 = 2,475 first token; + 200
 *   tokens 2,500 → 4,975 complete; p95 ≈ 3,707 and ≈ 6,357 (first-token stage-sum bound 5,033). Status "Checking the
 *   ERP" at 320 ms.
 *   Write to card: 20 + 300 + 600 + 120 tokens 1,500 + validate 30 = 2,450 (p95 ≈ 3,201); execute after confirm 5 + 400 + 10 = 415 (p95 ≈ 1,515).
 *   Agent: 20 + 300 + 6 × 600 + 560 tokens 7,000 + 3 tools × 300 + 2 searches × 30 = 11,880 (p95 ≈ 14,658).
 */
export const LATENCY = (() => {
  const edge: Stage = { id: "edge", label: "Edge, auth, principals", p50: 20, spread: 150 };
  const router: Stage = { id: "router", label: "Router (small)", p50: 300, spread: 200 };
  const embed: Stage = { id: "embed", label: "Embed query", p50: 15, spread: 10 };
  const search: Stage = { id: "search", label: "Filtered hybrid search", p50: 40, spread: 60 };
  const recheck: Stage = { id: "recheck", label: "ACL-store re-check", p50: 5, spread: 5 };
  const personal: Stage = { id: "personal", label: "Personal ranker", p50: 10, spread: 5 };
  const cross: Stage = { id: "cross", label: "Cross-encoder (50 → 8)", p50: 120, spread: 40 };
  const assemble: Stage = { id: "assemble", label: "Context assembly", p50: 10, spread: 5 };
  const firstToken: Stage = { id: "ttft", label: "Answer model first token", p50: 600, spread: 600 };
  const tokensPerSecond = 80;
  const decode = (tokens: number): Stage => ({
    id: `decode-${tokens}`,
    label: `${tokens} tokens at ${tokensPerSecond}/s`,
    p50: (tokens / tokensPerSecond) * 1_000,
    spread: (tokens / tokensPerSecond) * 1_000 * 0.25,
  });

  // Live (late-bound) permission check: one call p50 120 / p95 400 ms, 3 documents in parallel, 400 ms deadline.
  const liveOne = { p50: 120, p95: 400 };
  const liveDeadline = 400;
  const liveP50 = maxOfN(liveOne.p50, liveOne.p95, RETRIEVAL.sensitiveDocsWhenPresent, 0.5); // ≈ 260
  const liveP95Uncapped = maxOfN(liveOne.p50, liveOne.p95, RETRIEVAL.sensitiveDocsWhenPresent, 0.95); // ≈ 481
  const live: Stage = {
    id: "live",
    label: "Live check, slowest of 3",
    p50: liveP50,
    spread: Math.min(liveP95Uncapped, liveDeadline) - liveP50,
  };
  // Federated mailbox search replaces the index's 40 ms on the critical path.
  const federated: Stage = { id: "federated", label: "Mailbox search (live)", p50: 500, spread: 700 };

  const answerHead = [edge, router, embed, search, recheck, personal, cross];
  const answer = path([...answerHead, assemble, firstToken]);
  const answerSensitive = path([...answerHead, live, assemble, firstToken]);
  const answerFederated = path([edge, router, embed, federated, recheck, personal, cross, assemble, firstToken]);
  const sourcesAt = sum(answerHead.map((s) => s.p50)); // 510
  const out250 = decode(CONTEXT.answerOut);
  const answerDone = path([...answer.stages, out250]);
  const answerSensitiveDone = path([...answerSensitive.stages, out250]);
  const answerFederatedDone = path([...answerFederated.stages, out250]);

  const broker: Stage = { id: "broker", label: "Token broker (cached)", p50: 5, spread: 20 };
  const toolCall: Stage = { id: "tool", label: "Tool API call", p50: 300, spread: 900 };
  const lookup = path([
    edge,
    router,
    firstToken,
    decode(CONTEXT.toolCallOut),
    broker,
    toolCall,
    { id: "ttft2", label: "Second call first token", p50: 500, spread: 500 },
  ]);
  const lookupDone = path([...lookup.stages, decode(CONTEXT.lookupReplyOut)]);
  const writeCard = path([
    edge,
    router,
    firstToken,
    decode(CONTEXT.writeArgsOut),
    { id: "validate", label: "Schema, entitlement, policy", p50: 30, spread: 20 },
  ]);
  const writeExecute = path([
    broker,
    { id: "execute", label: "Write API call", p50: 400, spread: 1_100 },
    { id: "template", label: "Template reply", p50: 10, spread: 5 },
  ]);
  const agentOut = sum(AGENT.steps.map((s) => s.out)); // 560
  const agent = path([
    edge,
    router,
    ...AGENT.steps.map((_, i) => ({ ...firstToken, id: `ttft-${i}` })),
    decode(agentOut),
    ...Array.from({ length: AGENT.toolCalls }, (_, i) => ({ ...toolCall, id: `tool-${i}` })),
    ...Array.from({ length: AGENT.toolSearches }, (_, i) => ({
      id: `search-${i}`,
      label: "Tool search",
      p50: 30,
      spread: 20,
    })),
  ]);
  const targets = {
    answerFirstToken: { p50: 1_500, p95: 2_500 },
    federatedFirstToken: { p50: 2_000, p95: 3_000 },
    answerDone: { p50: 5_000, p95: 7_000 },
    lookupFirstToken: { p50: 3_000, p95: 5_000 },
    lookupDone: { p50: 6_000, p95: 9_000 },
    writeCard: { p50: 3_000, p95: 5_000 },
    writeExecute: { p50: 1_000, p95: 2_000 },
    agentDone: { p50: 15_000, p95: 30_000 },
    statusEvent: { p50: 500 },
  } as const;
  return {
    stages: { edge, router, embed, search, recheck, personal, cross, assemble, firstToken, live, federated },
    tokensPerSecond,
    liveOne,
    liveDeadline,
    liveP50,
    liveP95Uncapped,
    sourcesAt,
    statusAt: edge.p50 + router.p50, // 320
    answer,
    answerSensitive,
    answerFederated,
    answerDone,
    answerSensitiveDone,
    answerFederatedDone,
    lookup,
    lookupDone,
    writeCard,
    writeExecute,
    agent,
    targets,
  };
})();

/**
 * Model throughput at peak: 1.05 turns a second. Input tokens a turn (mix-weighted): router 1,100 + answer 7,590 +
 * check 4,070; lookup 11,137 + 11,997 = 23,134; write 11,137; agent Σ of six contexts 47,180 + check; other 1,500
 * → ≈ 15,700 a turn → ≈ 990,000 input tokens a minute at peak (most of it cache reads). No reserved throughput needed.
 */
export const CAPACITY = (() => {
  const agentIn = sum(AGENT.calls.map((c) => c.cachedIn + c.newIn));
  const check = 300 + CONTEXT.evidence + CONTEXT.answerOut; // 4,070
  const lookupIn =
    TOOLS.bundlePrefix + CONTEXT.turnState + (TOOLS.bundlePrefix + CONTEXT.turnState + CONTEXT.toolCallOut + CONTEXT.toolResult);
  const writeIn = TOOLS.bundlePrefix + CONTEXT.turnState;
  const m = COST.mix;
  const perTurn =
    1_100 +
    m.answer * (CONTEXT.total + check) +
    m.lookup * lookupIn +
    m.write * writeIn +
    m.agent * (agentIn + check) +
    m.other * 1_500;
  return {
    agentIn,
    lookupIn,
    writeIn,
    inputPerTurn: perTurn,
    peakInputPerMinute: perTurn * COMPANY.peakPerSecond * 60,
  };
})();

// ── Actions ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Read and write tiers. The tier is a property of the tool, set in code; the model cannot change it. */
export const TIERS = [
  {
    id: "T0",
    label: "Read",
    examples: "search, open a document, stock for a SKU, PO status, my leave balance",
    rule: "Runs as the user, no confirmation",
  },
  {
    id: "T1",
    label: "Draft or own item",
    examples: "draft a Slack message or email, create a Jira issue in my project, add a comment",
    rule: "One-tap card; undo for 10 minutes",
  },
  {
    id: "T2",
    label: "Visible to others",
    examples: "send an internal message, change a case status, request leave, reassign an issue",
    rule: "Card shows the exact payload; extra consent (write scope) on first use; internal recipients only",
  },
  {
    id: "T3",
    label: "Never from the assistant",
    examples: "payments, refunds, payroll, sharing or permission changes, deletes, bulk edits, external email",
    rule: "Not offered; the assistant links to the system's own screen",
  },
] as const;

// ── Memory ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Memory the user can see and correct (illustrative limits). */
export const MEMORY = {
  maxItemsPerUser: 50,
  injectedItems: 5,
  injectedTokens: 200,
  unusedExpiryDays: 180,
  deleteTakesEffect: "the next turn",
  purgeFromBackupsDays: 30,
} as const;

// ── Evaluation ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Evaluation sets and their statistics.
 *   Gold set 1,000 (support 300, warehouse 200, finance 200, general 300) at 85% correct: ± 2.2 points; a department
 *   slice of 200: ± 4.9.
 *   Permission suite: 12 personas × 400 probes = 4,800, against 600 planted canary documents; 0 leaks → ≤ 3 ÷ 4,800 =
 *   0.0625% per probe at 95% (rule of three).
 *   Injection suite: 500 cases; 0 followed → ≤ 0.6%.
 *   Action simulator: 150 scenarios × 4 runs, pass^4 (all four succeed); at 97% a run, 0.97^4 = 88.5%.
 *   Revocation canary: 50 revocations a night across sources; the lag distribution is measured, not assumed.
 */
export const EVAL = (() => {
  const gold = 1_000;
  const goldTarget = 0.85;
  const slice = 200;
  const personas = 12;
  const probesPerPersona = 400;
  const probes = personas * probesPerPersona; // 4,800
  const injection = 500;
  const scenarios = 150;
  const runs = 4;
  const perRun = 0.97;
  return {
    gold,
    goldSlices: { support: 300, warehouse: 200, finance: 200, general: 300 },
    goldTarget,
    goldMargin: margin95(goldTarget, gold), // 2.2
    sliceMargin: margin95(goldTarget, slice), // 4.9
    groundedTarget: 0.95,
    personas,
    probesPerPersona,
    probes,
    canaryDocs: 600,
    leakBound: 3 / probes, // 0.000625
    injection,
    injectionBound: 3 / injection, // 0.006
    scenarios,
    runs,
    perRun,
    passHat4: perRun ** runs, // 0.885
    passHat4Target: 0.85,
    revocationCanariesPerNight: 50,
    prodJudgeSample: 0.02,
  };
})();

/** Audit and trace volume: 18,000 turns × 8 KB = 144 MB a day; ≈ 52.6 GB a year. */
export const AUDIT = {
  bytesPerTurn: 8_000,
  perDayMB: (COMPANY.turnsPerDay * 8_000) / 1e6, // 144
  perYearGB: (COMPANY.turnsPerDay * 8_000 * 365) / 1e9, // 52.6
  retentionDays: 365,
} as const;

/**
 * Oversharing before launch (illustrative): 6% of SharePoint files carry an organisation-wide link (144,000); 3% of
 * those are labelled Confidential or match sensitive patterns (salary, bank details, customer data) = 4,320, held out
 * of the index until their owners fix the sharing. Rule: the assistant may be stricter than the source, never looser.
 */
export const OVERSHARING = (() => {
  const files = SOURCES.list[0].docs; // 2,400,000
  const orgWideShare = 0.06;
  const sensitiveShare = 0.03;
  const orgWide = files * orgWideShare; // 144,000
  return { orgWideShare, sensitiveShare, orgWide, heldOut: orgWide * sensitiveShare }; // 4,320
})();

/** The worked examples every figure shares. */
export const EXAMPLES = {
  support: {
    who: "Priya, support team lead",
    question: `Order ${BRIGHTPOST.orderId}: the ${BRIGHTPOST.item} arrived cracked and it was £${BRIGHTPOST.price}. Can I refund it?`,
    answer: `Refunds over £${BRIGHTPOST.approvalLimit} need an approver; the damaged-on-arrival rule allows a full refund within 30 days.`,
  },
  warehouse: {
    who: "Tom, Leeds warehouse shift lead",
    question: "What do I do when a pallet arrives damaged at dock 3?",
    lookup: "How many K-220 kettles are in stock at Leeds?",
    action: "Raise a ticket for the broken scanner at dock 3.",
  },
  finance: { who: "Aisha, accounts payable", lookup: "What's the status of PO 88213?" },
  leak: {
    doc: "FY27 pay bands (HR)",
    mistake: "shared with an organisation-wide link",
    asker: "a warehouse shift lead asks about team-leader pay",
  },
  injection: "an external supplier email with hidden text asking the assistant to put recent finance figures in a link",
} as const;
