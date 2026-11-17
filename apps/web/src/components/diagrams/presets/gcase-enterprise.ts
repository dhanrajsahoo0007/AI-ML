// Constants and arithmetic for the "Design an Enterprise AI Assistant" case study (/genai-system-design/case-studies/
// conversational-assistant-design; design sheet SYSTEM-DESIGN/plans/genai-design/design/conversational-assistant-design.md
// v3, dossier research/conversational-assistant-design.md, review review/conversational-assistant-design-design.md).
// Specs in assets/diagrams/animated/enterprise-assistant/ import from here, so the page, the figures and the tests share
// one set of numbers.
//
// Running example: Brightpost (presets/agents.ts, rag.ts, gcase-support.ts), here as an EMPLOYER: an assistant for its
// own staff over about 10 million documents across its systems (6.0M indexed, Slack's 4.0M threads searched live).
// It is SINGLE-TENANT (one company, one deployment).
//
// Every headcount, volume, mix, rate, lag and unit cost below is ILLUSTRATIVE unless a comment names a source.
// Model prices are list prices as of November 2026 (Claude pricing docs, dossier F63): mid-size (Claude Sonnet 5.5
// class) 2.00 input / 0.10 cache read / 2.50 5-minute write / 4.00 1-hour write / 10.00 output USD per million tokens;
// small (Claude Haiku 5.5 class) 0.10 / 0.01 / 0.125 / 0.20 / 0.50. Tool use adds a 286-token system prompt (F64).
// Source rate limits: SharePoint per-app per-tenant 2,500 resource units (RU) a minute and 2,400,000 a day for 1,001–5,000
// licences; delta with a token 1 RU, multi-item 2, permission operations 5 (dossier F101). Atlassian Tier 2 Enterprise
// 150,000 + 30 a user points an hour (F104). Zendesk-class Enterprise 700 requests a minute (F105). GitHub Enterprise Cloud
// app installation 15,000 requests an hour (F106). Slack Real-time Search: "10+" a minute a team (400+ for larger
// teams), 10 a minute a user (F103).
// p95 per path is a root-sum-square of stage spreads (independent tails); stage-sum bounds are given where they matter.

import { BRIGHTPOST } from "./agents";
import { FUNNEL } from "./gcase-support";
import { CORPUS } from "./rag";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));

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
/** P(one normal draw with this p50 and p95 exceeds t). */
const tailAbove = (p50: number, p95: number, t: number) => 1 - phi((t - p50) / ((p95 - p50) / Z95));

/** 95% normal-approximation margin, in points, for a rate p measured on n cases. */
const margin95 = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n) * 100;

// ── Prices ───────────────────────────────────────────────────────────────────────────────────────────────────────

export const PRICES = {
  mid: { input: 2.0, cached: 0.1, cacheWrite5m: 2.5, cacheWrite1h: 4.0, output: 10.0 },
  small: { input: 0.1, cached: 0.01, cacheWrite5m: 0.125, cacheWrite1h: 0.2, output: 0.5 },
  toolSystemPrompt: 286, // tokens added whenever tools are present (F64)
  minCacheablePrefix: 512,
  gpuHour: 2.5, // illustrative
  searchNodeHour: 1.2, // 64 GB node, illustrative
  engineerYear: 400_000, // fully loaded, illustrative
  seatList: 30, // Microsoft 365 Copilot (F12); Gemini Enterprise (press, F97)
  seatDiscount: 0.15, // illustrative enterprise discount at thousands of seats (dossier C10)
  businessTierSeatCap: 300, // Copilot Business 21 USD is capped at 300 seats (F107): not an option for Brightpost
  meteredPerCredit: 0.01, // Copilot Chat agents: from 0.01 USD a message credit; grounded answers 2 credits (F108)
} as const;

// ── The company and its use ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Demand by department (illustrative). Office staff work 22 days a month; the warehouses 30.
 *   Support 400 × 90% × 12 = 4,320 turns a working day; warehouse 3,000 × 40% × 3 = 3,600; finance 150 × 80% × 8 = 960;
 *   engineering 550 × 70% × 6 = 2,310; other 900 × 60% × 6 = 3,240 → 14,430 on a weekday.
 *   A month: 95,040 + 108,000 + 21,120 + 50,820 + 71,280 = 346,260 turns → 69.3 a seat.
 *   Peak: office turns 10,830 × 70% in 10 hours = 0.2106 a second + warehouse 3,600 over 24 hours = 0.0417 → × 3 = 0.757.
 *   (Glean reports about five queries a day per employee, vendor, F11: a knowledge-worker average.)
 */
export const COMPANY = (() => {
  const departments = [
    { id: "support", label: "Support", staff: 400, active: 0.9, turns: 12, days: 22, knowledge: true },
    { id: "warehouse", label: "Warehouse", staff: 3_000, active: 0.4, turns: 3, days: 30, knowledge: false },
    { id: "finance", label: "Finance", staff: 150, active: 0.8, turns: 8, days: 22, knowledge: true },
    {
      id: "engineering",
      label: "Engineering and product",
      staff: 550,
      active: 0.7,
      turns: 6,
      days: 22,
      knowledge: true,
    },
    {
      id: "other",
      label: "Other (HR, buying, marketing, ops)",
      staff: 900,
      active: 0.6,
      turns: 6,
      days: 22,
      knowledge: true,
    },
  ] as const;
  const perDay = (d: (typeof departments)[number]) => d.staff * d.active * d.turns;
  const staff = sum(departments.map((d) => d.staff)); // 5,000
  const knowledgeWorkers = sum(departments.filter((d) => d.knowledge).map((d) => d.staff)); // 2,000
  const weekdayTurns = sum(departments.map(perDay)); // 14,430
  const turnsPerMonth = sum(departments.map((d) => perDay(d) * d.days)); // 346,260
  const warehouse = departments[1];
  const warehouseTurnsPerDay = perDay(warehouse); // 3,600
  const officeTurnsPerDay = weekdayTurns - warehouseTurnsPerDay; // 10,830
  const officeShareInHours = 0.7;
  const officeHours = 10;
  const peakFactor = 3;
  const peakPerSecond =
    peakFactor * ((officeTurnsPerDay * officeShareInHours) / (officeHours * 3_600) + warehouseTurnsPerDay / 86_400); // 0.757
  const turnsPerConversation = 3;
  return {
    name: BRIGHTPOST.shop,
    departments,
    staff,
    seats: staff,
    knowledgeWorkers,
    weekdayTurns,
    warehouseTurnsPerDay,
    officeTurnsPerDay,
    warehouseTurnsPerMonth: warehouseTurnsPerDay * warehouse.days, // 108,000
    turnsPerMonth,
    turnsPerSeatMonth: turnsPerMonth / staff, // 69.3
    peakFactor,
    peakPerSecond,
    turnsPerConversation,
    conversationsPerMonth: turnsPerMonth / turnsPerConversation, // 115,420
  };
})();

