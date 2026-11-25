// Constants for the conversation-short-term-memory figures (assets/diagrams/animated/agents/sliding-window and
// buffer-vs-summary) on genai-system-design/conversation-short-term-memory. Brightpost names and numbers come from
// ./agents; the request prefix (instructions and tool definitions) from ./agents-mcp and ./agents-tools; the help
// passages search_help returns from ./agents-context. This file adds only the chat itself: 13 messages before the
// model writes message 14, and what each history policy keeps of them. Every token count is illustrative.

import { BRIGHTPOST, TOOLS } from "./agents";
import { PRELOAD_JIT } from "./agents-context";
import { OVERLOAD } from "./agents-mcp";
import { TOOL_TOKENS } from "./agents-tools";

export type Speaker = "customer" | "assistant";

export interface ChatMessage {
  n: number;
  who: Speaker;
  /** What the message says (assistant messages include their tool calls in brackets). */
  text: string;
  /** Two-to-seven-character gist drawn under the message number in the figures. */
  gist: string;
  /** Tokens, illustrative. An assistant message counts its tool calls and tool results too. */
  tokens: number;
  /** Of `tokens`, how many are a tool result (drawn blue in buffer-vs-summary). */
  resultTokens?: number;
}

/** The white kettle the customer asks about: a price that is not the refund (illustrative). */
export const WHITE_KETTLE_PRICE = 44;

const price = `£${BRIGHTPOST.price}`;

/**
 * The chat, messages 1–13. The model writes message 14 next. Token working (illustrative):
 * - 2: get_order call 20 + result 60 + reply 50 = 130.
 * - 4: search_help returns the top 3 help passages, 3 × 400 = 1,200 tokens (PRELOAD_JIT.jit), + create_refund call and
 *   the "held for approval" result 60 + reply 40 = 1,300.
 * - The other eleven messages are 10–40 tokens of plain text.
 * Sum: 30 + 130 + 30 + 1,300 + 20 + 40 + 20 + 20 + 10 + 20 + 20 + 30 + 20 = 1,690.
 */
export const CHAT: readonly ChatMessage[] = [
  { n: 1, who: "customer", text: BRIGHTPOST.message, gist: BRIGHTPOST.orderId, tokens: 30 },
  {
    n: 2,
    who: "assistant",
    text: `[${TOOLS.getOrder.call}] Sorry about that. Order ${BRIGHTPOST.orderId}: ${BRIGHTPOST.item}, ${price}, delivered ${BRIGHTPOST.delivered}. I'll start a refund.`,
    gist: price,
    tokens: 130,
  },
  {
    n: 3,
    who: "customer",
    text: "Thanks. Please email me about this, not text. I'm at work.",
    gist: "email",
    tokens: 30,
  },
  {
    n: 4,
    who: "assistant",
    text: `[${TOOLS.searchHelp.call}, ${TOOLS.createRefund.call}] Damaged items get a full refund. Refunds over £${BRIGHTPOST.approvalLimit} need a support agent, so yours is waiting for approval.`,
    gist: "held",
    tokens: 1_300,
    resultTokens: PRELOAD_JIT.jit.tokens,
  },
  { n: 5, who: "customer", text: "OK. Do you sell the same kettle in white?", gist: "white?", tokens: 20 },
  {
    n: 6,
    who: "assistant",
    text: `Yes, the white one is £${WHITE_KETTLE_PRICE} and in stock.`,
    gist: `£${WHITE_KETTLE_PRICE}`,
    tokens: 40,
  },
  { n: 7, who: "customer", text: "How long is delivery to Leeds?", gist: "Leeds?", tokens: 20 },
  { n: 8, who: "assistant", text: "Two to three working days.", gist: "2–3 d", tokens: 20 },
  { n: 9, who: "customer", text: "Do you price match?", gist: "match?", tokens: 10 },
  { n: 10, who: "assistant", text: "No, sorry, we don't price match.", gist: "no", tokens: 20 },
  { n: 11, who: "customer", text: "Fair enough. I'll order the white one later.", gist: "later", tokens: 20 },
  {
    n: 12,
    who: "assistant",
    text: `Good news: the support agent approved your refund at ${BRIGHTPOST.approvedAt}.`,
    gist: BRIGHTPOST.approvedAt,
    tokens: 30,
  },
  { n: 13, who: "customer", text: "Great. Send me the confirmation, please.", gist: "confirm", tokens: 20 },
];

/** The sliding window keeps the last 8 messages; the summary policy keeps the last 4 verbatim. */
export const WINDOW_N = 8;
export const RECENT_N = 4;

/** The model writes messages 2, 4, …, 14; before writing message t it sees messages 1 … t − 1. */
export const windowAt = (turn: number, n = WINDOW_N) => {
  const last = turn - 1;
  return { first: Math.max(1, last - n + 1), last };
};

const sumTokens = (from: number, to: number) =>
  CHAT.filter((m) => m.n >= from && m.n <= to).reduce((s, m) => s + m.tokens, 0);

/**
 * What the model sees at turn 14 under each policy (illustrative). Every request also carries the same prefix:
 * instructions 2,000 (OVERLOAD.instructions) + tool definitions 696 (TOOL_TOKENS.perRequest) = 2,696.
 * - Full history: messages 1–13 = 1,690; request 2,696 + 1,690 = 4,386.
 * - Last 8: messages 6–13 = 40 + 20 + 20 + 10 + 20 + 20 + 30 + 20 = 180; request 2,876 (history −89 %).
 * - Summary + last 4: a 120-token summary of messages 1–9 + messages 10–13 (20 + 20 + 30 + 20 = 90) = 210; request
 *   2,906 (history −88 %). Writing the summary is one more model call that reads messages 1–9 (1,600 tokens).
 */
export const POLICY = {
  turn: 14,
  prefix: { instructions: OVERLOAD.instructions, tools: TOOL_TOKENS.perRequest },
  full: { first: 1, last: 13, tokens: sumTokens(1, 13) },
  window: { first: 6, last: 13, tokens: sumTokens(6, 13) },
  summary: {
    tokens: 120,
    covers: { first: 1, last: 9, tokens: sumTokens(1, 9) },
    recent: { first: 10, last: 13, tokens: sumTokens(10, 13) },
  },
  /** Message 4's tool result: the three help passages, 1,200 of the history's 1,690 tokens. */
  helpResult: PRELOAD_JIT.jit.tokens,
} as const;

export const POLICY_TOTALS = {
  prefix: POLICY.prefix.instructions + POLICY.prefix.tools,
  full: POLICY.prefix.instructions + POLICY.prefix.tools + POLICY.full.tokens,
  window: POLICY.prefix.instructions + POLICY.prefix.tools + POLICY.window.tokens,
  summary: POLICY.prefix.instructions + POLICY.prefix.tools + POLICY.summary.tokens + POLICY.summary.recent.tokens,
} as const;
