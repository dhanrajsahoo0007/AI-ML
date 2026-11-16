import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { PGE_CRITERIA, PGE_ROUNDS } from "@/components/diagrams/presets/agents-pge";

// The planner-generator-evaluator loop on the bug-fix coding task (planner-generator-evaluator-loops, Architecture).
// The issue "Order import drops the last line of a CSV file" goes to a planner, which writes a spec with four
// acceptance criteria. The generator gets the spec; the evaluator gets the same criteria straight from the planner,
// never from the generator. The generator hands over a diff and a report; the evaluator runs the tests itself, finds
// one failure and sends a critique back; round 2 passes.
//
// Six steps: 1 the planner turns the issue into a spec · 2 the evaluator gets the same criteria · 3 the generator
// hands over a diff and a report · 4 the evaluator runs all 18 tests: one fails · 5 a critique goes back · 6 round 2
// passes and the run ends. Nodes never move.
//
// Layout: four columns. x 75: the issue (row 80). x 255: the planner (row 80). x 580: the generator (row 80), the
// evaluator (row 290) and the result (row 420). x 790: the test runner (row 290). The planner → evaluator edge runs
// down column 255 and right along row 290, so it never crosses the two generator ⇄ evaluator edges, which are bent
// apart through x 520 (down: diff) and x 640 (up: critique). The evaluator ⇄ test runner gap is narrow, so its label
// is one word.
//
// Colour (agents legend, four tones plus neutral): the issue orange, the planner, the generator and the result green
// (model calls and the answer), the evaluator lime (a check, and the accent), the test runner teal (a tool).

const COL = { issue: 75, planner: 255, main: 580, tests: 790 } as const;
const ROW = { top: 80, eval: 290, done: 420 } as const;

const spec: DiagramSpec = {
  title: "Planner, generator, evaluator: three roles and what each hands on",
  width: 880,
  height: 470,
  steps: [
    { title: "The planner turns the issue into a spec" },
    { title: "The evaluator gets the same criteria" },
    { title: "The generator hands over a diff and a report" },
    { title: "The evaluator runs the tests itself" },
    { title: "A critique goes back to the generator" },
    { title: "Round 2 passes and the run ends" },
  ],
  zones: [],
  nodes: [
    {
      id: "issue",
      label: "Issue",
      sub: "last CSV line lost",
      icon: "ticket",
      tone: AGENT_TONE.task,
      variant: "glyph",
      x: COL.issue,
      y: ROW.top,
    },
    {
      id: "planner",
      label: "Planner",
      sub: "what and why",
      icon: "plan",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: COL.planner,
      y: ROW.top,
      w: 150,
    },
    {
      id: "generator",
      label: "Generator",
      sub: `edits ${CODING_TASK.file}`,
      icon: "robot",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: COL.main,
      y: ROW.top,
      w: 180,
    },
    {
      id: "evaluator",
      label: "Evaluator",
      sub: "sceptical, fresh",
      icon: "shield-check",
      tone: AGENT_TONE.check,
      accent: true,
      step: 2,
      x: COL.main,
      y: ROW.eval,
      w: 180,
    },
    {
      id: "tests",
      label: "Test runner",
      sub: `${CODING_TASK.testsTotal} tests`,
      icon: "test-tube",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 4,
      x: COL.tests,
      y: ROW.eval,
      w: 140,
    },
    {
      id: "done",
      label: "Ready for review",
      sub: PGE_ROUNDS.verdict2,
      icon: "git-branch",
      tone: AGENT_TONE.model,
      step: 6,
      x: COL.main,
      y: ROW.done,
      w: 200,
    },
  ],
  edges: [
    // Step 1: the issue becomes a spec with acceptance criteria.
    { from: "issue", to: "planner", label: "issue", packet: true },
    {
      from: "planner",
      to: "generator",
      label: "spec + criteria",
      packet: true,
      delay: 0.8,
    },

    // Step 2: the evaluator gets the criteria from the planner, not from the generator.
    {
      from: "planner",
      to: "evaluator",
      label: `same ${PGE_CRITERIA.length} criteria`,
      packet: true,
      via: [[COL.planner, ROW.eval]],
      labelAt: 0.3,
      step: 2,
    },

    // Step 3: the artefact and the generator's own report.
    {
      from: "generator",
      to: "evaluator",
      label: "diff + report",
      packet: true,
      via: [[520, 185]],
      labelAt: 0.5,
      step: 3,
    },

    // Step 4: the evaluator runs every test, not only the one the generator ran.
    {
      from: "evaluator",
      to: "tests",
      label: "run",
      packet: true,
      bidirectional: true,
      step: 4,
    },

    // Step 5: one criterion failed; the critique says which, with evidence and a fix.
    {
      from: "evaluator",
      to: "generator",
      label: "critique",
      dashed: true,
      flow: true,
      via: [[640, 185]],
      labelAt: 0.5,
      step: 5,
    },

    // Step 6: round 2 passes every criterion.
    { from: "evaluator", to: "done", label: "pass", packet: true, step: 6 },
  ],
};

export default spec;
