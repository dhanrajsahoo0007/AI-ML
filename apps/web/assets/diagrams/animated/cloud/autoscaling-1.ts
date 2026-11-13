import type { LayoutSpec } from "@/components/diagrams/types";

// The lag between demand and capacity on Brightpost's newsletter evening (cloud/compute/autoscaling).
// A time axis from 18:00 to 18:07 at 80 units a minute, starting at x 170; row names sit in the left 150 units.
// Step 1: a cold scale-out. The wave arrives at 18:00, one minute of metric, half a minute to decide, about four
// minutes to start, so 6 servers serve from 18:05:30. Step 2: a schedule has 6 servers running since 17:55, so
// there is no wait. Step 3: a warm pool hands over stopped servers in about a minute, ready at 18:02:30.
const X0 = 170;
const PER_MIN = 80;
const at = (min: number) => X0 + min * PER_MIN;

const ticks = Array.from({ length: 8 }, (_, i) => ({
  id: `t${i}`,
  type: "text" as const,
  x: at(i) - 25,
  y: 10,
  w: 50,
  h: 20,
  label: `18:0${i}`,
  tone: "neutral" as const,
}));

const rowName = (id: string, y: number, label: string, step = 1) => ({
  id,
  type: "text" as const,
  x: 10,
  y: y + 10,
  w: 150,
  h: 20,
  label,
  tone: "neutral" as const,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a wave of shoppers to new servers",
  width: 780,
  height: 360,
  steps: [
    { title: "Cold start: capacity after 5½ minutes" },
    { title: "A schedule: capacity already there" },
    { title: "A warm pool: capacity after 2½ minutes" },
  ],
  shapes: [
    ...ticks,

    // Step 1: the cold path.
    rowName("n-shop", 44, "Shoppers"),
    {
      id: "wait",
      type: "box",
      x: at(0),
      y: 44,
      w: at(5.5) - at(0),
      h: 40,
      label: "700 shoppers, room for 400",
      tone: "red",
    },
    { id: "served", type: "box", x: at(5.5), y: 44, w: at(7) - at(5.5), h: 40, label: "6 servers", tone: "green" },
    rowName("n-metric", 94, "Metric"),
    { id: "metric", type: "box", x: at(0), y: 94, w: PER_MIN, h: 40, label: "1-min avg", tone: "orange" },
    rowName("n-decide", 144, "Decision"),
    { id: "decide", type: "box", x: at(1), y: 144, w: PER_MIN / 2, h: 40, label: "add 4", tone: "orange" },
    rowName("n-start", 194, "New servers"),
    {
      id: "start",
      type: "box",
      x: at(1.5),
      y: 194,
      w: at(5.5) - at(1.5),
      h: 40,
      label: "start, boot, warm up: about 4 min",
      tone: "teal",
    },

    // Step 2: a schedule started the servers before the wave.
    rowName("n-sched", 254, "With a schedule", 2),
    {
      id: "sched",
      type: "box",
      x: at(0),
      y: 254,
      w: at(7) - at(0),
      h: 40,
      label: "6 servers running since 17:55: no wait",
      tone: "green",
      step: 2,
    },

    // Step 3: a warm pool shortens the start.
    rowName("n-warm", 304, "With a warm pool", 3),
    { id: "warmstart", type: "box", x: at(1.5), y: 304, w: PER_MIN, h: 40, label: "1 min", tone: "teal", step: 3 },
    {
      id: "warmready",
      type: "box",
      x: at(2.5),
      y: 304,
      w: at(7) - at(2.5),
      h: 40,
      label: "6 servers from 18:02:30",
      tone: "green",
      step: 3,
    },
  ],
};

export default spec;
