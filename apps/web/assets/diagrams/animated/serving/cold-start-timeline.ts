import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { COLD, coldTotal } from "@/components/diagrams/presets/production-lb";

// Cold start of one new replica with a 16 GB model (load-balancing-autoscaling, Architecture). A request-waterfall
// drawn in seconds (the shared waterfall() builder prints milliseconds, which would show 99,000 ms).
// All durations are ILLUSTRATIVE; the arithmetic is in COLD (presets/production-lb.ts):
//   8 B parameters × 2 bytes = 16 GB of weights; the engine image is taken as 8 GB.
//   Pull the image   8 GB ÷ 0.2 GB/s = 40 s · Download weights 16 GB ÷ 1 GB/s = 16 s ·
//   Load into GPU    16 GB ÷ 2 GB/s = 8 s  · Warm up (compile kernels, capture graphs, dummy requests) 35 s.
//   Total 40 + 16 + 8 + 35 = 99 s. With the image already on the node, the weights on a local disk and a compile
//   cache kept: 0 + 0 + 8 + 15 = 23 s. (Measured values depend on network, disk, GPU and engine version.)
//
// Steps: 1 the slow path, every stage from scratch · 2 the same replica with the stages moved ahead of time.
// Layout: label column x 20..190 (right-aligned); bars from x 200 at 6.4 px per second (99 s = 634 px, ends x 834); the
// fast path sits under the slow one on the same scale. Width 880. Ticks every 20 s.
// Colours: pull and download blue (data being moved), load and warm-up teal (compute, GPU), a lime marker at the
// instant the readiness probe passes. Highlight: the warm-up bar of the slow path.

const AX = 200;
const PX = 6.4; // pixels per second
const ROW = 30;
const BAR = 20;
const x = (s: number) => Math.round(AX + s * PX);

const text = (
  id: string,
  x0: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  align?: "left"
): LayoutShape =>
  ({ id, type: "text", x: x0, y, w, h: 18, label, tone, step, quiet: true, ...(align ? {} : {}) }) as LayoutShape;

type Plan = typeof COLD.slow | typeof COLD.fast;
const stages = (p: Plan) =>
  [
    { id: "pull", label: "Pull the image", s: p.pull, tone: PROD_TONE.data },
    { id: "download", label: "Download weights", s: p.download, tone: PROD_TONE.data },
    { id: "load", label: "Load into GPU memory", s: p.load, tone: PROD_TONE.compute },
    { id: "warm", label: "Warm up and compile", s: p.warm, tone: PROD_TONE.compute },
  ] as const;

function path(kind: "slow" | "fast", p: Plan, y0: number, step: number, title: string): LayoutShape[] {
  const out: LayoutShape[] = [text(`${kind}-head`, 20, y0, 360, title, step)];
  // a head that is left-aligned needs a wide box; text is centred in its box, so the box is sized to the words
  out[0] = { ...out[0], w: Math.ceil(title.length * 6.5) + 6 };
  let t = 0;
  stages(p).forEach((st, i) => {
    const y = y0 + 28 + i * ROW;
    const label = st.label;
    out.push({
      id: `${kind}-${st.id}-label`,
      type: "text",
      x: 20,
      y: y + 6,
      w: 170,
      h: 18,
      label,
      tone: PROD_TONE.infra,
      step,
      quiet: true,
    });
    if (st.s > 0) {
      const w = Math.round(st.s * PX);
      const dur = `${st.s} s`;
      out.push({
        id: `${kind}-${st.id}`,
        type: "cell",
        x: x(t),
        y: y + 5,
        w,
        h: BAR,
        label: w - 8 >= dur.length * 7.2 ? dur : undefined,
        tone: st.tone,
        fill: "pastel",
        highlight: kind === "slow" && st.id === "warm" ? true : undefined,
        step,
      });
      if (w - 8 < dur.length * 7.2) {
        out.push({
          id: `${kind}-${st.id}-dur`,
          type: "text",
          x: x(t) + w + 4,
          y: y + 6,
          w: 48,
          h: 18,
          label: dur,
          tone: PROD_TONE.infra,
          step,
          quiet: true,
        });
      }
      t += st.s;
    } else {
      out.push({
        id: `${kind}-${st.id}-none`,
        type: "text",
        x: x(0),
        y: y + 6,
        w: 150,
        h: 18,
        label: "0 s: already there",
        tone: PROD_TONE.infra,
        step,
        quiet: true,
      });
    }
  });
  const total = coldTotal(p);
  const yEnd = y0 + 28 + 4 * ROW;
  out.push(
    {
      id: `${kind}-ready`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x(total), y0 + 26],
        [x(total), yEnd],
      ],
      dashed: true,
      tone: PROD_TONE.check,
      step,
    },
    {
      id: `${kind}-total`,
      type: "box",
      x: kind === "slow" ? x(total) - 150 : x(total) + 8,
      y: y0 - 2,
      w: 150,
      h: 24,
      label: `ready after ${total} s`,
      tone: PROD_TONE.check,
      fill: "pastel",
      step,
      quiet: true,
    }
  );
  return out;
}

const slowTotal = coldTotal(COLD.slow);
const fastTotal = coldTotal(COLD.fast);
const Y1 = 14;
const Y2 = 214;
const AXIS_Y = Y2 + 28 + 4 * ROW + 6;

const ticks: LayoutShape[] = [];
for (let s = 0; s <= 100; s += 20) {
  ticks.push(
    {
      id: `tick-${s}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x(s), AXIS_Y],
        [x(s), AXIS_Y + 5],
      ],
      tone: PROD_TONE.infra,
      quiet: true,
    } as LayoutShape,
    {
      id: `tick-${s}-label`,
      type: "text",
      x: x(s) - 20,
      y: AXIS_Y + 7,
      w: 40,
      h: 18,
      label: s === 100 ? "100 s" : String(s),
      tone: PROD_TONE.infra,
      quiet: true,
    } as LayoutShape
  );
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cold start of one replica with 16 GB of weights",
  width: 880,
  height: AXIS_Y + 56,
  steps: [
    { title: "From scratch, a new replica takes minutes" },
    { title: "Do the slow stages before the replica is needed" },
  ],
  shapes: [
    ...path("slow", COLD.slow, Y1, 1, "From scratch (illustrative seconds)"),
    ...path("fast", COLD.fast, Y2, 2, "Slow stages done ahead of time"),
    {
      id: "axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [AX, AXIS_Y],
        [x(100), AXIS_Y],
      ],
      tone: PROD_TONE.infra,
      quiet: true,
    } as LayoutShape,
    ...ticks,
    {
      id: "foot",
      type: "text",
      x: 20,
      y: AXIS_Y + 30,
      w: 840,
      h: 18,
      label: `${n(COLD.weightsGB)} GB = 8 billion parameters × 2 bytes. Rates are illustrative: ${slowTotal} s = 40 + 16 + 8 + 35; ${fastTotal} s = 0 + 0 + 8 + 15.`,
      tone: PROD_TONE.infra,
      quiet: true,
    },
  ],
};

export default spec;
