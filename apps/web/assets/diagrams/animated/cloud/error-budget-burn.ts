import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// A 30-day error budget being spent (cloud/operations/slos-alerting-and-on-call). Brightpost's 99.9% checkout SLO
// allows about 45 failed checkout requests in 30 days. Burn rate 1 spends exactly that in 30 days (the dashed line).
// Step 1: a full budget and the burn-rate-1 line. Step 2: a fast burn on day 9 (half of all payments fail): the page
// fires after about 10 minutes, the runbook fix lands by minute 20, and 22% of the budget is gone. Step 3: a slow
// leak from day 16 (1 checkout request in 250 fails, burn rate 4): a ticket on day 17, fixed on day 19, 40% gone.
// Step 4: at the normal rate the budget runs out on about day 26, and risky changes freeze until it recovers.
//
// Geometry: the chart's origin is (70, 320). One day is about 19.33 units across (day 30 at x 650); 1% of budget
// is 2.6 units up (100% at y 60). Budget points: day 0 100% (70, 60); day 9 85% (244, 99) then 63% (244, 156);
// day 16 51% (379, 187); day 19 11% (437, 291); day 25.6 0% (565, 320). Notes sit in empty corners of the chart
// so no text crosses a line: the fast-burn notes above the dashed line, the slow-leak notes under the day 9-16
// segment, the burn-rate-1 note right of where the dashed line meets the axis.
const day = (d: number) => 70 + d * 19.333;

const axisText = (id: string, x: number, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: 56,
  h: 18,
  label,
  tone: "neutral",
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "An error budget, spent fast and slow",
  width: 700,
  height: 360,
  shapes: [
    // Step 1: axes, labels and the line that spends the budget in exactly 30 days.
    { id: "y-axis", type: "arrow", x: 70, y: 320, w: 0, h: -282, tone: "neutral" },
    { id: "x-axis", type: "arrow", x: 70, y: 320, w: 600, h: 0, tone: "neutral" },
    { id: "title", type: "text", x: 80, y: 30, w: 150, h: 18, label: "Error budget left", tone: "neutral" },
    axisText("y100", 10, 51, "100%"),
    axisText("y50", 10, 181, "50%"),
    axisText("y0", 10, 311, "0%"),
    axisText("d0", day(0) - 28, 326, "day 0"),
    axisText("d10", day(10) - 28, 326, "day 10"),
    axisText("d20", day(20) - 28, 326, "day 20"),
    axisText("d30", day(30) - 28, 326, "day 30"),
    { id: "ideal", type: "arrow", x: 70, y: 60, w: 580, h: 260, dashed: true, tone: "neutral" },
    { id: "ideal-note", type: "text", x: 598, y: 262, w: 96, h: 18, label: "burn rate 1", tone: "neutral" },

    // Step 2: the fast burn and its page.
    { id: "normal-1", type: "arrow", x: 70, y: 60, w: 174, h: 39, tone: "neutral", step: 2 },
    { id: "fast", type: "arrow", x: 244, y: 99, w: 0, h: 57, tone: "red", step: 2 },
    { id: "page", type: "circle", x: 244, y: 104, w: 14, tone: "red", highlight: true, step: 2 },
    {
      id: "fast-note",
      type: "text",
      x: 254,
      y: 80,
      w: 210,
      h: 18,
      label: "Fast burn: page after 10 min",
      tone: "red",
      step: 2,
    },
    {
      id: "fast-note-2",
      type: "text",
      x: 254,
      y: 100,
      w: 210,
      h: 18,
      label: "fixed by minute 20: 22% used",
      tone: "red",
      step: 2,
    },

    // Step 3: the slow leak and its ticket.
    { id: "normal-2", type: "arrow", x: 244, y: 156, w: 135, h: 31, tone: "neutral", step: 3 },
    { id: "slow", type: "arrow", x: 379, y: 187, w: 58, h: 104, tone: "orange", step: 3 },
    { id: "ticket", type: "circle", x: 399, y: 222, w: 14, tone: "orange", highlight: true, step: 3 },
    {
      id: "slow-note",
      type: "text",
      x: 200,
      y: 262,
      w: 200,
      h: 18,
      label: "Slow leak: ticket on day 17",
      tone: "orange",
      step: 3,
    },
    {
      id: "slow-note-2",
      type: "text",
      x: 200,
      y: 282,
      w: 200,
      h: 18,
      label: "4 times the safe rate: 40% used",
      tone: "orange",
      step: 3,
    },

    // Step 4: the budget runs out, and risky changes stop.
    { id: "rest", type: "arrow", x: 437, y: 291, w: 128, h: 29, tone: "neutral", step: 4 },
    { id: "empty", type: "circle", x: 565, y: 320, w: 14, tone: "red", highlight: true, step: 4 },
    {
      id: "freeze",
      type: "box",
      x: 460,
      y: 118,
      w: 210,
      h: 56,
      label: "Budget spent: freeze",
      sub: "only fixes ship until it recovers",
      tone: "red",
      highlight: true,
      step: 4,
    },
    { id: "freeze-arrow", type: "arrow", x: 565, y: 310, w: 0, h: 0, from: "freeze", tone: "red", step: 4 },
  ],
  steps: [
    { title: "A full budget, and the rate that spends it in 30 days" },
    { title: "Fast burn: a page within minutes" },
    { title: "Slow burn: a ticket, not a page" },
    { title: "Budget spent: freeze risky changes" },
  ],
};

export default spec;