// ── Corpus and index ─────────────────────────────────────────────────────────────────────────────────────────────

/** Chunks per document with Brightpost's chunker (rag.ts CORPUS: 400-token chunks, 50 overlap, stride 350), ≥ 1. */
const chunksFor = (tokens: number) => Math.max(1, Math.ceil((tokens - CORPUS.overlapTokens) / CORPUS.stride));

/**
 * Sources. Slack (4.0M threads) and Outlook mail are FEDERATED: searched live as the user, never copied (Slack's 2025 API
 * terms point AI apps at its Real-time Search API, F102, F103). Business records (WMS, ERP, HR) are read live by tools.
 * Indexed: SharePoint 2.4M × 9 + Confluence 0.3M × 5 + Jira 0.9M × 2 + helpdesk 1.92M × 3 + GitHub 0.48M × 3 chunks
 *   = 21.6 + 1.5 + 1.8 + 5.76 + 1.44 = 32.1M chunks over 6.0M documents; 10.2B tokens.
 * Helpdesk: only HANDED-OFF cases (the support page's 16,000 a day × 120 days = 1.92M); cases the support agent
 * resolved stay in its own store.
 */
export const SOURCES = (() => {
  const helpdeskDays = 120;
  const indexed = [
    { id: "sharepoint", label: "SharePoint and OneDrive files", docs: 2_400_000, tokens: 3_000 },
    { id: "confluence", label: "Confluence pages", docs: 300_000, tokens: 1_500 },
    { id: "jira", label: "Jira issues", docs: 900_000, tokens: 600 },
    {
      id: "helpdesk",
      label: "Helpdesk cases (handed off, 120 days)",
      docs: FUNNEL.handedOff * helpdeskDays,
      tokens: 800,
    },
    { id: "github", label: "GitHub READMEs, docs, issues", docs: 480_000, tokens: 1_000 },
  ].map((s) => ({ ...s, chunksPerDoc: chunksFor(s.tokens), chunks: s.docs * chunksFor(s.tokens) }));
  const federated = [
    { id: "slack", label: "Slack channels and DMs", docs: 4_000_000 },
    { id: "mail", label: "Outlook mail and calendar", docs: 0 }, // per-user mailboxes, not counted
  ] as const;
  const docs = sum(indexed.map((s) => s.docs)); // 6,000,000
  const chunks = sum(indexed.map((s) => s.chunks)); // 32,100,000
  const textTokens = sum(indexed.map((s) => s.docs * s.tokens)); // 10.206B
  return {
    indexed,
    federated,
    helpdeskDays,
    docs,
    allDocs: docs + federated[0].docs, // 10,000,000
    chunks,
    textTokens,
    avgChunksPerDoc: chunks / docs, // 5.35
    sharepointChunksPerDoc: chunksFor(3_000), // 9
    encryptedShareOfFiles: 0.02, // label-encrypted files: not indexed and not available to the assistant (v3)
  };
})();

/**
 * Index sizing. 1,024-dim INT8 vectors in memory (1,024 B), float32 on SSD for rescoring; HNSW M = 16 → 128 B of links;
 * metadata ≈ 200 B (≈ 20 principal ids × 8 B + 40 B of fields; documents with more principals keep an overflow list).
 *   Vectors 32.1M × 1,024 = 32.87 GB; links 4.11; metadata 6.42; postings 30% of 10.2B tokens × 4 B = 12.25 → 55.65 GB a
 *   replica in memory; float32 copy 131.5 GB on SSD. 4 shards × 2 replicas (two zones) = 8 nodes of 64 GB.
 *   Initial embedding: 32.1M × 400 = 12.84B tokens at 50,000 a second a GPU = 71.3 GPU-hours ≈ 1.5 days on 2 GPUs.
 */
export const INDEX = (() => {
  const dims = 1_024;
  const vectorsGB = (SOURCES.chunks * dims) / 1e9;
  const linksGB = (SOURCES.chunks * 128) / 1e9;
  const metadataGB = (SOURCES.chunks * 200) / 1e9;
  const postingsGB = (SOURCES.textTokens * 4 * 0.3) / 1e9;
  const memoryGB = vectorsGB + linksGB + metadataGB + postingsGB;
  const embedTokens = SOURCES.chunks * CORPUS.chunkTokens;
  const embedGpuHours = embedTokens / 50_000 / 3_600;
  return {
    dims,
    vectorsGB, // 32.87
    float32GB: (SOURCES.chunks * dims * 4) / 1e9, // 131.5 (on SSD)
    linksGB, // 4.11
    metadataGB, // 6.42
    postingsGB, // 12.25
    memoryGB, // 55.65
    shards: 4,
    replicas: 2,
    nodes: 8,
    perShardGB: memoryGB / 4, // 13.9
    exactScanBelowChunks: 50_000,
    exactScanMs: 5, // 51 MB at 10 GB/s
    embedTokens, // 12.84B
    embedGpuHours, // 71.3
    embedDaysOn2Gpus: embedGpuHours / 2 / 24, // 1.49
    partialUpdatesPerSecond: 5_000, // the engine requirement: in-place attribute updates, no vector re-index
  };
})();

// ── Identity and permissions ─────────────────────────────────────────────────────────────────────────────────────

/**
 * ACL changes (illustrative). Chunks carry principal ids; memberships live in the principal store.
 *   Document ACL changes 20,000 a day (SharePoint 15,000, Atlassian 3,000, helpdesk 1,500, GitHub 500) × 5.35 chunks
 *   = 107,000 patches. Container changes 300 a day (SharePoint 200) × 2,000 documents × 5.35 = 3.21M patches.
 *   Inherited ACLs are DERIVED in the ACL store from the container's ACL: one source call per container change, not one
 *   per item. Largest site: 50,000 files × 9 chunks = 450,000 patches at 5,000 a second = 90 s.
 *   Deletes and DLP tombstones: 6,000 a day, on the same topic as revocations.
 */
export const PRINCIPALS = (() => {
  const docAclChangesPerDay = 20_000;
  const containerChangesPerDay = 300;
  const docsPerContainer = 2_000;
  const docPatches = docAclChangesPerDay * SOURCES.avgChunksPerDoc;
  const containerPatches = containerChangesPerDay * docsPerContainer * SOURCES.avgChunksPerDoc;
  const largestSitePatches = 50_000 * SOURCES.sharepointChunksPerDoc;
  return {
    perUserAvg: 120,
    perUserP99: 1_500,
    docAclChangesPerDay,
    containerChangesPerDay,
    docPatches, // 107,000
    containerPatches, // 3,210,000
    patchesPerDay: docPatches + containerPatches, // 3,317,000
    patchesPerSecondAvg: (docPatches + containerPatches) / 86_400, // 38.4
    largestSitePatches, // 450,000
    largestSiteSeconds: largestSitePatches / INDEX.partialUpdatesPerSecond, // 90
    deletesPerDay: 6_000,
    membershipChangesPerDay: 2_000,
    flattenedRewriteChunks: 200_000 * SOURCES.avgChunksPerDoc, // 1.07M rewrites for one joiner if users were on chunks
  };
})();

