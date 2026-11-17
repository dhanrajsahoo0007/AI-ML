// Constants and arithmetic for the "Design a Customer Support Agent" case study (/genai-system-design/case-studies/
// customer-support-agent; design sheet SYSTEM-DESIGN/plans/genai-design/design/customer-support-agent.md). Specs in
// assets/diagrams/animated/support-agent/ import from here, so the page, the figures and the tests share one set of
// numbers. Brightpost's traffic, corpus and refund case come from presets/production.ts, rag.ts and agents.ts.
//
// Model prices are list prices as of November 2026 (Anthropic pricing page, read 17 November 2026): a mid-size model
// (Claude Sonnet 5.5 class) 2.00 USD per million input tokens, 0.10 cached, 10.00 output; a small model (Claude Haiku
// 5.5 class) 0.10 input, 0.01 cached, 0.50 output. Everything else is ILLUSTRATIVE unless a comment names a source.

import { BRIGHTPOST } from "./agents";
import { TRAFFIC } from "./production";
import { CORPUS } from "./rag";

/** USD per million tokens, as of November 2026. */
export const PRICES = {
  mid: { input: 2.0, cached: 0.1, output: 10.0 },
  small: { input: 0.1, cached: 0.01, output: 0.5 },
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
  const badActor = 0.0001; // illustrative small classifier call
  const supervisor = usd(2_800, s.input) + usd(40, s.output); // 0.0003
  const retrieval = 0.5 * 0.0005; // half of messages; 0.0005 a query, illustrative
  const smallPerMessage = router + badActor + supervisor + retrieval;
  const handoffSummary = 0.32 * 0.006; // 0.32 hand-offs a conversation × one mid-size call
  const conversationJudge = 0.0008; // small model over the whole conversation, illustrative ≈ 7,000 tokens
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
    handoffSummary,
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
  const gateway = 30;
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
  const p95 = kettle + revise + 3 * firstToken; // first token doubled on each of 3 calls: 6,350
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
