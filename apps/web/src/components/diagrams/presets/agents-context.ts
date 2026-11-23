// Constants for the context-engineering figures (assets/diagrams/animated/agents/preload-vs-just-in-time and
// context-rot) on genai-system-design/context-engineering. Brightpost names and numbers come from ./agents and the
// help-centre facts from ./rag (400-token chunks, top 5 = 2,000 tokens), so they match the page's RAG-track figures
// (rag/ctx-budget, rag/ctx-select-order-compress), which use the same kettle conversation.

import { LATENCY_S, TOOLS } from "./agents";
import { CORPUS, TOP_K } from "./rag";

/** Two turns of the kettle conversation: the refund question, then a turn that needs no knowledge. */
export const KNOWLEDGE_TURNS = {
  kettle: "Kettle refund turn",
  thanks: '"Thanks, that\'s all"',
} as const;

/**
 * Preloading against just-in-time retrieval, per turn. Illustrative latency from LATENCY_S.
 * - Preload: before every model call the builder runs the search on the customer's raw message and adds the top 5
 *   chunks: 5 × 400 = 2,000 tokens, on both turns. One model call per turn. Kettle turn: 0.3 s search + 1.5 s call =
 *   1.8 s.
 * - Just in time: no chunks up front. On the kettle turn the model calls search_help("damaged item refund") with its
 *   own query, and the tool returns the top 3 chunks: 3 × 400 = 1,200 tokens (the same three that survive selection
 *   in rag/ctx-select-order-compress). Two model calls and one tool call: 1.5 + 0.3 + 1.5 = 3.3 s. On the "thanks"
 *   turn the model fetches nothing: 0 tokens, one call.
 * - Over both turns: preload 2 × 2,000 = 4,000 chunk tokens and 2 model calls; just in time 1,200 tokens and 3 calls.
 */
export const PRELOAD_JIT = {
  chunkTokens: CORPUS.chunkTokens,
  preload: { chunks: TOP_K, tokens: TOP_K * CORPUS.chunkTokens },
  jit: { chunks: 3, tokens: 3 * CORPUS.chunkTokens, call: TOOLS.searchHelp.call },
  latency: {
    preload: Math.round((LATENCY_S.toolCall + LATENCY_S.modelCall) * 10) / 10,
    jit: Math.round((2 * LATENCY_S.modelCall + LATENCY_S.toolCall) * 10) / 10,
  },
  totals: {
    preload: { tokens: 2 * TOP_K * CORPUS.chunkTokens, calls: 2 },
    jit: { tokens: 3 * CORPUS.chunkTokens, calls: 3 },
  },
} as const;
