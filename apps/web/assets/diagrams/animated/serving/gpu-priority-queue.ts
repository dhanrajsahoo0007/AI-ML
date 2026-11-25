import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { BATCH_AHEAD, FIFO_WAIT_MS, SLOT_MS } from "@/components/diagrams/presets/production-gpures";
import { LATENCY } from "@/components/diagrams/presets/production";

// "Interactive work goes first on a shared GPU" on the GPU/TPU Resource Management page. Eight batch requests (nightly
// ticket summaries, blue: data) wait for a GPU that serves one request per 100 ms slot (illustrative); then one
// interactive request (orange: traffic) arrives.
//   First come, first served: the interactive request is last in line, so it waits 8 x 100 ms = 800 ms, past the 400 ms
//   first-token target (LATENCY.firstTokenMs).
//   Priority scheduling: it moves to the front and waits for the slot already running, at most 100 ms.
//   Pre-emption: when every KV block is held by batch work, the engine evicts a batch request, frees its blocks and
//   re-runs that request's prefill later (recompute). vLLM: `--scheduling-policy priority` (lower value first);
//   the default pre-emption mode in its V1 engine is recompute (docs, November 2026).
//
// Steps: 1 first come, first served · 2 priority · 3 pre-emption when memory is full.
// Grid: three lanes at y 50, 150, 250 (80 apart); lane label column x 20 (w 130); queue cells 9 x 48 wide from x 170
// (pitch 54); GPU box x 700 (w 150). Colours: batch blue, interactive orange, GPU teal, a met target lime, a missed
// target red.

const CELL_W = 48;
const PITCH = 54;
const CELLS_X = 170;
const GPU_X = 700;
const LANE_Y = [20, 120, 220] as const;

const shapes: LayoutShape[] = [];
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

// One lane of queue cells. `order` is left to right; the cell nearest the GPU is the next to run.
function lane(prefix: string, y: number, order: string[], step: number, label: string) {
  shapes.push(text(`${prefix}-label`, 20, y + 8, 130, label, step));
  order.forEach((name, i) => {
    const interactive = name === "I";
    shapes.push({
      id: `${prefix}-c${i}`,
      type: "cell",
      x: CELLS_X + i * PITCH,
      y,
      w: CELL_W,
      h: 34,
      label: name,
      tone: interactive ? PROD_TONE.traffic : PROD_TONE.data,
      fill: "pastel",
      highlight: interactive || undefined,
      step,
      quiet: !interactive,
    });
  });
  shapes.push(
    {
      id: `${prefix}-gpu`,
      type: "box",
      x: GPU_X,
      y: y - 4,
      w: 150,
      h: 42,
      label: "GPU",
      sub: `${SLOT_MS} ms per request`,
      tone: PROD_TONE.compute,
      fill: "pastel",
      step,
    },
    {
      id: `${prefix}-to-gpu`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${prefix}-c${order.length - 1}`,
      to: `${prefix}-gpu`,
      step,
    }
  );
}

// Step 1: the interactive request I is last in line (leftmost), behind eight batch requests B1 to B8 (B1 is next).
lane("fifo", LANE_Y[0], ["I", "B8", "B7", "B6", "B5", "B4", "B3", "B2", "B1"], 1, "First come,\nfirst served");
shapes.push(
  text(
    "fifo-wait",
    CELLS_X,
    LANE_Y[0] + 42,
    9 * PITCH,
    `I waits ${BATCH_AHEAD} slots × ${SLOT_MS} ms = ${n(FIFO_WAIT_MS)} ms, past the ${LATENCY.firstTokenMs} ms target`,
    1,
    PROD_TONE.failure
  )
);

// Step 2: with priority, I jumps to the front (next to the GPU).
lane("prio", LANE_Y[1], ["B8", "B7", "B6", "B5", "B4", "B3", "B2", "B1", "I"], 2, "Priority\nscheduling");
shapes.push(
  text(
    "prio-wait",
    CELLS_X,
    LANE_Y[1] + 42,
    9 * PITCH,
    `I goes next: it waits for the running slot only, at most ${SLOT_MS} ms`,
    2,
    PROD_TONE.check
  )
);

// Step 3: memory view when every KV block is held by batch work.
shapes.push(text("mem-label", 20, LANE_Y[2] + 8, 130, "GPU memory:\n8 KV blocks", 3));
for (let i = 0; i < 8; i++) {
  const interactive = i === 7;
  shapes.push({
    id: `mem-c${i}`,
    type: "cell",
    x: CELLS_X + i * PITCH,
    y: LANE_Y[2],
    w: CELL_W,
    h: 34,
    label: interactive ? "I" : `B${i + 1}`,
    tone: interactive ? PROD_TONE.traffic : PROD_TONE.data,
    fill: "pastel",
    highlight: interactive || undefined,
    step: 3,
    quiet: !interactive,
  });
}
shapes.push(
  text(
    "mem-n1",
    CELLS_X,
    LANE_Y[2] + 42,
    9 * PITCH,
    "Memory was full of batch work. B8 is pre-empted: its block is freed for I.",
    3
  ),
  text(
    "mem-n2",
    CELLS_X,
    LANE_Y[2] + 62,
    9 * PITCH,
    "B8 goes back to the queue and re-runs its prefill later (recompute).",
    3,
    PROD_TONE.check
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Interactive work goes first on a shared GPU",
  width: 880,
  height: 316,
  steps: [
    { title: "First come, first served: interactive waits behind batch" },
    { title: "Priority: interactive goes to the front" },
    { title: "Pre-emption: when memory is full, batch gives way" },
  ],
  shapes,
};

export default spec;