/**
 * Per-connector rate-limit budgets (calls or units a day) and the bound each gives (v3).
 *
 * Pre-emptive live checks: at most 4 a sensitive answer (the 4 highest-ranked sensitive candidates in the personal
 * ranker's top 20): 2,814 sensitive answers a weekday × 4 = 11,256 checks, split SharePoint 35%, helpdesk 55%,
 * Atlassian 10% (illustrative).
 *
 * SharePoint and OneDrive (one Graph app; 2,400,000 RU a day, 2,500 a minute, F101). 3,000 sites + 5,000 OneDrives =
 * 8,000 drives with webhook subscriptions (whether app-only subscriptions work on OneDrives under Sites.Selected is a
 * spike; if not, OneDrives fall back to the hourly poll, already budgeted).
 *   Event deltas (1 RU): 24,000 content + 15,000 ACL + 200 container + label changes = 39,200.
 *   Permission fetches (5 RU): (15,000 + 200) × 5 = 76,000 (inherited ACLs derived in the ACL store).
 *   Downloads (1 RU): 24,000 (deletes ride on the content deltas).
 *   P1 poll: 300 drives every 10 min: 43,200. P2 poll: 7,700 drives hourly: 184,800.
 *   Site-group membership (SharePoint groups that hold users directly): one REST call a site expanding its groups,
 *   ≈ 4 RU (illustrative: REST has no fixed cost and usually costs more than Graph): P1 300 sites every 10 min + the
 *   other 2,700 hourly = 43,200 + 64,800 = 108,000 calls × 4 = 432,000 RU.
 *   Live checks: 11,256 × 35% = 3,940 × 5 = 19,698. Drift audit: 5,000 × 5 = 25,000.
 *   Planned ≈ 843,900 RU = 35% of the day; reserve 650,000 (27%) for a 410 re-enumeration of every drive:
 *   2.4M ÷ 200 a page × 2 RU + 5% uniquely permissioned × 5 RU = 24,000 + 600,000 = 624,000 (≈ 7 h at 1,500 RU a minute).
 *   Backfill (same 5%): 2.4M downloads + 24,000 + 600,000 = 3.02M RU ≈ 1.3 days at the daily cap.
 * Atlassian (Tier 2 Enterprise 150,000 + 30 × 2,300 licensed users (2,000 office + 300 warehouse shift leads) = 219,000
 * points an hour, F104; 1 point a request + 2 per identity or permission object):
 *   Hourly permission reconcile: 400 space sets + 300 project schemes × (1 + 2 × 20 entries) = 28,700.
 *   Hourly group and role reconcile: 150 Confluence-local groups × (1 + 2 × 40 members) = 12,150; 300 projects × 3 roles ×
 *   (1 + 2 × 15 members) = 27,900. Groups synced from Entra by SCIM ride the Entra path instead.
 *   Events and fetches ≈ 15,000 points a day (≈ 625 an hour); live checks 1,126 a day × 3 points (≈ 340 an hour at peak).
 *   ≈ 69,700 points an hour = 32% of the quota. Backfill 300,000 × 5 + 900,000 × 2 = 3.3M points ≈ 18.8 h at 80%.
 * Helpdesk (700 requests a minute, F105): live checks 11,256 × 55% = 6,191 a weekday; ≈ 0.3 a second at peak.
 * GitHub (15,000 an hour, F106): teams provisioned from Entra (EMU) ride the Entra path; webhooks + hourly reconcile of
 *   500 repositories' collaborators = 500 an hour.
 * Slack (federated, F103): ≈ 25% of answers search Slack; a per-user 5-minute cache of Slack results inside a conversation
 *   (illustrative 15% hit rate) → peak mean 0.757 × 65% × 25% × 85% × 60 ≈ 6.3 calls a minute against a documented team
 *   floor of "10+"; by Poisson ≈ 5.5% of peak minutes exceed 10 (≈ 13% without the cache).
 */
export const CONNECTORS = (() => {
  const answersPerWeekday = COMPANY.weekdayTurns * 0.65; // 9,380
  const sensitiveAnswers = answersPerWeekday * 0.3; // 2,814
  const preemptiveCap = 4;
  const liveChecks = sensitiveAnswers * preemptiveCap; // 11,256
  const share = { sharepoint: 0.35, helpdesk: 0.55, atlassian: 0.1 } as const;
  const spBudgetDay = 2_400_000;
  const uniqueShare = 0.05; // one value for backfill and re-enumeration
  const siteGroupCalls = 300 * 144 + 2_700 * 24; // 108,000
  const sp = {
    eventDeltas: 24_000 + 15_000 + 200,
    permissionFetches: (15_000 + 200) * 5,
    downloads: 24_000,
    p1Poll: 300 * 144,
    p2Poll: 7_700 * 24,
    siteGroups: siteGroupCalls * 4,
    liveChecks: Math.round(liveChecks * share.sharepoint) * 5,
    driftAudit: 5_000 * 5,
  };
  const spPlanned = sum(Object.values(sp)); // ≈ 843,900
  const spReserve = 650_000;
  const reenumerate = (2_400_000 / 200) * 2 + 2_400_000 * uniqueShare * 5; // 624,000
  const spBackfill = 2_400_000 + (2_400_000 / 200) * 2 + 2_400_000 * uniqueShare * 5; // 3,024,000
  const atlassianUsers = COMPANY.knowledgeWorkers + 300;
  const atlassianHourly = 150_000 + 30 * atlassianUsers; // 219,000
  const at = {
    permissionReconcile: (400 + 300) * (1 + 2 * 20), // 28,700
    localGroups: 150 * (1 + 2 * 40), // 12,150
    projectRoles: 300 * 3 * (1 + 2 * 15), // 27,900
    eventsAndFetches: 15_000 / 24, // 625
    liveChecksPeakHour: 340,
  };
  const atlassianPerHour = sum(Object.values(at)); // ≈ 69,715
  const atlassianBackfill = 300_000 * (2 + 3) + 900_000 * 2; // 3,300,000
  const slackCacheHit = 0.15;
  const slackLambda = COMPANY.peakPerSecond * 0.65 * 0.25 * (1 - slackCacheHit) * 60; // ≈ 6.27
  const slackLambdaNoCache = COMPANY.peakPerSecond * 0.65 * 0.25 * 60; // ≈ 7.38
  const poissonAbove = (lambda: number, k: number) => {
    let p = Math.exp(-lambda);
    let cdf = p;
    for (let i = 1; i <= k; i++) {
      p = (p * lambda) / i;
      cdf += p;
    }
    return 1 - cdf;
  };
  return {
    answersPerWeekday,
    sensitiveAnswers,
    preemptiveCap,
    liveChecks,
    share,
    sharepoint: {
      budgetDay: spBudgetDay,
      budgetMinute: 2_500,
      drives: 8_000,
      siteGroupCalls,
      lines: sp,
      planned: spPlanned,
      plannedShare: spPlanned / spBudgetDay, // ≈ 0.35
      reserve: spReserve,
      reserveShare: spReserve / spBudgetDay, // 0.27
      reenumerate,
      reenumerateHours: reenumerate / 1_500 / 60, // 6.9
      backfill: spBackfill,
      backfillDays: spBackfill / spBudgetDay, // 1.26
      v1PollShareAt8000: ((8_000 / 600) * 86_400 * 1) / spBudgetDay, // 1 RU a call: 0.48
    },
    atlassian: {
      users: atlassianUsers,
      hourly: atlassianHourly,
      lines: at,
      perHour: atlassianPerHour,
      share: atlassianPerHour / atlassianHourly, // ≈ 0.32
      backfill: atlassianBackfill,
      backfillHours: atlassianBackfill / (0.8 * atlassianHourly), // 18.8
    },
    helpdesk: { perMinute: 700, liveChecksPerWeekday: Math.round(liveChecks * share.helpdesk) }, // 6,191
    github: { perHour: 15_000, reconcilePerHour: 500 },
    slack: {
      teamFloorPerMinute: 10,
      userPerMinute: 10,
      cacheHit: slackCacheHit,
      peakPerMinute: slackLambda,
      peakPerMinuteNoCache: slackLambdaNoCache,
      overflowMinutes: poissonAbove(slackLambda, 10), // ≈ 0.04
      overflowMinutesNoCache: poissonAbove(slackLambdaNoCache, 10), // ≈ 0.13
    },
  };
})();

