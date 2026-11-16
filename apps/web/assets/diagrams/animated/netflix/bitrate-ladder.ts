import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A ladder per title (netflix case study, Step 2: an encoding ladder per title).
// Three steps: 1 one fixed ladder for every title: the animated film scores 97 at its top rung (bits wasted), the
// action film 86 (visibly blocky) · 2 a ladder per title: trial encodes find the bitrate at which each rung reaches
// the target score of 93, so the animated film's ladder shrinks and the action film's grows · 3 what it saves: bytes
// per two-hour view at the top rung, and the resolution a 3 Mb/s link gets.
// Working (round numbers chosen to illustrate; the quality scores are this page's illustration of a perceptual
// metric on a 0 to 100 scale, not measurements):
//   fixed ladder 1080p 5.0, 720p 3.0, 480p 1.5, 360p 0.8, 240p 0.4 Mb/s.
//   animated per-title 2.0, 1.2, 0.7, 0.4, 0.25 Mb/s; action per-title 7.0, 4.5, 2.2, 1.1, 0.5 Mb/s.
//   two hours = 7,200 s. Fixed top rung: 5.0 × 7,200 = 36,000 Mb = 4.5 GB. Animated: 2.0 × 7,200 = 14,400 Mb =
//   1.8 GB (2.7 GB or 60% less). Action: 7.0 × 7,200 = 50,400 Mb = 6.3 GB (1.8 GB more, now at the target score).
//   A 3 Mb/s link takes the top rung under 0.8 × 3 = 2.4 Mb/s: fixed ladder 480p (1.5) for both films; per-title
//   1080p (2.0) for the animated film.
// Layout (860 × 412): two dotted panels side by side; per panel, rung labels in a 50 px column, then two bars per
//   rung (fixed on top, per-title under it) at 38 px per Mb/s, rows 42 apart; notes under the panels.
// Colours (PATTERN_TONE): the fixed ladder blue (data), the per-title ladder green (the pattern), the starved score
//   red (fail); labels neutral. Four tones.

const RUNGS = ["1080p", "720p", "480p", "360p", "240p"];
const FIXED = [5.0, 3.0, 1.5, 0.8, 0.4];
const TITLES = [
  { id: "a", name: "Animated film: flat colour, little motion", perTitle: [2.0, 1.2, 0.7, 0.4, 0.25], fixedScore: 97 },
  { id: "b", name: "Action film: grain, fast motion", perTitle: [7.0, 4.5, 2.2, 1.1, 0.5], fixedScore: 86 },
];
const TARGET = 93;
const PX_PER_MBPS = 38;
const PANEL_W = 400;
const PANEL_X = [20, 440];
const Y0 = 70;
const DY = 42;
const BAR_H = 15;
const rowY = (r: number) => Y0 + r * DY;
const fmt = (v: number) => (Number.isInteger(v * 10) ? v.toFixed(1) : v.toFixed(2));
const VIEW_S = 7_200;
const gb = (mbps: number) => (mbps * VIEW_S) / 8 / 1000;
const fixedGb = gb(FIXED[0]); // 4.5
const animGb = gb(TITLES[0].perTitle[0]); // 1.8
const actionGb = gb(TITLES[1].perTitle[0]); // 6.3
const saved = Math.round((1 - animGb / fixedGb) * 100); // 60

const shapes: LayoutShape[] = [];
TITLES.forEach((t, ti) => {
  const px = PANEL_X[ti];
  const barX = px + 64;
  RUNGS.forEach((rung, r) => {
    shapes.push({
      id: `${t.id}-l${r}`,
      type: "text",
      x: px + 8,
      y: rowY(r) + 8,
      w: 50,
      h: 18,
      label: rung,
      tone: PATTERN_TONE.infra,
    });
    const fw = FIXED[r] * PX_PER_MBPS;
    shapes.push({
      id: `${t.id}-f${r}`,
      type: "cell",
      x: barX,
      y: rowY(r),
      w: fw,
      h: BAR_H,
      tone: PATTERN_TONE.data,
      fill: "pastel",
      quiet: r > 0,
    });
    shapes.push({
      id: `${t.id}-fv${r}`,
      type: "text",
      x: barX + fw + 4,
      y: rowY(r) - 1,
      w: 36,
      h: 16,
      label: fmt(FIXED[r]),
      tone: PATTERN_TONE.data,
    });
    const pw = t.perTitle[r] * PX_PER_MBPS;
    shapes.push({
      id: `${t.id}-p${r}`,
      type: "cell",
      x: barX,
      y: rowY(r) + BAR_H + 3,
      w: pw,
      h: BAR_H,
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 2,
      quiet: r > 0,
    });
    shapes.push({
      id: `${t.id}-pv${r}`,
      type: "text",
      x: barX + pw + 4,
      y: rowY(r) + BAR_H + 2,
      w: 36,
      h: 16,
      label: fmt(t.perTitle[r]),
      tone: PATTERN_TONE.pattern,
      step: 2,
    });
  });
  shapes.push({
    id: `${t.id}-s1`,
    type: "text",
    x: px + 8,
    y: rowY(RUNGS.length) + 4,
    w: PANEL_W - 16,
    h: 18,
    label:
      t.fixedScore > TARGET
        ? `fixed ladder: scores ${t.fixedScore} at 1080p: bits spent past the target`
        : `fixed ladder: scores ${t.fixedScore} at 1080p: visibly blocky`,
    tone: t.fixedScore > TARGET ? PATTERN_TONE.data : PATTERN_TONE.fail,
  });
  shapes.push({
    id: `${t.id}-s2`,
    type: "text",
    x: px + 8,
    y: rowY(RUNGS.length) + 26,
    w: PANEL_W - 16,
    h: 18,
    label: `own ladder: ${fmt(t.perTitle[0])} Mb/s at 1080p reaches the target score ${TARGET}`,
    tone: PATTERN_TONE.pattern,
    step: 2,
  });
});

const NOTE_Y = rowY(RUNGS.length) + 70;
shapes.push({
  id: "n3a",
  type: "text",
  x: 20,
  y: NOTE_Y,
  w: 820,
  h: 18,
  label: `a two-hour view at 1080p: fixed ${fixedGb.toFixed(1)} GB; animated ${animGb.toFixed(1)} GB (${saved}% less); action ${actionGb.toFixed(1)} GB, now at the target`,
  tone: PATTERN_TONE.pattern,
  step: 3,
  highlight: true,
});
shapes.push({
  id: "n3b",
  type: "text",
  x: 20,
  y: NOTE_Y + 30,
  w: 820,
  h: 18,
  label:
    "on a 3 Mb/s link (top rung under 2.4 Mb/s): the fixed ladder gives 480p; the animated film's own ladder gives 1080p",
  tone: PATTERN_TONE.infra,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A ladder per title",
  width: 860,
  height: NOTE_Y + 62,
  groups: TITLES.map((t, ti) => ({
    id: `g-${t.id}`,
    title: t.name,
    tone: PATTERN_TONE.infra,
    x: PANEL_X[ti],
    y: 24,
    w: PANEL_W,
    h: rowY(RUNGS.length) + 56 - 24,
  })),
  shapes,
  steps: [{ title: "One ladder for every title" }, { title: "A ladder per title" }, { title: "What it saves" }],
};

export default spec;
