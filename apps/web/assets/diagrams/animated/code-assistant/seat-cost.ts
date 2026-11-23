import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { AGENT, CHAT, CLOUD, COST, SEATS } from "@/components/diagrams/presets/gcase-code";

// What a seat costs to serve, and what pooled pricing does about heavy users (code-assistant, design sheet §5 "Usage
// segments" to "Margin", §10.12, N5; preset COST, AGENT, CHAT, CLOUD and SEATS in presets/gcase-code.ts; every volume
// and price illustrative, model list prices as of November 2026 from gcase-answer.ts PRICES):
//   Fixed per seat a month: completion (self-hosted GPUs, team and fine-tuning) 5.20 + snapshots 0.08 + apply floor
//   0.108 + rerank 0.108 + index 0.05 = COST.fixed ≈ 5.55 USD.
//   Usage on SEATS.usageDays = 14.7 active days a seat-month, by segment (light 60%: 1 task, 4 chats a day; median 30%:
//   4 tasks, 10 chats; heavy 10%: 12 tasks at twice the cost, 25 chats): agent tasks at AGENT.perTask ≈ 0.363 USD,
//   chats at CHAT.perChat ≈ 0.0283, cloud VMs for 25% of tasks at CLOUD.perTask ≈ 0.0104.
//   Mean seat: 5.55 + agent 22.40 + chat 3.29 + cloud 0.11 = COST.meanSeat ≈ 31.3 USD at list prices (agent 71%).
//   Price: 39 USD a seat with a 20 USD pooled allowance; usage above it billed at list × 1.25. Revenue on the mean
//   organisation 39 + 1.25 × (25.80 − 20) ≈ 46.25: margin 1 − 31.35 ÷ 46.25 ≈ 32%. An organisation of only light,
//   only median or only heavy seats: 68%, 32%, 23%; the floor tends to 1 − 1 ÷ 1.25 = 20% (N5).
// Steps: 1 the mean seat's cost · 2 cost and revenue for three organisation mixes.
// Layout (880 wide): step 1 one stacked bar (x 200, 14 px a USD) with a revenue marker; step 2 three pairs of bars
// (cost, revenue) on a shared scale (2.4 px a USD), the margin printed after each pair.
// Colours: completion and the fixed servers teal (compute); the agent green and chat blue (model calls and their
// context); cloud VMs teal; revenue lime (the check the margin is measured against); cost neutral in step 2.

const X = 20;
const BAR_X = 200;
const usd = (v: number) => `${v.toFixed(2)} USD`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const textW = (label: string) => Math.ceil(label.length * 6) + 6;
const text = (id: string, x: number, y: number, label: string, step: number, quiet = true): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: textW(label),
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

// ── Step 1: the mean seat ────────────────────────────────────────────────────────────────────────────────────────
const mix = (f: (s: (typeof COST.segments)[number]) => number) =>
  COST.segments.reduce((sum, s) => sum + s.share * f(s), 0);
const agent = COST.agentMean;
const chat = SEATS.usageDays * mix((s) => s.chats) * CHAT.perChat;
const cloud = SEATS.usageDays * CLOUD.share * mix((s) => s.tasks) * CLOUD.perTask;
const otherFixed = COST.fixed - COST.completion;

