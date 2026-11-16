import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, meter, meterSize, n } from "@/components/diagrams/presets/production";
import {
  GPU_GB,
  IN_FLIGHT,
  KV_70B,
  KV_8B,
  PLAN_A,
  PLAN_B_BIG,
  PLAN_B_SMALL,
  REQUEST_TOKENS,
  RESERVE_GB,
  requestKvGB,
  requestsThatFit,
} from "@/components/diagrams/presets/production-gpures";
import { LATENCY, TRAFFIC } from "@/components/diagrams/presets/production";

// "Placing models on GPUs by memory" on the GPU/TPU Resource Management page. A model fits a GPU only if weights + a
// reserve + a KV budget fit; the KV budget is what is left, and it decides how many requests run at once.
// Working (all from presets/production-gpures.ts; GB = 10^9 bytes, 80 GB GPU, illustrative 8 GB reserve):
//   KV per token, 70 B (Llama 3 shape: 80 layers, 8 KV heads, head dim 128): 2 x 80 x 8 x 128 x 2 B = 327,680 B.
//   One request at full length: 2,200 + 250 = 2,450 tokens x 327,680 B = 0.803 GB.
//   In flight at peak: 12 requests/s x 1.5 s = 18 (Little's law) -> 18 x 0.803 = 14.5 GB of KV needed.
//   Plan A, 70 B FP8 (70 GB) on one GPU: 80 - 70 - 8 = 2 GB of KV -> 2 / 0.803 = 2.49 -> 2 requests. Fails (needs 18).
//   Plan B, 70 B split over two GPUs (35 GB each): 80 - 35 - 8 = 37 GB each, 74 GB together -> 74 / 0.803 = 92.2 -> 92
//   requests, 5.1 x the need. Third GPU: two 8 B models (FP8 8 GB + FP16 16 GB), 80 - 24 - 8 = 48 GB of KV; one
//   8 B request = 2,450 x 131,072 B = 0.321 GB -> 48 / 0.321 = 149.5 -> 149 requests.
//
// Steps: 1 Plan A: fits by weights, 2 GB left for KV · 2 how much KV 18 requests need · 3 Plan B: split the big model.
// Grid: left column x 30 (width 380) Plan A and its arithmetic; right column x 450 (width 380) Plan B, three meters 84
// apart from y 60. Legend row at y 14. Colours: weights green (the model), reserve neutral, KV budget violet (a
// store), the verdict lime when it fits and red when it does not.

const LEFT = 30;
const RIGHT = 450;
const W = 380;
const { height: meterH } = meterSize({ width: W });
const ROW = (i: number) => 64 + i * 88;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

const legend = (id: string, x: number, label: string, tone: NonNullable<LayoutShape["tone"]>): LayoutShape => ({
  id,
  type: "cell",
  x,
  y: 12,
  w: 104,
  h: 22,
  label,
  tone,
  fill: "pastel",
  step: 1,
  quiet: true,
});

const fmt1 = (v: number) => v.toFixed(1);
const reqBig = requestKvGB(KV_70B);
const reqSmall = requestKvGB(KV_8B);
const needGB = IN_FLIGHT * reqBig;
const planAFit = requestsThatFit(PLAN_A.kv, KV_70B);
const planBFit = requestsThatFit(2 * PLAN_B_BIG.kv, KV_70B);
const smallFit = requestsThatFit(PLAN_B_SMALL.kv, KV_8B);

const segs = (weights: number, kv: number) => [
  { value: weights, tone: PROD_TONE.model, label: `${weights}` },
  { value: RESERVE_GB, tone: PROD_TONE.infra, label: `${RESERVE_GB}` },
  { value: kv, tone: PROD_TONE.store, label: `${kv}` },
];

