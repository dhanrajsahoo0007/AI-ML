import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The three states of a circuit breaker around Brightpost's card-provider call (circuit-breaker-and-retries, the
// Architecture figure). The numbers are Resilience4j's defaults.
// Four steps: 1 closed: calls pass to the provider and the breaker records each result in a window of the last 100
// calls · 2 open: 50 % or more of the window failed, so the breaker trips; calls fail at once and the caller's
// fallback runs · 3 half-open: after 60 s the breaker lets 10 trial calls through; the rest still fail fast · 4 the
// trials pass and the breaker closes; if they fail it opens again for another 60 s.
// Layout (860 × 300): three state boxes 180 wide at x 35, 340, 645 (centres 125, 430, 735), y 70; trip and wait arrows
// between them; the "trials fail" arrow loops over the top (y 30), the "trials pass" arrow under them (y 180); what
// the caller sees in each state as text at y 205.
// Colours (PATTERN_TONE): closed green (the pattern working), open red (the provider is failing), half-open lime (a
// check: the trial calls).
// Fact check (2026-11-16, Resilience4j CircuitBreaker docs): states CLOSED, OPEN, HALF_OPEN (plus METRICS_ONLY,
// DISABLED, FORCED_OPEN); defaults failureRateThreshold 50 %, slidingWindowType COUNT_BASED, slidingWindowSize 100,
// minimumNumberOfCalls 100, waitDurationInOpenState 60,000 ms, permittedNumberOfCallsInHalfOpenState 10; when open,
// calls are rejected with CallNotPermittedException. Fowler, "CircuitBreaker" (2014): a half-open trial that fails
// restarts the wait.

const WINDOW = 100;
const THRESHOLD = 50;
const WAIT_S = 60;
const TRIALS = 10;

const W = 180;
const H = 70;
const Y = 70;
const X = [35, 340, 645];
const cx = (i: number) => X[i] + W / 2;
const TEXT_W = 250;

const STATES = [
  {
    id: "closed",
    label: "Closed",
    sub: `last ${WINDOW} calls counted`,
    tone: PATTERN_TONE.pattern,
    sees: "Calls go to the card provider.\nEach result is recorded.",
  },
  {
    id: "open",
    label: "Open",
    sub: "no calls sent",
    tone: PATTERN_TONE.fail,
    sees: "Calls fail at once, in under 1 ms.\nThe fallback runs.",
  },
  {
    id: "half",
    label: "Half-open",
    sub: `${TRIALS} trial calls`,
    tone: PATTERN_TONE.check,
    sees: `${TRIALS} trial calls reach the provider.\nThe rest still fail fast.`,
  },
];

const shapes: LayoutShape[] = [];

STATES.forEach((s, i) => {
  shapes.push({
    id: s.id,
    type: "box",
    x: X[i],
    y: Y,
    w: W,
    h: H,
    label: s.label,
    sub: s.sub,
    tone: s.tone,
    fill: "pastel",
    step: i + 1,
  });
  shapes.push({
    id: `${s.id}-sees`,
    type: "text",
    x: cx(i) - TEXT_W / 2,
    y: 205,
    w: TEXT_W,
    h: 40,
    label: s.sees,
    tone: PATTERN_TONE.infra,
    step: i + 1,
    quiet: true,
  });
});

shapes.push({
  id: "trip",
  type: "arrow",
  x: 0,
  y: 0,
  from: "closed",
  to: "open",
  label: `≥ ${THRESHOLD} % failed`,
  tone: PATTERN_TONE.fail,
  step: 2,
});
shapes.push({
  id: "wait",
  type: "arrow",
  x: 0,
  y: 0,
  from: "open",
  to: "half",
  label: `after ${WAIT_S} s`,
  step: 3,
});
shapes.push({
  id: "reopen",
  type: "arrow",
  x: 0,
  y: 0,
  from: "half",
  to: "open",
  via: [
    [cx(2), 30],
    [cx(1), 30],
  ],
  label: "trials fail",
  dashed: true,
  tone: PATTERN_TONE.fail,
  step: 4,
});
shapes.push({
  id: "close",
  type: "arrow",
  x: 0,
  y: 0,
  from: "half",
  to: "closed",
  via: [
    [cx(2), 180],
    [cx(0), 180],
  ],
  label: "trials pass",
  tone: PATTERN_TONE.pattern,
  step: 4,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A circuit breaker's three states",
  width: 860,
  height: 260,
  shapes,
  steps: [
    { title: "Closed: calls pass, results counted" },
    { title: "Open: fail fast" },
    { title: "Half-open: a few trial calls" },
    { title: "Trials pass: closed again" },
  ],
};

export default spec;
