import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// Why we size for the peak: one day of uploads for the photo app on the estimation page, as 24 hourly bars.
// The hourly rates average 230 uploads/s (they sum to 5,520 = 230 x 24) and the busiest hour, 21:00, reaches
// 690/s, about 3x the average. Step 1 draws the day, step 2 adds the average line, step 3 the peak line.
//
// Layout plan: a label column on the left (x 16..140), bars from x=150 in 30 px slots (22 px wide, 8 px gaps),
// baseline at y=300, 0.3 px per upload/s, so the 690/s bar is 207 px tall and the average sits at y=231.
const HOURLY = [
  100, 70, 40, 30, 30, 50, 90, 150, 180, 200, 210, 220, 280, 260, 220, 210, 230, 260, 330, 430, 630, 690, 420, 190,
];

const BASE_Y = 300;
const SCALE = 0.3;
const X0 = 150;
const SLOT = 30;
const BAR_W = 22;
const PEAK_HOUR = 21;

const barX = (hour: number) => X0 + hour * SLOT;

const bars: LayoutShape[] = HOURLY.map((v, hour): LayoutShape => ({
  id: `h${hour}`,
  type: "box",
  x: barX(hour),
  y: BASE_Y - v * SCALE,
  w: BAR_W,
  h: v * SCALE,
  tone: hour === PEAK_HOUR ? "orange" : "teal",
}));

const hourLabels: LayoutShape[] = [0, 6, 12, 18, 23].map((hour): LayoutShape => ({
  id: `t${hour}`,
  type: "text",
  x: barX(hour) + BAR_W / 2 - 20,
  y: BASE_Y + 8,
  w: 40,
  h: 20,
  label: `${hour}h`,
  tone: "neutral",
}));

const spec: LayoutSpec = {
  kind: "layout",
  title: "One day of uploads: average versus peak",
  width: 900,
  height: 360,
  steps: [
    { title: "Traffic changes hour by hour" },
    { title: "The average: about 230 uploads/s" },
    { title: "The peak: about 700 uploads/s, 3x the average" },
  ],
  shapes: [
    {
      id: "heading",
      type: "text",
      x: 150,
      y: 30,
      w: 420,
      h: 20,
      label: "Uploads per second, hour by hour, over one day",
      tone: "neutral",
    },
    ...bars,
    { id: "axis", type: "arrow", x: 146, y: BASE_Y, w: 726, h: 0, tone: "neutral" },
    ...hourLabels,
    { id: "axis-note", type: "text", x: 760, y: 332, w: 120, h: 20, label: "hour of day", tone: "neutral" },

    // Step 2: the average line.
    {
      id: "avg-line",
      type: "arrow",
      x: 146,
      y: BASE_Y - 230 * SCALE,
      w: 726,
      h: 0,
      dashed: true,
      tone: "green",
      step: 2,
    },
    {
      id: "avg-label",
      type: "text",
      x: 12,
      y: BASE_Y - 230 * SCALE - 10,
      w: 130,
      h: 20,
      label: "average ~230/s",
      tone: "green",
      step: 2,
    },

    // Step 3: the peak line and what it means.
    {
      id: "peak-line",
      type: "arrow",
      x: 146,
      y: BASE_Y - 690 * SCALE,
      w: 726,
      h: 0,
      dashed: true,
      tone: "orange",
      step: 3,
    },
    {
      id: "peak-label",
      type: "text",
      x: 12,
      y: BASE_Y - 690 * SCALE - 10,
      w: 130,
      h: 20,
      label: "peak ~700/s",
      tone: "orange",
      step: 3,
    },
    {
      id: "peak-note",
      type: "text",
      x: 470,
      y: 58,
      w: 290,
      h: 20,
      label: "busiest hour: about 3x the average",
      tone: "orange",
      step: 3,
    },
  ],
};

export default spec;
