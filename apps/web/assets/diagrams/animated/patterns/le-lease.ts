import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A lease against clock drift, with Kubernetes client-go's core defaults (leader-election, Technical mechanics).
// The leader last renewed at 0 s. Its next try, one retry period later at 2 s, fails and keeps failing; it gives up
// when its 10 s renew deadline runs out, at 2 + 10 = 12 s on its own clock. A candidate takes over only after a full
// 15 s lease duration with no change to the record, measured on its own clock, and it tries every 2 s, so between 15
// and 17 s.
// Two steps: 1 clocks at the same rate: the leader stops at 12 s, the candidate starts at 15 s, a 3 s gap with no
// leader is the safety margin · 2 the candidate's clock runs twice as fast (illustrative, to make the point; real
// drift is far smaller, but a paused VM or a clock jump does the same): its 15 s pass in 7.5 s of real time, so it
// takes over while the leader still acts until 12 s: two leaders for 12 − 7.5 = 4.5 s.
// Layout: a 0–20 s real-time axis, 30 px per second, row labels on the left. Colours (PATTERN_TONE): acting as
// leader green (the pattern), waiting out the lease lime (a check), two leaders red (the only failure), axis neutral.
// Fact check (2026-11-16, client-go tools/leaderelection docs and leaderelection.go): core clients default
// LeaseDuration 15 s, RenewDeadline 10 s, RetryPeriod 2 s; a candidate waits a full LeaseDuration without observing
// a change, timed from its own observation (observedTime); renew polls every RetryPeriod with a RenewDeadline
// timeout; "tolerant to arbitrary clock skew, but is not tolerant to arbitrary clock skew rate"; it "does not
// guarantee that only one client is acting as a leader (a.k.a. fencing)".

const PX = 30;
const X0 = 190;
const SECONDS = 20;
const RETRY = 2;
const RENEW_DEADLINE = 10;
const LEASE = 15;
const leaderStops = RETRY + RENEW_DEADLINE; // 12 s
const FAST = 2; // illustrative clock-rate ratio
const fastTakeover = LEASE / FAST; // 7.5 s
const overlap = leaderStops - fastTakeover; // 4.5 s
const xs = (s: number) => X0 + s * PX;

const rowLabel = (id: string, y: number, label: string, step = 1): LayoutShape => ({
  id,
  type: "text",
  x: 8,
  y: y + 9,
  w: X0 - 16,
  h: 18,
  label,
  tone: PATTERN_TONE.infra,
  step,
});

const shapes: LayoutShape[] = [];

for (let s = 0; s <= SECONDS; s += 2) {
  shapes.push({
    id: `t${s}`,
    type: "text",
    x: xs(s) - 20,
    y: 262,
    w: 40,
    h: 16,
    label: `${s} s`,
    tone: PATTERN_TONE.infra,
  });
}
shapes.push({
  id: "axis",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [xs(0), 254],
    [xs(SECONDS), 254],
  ],
  tone: PATTERN_TONE.infra,
});

// Row 1: the leader.
shapes.push(rowLabel("l-t", 30, "Leader (its clock)"));
shapes.push({
  id: "lead",
  type: "box",
  x: xs(0),
  y: 30,
  w: leaderStops * PX,
  h: 36,
  label: `acts as leader; gives up at ${leaderStops} s`,
  sub: `last renewal 0 s, retry ${RETRY} s + renew deadline ${RENEW_DEADLINE} s`,
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
});

// Row 2: a candidate whose clock runs at the same rate.
shapes.push(rowLabel("c-t", 96, "Candidate (same rate)"));
shapes.push({
  id: "wait",
  type: "box",
  x: xs(0),
  y: 96,
  w: LEASE * PX,
  h: 36,
  label: `waits a ${LEASE} s lease with no change`,
  tone: PATTERN_TONE.check,
  fill: "pastel",
});
shapes.push({
  id: "take",
  type: "box",
  x: xs(LEASE),
  y: 96,
  w: RETRY * PX + 30,
  h: 36,
  label: "takes over",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
});
shapes.push({
  id: "gap",
  type: "text",
  x: xs(leaderStops) - 40,
  y: 140,
  w: (LEASE - leaderStops) * PX + 80,
  h: 18,
  label: `${LEASE - leaderStops} s with no leader: the margin`,
  tone: PATTERN_TONE.check,
});

// Row 3: a candidate whose clock runs fast.
shapes.push(rowLabel("f-t", 180, `Candidate (clock ${FAST}× fast)`, 2));
shapes.push({
  id: "fwait",
  type: "box",
  x: xs(0),
  y: 180,
  w: fastTakeover * PX,
  h: 36,
  label: `its ${LEASE} s pass in ${fastTakeover} s`,
  tone: PATTERN_TONE.check,
  fill: "pastel",
  step: 2,
});
shapes.push({
  id: "two",
  type: "box",
  x: xs(fastTakeover),
  y: 180,
  w: overlap * PX,
  h: 36,
  label: `2 leaders ${overlap} s`,
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 2,
  highlight: true,
});
shapes.push({
  id: "fnote",
  type: "text",
  x: xs(leaderStops) + 8,
  y: 189,
  w: (SECONDS - leaderStops) * PX + 20,
  h: 18,
  label: `old leader stops at ${leaderStops} s`,
  tone: PATTERN_TONE.fail,
  step: 2,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A 15 s lease against a clock that runs fast",
  width: xs(SECONDS) + 40,
  height: 290,
  shapes,
  steps: [{ title: "Same clock rate: a 3 s margin" }, { title: "A fast clock: two leaders" }],
};

export default spec;
