import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { PREFIX } from "@/components/diagrams/presets/production-lb";

// Prefix-aware routing, for turn 2 of a Brightpost conversation (load-balancing-autoscaling, Deep dive). Replica 1
// answered turn 1 and holds its prompt's KV blocks in its prefix cache; replicas 2 and 3 do not.
//   Turn 2 prompt = 2,200 (turn 1) + 250 (answer) + 20 (follow-up) = 2,470 tokens.
//   Only full 16-token blocks are reused: floor(2,200 ÷ 16) = 137 blocks = 2,192 tokens cached.
//   Prefill at 0.04 ms/token (88 ms ÷ 2,200, illustrative 400 TFLOP/s on 8 B): miss 2,470 × 0.04 = 98.8 ms;
//   hit (2,470 − 2,192) = 278 tokens × 0.04 = 11.1 ms. Saved 87.7 ms of GPU time.
// Steps: 1 round-robin sends turn 2 to replica 2, which must prefill everything · 2 prefix-aware routing sends it to
// replica 1, which prefills only the new tokens · 3 the guard: if replica 1 is far busier than the others the router
// leaves the prefix and picks the least-loaded replica, so one popular prefix cannot make a hot spot.
// Layout: router box at x 20; three replica boxes at x 330, 120 apart vertically; cost note at x 590.
// Colours: router neutral, replicas teal (compute), the cache store violet, the request orange,
// only in step 3 (where something breaks). One highlight: the hit.

const W = 860;
const RY = [30, 150, 270] as const;
const ids = ["r1", "r2", "r3"] as const;

const shapes: LayoutShape[] = [
  {
    id: "req",
    type: "box",
    x: 20,
    y: 150,
    w: 170,
    h: 56,
    label: "Turn 2 request",
    sub: `${n(PREFIX.turn2)} tokens`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
  },
  { id: "router", type: "box", x: 20, y: 250, w: 170, h: 44, label: "Router", tone: PROD_TONE.infra, fill: "pastel" },
  { id: "req-router", type: "arrow", x: 0, y: 0, from: "req", to: "router" },
];
ids.forEach((id, i) => {
  const hotInStep3 = i === 0;
  shapes.push(
    {
      id,
      type: "box",
      x: 300,
      y: RY[i],
      w: 150,
      h: 44,
      label: `Replica ${i + 1}`,
      tone: PROD_TONE.compute,
      fill: "pastel",
    },
    {
      id: `${id}-cache`,
      type: "box",
      x: 300,
      y: RY[i] + 48,
      w: 150,
      h: 36,
      label: i === 0 ? "prefix cache: turn 1" : "prefix cache: empty",
      tone: PROD_TONE.store,
      fill: i === 0 ? "pastel" : "paper",
    }
  );
  void hotInStep3;
});
shapes.push(
  // step 1: round-robin to replica 2
  {
    id: "a-rr",
    type: "arrow",
    x: 0,
    y: 0,
    from: "router",
    to: "r2",
    dashed: true,
    step: 1,
    until: undefined,
  } as LayoutShape,
  {
    id: "t-rr",
    type: "text",
    x: 480,
    y: 168,
    w: 360,
    h: 54,
    label: `Round-robin picks replica 2: cache miss.\nPrefill all ${n(PREFIX.turn2)} tokens = ${PREFIX.missMs} ms of GPU time.`,
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  },
  // step 2: prefix-aware to replica 1
  { id: "a-px", type: "arrow", x: 0, y: 0, from: "router", to: "r1", step: 2, highlight: true },
  {
    id: "t-px",
    type: "text",
    x: 480,
    y: 36,
    w: 360,
    h: 72,
    label: `Prefix-aware picks replica 1: ${n(PREFIX.cachedTokens)} tokens cached\n(137 whole blocks of ${PREFIX.blockTokens}). Prefill ${PREFIX.newTokens} tokens = ${PREFIX.hitMs} ms.`,
    tone: PROD_TONE.check,
    step: 2,
    quiet: true,
  },
  // step 3: the guard
  {
    id: "t-guard",
    type: "box",
    x: 480,
    y: 262,
    w: 360,
    h: 60,
    label: "If replica 1 is far busier than the rest,\nleave the prefix: send to the least-loaded.",
    sub: "a hot prefix must not make a hot spot",
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 3,
  },
  { id: "a-guard", type: "arrow", x: 0, y: 0, from: "router", to: "r3", dashed: true, step: 3 }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Prefix-aware routing sends a follow-up to the replica that already holds its prompt",
  width: W,
  height: 380,
  steps: [
    { title: "Round-robin misses the cache" },
    { title: "Prefix-aware routing hits it" },
    { title: "Fall back to load when one replica runs hot" },
  ],
  shapes,
};

export default spec;
