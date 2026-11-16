import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { BUDGET, GATE, HELD_OUT, PICK, RUN, SPLITS } from "@/components/diagrams/presets/agents-optimize";

// The optimisation loop (automated-prompt-optimization, Architecture): DSPy's GEPA optimiser improving Brightpost's
// refund-reply prompt, starting from the live prompt v12. The optimiser runs a candidate prompt on 3 training chats,
// the metric scores each reply and says why it failed, a stronger reflection model reads the failures and writes a new
// candidate, the validation split scores it, and the candidate pool keeps it. After the budget (6 candidates, about
// 1,330 metric calls), the best candidate on validation is checked once on the fixed set it never saw.
//
// Seven steps: 1 v12 enters the pool as c0; the validation split scores it (82 of 100) · 2 c0 runs on a minibatch of 3
// training chats · 3 the metric scores the replies and writes feedback · 4 the reflection model proposes c1 · 5 c1 is
// scored on validation (85) and kept · 6 the loop repeats to c6; c3 is best on validation (89) · 7 one held-out check:
// c3 passes 189 of the 200 fixed cases (floor 170, v12 184). Nodes never move; each validation score replaces the
// previous one (`until`).
//
// Layout: three columns (x 120, 430, 740) and three rows (y 80, 250, 420). Top row: train split, task model, metric.
// Middle row: candidate pool, optimiser, reflection model. Bottom: validation split (left) and the fixed set (middle,
// step 7). The pool ⇄ optimiser pair bends through y 234 and y 266 so both labels show.
//
// Colour (agents legend, four tones plus neutral): both models green, the reflection model the accent; the chats
// orange (customers' messages); the metric and the fixed-set gate lime; the candidate pool violet; the optimiser
// neutral. Scores are illustrative except the gate's floor and v12's 184.

const COL = { left: 120, mid: 430, right: 740 } as const;
const ROW = { top: 80, mid: 250, bottom: 420 } as const;
const c = (i: number) => RUN[i];

const spec: DiagramSpec = {
  title: "The optimisation loop: propose, score, keep the best, check once",
  width: 860,
  height: 500,
  steps: [
    { title: `v12 enters as c0; validation scores it ${c(0).val} of ${SPLITS.val}` },
    { title: `c0 runs on ${BUDGET.minibatch} training chats` },
    { title: "The metric scores each reply and says why" },
    { title: "The reflection model writes candidate c1" },
    { title: `c1 scores ${c(1).val} on validation and joins the pool` },
    { title: `Repeat to c${BUDGET.candidates}: c${PICK.byVal} is best on validation` },
    { title: `One held-out check: ${HELD_OUT.selected} of ${GATE.cases}` },
  ],
  zones: [],
  nodes: [
    {
      id: "train",
      label: "Train split",
      sub: `${SPLITS.train} refund chats`,
      icon: "folder",
      tone: AGENT_TONE.task,
      fill: "pastel",
      x: COL.left,
      y: ROW.top,
      w: 176,
    },
    {
      id: "task",
      label: "Task model",
      sub: "runs the prompt",
      icon: "model",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: COL.mid,
      y: ROW.top,
      w: 176,
    },
    {
      id: "metric",
      label: "Metric",
      sub: "score + feedback",
      icon: "meter",
      tone: AGENT_TONE.check,
      fill: "pastel",
      x: COL.right,
      y: ROW.top,
      w: 176,
    },
    {
      id: "pool",
      label: "Candidate pool",
      sub: "c0 = v12, c1, …",
      icon: "history",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL.left,
      y: ROW.mid,
      w: 186,
    },
    {
      id: "optimizer",
      label: "Optimiser",
      sub: "DSPy GEPA, light",
      icon: "pipeline",
      tone: AGENT_TONE.infra,
      x: COL.mid,
      y: ROW.mid,
      w: 186,
    },
    {
      id: "reflect",
      label: "Reflection model",
      sub: "rewrites the prompt",
      icon: "model",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL.right,
      y: ROW.mid,
      w: 196,
    },
    {
      id: "val",
      label: "Val split",
      sub: `${SPLITS.val} chats, picks`,
      icon: "folder",
      tone: AGENT_TONE.task,
      fill: "pastel",
      x: COL.left,
      y: ROW.bottom,
      w: 176,
    },
    {
      id: "fixed",
      label: "Fixed set",
      sub: `${GATE.cases} cases, held out`,
      icon: "shield",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 7,
      x: COL.mid,
      y: ROW.bottom,
      w: 186,
    },
  ],
  edges: [
    // Step 1: the live prompt is the seed; the validation split gives the score every candidate must beat.
    { from: "pool", to: "optimizer", label: "c0 = v12", packet: true, via: [[275, 234]] },
    {
      from: "optimizer",
      to: "val",
      label: `c0: ${c(0).val} of ${SPLITS.val}`,
      packet: true,
      bidirectional: true,
      delay: 0.8,
      until: 4,
    },

    // Step 2: a minibatch of 3 training chats runs with the current candidate.
    { from: "train", to: "task", label: `${BUDGET.minibatch} chats`, packet: true, step: 2 },
    { from: "optimizer", to: "task", label: "prompt c0", packet: true, step: 2, delay: 0.4 },

    // Step 3: the metric scores each reply and writes why it failed; only the failures go on to reflection.
    { from: "task", to: "metric", label: "3 replies", packet: true, step: 3 },
    { from: "metric", to: "reflect", label: "2 fail + why", packet: true, step: 3, delay: 0.8 },

    // Step 4: the reflection model reads the failing traces and the feedback and writes a new instruction.
    { from: "reflect", to: "optimizer", label: "c1: new rule", packet: true, step: 4 },

    // Step 5: c1 is scored on the validation split and kept in the pool.
    {
      from: "optimizer",
      to: "val",
      label: `c1: ${c(1).val} of ${SPLITS.val}`,
      packet: true,
      bidirectional: true,
      step: 5,
      until: 5,
    },
    { from: "optimizer", to: "pool", label: "keep c1", packet: true, via: [[275, 266]], step: 5, delay: 0.8 },

    // Step 6: the loop repeats until the budget is spent; the best candidate on validation wins.
    {
      from: "optimizer",
      to: "val",
      label: `best: c${PICK.byVal}, ${c(PICK.byVal).val}`,
      packet: true,
      bidirectional: true,
      step: 6,
    },

    // Step 7: the winner meets the fixed set once. It never saw these cases.
    {
      from: "optimizer",
      to: "fixed",
      label: `c${PICK.byVal}: ${HELD_OUT.selected} of ${GATE.cases}`,
      packet: true,
      bidirectional: true,
      step: 7,
    },
  ],
};

export default spec;