/**
 * Staleness bound per path, in minutes ("bound" = guaranteed by a poll or reconcile; "throttled" = one missed cycle;
 * a connector past "dropOut" leaves the results). Event path p50 (SharePoint document ACL): 30 + 1 + 2 + 0.1 + 1 + 1 =
 * 35.1 s; the document is dirty (live-checked) 1 s after the event.
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
  const p = (eventP50 - 30) / 60; // 0.085 min of processing
  const perSource = [
    { id: "sp-doc-p1", label: "SharePoint document ACL, P1 sites (300)", bound: 10 + p, throttled: 20, dropOut: 30 },
    {
      id: "sp-doc-p2",
      label: "SharePoint and OneDrive document ACL, other (7,700)",
      bound: 60 + p,
      throttled: 120,
      dropOut: 150,
    },
    {
      id: "sp-groups-p1",
      label: "SharePoint site-group membership, P1 sites",
      bound: 10 + p,
      throttled: 20,
      dropOut: 30,
    },
    {
      id: "sp-groups-p2",
      label: "SharePoint site-group membership, other sites",
      bound: 60 + p,
      throttled: 120,
      dropOut: 150,
    },
    {
      id: "entra",
      label: "Entra groups (incl. groups SCIM-synced to Atlassian, GitHub EMU teams)",
      bound: 5,
      throttled: 10,
      dropOut: 30,
    },
    { id: "atlassian-acl", label: "Confluence and Jira permissions", bound: 60, throttled: 120, dropOut: 150 },
    {
      id: "atlassian-groups",
      label: "Confluence-local groups, Jira project roles",
      bound: 60,
      throttled: 120,
      dropOut: 150,
    },
    { id: "github", label: "GitHub collaborators", bound: 60, throttled: 120, dropOut: 150 },
    {
      id: "live",
      label: "Live-checked: helpdesk, Confidential, restricted pages, issue security, dirty",
      bound: 0,
      throttled: 0,
      dropOut: 0,
    },
    { id: "federated", label: "Federated: Slack, mail", bound: 0, throttled: 0, dropOut: 0 },
  ] as const;
  return {
    event,
    eventP50,
    dirtyAfterS: 1,
    perSource,
    membershipEntraP50Min: 2.5, // uniform over the 5-minute Entra delta poll
    disableBoundMin: 5, // account status via the same poll; Microsoft resources also enforce CAE (≤ 15 min, F109)
    containerExtraS: PRINCIPALS.largestSiteSeconds, // + 90 s of index patches
    graphNotifyMaxHours: 6,
  };
})();

/**
 * Content freshness. Changed chunks a day: SharePoint 24,000 × 9 + Confluence 1,500 × 5 + Jira 6,000 × 2 + helpdesk
 * (16,000 new + 16,000 updated) × 3 + GitHub 2,000 × 3 = 216,000 + 7,500 + 12,000 + 96,000 + 6,000 = 337,500 →
 * 135M tokens = 0.75 GPU-hours. Event path p50: notify 30 + fetch 2 + parse 1 + embed batch wait 5 + embed 1 + index 1
 * = 40 s; bound = the content poll (P1 10 min, else 60 min).
 */
export const CONTENT = (() => {
  const changedChunks = 24_000 * 9 + 1_500 * 5 + 6_000 * 2 + 32_000 * 3 + 2_000 * 3; // 337,500
  const path = [30, 2, 1, 5, 1, 1];
  return {
    changedChunks,
    tokens: changedChunks * CORPUS.chunkTokens, // 135M
    gpuHours: (changedChunks * CORPUS.chunkTokens) / 50_000 / 3_600, // 0.75
    eventP50S: sum(path), // 40
    boundMin: 60,
  };
})();

// ── Retrieval ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * 100 BM25 + 100 ANN (both filtered) → 160 unique → personal ranker → 50 → cross-encoder → 8 (≤ 3 a document).
 * Cross-encoder 50 × 430 = 21,500 tokens at 200,000 a second (illustrative GPU class) = 107.5 ms → 120 ms stage.
 * Live checks start when the personal ranker finishes, on sensitive candidates in its top 20 (≤ 8 a turn); the answer
 * waits only for the checks on the chosen 8 (≈ 3 sensitive). Deadline 500 ms from the start.
 */
