import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { BREAKER } from "@/components/diagrams/presets/production-routing";

// The circuit breaker in front of provider A (multi-model-routing-fallbacks). Four steps:
//   1 Closed: every call goes to A, and the breaker counts the outcomes of the last 20 calls;
//   2 Open: 10 of the last 20 calls failed (a failure is a 429, a 5xx or no first token within 2 s), so the breaker
//     trips. For 30 s every call goes straight to the fallback B. At the 12 requests/s peak that is 12 × 30 = 360
//     calls that skip A's 3.05 s detour;
//   3 Half-open: after the 30 s the breaker lets 3 probe calls through to A, one at a time;
//   4 Recovery or a second trip: 3 probes succeed → closed; any probe fails → open for another 30 s.
// Numbers come from presets/production-routing.ts BREAKER (illustrative settings, the shared 12 requests/s peak).
//
// Grid (820 wide): Closed x 30 · Open x 600 · Half-open x 305 (below, centred); boxes 190 × 64 at y 60 and y 240.
// Colours (PROD_TONE): closed neutral (infrastructure, healthy), open red (the one thing that breaks), half-open
// orange (probes are real requests). Three tones. Rings: boxes ring when they appear; arrows are `quiet`.

const W = 190;
const H = 64;
const X = { closed: 30, open: 600, half: 305 } as const;
const Y = { top: 100, bottom: 290 } as const;

const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.5) + 8;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: hug(label),
  h: 20 * label.split("\n").length,
  label,
  tone,
  step,
  quiet: true,
});
const arrow = (
  id: string,
  from: string,
  to: string,
  step: number,
  label: string,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to, label, step, quiet: true, ...extra });

const shapes: LayoutShape[] = [
  // Step 1
  {
    id: "closed",
    type: "box",
    x: X.closed,
    y: Y.top,
    w: W,
    h: H,
    label: "Closed",
    sub: "calls go to provider A",
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 1,
  },
  text(
    "closed-note",
    X.closed - 10,
    Y.top - 70,
    `Counts the last ${BREAKER.window} outcomes.\nA failure is a 429, a 5xx\nor no first token in 2 s.`,
    1
  ),

  // Step 2
  {
    id: "open",
    type: "box",
    x: X.open,
    y: Y.top,
    w: W,
    h: H,
    label: "Open",
    sub: "calls skip A, go to B",
    tone: PROD_TONE.failure,
    fill: "pastel",
    step: 2,
  },
  arrow("closed>open", "closed", "open", 2, `${BREAKER.failuresToTrip} of last ${BREAKER.window} calls fail`),
  text(
    "open-note",
    X.open - 50,
    Y.top - 50,
    `No wait on A: ${n(BREAKER.requestsWhileOpen)} calls in ${BREAKER.openS} s\nat 12 requests/s skip the detour.`,
    2,
    PROD_TONE.failure
  ),

  // Step 3
  {
    id: "half",
    type: "box",
    x: X.half,
    y: Y.bottom,
    w: W + 10,
    h: H,
    label: "Half-open",
    sub: `${BREAKER.probes} probe calls to A`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 3,
  },
  arrow("open>half", "open", "half", 3, `after ${BREAKER.openS} s`, { via: [[695, Y.bottom + H / 2]] }),
  text(
    "half-note",
    X.half - 30,
    Y.bottom + H + 10,
    "Probes are real requests, one at a time.\nThe rest still go to B.",
    3
  ),

  // Step 4
  arrow("half>closed", "half", "closed", 4, `${BREAKER.probes} probes succeed`, { via: [[125, Y.bottom + H / 2]] }),
  arrow("half>open", "half", "open", 4, "a probe fails: open again", {
    dashed: true,
    tone: PROD_TONE.failure,
    via: [
      [410, Y.bottom - 60],
      [650, Y.bottom - 60],
      [650, Y.top + H + 20],
    ],
  }),
  text(
    "foot",
    30,
    Y.bottom + H + 64,
    `Illustrative settings, not a product default. Trip needs at least ${BREAKER.minCalls} calls in the window.`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A circuit breaker: closed, open, half-open",
  width: 820,
  height: Y.bottom + H + 64 + 20 + 16,
  steps: [
    { title: "Closed: calls go to the provider" },
    { title: "Open: too many failures, skip the provider" },
    { title: "Half-open: let a few probe calls through" },
    { title: "Close again on success, re-open on failure" },
  ],
  shapes,
};

export default spec;
