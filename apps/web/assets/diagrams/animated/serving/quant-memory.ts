import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, meter, meterSize, n } from "@/components/diagrams/presets/production";
import {
  BANDWIDTH_TB_S,
  GPU_GB,
  QUANT_BITS,
  QUANT_MODELS,
  readMs,
  weightsGB,
} from "@/components/diagrams/presets/production-quant";

// "Weights in GPU memory" on the Quantization & Optimization page: the bytes a model's weights take at 16, 8 and 4
// bits against one 80 GB GPU, from bytes = parameters × bits ÷ 8 (weights only: no KV cache, no activations).
//   7 B:  16 bit 7e9 × 2 = 14 GB · 8 bit 7 GB · 4 bit 3.5 GB (all fit)
//   70 B: 16 bit 70e9 × 2 = 140 GB (60 GB over: needs 2 GPUs) · 8 bit 70 GB (fits, 10 GB left for the KV cache) ·
//         4 bit 35 GB (fits, 45 GB left)
//   Reading the weights once at an illustrative 3 TB/s (decode reads all of them for every token, on one GPU):
//   7 B 4.7 / 2.3 / 1.2 ms, 70 B 46.7 / 23.3 / 11.7 ms (readMs = GB ÷ 3,000 GB/s).
// Real 4-bit files are a little larger because each group of weights carries a scale (see the page).
//
// Steps: 1 the 7 B model · 2 the 70 B model · 3 the time to read the weights once.
// Grid: two columns of three meters, 380 wide, x 40 and 450; scale 0–150 GB in both so the bars compare; rows 92
// apart from y 60. Colours: weights green (the model); anything past the GPU red (the engine's overrun cell).

const COL_X = [40, 450] as const;
const ROW_Y = (i: number) => 64 + i * 96;
const WIDTH = 380;
const SCALE_MAX = 150;

const shapes: LayoutShape[] = [];
QUANT_MODELS.forEach((m, mi) => {
  const step = mi + 1;
  shapes.push({
    id: `${m.id}-head`,
    type: "text",
    x: COL_X[mi],
    y: 16,
    w: 120,
    h: 20,
    label: `${m.label} parameters`,
    tone: PROD_TONE.infra,
    step,
    quiet: true,
  });
  QUANT_BITS.forEach((bits, bi) => {
    const gb = weightsGB(m.params, bits);
    const id = `${m.id}-${bits}`;
    shapes.push(
      ...meter(id, COL_X[mi], ROW_Y(bi), {
        highlight: id === "70b-8" || undefined,
        label: `${bits} bits (${bits / 8} byte${bits === 8 ? "" : "s"} each)`.replace("0.5 bytes", "half a byte"),
        used: gb,
        limit: GPU_GB,
        unit: "GB",
        width: WIDTH,
        max: SCALE_MAX,
        tone: PROD_TONE.model,
        limitLabel: `${GPU_GB} GB GPU`,
        step,
      }).map((s) => ({ ...s, quiet: true }))
    );
    // Step 3: time to read the weights once.
    const ms = readMs(gb);
    shapes.push({
      id: `${id}-read`,
      type: "text",
      x: COL_X[mi],
      y: ROW_Y(bi) + 24 + 28 + 6,
      w: 112,
      h: 18,
      label: `read once: ${ms.toFixed(1)} ms`,
      tone: PROD_TONE.check,
      step: 3,
      quiet: true,
    });
  });
});
const { height: meterH } = meterSize({ width: WIDTH });
shapes.push(
  {
    id: "formula",
    type: "text",
    x: 40,
    y: ROW_Y(2) + meterH + 18,
    w: 350,
    h: 18,
    label: "GB = parameters × bits ÷ 8 ÷ 10⁹ (weights only, no KV cache)",
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  },
  {
    id: "read-note",
    type: "text",
    x: 450,
    y: ROW_Y(2) + meterH + 18,
    w: 300,
    h: 18,
    label: `time = GB ÷ ${n(BANDWIDTH_TB_S * 1000)} GB/s (illustrative ${BANDWIDTH_TB_S} TB/s)`,
    tone: PROD_TONE.check,
    step: 3,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Weight memory at 16, 8 and 4 bits against an 80 GB GPU",
  width: 880,
  height: ROW_Y(2) + meterH + 46,
  steps: [
    { title: "A 7 B model fits at every width" },
    { title: "A 70 B model needs 8 bits to fit one GPU" },
    { title: "Fewer bytes also means a shorter read per token" },
  ],
  shapes,
};

export default spec;