export const RETRIEVAL = (() => {
  const live = { p50: 120, p95: 400, deadline: 500, chosen: 3 };
  const pDrop = tailAbove(live.p50, live.p95, live.deadline); // 0.0128 a call
  return {
    funnel: [
      { id: "retrieved", label: "Retrieved (BM25 + ANN, filtered)", chunks: 200 },
      { id: "unique", label: "Unique", chunks: 160 },
      { id: "personal", label: "Personal ranker", chunks: 50 },
      { id: "cross", label: "Cross-encoder", chunks: 8 },
    ] as const,
    rerankTokens: 50 * (CORPUS.chunkTokens + 30), // 21,500
    chunksInPrompt: 8,
    chunkTokens: CORPUS.chunkTokens,
    headerTokens: 40,
    sensitiveShareOfAnswers: 0.3,
    federatedShareOfAnswers: 0.3, // Slack ≈ 25%, mail ≈ 8%, some both
    live,
    pDropPerCall: pDrop,
    pDropAnswer: 1 - (1 - pDrop) ** live.chosen, // 0.038
    preemptiveCap: 4, // pre-emptive live checks a sensitive answer
    maxLiveChecksPerTurn: 8, // including dirty documents
    reenumDropAnswer: 1 - (1 - pDrop) ** 4, // ≈ 5.0%: degraded mode while a drive re-enumerates (capped at 4)
  };
})();

// ── Tools and context ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * 106 tools over nine systems, ≈ 600 tokens a definition (illustrative; Anthropic's example ≈ 950, F50).
 *   Stable prefix = instructions 1,200 + tool system prompt 286 + core tools 2,000 = 3,486.
 *   All loaded: 3,486 + 63,600 = 67,086. One bundle: 3,486 + 106 ÷ 9 × 600 (7,067) = 10,553.
 *   Tool search (agent): 3,486 + search tool 500 = 3,986; + 1,800 a search → 7,586 for a two-search task (89% fewer).
 *   Bundles are built per ENTITLEMENT CLASS (support 7 connectors, warehouse 5, finance 7, engineering 6, other 6 = 31
 *   variants), never per user, so prefixes stay shared and a user never sees a tool outside their class; the gateway
 *   refuses the rest (an AP clerk can see a controller's ERP tool and be refused).
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
  const stable = 1_200 + PRICES.toolSystemPrompt + 2_000; // 3,486
  const bundleTokens = Math.round((count / connectors.length) * tokensPerTool); // 7,067
  const allLoaded = stable + count * tokensPerTool; // 67,086
  const bundlePrefix = stable + bundleTokens; // 10,553
  const searchPrefix = stable + 500; // 3,986
  const loadedPerSearch = 3 * tokensPerTool; // 1,800
  const searchTask = searchPrefix + 2 * loadedPerSearch; // 7,586
  const variants = 7 + 5 + 7 + 6 + 6; // 31
  return {
    connectors,
    count,
    tokensPerTool,
    stable,
    bundleTokens,
    allLoaded,
    bundlePrefix,
    searchPrefix,
    loadedPerSearch,
    searchTask,
    searchSaving: 1 - searchTask / allLoaded, // 0.887
    variants,
    allLoadedCachedUsd: usd(allLoaded, PRICES.mid.cached), // 0.0067
    anthropicExample: { tools: 58, defsTokens: 55_000, before: 77_000, after: 8_700, stated: 0.85 }, // one example (F51)
    codeExecutionExample: { before: 150_000, after: 2_000, stated: 0.987 }, // one unnamed example (F55)
  };
})();

/** The answer call's context: 3,486 stable + 4,390 changing = 7,876 tokens; output 250. */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions and citation rules", tokens: 1_200, stable: true },
    { id: "tool-prompt", label: "Tool-use system prompt", tokens: PRICES.toolSystemPrompt, stable: true },
    { id: "core-tools", label: "Core tool definitions", tokens: 2_000, stable: true },
    { id: "memory", label: "Memory (≤ 5 items)", tokens: 200, stable: false },
    { id: "conversation", label: "Summary + last 2 turns", tokens: 600, stable: false },
    { id: "question", label: "Question and router notes", tokens: 70, stable: false },
    { id: "headers", label: "8 source headers", tokens: 8 * 40, stable: false },
    { id: "chunks", label: "8 permitted chunks", tokens: 8 * CORPUS.chunkTokens, stable: false },
  ] as const;
  const total = sum(blocks.map((b) => b.tokens)); // 7,876
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 3,486
  return {
    blocks,
    total,
    stable,
    changing: total - stable, // 4,390
    turnState: 200 + 600 + 70, // 870
    evidence: 8 * (CORPUS.chunkTokens + 40), // 3,520
    answerOut: 250,
    toolCallOut: 60,
    writeArgsOut: 120,
    lookupReplyOut: 200,
    toolResult: 800,
  };
})();

// ── Cost per turn ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Agent: six calls. Call i reads its prefix from the cache, writes its NEW tokens (the previous call's output and the
 * tool result, never cached before) at the 5-minute write price, and pays its output.
 */
export const AGENT = (() => {
  const steps = [
    { kind: "search", out: 40, result: TOOLS.loadedPerSearch },
    { kind: "tool", out: 60, result: CONTEXT.toolResult },
    { kind: "tool", out: 60, result: CONTEXT.toolResult },
    { kind: "search", out: 40, result: TOOLS.loadedPerSearch },
    { kind: "tool", out: 60, result: CONTEXT.toolResult },
    { kind: "answer", out: 300, result: 0 },
  ] as const;
  let cached = TOOLS.searchPrefix; // 3,986
  let fresh: number = CONTEXT.turnState; // 870
  const calls = steps.map((s) => {
    const cost = usd(cached, PRICES.mid.cached) + usd(fresh, PRICES.mid.cacheWrite5m) + usd(s.out, PRICES.mid.output);
    const row = { kind: s.kind, cachedIn: cached, newIn: fresh, out: s.out, cost };
    cached += fresh;
    fresh = s.out + s.result; // review item 32: output tokens are new input next call
    return row;
  });
  return {
    steps,
    calls,
    cost: sum(calls.map((c) => c.cost)), // ≈ 0.0276
    toolSearches: 2,
    toolCalls: 3,
    caps: { calls: 10, contextTokens: 60_000, usd: 0.15, seconds: 60 },
  };
})();

