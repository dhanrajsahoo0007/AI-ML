import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { blockBox, leftNote, link, note } from "@/components/diagrams/presets/production-finetune";
import { PAIRS, PAIRS_KEPT, PAIRS_RAW } from "@/components/diagrams/presets/production-pref";

// Where Brightpost's preference pairs come from (reinforcement-preference-learning, Core concepts). Three signals, each
// turned into "answer A beat answer B for the same prompt", pooled, filtered, and used for a reward model or for DPO.
// Counts are ILLUSTRATIVE (presets/production-pref.ts): 2,000 + 6,000 + 4,000 = 12,000 pairs; − 3,000 filtered = 9,000
// (25 % dropped). Static. Layout (880 x 330): three source boxes x 20 / w 270 at y 30 / 120 / 210 (h 56); pair store
// x 350 y 120 (w 150); filter x 550 y 120 (w 140); preference set x 730 y 120 (w 130); notes under the filter and sums
// at y 290. Colour: data blue, the store violet, the filter lime (a check), the preference set blue with a ring.

const src = (id: string, y: number, label: string, sub: string) => blockBox(id, 20, y, 290, 56, label, T.data, { sub });

const shapes: LayoutShape[] = [
  src("edit", 30, "Agent edits", `${n(PAIRS.edits)} pairs: the edited reply beats the draft`),
  src("thumb", 120, "Thumbs", `${n(PAIRS.thumbs)} pairs: liked beats disliked`),
  src("judge", 210, "Judge model", `${n(PAIRS.judge)} pairs: a rubric picks the winner`),
  blockBox("store", 370, 120, 140, 56, "Pair store", PROD_TONE.store, { sub: `${n(PAIRS_RAW)} pairs` }),
  blockBox("filter", 560, 120, 140, 56, "Filter", T.check, { sub: `−${n(PAIRS.dropped)} pairs` }),
  blockBox("set", 740, 120, 120, 56, "Training set", T.data, { sub: `${n(PAIRS_KEPT)} pairs`, highlight: true }),
  link("e-s", "edit", "store"),
  link("t-s", "thumb", "store"),
  link("j-s", "judge", "store"),
  link("s-f", "store", "filter"),
  link("f-t", "filter", "set"),
  note("nf", 520, 190, 220, "drops ties, signals that disagree,\nand answers that break the refund rule", { h: 36 }),
  leftNote(
    "sum",
    20,
    290,
    `${n(PAIRS.edits)} + ${n(PAIRS.thumbs)} + ${n(PAIRS.judge)} = ${n(PAIRS_RAW)}   ·   ${n(PAIRS_RAW)} − ${n(PAIRS.dropped)} = ${n(PAIRS_KEPT)}   ·   ${((PAIRS.dropped / PAIRS_RAW) * 100).toFixed(0)} % dropped   (all counts illustrative)`
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where Brightpost's preference pairs come from",
  width: 880,
  height: 330,
  shapes,
};

export default spec;
