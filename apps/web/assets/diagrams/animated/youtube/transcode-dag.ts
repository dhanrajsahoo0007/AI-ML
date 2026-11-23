import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Transcoding as a graph of small, idempotent tasks (youtube case study, Deep dive 1).
// Four steps: 1 split the 10-minute original at keyframes into ten 1-minute chunks · 2 one encode task per chunk per
// rendition: 10 × 5 = 50 tasks, all independent, run in parallel · 3 a worker dies on 720p chunk 6 (red): its lease
// runs out and the task runs again; the output key is fixed, so a second write replaces the first · 4 the retry
// succeeds (green); the packager cuts each rendition into 4 s segments and writes the manifests; the video is
// published as soon as 360p is ready, the other rungs follow.
// Working (round numbers chosen to size the system): 10 min × 8 Mb/s = 600 s × 1 MB/s = 600 MB original;
// 10 chunks × 5 renditions = 50 tasks; at about 1 × real time a 1-minute task takes about 60 s; serial
// 50 × 60 s = 3,000 s = 50 min; in parallel on 50 workers about 60 s plus split and package.
// Layout (860 × 420): the original at the top left; the chunk strip (10 cells, 40 × 28, 44 apart) from x 220;
// rendition labels in a column at x 140; the task grid (10 × 5 cells, 40 × 30, rows 38 apart) under the strip;
// package and publish boxes on the right at x 700; notes under the grid.
// Colours (PATTERN_TONE): the original and chunks blue (data), encode tasks teal (compute), the failed task a red dot (circles sit on cells: lint forbids overlapping cells)
// (fail), the retry dot, packager and publish green (the pattern).

const CELL_X = 220;
const CELL_DX = 44;
const CHUNKS = 10;
const RENDITIONS = ["240p", "360p", "480p", "720p", "1080p"];
const ROW_Y = (r: number) => 120 + r * 38;
const COL_X = (c: number) => CELL_X + c * CELL_DX;
const FAIL_ROW = 3; // 720p
const FAIL_COL = 5; // chunk 6
const TASKS = CHUNKS * RENDITIONS.length; // 50
const TASK_S = 60; // about 1 × real time for a 1-minute chunk
const SERIAL_MIN = (TASKS * TASK_S) / 60; // 50

const shapes: LayoutShape[] = [
  {
    id: "orig",
    type: "box",
    x: 20,
    y: 60,
    w: 140,
    h: 50,
    label: "Original",
    sub: "10 min, 600 MB",
    tone: PATTERN_TONE.data,
    fill: "pastel",
  },
];

for (let c = 0; c < CHUNKS; c++) {
  shapes.push({
    id: `c${c}`,
    type: "cell",
    x: COL_X(c),
    y: 72,
    w: 40,
    h: 28,
    label: String(c + 1),
    tone: PATTERN_TONE.data,
    quiet: c > 0,
  });
}
shapes.push({ id: "split", type: "arrow", x: 0, y: 0, from: "orig", to: "c0", label: "split" });
shapes.push({
  id: "strip-note",
  type: "text",
  x: COL_X(0),
  y: 46,
  w: CHUNKS * CELL_DX - 4,
  h: 18,
  label: "ten 1-minute chunks, cut at keyframes",
  tone: PATTERN_TONE.infra,
});

RENDITIONS.forEach((name, r) => {
  shapes.push({
    id: `r${r}`,
    type: "text",
    x: 140,
    y: ROW_Y(r) + 6,
    w: 64,
    h: 18,
    label: name,
    tone: PATTERN_TONE.infra,
    step: 2,
  });
  for (let c = 0; c < CHUNKS; c++) {
    shapes.push({
      id: `t${r}-${c}`,
      type: "cell",
      x: COL_X(c),
      y: ROW_Y(r),
      w: 40,
      h: 30,
      tone: PATTERN_TONE.compute,
      step: 2,
      quiet: !(r === 0 && c === 0),
    });
  }
});
shapes.push({
  id: "grid-note",
  type: "text",
  x: COL_X(0),
  y: ROW_Y(4) + 44,
  w: CHUNKS * CELL_DX - 4,
  h: 18,
  label: `${TASKS} tasks: ${CHUNKS} chunks × ${RENDITIONS.length} renditions, about ${TASK_S} s each`,
  tone: PATTERN_TONE.infra,
  step: 2,
});
shapes.push({
  id: "time-note",
  type: "text",
  x: COL_X(0),
  y: ROW_Y(4) + 66,
  w: CHUNKS * CELL_DX - 4,
  h: 18,
  label: `one after another: ${SERIAL_MIN} min; in parallel: about ${TASK_S} s plus split and package`,
  tone: PATTERN_TONE.infra,
  step: 2,
});

shapes.push({
  id: "fail",
  type: "circle",
  x: COL_X(FAIL_COL) + 20,
  y: ROW_Y(FAIL_ROW) + 15,
  w: 22,
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 3,
  highlight: true,
  quiet: true,
});
shapes.push({
  id: "fail-note",
  type: "text",
  x: 20,
  y: ROW_Y(4) + 92,
  w: 820,
  h: 18,
  label: "720p chunk 6: the worker dies, its lease runs out, the task runs again and writes the same key v42/720p/06",
  tone: PATTERN_TONE.fail,
  step: 3,
});

shapes.push({
  id: "retry",
  type: "circle",
  x: COL_X(FAIL_COL) + 20,
  y: ROW_Y(FAIL_ROW) + 15,
  w: 22,
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 4,
  quiet: true,
});
shapes.push({
  id: "pack",
  type: "box",
  x: 700,
  y: 120,
  w: 140,
  h: 56,
  label: "Package",
  sub: "4 s segments",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 4,
});
shapes.push({
  id: "pub",
  type: "box",
  x: 700,
  y: 236,
  w: 140,
  h: 56,
  label: "Publish",
  sub: "360p first",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 4,
});
shapes.push({
  id: "to-pack",
  type: "arrow",
  x: 0,
  y: 0,
  from: `t2-${CHUNKS - 1}`,
  to: "pack",
  step: 4,
});
shapes.push({ id: "to-pub", type: "arrow", x: 0, y: 0, from: "pack", to: "pub", label: "manifests", step: 4 });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Transcoding as a graph of small tasks",
  width: 860,
  height: ROW_Y(4) + 124,
  shapes,
  steps: [
    { title: "Split at keyframes" },
    { title: "50 encode tasks in parallel" },
    { title: "A task fails and runs again" },
    { title: "Package and publish" },
  ],
};

export default spec;
