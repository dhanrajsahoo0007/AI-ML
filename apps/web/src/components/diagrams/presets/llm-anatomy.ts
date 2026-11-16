// Constants for "Anatomy of an LLM Application" only (llm/anatomy-stack and llm/anatomy-request-budget). The running
// example is the agents track's Brightpost refund (presets/agents.ts): Customer 1847 writes "My kettle arrived
// cracked. It's order 4471. Can I get my money back?"; five model calls, four tool calls (get_order, search_help,
// create_refund, send_email) and one approval, because £42 is over the £30 limit. Every timing and price is read from
// the preset that already owns it; this file only adds them up per layer. All of them are ILLUSTRATIVE (round numbers
// chosen to teach, not measurements), and both figures say so.
//
// Where each number comes from:
//   model calls      HAPPY_PATH_COUNTS.modelCalls = 5 (agents.ts); each priced and timed like one Brightpost answer:
//                    1,500 ms (LATENCY.fullAnswerMs, production.ts) and $0.0069 at the shared list price of $2 in and
//                    $10 out per million tokens (PER_REQUEST.realtime, production-batch.ts: 2,200 × 2 + 250 × 10, ÷ 1 M).
//                    A simplification: a real loop's prompt grows a little with every call.
//   gateway          key and limits 3 ms + cache lookup 3 ms (OVERHEAD, production-gateway.ts).
//   prompt, context  2 ms to assemble each prompt (LATENCY_MS.buildPrompt, rag.ts) × 5 calls.
//   retrieval        search_help: embed the query 20 ms + vector search 15 ms (LATENCY_MS, rag.ts).
//   tools            the other three tools at 300 ms each (LATENCY_S.toolCall, agents.ts).
//   guardrails       input check 20 ms + output check 10 ms (OVERHEAD, production-gateway.ts).
//   eval, observe    0 ms on the customer's path (the 5 ms log is written after the reply); a model judge grades 5 %
//                    of requests (SAMPLE_RATE, production-online.ts) at $0.00885 a grade (GRADER, production-eval.ts:
//                    2,450 × $3 + 100 × $15, ÷ 1 M), so 0.05 × 0.00885 = $0.00044 per request on average.
//
// Working:
//   time on the path = 6 + 10 + 35 + 7,500 + 900 + 30 + 0 = 8,481 ms; the model is 7,500 ÷ 8,481 = 88.4 %.
//   money            = 5 × 0.0069 = $0.0345 for the model + $0.0004425 for the judge = $0.0349425, about $0.035;
//                      the model is 0.0345 ÷ 0.0349425 = 98.7 %.
//   The gateway, prompt assembly, the tools and the guardrails cost nothing per request here: they run on servers
//   Brightpost pays for by the month, not by the token. Embedding a 4-token query costs well under $0.00001.
//   Not counted: the support agent's approval at 10:20, which waits on a person (minutes, not milliseconds).

import { AGENT_TONE, BRIGHTPOST, HAPPY_PATH_COUNTS, LATENCY_S } from "./agents";
import { LATENCY } from "./production";
import { PER_REQUEST } from "./production-batch";
import { GRADER } from "./production-eval";
import { OVERHEAD } from "./production-gateway";
import { SAMPLE_RATE } from "./production-online";
import { LATENCY_MS } from "./rag";
import type { LayoutTone } from "../types";

/** The seven layers, in the order the stepper adds them, with the tone both figures give them. */
export const LAYERS = [
  { id: "gateway", label: "Gateway", tone: AGENT_TONE.infra },
  { id: "context", label: "Prompt and context", tone: AGENT_TONE.infra },
  { id: "retrieval", label: "Retrieval", tone: AGENT_TONE.memory },
  { id: "model", label: "Model and serving", tone: AGENT_TONE.model },
  { id: "tools", label: "Tools and agents", tone: AGENT_TONE.action },
  { id: "guardrails", label: "Guardrails", tone: AGENT_TONE.check },
  { id: "observe", label: "Evaluation, observability", tone: AGENT_TONE.check },
] as const satisfies readonly { id: string; label: string; tone: LayoutTone }[];

type LayerId = (typeof LAYERS)[number]["id"];

/** Each customer may send 20 messages a minute (cloud/resilience/ai-security, step 7 of animated/cloud/ai-guardrail-path). */
export const PER_CUSTOMER_LIMIT = 20;

const CALLS = HAPPY_PATH_COUNTS.modelCalls;
const OTHER_TOOLS = HAPPY_PATH_COUNTS.toolCalls - 1;

/** Milliseconds on the customer's path, a short note on where they go, and dollars per request, by layer. */
export const BUDGET: Record<LayerId, { ms: number; msNote: string; usd: number; usdNote: string }> = {
  gateway: {
    ms: OVERHEAD.keyMs + OVERHEAD.cacheMs,
    msNote: "key, limits, cache",
    usd: 0,
    usdNote: "own servers",
  },
  context: {
    ms: CALLS * LATENCY_MS.buildPrompt,
    msNote: `${CALLS} prompts × ${LATENCY_MS.buildPrompt} ms`,
    usd: 0,
    usdNote: "tokens billed below",
  },
  retrieval: {
    ms: LATENCY_MS.embedQuery + LATENCY_MS.vectorSearch,
    msNote: "embed + search",
    usd: 0,
    usdNote: "≈ $0 · a 4-token query",
  },
  model: {
    ms: CALLS * LATENCY.fullAnswerMs,
    msNote: `${CALLS} calls × 1.5 s`,
    usd: CALLS * PER_REQUEST.realtime,
    usdNote: `${CALLS} × $${PER_REQUEST.realtime.toFixed(4)}`,
  },
  tools: {
    ms: OTHER_TOOLS * Math.round(LATENCY_S.toolCall * 1000),
    msNote: `${OTHER_TOOLS} tools × ${Math.round(LATENCY_S.toolCall * 1000)} ms`,
    usd: 0,
    usdNote: "own APIs",
  },
  guardrails: {
    ms: OVERHEAD.inputGuardMs + OVERHEAD.outputGuardMs,
    msNote: "in + out checks",
    usd: 0,
    usdNote: "hosted classifier",
  },
  observe: {
    ms: 0,
    msNote: "after the reply",
    usd: SAMPLE_RATE * GRADER.judgeCost,
    usdNote: `judge on ${Math.round(SAMPLE_RATE * 100)} %`,
  },
};

const sum = (pick: (b: (typeof BUDGET)[LayerId]) => number) => LAYERS.reduce((a, l) => a + pick(BUDGET[l.id]), 0);

/** Totals and the model's share of each (8,481 ms, 88 %; $0.0349, 99 %). */
export const TOTALS = (() => {
  const ms = sum((b) => b.ms);
  const usd = sum((b) => b.usd);
  if (ms !== 8_481) throw new Error(`anatomy budget should be 8,481 ms, got ${ms}`);
  if (Math.round(usd * 1e7) !== 349_425) throw new Error(`anatomy budget should be $0.0349425, got ${usd}`);
  return {
    ms,
    usd,
    modelMsShare: BUDGET.model.ms / ms,
    modelUsdShare: BUDGET.model.usd / usd,
    approvedAt: BRIGHTPOST.approvedAt,
  } as const;
})();
