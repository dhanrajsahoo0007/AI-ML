import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, n } from "@/components/diagrams/presets/production";
import {
  LORA_D,
  LORA_RANKS,
  loraParams,
  loraPercent,
  loraScale,
  note,
} from "@/components/diagrams/presets/production-finetune";

// "What rank and alpha change" on the LoRA, QLoRA & PEFT page (Deep dive). One d × d matrix, d = 4,096.
//   Trainable numbers 2 × d × r: r = 4 → 32,768 (0.20 %) · r = 8 → 65,536 (0.39 %) · r = 16 → 131,072 (0.78 %) ·
//   r = 64 → 524,288 (3.13 %). The count grows in a straight line with r.
//   Scale α ÷ r (Hu et al. 2021: ΔW·x is scaled by α/r). α fixed at 16 (illustrative): r = 4 → 4 · 8 → 2 · 16 → 1 ·
//   64 → 0.25: the update gets quieter as the rank grows. α = 2 × r keeps it at 2 for every rank.
// Steps: 1 parameters by rank (bars) · 2 the scale with α = 16 · 3 the scale with α = 2r.
// Grid: rows 52 apart from y 70; labels x 30, bars x 100 (524,288 → 260 px), counts x 370; scale table x 600 and 710.
// Colours: trained numbers orange (FINETUNE_TONE.trained) throughout; the table header neutral.

const d = LORA_D;
const MAX = loraParams(d, 64);
const BAR_X = 100;
const BAR_W = 260;
const ROW = (i: number) => 74 + i * 52;

const label = (r: number) => `${n(loraParams(d, r))} (${loraPercent(d, r).toFixed(2)} %)`;
const shapes: LayoutShape[] = [
  note("h-bars", 30, 20, 330, "Trained numbers in one 4,096 × 4,096 matrix", { h: 18 }),
  note("h-a16", 575, 20, 110, "α = 16\nscale α ÷ r", { tone: T.trained, step: 2, h: 36 }),
  note("h-a2r", 695, 20, 110, "α = 2 × r\nscale α ÷ r", { tone: T.trained, step: 3, h: 36 }),
];
LORA_RANKS.forEach((r, i) => {
  const count = loraParams(d, r);
  const w = Math.max(14, Math.round((count / MAX) * BAR_W));
  shapes.push(
    note(`r-${r}`, 30, ROW(i) + 4, 60, `r = ${r}`),
    { id: `bar-${r}`, type: "cell", x: BAR_X, y: ROW(i), w, h: 28, tone: T.trained, fill: "pastel" },
    note(`c-${r}`, BAR_X + w + 8, ROW(i) + 4, label(r).length * 7 + 8, label(r), {
      tone: T.trained,
    }),
    {
      id: `s16-${r}`,
      type: "cell",
      x: 590,
      y: ROW(i),
      w: 80,
      h: 28,
      label: String(loraScale(16, r)),
      tone: T.trained,
      fill: r === 64 ? "pastel" : "soft",
      step: 2,
      highlight: r === 64 || undefined,
    },
    {
      id: `s2r-${r}`,
      type: "cell",
      x: 710,
      y: ROW(i),
      w: 80,
      h: 28,
      label: String(loraScale(2 * r, r)),
      tone: T.trained,
      fill: "soft",
      step: 3,
    }
  );
});
shapes.push(
  note("f1", 30, 296, 520, "Trained numbers = 2 × 4,096 × r: doubling r doubles the count.", { step: 1 }),
  note("f2", 575, 296, 230, "With α fixed, a higher rank\ngets a quieter update: 16 ÷ 64 = 0.25.", {
    tone: T.trained,
    step: 2,
    h: 36,
  }),
  note("f3", 575, 340, 230, "α = 2r keeps the scale at 2\nwhatever the rank (α = 16 is illustrative).", {
    tone: T.trained,
    step: 3,
    h: 36,
  })
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "What rank and alpha change",
  width: 830,
  height: 390,
  steps: [
    { title: "The rank sets how many numbers train" },
    { title: "Alpha over r scales the update" },
    { title: "Alpha equal to two r holds the scale steady" },
  ],
  shapes,
};

export default spec;
