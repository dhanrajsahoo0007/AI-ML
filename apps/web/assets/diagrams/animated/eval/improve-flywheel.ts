import type { DiagramSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { WEEK } from "@/components/diagrams/presets/production-improve";

// The improvement flywheel (continuous-improvement-pipeline, Architecture). Production writes traces; failures are mined
// from them, become test cases in the evaluation set, one change is made against them, it is tested offline, shown to a
// small share of real traffic, and promoted; production writes the next traces.
//
// Seven steps, one stage each: 1 production writes a trace for every request · 2 failure mining: read the thumbs-down
// and hand-off traces and name the failures (50 read) · 3 the failures become test cases (14 added to the 200-ticket
// golden set) · 4 one change aimed at the biggest failure · 5 offline evaluation: the candidate runs on the whole set ·
// 6 canary: a small share of real traffic · 7 promote, and the loop closes into production. Nodes never move.
//
// Layout (880 × 430): top row y 100, x 105 · 325 · 545 · 765 (w 150): traces, failure mining, dataset, change; bottom
// row y 340: production x 105, canary x 435, offline evaluation x 765. Gaps between nodes are 70 px or more so the pills
// fit. Colours (PROD_TONE, four tones plus neutral): traces and dataset blue (data), mining neutral (analysis), the
// change green (the model and its prompt), offline evaluation and canary lime (checks), production orange (traffic).
// Fact check: the loop (log → analyse failures → build tests → change → evaluate → staged release) is the standard
// practice described in Husain's and Shankar et al.'s evaluation writing and in staged-rollout docs; the counts come
// from presets/production-improve.ts and are illustrative.

const spec: DiagramSpec = {
  title: "The improvement flywheel",
  width: 880,
  height: 430,
  steps: [
    { title: "Production writes a trace for every request" },
    { title: "Read the failures and name them" },
    { title: "Turn failures into test cases" },
    { title: "Make one change aimed at the biggest failure" },
    { title: "Test it offline on the whole set" },
    { title: "Show it to a small share of real traffic" },
    { title: "Promote it, and the loop closes" },
  ],
  zones: [],
  nodes: [
    {
      id: "prod",
      label: "Production",
      sub: "live answers",
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 105,
      y: 340,
      w: 150,
    },
    {
      id: "traces",
      label: "Traces",
      sub: "every request",
      icon: "trace",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 105,
      y: 100,
      w: 150,
    },
    {
      id: "mining",
      label: "Failure mining",
      sub: "read, name, count",
      icon: "search",
      tone: PROD_TONE.infra,
      accent: true,
      step: 2,
      x: 325,
      y: 100,
      w: 150,
    },
    {
      id: "dataset",
      label: "Test set",
      sub: `${DATASETS.goldenSet} + new cases`,
      icon: "file",
      tone: PROD_TONE.data,
      fill: "pastel",
      step: 3,
      x: 545,
      y: 100,
      w: 150,
    },
    {
      id: "change",
      label: "One change",
      sub: "prompt or check",
      icon: "prompt",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 4,
      x: 765,
      y: 100,
      w: 150,
    },
    {
      id: "offline",
      label: "Offline eval",
      sub: "vs the baseline",
      icon: "chart",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 5,
      x: 765,
      y: 340,
      w: 150,
    },
    {
      id: "canary",
      label: "Canary",
      sub: "5 % of traffic",
      icon: "flag",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 6,
      x: 435,
      y: 340,
      w: 150,
    },
  ],
  edges: [
    { from: "prod", to: "traces", label: "log", packet: true },
    { from: "traces", to: "mining", label: `${WEEK.sample} read`, packet: true, step: 2 },
    { from: "mining", to: "dataset", label: `+${WEEK.newCases} cases`, packet: true, step: 3 },
    { from: "dataset", to: "change", label: "aim at", packet: true, step: 4 },
    { from: "change", to: "offline", label: "candidate", packet: true, step: 5 },
    { from: "dataset", to: "offline", label: "run on", dashed: true, labelAt: 0.35, step: 5 },
    { from: "offline", to: "canary", label: "passes", packet: true, step: 6 },
    { from: "canary", to: "prod", label: "promote", packet: true, step: 7 },
  ],
};

export default spec;
