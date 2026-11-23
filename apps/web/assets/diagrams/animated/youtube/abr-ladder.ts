import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The bitrate ladder and one switch (youtube case study, Deep dive 2: adaptive bitrate).
// Three steps: 1 the ladder: five renditions, each cut into 4 s segments at the same boundaries · 2 the player starts
// at 360p for a fast first frame, then climbs to 720p, the highest rung under 0.8 × the measured 4 Mb/s · 3 at 32 s
// the link falls to 1.2 Mb/s: the next 720p segment would take longer to fetch than it plays (red), so the player
// switches down to 360p at the segment boundary and the buffer keeps growing.
// Working (round numbers chosen to size the system; the 0.8 safety factor is this page's rule, not a standard):
//   bitrates 240p 0.4, 360p 0.8, 480p 1.3, 720p 2.5, 1080p 5.0 Mb/s; segment = 4 s.
//   360p segment = 4 × 0.8 = 3.2 Mb; on 4 Mb/s it arrives in 3.2 ÷ 4 = 0.8 s (first frame under the 2 s target).
//   0.8 × 4 Mb/s = 3.2 Mb/s, so 720p (2.5) is the top rung that fits; a 720p segment = 4 × 2.5 = 10 Mb, 2.5 s on 4 Mb/s.
//   At 1.2 Mb/s: 720p segment 10 ÷ 1.2 = 8.3 s for 4 s of video (the buffer drains 4.3 s); 0.8 × 1.2 = 0.96, so
//   360p (0.8): 3.2 ÷ 1.2 = 2.7 s for 4 s of video (the buffer gains 1.3 s).
// Layout (860 × 380): rung labels in a 150 px column; 12 segment columns (50 × 30 cells, 54 apart) from x 180; rows
// 38 apart, 1080p on top; a time axis under the grid; notes under that.
// Colours (PATTERN_TONE): the ladder blue (data), the segments the player fetches are green dots (the pattern), the segment that
// would stall a red dot (fail); labels and the axis neutral.

const RUNGS = [
  { name: "1080p", mbps: 5.0 },
  { name: "720p", mbps: 2.5 },
  { name: "480p", mbps: 1.3 },
  { name: "360p", mbps: 0.8 },
  { name: "240p", mbps: 0.4 },
];
const SEGMENTS = 12;
const SEG_S = 4;
const X0 = 180;
const DX = 54;
const Y0 = 56;
const DY = 38;
const colX = (c: number) => X0 + c * DX;
const rowY = (r: number) => Y0 + r * DY;
const centre = (r: number, c: number): [number, number] => [colX(c) + 25, rowY(r) + 15];
const DOT = 20;
const R720 = 1;
const R360 = 3;
const fmt = (v: number) => v.toFixed(1);
const firstFrame = (SEG_S * RUNGS[R360].mbps) / 4; // 0.8 s on 4 Mb/s
const slow720 = (SEG_S * RUNGS[R720].mbps) / 1.2; // 8.3 s
const slow360 = (SEG_S * RUNGS[R360].mbps) / 1.2; // 2.7 s

const shapes: LayoutShape[] = [];
RUNGS.forEach((rung, r) => {
  shapes.push({
    id: `l${r}`,
    type: "text",
    x: 20,
    y: rowY(r) + 6,
    w: 150,
    h: 18,
    label: `${rung.name} · ${fmt(rung.mbps)} Mb/s`,
    tone: PATTERN_TONE.infra,
  });
  for (let c = 0; c < SEGMENTS; c++) {
    shapes.push({
      id: `s${r}-${c}`,
      type: "cell",
      x: colX(c),
      y: rowY(r),
      w: 50,
      h: 30,
      tone: PATTERN_TONE.data,
      quiet: !(r === 0 && c === 0),
    });
  }
});
[0, 4, 8, 12].forEach((c) => {
  shapes.push({
    id: `t${c}`,
    type: "text",
    x: colX(c) - 22,
    y: rowY(RUNGS.length) + 2,
    w: 40,
    h: 16,
    label: `${c * SEG_S} s`,
    tone: PATTERN_TONE.infra,
  });
});
shapes.push({
  id: "n1",
  type: "text",
  x: 20,
  y: rowY(RUNGS.length) + 30,
  w: 820,
  h: 18,
  label: "every rendition is cut at the same 4 s boundaries, so any segment can follow any other",
  tone: PATTERN_TONE.infra,
});

// Step 2: start low, climb.
const climb: [number, number][] = [
  [R360, 0],
  [R360, 1],
  ...Array.from({ length: 6 }, (_, i): [number, number] => [R720, i + 2]),
];
climb.forEach(([r, c]) => {
  shapes.push({
    id: `p${r}-${c}`,
    type: "circle",
    x: centre(r, c)[0],
    y: centre(r, c)[1],
    w: DOT,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 2,
    quiet: true,
  });
});
shapes.push({
  id: "path1",
  type: "path",
  x: 0,
  y: 0,
  points: climb.map(([r, c]) => centre(r, c)),
  tone: PATTERN_TONE.pattern,
  step: 2,
});
shapes.push({
  id: "n2",
  type: "text",
  x: 20,
  y: rowY(RUNGS.length) + 52,
  w: 820,
  h: 18,
  label: `start at 360p: 3.2 Mb on a 4 Mb/s link = ${fmt(firstFrame)} s to the first frame; then 720p, the top rung under 0.8 × 4 Mb/s`,
  tone: PATTERN_TONE.pattern,
  step: 2,
});

// Step 3: the link drops; switch down at the boundary.
shapes.push({
  id: "stall",
  type: "circle",
  x: centre(R720, 8)[0],
  y: centre(R720, 8)[1],
  w: DOT,
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 3,
  highlight: true,
  quiet: true,
});
const down: [number, number][] = Array.from({ length: 4 }, (_, i): [number, number] => [R360, i + 8]);
down.forEach(([r, c]) => {
  shapes.push({
    id: `q${r}-${c}`,
    type: "circle",
    x: centre(r, c)[0],
    y: centre(r, c)[1],
    w: DOT,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    quiet: true,
  });
});
shapes.push({
  id: "path2",
  type: "path",
  x: 0,
  y: 0,
  points: [centre(R720, 7), ...down.map(([r, c]) => centre(r, c))],
  tone: PATTERN_TONE.pattern,
  step: 3,
});
shapes.push({
  id: "n3",
  type: "text",
  x: 20,
  y: rowY(RUNGS.length) + 74,
  w: 820,
  h: 18,
  label: `at 32 s the link falls to 1.2 Mb/s: fetching 4 s of 720p takes ${fmt(slow720)} s, of 360p ${fmt(slow360)} s: switch down`,
  tone: PATTERN_TONE.fail,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The bitrate ladder and one switch",
  width: 860,
  height: rowY(RUNGS.length) + 104,
  shapes,
  steps: [{ title: "The ladder" }, { title: "Start low, then climb" }, { title: "The link drops: switch down" }],
};

export default spec;