/**
 * Per turn type, USD.
 *   Router 800 × 0.01 + 300 × 0.10 + 40 × 0.50 per million = 0.000058.
 *   Answer 3,486 × 0.10 + 4,390 × 2.00 + 250 × 10.00 = 0.000349 + 0.00878 + 0.0025 = 0.01163; + check 0.000427.
 *   Lookup: call 1 10,553 × 0.10 + 870 × 2.50 + 60 × 10 = 0.00383; call 2 11,423 × 0.10 + (60 + 800) × 2.00 + 200 × 10
 *   = 0.00486 → 0.00869.
 *   Write: 10,553 × 0.10 + 870 × 2.00 + 120 × 10 = 0.00400. Agent 0.0276 + check 0.000427 = 0.0280. Other 0.000225. Memory 0.000077 a turn.
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
    usd(TOOLS.bundlePrefix + CONTEXT.turnState, PRICES.mid.cached) +
    usd(CONTEXT.toolCallOut + CONTEXT.toolResult, PRICES.mid.input) +
    usd(CONTEXT.lookupReplyOut, PRICES.mid.output);
  const lookup = lookupCall1 + lookupCall2;
  const write =
    usd(TOOLS.bundlePrefix, PRICES.mid.cached) +
    usd(CONTEXT.turnState, PRICES.mid.input) +
    usd(CONTEXT.writeArgsOut, PRICES.mid.output);
  const other = usd(1_500, PRICES.small.input) + usd(150, PRICES.small.output);
  const memoryPerTurn = (usd(2_000, PRICES.small.input) + usd(60, PRICES.small.output)) / COMPANY.turnsPerConversation;
  const mix = { answer: 0.65, lookup: 0.15, write: 0.08, agent: 0.05, other: 0.07 } as const;
  const byType = { answer: answer + groundingCheck, lookup, write, agent: AGENT.cost + groundingCheck, other };
  const blended =
    router +
    memoryPerTurn +
    mix.answer * byType.answer +
    mix.lookup * byType.lookup +
    mix.write * byType.write +
    mix.agent * byType.agent +
    mix.other * byType.other;
  // Prefix writes, upper bound: 31 bundle variants + the answer and agent prefixes, each rewritten once an hour (1-hour
  // TTL) on 30 days: 24 × (31 × 10,553 + 3,486 + 3,986) × 4.00 per million × 30.
  const prefixWritesPerMonth =
    24 * 30 * usd(TOOLS.variants * TOOLS.bundlePrefix + CONTEXT.stable + TOOLS.searchPrefix, PRICES.mid.cacheWrite1h);
  const perMonth = COMPANY.turnsPerMonth * blended + prefixWritesPerMonth;
  return {
    router,
    answer,
    groundingCheck,
    lookupCall1,
    lookupCall2,
    lookup,
    write,
    other,
    memoryPerTurn,
    mix,
    byType,
    blended, // ≈ 0.0110
    prefixWritesPerMonth, // ≈ 964
    perMonth, // ≈ 4,800
    perSeatMonth: perMonth / COMPANY.seats, // ≈ 0.96
    uncachedAnswer: usd(CONTEXT.total, PRICES.mid.input) + usd(CONTEXT.answerOut, PRICES.mid.output),
    midRouter: usd(800, PRICES.mid.cached) + usd(300, PRICES.mid.input) + usd(40, PRICES.mid.output),
    allToolsExtraPerTurn: (2 * mix.lookup + mix.write) * usd(TOOLS.allLoaded - TOOLS.bundlePrefix, PRICES.mid.cached),
  };
})();

/**
 * Infrastructure (illustrative): search 8 × 1.20 × 24 = 230.4 a day; GPUs 2 × 2.50 × 24 = 120; connector workers 57.6;
 * PostgreSQL (ACL store, principals, outbox, memory, audit) 40; Redis 15; ClickHouse 30; objects 1.5; eval 10
 * → 504.5 a day, 15,135 a month.
 * Team to BUILD: 9 engineers (connectors and identity 3, platform and permissions 2, evaluation and quality 2, security
 * and SRE 2) × 400,000 ÷ 12 = 300,000 a month.
 */
export const PLATFORM = (() => {
  const infraPerDay = 230.4 + 120 + 57.6 + 40 + 15 + 30 + 1.5 + 10; // 504.5
  const infraPerMonth = infraPerDay * 30; // 15,135
  const engineers = 9;
  const teamPerMonth = (engineers * PRICES.engineerYear) / 12; // 300,000
  const allInPerMonth = COST.perMonth + infraPerMonth + teamPerMonth;
  return {
    infraPerDay,
    infraPerMonth,
    engineers,
    teamPerMonth,
    allInPerMonth, // ≈ 319,900
    perSeatMonth: allInPerMonth / COMPANY.seats, // ≈ 64.0
    perTurn: allInPerMonth / COMPANY.turnsPerMonth, // ≈ 0.92
    modelShare: COST.perMonth / allInPerMonth, // ≈ 1.5%
    teamShare: teamPerMonth / allInPerMonth, // ≈ 94%
  };
})();

/**
 * Build or buy (one decision; the page designs the system as BUILT). Illustrative inputs; seat prices F12, F97, F107, F108.
 *   Build: 9 engineers + infra + model ≈ 319,900 a month (≈ 64 USD a seat).
 *   Buy (mixed): 2,000 knowledge-worker seats at 30 − 15% = 25.5 → 51,000; 3,000 warehouse staff on the free chat
 *   (assumes their Microsoft 365 licence includes it) with metered agents: 108,000 turns × 2–30 credits × 0.01 =
 *   2,160–32,400 (mid, 16 credits: 17,280); 5 engineers for Brightpost's own tools, identity, evaluation and the vendor
 *   tests (166,667); their infrastructure (broker, MCP servers, audit, eval runs) 3,500 → ≈ 238,400 (≈ 48 USD a seat).
 *   Build costs ≈ 81,500 a month more; it breaks even with ≈ 6.6 engineers, or above ≈ 5,200 seated knowledge workers.
 *   Copilot Business at 21 USD is capped at 300 seats, so it is not an option here.
 */
export const BUILD_BUY = (() => {
  const seatPrice = PRICES.seatList * (1 - PRICES.seatDiscount); // 25.5
  const seats = COMPANY.knowledgeWorkers * seatPrice; // 51,000
  const meteredLow = COMPANY.warehouseTurnsPerMonth * 2 * PRICES.meteredPerCredit; // 2,160
  const meteredHigh = COMPANY.warehouseTurnsPerMonth * 30 * PRICES.meteredPerCredit; // 32,400
  const meteredMid = COMPANY.warehouseTurnsPerMonth * 16 * PRICES.meteredPerCredit; // 17,280
  const buyEngineers = 5;
  const buyTeam = (buyEngineers * PRICES.engineerYear) / 12; // 166,667
  const buyInfra = 3_500;
  const buy = seats + meteredMid + buyTeam + buyInfra; // ≈ 238,447
  const build = PLATFORM.allInPerMonth;
  const buildAtTeam = (engineers: number) =>
    COST.perMonth + PLATFORM.infraPerMonth + (engineers * PRICES.engineerYear) / 12;
  return {
    seatPrice,
    seats,
    meteredLow,
    meteredHigh,
    meteredMid,
    buyEngineers,
    buyTeam,
    buyInfra,
    buy,
    buyPerSeat: buy / COMPANY.seats, // ≈ 47.7
    buyLow: seats + meteredLow + buyTeam + buyInfra, // ≈ 223,300
    buyHigh: seats + meteredHigh + buyTeam + buyInfra, // ≈ 253,600
    build,
    buildMinusBuy: build - buy, // ≈ 81,500
    buildAtTeam,
    breakevenEngineers: ((buy - COST.perMonth - PLATFORM.infraPerMonth) * 12) / PRICES.engineerYear, // ≈ 6.6
    breakevenKnowledgeSeats:
      (PLATFORM.teamPerMonth + PLATFORM.infraPerMonth - buyTeam - buyInfra - meteredMid) /
      (seatPrice - COST.perSeatMonth), // ≈ 5,200
  };
})();

