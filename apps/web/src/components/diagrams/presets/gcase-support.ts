// Constants and arithmetic for the "Design a Customer Support Agent" case study (/genai-system-design/case-studies/
// customer-support-agent; design sheet SYSTEM-DESIGN/plans/genai-design/design/customer-support-agent.md). Specs in
// assets/diagrams/animated/support-agent/ import from here, so the page, the figures and the tests share one set of
// numbers. Brightpost's traffic, corpus and refund case come from presets/production.ts, rag.ts and agents.ts.
//
// Model prices are list prices as of November 2026 (Anthropic pricing page, read 17 November 2026): a mid-size model
// (Claude Sonnet 5.5 class) 2.00 USD per million input tokens, 0.10 cached, 10.00 output; a small model (Claude Haiku
// 5.5 class) 0.10 input, 0.01 cached, 0.50 output. Everything else is ILLUSTRATIVE unless a comment names a source.
// The prices are read from gcase-answer.ts PRICES, the one price table for all eleven case studies.

import { BRIGHTPOST } from "./agents";
import { PRICES as SITE_PRICES } from "./gcase-answer";
import { TRAFFIC } from "./production";
import { CORPUS } from "./rag";

/** USD per million tokens, as of November 2026 (the input, cached and output columns of gcase-answer PRICES). */
export const PRICES = {
  mid: { input: SITE_PRICES.mid.input, cached: SITE_PRICES.mid.cached, output: SITE_PRICES.mid.output }, // 2.00 / 0.10 / 10.00
  small: { input: SITE_PRICES.small.input, cached: SITE_PRICES.small.cached, output: SITE_PRICES.small.output }, // 0.10 / 0.01 / 0.50
} as const;

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;

/** Volume: Brightpost's 200,000 messages a day, 4 customer messages a conversation. */
export const VOLUME = (() => {
  const messagesPerDay = TRAFFIC.requestsPerDay; // 200,000
  const messagesPerConversation = 4;
  const conversationsPerDay = messagesPerDay / messagesPerConversation; // 50,000
  // Turn shapes (illustrative): 50% no tool, 35% one tool, 15% two tools.
  const shapes = { none: 0.5, one: 0.35, two: 0.15 } as const;
  const toolCallsPerMessage = shapes.one * 1 + shapes.two * 2; // 0.65
  const modelCallsPerMessage = 1 + toolCallsPerMessage; // 1.65
  const peakCallsPerSecond = Math.round(TRAFFIC.peakPerSecond * modelCallsPerMessage); // 12 × 1.65 ≈ 20
  return {
    messagesPerDay,
    messagesPerConversation,
    conversationsPerDay,
    shapes,
    toolCallsPerMessage,
    modelCallsPerMessage,
    modelCallsPerDay: messagesPerDay * modelCallsPerMessage, // 330,000
    peakCallsPerSecond,
  };
})();

/**
 * The context window of one agent call (first call of turn 3, damaged-item case). 2,700 stable tokens are cached.
 * Evidence is fetched only where the procedure needs it: on half of calls, so 1,000 evidence tokens on average and
 * 5,000 tokens a first call on average.
 */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions", tokens: 1_200, stable: true },
    { id: "tools", label: "Tool definitions", tokens: 1_000, stable: true },
    { id: "procedure", label: "Procedure", tokens: 500, stable: true },
    { id: "case", label: "Case state", tokens: 400, stable: false },
    { id: "evidence", label: "Evidence", tokens: 2_000, stable: false },
    { id: "turns", label: "Recent turns", tokens: 600, stable: false },
    { id: "tool-results", label: "Tool results", tokens: 250, stable: false },
    { id: "message", label: "New message", tokens: 50, stable: false },
  ] as const;
  const total = blocks.reduce((s, b) => s + b.tokens, 0); // 6,000
  const stable = blocks.filter((b) => b.stable).reduce((s, b) => s + b.tokens, 0); // 2,700
  const evidenceShare = 0.5;
  const averageChanging = total - stable - 2_000 * (1 - evidenceShare); // 3,300 − 1,000 = 2,300
  return { blocks, total, stable, changing: total - stable, averageChanging, averageTotal: stable + averageChanging };
})();

/** Output sizes: a chat reply and a tool call. */
export const OUTPUT = { reply: 120, toolCall: 30, followUpNewTokens: 300 } as const;

