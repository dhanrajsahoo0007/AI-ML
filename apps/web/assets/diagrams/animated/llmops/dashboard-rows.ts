import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { DATASETS, LATENCY, PROD_TONE, TOKENS, TRAFFIC, n } from "@/components/diagrams/presets/production";
import {
  DECODE_TOKENS_PER_S,
  OPS_COST,
  QUALITY,
  box,
  halfWidth,
  note,
} from "@/components/diagrams/presets/production-ops";

// Brightpost's LLM dashboard as four rows (alerting-dashboards, Architecture). Read top to bottom: is anyone using it
// (traffic), is it fast (latency), is it right (quality), what does it cost (cost). Each row has a question, three tiles
// with a number, and a line saying what the row teaches.
//
// Working (presets/production.ts, production-ops.ts; prices illustrative):
//   Traffic: 200,000 requests a day = 2.3 requests/s average; peak 12 requests/s (about 5 x average).
//   Latency: p95 time to first token target 400 ms; full answer 1,500 ms; decode 4.4 ms per token = 227 tokens/s.
//   Quality: live pass rate 90 % on a weekly sample of 200 graded answers; floor 85 %; 95 % range
//     1.96 x sqrt(0.9 x 0.1 / 200) = 4.2 points, written "plus or minus 4 points".
//   Cost: 440 M in x $2 + 50 M out x $10 = $880 + $500 = $1,380 a day; $0.0069 a request (illustrative list prices).
//
// Steps 1-4 reveal one row each. Layout (880 x 436): row pitch 106; row label box x 15 (w 130, h 70) at y 20 + 106 i;
// three tiles x 165 / 405 / 645 (w 220, h 70); a one-line note under the tiles at y + 74.
// Colour (three tones plus neutral): traffic orange, latency teal, quality lime, cost neutral.

const rows: { id: string; label: string; sub: string; tone: LayoutTone; tiles: [string, string][]; says: string }[] = [
  {
    id: "traffic",
    label: "Traffic",
    sub: "is anyone using it?",
    tone: PROD_TONE.traffic,
    tiles: [
      [`${TRAFFIC.averagePerSecond} req/s`, "average over the day"],
      [`${TRAFFIC.peakPerSecond} req/s`, "peak after a sale"],
      [n(TRAFFIC.requestsPerDay), "requests a day"],
    ],
    says: "A sudden drop is a symptom too: a broken app sends no requests.",
  },
  {
    id: "latency",
    label: "Latency",
    sub: "is it fast?",
    tone: PROD_TONE.compute,
    tiles: [
      [`${LATENCY.firstTokenMs} ms`, "TTFT p95 target"],
      [`${n(LATENCY.fullAnswerMs)} ms`, "full answer p95 target"],
      [`${DECODE_TOKENS_PER_S} tokens/s`, "decode speed (illustrative)"],
    ],
    says: "Percentiles, not the mean: the mean hides the slow tail.",
  },
  {
    id: "quality",
    label: "Quality",
    sub: "is it right?",
    tone: PROD_TONE.check,
    tiles: [
      [`${Math.round(QUALITY.baseline * 100)} %`, `pass rate, ${DATASETS.goldenSet} graded a week`],
      [`${Math.round(QUALITY.floor * 100)} %`, "floor: below it, page"],
      [`±${Math.round(halfWidth(180, DATASETS.goldenSet) * 100)} points`, "95 % range on 200 answers"],
    ],
    says: "No HTTP error marks a wrong answer: only graded samples show it.",
  },
  {
    id: "cost",
    label: "Cost",
    sub: "what does it burn?",
    tone: PROD_TONE.infra,
    tiles: [
      [`${TOKENS.inputPerDayLabel} / ${TOKENS.outputPerDayLabel}`, "tokens in / out a day"],
      [`$${n(OPS_COST.perDay)} a day`, "at list price (illustrative)"],
      [`$${(OPS_COST.perRequestIn + OPS_COST.perRequestOut).toFixed(4)}`, "per request (illustrative)"],
    ],
    says: "An incident that spares latency can still double this row.",
  },
];

const shapes: LayoutShape[] = [];
rows.forEach((r, i) => {
  const y = 20 + i * 106;
  const step = i + 1;
  shapes.push(box(`${r.id}-label`, 15, y, 130, 70, r.label, r.sub, r.tone, step));
  r.tiles.forEach(([value, sub], k) => {
    shapes.push({
      id: `${r.id}-t${k}`,
      type: "cell",
      x: 165 + k * 240,
      y,
      w: 220,
      h: 70,
      label: value,
      sub,
      tone: r.tone,
      fill: "soft",
      step,
      quiet: true,
    });
  });
  shapes.push(note(`${r.id}-says`, 165, y + 74, 700, 20, r.says, step));
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Brightpost's LLM dashboard in four rows: traffic, latency, quality, cost",
  width: 880,
  height: 436,
  steps: [
    { title: "Traffic: is anyone using it?" },
    { title: "Latency: is it fast?" },
    { title: "Quality: is it right?" },
    { title: "Cost: what does it burn?" },
  ],
  shapes,
};

export default spec;
