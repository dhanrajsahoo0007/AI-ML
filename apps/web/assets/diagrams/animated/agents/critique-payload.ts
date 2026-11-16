import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { PGE_CRITERIA, PGE_ROUNDS } from "@/components/diagrams/presets/agents-pge";

// What a useful critique contains (planner-generator-evaluator-loops, Deep dive). The evaluator's round-1 critique on
// the bug-fix task, two ways. Left: a vague critique ("Some tests fail. Please be more careful."), which gives the
// generator nothing to act on. Right: the same finding as six fields: the criterion it failed, the verdict, the
// evidence (the failing test and its error), where to look, a suggested fix and what already passes, so the
// generator does not undo it. The JSON block on the page carries the same six fields.
//
// Layout: the vague critique in a narrow group on the left (x 20–270); the structured critique in a group on the
// right (x 290–800), one row per field at y 60 + 56 × i: a soft neutral name cell (x 310, w 130) and a pastel value
// cell (x 455, w 325). Static: no steps.
//
// Colour (agents legend, four tones plus neutral): the vague critique red (it breaks the loop), the criterion and the
// verdict lime (the check), the evidence blue (what came back from the tests; the ringed row), the fix green (the
// generator's next move), field names and the "keep" row neutral.

const ROW_Y = (i: number) => 60 + 56 * i;
const H = 46;

const field = (
  i: number,
  name: string,
  value: string,
  sub: string | undefined,
  tone: LayoutShape["tone"],
  extra: Partial<LayoutShape> = {}
): LayoutShape[] => [
  {
    id: `name-${i}`,
    type: "box",
    x: 310,
    y: ROW_Y(i),
    w: 130,
    h: H,
    label: name,
    tone: AGENT_TONE.infra,
    fill: "soft",
  },
  {
    id: `value-${i}`,
    type: "box",
    x: 455,
    y: ROW_Y(i),
    w: 325,
    h: H,
    label: value,
    sub,
    tone,
    fill: "pastel",
    ...extra,
  },
];

const c2 = PGE_CRITERIA[1];
const run = PGE_ROUNDS.testsRun1;

const spec: LayoutSpec = {
  kind: "layout",
  title: "What a useful critique contains",
  width: 820,
  height: 420,
  groups: [
    { id: "vague", title: "Vague", tone: AGENT_TONE.failure, x: 20, y: 20, w: 250, h: 380 },
    { id: "useful", title: "Useful: six fields", tone: AGENT_TONE.check, x: 290, y: 20, w: 510, h: 380 },
  ],
  shapes: [
    {
      id: "vague-box",
      type: "box",
      x: 40,
      y: 116,
      w: 210,
      h: 102,
      label: '"Some tests fail.\nPlease be more\ncareful."',
      tone: AGENT_TONE.failure,
      fill: "pastel",
    },
    {
      id: "vague-note",
      type: "text",
      x: 40,
      y: 250,
      w: 210,
      h: 56,
      label: "no test name, no error,\nno next step: the\ngenerator has to guess",
      tone: AGENT_TONE.infra,
    },
    ...field(0, "criterion", `${c2.id}: ${c2.text}`, undefined, AGENT_TONE.check),
    ...field(1, "verdict", `fail: ${PGE_ROUNDS.verdict1}`, undefined, AGENT_TONE.check),
    ...field(2, "evidence", `${run.failed} failed: "${run.failing}"`, PGE_ROUNDS.error1, AGENT_TONE.result, {
      highlight: true,
    }),
    ...field(3, "where", CODING_TASK.file, "empty input, before the loop", AGENT_TONE.infra),
    ...field(4, "suggested fix", PGE_ROUNDS.edit2, undefined, AGENT_TONE.model),
    ...field(5, "keep", "C1, C3, C4 pass", "do not undo the loop bound fix", AGENT_TONE.infra),
  ],
};

export default spec;
