import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { BENCH } from "@/components/diagrams/presets/production-eval";

// The anatomy of a benchmark (offline-evaluation-benchmarks, Architecture). Top row, left to right: tasks (blue, data) and
// the model under test (green) both feed the harness (neutral, the code that runs them); the harness writes scores
// (lime, a check); scores fill the leaderboard (violet, a store of results). Under the row, one line per part says which
// choice inside it changes the number. Bottom row: three real task sets, sizes from the primary papers (checked 2026-11-15):
//   MMLU: 15,908 multiple-choice questions, 57 subjects, test set 14,079 (Hendrycks et al., 2020);
//   GPQA: 448 questions, the Diamond subset 198 (Rein et al., 2023);
//   SWE-bench Verified: 500 human-validated software tasks (OpenAI and the SWE-bench authors, 13 August 2024).
// Grid: top row y 30 (h 64), boxes at x 20 | 210 | 400 | 590 | 740... see X; notes y 106; examples y 214.
// Colours: blue, green, neutral, lime, violet; the harness is the accent (ring).

const shapes: LayoutShape[] = [];
const X = { tasks: 20, model: 20, harness: 270, scores: 520, board: 710 } as const;

shapes.push(
  {
    id: "tasks",
    type: "box",
    x: X.tasks,
    y: 24,
    w: 190,
    h: 60,
    label: "Tasks",
    sub: "questions and answer keys",
    tone: PROD_TONE.data,
    fill: "pastel",
  },
  {
    id: "model",
    type: "box",
    x: X.model,
    y: 124,
    w: 190,
    h: 60,
    label: "Model under test",
    sub: "weights or an API",
    tone: PROD_TONE.model,
    fill: "pastel",
  },
  {
    id: "harness",
    type: "box",
    x: X.harness,
    y: 74,
    w: 190,
    h: 60,
    label: "Harness",
    sub: "prompt, call, extract, grade",
    tone: PROD_TONE.infra,
    fill: "pastel",
    highlight: true,
  },
  {
    id: "scores",
    type: "box",
    x: X.scores,
    y: 74,
    w: 150,
    h: 60,
    label: "Scores",
    sub: "per task, then averaged",
    tone: PROD_TONE.check,
    fill: "pastel",
  },
  {
    id: "board",
    type: "box",
    x: X.board,
    y: 74,
    w: 150,
    h: 60,
    label: "Leaderboard",
    sub: "models ranked",
    tone: PROD_TONE.store,
    fill: "pastel",
  },
  { id: "a1", type: "arrow", x: 0, y: 0, from: "tasks", to: "harness" },
  { id: "a2", type: "arrow", x: 0, y: 0, from: "model", to: "harness" },
  { id: "a3", type: "arrow", x: 0, y: 0, from: "harness", to: "scores" },
  { id: "a4", type: "arrow", x: 0, y: 0, from: "scores", to: "board" },
  {
    id: "note",
    type: "text",
    x: 250,
    y: 160,
    w: 610,
    h: 36,
    label:
      "The harness is where scores quietly differ: the prompt wording, how many worked examples,\nthe sampling settings, and how the answer is pulled out of the text.",
    tone: PROD_TONE.infra,
    quiet: true,
  },
  {
    id: "head-ex",
    type: "text",
    x: 20,
    y: 224,
    w: 300,
    h: 20,
    label: "Three real task sets (sizes from the papers)",
    tone: PROD_TONE.infra,
    quiet: true,
  }
);

const examples = [
  {
    id: "mmlu",
    label: "MMLU",
    sub: `${n(BENCH.mmlu.questions)} questions · ${BENCH.mmlu.subjects} subjects`,
    tag: "knowledge",
  },
  { id: "gpqa", label: "GPQA Diamond", sub: `${BENCH.gpqa.diamond} expert-written questions`, tag: "hard science" },
  {
    id: "swe",
    label: "SWE-bench Verified",
    sub: `${BENCH.sweVerified.tasks} software tasks, tests decide`,
    tag: "coding agents",
  },
] as const;
examples.forEach((e, i) =>
  shapes.push({
    id: `ex-${e.id}`,
    type: "box",
    x: 20 + i * 290,
    y: 254,
    w: 270,
    h: 60,
    label: e.label,
    sub: e.sub,
    tone: PROD_TONE.data,
    fill: "soft",
  })
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The anatomy of a benchmark: tasks, harness, scores, leaderboard",
  width: 880,
  height: 340,
  shapes,
};

export default spec;