/**
 * Cost of one customer message by turn shape, on the mid-size model. A follow-up call reads the first call's prompt from
 * the cache, and pays a cache-write premium (0.25 × the input price) on the tokens newly cached.
 *   no tool:   2,700 cached + 2,300 new + 120 out                         = 0.00027 + 0.0046 + 0.0012 = 0.00607
 *   one tool:  first call 0.00027 + 0.0046 + 30 out (0.0003)              = 0.00517
 *              follow-up: 5,000 cached + 300 new + 120 out                 = 0.0005 + 0.0006 + 0.0012 = 0.0023
 *              cache write: 2,300 × 0.25 × 2.00 per million                = 0.00115 → 0.00862
 *   two tools: 0.00517 + tool follow-up (5,300 cached + 300 new + 30 out = 0.00143)
 *              + reply follow-up (5,600 cached + 300 new + 120 out = 0.00236) + writes 2,600 × 0.50 / M (0.0013) = 0.0103
 *   average:   0.5 × 0.00607 + 0.35 × 0.00862 + 0.15 × 0.0103 ≈ 0.0076
 */
export const COST = (() => {
  const m = PRICES.mid;
  const s = PRICES.small;
  const writePremium = 0.25 * m.input;
  const first = (out: number) =>
    usd(CONTEXT.stable, m.cached) + usd(CONTEXT.averageChanging, m.input) + usd(out, m.output);
  const followUp = (cached: number, out: number) =>
    usd(cached, m.cached) + usd(OUTPUT.followUpNewTokens, m.input) + usd(out, m.output);
  const noTool = first(OUTPUT.reply);
  const oneTool =
    first(OUTPUT.toolCall) + followUp(CONTEXT.averageTotal, OUTPUT.reply) + usd(CONTEXT.averageChanging, writePremium);
  const twoTools =
    first(OUTPUT.toolCall) +
    followUp(CONTEXT.averageTotal + OUTPUT.followUpNewTokens, OUTPUT.toolCall) +
    followUp(CONTEXT.averageTotal + 2 * OUTPUT.followUpNewTokens, OUTPUT.reply) +
    usd(CONTEXT.averageChanging + OUTPUT.followUpNewTokens, writePremium);
  const sh = VOLUME.shapes;
  const agentPerMessage = sh.none * noTool + sh.one * oneTool + sh.two * twoTools;
  const router = usd(600, s.input) + usd(50, s.output); // 0.000085
  // Illustrative flat price for the small classifier call. Its tokens (600 in + 10 out on the small model) price to
  // 0.000065 USD, but deriving it would move perDay from 1,801 to 1,794 USD, which gcase-gateway imports and the
  // gateway page prints; kept until both pages move together.
  const badActor = 0.0001;
  const supervisor = usd(2_800, s.input) + usd(40, s.output); // 0.0003
  const retrieval = 0.5 * 0.0005; // half of messages; 0.0005 a query for the reranker, illustrative (not a token price)
  const smallPerMessage = router + badActor + supervisor + retrieval;
  const handoffCall = usd(2_500, m.input) + usd(100, m.output); // mid: 0.005 + 0.001 = 0.006
  const handoffSummary = 0.32 * handoffCall; // 0.32 hand-offs a conversation: 0.00192
  // Small model over the whole conversation (illustrative ≈ 7,000 tokens in, 200 out): 0.0007 + 0.0001 = 0.0008.
  const conversationJudge = usd(7_000, s.input) + usd(200, s.output);
  const perConversation =
    VOLUME.messagesPerConversation * (agentPerMessage + smallPerMessage) + handoffSummary + conversationJudge;
  const noCacheNoTool = usd(CONTEXT.averageTotal, m.input) + usd(OUTPUT.reply, m.output); // 0.0112
  return {
    noTool,
    oneTool,
    twoTools,
    agentPerMessage,
    router,
    supervisor,
    smallPerMessage,
    handoffCall,
    handoffSummary,
    conversationJudge,
    perConversation, // ≈ 0.036
    perDay: perConversation * VOLUME.conversationsPerDay, // ≈ 1,800
    noCacheNoTool,
    cacheSaving: 1 - noTool / noCacheNoTool, // ≈ 46%
  };
})();

/**
 * One turn, in ms. Decode at 80 tokens a second (12.5 ms a token, illustrative for a mid-size model behind an API);
 * first token 400 ms (Brightpost's target, LATENCY.firstTokenMs). Router and retrieval run in parallel.
 *   question: 30 + 250 + 20 + 400 + 1,500 + 300                               = 2,500
 *   kettle (two tools): 300 + 775 + 200 + 775 + 200 + 400 + 1,500 + 300      = 4,450
 */
