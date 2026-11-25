import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { BENCH } from "@/components/diagrams/presets/agents-coding";

// How a SWE-bench-style benchmark grades a coding agent (coding-agents, Deep dive "Benchmarks: SWE-bench and its
// limits"), with running example B turned into a task: the agent gets the issue and the repository at the commit
// before the fix, with the fix's test held back. It returns a patch. A grader applies the patch in a fresh container,
// adds the held-back tests and runs two sets: FAIL_TO_PASS (the test the real fix made pass) and PASS_TO_PASS (tests
// that passed before and must still pass). A task counts as resolved only if both sets pass. Facts: Jimenez et al.
// (2023) and the SWE-bench Verified dataset card (500 tasks), as on harness-engineering and agentic-ai-evaluation.
//
// Five steps: 1 the task · 2 the agent returns a patch · 3 the hidden tests · 4 the first edit alone: not resolved
// (ringed) · 5 both edits: resolved, and the score.
//
// Layout: three columns (what the agent gets x 20, what it returns x 290, the grader x 560 inside a dotted group);
// the two patches and their verdicts in two rows under them; the score as a line of text at the bottom.
//
// Colour (agents legend, four tones plus neutral): the issue orange; the agent and its patches green; the grader's
// test sets and the pass lime; the failing verdict red (the only thing that breaks).

const A_X = 20;
const A_W = 210;
const B_X = 290;
const B_W = 210;
const C_X = 560;
const C_W = 280;
const ROW_H = 56;
const fmt = (n: number) => n.toLocaleString("en-GB");

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const heading = (id: string, x: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 12,
  w,
  h: 24,
  label,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "An issue, the agent's patch, and the hidden tests that decide",
  width: 870,
  height: 420,
  steps: [
    { title: "The task: an issue and a repo snapshot" },
    { title: "The agent returns a patch" },
    { title: "The grader runs tests the agent never saw" },
    { title: "First edit only: not resolved" },
    { title: "Both edits: resolved" },
  ],
  groups: [
    {
      id: "grader",
      title: "Grader: hidden from the agent",
      tone: AGENT_TONE.check,
      x: C_X - 12,
      y: 40,
      w: C_W + 24,
      h: 200,
    },
  ],
  shapes: [
    heading("hA", A_X, A_W, "What the agent gets", 1),
    box("issue", A_X, 44, A_W, ROW_H, "Issue text", "drops the last line of a CSV", AGENT_TONE.task, 1),
    box("repo", A_X, 116, A_W, ROW_H, "Repo at the base commit", "the fix's test held back", AGENT_TONE.infra, 1),

    heading("hB", B_X, B_W, "What it returns", 2),
    box("agent", B_X, 44, B_W, ROW_H, "Agent and its harness", "any scaffold, any tools", AGENT_TONE.model, 2),
    box("patch", B_X, 116, B_W, ROW_H, "Patch", `a diff to ${CODING_TASK.file}`, AGENT_TONE.model, 2),
    arrow("a-issue", "issue", "agent", 2),
    arrow("a-repo", "repo", "agent", 2),
    arrow("a-patch", "agent", "patch", 2),

    box("apply", C_X, 72, C_W, 48, "Fresh container: patch + tests", undefined, AGENT_TONE.infra, 3),
    {
      id: "f2p",
      type: "cell",
      x: C_X,
      y: 128,
      w: C_W,
      h: 44,
      label: `FAIL_TO_PASS: ${BENCH.failToPass[0]}`,
      sub: "must now pass",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 3,
    },
    {
      id: "p2p",
      type: "cell",
      x: C_X,
      y: 180,
      w: C_W,
      h: 44,
      label: `PASS_TO_PASS: the other ${BENCH.passToPass}`,
      sub: "must still pass",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 3,
    },
    {
      ...arrow("a-apply", "patch", "apply", 3),
      via: [
        [530, 144],
        [530, 96],
      ],
    },

    {
      id: "two",
      type: "text",
      x: A_X,
      y: 256,
      w: A_W,
      h: 104,
      label: "Two patches for\nthe same task",
      step: 4,
    },
    box("pA", B_X, 260, B_W, 44, "Patch A", "first edit only", AGENT_TONE.model, 4),
    box(
      "vA",
      C_X,
      260,
      C_W,
      44,
      "Not resolved",
      `"${CODING_TASK.secondFailure}" fails (PASS_TO_PASS)`,
      AGENT_TONE.failure,
      4,
      { highlight: true }
    ),
    arrow("a-A", "pA", "vA", 4),
    box("pB", B_X, 316, B_W, 44, "Patch B", "both edits", AGENT_TONE.model, 5),
    box(
      "vB",
      C_X,
      316,
      C_W,
      44,
      "Resolved",
      `1 + ${BENCH.passToPass} = ${CODING_TASK.testsTotal} tests pass`,
      AGENT_TONE.check,
      5
    ),
    arrow("a-B", "pB", "vB", 5),
    {
      id: "score",
      type: "text",
      x: A_X,
      y: 376,
      w: C_X + C_W - A_X,
      h: 28,
      label: `Score = tasks resolved ÷ ${fmt(BENCH.verifiedTasks)} tasks on SWE-bench Verified`,
      step: 5,
    },
  ],
};

export default spec;
