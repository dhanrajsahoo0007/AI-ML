import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, loopRing } from "@/components/diagrams/presets/agents";
import { LOOP_GOAL } from "@/components/diagrams/presets/agents-loop";

// The anatomy of a verification loop (loop-engineering-and-verification-loops, hero of Architecture): a goal a program
// can test, a round of work (assemble context → call the model → run the tool), a check against the goal, and a
// decision that either starts the next round with the failure attached or leaves the loop by one of three exits: done,
// stop and report, ask a person. Running example B: the goal is "all 18 tests pass" (LOOP_GOAL).
//
// Four steps: 1 the goal · 2 act (the first three stations of the ring) · 3 check (ringed) · 4 decide, its three exits
// and the dashed "next round" arrow back to context.
//
// Layout: loopRing (first use) centred on (400, 190), rx 160, ry 105, four stations (context left, model top, tool
// right, check bottom), its own exit off; the ring's check → context arrow is dropped and replaced by check → decide
// (below the ring, x 325) and a dashed decide → context arrow bent under the ring. Goal at the left (x 20), the three
// exits stacked at x 600.
//
// Colour (agents legend, four tones plus neutral): goal and person orange, model and done green, tool teal, check
// lime; context, decide and stop neutral. The check is ringed: the loop is only as good as it.

const RING = loopRing("ring", 400, 190, {
  stations: ["context", "model", "tool", "check"],
  rx: 160,
  ry: 105,
  exit: false,
  highlight: "check",
});

/** Build step of each ring shape: context, model and tool and their arrows are "act" (2); the check and its arrow 3. */
const RING_STEP: Record<string, number> = {
  "ring-context": 2,
  "ring-model": 2,
  "ring-tool": 2,
  "ring-a0": 2,
  "ring-a1": 2,
  "ring-check": 3,
  "ring-a2": 3,
};

const ring: LayoutShape[] = RING.shapes.filter((s) => s.id !== "ring-a3").map((s) => ({ ...s, step: RING_STEP[s.id] }));

const [ctxX, ctxY] = RING.centres.context!;
const [checkX] = RING.centres.check!;

const DECIDE = { x: checkX - 75, y: 370, w: 150, h: 44 };
const EXIT_X = 600;
const EXIT_W = 200;
const EXITS = [
  { id: "done", label: "Done", sub: "the goal is met", tone: AGENT_TONE.model, y: 300 },
  { id: "stop", label: "Stop and report", sub: "a budget ran out", tone: AGENT_TONE.infra, y: 370 },
  { id: "ask", label: "Ask a person", sub: "stuck, or a risky step", tone: AGENT_TONE.task, y: 440 },
] as const;

const exits: LayoutShape[] = EXITS.flatMap((e) => [
  {
    id: e.id,
    type: "box" as const,
    x: EXIT_X,
    y: e.y,
    w: EXIT_W,
    h: 44,
    label: e.label,
    sub: e.sub,
    tone: e.tone,
    fill: "pastel" as const,
    step: 4,
  },
  { id: `to-${e.id}`, type: "arrow" as const, x: 0, y: 0, from: "decide", to: e.id, step: 4 },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The anatomy of a verification loop",
  width: 820,
  height: 504,
  steps: [
    { title: "A goal a program can test" },
    { title: "Act: the agent takes its turns" },
    { title: "Check the result against the goal" },
    { title: "Decide: go round again, or leave" },
  ],
  shapes: [
    {
      id: "goal",
      type: "box",
      x: 20,
      y: ctxY - 22,
      w: 130,
      h: 44,
      label: LOOP_GOAL.label,
      sub: LOOP_GOAL.test,
      tone: AGENT_TONE.task,
      fill: "pastel",
      step: 1,
    },
    ...ring,
    { id: "goal-in", type: "arrow", x: 0, y: 0, from: "goal", to: "ring-context", step: 2 },
    {
      id: "decide",
      type: "box",
      ...DECIDE,
      label: "Decide",
      sub: "go on, stop or ask",
      tone: AGENT_TONE.infra,
      fill: "pastel",
      step: 4,
    },
    { id: "verdict", type: "arrow", x: 0, y: 0, from: "ring-check", to: "decide", label: "verdict", step: 4 },
    {
      id: "again",
      type: "arrow",
      x: 0,
      y: 0,
      from: "decide",
      to: "ring-context",
      via: [[ctxX, DECIDE.y + DECIDE.h / 2]],
      label: "not met: next round",
      dashed: true,
      step: 4,
    },
    ...exits,
  ],
};

export default spec;
