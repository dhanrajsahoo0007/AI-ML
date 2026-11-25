import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, meter, meterSize } from "@/components/diagrams/presets/production";
import {
  GPU_BUSY_LIMIT,
  GPU_SECONDS_PER_REQUEST,
  failoverPlan,
  singleRegionGpus,
} from "@/components/diagrams/presets/production-region";

// The spare capacity a region needs so the others can absorb it if it fails (multi-region-edge-deployment, Deep dive).
// Brightpost's peak is 12 requests/s (TRAFFIC.peakPerSecond). With N regions sharing it, each takes 12 ÷ N while all
// are up. When one fails, each survivor takes 12 ÷ (N − 1), so each region must be SIZED for 12 ÷ (N − 1) and the
// fleet for N × 12 ÷ (N − 1) = 12 × N/(N − 1).
//   N = 2: normal 6 each; after a failure the survivor takes 12; sized 12 each; fleet 24 req/s (2.0× the peak).
//   N = 3: normal 4 each; after a failure each survivor takes 4 + 2 = 6; sized 6 each; fleet 18 req/s (1.5×).
// GPUs: one request is 2,200 × 0.04 ms = 88 ms of prefill (illustrative); keep a GPU under 60 % busy with prefill:
//   GPUs for a rate r = ceil(r × 0.088 ÷ 0.6).  12 req/s → 1.76 → 2.   6 req/s → 0.88 → 1.
//   One region alone: 2 GPUs. N = 2: 2 × 2 = 4 GPUs. N = 3: 3 × 1 = 3 GPUs. (No spare GPU inside a region is counted.)
// All of it is computed in presets/production-region.ts. Rates and the 60 % limit are illustrative.
// Steps: 1 two regions, all up then one down · 2 three regions · 3 the cost of each design.
// Layout: panel 1 at y 10, panel 2 below; each panel has a row "all regions up" and a row "one region fails", with a
// meter per region (two 360 wide, or three 240 wide); the failed region is a red box. Orange is traffic, red is the
// failed region, lime the sizing check. Highlight: the survivor at its limit in the two-region case.

const W = 840;
const MX = 30;
const ROW_H = 24 + meterSize().height;
const PANEL_H = 18 + 2 * (22 + ROW_H) + 24;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const NAMES = ["A", "B", "C"];
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function panel(regions: number, y0: number, step: number): LayoutShape[] {
  const plan = failoverPlan(regions);
  const mw = regions === 2 ? 360 : 240;
  const gap = regions === 2 ? 60 : 30;
  const out: LayoutShape[] = [
    text(
      `p${regions}-head`,
      MX,
      y0,
      W - 2 * MX,
      18,
      `${regions} regions share the ${TRAFFIC.peakPerSecond} requests/s peak`,
      step
    ),
  ];
  const absorbed = plan.normalShare / (regions - 1);
  ["up", "down"].forEach((state, row) => {
    const ry = y0 + 24 + row * (22 + ROW_H);
    out.push(
      text(
        `p${regions}-${state}-head`,
        MX,
        ry,
        W - 2 * MX,
        18,
        row === 0 ? "All regions up" : "Region A fails; its traffic moves to the others",
        step
      )
    );
    for (let i = 0; i < regions; i++) {
      const x = MX + i * (mw + gap);
      const y = ry + 22;
      const id = `p${regions}-${state}-${i}`;
      if (row === 1 && i === 0) {
        out.push(text(`${id}-title`, x, y, 120, 18, `Region ${NAMES[i]}`, step), {
          id,
          type: "box",
          x,
          y: y + 24,
          w: mw,
          h: 28,
          label: "down: 0 requests/s",
          tone: PROD_TONE.failure,
          fill: "pastel",
          step,
          quiet: true,
        });
        continue;
      }
      const own = plan.normalShare;
      const used = row === 0 ? own : own + absorbed;
      out.push(
        ...meter(id, x, y, {
          label: `Region ${NAMES[i]}`,
          used,
          limit: plan.sizedFor,
          unit: "req/s",
          width: mw,
          limitLabel: `sized for ${fmt(plan.sizedFor)}`,
          segments:
            row === 0
              ? [{ value: own, tone: PROD_TONE.traffic, label: `own ${fmt(own)}` }]
              : [
                  { value: own, tone: PROD_TONE.traffic, label: `own ${fmt(own)}` },
                  { value: absorbed, tone: PROD_TONE.traffic, label: `from A ${fmt(absorbed)}` },
                ],
          highlight: regions === 2 && row === 1 && i === 1 ? true : undefined,
          step,
        })
      );
    }
  });
  const gpuWork = `${fmt(plan.sizedFor)} × ${GPU_SECONDS_PER_REQUEST.toFixed(3)} s ÷ ${GPU_BUSY_LIMIT} = ${((plan.sizedFor * GPU_SECONDS_PER_REQUEST) / GPU_BUSY_LIMIT).toFixed(2)}`;
  out.push(
    text(
      `p${regions}-note`,
      MX,
      y0 + 24 + 2 * (22 + ROW_H) - 4,
      W - 2 * MX,
      18,
      `Sized for ${TRAFFIC.peakPerSecond} ÷ ${regions - 1} = ${fmt(plan.sizedFor)} req/s each: ${gpuWork} GPUs, so ${plan.gpusPerRegion} per region, ${plan.gpusTotal} in all`,
      step
    )
  );
  return out;
}

const P2 = 10;
const P3 = P2 + PANEL_H + 24;
const S = P3 + PANEL_H + 24;
const BOX_H = 74;

const cost = (id: string, x: number, w: number, label: string, sub: string, sub2: string): LayoutShape => ({
  id,
  type: "box",
  x,
  y: S + 22,
  w,
  h: BOX_H,
  label: `${label}
${sub}
${sub2}`,
  tone: PROD_TONE.check,
  fill: "pastel",
  step: 3,
});

const p2 = failoverPlan(2);
const p3 = failoverPlan(3);
const boxW = 250;
const boxGap = (W - 2 * MX - 3 * boxW) / 2;

const shapes: LayoutShape[] = [
  ...panel(2, P2, 1),
  ...panel(3, P3, 2),
  text(
    "s-head",
    MX,
    S,
    W - 2 * MX,
    18,
    `What survives one failed region, at a ${TRAFFIC.peakPerSecond} requests/s peak`,
    3
  ),
  cost(
    "s1",
    MX,
    boxW,
    "1 region",
    `${TRAFFIC.peakPerSecond} req/s of capacity`,
    `${singleRegionGpus} GPUs; a region failure is an outage`
  ),
  cost(
    "s2",
    MX + boxW + boxGap,
    boxW,
    "2 regions",
    `${fmt(p2.fleetCapacity)} req/s = ${(p2.fleetCapacity / TRAFFIC.peakPerSecond).toFixed(1)}× the peak`,
    `${p2.gpusTotal} GPUs, ${p2.gpusTotal / singleRegionGpus}× one region`
  ),
  cost(
    "s3",
    MX + 2 * (boxW + boxGap),
    boxW,
    "3 regions",
    `${fmt(p3.fleetCapacity)} req/s = ${(p3.fleetCapacity / TRAFFIC.peakPerSecond).toFixed(1)}× the peak`,
    `${p3.gpusTotal} GPUs, ${(p3.gpusTotal / singleRegionGpus).toFixed(1)}× one region`
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Spare capacity so the other regions can absorb a failed one",
  width: W,
  height: S + 22 + BOX_H + 14,
  steps: [
    { title: "Two regions: each must carry the whole peak" },
    { title: "Three regions: each carries half" },
    { title: "What each design costs" },
  ],
  shapes,
};

export default spec;
