import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { REVIEWS_CALLS, SEARCH_LOG, WORKER_BUDGET } from "@/components/diagrams/presets/agents-research";

// Stopping rules on deep-research-agents (Technical mechanics, "Stopping rules, cost and latency"). The customer-
// reviews worker from the kettle-refunds question searches the web. Its task sets three rules, checked after every
// search: a budget (10 tool calls, max_tool_calls in the task on multi-agent-systems), saturation (stop when a search
// adds no new source) and confidence (stop when two independent sources agree). Searches 1 to 4 find 4, 2, 1 and 0
// new sources; after each search that finds something it fetches one page, so it has made 4 + 3 = 7 calls. Search 4
// trips saturation. The budget is not reached and confidence is never met (every review is on one site), so the
// worker stops early and says so: medium confidence.
//
// Four steps: 1 search 1 and the three rules · 2 searches 2 and 3 · 3 search 4 adds nothing: saturation fires (ringed),
// with the other two rules' state · 4 the worker stops and reports at medium confidence.
//
// Layout: left, a bar chart of new sources per search (bars 64 wide at x 56 + 100 × i, 36 px per source, baseline
// y 330); right, three rule rows at y 70, 160, 250 (rule x 480 w 220, its state x 712 w 148); the outcome under them.
//
// Colour (agents legend, three tones plus neutral): bars blue (what came back), rules lime (checks), the report green;
// states that did not fire and the axis neutral.

const BASE = 330;
const PER = 36;
const BAR_W = 64;
const barX = (i: number) => 56 + 100 * i;

const bars: LayoutShape[] = SEARCH_LOG.flatMap((s, i) => {
  const step = i === 0 ? 1 : i < 3 ? 2 : 3;
  const h = s.newSources * PER;
  const bar: LayoutShape =
    h > 0
      ? {
          id: `bar${s.n}`,
          type: "cell",
          x: barX(i),
          y: BASE - h,
          w: BAR_W,
          h,
          label: `${s.newSources} new`,
          tone: AGENT_TONE.result,
          fill: "pastel",
          step,
          quiet: i > 0,
        }
      : {
          id: `bar${s.n}`,
          type: "text",
          x: barX(i) - 8,
          y: BASE - 28,
          w: BAR_W + 16,
          h: 24,
          label: "0 new",
          tone: AGENT_TONE.infra,
          step,
        };
  return [
    bar,
    {
      id: `x${s.n}`,
      type: "text" as const,
      x: barX(i) - 18,
      y: BASE + 8,
      w: BAR_W + 36,
      h: 38,
      label: `search ${s.n}\n${s.newSources > 0 ? "+ 1 fetch" : "no fetch"}`,
      tone: AGENT_TONE.infra,
      step,
      quiet: true,
    },
  ];
});

const RULE_Y = [70, 160, 250] as const;
const rule = (i: number, id: string, label: string, sub: string): LayoutShape => ({
  id,
  type: "box",
  x: 480,
  y: RULE_Y[i],
  w: 220,
  h: 64,
  label,
  sub,
  tone: AGENT_TONE.check,
  fill: "soft",
});
const state = (i: number, id: string, label: string, fired = false): LayoutShape => ({
  id,
  type: "cell",
  x: 712,
  y: RULE_Y[i],
  w: 148,
  h: 64,
  label,
  tone: fired ? AGENT_TONE.check : AGENT_TONE.infra,
  fill: fired ? "pastel" : "paper",
  step: 3,
  highlight: fired || undefined,
  quiet: !fired,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three stopping rules, checked after every search",
  width: 880,
  height: 420,
  steps: [
    { title: "Search 1 finds 4 new sources" },
    { title: "Searches 2 and 3 find 2, then 1" },
    { title: "Search 4 finds nothing new: saturation fires" },
    { title: "The worker stops and reports its confidence" },
  ],
  shapes: [
    {
      id: "chart-title",
      type: "text",
      x: 20,
      y: 130,
      w: 420,
      h: 24,
      label: "Reviews worker: new sources per search",
      tone: AGENT_TONE.infra,
    },
    { id: "axis", type: "arrow", x: 30, y: BASE, w: 410, h: 0, head: false },
    ...bars,
    rule(0, "budget", "Budget", `${WORKER_BUDGET.maxToolCalls} tool calls`),
    rule(1, "saturation", "Saturation", "a search adds nothing new"),
    rule(2, "confidence", "Confidence", "2 independent sources agree"),
    state(0, "budget-state", `${REVIEWS_CALLS} of ${WORKER_BUDGET.maxToolCalls} used\nnot reached`),
    state(1, "saturation-state", "search 4: 0 new\nstop", true),
    state(2, "confidence-state", "all reviews on\none site: not met"),
    {
      id: "report",
      type: "box",
      x: 480,
      y: 340,
      w: 380,
      h: 56,
      label: `Stop with ${WORKER_BUDGET.maxToolCalls - REVIEWS_CALLS} calls unspent`,
      sub: "report the claim at medium confidence",
      tone: AGENT_TONE.model,
      fill: "pastel",
      step: 4,
    },
  ],
};

export default spec;