const shapes: LayoutShape[] = [
  legend("lg-weights", LEFT, "weights (GB)", PROD_TONE.model),
  legend("lg-reserve", LEFT + 116, "reserve (GB)", PROD_TONE.infra),
  legend("lg-kv", LEFT + 232, "KV budget (GB)", PROD_TONE.store),

  // Step 1: Plan A.
  text("a-head", LEFT, 40, W, "Plan A: the whole 70 B model on one GPU", 1),
  ...meter("a-gpu", LEFT, ROW(0), {
    label: "GPU 0",
    used: GPU_GB,
    limit: GPU_GB,
    unit: "GB",
    width: W,
    max: GPU_GB,
    segments: segs(PLAN_A.weights, PLAN_A.kv),
    limitLabel: `${GPU_GB} GB`,
    step: 1,
  }).map((s) => ({ ...s, quiet: true })),
  text("a-note", LEFT, ROW(0) + meterH + 4, W, "70 GB of weights fit, but only 2 GB are left for KV", 1),

  // Step 2: the KV the traffic needs.
  text("k1", LEFT, 178, W, `KV per token: 2 × 80 × 8 × 128 × 2 B = ${n(KV_70B)} B`, 2),
  text("k2", LEFT, 200, W, `One request: ${n(REQUEST_TOKENS)} tokens × ${n(KV_70B)} B = ${reqBig.toFixed(2)} GB`, 2),
  text(
    "k3",
    LEFT,
    222,
    420,
    `In flight at peak: ${TRAFFIC.peakPerSecond} req/s × ${LATENCY.fullAnswerMs / 1000} s = ${IN_FLIGHT} requests`,
    2
  ),
  text(
    "k4",
    LEFT,
    244,
    W,
    `Needed: ${IN_FLIGHT} × ${reqBig.toFixed(2)} GB = ${fmt1(needGB)} GB of KV`,
    2,
    PROD_TONE.check
  ),
  text(
    "k5",
    LEFT,
    270,
    W,
    `Plan A has ${PLAN_A.kv} GB: room for ${planAFit} requests, not ${IN_FLIGHT}`,
    2,
    PROD_TONE.failure
  ),

  // Step 3: Plan B.
  text("b-head", RIGHT, 40, W, "Plan B: split the big model, share the rest", 3),
  ...meter("b-gpu0", RIGHT, ROW(0), {
    label: "GPU 0: half of the 70 B",
    used: GPU_GB,
    limit: GPU_GB,
    unit: "GB",
    width: W,
    max: GPU_GB,
    segments: segs(PLAN_B_BIG.weights, PLAN_B_BIG.kv),
    limitLabel: `${GPU_GB} GB`,
    step: 3,
  }).map((s) => ({ ...s, quiet: true })),
  ...meter("b-gpu1", RIGHT, ROW(1), {
    label: "GPU 1: the other half",
    used: GPU_GB,
    limit: GPU_GB,
    unit: "GB",
    width: W,
    max: GPU_GB,
    segments: segs(PLAN_B_BIG.weights, PLAN_B_BIG.kv),
    limitLabel: `${GPU_GB} GB`,
    step: 3,
  }).map((s) => ({ ...s, quiet: true })),
  ...meter("b-gpu2", RIGHT, ROW(2), {
    label: "GPU 2: two 8 B models",
    used: GPU_GB,
    limit: GPU_GB,
    unit: "GB",
    width: W,
    max: GPU_GB,
    segments: segs(PLAN_B_SMALL.triage + PLAN_B_SMALL.summariser, PLAN_B_SMALL.kv),
    limitLabel: `${GPU_GB} GB`,
    step: 3,
  }).map((s) => ({ ...s, quiet: true })),
  text(
    "b1",
    RIGHT,
    ROW(2) + meterH + 10,
    W,
    `70 B: 2 × ${PLAN_B_BIG.kv} = ${2 * PLAN_B_BIG.kv} GB ÷ ${reqBig.toFixed(2)} GB = ${planBFit} requests`,
    3
  ),
  text(
    "b2",
    RIGHT,
    ROW(2) + meterH + 32,
    W,
    `8 B pair: ${PLAN_B_SMALL.kv} GB ÷ ${reqSmall.toFixed(2)} GB = ${smallFit} requests`,
    3
  ),
  text(
    "b3",
    RIGHT,
    ROW(2) + meterH + 54,
    W,
    `${planBFit} ≥ ${IN_FLIGHT} in flight: it fits, with ${(planBFit / IN_FLIGHT).toFixed(1)}× headroom`,
    3,
    PROD_TONE.check
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Placing models on GPUs by memory",
  width: 880,
  height: ROW(2) + meterH + 84,
  steps: [
    { title: "Weights fit, but the KV budget is 2 GB" },
    { title: "Eighteen requests need 14.5 GB of KV" },
    { title: "Split the big model across two GPUs" },
  ],
  shapes,
};

export default spec;
