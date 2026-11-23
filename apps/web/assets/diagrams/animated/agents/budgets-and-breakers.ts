import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { BREAKER, BUDGETS, TURNS_SAVED, pctUsed } from "@/components/diagrams/presets/agents-loop";

// Budgets and a circuit breaker (loop-engineering-and-verification-loops, Core concepts 3 and 4). Top: the three
// budgets the harness checks before every turn, as meters filled to what the bug-fix run of running example B used
// (turns 6 of 20, tokens 24,000 of 32,000, time 2 of 10 min; cap and time illustrative). Bottom: a variant of the run
// in which the second fix fails "parses an empty file" with the same error three turns in a row; the breaker, which
// fingerprints each failure, trips on the third and the loop stops and asks a person with 12 turns still unspent.
//
// Three steps: 1 the three meters · 2 the same failure three times · 3 the breaker trips (ringed) and escalates.
//
// Layout: a heading at y 40; meters at y 76, 132, 188 (label at x 20, bar 560 wide from x 130, the used part a lime
// cell and the rest a paper cell side by side, the share at x 706); a heading at y 256; the variant's three failure
// chips at y 300 (x 20, 204, 388, 160 wide), the breaker at x 600 and the escalation under it.
//
// Colour (agents legend, three tones plus neutral): budgets lime (a guardrail), the repeated failure and the breaker
// red (something breaking), the person orange; labels and empty budget neutral. The breaker is ringed.

const BAR_X = 130;
const BAR_W = 560;
const BAR_H = 40;
const METER_Y = [76, 132, 188] as const;

const fmt = (n: number) => n.toLocaleString("en-GB");

const meters: LayoutShape[] = BUDGETS.flatMap((b, i) => {
  const y = METER_Y[i];
  const usedW = Math.round((BAR_W * b.used) / b.cap);
  return [
    { id: `m${i}-n`, type: "text" as const, x: 20, y, w: 96, h: BAR_H, label: b.name, tone: AGENT_TONE.infra },
    {
      id: `m${i}-used`,
      type: "cell" as const,
      x: BAR_X,
      y,
      w: usedW,
      h: BAR_H,
      label: `${fmt(b.used)} of ${fmt(b.cap)}${b.unit}`,
      tone: AGENT_TONE.check,
      fill: "pastel" as const,
    },
    {
      id: `m${i}-left`,
      type: "cell" as const,
      x: BAR_X + usedW,
      y,
      w: BAR_W - usedW,
      h: BAR_H,
      tone: AGENT_TONE.infra,
      fill: "paper" as const,
      quiet: true,
    },
    {
      id: `m${i}-pct`,
      type: "text" as const,
      x: BAR_X + BAR_W + 16,
      y,
      w: 64,
      h: BAR_H,
      label: `${pctUsed(b)} %`,
      tone: AGENT_TONE.infra,
    },
  ];
});

const CHIP_Y = 300;
const CHIP_W = 160;
const CHIP_H = 48;
const firstTurn = BREAKER.tripTurn - BREAKER.threshold + 1;

const repeats: LayoutShape[] = Array.from({ length: BREAKER.threshold }, (_, i) => {
  const out: LayoutShape[] = [
    {
      id: `f${i}`,
      type: "box",
      x: 20 + i * (CHIP_W + 24),
      y: CHIP_Y,
      w: CHIP_W,
      h: CHIP_H,
      label: BREAKER.failure,
      sub: `turn ${firstTurn + i} · ${i + 1} of ${BREAKER.threshold}`,
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 2,
    },
  ];
  if (i > 0) out.push({ id: `f${i}-a`, type: "arrow", x: 0, y: 0, from: `f${i - 1}`, to: `f${i}`, step: 2 });
  return out;
}).flat();

const spec: LayoutSpec = {
  kind: "layout",
  title: "Budgets and a circuit breaker",
  width: 840,
  height: 456,
  steps: [
    { title: "Three budgets, checked before every turn" },
    { title: "A variant run: the same failure three times" },
    { title: "The breaker trips: stop and ask a person" },
  ],
  shapes: [
    {
      id: "run",
      type: "text",
      x: BAR_X,
      y: 40,
      w: BAR_W,
      h: 24,
      label: "The bug-fix run, checked before every turn",
      tone: AGENT_TONE.infra,
    },
    ...meters,
    {
      id: "variant",
      type: "text",
      x: 20,
      y: 256,
      w: 436,
      h: 24,
      label: "Variant run: the second fix fails the same way, turn after turn",
      tone: AGENT_TONE.infra,
      step: 2,
    },
    ...repeats,
    {
      id: "breaker",
      type: "box",
      x: 600,
      y: CHIP_Y,
      w: 210,
      h: CHIP_H,
      label: "Breaker trips",
      sub: `${BREAKER.threshold} of ${BREAKER.threshold}: same fingerprint`,
      tone: AGENT_TONE.failure,
      fill: "pastel",
      highlight: true,
      step: 3,
    },
    { id: "trip", type: "arrow", x: 0, y: 0, from: `f${BREAKER.threshold - 1}`, to: "breaker", step: 3 },
    {
      id: "ask",
      type: "box",
      x: 600,
      y: CHIP_Y + 88,
      w: 210,
      h: CHIP_H,
      label: "Stop, ask a person",
      sub: `state saved · ${TURNS_SAVED} turns unspent`,
      tone: AGENT_TONE.task,
      fill: "pastel",
      step: 3,
    },
    { id: "escalate", type: "arrow", x: 0, y: 0, from: "breaker", to: "ask", step: 3 },
  ],
};

export default spec;
