import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { MEMORY_VISIT, SCORED, SCORING_KEEP } from "@/components/diagrams/presets/agents-memory";

// Agent memory, Deep dive "Which memories to recall": three stored Brightpost memories scored against today's message
// with the Generative Agents retrieval score (Park et al. 2023, §4.1): recency + importance + relevance, each min-max
// scaled to [0, 1] over the candidates, weights all 1. The top 2 enter the prompt; the most recent memory ("asked
// about gift wrap") is left out because it is trivial and unrelated. Inputs (hours, ratings, cosines) are illustrative;
// the arithmetic is in presets/agents-memory.ts.
//
// Five steps: 1 today's message and three stored memories · 2 recency · 3 importance · 4 relevance · 5 sum, the top 2
// enter the prompt.
//
// Layout: the message across the top (y 16). Header row y 74. One row per memory at y 120 | 180 | 240 (48 tall).
// Columns: memory x 20 (w 220) | recency x 256 | importance x 404 | relevance x 552 (each w 136) | score x 704 (w 156).
// Score cells are shaded by their scaled value (weight). The context window group sits under the rows at y 318.
//
// Colour (agents legend, three tones plus neutral): the message orange, memories violet, scores lime; the context
// window (a group, empty until step 5) and the left-out note neutral.

const ROW_Y = [120, 180, 240] as const;
const H = 48;
const COL = {
  mem: { x: 20, w: 220 },
  rec: { x: 256, w: 136 },
  imp: { x: 404, w: 136 },
  rel: { x: 552, w: 136 },
  sum: { x: 704, w: 156 },
} as const;

const f2 = (v: number) => v.toFixed(2);

const header = (id: string, col: keyof typeof COL, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: COL[col].x,
  y: 74,
  w: COL[col].w,
  h: 38,
  label,
  step,
  quiet: true,
});

const scoreCell = (
  id: string,
  col: keyof typeof COL,
  row: number,
  label: string,
  sub: string,
  weight: number,
  step: number
): LayoutShape => ({
  id,
  type: "cell",
  x: COL[col].x,
  y: ROW_Y[row],
  w: COL[col].w,
  h: H,
  label,
  sub,
  tone: AGENT_TONE.check,
  weight: Math.max(weight * 0.6, 0.04),
  step,
  quiet: row > 0 ? true : undefined,
});

const ranked = [...SCORED].sort((a, b) => b.total - a.total);
const kept = ranked.slice(0, SCORING_KEEP);
const leftOut = ranked.slice(SCORING_KEEP);

const rows: LayoutShape[] = SCORED.flatMap((m, i): LayoutShape[] => [
  {
    id: `mem-${m.id}`,
    type: "box",
    x: COL.mem.x,
    y: ROW_Y[i],
    w: COL.mem.w,
    h: H,
    label: m.text,
    sub: m.kind,
    tone: AGENT_TONE.memory,
    fill: "pastel",
    quiet: i > 0 ? true : undefined,
  },
  scoreCell(
    `rec-${m.id}`,
    "rec",
    i,
    `${f2(m.recencyRaw)} → ${f2(m.recency)}`,
    `${m.hoursSinceUsed} h ago`,
    m.recency,
    2
  ),
  scoreCell(
    `imp-${m.id}`,
    "imp",
    i,
    `${m.importance} → ${f2(m.importanceScaled)}`,
    "rated 1 to 10",
    m.importanceScaled,
    3
  ),
  scoreCell(`rel-${m.id}`, "rel", i, `${f2(m.cosine)} → ${f2(m.relevance)}`, "cosine", m.relevance, 4),
  {
    id: `sum-${m.id}`,
    type: "cell",
    x: COL.sum.x,
    y: ROW_Y[i],
    w: COL.sum.w,
    h: H,
    label: f2(m.total),
    sub: `${f2(m.recency)} + ${f2(m.importanceScaled)} + ${f2(m.relevance)}`,
    tone: AGENT_TONE.check,
    fill: kept.includes(m) ? "pastel" : "soft",
    highlight: m === ranked[0] ? true : undefined,
    quiet: i > 0 ? true : undefined,
    step: 5,
  },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Scoring three memories on recency, importance and relevance",
  width: 880,
  height: 410,
  steps: [
    { title: "Today's message and three stored memories" },
    { title: "Recency: decays with every hour since last use" },
    { title: "Importance: rated once, when the memory is written" },
    { title: "Relevance: cosine similarity to today's message" },
    { title: `Sum the three; the top ${SCORING_KEEP} enter the prompt` },
  ],
  groups: [
    {
      id: "context",
      title: `Context window: room for ${SCORING_KEEP} memories`,
      tone: AGENT_TONE.infra,
      x: 20,
      y: 318,
      w: 620,
      h: 80,
    },
  ],
  shapes: [
    {
      id: "message",
      type: "box",
      x: 20,
      y: 16,
      w: 840,
      h: 46,
      label: "Today's message",
      sub: `“${MEMORY_VISIT.message}”`,
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    header("h-mem", "mem", "Stored memory", 1),
    header("h-rec", "rec", "Recency\n0.995 ^ hours", 2),
    header("h-imp", "imp", "Importance\nLLM rating", 3),
    header("h-rel", "rel", "Relevance\nto the message", 4),
    header("h-sum", "sum", "Score\nsum, weights 1", 5),
    ...rows,
    ...kept.map((m, i): LayoutShape => ({
      id: `ctx-${m.id}`,
      type: "cell",
      x: 36 + i * 300,
      y: 350,
      w: 288,
      h: 36,
      label: `${m.text} · ${f2(m.total)}`,
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 5,
      quiet: i > 0 ? true : undefined,
    })),
    {
      id: "left-out",
      type: "text",
      x: 660,
      y: 336,
      w: 200,
      h: 52,
      label:
        leftOut.map((m) => `left out: ${m.text.replace("asked about ", "")}, ${f2(m.total)}`).join("\n") +
        "\nrecent, but trivial",
      tone: AGENT_TONE.infra,
      step: 5,
      quiet: true,
    },
  ],
};

export default spec;
