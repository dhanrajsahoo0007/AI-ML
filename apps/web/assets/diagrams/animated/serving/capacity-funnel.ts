import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TOKENS, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { SIZING } from "@/components/diagrams/presets/production-serving";
import { MONTH, USERS } from "@/components/diagrams/presets/production-capacity";

// From users to GPUs for Brightpost (capacity-planning-and-cost-estimation, "A worked estimate"). Five steps, one
// box each, left to right, with the working under it:
//   1 users: 50,000 customers a day, 4 requests each (assumed, illustrative)
//   2 requests: 50,000 × 4 = 200,000 a day; ÷ 86,400 s = 2.31, written 2.3 requests/s
//   3 peak: × 5 (a busy hour after a sale, illustrative) = 11.6, written 12 requests/s
//   4 tokens: 12 × 2,200 = 26,400 in a second; 12 × 250 = 3,000 out; prompt share 2,200 ÷ 2,450 = 90 %
//   5 GPUs: 35.2 TFLOP ÷ 400 TFLOP/s = 88 ms per prompt; 12 × 0.088 = 1.06 GPU-s a second; ÷ 0.6 = 1.76 → 2; + 1 = 3
// Same sizing as llm-serving-inference (SIZING in presets/production-serving.ts). Constants from
// presets/production-capacity.ts, which checks them.
//
// Grid (880 wide): five columns x = 15 + 178·i, box w 148, y 20, h 64; working text under each, y 100.
// Colours (PROD_TONE): users and requests orange, tokens blue, GPUs teal (the one highlight); arrows neutral.

const COL = (i: number) => 15 + i * 178;
const W = 148;
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.5) + 8;

const stage = (
  i: number,
  id: string,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  working: string,
  highlight = false
): LayoutShape[] => [
  { id, type: "box", x: COL(i), y: 20, w: W, h: 64, label, sub, tone, fill: "pastel", step: i + 1, highlight },
  ...(i > 0
    ? [{ id: `${id}-in`, type: "arrow" as const, x: 0, y: 0, from: `s${i - 1}`, to: id, step: i + 1, quiet: true }]
    : []),
  ...working
    .split("\n")
    .reduce<string[]>(
      (acc, line, k) => (k % 3 === 0 ? [...acc, line] : [...acc.slice(0, -1), `${acc[acc.length - 1]}\n${line}`]),
      []
    )
    .map((chunk, k): LayoutShape => ({
      id: `${id}-work${k}`,
      type: "text",
      x: COL(i) + 2,
      y: 98 + k * 54,
      w: hug(chunk),
      h: 18 * chunk.split("\n").length,
      label: chunk,
      tone: PROD_TONE.infra,
      step: i + 1,
      quiet: true,
    })),
];

const avg = TRAFFIC.averagePerSecond;
const shapes: LayoutShape[] = [
  ...stage(
    0,
    "s0",
    "Users",
    `${n(USERS.perDay)} a day`,
    PROD_TONE.traffic,
    "Customers who open\nthe chat in a day\n(assumed)"
  ),
  ...stage(
    1,
    "s1",
    "Requests",
    `${n(TRAFFIC.requestsPerDay)} a day`,
    PROD_TONE.traffic,
    `${n(USERS.perDay)} × ${USERS.requestsEach} = ${n(TRAFFIC.requestsPerDay)}\n÷ ${n(TRAFFIC.secondsPerDay)} s\n= ${avg} a second`
  ),
  ...stage(
    2,
    "s2",
    "Peak rate",
    `${TRAFFIC.peakPerSecond} requests/s`,
    PROD_TONE.traffic,
    `${avg} × ${TRAFFIC.peakFactor} = 11.6, call it ${TRAFFIC.peakPerSecond}\nthe peak sizes the fleet,\nnot the average`
  ),
  ...stage(
    3,
    "s3",
    "Tokens a second",
    `${n(SIZING.promptTokensPerSec)} in · ${n(SIZING.outputTokensPerSec)} out`,
    PROD_TONE.data,
    `${TRAFFIC.peakPerSecond} × ${n(TOKENS.inputPerRequest)} = ${n(SIZING.promptTokensPerSec)} in\n${TRAFFIC.peakPerSecond} × ${TOKENS.outputPerRequest} = ${n(SIZING.outputTokensPerSec)} out\n${SIZING.promptSharePct} % are prompt tokens`
  ),
  ...stage(
    4,
    "s4",
    `${MONTH.fleetReplicas} replicas`,
    "2 + 1 spare",
    PROD_TONE.compute,
    `${SIZING.prefillMsPerRequest} ms of prefill each\n${TRAFFIC.peakPerSecond} × 0.088 = ${SIZING.peakGpu.toFixed(2)}\n÷ 0.6 → 2, +1 = ${MONTH.fleetReplicas}`,
    true
  ),
  {
    id: "note",
    type: "text",
    x: 15,
    y: 190,
    w: 850,
    h: 36,
    label:
      "Illustrative: users per day, requests per user, the 5× peak, 400 TFLOP/s sustained per GPU and the 60 % target.\nThe 2 + 1 sizing is the one in LLM Serving & Inference; a load test replaces it.",
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From users to GPUs for Brightpost",
  width: 880,
  height: 240,
  steps: [
    { title: "Start with users" },
    { title: "Users become requests a day" },
    { title: "The peak, not the average" },
    { title: "Requests become tokens" },
    { title: "Tokens become GPUs" },
  ],
  shapes,
};

export default spec;
