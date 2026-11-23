import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { LATENCY_MS, PROMPT, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "When agentic RAG is not worth it": the price of the loop. One basic RAG pass against an agent that takes three
// search rounds before it answers, on Brightpost's main question. Three rows: model calls and searches, time to the
// full answer, and input tokens the model reads (the main driver of cost). Every number is derived from LATENCY_MS
// and PROMPT in presets/rag.ts and is illustrative, as those are.
//
// AGENT is local to this figure; the lead may move it into presets/rag.ts. Working:
// - A search = embed the query + vector search = 20 + 15 = 35 ms.
// - Basic RAG: 1 search, build the prompt (2 ms), 1 model call writing the full answer (1,500 ms):
//   35 + 2 + 1,500 = 1,537 ms ≈ 1.5 s. Input: PROMPT.total = 2,215 tokens.
// - Agent: 3 rounds, each a model call that only writes a short tool call (taken as the time to first token, 400 ms)
//   plus a search (35 ms), then the final answer call: 3 × (400 + 35) + 2 + 1,500 = 2,807 ms ≈ 2.8 s.
// - Agent input: every call re-reads the conversation so far. Call k (0 to 3) reads 200 instructions + 15 question
//   + k × 2,000 tokens of chunks: 215 + 2,215 + 4,215 + 6,215 = 12,860 tokens, 5.8 × the basic pass. (Tool
//   definitions and the model's own reasoning would add more; left out.)
//
// Tones (two plus neutral): model calls green, searches violet. Layout: row labels x 20..190, bars from x 200 at up to
// 520 wide (scaled to the larger value in each row), totals at x 732.

const AGENT = { rounds: 3, decideMs: LATENCY_MS.firstToken } as const;

const searchMs = LATENCY_MS.embedQuery + LATENCY_MS.vectorSearch;
const answerMs = LATENCY_MS.buildPrompt + LATENCY_MS.fullAnswer;
const basicMs = searchMs + answerMs;
const agentMs = AGENT.rounds * (AGENT.decideMs + searchMs) + answerMs;

const baseTokens = PROMPT.instructionTokens + PROMPT.questionTokens;
const agentCalls = Array.from({ length: AGENT.rounds + 1 }, (_, k) => baseTokens + k * PROMPT.contextTokens);
const agentTokens = agentCalls.reduce((s, t) => s + t, 0);

const BAR_X = 200;
const BAR_W = 520;
const TOTAL_X = 732;
const BAR_H = 30;

interface Segment {
  value: number;
  tone: LayoutTone;
  fill?: LayoutShape["fill"];
  label?: string;
}

/** A bar of touching cells from BAR_X, each `value × scale` wide; edges are rounded once so neighbours never overlap. */
function bar(id: string, y: number, segments: Segment[], scale: number): LayoutShape[] {
  let run = 0;
  const edges = [BAR_X, ...segments.map((s) => Math.round(BAR_X + (run += s.value) * scale))];
  return segments.map((s, i) => ({
    id: `${id}-${i}`,
    type: "cell",
    x: edges[i],
    y,
    w: edges[i + 1] - edges[i],
    h: BAR_H,
    label: s.label,
    tone: s.tone,
    fill: s.fill,
  }));
}

const text = (id: string, x: number, y: number, w: number, label: string, tone?: LayoutTone): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone,
});

/** A row of small call cells (LLM or search) with a 4-unit gap. */
function calls(id: string, y: number, kinds: ("llm" | "search")[]): LayoutShape[] {
  let x = BAR_X;
  return kinds.map((k, i) => {
    const w = k === "llm" ? 52 : 64;
    const shape: LayoutShape = {
      id: `${id}-${i}`,
      type: "cell",
      x,
      y,
      w,
      h: BAR_H,
      label: k === "llm" ? "LLM" : "search",
      tone: k === "llm" ? RAG_TONE.answer : RAG_TONE.store,
      fill: k === "llm" ? "pastel" : "soft",
    };
    x += w + 4;
    return shape;
  });
}

