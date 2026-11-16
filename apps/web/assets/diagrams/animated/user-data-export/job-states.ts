import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The life of one export job (user-data-export, Deep dive 1): the states the job row moves through, and what happens
// when one source service keeps failing.
// Two steps: 1 the happy path: Queued → Gathering (40 checkpointed steps) → Packaging (owner check, zip, split) →
// Ready (email sent) → Expired (7 days or 5 downloads per part) · 2 one source keeps failing past its retry budget of
// 72 hours: the step is marked missing, the job packages the other 39 sources, the manifest lists the gap, and a
// follow-up job for the missing type goes back to Queued.
// Working: 72 h of retries leaves 30 − 3 = 27 days of the one-month deadline for the follow-up job.
// Layout (860 × 356): four state boxes 150 × 56 in a row at y 100, 60 apart, from x 40 (x 40, 250, 460, 670); above
// each, the one fact that moves a job into that state (text at y 66). Row 2 at y 250: "Source failing" under
// Gathering and "Expired" under Ready. The dashed follow-up arrow runs from "Source failing" back to Queued along
// y 334.
// Colours (PATTERN_TONE): Queued and Expired grey (infra), Gathering blue (data in motion), Packaging teal (compute),
// Ready green (the pattern's result); the failing source red.

const Y = 100;
const W = 150;
const H = 56;
const GAP = 60;
const x = (i: number) => 40 + i * (W + GAP);
const Y2 = 250;

const row1 = [
  { id: "queued", label: "Queued", sub: "job row, 202", tone: PATTERN_TONE.infra, how: "submit, idempotency key" },
  { id: "gathering", label: "Gathering", sub: "40 steps", tone: PATTERN_TONE.data, how: "a checkpoint per page" },
  { id: "packaging", label: "Packaging", sub: "check, zip, split", tone: PATTERN_TONE.compute, how: "all steps done" },
  { id: "ready", label: "Ready", sub: "email sent", tone: PATTERN_TONE.pattern, how: "every file passed" },
];

const shapes: LayoutShape[] = [];
row1.forEach((s, i) => {
  shapes.push({
    id: s.id,
    type: "box",
    x: x(i),
    y: Y,
    w: W,
    h: H,
    label: s.label,
    sub: s.sub,
    tone: s.tone,
    fill: "pastel",
  });
  shapes.push({
    id: `${s.id}-how`,
    type: "text",
    x: x(i) - 20,
    y: Y - 34,
    w: W + 40,
    h: 18,
    label: s.how,
    tone: PATTERN_TONE.infra,
  });
});

shapes.push(
  { id: "a1", type: "arrow", x: 0, y: 0, from: "queued", to: "gathering", label: "start" },
  { id: "a2", type: "arrow", x: 0, y: 0, from: "gathering", to: "packaging", label: "40 of 40" },
  { id: "a3", type: "arrow", x: 0, y: 0, from: "packaging", to: "ready", label: "release" },
  {
    id: "expired",
    type: "box",
    x: x(3),
    y: Y2,
    w: W,
    h: H,
    label: "Expired",
    sub: "archive deleted",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  { id: "a4", type: "arrow", x: 0, y: 0, from: "ready", to: "expired", label: "7 days or 5 downloads" },
  {
    id: "failing",
    type: "box",
    x: x(1),
    y: Y2,
    w: W,
    h: H,
    label: "Source failing",
    sub: "retry with backoff",
    tone: "red",
    fill: "pastel",
    step: 2,
  },
  { id: "a5", type: "arrow", x: 0, y: 0, from: "gathering", to: "failing", label: "errors", step: 2 },
  {
    id: "a6",
    type: "arrow",
    x: 0,
    y: 0,
    from: "failing",
    to: "packaging",
    via: [[x(2) + W / 2, Y2 + H / 2]],
    label: "72 h: missing",
    step: 2,
  },
  {
    id: "a7",
    type: "arrow",
    x: 0,
    y: 0,
    from: "failing",
    to: "queued",
    via: [
      [x(1) + W / 2, Y2 + H + 28],
      [x(0) + W / 2, Y2 + H + 28],
    ],
    label: "follow-up job for the gap",
    dashed: true,
    step: 2,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The life of one export job",
  width: x(3) + W + 40,
  height: Y2 + H + 50,
  shapes,
  steps: [{ title: "The happy path" }, { title: "One source keeps failing" }],
};

export default spec;
