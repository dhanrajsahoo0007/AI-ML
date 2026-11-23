import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// Choosing between clearing, compaction and a reset on context-compaction-resets-and-state (Deep dive, "Choosing
// between compaction and reset"). Two questions, three answers, cheapest first:
// 1 Are old tool results most of the window? Yes → clear old tool results (the lightest edit: the calls stay, the
//   bulky results go; Anthropic, "Effective context engineering", 29 Sep 2025).
// 2 Is the work at a milestone, with its progress saved outside the window (tests, commits, a note)? Yes → reset with
//   a handoff note. No → compact, mid-task, in the same session.
// 3 Compaction can stop helping: the window refills at once, or the model wraps up early ("context anxiety";
//   Anthropic, "Harness design for long-running application development", 24 Mar 2026). Then reset anyway, once the
//   state is written out (the dashed arrow).
//
// Three build steps: 1 question 1 and its answer · 2 question 2 and the reset · 3 compaction, and the way from it to a
// reset.
//
// Layout: questions on the left (x 30, 330 wide), answers on the right (x 470, 320 wide), rows at y 40 | 160 | 280,
// 64 tall. "Yes" runs right, "no" runs down. The "no" from question 2 drops to y 312 and turns right into "Compact";
// the dashed arrow runs up the right column from "Compact" to "Reset".
//
// Colour (agents legend, three tones plus neutral): questions lime (checks), clearing tool results blue (what comes
// back from tools), compaction and the reset violet (state). Arrows neutral.

const Q = { x: 30, w: 330 } as const;
const A = { x: 470, w: 320 } as const;
const ROW = [40, 160, 280] as const;
const H = 64;

const box = (
  id: string,
  col: { x: number; w: number },
  row: number,
  label: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: col.x,
  y: ROW[row],
  w: col.w,
  h: H,
  label,
  tone,
  fill: "pastel",
  step,
  ...extra,
});

const arrow = (
  id: string,
  from: string,
  to: string,
  label: string,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
  ...extra,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Clear, compact or reset: cheapest first",
  width: 820,
  height: ROW[2] + H + 30,
  steps: [
    { title: "Mostly old tool results? Clear them" },
    { title: "At a milestone with progress saved? Reset with a note" },
    { title: "Mid-task? Compact, and reset when that stops helping" },
  ],
  shapes: [
    box("q1", Q, 0, "Are old tool results most\nof the window?", AGENT_TONE.check, 1),
    box("clear", A, 0, "Clear old tool results", AGENT_TONE.result, 1, {
      sub: "lightest: the calls stay, results go",
    }),
    arrow("q1-yes", "q1", "clear", "yes", 1),

    box("q2", Q, 1, "At a milestone, with progress\nsaved outside the window?", AGENT_TONE.check, 2),
    box("reset", A, 1, "Reset with a handoff note", AGENT_TONE.memory, 2, {
      sub: "fresh window; read note and git log",
    }),
    arrow("q1-no", "q1", "q2", "no", 2),
    arrow("q2-yes", "q2", "reset", "yes", 2),

    box("compact", A, 2, "Compact", AGENT_TONE.memory, 3, { sub: "summary + recent files, same session" }),
    arrow("q2-no", "q2", "compact", "no", 3, { via: [[Q.x + Q.w / 2, ROW[2] + H / 2]] }),
    arrow("later", "compact", "reset", "later: refills fast or wraps up early", 3, { dashed: true }),
  ],
};

export default spec;