export const LATENCY_MS = (() => {
  const msPerToken = 12.5;
  const firstToken = 400;
  const gateway = 30; // case load; the gateway's own spans are 5.6 ms p50 inside it (gcase-gateway OVERHEAD)
  const router = 250;
  const search = 60;
  const rerank = 150;
  const assemble = 20;
  const toolCall = firstToken + OUTPUT.toolCall * msPerToken; // 775
  const reply = OUTPUT.reply * msPerToken; // 1,500
  const supervisor = 300;
  const orderApi = 200;
  const policy = 200;
  const preModel = gateway + Math.max(router, search + rerank) + assemble; // 300
  const question = preModel + firstToken + reply + supervisor; // 2,500
  const oneTool = preModel + toolCall + orderApi + firstToken + reply + supervisor; // 3,475
  const kettle = preModel + toolCall + orderApi + toolCall + policy + firstToken + reply + supervisor; // 4,450
  const revise = 700;
  // Superseded by LATENCY_P95 (p50 + root-sum-square of stage spreads, the later pages' method). This hand-built tail
  // (first token doubled on each of 3 calls: 6,350) is kept only because tests pin it; the page no longer prints it.
  const p95 = kettle + revise + 3 * firstToken;
  return {
    msPerToken,
    firstToken,
    gateway,
    router,
    search,
    rerank,
    assemble,
    toolCall,
    reply,
    supervisor,
    orderApi,
    policy,
    preModel,
    question,
    oneTool,
    kettle,
    revise,
    p95,
  };
})();

const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);
const rss = (xs: readonly number[]) => Math.sqrt(sum(xs.map((x) => x * x)));

/**
 * p95 of the kettle turn from per-stage spreads (P5), as gcase-voice, gcase-answer and gcase-gateway do. Spread =
 * p95 − p50 of a stage, ILLUSTRATIVE. Stages assumed independent: p95 ≈ p50 + √(Σ spread²); the stage-sum bound
 * (every stage at its own p95 at once) is given beside it.
 *   stage (p50 / spread, ms): case load 30 / 10; router 250 / 150 (retrieval 210 runs beside it, off the critical
 *   path); assemble 20 / 10; three first tokens 400 / 400 each; two tool-call decodes 375 / 94 each; get_order
 *   200 / 300; policy 200 / 200; reply decode 1,500 / 375; supervisor 300 / 200.
 *   Σ spread² = 100 + 22,500 + 100 + 3 × 160,000 + 2 × 8,836 + 90,000 + 40,000 + 140,625 + 40,000 = 830,997
 *   p95 = 4,450 + √830,997 = 4,450 + 912 ≈ 5,362 ms; stage-sum bound 4,450 + 2,633 = 7,083 ms.
 *   A revise (5% of replies) adds LATENCY_MS.revise = 700 on top: ≈ 6,062 ms.
 * N3 target: any turn p95 ≤ 7,000 ms. Met by the p95 (5,362, 6,062 with a revise); the stage-sum bound is 83 ms over,
 * so the target holds only while slow stages do not all coincide; the 3 × peak load test checks that.
 */
export const LATENCY_P95 = (() => {
  const L = LATENCY_MS;
  const decode = OUTPUT.toolCall * L.msPerToken; // 375
  const stages = [
    { id: "case", label: "Case load", p50: L.gateway, spread: 10 },
    { id: "router", label: "Router (retrieval beside it)", p50: L.router, spread: 150 },
    { id: "assemble", label: "Assemble context", p50: L.assemble, spread: 10 },
    { id: "first-1", label: "First token, call 1", p50: L.firstToken, spread: 400 },
    { id: "tool-1", label: "Tool call 1 decode", p50: decode, spread: 94 },
    { id: "order", label: "get_order", p50: L.orderApi, spread: 300 },
    { id: "first-2", label: "First token, call 2", p50: L.firstToken, spread: 400 },
    { id: "tool-2", label: "Tool call 2 decode", p50: decode, spread: 94 },
    { id: "policy", label: "Gate and policy service", p50: L.policy, spread: 200 },
    { id: "first-3", label: "First token, call 3", p50: L.firstToken, spread: 400 },
    { id: "reply", label: "Reply decode", p50: L.reply, spread: 375 },
    { id: "supervisor", label: "Supervisor check", p50: L.supervisor, spread: 200 },
  ] as const;
  const p50 = sum(stages.map((x) => x.p50)); // 4,450 = LATENCY_MS.kettle
  const spreadSquares = sum(stages.map((x) => x.spread * x.spread)); // 830,997
  const tail = Math.sqrt(spreadSquares); // ≈ 911.6
  const p95 = p50 + rss(stages.map((x) => x.spread)); // ≈ 5,362
  const spreadSum = sum(stages.map((x) => x.spread)); // 2,633
  const stageSum = p50 + spreadSum; // 7,083
  const targetMs = 7_000; // N3: any turn p95
  return {
    stages,
    p50,
    spreadSquares,
    tail,
    p95,
    spreadSum,
    stageSum,
    withRevise: p95 + L.revise, // ≈ 6,062
    targetMs,
    meets: p95 + L.revise <= targetMs,
    boundOverMs: stageSum - targetMs, // 83
  };
})();

