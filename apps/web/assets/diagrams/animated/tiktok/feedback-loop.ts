import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One swipe, from the screen back into the model (tiktok, Deep dive 2 "The real-time learning loop").
// Four steps, one loop: 1 serve: the ranker returns a page and logs the features it used, with the request id, to the
// event log · 2 the viewer acts: the app batches watch time, likes and swipes to the event collector, which appends
// them to the event log · 3 join: the joiner (accent) matches each impression's features with what the viewer did,
// by request id, and emits one labelled example to the trainer · 4 train and sync: the trainer updates the model and
// every 60 s pushes the changed sparse embedding rows to the serving parameter servers, which the ranker reads on the
// next request.
// Working (budgets chosen for this design): app batch ≤ 10 s; the joiner waits until the outcome is known (the next
// swipe, typically 30 s) or at most 5 minutes; one training step ≈ 60 s; sync every 60 s. Typical: 10 + 30 + 60 +
// 60 = 160 s ≈ 2.7 minutes. Worst: 10 + 300 + 60 + 60 = 430 s ≈ 7.2 minutes, under the 10-minute target (N3).
// Layout (880 × 420): Serving zone (green) x 40–260 with the ranker (150, 90) above the parameter servers (150, 350);
// Client zone (neutral) y 30–140 with the viewer app (450, 85) and event collector (750, 85); Learning zone (orange)
// y 185–400 with the event log (750, 235), joiner (750, 350) and trainer (450, 350). The ranker → event log diagonal
// passes between the Client zone and the Learning zone's short tab.
// Colours (PATTERN_TONE): traffic orange for the viewer, infra neutral for the collector and log, compute teal for the
// trainer and parameter servers, the joiner green accent (the pattern's own part), the ranker teal.

const spec: DiagramSpec = {
  title: "The real-time learning loop",
  width: 880,
  height: 420,
  steps: [
    { title: "Serve, and log what the ranker saw", covers: "F1" },
    { title: "The viewer acts: events in batches", covers: "F3" },
    { title: "Join into a labelled example", covers: "F4" },
    { title: "Train, then sync every 60 s", covers: "F4, N3" },
  ],
  zones: [
    { id: "serving", title: "Serving", tone: "green", x: 40, y: 30, w: 220, h: 370 },
    { id: "client", title: "Client", tone: "neutral", x: 320, y: 30, w: 540, h: 110 },
    { id: "learning", title: "Learning", tone: "orange", x: 320, y: 185, w: 540, h: 215 },
  ],
  nodes: [
    {
      id: "ranker",
      label: "Ranker",
      sub: "scores a page",
      icon: "gpu",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 150,
      y: 90,
      w: 170,
    },
    {
      id: "params",
      label: "Param servers",
      sub: "serving copy",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 4,
      x: 150,
      y: 350,
      w: 170,
    },
    {
      id: "viewer",
      label: "Viewer app",
      sub: "watches, swipes",
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 450,
      y: 85,
      w: 170,
    },
    {
      id: "collector",
      label: "Event collector",
      sub: "batches ≤ 10 s",
      icon: "api",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 2,
      x: 750,
      y: 85,
      w: 170,
    },
    {
      id: "log",
      label: "Event log",
      sub: "actions, features",
      icon: "log",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      x: 750,
      y: 235,
      w: 170,
    },
    {
      id: "joiner",
      label: "Joiner",
      sub: "key = request id",
      icon: "workers",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: 750,
      y: 350,
      w: 170,
    },
    {
      id: "trainer",
      label: "Trainer",
      sub: "one step ≈ 60 s",
      icon: "cpu",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 4,
      x: 450,
      y: 350,
      w: 170,
    },
  ],
  edges: [
    { from: "ranker", to: "viewer", label: "page of 10", flow: true, packet: true },
    { from: "ranker", to: "log", label: "features used", dashed: true, labelAt: 0.62 },

    { from: "viewer", to: "collector", label: "watch, swipe", flow: true, packet: true, step: 2 },
    { from: "collector", to: "log", label: "events", flow: true, packet: true, delay: 0.4, step: 2 },

    { from: "log", to: "joiner", flow: true, packet: true, step: 3 },
    { from: "joiner", to: "trainer", label: "labelled example", flow: true, packet: true, delay: 0.4, step: 3 },

    { from: "trainer", to: "params", label: "sync / 60 s", flow: true, packet: true, step: 4 },
    { from: "params", to: "ranker", label: "fresh weights", flow: true, packet: true, delay: 0.4, step: 4 },
  ],
};

export default spec;
