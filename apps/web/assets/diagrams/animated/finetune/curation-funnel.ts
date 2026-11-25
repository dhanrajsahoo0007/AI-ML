import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, n } from "@/components/diagrams/presets/production";
import { funnel } from "@/components/diagrams/presets/rag";
import { CURATION, CURATION_KEPT_SHARE } from "@/components/diagrams/presets/production-synth";
import { leftNote, note } from "@/components/diagrams/presets/production-finetune";

// From raw logs to the 5,000-ticket fine-tuning set (synthetic-data-and-dataset-curation, Core concepts: filtering).
// Counts are ILLUSTRATIVE (presets/production-synth.ts CURATION); the last stage is DATASETS.fineTuneSet. Box widths
// are proportional to counts (funnel() from presets/rag.ts), so the narrowing is the picture. To the right of each
// arrow, how many were dropped (computed) and why.
//   40,000 − 11,500 = 28,500 · 11,500 − 9,800 = 1,700 · 9,800 − 6,900 = 2,900 · 6,900 − 5,000 = 1,900.
//   5,000 ÷ 40,000 = 12.5 % of the raw logs survive.
// Layout (880 x 400): funnel centred at x 270, top y 40, boxes h 48, gap 26 (pitch 74); notes at x 540, level with each gap.
// Colour: data blue for every stage (they are all datasets); the final stage is the accent (green is the model, so it
// stays blue) and gets a highlight ring; notes neutral.

const STAGE_TONE = T.data;
const stages = CURATION.map((s, i) => ({
  label: s.label,
  count: s.count,
  sub: `${n(s.count)} tickets`,
  tone: STAGE_TONE,
  step: undefined as number | undefined,
  _i: i,
}));
const REASON = [
  "no agent-approved reply",
  "a card number or a wrong refund rule",
  "one ticket per thread",
  "routine intents capped, golden set out",
];

const shapes: LayoutShape[] = [...funnel("f", 270, 40, stages, { maxW: 420, minW: 250, h: 48, gap: 26 })];
shapes.push({ ...(shapes.find((s) => s.id === "f-4") as LayoutShape), highlight: true });
shapes.splice(
  shapes.findIndex((s) => s.id === "f-4"),
  1
);
CURATION.slice(1).forEach((s, i) => {
  const dropped = CURATION[i].count - s.count;
  shapes.push(leftNote(`d${i}`, 520, 40 + 48 + i * 74 + 4, `−${n(dropped)}: ${REASON[i]}`));
});
shapes.push(
  leftNote(
    "keep",
    520,
    40 + 4 * 74 + 15,
    `${n(CURATION[4].count)} ÷ ${n(CURATION[0].count)} = ${(CURATION_KEPT_SHARE * 100).toFixed(1)} % survive`,
    { tone: T.data }
  ),
  note("ill", 40, 420, 800, "counts illustrative; box widths are proportional to the counts")
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "From 40,000 raw tickets to the 5,000-ticket fine-tuning set",
  width: 880,
  height: 450,
  shapes,
};

export default spec;
