import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { SAMPLED_PER_DAY, SAMPLE_RATE } from "@/components/diagrams/presets/production-online";

// Online evaluation as an architecture (online-production-evaluation, Architecture figure). The customer is answered on
// the normal path; a copy of the trace is sampled at 5 % (10,000 of 200,000 a day, presets/production-online.ts), put
// on a queue, and graded later by judges; scores land in a store that feeds a dashboard and an alert rule.
// Steps: 1 the request is answered as usual · 2 the trace is copied, after the answer · 3 the sampler keeps 5 % ·
// 4 judges grade from the queue, asynchronously · 5 scores feed the dashboard · 6 an alert rule watches it.
// Nodes never move; no edge is replaced. Layout (880 x 330): top row y 70 at x 80, 315, 550, 785; bottom row y 250,
// right to left: judges 785, store 550, dashboard 315, alerts 80.
// Colours (PROD_TONE, four tones plus neutral): customer orange, model green, sampler and queue neutral, judges and
// dashboard and alerts lime (checks), store violet.
// Fact check: the shape (sample production traces, grade them asynchronously with evaluators, show scores and alert) is
// the one LangSmith's online-evaluation docs describe (checked November 2026); the 5 % rate is Brightpost's choice.

const spec: DiagramSpec = {
  title: "Online evaluation: sample, judge asynchronously, show, alert",
  width: 880,
  height: 330,
  steps: [
    { title: "The customer is answered as usual" },
    { title: "A copy of the trace leaves after the answer" },
    { title: "The sampler keeps 5 %" },
    { title: "Judges grade later, off the request path" },
    { title: "Scores feed a dashboard" },
    { title: "An alert rule watches the trend" },
  ],
  zones: [],
  nodes: [
    {
      id: "user",
      label: "Customers",
      sub: `${TRAFFIC.peakPerSecond} req/s peak`,
      icon: "users",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 80,
      y: 70,
      w: 128,
    },
    {
      id: "model",
      label: "Assistant",
      sub: "answers now",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 315,
      y: 70,
      w: 150,
    },
    {
      id: "sampler",
      label: "Sampler",
      sub: `keeps ${SAMPLE_RATE * 100} %`,
      icon: "router",
      tone: PROD_TONE.infra,
      accent: true,
      x: 550,
      y: 70,
      w: 128,
    },
    {
      id: "queue",
      label: "Queue",
      sub: `${n(SAMPLED_PER_DAY)} a day`,
      icon: "queue",
      tone: PROD_TONE.infra,
      x: 785,
      y: 70,
      w: 150,
    },
    {
      id: "judges",
      label: "Judges",
      sub: "score each trace",
      icon: "chart",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 785,
      y: 250,
      w: 150,
    },
    {
      id: "store",
      label: "Score store",
      sub: "id + score",
      icon: "database",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 550,
      y: 250,
      w: 132,
    },
    {
      id: "dash",
      label: "Dashboard",
      sub: "pass rate by hour",
      icon: "chart",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 315,
      y: 250,
      w: 150,
    },
    {
      id: "alerts",
      label: "Alert rule",
      sub: "under floor",
      icon: "bell",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 80,
      y: 250,
      w: 128,
    },
  ],
  edges: [
    { from: "user", to: "model", label: "ask, answer", packet: true },
    { from: "model", to: "sampler", label: "trace copy", dashed: true, packet: true, step: 2 },
    { from: "sampler", to: "queue", label: "5 % kept", packet: true, step: 3 },
    { from: "queue", to: "judges", label: "later", dashed: true, packet: true, step: 4 },
    { from: "judges", to: "store", label: "scores", packet: true, step: 4 },
    { from: "store", to: "dash", label: "read", packet: true, step: 5 },
    { from: "dash", to: "alerts", label: "rule", packet: true, step: 6 },
  ],
};

export default spec;
