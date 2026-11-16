import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { ERROR_LINE, FEEDBACK_CHECKS, FIRST_EDIT } from "@/components/diagrams/presets/agents-env";

// Deterministic feedback (ai-first-environment-and-tool-scaffolding, Core concepts 3): after every edit the harness,
// not the model, runs the linter, the type check and the tests, cheapest first, and turns their output into one precise
// message for the model's next turn. Running example B at step 3: the first edit (loop bound < n - 1 → < n) passes the
// linter and the type check; the tests catch what types cannot, "parses an empty file" fails; the message names the
// test, the file and line, and the error. The verification-ladder figure on harness-engineering covers the order and
// cost of all four rungs; this one zooms into the two certain rungs and the message they produce.
//
// Four steps: 1 the model proposes the edit · 2 linter and type check pass · 3 the tests fail on one case (ringed) ·
// 4 one precise message goes back to the model.
//
// Layout: model (x 20) and edit (x 200) on one row at y 180; the three checks stacked at x 450 (y 96, 186, 276) inside
// a neutral group that starts at y 60, clear of the play button; what each check catches as text to their right
// (x 662); the message along the bottom (y 384, centred under the tests),
// returning to the model by a dashed arrow bent under it. Run times are illustrative (FEEDBACK_CHECKS).
//
// Colour (agents legend, four tones plus neutral): model green, the edit teal, the checks lime, the message blue. The
// failing test is ringed rather than red, to keep four tones; the message carries the failure.

const CHECK_X = 450;
const CHECK_W = 190;
const CHECK_H = 60;
const CHECK_Y = [96, 186, 276] as const;
const CATCHES = ["style, unused code", "wrong shapes, nulls", "wrong behaviour"] as const;

const checks: LayoutShape[] = FEEDBACK_CHECKS.flatMap((c, i) => {
  const step = i < 2 ? 2 : 3;
  const out: LayoutShape[] = [
    {
      id: `c${i}`,
      type: "box",
      x: CHECK_X,
      y: CHECK_Y[i],
      w: CHECK_W,
      h: CHECK_H,
      label: `${i + 1}  ${c.name}`,
      sub: `${c.result} · ${c.seconds} s`,
      tone: AGENT_TONE.check,
      fill: "pastel",
      highlight: i === 2 ? true : undefined,
      step,
    },
    {
      id: `k${i}`,
      type: "text",
      x: CHECK_X + CHECK_W + 22,
      y: CHECK_Y[i],
      w: 140,
      h: CHECK_H,
      label: `catches\n${CATCHES[i]}`,
      step,
    },
  ];
  if (i > 0) out.push({ id: `p${i}`, type: "arrow", x: 0, y: 0, from: `c${i - 1}`, to: `c${i}`, step });
  return out;
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Deterministic feedback: the harness checks every edit",
  width: 820,
  height: 468,
  steps: [
    { title: "The model proposes an edit" },
    { title: "Linter and type check pass in seconds" },
    { title: "The tests catch what types cannot" },
    { title: "One precise message goes back" },
  ],
  groups: [{ id: "harness", title: "Run by the harness", tone: AGENT_TONE.infra, x: 430, y: 60, w: 380, h: 296 }],
  shapes: [
    {
      id: "model",
      type: "box",
      x: 20,
      y: 180,
      w: 150,
      h: 72,
      label: "Model",
      sub: "proposes step 3",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    {
      id: "edit",
      type: "box",
      x: 200,
      y: 180,
      w: 210,
      h: 72,
      label: `edit ${CODING_TASK.file}`,
      sub: FIRST_EDIT.label.replace("edit: ", ""),
      tone: AGENT_TONE.action,
      fill: "pastel",
    },
    { id: "a-edit", type: "arrow", x: 0, y: 0, from: "model", to: "edit" },
    { id: "a-check", type: "arrow", x: 0, y: 0, from: "edit", to: "c0", step: 2 },
    ...checks,
    {
      id: "msg",
      type: "box",
      x: 325,
      y: 384,
      w: 440,
      h: 64,
      label: `1 failed: ${CODING_TASK.secondFailure}`,
      sub: `${CODING_TASK.file}:${ERROR_LINE} · Error: empty input has no lines`,
      tone: AGENT_TONE.result,
      fill: "pastel",
      step: 4,
    },
    { id: "a-msg", type: "arrow", x: 0, y: 0, from: "c2", to: "msg", step: 4 },
    {
      id: "a-back",
      type: "arrow",
      x: 0,
      y: 0,
      from: "msg",
      to: "model",
      via: [[95, 416]],
      dashed: true,
      step: 4,
    },
  ],
};

export default spec;
