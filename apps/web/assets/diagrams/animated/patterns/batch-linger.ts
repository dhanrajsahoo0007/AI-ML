import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Sending each write at once against lingering 5 ms and sending a batch (batching-and-pipelining, first figure).
// A producer makes one write a millisecond for 50 ms (illustrative rate).
// Two steps: 1 each write is its own request: 50 requests, 50 round trips · 2 a 5 ms linger window collects the
// writes and sends one request per window: 10 requests of 5 writes; each write waits up to 5 ms.
// Working (computed below): 50 writes ÷ 5 per window = 10 requests; the first write of a window waits 5 ms, the last
// almost 0, so the average added wait is about 2.5 ms.
// Layout: a 50 ms time axis 600 wide (12 px per ms). Colours (PATTERN_TONE): single writes blue (data in motion),
// batches green (the pattern).
// Fact check (2026-11-16): Kafka's producer `linger.ms` defaults to 5 ms since Kafka 4.0 (0 before); `batch.size`
// defaults to 16,384 bytes.

const MS = 50;
const LINGER = 5;
const PX = 12;
const X0 = 170;
const shapes: LayoutShape[] = [];

shapes.push({
  id: "a-t",
  type: "text",
  x: 10,
  y: 52,
  w: 150,
  h: 18,
  label: "Send each write",
  tone: PATTERN_TONE.infra,
});
for (let t = 0; t < MS; t++) {
  shapes.push({
    id: `a-${t}`,
    type: "cell",
    x: X0 + t * PX,
    y: 46,
    w: PX,
    h: 30,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    quiet: t > 0,
  });
}
shapes.push({
  id: "a-n",
  type: "text",
  x: X0,
  y: 82,
  w: MS * PX,
  h: 18,
  label: `${MS} requests, ${MS} round trips, no added wait`,
  tone: PATTERN_TONE.data,
});

const windows = MS / LINGER;
shapes.push({
  id: "b-t",
  type: "text",
  x: 10,
  y: 136,
  w: 150,
  h: 18,
  label: `Linger ${LINGER} ms, then send`,
  tone: PATTERN_TONE.infra,
  step: 2,
});
for (let w = 0; w < windows; w++) {
  shapes.push({
    id: `b-${w}`,
    type: "box",
    x: X0 + w * LINGER * PX,
    y: 128,
    w: LINGER * PX,
    h: 34,
    label: String(LINGER),
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 2,
  });
}
shapes.push({
  id: "b-n",
  type: "text",
  x: X0,
  y: 168,
  w: MS * PX,
  h: 18,
  label: `${windows} requests of ${LINGER} writes; each write waits up to ${LINGER} ms (about ${LINGER / 2} ms on average)`,
  tone: PATTERN_TONE.pattern,
  step: 2,
});
for (let t = 0; t <= MS; t += 10) {
  shapes.push({
    id: `tick-${t}`,
    type: "text",
    x: X0 + t * PX - 20,
    y: 20,
    w: 40,
    h: 16,
    label: `${t} ms`,
    tone: PATTERN_TONE.infra,
  });
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "Fifty single writes against batches after a 5 ms linger",
  width: X0 + MS * PX + 30,
  height: 200,
  shapes,
  steps: [{ title: "Send each write: 50 requests" }, { title: "Linger 5 ms: 10 requests of 5" }],
};

export default spec;
