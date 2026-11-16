// Constants for the prompting-reasoning-models figures (assets/diagrams/animated/agents/prompt-for-reasoning-vs-chat,
// interleaved-thinking and reasoning-budget). The Brightpost names and numbers come from ./agents; the prompt token
// counts, thinking token counts, output speed and the low-effort skip are illustrative, and every figure that shows
// them says so. The output price is Claude Opus 5.5's list price (Anthropic pricing page, checked 2026-11-16).
//
// The story: the Brightpost refund agent moves from a chat model to a reasoning model. Its old prompt spelled out the
// steps, asked for step-by-step reasoning and carried three worked conversations. The new prompt states the goal, the
// rules, what "done" means and the format, and leaves depth to the effort setting. With thinking on, the model thinks
// between tool calls; the harness passes every thinking block back unchanged, including across the approval pause.

import { BRIGHTPOST, HAPPY_PATH, TOOLS } from "./agents";

const limit = BRIGHTPOST.approvalLimit;

// ── Figure 1: the prompt, rewritten ─────────────────────────────────────────────────────────────────────────────

/** What happens to a line of the chat-model prompt when the agent moves to a reasoning model. */
export type RewriteAction = "keep" | "replace" | "config" | "cut";

/** One row of the rewrite: the chat-model line, the reasoning-model line, and the move between them. */
export interface RewriteRow {
  key: string;
  action: RewriteAction;
  /** Word drawn on the arrow between the two columns. */
  move: string;
  chat: { label: string; sub: string; tokens: number };
  reasoning: { label: string; sub: string; tokens: number };
}

/** Rows in the order the prompt is sent. Token counts illustrative. */
export const REWRITE: readonly RewriteRow[] = [
  {
    key: "goal",
    action: "keep",
    move: "sharpen",
    chat: { label: "Role and goal", sub: "You are Brightpost support. Help the customer.", tokens: 40 },
    reasoning: {
      label: "Goal and what done means",
      sub: "Resolve the request: refund or a clear no, by email",
      tokens: 60,
    },
  },
  {
    key: "recipe",
    action: "replace",
    move: "replace",
    chat: {
      label: "Step-by-step recipe",
      sub: `1. ${TOOLS.getOrder.name}  2. ${TOOLS.searchHelp.name}  3. decide  4. …`,
      tokens: 220,
    },
    reasoning: {
      label: "Success criteria",
      sub: "Before replying: amount = order, policy cited, email sent",
      tokens: 70,
    },
  },
  {
    key: "cot",
    action: "config",
    move: "to the API",
    chat: { label: "“Think step by step”", sub: "Write your reasoning in <thinking> tags", tokens: 30 },
    reasoning: { label: "effort: medium", sub: "A request parameter, not words in the prompt", tokens: 0 },
  },
  {
    key: "examples",
    action: "cut",
    move: "cut",
    chat: { label: "Three worked conversations", sub: "Each one walks through the steps", tokens: 540 },
    reasoning: { label: "No examples to start", sub: "Add one only if the format drifts", tokens: 0 },
  },
  {
    key: "rules",
    action: "keep",
    move: "keep",
    chat: { label: "Rules", sub: `Refunds over £${limit} wait for a support agent`, tokens: 60 },
    reasoning: { label: "Rules", sub: `Refunds over £${limit} wait. Only the customer's own orders`, tokens: 70 },
  },
  {
    key: "format",
    action: "keep",
    move: "keep",
    chat: { label: "Format", sub: "Plain text, under 80 words", tokens: 20 },
    reasoning: { label: "Format", sub: "Plain text, under 80 words", tokens: 20 },
  },
];

/** Prompt totals: chat 40 + 220 + 30 + 540 + 60 + 20 = 910; reasoning 60 + 70 + 0 + 0 + 70 + 20 = 220. */
export const REWRITE_TOTALS = {
  chat: REWRITE.reduce((s, r) => s + r.chat.tokens, 0),
  reasoning: REWRITE.reduce((s, r) => s + r.reasoning.tokens, 0),
} as const;

// ── Figures 2 and 3: thinking per model call, at three effort levels ────────────────────────────────────────────

export type Effort = "low" | "medium" | "high";

/**
 * Thinking tokens for each of the five model calls of HAPPY_PATH, per effort level (illustrative). The first call,
 * which reads the new message, carries the most; calls that only pass a result on may skip thinking (0), as
 * Anthropic's "Steering thinking" page describes. At low effort the model skips search_help (call 2 does not happen:
 * the low row has 4 model calls, 3 tool calls), the risk Anthropic notes for low effort on longer agent prompts.
 * - low:    220 + 80 + 0 + 0            = 300 thinking, 4 calls, 3 tool calls
 * - medium: 420 + 180 + 260 + 0 + 60    = 920 thinking, 5 calls, 4 tool calls (the interleaved-thinking figure)
 * - high:   1,100 + 420 + 760 + 120 + 200 = 2,600 thinking, 5 calls, 4 tool calls
 */
export const THINKING_PER_CALL: Record<Effort, readonly number[]> = {
  low: [220, 80, 0, 0],
  medium: [420, 180, 260, 0, 60],
  high: [1100, 420, 760, 120, 200],
};

/** Visible output (tool-call arguments plus the reply) per effort level, illustrative: effort changes it little. */
export const VISIBLE_TOKENS: Record<Effort, number> = { low: 380, medium: 400, high: 430 };

/** Tool calls per effort level: low skips search_help. */
export const TOOL_CALLS: Record<Effort, number> = { low: 3, medium: 4, high: 4 };

/** Claude Opus 5.5 output price, $ per million tokens (list price, checked 2026-11-16). Thinking is billed as output. */
export const OUTPUT_PRICE = 20;

/** Output speed in tokens per second, illustrative. */
export const OUTPUT_SPEED = 100;

/** Refunds per day, illustrative, for the daily cost in the prose. */
export const REFUNDS_PER_DAY = 10_000;

const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);

/**
 * Derived per effort level:
 * - thinking: low 300, medium 920, high 2,600
 * - output = thinking + visible: low 680, medium 1,320, high 3,030
 * - cost = output × $20 / 1M: low $0.0136, medium $0.0264, high $0.0606
 * - wait from thinking = thinking ÷ 100 tokens/s: low 3 s, medium 9.2 s, high 26 s
 */
export const EFFORT_ROWS = (["low", "medium", "high"] as const).map((effort) => {
  const thinking = sum(THINKING_PER_CALL[effort]);
  const output = thinking + VISIBLE_TOKENS[effort];
  return {
    effort,
    thinking,
    visible: VISIBLE_TOKENS[effort],
    output,
    toolCalls: TOOL_CALLS[effort],
    modelCalls: THINKING_PER_CALL[effort].length,
    cost: (output * OUTPUT_PRICE) / 1e6,
    waitS: thinking / OUTPUT_SPEED,
  };
});

/** One row of the interleaved-thinking trace: HAPPY_PATH with the medium thinking count of that call. */
export const INTERLEAVED = HAPPY_PATH.map((turn, i) => ({ ...turn, thinkingTokens: THINKING_PER_CALL.medium[i] }));
