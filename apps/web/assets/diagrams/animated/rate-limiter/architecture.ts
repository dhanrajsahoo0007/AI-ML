import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A rate limiter for a public API, built one requirement at a time (rate-limiter case study, the hero).
// Eight steps: 1 a counter in each gateway's memory: every gateway counts on its own, so a key spread over 20
// gateways gets 20 × its limit · 2 a shared counter store: two gateways read 99, both write 100 (red, replaced in
// step 3) · 3 one atomic script per request (a token bucket) and a 429 with Retry-After · 4 rules per plan from a
// rules DB, served as a snapshot by the config service and polled by every gateway; an operator edits rules and owns
// the kill switch · 5 the fast path: blocked keys and hot-key batches in the gateway's local cache · 6 failure: a
// decision log feeds usage analytics so a new rule runs in shadow mode first; the store call has a timeout and fails
// open · 7 regions: each region counts in its own store and a region sync swaps totals for daily quotas every 10 s ·
// 8 overload: a load shedder in front of the API services keeps capacity for critical calls (the step-1 direct path
// to the services goes away).
// Working (round numbers chosen to size the system): 100,000 requests/s at peak over 3 regions and 60 gateways
// (20 a region), so ≈ 1,700 requests/s a gateway; one script per request = 100,000 scripts/s; at a planning figure
// of 25,000 scripts/s a shard that is 100,000 ÷ 25,000 = 4 primaries. 1,000,000 keys × 2 buckets × ≈ 100 bytes =
// 200 MB of counters. Region sync every 10 s.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients column x 105: API client 250, operator 560.
// Edge column x 297: load balancer 150, API gateway 330, local cache 510. Core: the rate limiter (accent) at 575, 175.
// Services column x 575: load shedder 385, API services 490, config service 615. Async column x 879: region sync 290,
// decision log 420. Storage column x 1098 (glyphs, labels below): counter store 150, usage analytics 360, rules DB
// 540. The step-1 limiter-to-local edge runs down the gap at x 430; the config-to-limiter edge runs up the gap at x 720 right of
// the Services column. Every long
// edge was checked against the boxes it passes.
// Colours: the six zone tones; the read-then-write race is red; the limiter is the one accent node.

const spec: DiagramSpec = {
  title: "Rate limiter high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "A counter in each gateway", covers: "F1" },
    { title: "A shared counter: the race", covers: "F1, F5" },
    { title: "One atomic check and a 429", covers: "F1, F2, F3" },
    { title: "Rules per plan, no deploy", covers: "F4" },
    { title: "The fast path: blocked keys", covers: "N1" },
    { title: "When the limiter fails", covers: "N2" },
    { title: "Regions count locally", covers: "F5" },
    { title: "Protect critical traffic", covers: "F6" },
  ],
  zones: zoneFrame({ core: "Rate limiting" }),
  nodes: [
    { id: "client", label: "API client", sub: "key k42", icon: "api", fill: "pastel", x: 105, y: 250, w: 140 },
    {
      id: "ops",
      label: "Operator",
      sub: "rules, kill switch",
      icon: "users",
      fill: "pastel",
      step: 4,
      x: 105,
      y: 560,
      w: 150,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "layer 7",
      icon: "router",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 150,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, plan",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 330,
      w: 150,
    },
    {
      id: "local",
      label: "Local cache",
      sub: "in each gateway",
      icon: "cache",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 510,
      w: 150,
    },
    {
      id: "limiter",
      label: "Rate limiter",
      sub: "token bucket per key",
      icon: "timer",
      tone: "green",
      accent: true,
      x: 575,
      y: 175,
      w: 240,
    },
    {
      id: "shedder",
      label: "Load shedder",
      sub: "critical calls first",
      icon: "meter",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 385,
      w: 200,
    },
    {
      id: "api",
      label: "API services",
      sub: "the protected backend",
      icon: "server",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 490,
      w: 200,
    },
    {
      id: "config",
      label: "Config service",
      sub: "rules snapshot",
      icon: "policy",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: 575,
      y: 615,
      w: 200,
    },
    {
      id: "sync",
      label: "Region sync",
      sub: "totals every 10 s",
      icon: "globe",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 290,
      w: 190,
    },
    {
      id: "log",
      label: "Decision log",
      sub: "allow, block, shadow",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 420,
      w: 190,
    },
    {
      id: "store",
      label: "Counter store",
      sub: "in memory, 4 shards",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 150,
    },
    {
      id: "usage",
      label: "Usage analytics",
      sub: "would-block reports",
      icon: "chart",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 360,
    },
    {
      id: "rules",
      label: "Rules DB",
      sub: "plans, overrides",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 540,
    },
  ],
  edges: [
    { from: "client", to: "lb", label: "request", flow: true, packet: true },
    { from: "lb", to: "gw", label: "any gateway", flow: true, packet: true, delay: 0.3 },
    { from: "gw", to: "limiter", label: "check k42", flow: true, packet: true, delay: 0.6 },
    {
      from: "limiter",
      to: "local",
      label: "count in memory",
      dashed: true,
      until: 1,
      via: [
        [430, 175],
        [430, 510],
      ],
      labelAt: 0.42,
    },
    { from: "gw", to: "api", label: "allowed", flow: true, packet: true, delay: 0.9, until: 7 },

    { from: "limiter", to: "store", label: "GET, then SET", tone: "red", step: 2, until: 2 },

    { from: "limiter", to: "store", label: "one atomic script", flow: true, packet: true, delay: 0.8, step: 3 },
    { from: "gw", to: "client", label: "429, Retry-After", dashed: true, step: 3 },

    { from: "ops", to: "config", label: "rules, kill switch", step: 4 },
    { from: "config", to: "rules", label: "plans, overrides", dashed: true, step: 4 },
    {
      from: "config",
      to: "limiter",
      label: "snapshot / 10 s",
      dashed: true,
      step: 4,
      via: [
        [720, 615],
        [720, 200],
      ],
      labelAt: 0.22,
    },

    { from: "gw", to: "local", label: "blocked keys", step: 5 },

    { from: "limiter", to: "log", label: "decisions", dashed: true, step: 6 },
    { from: "log", to: "usage", label: "would block", step: 6 },

    { from: "store", to: "sync", label: "region totals", bidirectional: true, step: 7 },

    { from: "gw", to: "shedder", label: "allowed", flow: true, packet: true, delay: 0.9, step: 8 },
    { from: "shedder", to: "api", label: "by priority", flow: true, packet: true, delay: 1.2, step: 8 },
  ],
};

export default spec;
