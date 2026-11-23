import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { PROBE } from "@/components/diagrams/presets/production-deploy";
import { COLD } from "@/components/diagrams/presets/production-lb";

// From "container started" to "traffic" (containerization-orchestration, Deep dive). One replica whose image is already
// on the node: the engine downloads and loads the weights, warms up, and only then can answer. Three probes decide what
// Kubernetes does meanwhile. All durations ILLUSTRATIVE (presets/production-deploy.ts, reusing COLD):
//   download 16 s + load 8 s = 24 s; warm-up 35 s; engine can answer at 24 + 35 = 59 s.
//   Startup probe, periodSeconds 10: the first check after 59 s is at 60 s, so it passes at 60 s (its budget is
//   periodSeconds × failureThreshold = 10 × 30 = 300 s). Liveness and readiness probes are switched off until it passes.
//   Readiness probe, periodSeconds 5, starts at 60 s: in service by 65 s. Traffic starts at 65 s.
//   Without a startup probe, a liveness probe with initialDelaySeconds 10, periodSeconds 10, failureThreshold 3 fails
//   at 10, 20 and 30 s (the engine is still loading) and the kubelet restarts the container at 30 s.
//
// Steps: 1 what the engine does · 2 the startup probe holds the other probes off · 3 readiness and liveness take over,
// traffic starts · 4 without the startup probe a liveness probe kills the container at 30 s (red).
// Layout (880 wide): label column x 20..200 (right-aligned boxes); bars from x 215 at 7.6 px per second (80 s = 608 px,
// ends x 823). Five lanes 52 apart starting y 40: engine, startup probe, readiness probe, liveness probe, traffic.
// Axis below with ticks every 10 s. Colours: download blue (data), load and warm-up teal (compute), probe bars lime (a
// check), traffic orange; the step-4 marker is the only red. Highlight: the warm-up bar.

const AX = 215;
const PX = 7.6;
const LANE = 52;
const Y0 = 44;
const BAR = 24;
const x = (s: number) => Math.round(AX + s * PX);
const laneY = (i: number) => Y0 + i * LANE;

const label = (id: string, lane: number, t: string, sub: string, step: number): LayoutShape[] => [
  { id: `${id}-l`, type: "text", x: 14, y: laneY(lane) - 2, w: 190, h: 18, label: t, tone: PROD_TONE.infra, step },
  {
    id: `${id}-s`,
    type: "text",
    x: 14,
    y: laneY(lane) + 15,
    w: 190,
    h: 18,
    label: sub,
    tone: PROD_TONE.infra,
    quiet: true,
    step,
  },
];

const bar = (
  id: string,
  lane: number,
  from: number,
  to: number,
  text: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "cell",
  x: x(from),
  y: laneY(lane),
  w: x(to) - x(from),
  h: BAR,
  label: text,
  tone,
  fill: "pastel",
  step,
  ...extra,
});

const AXIS_Y = laneY(5) + 4;
const ticks: LayoutShape[] = [];
for (let s = 0; s <= 80; s += 10) {
  ticks.push(
    {
      id: `tick-${s}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x(s), AXIS_Y],
        [x(s), AXIS_Y + 5],
      ],
      tone: PROD_TONE.infra,
      quiet: true,
    } as LayoutShape,
    {
      id: `tick-${s}-label`,
      type: "text",
      x: x(s) - 20,
      y: AXIS_Y + 7,
      w: 40,
      h: 18,
      label: s === 80 ? "80 s" : String(s),
      tone: PROD_TONE.infra,
      quiet: true,
    } as LayoutShape
  );
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "From container started to traffic",
  width: 880,
  height: AXIS_Y + 66,
  steps: [
    { title: "The engine loads weights, then warms up" },
    { title: "The startup probe keeps the other probes off" },
    { title: "Readiness decides when traffic starts" },
    { title: "Without a startup probe, liveness kills it" },
  ],
  shapes: [
    // Lane 0: the engine
    ...label("engine", 0, "The engine", "download, load, warm up", 1),
    bar("download", 0, 0, COLD.slow.download, `${COLD.slow.download} s`, PROD_TONE.data, 1),
    bar("load", 0, COLD.slow.download, PROBE.loadEnd, `${COLD.slow.load} s`, PROD_TONE.compute, 1),
    bar("warm", 0, PROBE.loadEnd, PROBE.engineReady, `warm-up ${COLD.slow.warm} s`, PROD_TONE.compute, 1, {
      highlight: true,
    }),
    // Lane 1: the startup probe
    ...label("startup", 1, "Startup probe", "every 10 s, 300 s budget", 2),
    bar("startup-bar", 1, 0, PROBE.startupPass, "failing until the engine answers", PROD_TONE.check, 2),
    // Lane 2: the readiness probe
    ...label("ready", 2, "Readiness probe", "every 5 s, from 60 s", 3),
    bar("ready-bar", 2, PROBE.startupPass, PROBE.inService, "", PROD_TONE.check, 3),
    // Lane 3: the liveness probe
    ...label("live", 3, "Liveness probe", "is the process stuck?", 3),
    bar("live-bar", 3, PROBE.startupPass, 80, "checking", PROD_TONE.check, 3),
    // Lane 4: traffic
    ...label("traffic", 4, "Traffic", "requests from the Service", 3),
    bar("traffic-bar", 4, PROBE.inService, 80, "requests", PROD_TONE.traffic, 3),
    {
      id: "no-traffic",
      type: "text",
      x: x(0),
      y: laneY(4) + 3,
      w: 216,
      h: 18,
      label: "not in service: no requests are sent",
      tone: PROD_TONE.infra,
      quiet: true,
      step: 3,
    },
    // Step 4: the failure
    {
      id: "kill-line",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x(PROBE.livenessKill), 28],
        [x(PROBE.livenessKill), laneY(4) + BAR + 8],
      ],
      dashed: true,
      tone: PROD_TONE.failure,
      step: 4,
    },
    {
      id: "kill-note",
      type: "box",
      x: x(PROBE.livenessKill) + 10,
      y: 2,
      w: 330,
      h: 30,
      label: "30 s: liveness fails 3 times, container restarted",
      tone: PROD_TONE.failure,
      fill: "pastel",
      step: 4,
    },
    {
      id: "axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [AX, AXIS_Y],
        [x(80), AXIS_Y],
      ],
      tone: PROD_TONE.infra,
      quiet: true,
    } as LayoutShape,
    ...ticks,
    {
      id: "foot",
      type: "text",
      x: 20,
      y: AXIS_Y + 30,
      w: 840,
      h: 18,
      label:
        "Illustrative seconds after the container starts: 16 + 8 + 35 = 59 s; next 10 s probe tick 60 s; readiness 65 s.",
      tone: PROD_TONE.infra,
      quiet: true,
    },
  ],
};

export default spec;
