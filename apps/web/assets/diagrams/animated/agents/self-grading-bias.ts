import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { PGE_ROUNDS } from "@/components/diagrams/presets/agents-pge";

// Self-grading bias (planner-generator-evaluator-loops, Core concepts). The same round-1 diff on the bug-fix task is
// graded twice. Left: the generator grades its own work. It runs only the test it was fixing ("keeps the last line"),
// it passes, and the generator reports 4 of 4 criteria met: a bug ships. Right: a separate evaluator with a fresh
// context runs all 18 tests itself; "parses an empty file" fails, so the verdict is 3 of 4 met and a critique goes
// back.
//
// Layout: two groups, 380 wide, side by side, centred on x 210 and x 610. Four rows (60, 140, 220, 300) so the two
// verdicts line up; the left side has no row 220 (the self-check reads no outside signal), so its arrow skips it. A
// one-line note under each group says why the grades differ. Static: no steps.
//
// Colour (agents legend, four tones plus neutral): the diff and the self-check green (the same model), the evaluator
// and its verdict lime (the verdict is the ringed accent), the test result blue, the false pass red (where it breaks).

const W = 280;
const H = 52;
const ROWS = [60, 140, 220, 300] as const;
const LEFT_X = 210 - W / 2;
const RIGHT_X = 610 - W / 2;

const box = (
  id: string,
  x: number,
  row: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x,
  y: ROWS[row],
  w: W,
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  ...extra,
});

const arrow = (id: string, from: string, to: string): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to });

const run = PGE_ROUNDS.testsRun1;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Self-grading bias: the same diff graded by its author and by a separate evaluator",
  width: 820,
  height: 430,
  groups: [
    { id: "self", title: "The generator grades itself", tone: AGENT_TONE.infra, x: 20, y: 20, w: 380, h: 390 },
    { id: "sep", title: "A separate evaluator grades it", tone: AGENT_TONE.check, x: 420, y: 20, w: 380, h: 390 },
  ],
  shapes: [
    // Left: the author checks what it meant to do.
    box("l-diff", LEFT_X, 0, "Diff, round 1", PGE_ROUNDS.edit1, AGENT_TONE.model),
    box("l-check", LEFT_X, 1, "Self-check", `ran 1 test: "${CODING_TASK.failingTest}"`, AGENT_TONE.model),
    box("l-verdict", LEFT_X, 3, `Verdict: ${PGE_ROUNDS.selfReport}`, "a bug ships", AGENT_TONE.failure),
    arrow("l-a1", "l-diff", "l-check"),
    arrow("l-a2", "l-check", "l-verdict"),
    {
      id: "l-note",
      type: "text",
      x: 40,
      y: 362,
      w: 340,
      h: 36,
      label: "same model, same context:\nit checks what it meant to do",
      tone: AGENT_TONE.infra,
    },

    // Right: a fresh reader checks the contract against an outside signal.
    box("r-diff", RIGHT_X, 0, "Diff, round 1", PGE_ROUNDS.edit1, AGENT_TONE.model),
    box("r-eval", RIGHT_X, 1, "Evaluator", `runs all ${CODING_TASK.testsTotal} tests`, AGENT_TONE.check),
    box(
      "r-result",
      RIGHT_X,
      2,
      `${run.passed} passed, ${run.failed} failed`,
      `fails: "${run.failing}"`,
      AGENT_TONE.result
    ),
    box(
      "r-verdict",
      RIGHT_X,
      3,
      `Verdict: ${PGE_ROUNDS.verdict1}`,
      `${PGE_ROUNDS.failed1} fails: a critique goes back`,
      AGENT_TONE.check,
      {
        highlight: true,
      }
    ),
    arrow("r-a1", "r-diff", "r-eval"),
    arrow("r-a2", "r-eval", "r-result"),
    arrow("r-a3", "r-result", "r-verdict"),
    {
      id: "r-note",
      type: "text",
      x: 440,
      y: 362,
      w: 340,
      h: 36,
      label: "fresh context, told to doubt:\nit checks the contract",
      tone: AGENT_TONE.infra,
    },
  ],
};

export default spec;
