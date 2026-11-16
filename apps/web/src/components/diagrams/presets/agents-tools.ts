// Constants for the tool-use figures (assets/diagrams/animated/agents/function-calling, tool-schema,
// parallel-tool-calls, tool-choice-modes, mcp-architecture) on genai-system-design/tool-use-and-mcp. Brightpost names
// and the shared latencies come from ./agents; this file adds only what the tool-use page needs.

import { HAPPY_PATH_COUNTS, LATENCY_S, TOOLS } from "./agents";

/**
 * Tokens the Claude API adds as its tool-use system prompt whenever a request carries `tools`, for Claude Opus 5.5 with
 * `tool_choice` auto or none. Source: Claude API docs, "Tool use with Claude", Pricing table (checked 2026-11-15).
 */
export const TOOL_PROMPT_TOKENS = 286;

/**
 * Tokens per Brightpost tool definition (name + description + input schema). Illustrative, not measured: a short
 * description and one to three parameters each. Total 80 + 90 + 110 + 130 = 410.
 */
export const TOOL_DEF_TOKENS = [
  { name: TOOLS.getOrder.name, tokens: 80 },
  { name: TOOLS.searchHelp.name, tokens: 90 },
  { name: TOOLS.createRefund.name, tokens: 110 },
  { name: TOOLS.sendEmail.name, tokens: 130 },
] as const;

const defTotal = TOOL_DEF_TOKENS.reduce((s, t) => s + t.tokens, 0);

/**
 * What the tools cost on every request, and over the happy path's five model calls:
 * per request 286 + 410 = 696 tokens; five calls × 696 = 3,480 input tokens before the conversation itself.
 */
export const TOOL_TOKENS = {
  definitions: defTotal,
  perRequest: TOOL_PROMPT_TOKENS + defTotal,
  happyPath: (TOOL_PROMPT_TOKENS + defTotal) * HAPPY_PATH_COUNTS.modelCalls,
} as const;

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * get_order and search_help asked one after the other against both in one model response (illustrative LATENCY_S):
 * - one after the other: 1.5 + 0.3 + 1.5 + 0.3 = 3.6 s before the next model call starts;
 * - both at once: 1.5 + max(0.3, 0.3) = 1.8 s; saved 1.8 s (one model call and one tool wait).
 * - whole happy path: 5 × 1.5 + 4 × 0.3 = 8.7 s against 4 × 1.5 + 3 × 0.3 = 6.9 s.
 */
export const PARALLEL = {
  sequential: r1(2 * (LATENCY_S.modelCall + LATENCY_S.toolCall)),
  parallel: r1(LATENCY_S.modelCall + LATENCY_S.toolCall),
  saved: r1(LATENCY_S.modelCall + LATENCY_S.toolCall),
  happyPathSequential: LATENCY_S.happyPath,
  happyPathParallel: r1(
    (HAPPY_PATH_COUNTS.modelCalls - 1) * LATENCY_S.modelCall + (HAPPY_PATH_COUNTS.toolCalls - 1) * LATENCY_S.toolCall
  ),
} as const;

/**
 * Brightpost's three MCP servers in the mcp-architecture figure: what each exposes and how its client reaches it.
 * The orders server runs on the same machine (stdio); the other two are remote (Streamable HTTP).
 */
export const MCP_SERVERS = [
  {
    id: "orders",
    label: "Orders server",
    exposes: `${TOOLS.getOrder.name}, ${TOOLS.createRefund.name}`,
    transport: "stdio",
  },
  { id: "help", label: "Help centre server", exposes: `${TOOLS.searchHelp.name} + articles`, transport: "HTTP" },
  { id: "email", label: "Email server", exposes: `${TOOLS.sendEmail.name} + templates`, transport: "HTTP" },
] as const;