// ── Latency per request type ─────────────────────────────────────────────────────────────────────────────────────

type Stage = { id: string; label: string; p50: number; spread: number };
const path = (stages: readonly Stage[]) => {
  const p50 = sum(stages.map((s) => s.p50));
  return { stages, p50, p95: p50 + rss(stages.map((s) => s.spread)), upper: p50 + sum(stages.map((s) => s.spread)) };
};

/**
 * Latency per request type, ms (stage times illustrative; p95 = p50 + root-sum-square of spreads).
 *   Answer: edge 20 + router 300 + embed 15 + filtered search 40 + ACL-store re-check 5 + personal ranker 10 +
 *   cross-encoder 120 + on-use injection screen 25 + context 10 + first token 600 = 1,145.
 *   Sensitive: the answer waits for live checks on the chosen ≈ 3 sensitive documents, started 120 ms earlier (with the
 *   cross-encoder): slowest of 3 ≈ 260 → a residual wait of ≈ 140 (p95 residual ≈ 361); 3.8% of these answers lose a
 *   document to the 500 ms deadline.
 *   Federated (Slack or mail live, 30% of answers): live search 500 (spread 700) replaces the index's 40 on the critical
 *   path, + mail body fetch slowest of 3 (one 150 / 400) ≈ 275.
 */
export const LATENCY = (() => {
  const st = (id: string, label: string, p50: number, spread: number): Stage => ({ id, label, p50, spread });
  const edge = st("edge", "Edge, auth, principals", 20, 150);
  const router = st("router", "Router (small)", 300, 200);
  const embed = st("embed", "Embed query", 15, 10);
  const search = st("search", "Filtered hybrid search", 40, 60);
  const recheck = st("recheck", "ACL-store re-check", 5, 5);
  const personal = st("personal", "Personal ranker", 10, 5);
  const cross = st("cross", "Cross-encoder (50 → 8)", 120, 40);
  const screen = st("screen", "Injection screen on use", 25, 10);
  const assemble = st("assemble", "Context assembly", 10, 5);
  const firstToken = st("ttft", "Answer model first token", 600, 600);
  const tps = 80;
  const decode = (tokens: number) =>
    st(`decode-${tokens}`, `${tokens} tokens`, (tokens / tps) * 1_000, (tokens / tps) * 1_000 * 0.25);

  const live = RETRIEVAL.live;
  const liveSlowestP50 = maxOfN(live.p50, live.p95, live.chosen, 0.5); // ≈ 259.5
  const liveSlowestP95 = Math.min(maxOfN(live.p50, live.p95, live.chosen, 0.95), live.deadline); // ≈ 481
  const liveWait = st(
    "live",
    "Live checks (residual wait)",
    liveSlowestP50 - cross.p50,
    liveSlowestP95 - liveSlowestP50
  );
  const bodyP50 = maxOfN(150, 400, 3, 0.5);
  const bodyP95 = maxOfN(150, 400, 3, 0.95);
  const federatedSearch = st("federated", "Slack or mail search (live)", 500, 700);
  const bodyFetch = st("body", "Mail bodies, slowest of 3", bodyP50, bodyP95 - bodyP50);

  const answer = path([edge, router, embed, search, recheck, personal, cross, screen, assemble, firstToken]);
  const answerSensitive = path([
    edge,
    router,
    embed,
    search,
    recheck,
    personal,
    cross,
    liveWait,
    screen,
    assemble,
    firstToken,
  ]);
  const fedHead = [edge, router, embed, federatedSearch, bodyFetch, recheck, personal, cross];
  const answerFederated = path([...fedHead, screen, assemble, firstToken]);
  const answerFederatedSensitive = path([...fedHead, liveWait, screen, assemble, firstToken]);
  const out250 = decode(CONTEXT.answerOut);
  const done = (p: ReturnType<typeof path>) => path([...p.stages, out250]);

  const broker = st("broker", "Token broker (cached)", 5, 20);
  const toolCall = st("tool", "Tool API call", 300, 900);
  const lookup = path([
    edge,
    router,
    firstToken,
    decode(CONTEXT.toolCallOut),
    broker,
    toolCall,
    st("ttft2", "Second first token", 500, 500),
  ]);
  const lookupDone = path([...lookup.stages, decode(CONTEXT.lookupReplyOut)]);
  const writeCard = path([
    edge,
    router,
    firstToken,
    decode(CONTEXT.writeArgsOut),
    st("validate", "Schema, entitlement, audience, policy", 30, 20),
  ]);
  const writeExecute = path([
    edge,
    broker,
    st("execute", "Write API call", 400, 1_100),
    st("template", "Template reply", 10, 5),
  ]);
  const agentOut = sum(AGENT.steps.map((s) => s.out)); // 560
  const agent = path([
    edge,
    router,
    ...AGENT.steps.map((_, i) => ({ ...firstToken, id: `ttft-${i}` })),
    decode(agentOut),
    ...[0, 1, 2].map((i) => ({ ...toolCall, id: `tool-${i}` })),
    ...[0, 1].map((i) => st(`tsearch-${i}`, "Tool search", 30, 20)),
  ]);
  const targets = {
    answer: { p50: 1_500, p95: 2_500 },
    federated: { p50: 2_200, p95: 3_500 },
    answerDone: { p50: 5_000, p95: 7_000 },
    federatedDone: { p50: 5_500, p95: 7_500 },
    lookup: { p50: 3_000, p95: 5_000 },
    lookupDone: { p50: 6_000, p95: 9_000 },
    writeCard: { p50: 3_000, p95: 5_000 },
    writeExecute: { p50: 1_000, p95: 2_000 },
    agent: { p50: 15_000, p95: 30_000 },
  } as const;
  // Sensitivity: a 600 ms router (+300) on the sensitive path.
  const slowRouterSensitiveP50 = answerSensitive.p50 + 300;
  return {
    tps,
    liveSlowestP50,
    liveSlowestP95,
    bodyP50,
    bodyP95,
    sourcesAt: edge.p50 + router.p50 + embed.p50 + search.p50 + recheck.p50 + personal.p50 + cross.p50, // 510
    statusAt: edge.p50 + router.p50, // 320
    answer,
    answerSensitive,
    answerFederated,
    answerFederatedSensitive,
    answerDone: done(answer),
    answerSensitiveDone: done(answerSensitive),
    answerFederatedDone: done(answerFederated),
    answerFederatedSensitiveDone: done(answerFederatedSensitive),
    lookup,
    lookupDone,
    writeCard,
    writeExecute,
    agent,
    targets,
    headroom: {
      answer: targets.answer.p50 - answer.p50, // 355
      sensitive: targets.answer.p50 - answerSensitive.p50, // ≈ 215
      federated: targets.federated.p50 - answerFederated.p50,
    },
    slowRouterSensitiveP50, // ≈ 1,585: misses 1,500 unless retrieval starts in parallel with the router
  };
})();

