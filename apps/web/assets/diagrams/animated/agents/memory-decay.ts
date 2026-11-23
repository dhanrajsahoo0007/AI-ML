import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { DECAY_PER_HOUR, DECAY_TIMELINE, recency } from "@/components/diagrams/presets/agents-vector-memory";

// Long-term vector memory, Deep dive "Decay and forgetting": the recency term of the Generative Agents score
// (0.995 ^ hours since last use, Park et al. 2023) for customer 1847's three scored memories, from 20 Oct to 26 Nov.
// The hours since last use on 19 Nov are agents-memory SCORED's (720, 168, 48), so the values on 19 Nov (0.03, 0.43,
// 0.79) are the raw recency in agent/memory-scoring.
//
// Three steps: 1 one memory decays: 0.89 after a day, 0.43 after a week, 0.03 after 30 days · 2 each memory decays
// from its own last use; the values on 19 Nov · 3 recall resets the clock: the refund is back to 1 and decays again;
// gift wrap, not recalled, keeps falling; "prefers email" is superseded that day.
//
// Layout: plot x 80–820 (888 hours, 0.833 px per hour), y 50–250 (recency 1 at the top, 0 at the bottom); date ticks
// under it (y 256); the visit (19 Nov) is a dashed vertical line at x 680. Curve labels sit where no curve passes: the
// email label above its start, the refund label under its own curve near 19 Nov, the gift-wrap label above its start.
// A two-row table under the plot (y 288 and 340) gives the values on 19 Nov (step 2) and 26 Nov (step 3).
//
// Colour (agents legend, three tones plus neutral): memories violet, today's message (the visit line) orange, recency
// values lime; axes, ticks and the superseded memory neutral.

const PLOT = { x: 80, y: 50, w: 740, h: 200 } as const;
const T = DECAY_TIMELINE;
const xOf = (hour: number) => Math.round(PLOT.x + (hour / T.endHour) * PLOT.w);
const yOf = (r: number) => Math.round(PLOT.y + PLOT.h - r * PLOT.h);
const VISIT_X = xOf(T.visitHour);

const mem = (id: string) => {
  const m = T.memories.find((x) => x.id === id);
  if (!m) throw new Error(`no memory ${id}`);
  return m;
};
const email = mem("email");
const refund = mem("refund");
const gift = mem("giftwrap");

/** Recency from `from` (last use) to `to`, sampled every 12 hours. */
const decay = (from: number, to: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let h = from; h < to; h += 12) pts.push([xOf(h), yOf(recency(h - from))]);
  pts.push([xOf(to), yOf(recency(to - from))]);
  return pts;
};

const f2 = (v: number) => v.toFixed(2);
const at = (m: { lastUsed: number }, hour: number) => recency(hour - m.lastUsed);

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = AGENT_TONE.infra,
  step = 1,
  quiet?: boolean
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });

const curve = (
  id: string,
  points: [number, number][],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  smooth: true,
  tone: AGENT_TONE.memory,
  weight: 0.85,
  step,
  ...extra,
});

/** Step 1's three marks on the email curve: a day, a week, 30 days after its last use. */
const MARKS = [
  { h: 24, label: `1 day: ${f2(recency(24))}`, dx: 8, dy: -24 },
  { h: 168, label: `7 days: ${f2(recency(168))}`, dx: 8, dy: -24 },
  { h: 720, label: `30 days: ${f2(recency(720))}`, dx: -100, dy: -28 },
];

const cell = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  step: number,
  tone: LayoutTone = AGENT_TONE.check,
  quiet?: boolean
): LayoutShape => ({ id, type: "cell", x, y, w: 230, h: 44, label, sub, tone, step, quiet });

