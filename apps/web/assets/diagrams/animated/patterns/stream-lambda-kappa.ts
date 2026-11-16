import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Lambda against Kappa for the trending counts (stream-processing-and-windowing, Technical mechanics).
// Lambda (top): the view log feeds a nightly batch job and a live stream job, written as two code bases; the query
// merges an exact but day-old batch view with a recent live view.
// Kappa (bottom): one stream job; the log keeps 30 days (illustrative retention); to change the logic, start job v2
// from offset 0 into a new table, switch reads when it has caught up, then stop v1 and drop its table.
// Layout: two dotted groups stacked, each a row of five columns (log, jobs, outputs, reader). Columns at x 30, 240,
// 470, 690.
// Colours (PATTERN_TONE): logs and tables violet (stores), jobs teal (compute), the Kappa v2 job green (the pattern:
// the replay is the whole idea), the duplicated logic red (what breaks), readers neutral.
// Fact check (2026-11-16, Kreps, “Questioning the Lambda Architecture”, O’Reilly Radar, 2 July 2014): Lambda runs the
// same logic in a batch and a stream system; the proposed alternative keeps the full log (Kafka), starts a second
// instance of the job from the beginning into a new output table, switches the application once it has caught up,
// then stops the old job and deletes the old table.

const H = 50;
const shapes: LayoutShape[] = [];
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string | undefined,
  tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE]
) => shapes.push({ id, type: "box", x, y, w, h: H, label, sub, tone, fill: "pastel" });
const arrow = (id: string, from: string, to: string, dashed = false) =>
  shapes.push({ id, type: "arrow", x: 0, y: 0, from, to, tone: PATTERN_TONE.infra, dashed });

// Lambda
box("l-log", 30, 92, 150, "View log", undefined, PATTERN_TONE.store);
box("l-batch", 240, 52, 180, "Batch job", "nightly · code A", PATTERN_TONE.compute);
box("l-stream", 240, 132, 180, "Stream job", "live · code B", PATTERN_TONE.compute);
box("l-bview", 470, 52, 170, "Batch view", "exact, a day old", PATTERN_TONE.store);
box("l-lview", 470, 132, 170, "Live view", "since last batch", PATTERN_TONE.store);
box("l-query", 690, 92, 150, "Query", "merges both", PATTERN_TONE.infra);
arrow("la-1", "l-log", "l-batch");
arrow("la-2", "l-log", "l-stream");
arrow("la-3", "l-batch", "l-bview");
arrow("la-4", "l-stream", "l-lview");
arrow("la-5", "l-bview", "l-query");
arrow("la-6", "l-lview", "l-query");
shapes.push({
  id: "l-warn",
  type: "text",
  x: 240,
  y: 188,
  w: 400,
  h: 18,
  label: "The same counting logic, written and kept in step twice",
  tone: PATTERN_TONE.fail,
});

// Kappa
box("k-log", 30, 312, 150, "View log", "kept 30 days", PATTERN_TONE.store);
box("k-v1", 240, 272, 180, "Stream job v1", "live", PATTERN_TONE.compute);
box("k-v2", 240, 352, 180, "Stream job v2", "replays from offset 0", PATTERN_TONE.pattern);
box("k-t1", 470, 272, 170, "Table v1", "dropped after switch", PATTERN_TONE.store);
box("k-t2", 470, 352, 170, "Table v2", "catching up", PATTERN_TONE.store);
box("k-app", 690, 312, 150, "App", "reads v1, then v2", PATTERN_TONE.infra);
arrow("ka-1", "k-log", "k-v1");
arrow("ka-2", "k-log", "k-v2");
arrow("ka-3", "k-v1", "k-t1");
arrow("ka-4", "k-v2", "k-t2");
arrow("ka-5", "k-t1", "k-app", true);
arrow("ka-6", "k-t2", "k-app");
shapes.push({
  id: "k-note",
  type: "text",
  x: 240,
  y: 408,
  w: 400,
  h: 18,
  label: "One code base; reprocessing is a replay of the log",
  tone: PATTERN_TONE.pattern,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Lambda and Kappa for the trending counts",
  width: 870,
  height: 446,
  groups: [
    { id: "g-lambda", title: "Lambda: batch and stream", tone: PATTERN_TONE.infra, x: 14, y: 14, w: 842, h: 202 },
    { id: "g-kappa", title: "Kappa: one stream job", tone: PATTERN_TONE.infra, x: 14, y: 234, w: 842, h: 202 },
  ],
  shapes,
};

export default spec;