/** Model throughput at peak (0.757 turns a second). */
export const CAPACITY = (() => {
  const agentIn = sum(AGENT.calls.map((c) => c.cachedIn + c.newIn));
  const check = 300 + CONTEXT.evidence + CONTEXT.answerOut;
  const lookupIn = 2 * (TOOLS.bundlePrefix + CONTEXT.turnState) + CONTEXT.toolCallOut + CONTEXT.toolResult;
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

/** Tiers by EFFECT and AUDIENCE. Anything that can reach an outsider is T3 (not a tool) whatever its name. */
export const TIERS = [
  {
    id: "T0",
    label: "Read",
    audience: "self",
    examples: "search, open a document, stock for a SKU, PO status, leave balance",
    rule: "As the user; no card",
  },
  {
    id: "T1",
    label: "Draft or own item",
    audience: "self",
    examples: "draft a message, create a Jira issue in an internal project, add an internal case note",
    rule: "Card; withdraw the assistant's own item within 10 min (notifications already sent stay)",
  },
  {
    id: "T2",
    label: "Visible to named colleagues",
    audience: "named internal users or internal-only channels",
    examples: "send an internal message, move a case to an internal-only status, request leave",
    rule: "Card with exact payload, audience and source label; write scope on first use; audience and configured automations checked at execution",
  },
  {
    id: "T3",
    label: "Never from the assistant",
    audience: "anyone outside, or irreversible",
    examples:
      "public case replies, case statuses that notify the requester, transitions in projects with outbound automation, external email, Slack Connect or guest channels, JSM portal comments, payments, refunds, sharing changes, deletes, bulk edits",
    rule: "Not a tool; link to the system's own screen",
  },
] as const;

export const MEMORY = {
  maxItemsPerUser: 50,
  injectedItems: 5,
  injectedTokens: 200,
  unusedExpiryDays: 180,
  purgeFromBackupsDays: 30,
} as const;

// ── Evaluation ───────────────────────────────────────────────────────────────────────────────────────────────────

export const EVAL = (() => {
  const gold = 1_200; // support 300, warehouse 300 (100 in Polish and Romanian), finance 200, general 400
  const goldTarget = 0.85;
  const probes = 14 * 400; // 14 personas (incl. "email reused by a new hire", "Slack not linked to SSO")
  const scenarios = 400;
  const perRun = 0.97;
  return {
    gold,
    goldMargin: margin95(goldTarget, gold), // 2.0
    sliceMargin: margin95(goldTarget, 200), // 4.9
    probes, // 5,600
    leakBoundPerProbe: 3 / probes, // 0.054% per probe of these personas
    injection: 700, // 7 egress families × 100 (case reply, Jira portal, guest channel, mail list, unfurl, insider,
    // a write that triggers an outbound automation)
    injectionBound: 3 / 700, // 0.43%
    scenarios,
    passHat4: perRun ** 4, // 0.885
    passHat4Margin: margin95(perRun ** 4, scenarios), // 3.1 (150 scenarios gave ± 5.1)
    driftPairsPerDay: 10_000,
    driftTarget: 0.0001, // over a rolling 7 days (70,000 pairs: zero mismatches bounds it at 3 ÷ 70,000 = 0.0043%)
    driftWeekBound: 3 / 70_000,
    canaryEveryMinWorkingHours: 15,
    canariesPerDay: 40 * 4 + 50, // 40 a working day for each of 4 indexed sources + 50 at night = 210
    filteredRecallTarget: 0.95, // recall@100 vs exact scan, per persona
  };
})();

export const AUDIT = {
  bytesPerTurn: 8_000,
  perMonthGB: (COMPANY.turnsPerMonth * 8_000) / 1e9, // 2.77
  idsRetentionDays: 365,
  questionTextRetentionDays: 30,
} as const;

/**
 * Oversharing, continuously: an org-wide link is the set of people who REDEEMED it (SharePoint search shows the file
 * only to them, F110); never "everyone". Widening shares on Confidential or pattern-matched files are held at once.
 */
export const OVERSHARING = (() => {
  const files = SOURCES.indexed[0].docs;
  const orgWide = files * 0.06; // 144,000 files with an org-wide link
  return { orgWide, heldConfidential: orgWide * 0.03 }; // 4,320 held even for redeemers until the owner reviews
})();

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
    mistake: "an org-wide link, redeemed by three HR partners",
    asker: "Tom asks about team-leader pay",
  },
  injection: "a supplier email asking the assistant to reply on case 4471 with the approver's name and recent refunds",
} as const;

/**
 * The §9 walk-through (illustrative), for enterprise-assistant/request-sequence: Priya's principal set id and size, the
 * three sources the cross-encoder keeps, and the helpdesk case that is live-checked as her. Tom's set has no
 * helpdesk-agents group, so the case is never a candidate for him.
 */
export const WALKTHROUGH = {
  principalSetId: "ps_7f3…",
  principals: 140,
  rewrite: "damaged on arrival refund over £30 approval",
  sources: ["Confluence: Damaged on arrival", "SharePoint: Refund approvals over £30", "Helpdesk: case 4471"],
  liveChecked: "case 4471",
  missingGroupForTom: "helpdesk-agents",
} as const;

/**
 * Tom's ticket (design sheet §15.3, illustrative ids), for enterprise-assistant/action-tiers: a T1 write in an internal
 * Jira project with no portal customers or contractors; the first write asks for the write scope (step-up consent);
 * dedupe by the entity property `card_id`, read back by REST after a 10 s wait (JQL search is eventually consistent).
 */
export const TICKET = {
  tool: "jira_create_issue",
  project: "WH-LEEDS",
  summary: "Scanner broken at dock 3",
  priority: "High",
  issue: "WH-1182",
  cardId: "c_51e",
  dedupeWaitS: 10,
  withdrawMin: 10,
} as const;
