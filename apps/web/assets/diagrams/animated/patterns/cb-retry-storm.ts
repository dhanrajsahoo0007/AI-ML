import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A retry storm (circuit-breaker-and-retries, Core concepts: retry storms). One shopper's payment at Brightpost goes
// gateway → checkout → payments → card provider, and the card provider is failing.
// Two steps: 1 every layer makes 3 tries (one try plus two retries), so the calls multiply at each hop: the gateway
// sends 3 to checkout, checkout 3 × 3 = 9 to payments, payments 9 × 3 = 27 to the provider · 2 only payments, the
// layer right above the provider, retries: the provider sees 3 calls.
// Working (computed below): calls at hop k = TRIES^k, so 3^3 = 27 at the provider; one layer retrying = 3.
// Layout (860 × 280): four columns 140 wide, 210 apart (x 30, 240, 450, 660); layer boxes at y 40; row 1 of call
// cells (13 px, 15 px pitch, 9 a row) at y 132; row 2 at y 236; cells sit on a common base line above their count.
// Colours (PATTERN_TONE): the three services teal (compute), the failing provider red (fail), calls in the storm blue
// (data in motion), calls with one retrying layer green (the pattern).
// Fact check (2026-11-16, AWS Builders' Library "Timeouts, retries, and backoff with jitter"): three retries at each
// of five layers raise the load on the database 243 times; the best practice for low-cost calls is to retry at a
// single point in the stack. Google SRE book, "Handling overload": retry only at the layer right above the one
// rejecting the request.

const TRIES = 3;
const COL_W = 140;
const PITCH = 210;
const X0 = 30;
const colX = (i: number) => X0 + i * PITCH;
const CELL = 13;
const CELL_PITCH = 15;
const PER_ROW = 9;

const LAYERS = [
  { id: "gw", label: "Gateway", sub: `${TRIES} tries`, tone: PATTERN_TONE.compute },
  { id: "co", label: "Checkout", sub: `${TRIES} tries`, tone: PATTERN_TONE.compute },
  { id: "pay", label: "Payments", sub: `${TRIES} tries`, tone: PATTERN_TONE.compute },
  { id: "psp", label: "Card provider", sub: "failing", tone: PATTERN_TONE.fail },
];

const shapes: LayoutShape[] = [];

LAYERS.forEach((l, i) => {
  shapes.push({
    id: l.id,
    type: "box",
    x: colX(i),
    y: 40,
    w: COL_W,
    h: 52,
    label: l.label,
    sub: l.sub,
    tone: l.tone,
    fill: "pastel",
  });
  if (i > 0) shapes.push({ id: `a-${i}`, type: "arrow", x: 0, y: 0, from: LAYERS[i - 1].id, to: l.id });
});

// One row of calls: `counts[i]` calls arrive at layer i, drawn as cells in rows of nine, centred in the column.
function callRow(prefix: string, y: number, counts: number[], tone: LayoutShape["tone"], step: number) {
  const rows = Math.ceil(Math.max(...counts) / PER_ROW);
  counts.forEach((count, i) => {
    const top = y + (rows - Math.ceil(count / PER_ROW)) * CELL_PITCH;
    const across = Math.min(count, PER_ROW);
    const left = colX(i) + (COL_W - (across * CELL_PITCH - (CELL_PITCH - CELL))) / 2;
    for (let k = 0; k < count; k++) {
      shapes.push({
        id: `${prefix}-${i}-${k}`,
        type: "cell",
        x: left + (k % PER_ROW) * CELL_PITCH,
        y: top + Math.floor(k / PER_ROW) * CELL_PITCH,
        w: CELL,
        h: CELL,
        tone,
        fill: "pastel",
        step,
        quiet: k > 0,
      });
    }
    shapes.push({
      id: `${prefix}-n-${i}`,
      type: "text",
      x: colX(i),
      y: y + rows * CELL_PITCH + 4,
      w: COL_W,
      h: 18,
      label: i === 0 ? `${count} request` : `${count} call${count === 1 ? "" : "s"}`,
      tone,
      step,
    });
  });
}

// Step 1: every layer tries three times, so hop k receives 3^k calls.
const storm = LAYERS.map((_, i) => TRIES ** i);
shapes.push({
  id: "t-storm",
  type: "text",
  x: X0,
  y: 106,
  w: colX(3) + COL_W - X0,
  h: 18,
  label: `Every layer tries ${TRIES} times: ${TRIES} × ${TRIES} × ${TRIES} = ${storm[3]} calls reach the provider`,
  tone: PATTERN_TONE.data,
});
callRow("s", 132, storm, PATTERN_TONE.data, 1);

// Step 2: only payments, the layer right above the provider, retries.
const single = [1, 1, 1, TRIES];
shapes.push({
  id: "t-single",
  type: "text",
  x: X0,
  y: 210,
  w: colX(3) + COL_W - X0,
  h: 18,
  label: `Only payments retries: ${single[3]} calls reach the provider`,
  tone: PATTERN_TONE.pattern,
  step: 2,
});
callRow("o", 236, single, PATTERN_TONE.pattern, 2);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three retrying layers turn one payment into 27 calls",
  width: 860,
  height: 280,
  shapes,
  steps: [{ title: "Every layer retries: 27 calls" }, { title: "Retry at one layer: 3 calls" }],
};

export default spec;
