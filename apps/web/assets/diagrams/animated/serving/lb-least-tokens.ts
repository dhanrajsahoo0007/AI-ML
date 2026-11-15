import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, meter, meterSize, n } from "@/components/diagrams/presets/production";
import {
  LB_BUDGET,
  LB_REQUESTS,
  leastTokens,
  placementLoads,
  roundRobin,
  type Placement,
} from "@/components/diagrams/presets/production-lb";

// Round-robin against least tokens in flight (load-balancing-autoscaling, Core concepts). Nine requests arrive in a
// burst and are shared over three replicas. A request's cost is its tokens (prompt + answer), not 1.
//   Requests A–I: 400, 600, 8,000, 500, 300, 7,000, 450, 700, 9,000 = 26,950 tokens; an even share is 8,983.
//   Round-robin (A→1, B→2, C→3, D→1 …): R1 = A+D+G = 1,350 · R2 = B+E+H = 1,600 · R3 = C+F+I = 24,000.
//     Busiest ÷ quietest = 24,000 ÷ 1,350 = 17.8×. R3 is 12,000 over the illustrative 12,000-token budget.
//   Least tokens in flight (each request to the replica with the fewest tokens so far, ties to the lowest number):
//     R1 = A+D+F = 7,900 · R2 = B+E+G+H+I = 11,050 · R3 = C = 8,000. Busiest ÷ quietest = 1.4×. None over budget.
// All loads are computed in presets/production-lb.ts from LB_REQUESTS; the lengths and the budget are illustrative.
// (Tokens "in flight" are counted as if the nine are all still running; a real router also subtracts finished ones.)
//
// Steps: 1 round-robin · 2 least tokens in flight · 3 the spread of each.
// Layout: header text at y 8; round-robin panel y 78 (three meters 80 apart); least-tokens panel y 372; the spread box sits at the panel header row, right column; meters 540
// wide from x 30; notes in a column at x 590. Tones: requests orange (traffic), the spread lime (a metric), the
// overrun red (the meter's own cell). Highlight: replica 3's bar under round-robin.

const W = 840;
const MX = 30;
const MW = 540;
const NOTE_X = 590;
const PITCH = 80;
const SCALE = 24_000;
const { height: MH } = meterSize({ width: MW });

const rr = roundRobin();
const lt = leastTokens();

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number) =>
  ({ id, type: "text", x, y, w, h, label, tone: PROD_TONE.infra, step, quiet: true }) as LayoutShape;

function panel(kind: "rr" | "lt", title: string, p: Placement, y0: number, step: number): LayoutShape[] {
  const loads = placementLoads(p);
  const out: LayoutShape[] = [text(`${kind}-head`, MX, y0, Math.ceil(title.length * 6.5) + 6, 18, title, step)];
  p.forEach((reqs, i) => {
    const y = y0 + 28 + i * PITCH;
    out.push(
      ...meter(`${kind}-${i}`, MX, y, {
        label: `Replica ${i + 1}`,
        used: loads[i],
        limit: LB_BUDGET,
        unit: "tokens",
        width: MW,
        max: SCALE,
        limitLabel: "budget 12,000 (illustrative)",
        segments: reqs.map((r) => ({ value: r.tokens, tone: PROD_TONE.traffic, label: r.id })),
        highlight: kind === "rr" && i === 2 ? true : undefined,
        step,
      }),
      text(
        `${kind}-${i}-sum`,
        NOTE_X,
        y + 28,
        W - NOTE_X - 10,
        18,
        `${reqs.map((r) => r.id).join(" + ")} = ${n(loads[i])}`,
        step
      )
    );
  });
  const hi = Math.max(...loads);
  const lo = Math.min(...loads);
  out.push({
    id: `${kind}-spread`,
    type: "box",
    x: NOTE_X,
    y: y0 - 6,
    w: W - NOTE_X - 10,
    h: 40,
    label: `busiest ÷ quietest = ${(hi / lo).toFixed(1)}×`,
    sub: `${n(hi)} ÷ ${n(lo)}`,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 3,
    quiet: true,
  });
  return out;
}

const reqLine = (from: number, to: number) =>
  LB_REQUESTS.slice(from, to)
    .map((r) => `${r.id} ${n(r.tokens)}`)
    .join("   ");
const total = LB_REQUESTS.reduce((a, r) => a + r.tokens, 0);

const shapes: LayoutShape[] = [
  text(
    "requests",
    MX,
    8,
    W - 2 * MX,
    54,
    `Nine requests arrive together; each costs its prompt + answer tokens (illustrative):\n${reqLine(0, 5)}   ·   ${reqLine(5, 9)}\nTotal ${n(total)} tokens, so an even share over 3 replicas is ${n(Math.round(total / 3))}.`,
    1
  ),
  ...panel("rr", "Round-robin: A to replica 1, B to 2, C to 3, D to 1 …", rr, 78, 1),
  ...panel("lt", "Least tokens in flight: each request to the replica with the fewest so far", lt, 372, 2),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Round-robin overloads one replica; least tokens in flight does not",
  width: W,
  height: 372 + 28 + 2 * PITCH + MH + 12,
  steps: [
    { title: "Round-robin deals requests in turn" },
    { title: "Least tokens in flight deals by load" },
    { title: "Compare the spread" },
  ],
  shapes,
};

export default spec;