const COL = [140, 380, 620] as const;
const SUPERSEDED = "superseded on 19 Nov";
const week = T.endHour - T.visitHour;
const REFUND = `refund ${BRIGHTPOST.orderId}`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Memory decay: recency falls every hour unless the memory is used",
  width: 880,
  height: 396,
  steps: [
    { title: `Recency = ${DECAY_PER_HOUR} ^ hours since last use` },
    { title: "Each memory decays from its own last use" },
    { title: "A recall resets the clock; the rest keep falling" },
  ],
  shapes: [
    text("formula", PLOT.x, 2, 360, `recency = ${DECAY_PER_HOUR} ^ hours since last use`),
    {
      id: "y-axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [PLOT.x, PLOT.y + PLOT.h],
        [PLOT.x, PLOT.y - 6],
      ],
    },
    {
      id: "x-axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [PLOT.x, PLOT.y + PLOT.h],
        [PLOT.x + PLOT.w + 10, PLOT.y + PLOT.h],
      ],
      head: true,
    },
    text("y1", 40, PLOT.y - 9, 34, "1"),
    text("y05", 40, yOf(0.5) - 9, 34, "0.5"),
    text("y0", 40, PLOT.y + PLOT.h - 9, 34, "0"),
    text("t-start", PLOT.x - 25, 256, 50, T.startLabel),
    text("t-refund", xOf(refund.lastUsed) - 25, 256, 50, BRIGHTPOST.delivered),
    text("t-visit", VISIT_X - 25, 256, 50, T.visitLabel, AGENT_TONE.task, 2, true),
    text("t-end", xOf(T.endHour) - 25, 256, 50, T.endLabel, AGENT_TONE.infra, 3, true),

    // Step 1: one memory, "prefers email", from its last use on 20 Oct to 19 Nov.
    curve("email", decay(email.lastUsed, T.visitHour), 1),
    text("email-l", PLOT.x + 6, 28, 220, `${email.text} · last used ${T.startLabel}`, AGENT_TONE.memory),
    ...MARKS.flatMap((m, i): LayoutShape[] => {
      const x = xOf(email.lastUsed + m.h);
      const y = yOf(recency(m.h));
      return [
        { id: `mark-${i}`, type: "circle", x, y, w: 8, tone: AGENT_TONE.memory, fill: "pastel", quiet: true },
        text(`mark-${i}-l`, x + m.dx, y + m.dy, 92, m.label, AGENT_TONE.infra, 1, true),
      ];
    }),

    // Step 2: the other two memories decay from their own last use; the visit line.
    curve("refund", decay(refund.lastUsed, T.visitHour), 2),
    text("refund-l", VISIT_X - 92, yOf(at(refund, T.visitHour)) + 8, 88, REFUND, AGENT_TONE.memory, 2, true),
    curve("gift", decay(gift.lastUsed, T.visitHour), 2, { dashed: true }),
    text("gift-l", xOf(gift.lastUsed) - 60, 28, 116, "gift wrap · 17 Nov", AGENT_TONE.memory, 2, true),
    {
      id: "visit",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [VISIT_X, PLOT.y + PLOT.h],
        [VISIT_X, PLOT.y - 4],
      ],
      dashed: true,
      tone: AGENT_TONE.task,
      step: 2,
    },
    text("row1-l", 20, 301, 112, `on ${T.visitLabel}`, AGENT_TONE.infra, 2, true),
    cell("v1-email", COL[0], 288, `${email.text}: ${f2(at(email, T.visitHour))}`, "720 h since last use", 2),
    cell("v1-refund", COL[1], 288, `${REFUND}: ${f2(at(refund, T.visitHour))}`, "168 h", 2, undefined, true),
    cell("v1-gift", COL[2], 288, `gift wrap: ${f2(at(gift, T.visitHour))}`, "48 h", 2, undefined, true),

    // Step 3: the refund is recalled on 19 Nov and starts again from 1; gift wrap keeps falling.
    {
      id: "reset",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [VISIT_X, yOf(at(refund, T.visitHour))],
        [VISIT_X, PLOT.y],
      ],
      tone: AGENT_TONE.memory,
      weight: 0.85,
      step: 3,
    },
    curve("refund-2", decay(T.visitHour, T.endHour), 3),
    {
      id: "reset-dot",
      type: "circle",
      x: VISIT_X,
      y: PLOT.y,
      w: 10,
      tone: AGENT_TONE.memory,
      fill: "pastel",
      highlight: true,
      step: 3,
    },
    text("reset-l", VISIT_X + 16, 28, 170, "recalled: back to 1", AGENT_TONE.memory, 3, true),
    curve(
      "gift-2",
      decay(gift.lastUsed, T.endHour).filter(([x]) => x >= VISIT_X),
      3,
      { dashed: true }
    ),
    text("email-end", VISIT_X + 8, PLOT.y + PLOT.h - 26, 130, SUPERSEDED, AGENT_TONE.infra, 3, true),
    text("row2-l", 20, 353, 112, `on ${T.endLabel}`, AGENT_TONE.infra, 3, true),
    cell("v2-email", COL[0], 340, email.text, SUPERSEDED, 3, AGENT_TONE.infra, true),
    cell("v2-refund", COL[1], 340, `${REFUND}: ${f2(recency(week))}`, `recalled ${T.visitLabel}, ${week} h ago`, 3),
    cell(
      "v2-gift",
      COL[2],
      340,
      `gift wrap: ${f2(at(gift, T.endHour))}`,
      `not recalled, ${T.endHour - gift.lastUsed} h`,
      3,
      undefined,
      true
    ),
  ],
};

export default spec;
