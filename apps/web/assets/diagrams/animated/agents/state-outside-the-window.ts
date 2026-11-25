import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_CONTEXT, CODING_TASK } from "@/components/diagrams/presets/agents";
import { RESET } from "@/components/diagrams/presets/agents-compact";

// State outside the window on context-compaction-resets-and-state (Architecture): where the bug-fix coding agent
// (running example B) keeps what its context window cannot. The window holds only what the current step needs; the
// code stays in the repository and is read on demand; each finished unit becomes a git commit and a line in
// HANDOFF.md; the harness records the run (step, tokens, status) in a run store. When a new session starts, it reads
// the note and the git log first, and the harness resumes the run from the store.
//
// Five steps: 1 the developer's task reaches the agent, which the harness runs · 2 code is read on demand · 3 a fix is
// committed and noted · 4 the harness records the run · 5 a new session reads the note and the log; the harness
// resumes the run. Nodes never move; the write edges of steps 3 and 4 are replaced by read edges in step 5
// (`until: 4`).
//
// Layout: left column x 110 (developer row 110, harness row 340); the agent in the middle (x 360, row 210); the four
// stores at x 680, rows 80 | 180 | 280 | 380, inside the zone "Outside the window" (x 570–800).
//
// Colour (agents legend, three tones plus neutral): the developer orange, the agent green (the accent), the stores
// violet, the harness neutral. Arrows stay neutral.

const COL = { left: 110, mid: 360, right: 680 } as const;
const STORE_ROWS = [80, 180, 280, 380] as const;
const fmt = (n: number) => n.toLocaleString("en-GB");
const step9 = Object.values(CODING_CONTEXT.step9).reduce((a, b) => a + b, 0);

const spec: DiagramSpec = {
  title: "State outside the window: files, git and a run store",
  width: 820,
  height: 450,
  steps: [
    { title: "The window holds only what this step needs" },
    { title: "Code stays in the repository, read on demand" },
    { title: "Each finished fix is committed and noted" },
    { title: "The harness records the run" },
    { title: "A new session reads it all back" },
  ],
  zones: [{ id: "outside", title: "Outside the window", tone: AGENT_TONE.memory, x: 570, y: 26, w: 230, h: 404 }],
  nodes: [
    {
      id: "dev",
      label: "Developer",
      sub: "issue + follow-up",
      icon: "users",
      tone: AGENT_TONE.task,
      variant: "glyph",
      x: COL.left,
      y: 110,
    },
    {
      id: "agent",
      label: "Coding agent",
      sub: "window: this step only",
      icon: "robot",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL.mid,
      y: 210,
      w: 180,
    },
    {
      id: "harness",
      label: "Harness",
      sub: "runs the loop",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: COL.left,
      y: 340,
      w: 160,
    },
    {
      id: "repo",
      label: "Repository",
      sub: CODING_TASK.repo,
      icon: "folder",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL.right,
      y: STORE_ROWS[0],
      w: 196,
    },
    {
      id: "git",
      label: "Git history",
      sub: "one commit per fix",
      icon: "log",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL.right,
      y: STORE_ROWS[1],
      w: 196,
    },
    {
      id: "note",
      label: RESET.note,
      sub: "done, decisions, next",
      icon: "file",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL.right,
      y: STORE_ROWS[2],
      w: 196,
    },
    {
      id: "runs",
      label: "Run store",
      sub: "step, tokens, status",
      icon: "database",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL.right,
      y: STORE_ROWS[3],
      w: 196,
    },
  ],
  edges: [
    // Step 1: the task reaches the agent; the harness runs it.
    { from: "dev", to: "agent", label: "task", packet: true },
    { from: "harness", to: "agent", label: "runs", packet: true, delay: 0.6 },

    // Step 2: files are read when a step needs them, not loaded up front.
    { from: "agent", to: "repo", label: "read on demand", packet: true, bidirectional: true, labelAt: 0.5, step: 2 },

    // Step 3: a finished fix becomes a commit and a line in the note (replaced by reads in step 5).
    { from: "agent", to: "git", label: "commit", packet: true, labelAt: 0.5, step: 3, until: 4 },
    { from: "agent", to: "note", label: "update", packet: true, labelAt: 0.5, step: 3, until: 4 },

    // Step 4: the harness saves the run's progress outside any window.
    {
      from: "harness",
      to: "runs",
      label: `step 9, ${fmt(step9)}`,
      dashed: true,
      flow: true,
      labelAt: 0.42,
      step: 4,
      until: 4,
    },

    // Step 5: a new session starts empty and reads the note and the log first.
    { from: "note", to: "agent", label: "read first", packet: true, labelAt: 0.5, step: 5 },
    { from: "git", to: "agent", label: "git log", packet: true, labelAt: 0.5, step: 5, delay: 0.5 },
    { from: "runs", to: "harness", label: "resume at step 9", packet: true, labelAt: 0.58, step: 5 },
  ],
};

export default spec;
