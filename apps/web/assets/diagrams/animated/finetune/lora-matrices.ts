import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { n } from "@/components/diagrams/presets/production";
import { FINETUNE_TONE as T } from "@/components/diagrams/presets/production";
import {
  LORA_D,
  blockBox,
  fullParams,
  link,
  loraParams,
  loraPercent,
  loraScale,
  note,
} from "@/components/diagrams/presets/production-finetune";

// "A frozen weight plus a low-rank update" on the LoRA, QLoRA & PEFT page (Architecture). One attention matrix of a
// decoder, d × d with d = 4,096, and the pair of small matrices LoRA trains beside it (Hu et al. 2021, arXiv
// 2106.09685): h = W·x + (α/r)·B·A·x, A random at the start, B zero.
//   W: 4,096 × 4,096 = 16,777,216 frozen numbers.
//   r = 8: A is 8 × 4,096 = 32,768, B is 4,096 × 8 = 32,768; together 2 × 4,096 × 8 = 65,536 trainable.
//   65,536 ÷ 16,777,216 = 0.0039 = 0.39 %. Scale α/r = 16 ÷ 8 = 2 (α = 16 is illustrative).
// Steps: 1 the frozen weight on its own · 2 the trained pair beside it · 3 the counts. Nodes never move.
// Grid: input x 30, W row y 50, A/B row y 210, sum circle at x 620, output x 690. Not to scale: r = 8 is 1/512 of 4,096.
// Colours: frozen weight neutral, trained pair orange (FINETUNE_TONE), activations blue as data-in-flight stays neutral.

const d = LORA_D;
const r = 8;
const alpha = 16;
const full = fullParams(d);
const trained = loraParams(d, r);

const shapes: LayoutShape[] = [
  blockBox("x", 30, 128, 120, 52, "Input x", T.frozen, { sub: `${n(d)} numbers` }),
  blockBox("w", 230, 40, 260, 70, "W, frozen", T.frozen, { sub: `${n(d)} × ${n(d)} = ${n(full)}` }),
  blockBox("a", 200, 200, 150, 58, "A, trained", T.trained, { sub: `${r} × ${n(d)} = ${n(trained / 2)}`, step: 2 }),
  blockBox("b", 400, 200, 150, 58, "B, trained", T.trained, { sub: `${n(d)} × ${r} = ${n(trained / 2)}`, step: 2 }),
  { id: "sum", type: "circle", x: 640, y: 150, w: 30, symbol: "plus", tone: T.frozen, label: "Add" },
  blockBox("h", 700, 124, 100, 52, "Output h", T.frozen, { sub: `${n(d)} numbers` }),
  link("x>w", "x", "w", { via: [[90, 75]] }),
  link("x>a", "x", "a", { step: 2, via: [[90, 229]] }),
  link("a>b", "a", "b", { step: 2 }),
  link("w>sum", "w", "sum", { via: [[640, 75]] }),
  link("b>sum", "b", "sum", { step: 2, via: [[640, 229]] }),
  link("sum>h", "sum", "h"),
  note("n-r", 255, 264, 90, `rank r = ${r}`, { tone: T.trained, step: 2 }),
  note(
    "n-scale-why",
    520,
    268,
    160,
    `scale α ÷ r = ${alpha} ÷ ${r} = ${loraScale(alpha, r)}\n(α = 16 is illustrative)`,
    {
      tone: T.trained,
      step: 2,
    }
  ),
  note("n-count", 30, 318, 380, `Trained: ${n(trained / 2)} + ${n(trained / 2)} = ${n(trained)} numbers`, {
    tone: T.trained,
    step: 3,
  }),
  note("n-pct", 30, 342, 380, `${n(trained)} ÷ ${n(full)} = ${loraPercent(d, r).toFixed(2)} % of the matrix`, {
    tone: T.trained,
    step: 3,
  }),
  note("n-init", 440, 318, 360, "A starts random and B starts at zero,\nso at step 0 the output equals W·x.", {
    step: 3,
  }),
  note("n-scaleNote", 440, 360, 360, "Drawn to shape, not to scale: 8 is 1/512 of 4,096.", { step: 3 }),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "LoRA beside a frozen weight",
  width: 830,
  height: 400,
  steps: [
    { title: "A frozen weight matrix" },
    { title: "Two small matrices beside it" },
    { title: "Count what is trained" },
  ],
  shapes,
};

export default spec;
