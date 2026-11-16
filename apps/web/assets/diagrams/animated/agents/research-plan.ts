import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { RESEARCH } from "@/components/diagrams/presets/agents-multi";
import { SCOPE, SUB_QUESTIONS } from "@/components/diagrams/presets/agents-research";

// The research plan on deep-research-agents (Core concepts, "Planning and decomposing the question"). Brightpost's
// support manager asks "Why are kettle refunds up this month?" (RESEARCH, the same question as orchestrator-workers on
// multi-agent-systems). Before any search the lead agent fixes the scope (which days, and "up" as a rate), splits the
// question into three sub-questions, one per worker, gives each a source and a "done when", and saves the plan to
// memory so it survives a long run.
//
// Four steps: 1 the question reaches the lead · 2 the scope is fixed (ringed) · 3 three sub-questions, each with its
// source and tools and when it is done · 4 the plan is saved outside the context window.
//
// Layout: row A (y 40) the question (x 20), the lead (x 330) and the saved plan (x 640); row B (y 150) the scope box
// across the canvas; row C (y 246) three sub-question cards at x 20, 313, 606 (w 254); row D (y 336) each card's
// source and tools; row E (y 384) its stop condition. Vertical arrows are drawn by coordinates so they stay straight.
//
// Colour (agents legend, four tones plus neutral): the question and sub-questions orange (the task), the lead and the
// scope green (the model's plan), sources and tools teal (actions), the saved plan violet (memory), "done when" neutral.

const COL_X = [20, 313, 606] as const;
const COL_W = 254;
const mid = (i: number) => COL_X[i] + COL_W / 2;
const ROW = { a: 40, b: 150, c: 246, d: 336, e: 384 } as const;

const down = (id: string, x: number, y1: number, y2: number, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: y1,
  w: 0,
  h: y2 - y1,
  step,
});

const columns: LayoutShape[] = SUB_QUESTIONS.flatMap((q, i) => [
  down(`a-${q.id}`, mid(i), ROW.b + 56, ROW.c, 3),
  {
    id: `sq-${q.id}`,
    type: "box",
    x: COL_X[i],
    y: ROW.c,
    w: COL_W,
    h: 64,
    label: q.short,
    sub: `worker ${i + 1}`,
    tone: AGENT_TONE.task,
    fill: "soft",
    step: 3,
  },
  down(`t-${q.id}`, mid(i), ROW.c + 64, ROW.d, 3),
  {
    id: `src-${q.id}`,
    type: "box",
    x: COL_X[i] + 22,
    y: ROW.d,
    w: COL_W - 44,
    h: 40,
    label: q.tools,
    sub: q.source,
    tone: AGENT_TONE.action,
    fill: "pastel",
    step: 3,
    quiet: true,
  },
  {
    id: `done-${q.id}`,
    type: "text",
    x: COL_X[i],
    y: ROW.e,
    w: COL_W,
    h: 22,
    label: `done when: ${q.doneWhen}`,
    tone: AGENT_TONE.infra,
    step: 3,
    quiet: true,
  },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A research plan: one question, a fixed scope and three sub-questions",
  width: 880,
  height: 420,
  steps: [
    { title: "The question reaches the lead agent" },
    { title: "The lead fixes the scope before searching" },
    { title: "Three sub-questions, each with a source and a stop" },
    { title: "The plan is saved outside the context window" },
  ],
  shapes: [
    {
      id: "question",
      type: "box",
      x: 20,
      y: ROW.a,
      w: 250,
      h: 70,
      label: "Why are kettle refunds\nup this month?",
      sub: RESEARCH.asker,
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    {
      id: "lead",
      type: "box",
      x: 330,
      y: ROW.a,
      w: 220,
      h: 70,
      label: "Lead agent",
      sub: "plans before it searches",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    { id: "a-q", type: "arrow", x: 0, y: 0, from: "question", to: "lead", packet: true },
    down("a-scope", 440, ROW.a + 70, ROW.b, 2),
    {
      id: "scope",
      type: "box",
      x: 20,
      y: ROW.b,
      w: 840,
      h: 56,
      label: "Scope, fixed before any search",
      sub: `${SCOPE.period} · "up" means ${SCOPE.measure}`,
      tone: AGENT_TONE.model,
      fill: "soft",
      step: 2,
      highlight: true,
    },
    ...columns,
    {
      id: "plan",
      type: "box",
      x: 640,
      y: ROW.a,
      w: 220,
      h: 70,
      label: "Plan in memory",
      sub: "scope, sub-questions, stops",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 4,
    },
    { id: "a-plan", type: "arrow", x: 0, y: 0, from: "lead", to: "plan", label: "save", step: 4 },
  ],
};

export default spec;