const PX = 14; // px a USD in step 1
const parts: { id: string; label: string; usd: number; tone: LayoutTone }[] = [
  { id: "completion", label: "", usd: COST.completion, tone: PROD_TONE.compute },
  { id: "fixed", label: "", usd: otherFixed, tone: PROD_TONE.compute },
  { id: "agent", label: "Agent tasks", usd: agent, tone: GENAI_TONE.model },
  { id: "chat", label: "", usd: chat, tone: GENAI_TONE.data },
  { id: "cloud", label: "", usd: cloud, tone: PROD_TONE.compute },
];
const BAR1_Y = 40;
let at = BAR_X;
const stack: LayoutShape[] = parts.map((p) => {
  const w = Math.max(3, Math.round(p.usd * PX));
  const sh: LayoutShape = {
    id: `m-${p.id}`,
    type: "cell",
    x: at,
    y: BAR1_Y,
    w,
    h: 34,
    label: p.label,
    sub: p.label ? usd(p.usd) : undefined,
    tone: p.tone,
    fill: "pastel",
    step: 1,
    quiet: p.id !== "agent",
  };
  at += w;
  return sh;
});
const revX = BAR_X + Math.round(COST.meanRevenue * PX);
const step1: LayoutShape[] = [
  text("h1", X, 6, "The mean seat, a month, at list prices (illustrative)", 1),
  text("m-label", X, BAR1_Y + 8, `Cost ${usd(COST.meanSeat)}`, 1),
  ...stack,
  {
    id: "rev",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [revX, BAR1_Y - 8],
      [revX, BAR1_Y + 42],
    ],
    tone: GENAI_TONE.check,
    step: 1,
  },
  {
    id: "rev-t",
    type: "text",
    x: revX - 150,
    y: BAR1_Y - 30,
    w: 150,
    h: 18,
    label: `revenue ${usd(COST.meanRevenue)}`,
    tone: GENAI_TONE.check,
    step: 1,
    quiet: true,
  },
  text(
    "m-parts",
    BAR_X,
    BAR1_Y + 42,
    `completion ${COST.completion.toFixed(2)} · other fixed ${otherFixed.toFixed(2)} · agent ${agent.toFixed(2)} · chat ${chat.toFixed(2)} · cloud VMs ${cloud.toFixed(2)}`,
    1
  ),
  text(
    "m-note",
    X,
    BAR1_Y + 70,
    `Fixed ${usd(COST.fixed)} (completion, apply, rerank, index, snapshots) + usage ${usd(COST.meanUsage)}; the agent is ${pct(COST.agentShareOfMean)}; margin ${pct(COST.meanMargin)}`,
    1
  ),
];

/** The mean organisation at a 30 USD seat (Cursor Teams' floor, dossier F60): the margin N5 rejects. */
const margin30 = 1 - COST.meanSeat / (30 + COST.markup * COST.overagePerSeat);

// ── Step 2: three organisation mixes ─────────────────────────────────────────────────────────────────────────────
const H2_Y = BAR1_Y + 110;
const PX2 = 2.4; // px a USD in step 2
const ROW0 = H2_Y + 30;
const PITCH = 52;
const NAMES: Record<(typeof COST.bySegment)[number]["id"], string> = {
  light: "All light seats",
  median: "All median seats",
  heavy: "All heavy seats",
};
const step2: LayoutShape[] = [
  text(
    "h2",
    X,
    H2_Y,
    `${COST.seatPrice} USD a seat with a ${COST.pool} USD pooled allowance; usage above it at list × ${COST.markup}`,
    2,
    false
  ),
  ...COST.bySegment.flatMap((s, i): LayoutShape[] => {
    const y = ROW0 + i * PITCH;
    const wc = Math.round(s.cost * PX2);
    const wr = Math.round(s.revenue * PX2);
    return [
      text(`${s.id}-label`, BAR_X - 12 - textW(NAMES[s.id]), y + 10, NAMES[s.id], 2),
      {
        id: `${s.id}-cost`,
        type: "cell",
        x: BAR_X,
        y,
        w: wc,
        h: 18,
        tone: PROD_TONE.infra,
        fill: "pastel",
        step: 2,
        quiet: true,
      },
      text(`${s.id}-cost-t`, BAR_X + wc + 6, y, `cost ${usd(s.cost)}`, 2),
      {
        id: `${s.id}-rev`,
        type: "cell",
        x: BAR_X,
        y: y + 21,
        w: wr,
        h: 18,
        tone: GENAI_TONE.check,
        fill: "pastel",
        step: 2,
        quiet: true,
      },
      text(`${s.id}-rev-t`, BAR_X + wr + 6, y + 21, `revenue ${usd(s.revenue)} · margin ${pct(s.margin)}`, 2),
    ];
  }),
  text(
    "floor",
    X,
    ROW0 + COST.bySegment.length * PITCH + 2,
    `However heavy the organisation, the mark-up holds margin above 1 − 1 ÷ ${COST.markup} = ${pct(COST.marginFloor)}; at a 30 USD seat the mean falls to ≈ ${pct(margin30)}`,
    2
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Seat economics: ≈ ${COST.meanSeat.toFixed(1)} USD a mean seat at list prices, ≈ ${pct(COST.meanMargin)} margin at ${COST.seatPrice} USD`,
  width: 880,
  height: ROW0 + COST.bySegment.length * PITCH + 30,
  steps: [
    { title: `The mean seat: ≈ ${COST.meanSeat.toFixed(1)} USD, ${pct(COST.agentShareOfMean)} of it the agent` },
    {
      title: `Light, median and heavy organisations: ${COST.bySegment.map((s) => pct(s.margin)).join(", ")} margin, never under ${pct(COST.marginFloor)}`,
    },
  ],
  shapes: [...step1, ...step2],
};

export default spec;
