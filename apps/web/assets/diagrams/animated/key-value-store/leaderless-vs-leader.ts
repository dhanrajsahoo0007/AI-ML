import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The two designs for a replicated key-value store, side by side (key-value-store, Deep dive 3).
// Two steps: 1 leaderless: the client's write goes to all three replicas of the key and succeeds on any 2 acks; a
// read asks any 2 and compares versions; one node down costs nothing, but concurrent writes must be resolved · 2 one
// leader per key range: the leader orders every write into a log and acks once 2 of 3 replicas persist it; strong
// reads go to the leader while it holds a lease; when the leader dies that range takes no writes until an election
// and the old lease expire.
// Working: both keep 3 copies and need 2 to agree (a majority of 3 is 2), so both survive 3 − 2 = 1 failure for
// durability; the difference is who orders writes, not how many copies there are.
// Layout (880 × 380): two groups, 420 wide, at x 10 and x 450. Each: the client at y 60; the replicas at y 180
// (leaderless, three 110 wide) or the leader at y 112 and two followers at y 214; four text lines from y 268.
// Colours (PATTERN_TONE): clients orange (traffic), replicas teal (compute), the leader green (the part this design
// adds); text neutral.

const LINE_Y = [268, 290, 312, 334];
const shapes: LayoutShape[] = [];

// Leaderless (step 1)
shapes.push({
  id: "c1",
  type: "box",
  x: 145,
  y: 60,
  w: 150,
  h: 44,
  label: "Client",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
});
["A", "B", "C"].forEach((r, i) => {
  shapes.push({
    id: `r${r}`,
    type: "box",
    x: 25 + i * 140,
    y: 180,
    w: 110,
    h: 44,
    label: `Replica ${r}`,
    tone: PATTERN_TONE.compute,
    fill: "pastel",
  });
  shapes.push({
    id: `w${r}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: "c1",
    to: `r${r}`,
    label: i === 1 ? "write" : undefined,
  });
});
[
  "Writes: to all 3, done on any 2 acks",
  "Reads: any 2 answer; versions compared",
  "A node down: no pause, a hint instead",
  "Cost: concurrent writes to resolve",
].forEach((t, i) => {
  shapes.push({ id: `l${i}`, type: "text", x: 20, y: LINE_Y[i], w: 400, h: 18, label: t, tone: PATTERN_TONE.infra });
});

// Leader per range (step 2)
shapes.push({
  id: "c2",
  type: "box",
  x: 585,
  y: 36,
  w: 150,
  h: 40,
  label: "Client",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
  step: 2,
});
shapes.push({
  id: "leader",
  type: "box",
  x: 575,
  y: 112,
  w: 170,
  h: 50,
  label: "Leader",
  sub: "orders writes, lease",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 2,
});
shapes.push({ id: "wl", type: "arrow", x: 0, y: 0, from: "c2", to: "leader", step: 2 });
["1", "2"].forEach((f, i) => {
  shapes.push({
    id: `f${f}`,
    type: "box",
    x: 470 + i * 240,
    y: 214,
    w: 140,
    h: 44,
    label: `Follower ${f}`,
    tone: PATTERN_TONE.compute,
    fill: "pastel",
    step: 2,
  });
  shapes.push({ id: `lf${f}`, type: "arrow", x: 0, y: 0, from: "leader", to: `f${f}`, label: "log entry", step: 2 });
});
[
  "Writes: leader orders; done when 2 of 3 persist",
  "Strong reads: the leader, while its lease holds",
  "Leader down: no writes until a new election",
  "Cost: a pause of seconds for that range",
].forEach((t, i) => {
  shapes.push({
    id: `r${i}`,
    type: "text",
    x: 460,
    y: LINE_Y[i],
    w: 400,
    h: 18,
    label: t,
    tone: PATTERN_TONE.infra,
    step: 2,
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Leaderless quorums against a leader per range",
  width: 880,
  height: 370,
  groups: [
    { id: "g1", title: "Leaderless quorums", tone: "teal", x: 10, y: 20, w: 420, h: 340 },
    { id: "g2", title: "A leader per key range", tone: "green", x: 450, y: 20, w: 420, h: 340 },
  ],
  steps: [{ title: "Leaderless: any 2 of 3" }, { title: "A leader per range: ordered, with a pause on failover" }],
  shapes,
};

export default spec;
