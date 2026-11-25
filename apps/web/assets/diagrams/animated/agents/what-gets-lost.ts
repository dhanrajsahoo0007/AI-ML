import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { ROLLING, S2_DAMAGE, SUMMARY_PROMPT, TRACKED, TURN_41 } from "@/components/diagrams/presets/agents-summary";

// What gets lost on memory-summarization-compression (Deep dive): five facts from the 40-turn Brightpost thread and
// how the two rolling-summary passes word them. Both passes use the same prompt, "Keep the decisions and the ids."
// - Order 4471 (an id) and refund R-2291, £42 (an id and a decision) survive both passes.
// - "Text me from now on" (a decision, turn 26) arrives after pass 1 and survives pass 2 as "prefers text".
// - The damage, "crack from spout to base" (a detail, turn 3), survives pass 1 because the refund rested on it, then
//   becomes "arrived damaged" in pass 2 (ringed): the refund was decided, so the detail no longer looked needed.
// - The photo's time, 09:42 (a timestamp, turn 3), is gone after pass 1.
// - Step 4: turn 41 asks exactly for the two lost facts.
//
// Four build steps: 1 the facts as said in the thread and the prompt; 2 S1; 3 S2; 4 the turn-41 question.
// Layout: a name column (x 20, w 160) and three value columns (x 196, 422, 648; w 210); rows at y 100 + 58 × i, 46
// high; the prompt and the question below the rows across the value columns.
//
// Colour (agents legend, three tones plus neutral): what the customer said and the turn-41 question orange (the
// task), what a summary kept violet (memory), what it dropped red, names, "not yet" and the prompt neutral.

const COL = [196, 422, 648] as const;
const COL_W = 210;
const rowY = (i: number) => 100 + 58 * i;
const H = 46;

const header = (i: number, text: string, step: number): LayoutShape => ({
  id: `h${i}`,
  type: "text",
  x: COL[i],
  y: 62,
  w: COL_W,
  h: 30,
  label: text,
  tone: AGENT_TONE.infra,
  step,
});

const summaryCell = (
  id: string,
  col: number,
  i: number,
  value: string | null,
  step: number,
  lostAs?: string
): LayoutShape => {
  const base = { id, type: "box" as const, x: COL[col], y: rowY(i), w: COL_W, h: H, step };
  if (value === "not yet") {
    return { ...base, label: "not yet said", tone: AGENT_TONE.infra, fill: "paper" };
  }
  if (value === null) {
    return lostAs
      ? {
          ...base,
          label: `"${lostAs}"`,
          sub: "the detail is gone",
          tone: AGENT_TONE.failure,
          fill: "pastel",
          highlight: true,
        }
      : { ...base, label: "gone", tone: AGENT_TONE.failure, fill: "pastel" };
  }
  return { ...base, label: value, tone: AGENT_TONE.memory, fill: "pastel" };
};

const rows: LayoutShape[] = TRACKED.flatMap((f, i) => [
  {
    id: `${f.id}-name`,
    type: "box",
    x: 20,
    y: rowY(i),
    w: 160,
    h: H,
    label: f.name,
    sub: `${f.kind} · turn ${f.turn}`,
    tone: AGENT_TONE.infra,
    fill: "soft",
  },
  {
    id: `${f.id}-raw`,
    type: "box",
    x: COL[0],
    y: rowY(i),
    w: COL_W,
    h: H,
    label: f.raw,
    tone: AGENT_TONE.task,
    fill: "pastel",
  },
  summaryCell(`${f.id}-s1`, 1, i, f.s1, 2),
  summaryCell(`${f.id}-s2`, 2, i, f.s2, 3, f.id === "damage" ? S2_DAMAGE : undefined),
]);

const belowY = rowY(TRACKED.length) + 6;
const spanW = COL[2] + COL_W - COL[0];

const spec: LayoutSpec = {
  kind: "layout",
  title: "What survives two summary passes, and what does not",
  width: 880,
  height: belowY + 2 * 52 + 10,
  steps: [
    { title: "Five facts as the thread states them" },
    { title: `Pass 1 at turn ${ROLLING.pass1.at}: the photo's time is gone` },
    { title: `Pass 2 at turn ${ROLLING.pass2.at}: the damage becomes "${S2_DAMAGE}"` },
    { title: "Turn 41 asks for exactly what was dropped" },
  ],
  shapes: [
    header(0, "In the thread", 1),
    header(1, `S1, after pass 1`, 2),
    header(2, `S2, after pass 2`, 3),
    ...rows,
    {
      id: "prompt",
      type: "box",
      x: COL[0],
      y: belowY,
      w: spanW,
      h: 42,
      label: `Summary prompt, both passes: "${SUMMARY_PROMPT}"`,
      tone: AGENT_TONE.infra,
      fill: "soft",
    },
    {
      id: "turn41",
      type: "box",
      x: COL[0],
      y: belowY + 52,
      w: spanW,
      h: 42,
      label: `Turn 41: "${TURN_41}"`,
      tone: AGENT_TONE.task,
      fill: "pastel",
      step: 4,
    },
  ],
};

export default spec;
