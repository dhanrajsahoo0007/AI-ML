import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { AVAILABILITY, FAILOVER, SUPPORT } from "@/components/diagrams/presets/gcase-gateway";

// The gateway's circuit breaker with the v3 rules (llm-platform-gateway, design sheet §10.5 and §15.2; preset FAILOVER,
// AVAILABILITY, SUPPORT in presets/gcase-gateway.ts). Drawn in place of serving/route-circuit-breaker, whose note
// counts every 429 and only a 2 s timeout as failures. Here, per provider and model:
//   1 Closed: counts the last FAILOVER.breaker.window = 20 outcomes; a failure is a 529, a 5xx, a timeout, or, for T0,
//     a first token later than AVAILABILITY.slowMs = 800 ms (the SLI line; the call runs on to its 2 s deadline).
//     A 429 from one team's workspace limit never counts (that tenant falls back alone).
//   2 Open: 10 of 20 fail, or slow-or-failed calls pass FAILOVER.slowTrip.share = 10% of a rolling minute (≥ 20
//     calls); for FAILOVER.breaker.openS = 30 s, T0 goes straight to B: first token FAILOVER.openPathMs = 550 ms
//     (support) and FAILOVER.voiceFast429Ms = 600 ms (voice), good by the SLI. At 19.8 support calls a second
//     (SUPPORT.peakMidCallsPerSecond) ten failures arrive within about a second.
//   3 Half-open: after 30 s, FAILOVER.breaker.probes = 3 probes to A, one at a time, each must beat 800 ms.
//   4 Close: traffic returns to A in steps sized from A's ramp rule (moving back is another cache miss); a failed or
//     slow probe opens it again for 30 s.
// Grid (820 wide): Closed x 30 · Open x 600 · Half-open x 305 (below, centred); boxes 190 × 64, as the concept figure.
// Colours: closed neutral, open red, half-open orange; notes neutral, the open note red.

const W = 190;
const H = 64;
const X = { closed: 30, open: 600, half: 305 } as const;
const Y = { top: 110, bottom: 300 } as const;
const br = FAILOVER.breaker;
const slow = AVAILABILITY.slowMs;
const pct = (v: number) => `${Math.round(v * 100)}%`;

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
    Y.top - 88,
    `Counts the last ${br.window} outcomes, per provider and model.\nA failure: 529, 5xx, timeout, or a T0 first token\nlater than ${slow} ms. A workspace 429 never counts.`,
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
    sub: "T0 goes straight to B",
    tone: GENAI_TONE.failure,
    fill: "pastel",
    step: 2,
  },
  arrow(
    "closed>open",
    "closed",
    "open",
    2,
    `${br.trips} of ${br.window} fail, or > ${pct(FAILOVER.slowTrip.share)} slow a minute`
  ),
  text(
    "open-note",
    X.open - 115,
    Y.top - 66,
    `For ${br.openS} s: first token ${FAILOVER.openPathMs} ms (support),\n${FAILOVER.voiceFast429Ms} ms (voice), good by the SLI.`,
    2,
    GENAI_TONE.failure
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
    sub: `${br.probes} probes, each < ${slow} ms`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 3,
  },
  arrow("open>half", "open", "half", 3, `after ${br.openS} s`, { via: [[695, Y.bottom + H / 2]] }),
  text(
    "half-note",
    X.half - 30,
    Y.bottom + H + 10,
    "Probes are real requests, one at a time.\nThe rest still go to B.",
    3
  ),

  // Step 4
  arrow("half>closed", "half", "closed", 4, "probes pass: back in steps", { via: [[125, Y.bottom + H / 2]] }),
  arrow("half>open", "half", "open", 4, "a probe fails or is slow", {
    dashed: true,
    tone: GENAI_TONE.failure,
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
    `At ${SUPPORT.peakMidCallsPerSecond.toFixed(1)} support calls a second, ten failures arrive in about a second. Moving back is another cache miss.`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `The gateway's breaker: failures and T0 calls slower than ${slow} ms open it; a workspace 429 never does`,
  width: 820,
  height: Y.bottom + H + 64 + 20 + 16,
  steps: [
    { title: `Closed: count failures and calls slower than ${slow} ms` },
    { title: `Open: ${br.trips} of ${br.window}, or > ${pct(FAILOVER.slowTrip.share)} slow; T0 goes to B` },
    { title: `Half-open: ${br.probes} probes that must beat ${slow} ms` },
    { title: "Close in steps on success, re-open on a failed or slow probe" },
  ],
  shapes,
};

export default spec;