const agentKinds = Array.from({ length: AGENT.rounds }, () => ["llm", "search"] as const).flat();

const ROW = { calls: 16, time: 136, tokens: 256 } as const;
const msScale = BAR_W / Math.max(basicMs, agentMs);
const tokScale = BAR_W / Math.max(PROMPT.total, agentTokens);
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One basic RAG pass against an agent with three search rounds",
  width: 860,
  height: 372,
  shapes: [
    // Row 1: calls
    text("h-calls", 20, ROW.calls, 820, "Model calls and searches"),
    text("l-calls-b", 20, ROW.calls + 30, 170, "Basic RAG", RAG_TONE.infra),
    text("l-calls-a", 20, ROW.calls + 70, 170, `Agent, ${AGENT.rounds} rounds`, RAG_TONE.infra),
    ...calls("c-b", ROW.calls + 25, ["search", "llm"]),
    ...calls("c-a", ROW.calls + 65, [...agentKinds, "llm"]),
    text("t-calls-b", TOTAL_X, ROW.calls + 30, 120, "1 model call"),
    text("t-calls-a", TOTAL_X, ROW.calls + 70, 120, `${AGENT.rounds + 1} model calls`),

    // Row 2: time to the full answer
    text("h-time", 20, ROW.time, 820, "Time to the full answer (illustrative)"),
    text("l-time-b", 20, ROW.time + 30, 170, "Basic RAG", RAG_TONE.infra),
    text("l-time-a", 20, ROW.time + 70, 170, `Agent, ${AGENT.rounds} rounds`, RAG_TONE.infra),
    ...bar(
      "m-b",
      ROW.time + 25,
      [
        { value: searchMs, tone: RAG_TONE.store },
        { value: answerMs, tone: RAG_TONE.answer, fill: "pastel", label: `answer ${fmt(LATENCY_MS.fullAnswer)} ms` },
      ],
      msScale
    ),
    ...bar(
      "m-a",
      ROW.time + 65,
      [
        ...Array.from({ length: AGENT.rounds }, (): Segment[] => [
          { value: AGENT.decideMs, tone: RAG_TONE.answer, label: `${AGENT.decideMs} ms` },
          { value: searchMs, tone: RAG_TONE.store },
        ]).flat(),
        { value: answerMs, tone: RAG_TONE.answer, fill: "pastel", label: `answer ${fmt(LATENCY_MS.fullAnswer)} ms` },
      ],
      msScale
    ),
    text("t-time-b", TOTAL_X, ROW.time + 30, 120, `≈ ${secs(basicMs)}`),
    text("t-time-a", TOTAL_X, ROW.time + 70, 120, `≈ ${secs(agentMs)}`),

    // Row 3: input tokens
    text("h-tok", 20, ROW.tokens, 820, "Input tokens the model reads (cost)"),
    text("l-tok-b", 20, ROW.tokens + 30, 170, "Basic RAG", RAG_TONE.infra),
    text("l-tok-a", 20, ROW.tokens + 70, 170, `Agent, ${AGENT.rounds} rounds`, RAG_TONE.infra),
    ...bar(
      "k-b",
      ROW.tokens + 25,
      [{ value: PROMPT.total, tone: RAG_TONE.answer, label: fmt(PROMPT.total) }],
      tokScale
    ),
    ...bar(
      "k-a",
      ROW.tokens + 65,
      agentCalls.map((t) => ({ value: t, tone: RAG_TONE.answer, label: t > 1_000 ? fmt(t) : undefined })),
      tokScale
    ),
    text("t-tok-b", TOTAL_X, ROW.tokens + 30, 120, fmt(PROMPT.total)),
    text("t-tok-a", TOTAL_X, ROW.tokens + 70, 120, `${fmt(agentTokens)} (${(agentTokens / PROMPT.total).toFixed(1)}×)`),
  ],
};

export default spec;
