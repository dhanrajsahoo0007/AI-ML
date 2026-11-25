import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Retries bunched against retries spread by jitter (circuit-breaker-and-retries, Technical mechanics: backoff and
// jitter). Ten checkout servers (illustrative) see the card provider fail at 0 ms and each retries 3 times with a
// 100 ms base delay that doubles.
// Two steps: 1 no jitter: every client waits 100, 200, then 400 ms, so all 10 retries land at 100, 300 and 700 ms ·
// 2 full jitter: each wait is a random point between 0 and the same delay (random × 100 × 2^retry), so the same 30
// retries spread over the window.
// Working (computed below): no jitter puts 10 retries in one 25 ms slot three times; the provider takes 6 per slot
// (240 a second, illustrative), so each spike is 10 against 6. Full jitter draws from a fixed-seed generator (seed 1,
// so the figure never changes) and puts at most PEAK = 5 retries in a slot; over 2,000 seeds the peak is 4 to 6 in
// 85 % of draws, always in the first 100 ms, where the wait windows are narrowest.
// Layout (860 × 360): a 0–800 ms axis 760 px wide from x 60 (0.95 px per ms), slots of 25 ms; cells 12 px stacked 13
// px apart on base lines at y 175 (no jitter) and y 325 (full jitter); the provider's 6-a-slot line dashed.
// Colours (PATTERN_TONE): bunched retries red (they overload the provider), spread retries green (the pattern), the
// provider's capacity line lime (a check).
// Fact check (2026-11-16): AWS Architecture Blog, "Exponential Backoff And Jitter" (Marc Brooker, 2015): un-jittered
// backoff does more work and takes longer than the jittered variants; jitter more than halved the calls. AWS SDKs
// (retry behavior reference): delay = random(0, 1) × min(20 s, base × 2^retry), called full jitter.

const CLIENTS = 10;
const RETRIES = 3;
const BASE = 100;
const AXIS_MS = 800;
const SLOT = 25;
const CAPACITY = 6;
const X0 = 60;
const PX = 0.95;
const CELL = 12;
const STACK = 13;

// A fixed-seed generator so the jittered row is the same on every render.
let seed = 1;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const plain: number[] = [];
const jittered: number[] = [];
for (let c = 0; c < CLIENTS; c++) {
  let tPlain = 0;
  let tJitter = 0;
  for (let r = 0; r < RETRIES; r++) {
    tPlain += BASE * 2 ** r;
    tJitter += random() * BASE * 2 ** r;
    plain.push(tPlain);
    jittered.push(tJitter);
  }
}

const slotsOf = (times: number[]) => {
  const slots = new Map<number, number>();
  for (const t of times) {
    const s = Math.min(Math.floor(t / SLOT), AXIS_MS / SLOT - 1);
    slots.set(s, (slots.get(s) ?? 0) + 1);
  }
  return slots;
};
const plainSlots = slotsOf(plain);
const jitterSlots = slotsOf(jittered);
const PEAK = Math.max(...jitterSlots.values());

const shapes: LayoutShape[] = [];

function stacks(prefix: string, slots: Map<number, number>, base: number, tone: LayoutShape["tone"], step: number) {
  let first = true;
  for (const [s, count] of [...slots.entries()].sort((a, b) => a[0] - b[0])) {
    for (let k = 0; k < count; k++) {
      shapes.push({
        id: `${prefix}-${s}-${k}`,
        type: "cell",
        x: X0 + s * SLOT * PX + (SLOT * PX - CELL) / 2,
        y: base - (k + 1) * STACK,
        w: CELL,
        h: CELL,
        tone,
        fill: "pastel",
        step,
        quiet: !first,
      });
      first = false;
    }
  }
  // Base line and the provider's capacity line.
  shapes.push({
    id: `${prefix}-base`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0, base + 1],
      [X0 + AXIS_MS * PX, base + 1],
    ],
    tone: PATTERN_TONE.infra,
    step,
    quiet: true,
  });
  shapes.push({
    id: `${prefix}-cap`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0, base - CAPACITY * STACK - 1],
      [X0 + AXIS_MS * PX, base - CAPACITY * STACK - 1],
    ],
    dashed: true,
    tone: PATTERN_TONE.check,
    step,
    quiet: true,
  });
  shapes.push({
    id: `${prefix}-cap-t`,
    type: "text",
    x: X0 + 480 * PX,
    y: base - CAPACITY * STACK - 20,
    w: 170,
    h: 16,
    label: `provider takes ${CAPACITY} a slot`,
    tone: PATTERN_TONE.check,
    step,
    quiet: true,
  });
}

shapes.push({
  id: "t-plain",
  type: "text",
  x: X0,
  y: 12,
  w: AXIS_MS * PX,
  h: 18,
  label: `No jitter: all ${CLIENTS} retry at 100, 300 and 700 ms`,
  tone: PATTERN_TONE.fail,
});
stacks("p", plainSlots, 175, PATTERN_TONE.fail, 1);

shapes.push({
  id: "t-jitter",
  type: "text",
  x: X0,
  y: 196,
  w: AXIS_MS * PX,
  h: 18,
  label: `Full jitter: the same ${CLIENTS * RETRIES} retries, at most ${PEAK} in a slot`,
  tone: PATTERN_TONE.pattern,
  step: 2,
});
stacks("j", jitterSlots, 325, PATTERN_TONE.pattern, 2);

for (let t = 0; t <= AXIS_MS; t += 100) {
  shapes.push({
    id: `tick-${t}`,
    type: "text",
    x: X0 + t * PX - 25,
    y: 334,
    w: 50,
    h: 16,
    label: `${t} ms`,
    tone: PATTERN_TONE.infra,
    quiet: true,
  });
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "Retries bunched without jitter, spread with it",
  width: 860,
  height: 360,
  shapes,
  steps: [{ title: "No jitter: retries land together" }, { title: "Full jitter: retries spread out" }],
};

export default spec;
