import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { RESUME_RUN } from "@/components/diagrams/presets/agents-loop";

// Checkpoint and resume, kept small (loop-engineering-and-verification-loops, Deep dive 2). A longer run on the same
// repository (illustrative, RESUME_RUN): a checkpoint (a git commit and a line in the progress file) after every turn
// whose checks pass, here after rounds 2 and 4; round 5 crashes. The resumed run loads the last checkpoint and repeats
// only round 5. The full checkpoint timeline (thread, run and checkpoint records) is drawn on
// state-persistence-retrieval.
//
// Two steps: 1 the first run, its two checkpoints and the crash · 2 the resume from the last checkpoint (ringed).
//
// Layout: one timeline row per run (y 60 and y 160), cells 88 wide with 14-unit gaps from x 130, row names at x 20;
// a dashed arrow from the last checkpoint down to "Load state", then the repeated round under the crashed one.
//
// Colour (agents legend, two tones plus neutral): rounds neutral, checkpoints and the load violet, the crash red. The
// last checkpoint is ringed: it is where the resumed run starts.

const X0 = 130;
const CELL_W = 88;
const GAP = 14;
const H = 48;
const ROW_Y = [60, 160] as const;

type Slot = { id: string; label: string; sub: string; tone: LayoutShape["tone"]; highlight?: boolean };

const lastCheckpoint = Math.max(...RESUME_RUN.checkpointsAfter);
const firstRun: Slot[] = [];
for (let t = 1; t <= RESUME_RUN.crashAt; t++) {
  const crash = t === RESUME_RUN.crashAt;
  firstRun.push({
    id: `t${t}`,
    label: `Round ${t}`,
    sub: crash ? "crash" : "checks pass",
    tone: crash ? AGENT_TONE.failure : AGENT_TONE.infra,
  });
  if ((RESUME_RUN.checkpointsAfter as readonly number[]).includes(t)) {
    firstRun.push({
      id: `c${t}`,
      label: "Checkpoint",
      sub: "commit + log",
      tone: AGENT_TONE.memory,
      highlight: t === lastCheckpoint ? true : undefined,
    });
  }
}

const slotX = (i: number) => X0 + i * (CELL_W + GAP);
const loadIndex = firstRun.findIndex((s) => s.id === `c${lastCheckpoint}`);

const cell = (s: Slot, x: number, y: number, step: number): LayoutShape => ({
  id: s.id,
  type: "cell",
  x,
  y,
  w: CELL_W,
  h: H,
  label: s.label,
  sub: s.sub,
  tone: s.tone,
  fill: s.tone === AGENT_TONE.infra ? "soft" : "pastel",
  highlight: s.highlight,
  step,
});

const rowName = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 96,
  h: H,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Resume from the last checkpoint, not from the start",
  width: Math.ceil(slotX(firstRun.length) - GAP + 20),
  height: ROW_Y[1] + H + 24,
  steps: [{ title: "Checkpoint after every round that passes" }, { title: "Resume from the last checkpoint" }],
  shapes: [
    rowName("n1", ROW_Y[0], "First run", 1),
    ...firstRun.map((s, i) => cell(s, slotX(i), ROW_Y[0], 1)),
    rowName("n2", ROW_Y[1], "Resumed run", 2),
    cell(
      { id: "load", label: "Load state", sub: `from round ${lastCheckpoint}`, tone: AGENT_TONE.memory },
      slotX(loadIndex),
      ROW_Y[1],
      2
    ),
    cell(
      { id: "redo", label: `Round ${RESUME_RUN.crashAt}`, sub: "again", tone: AGENT_TONE.infra },
      slotX(loadIndex + 1),
      ROW_Y[1],
      2
    ),
    { id: "resume", type: "arrow", x: 0, y: 0, from: `c${lastCheckpoint}`, to: "load", dashed: true, step: 2 },
    { id: "go", type: "arrow", x: 0, y: 0, from: "load", to: "redo", step: 2 },
  ],
};

export default spec;
