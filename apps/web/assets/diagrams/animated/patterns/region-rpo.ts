import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Replication lag at the moment of failure is the data you lose (multi-region-and-failover, Core concepts: RPO).
// Three steps: 1 London commits orders at the sale peak and Frankfurt applies them 2 s later, so the last 2 s are
// always in flight · 2 London fails at the cut (time 0): the 2 s in flight never arrive, 600 orders · 3 a synchronous
// copy waits for Frankfurt before each commit returns, so nothing is lost, and every order pays a cross-region round
// trip.
// Working (computed below): one cell = 0.5 s = 0.5 × 300 = 150 orders; lag 2 s (illustrative) = 4 cells;
// lost = 2 s × 300 orders/s = 600 orders.
// Layout (820 × 360): a 7 s time axis from −6 s to +1 s, 80 px a second from x 200; London's commits, Frankfurt's
// applied copy and the lost band in rows under it; the synchronous row at the bottom.
// Colours (PATTERN_TONE): committed orders blue (data in motion), the Frankfurt copy violet (store), the synchronous
// copy green (the pattern's option); red for the cut and the lost orders.

const PX = 80; // px per second
const X0 = 200;
const T0 = -6; // left edge of the axis, seconds
const T1 = 1;
const CELL = 0.5; // seconds per cell
const lag = 2; // illustrative
const rate = SHOP.peakOrdersPerSecond;
const lost = lag * rate; // 600
const perCell = CELL * rate; // 150
const x = (t: number) => X0 + (t - T0) * PX;
const shapes: LayoutShape[] = [];

const rowLabel = (id: string, y: number, label: string, step?: number) =>
  shapes.push({ id, type: "text", x: 10, y, w: 180, h: 30, label, tone: PATTERN_TONE.infra, step });

const cells = (id: string, y: number, from: number, to: number, tone: LayoutTone, step?: number) => {
  for (let t = from, i = 0; t < to; t += CELL, i++) {
    shapes.push({
      id: `${id}-${i}`,
      type: "cell",
      x: x(t),
      y,
      w: CELL * PX,
      h: 30,
      tone,
      fill: "pastel",
      quiet: i > 0,
      step,
    });
  }
};

// Time axis.
for (let t = T0; t <= T1; t++) {
  shapes.push({
    id: `tick-${t - T0}`,
    type: "text",
    x: x(t) - 30,
    y: 20,
    w: 60,
    h: 18,
    label: t === 0 ? "0 s" : `${t > 0 ? "+" : "−"}${Math.abs(t)} s`,
    tone: PATTERN_TONE.infra,
  });
}

// Step 1: London commits; Frankfurt trails by the lag.
rowLabel("lon-t", 60, `${SHOP.homeRegion} commits`);
cells("lon", 60, T0, 0, PATTERN_TONE.data);
rowLabel("fra-t", 110, `${SHOP.secondRegion} has applied`);
cells("fra", 110, T0, -lag, PATTERN_TONE.store);
shapes.push({
  id: "flight",
  type: "box",
  x: x(-lag),
  y: 110,
  w: lag * PX,
  h: 30,
  label: `${lag} s in flight`,
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "rate",
  type: "text",
  x: X0,
  y: 146,
  w: (0 - T0) * PX,
  h: 18,
  label: `${rate} orders/s; one cell = ${CELL} s = ${perCell} orders`,
  tone: PATTERN_TONE.data,
});

// Step 2: London fails at the cut.
shapes.push({
  id: "cut",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [x(0) + 6, 52],
    [x(0) + 6, 232],
  ],
  tone: PATTERN_TONE.fail,
  dashed: true,
  step: 2,
});
shapes.push({
  id: "cut-t",
  type: "text",
  x: x(0) + 12,
  y: 60,
  w: 120,
  h: 30,
  label: `${SHOP.homeRegion} fails`,
  tone: PATTERN_TONE.fail,
  step: 2,
});
shapes.push({
  id: "lost",
  type: "box",
  x: x(-lag),
  y: 178,
  w: lag * PX,
  h: 34,
  label: `${n(lost)} orders lost`,
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 2,
  highlight: true,
});
shapes.push({
  id: "lost-t",
  type: "text",
  x: X0,
  y: 186,
  w: (-lag - T0) * PX - 10,
  h: 18,
  label: `RPO = lag at the cut: ${lag} s × ${rate}/s`,
  tone: PATTERN_TONE.fail,
  step: 2,
});

// Step 3: a synchronous copy loses nothing.
rowLabel("sync-t", 262, "Synchronous copy", 3);
cells("sync", 262, T0, 0, PATTERN_TONE.pattern, 3);
shapes.push({
  id: "sync-n",
  type: "text",
  x: X0,
  y: 298,
  w: (0 - T0) * PX,
  h: 36,
  label: "nothing in flight at the cut: RPO 0\nevery commit waits a cross-region round trip",
  tone: PATTERN_TONE.pattern,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Replication lag at the cut is the data lost",
  width: 820,
  height: 350,
  shapes,
  steps: [
    { title: `${SHOP.secondRegion} trails by ${lag} s` },
    { title: `${SHOP.homeRegion} fails: ${n(lost)} orders lost` },
    { title: "A synchronous copy: nothing lost" },
  ],
};

export default spec;
