import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The life of one idempotency record (idempotency, Technical mechanics): absent, in progress, done, expired, with
// what a repeat request gets in each state.
// Layout: four state boxes in a row (130 × 54, 100 apart) joined by labelled arrows, a dashed arrow back from "in progress" to
// "absent" for a handler that fails before any side effect, and the answer to a repeat under each box.
// Colours (PATTERN_TONE): absent and expired neutral, in progress lime (a check that blocks duplicates), done green
// (the pattern's saved answer).
// Fact check (2026-11-16): Stripe keeps keys for at least 24 hours and then may prune them; a key reused after it is
// pruned is treated as a new request.

const Y = 70;
const W = 130;
const H = 54;
const GAP = 100;
const states = [
  { id: "absent", label: "Absent", sub: "no record", tone: PATTERN_TONE.infra, repeat: "runs as new" },
  {
    id: "progress",
    label: "In progress",
    sub: "handler running",
    tone: PATTERN_TONE.check,
    repeat: "409, retry later",
  },
  { id: "done", label: "Done", sub: "status + body saved", tone: PATTERN_TONE.pattern, repeat: "the saved response" },
  { id: "expired", label: "Expired", sub: "after 24 h", tone: PATTERN_TONE.infra, repeat: "runs as new" },
];
const x = (i: number) => 60 + i * (W + GAP);

const shapes: LayoutShape[] = [];
states.forEach((s, i) => {
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
    id: `${s.id}-r`,
    type: "text",
    x: x(i) - (GAP - 10) / 2,
    y: Y + H + 12,
    w: W + GAP - 10,
    h: 18,
    label: `repeat: ${s.repeat}`,
    tone: PATTERN_TONE.infra,
  });
});
const arrows: [string, string, string][] = [
  ["absent", "progress", "insert key"],
  ["progress", "done", "save response"],
  ["done", "expired", "TTL ends"],
];
arrows.forEach(([from, to, label], i) => {
  shapes.push({ id: `a${i}`, type: "arrow", x: 0, y: 0, from, to, label });
});
shapes.push({
  id: "fail",
  type: "arrow",
  x: 0,
  y: 0,
  from: "progress",
  to: "absent",
  via: [
    [x(1) + W / 2, Y - 34],
    [x(0) + W / 2, Y - 34],
  ],
  label: "failed before any side effect: delete",
  dashed: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The life of an idempotency record",
  width: x(3) + W + 60,
  height: Y + H + 50,
  shapes,
};

export default spec;
