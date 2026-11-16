import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { BUDGET, LAYERS, TOTALS } from "@/components/diagrams/presets/llm-anatomy";

// Where the milliseconds and the money go for one request (anatomy-of-an-llm-application, Technical mechanics). The
// Brightpost refund of llm/anatomy-stack, layer by layer: on the left the time each layer adds to the customer's
// path, on the right what each layer costs per request. Every number is ILLUSTRATIVE and comes from presets/
// llm-anatomy.ts, which reads it from the preset that owns it (agents, rag, production, production-gateway,
// production-batch, production-eval, production-online). Working, from that file's header:
//   time  = 6 + 10 + 35 + 7,500 + 900 + 30 + 0 = 8,481 ms; the model is 7,500 ÷ 8,481 = 88 %.
//   money = 5 × $0.0069 + 0.05 × $0.00885 = $0.0345 + $0.00044 = $0.0349; the model is 99 %.
// The support agent's approval (10:20) is not counted: it waits on a person.
//
// Layout (820 × 418): one row per layer, pitch 40, bars 24 high, from y 36. Layer names right-aligned to x 175. Time
// bars from x 185, 300 px for the longest (7,500 ms, so 25 ms per px); money bars from x 535, 220 px for the longest
// ($0.0345). The model's two bars are wide enough to hold their working; every other row prints its value and a note
// after its bar (a bar under 2 px is drawn 2 px wide). A rule under the last row, the two totals, then two lines of
// notes.
// Colour: each row in its layer's tone from LAYERS (the stepper's legend): neutral, violet, green, teal, lime. Four
// tones plus neutral; the model's time bar is the one highlight.

const LABEL_RIGHT = 175;
const MS_X = 185;
const MS_W = 300;
const USD_X = 535;
const USD_W = 220;
const TOP = 36;
const PITCH = 40;
const BAR_H = 24;
// Text shapes are centred in their box, so the box is sized close to the real text (about 5.4 units a character at
// 12.5 px) to keep left- and right-aligned text near its anchor.
const CHAR_W = 5.8;

const text = (id: string, x: number, y: number, label: string, align: "left" | "right" = "left"): LayoutShape => {
  const w = Math.ceil(label.length * CHAR_W) + 6;
  return { id, type: "text", x: align === "left" ? x : x - w, y, w, h: 18, label, tone: AGENT_TONE.infra };
};

const maxMs = Math.max(...LAYERS.map((l) => BUDGET[l.id].ms));
const maxUsd = Math.max(...LAYERS.map((l) => BUDGET[l.id].usd));
const ms = (v: number) => `${v.toLocaleString("en-GB")} ms`;
const usd = (v: number) => (v === 0 ? "$0" : `$${v.toFixed(4)}`);

const rows: LayoutShape[] = LAYERS.flatMap((layer, i) => {
  const b = BUDGET[layer.id];
  const y = TOP + i * PITCH;
  const textY = y + (BAR_H - 18) / 2;
  const isModel = layer.id === "model";
  const msW = Math.max(2, Math.round((b.ms / maxMs) * MS_W));
  const usdW = b.usd === 0 ? 0 : Math.max(2, Math.round((b.usd / maxUsd) * USD_W));
  const out: LayoutShape[] = [
    text(`${layer.id}-name`, LABEL_RIGHT, textY, layer.label, "right"),
    {
      id: `${layer.id}-ms`,
      type: "cell",
      x: MS_X,
      y,
      w: msW,
      h: BAR_H,
      label: isModel ? `${b.msNote} = ${ms(b.ms)}` : undefined,
      tone: layer.tone,
      fill: "pastel",
      highlight: isModel || undefined,
    },
  ];
  if (!isModel) out.push(text(`${layer.id}-ms-note`, MS_X + msW + 10, textY, `${ms(b.ms)} · ${b.msNote}`));
  if (usdW > 0) {
    out.push({
      id: `${layer.id}-usd`,
      type: "cell",
      x: USD_X,
      y,
      w: usdW,
      h: BAR_H,
      label: isModel ? `${b.usdNote} = ${usd(b.usd)}` : undefined,
      tone: layer.tone,
      fill: "pastel",
    });
  }
  if (!isModel) {
    const note = b.usd === 0 && b.usdNote.startsWith("≈") ? b.usdNote : `${usd(b.usd)} · ${b.usdNote}`;
    out.push(text(`${layer.id}-usd-note`, USD_X + usdW + (usdW > 0 ? 10 : 0), textY, note));
  }
  return out;
});

const RULE_Y = TOP + LAYERS.length * PITCH + 2;
const pct = (v: number) => `${Math.round(v * 100)} %`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One refund request: where the milliseconds and the money go",
  width: 820,
  height: RULE_Y + 100,
  shapes: [
    text("head-ms", MS_X, 4, "Time on the customer's path"),
    text("head-usd", USD_X, 4, "Money per request (US dollars)"),
    ...rows,
    {
      id: "rule",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [10, RULE_Y],
        [810, RULE_Y],
      ],
    },
    text("total-ms", MS_X, RULE_Y + 10, `total ${ms(TOTALS.ms)}: the model is ${pct(TOTALS.modelMsShare)}`),
    text("total-usd", USD_X, RULE_Y + 10, `total ${usd(TOTALS.usd)}: the model is ${pct(TOTALS.modelUsdShare)}`),
    text(
      "note-1",
      10,
      RULE_Y + 46,
      "Illustrative timings and list prices, the shared Brightpost numbers. Servers paid by the month show $0 here."
    ),
    text(
      "note-2",
      10,
      RULE_Y + 68,
      `Not counted: the support agent's approval at ${TOTALS.approvedAt}, minutes of waiting on a person.`
    ),
  ],
};

export default spec;