/**
 * The kettle turn as event times, ms from the message reaching the chat gateway (p50; the request-sequence figure):
 *   case loaded 30 → router done (damaged_item) 280 → context assembled, call 1 starts 300 → get_order asked 1,075
 *   ("Checking your order…") → order back 1,275 → request_refund asked 2,050 → policy answers 2,250 → reply decoded
 *   4,150 → supervisor passes, reply sent 4,450.
 */
export const KETTLE_TIMELINE = (() => {
  const L = LATENCY_MS;
  const caseLoaded = L.gateway; // 30
  const routed = caseLoaded + L.router; // 280
  const callStarts = L.preModel; // 300
  const getOrderAsked = callStarts + L.toolCall; // 1,075
  const orderBack = getOrderAsked + L.orderApi; // 1,275
  const refundAsked = orderBack + L.toolCall; // 2,050
  const policyBack = refundAsked + L.policy; // 2,250
  const replyDecoded = policyBack + L.firstToken + L.reply; // 4,150
  const sent = replyDecoded + L.supervisor; // 4,450 = LATENCY_MS.kettle
  return { caseLoaded, routed, callStarts, getOrderAsked, orderBack, refundAsked, policyBack, replyDecoded, sent };
})();

/** Retrieval: Brightpost's 3,600 chunks → hybrid top 40 → reranked → the passages that fit 2,000 tokens. */
export const RETRIEVAL = {
  chunks: CORPUS.chunks,
  candidates: 40,
  budgetTokens: 2_000,
  passageTokens: CORPUS.chunkTokens, // 400
  kept: 2_000 / CORPUS.chunkTokens, // 5
  rerankMs: 150,
  rerankUsd: 0.0005,
  indexMB: CORPUS.indexMB, // 22
} as const;

/** Refunds and approvals (illustrative shares). */
export const REFUNDS = (() => {
  const autoLimit = BRIGHTPOST.approvalLimit; // £30
  const perDay = VOLUME.conversationsPerDay * 0.2 * 0.3; // 3,000
  const approvals = perDay * 0.25; // 750
  const approvalMinutes = 2.5;
  return {
    autoLimit,
    perDay,
    approvals,
    approvalMinutes,
    approvalHours: (approvals * approvalMinutes) / 60, // 31.25
    breakerMultiple: 3,
    smallRefund: 18, // the mug in the refund-guard figure
    kettle: BRIGHTPOST.price, // £42
    orderId: BRIGHTPOST.orderId,
    refundId: BRIGHTPOST.refundId,
  };
})();

/**
 * Resolution funnel (illustrative): 50,000 conversations → 34,000 without a hand-off → 31,500 with no repeat contact
 * about the same order or issue in 7 days → 30,000 with the end state confirmed = 60%, of which 700 needed an approval.
 */
export const FUNNEL = (() => {
  const conversations = VOLUME.conversationsPerDay;
  const noHandoff = 34_000;
  const noRepeat = 31_500;
  const confirmed = 30_000;
  const withApproval = 700;
  return {
    conversations,
    noHandoff,
    noRepeat,
    confirmed,
    withApproval,
    byAgentAlone: confirmed - withApproval, // 29,300
    handedOff: conversations - noHandoff, // 16,000
    rate: confirmed / conversations, // 0.6
    closedRate: noHandoff / conversations, // 0.68
  };
})();

/**
 * Release gates and rollout (design sheet §13; thresholds illustrative):
 *   retrieval: recall@5 ≥ 90% on 300 labelled queries, measured with and without the reranker;
 *   refunds: pass^4 ≥ 90% on 150 refund scenarios, each run 4 times (end state: ledger and reply agree);
 *   rollout per intent: shadow for 2 weeks → assist (staff approve drafts; gate: 90% sent unedited) → autonomous;
 *   every release canaries at 5% of 50,000 conversations = 2,500 a day.
 */
export const GATES = {
  recallAt5: 0.9,
  retrievalQueries: 300,
  passHat4: 0.9,
  refundScenarios: 150,
  runsPerScenario: 4,
  shadowWeeks: 2,
  assistUnedited: 0.9,
  canaryShare: 0.05,
  canaryPerDay: 0.05 * VOLUME.conversationsPerDay, // 2,500
} as const;
