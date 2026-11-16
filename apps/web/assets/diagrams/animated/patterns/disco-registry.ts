import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A service registry with leases and watches, one part at a time (service-discovery-and-coordination, the
// Architecture figure). Brightpost's order service calls the product service, whose instances come and go.
//
// Six steps: 1 the caller uses an address from its config (the "before") · 2 instances register with a lease and
// keep it alive with heartbeats · 3 the caller looks up the healthy instances and calls one · 4 an instance stops
// heartbeating and its lease expires, which deletes its entry · 5 the registry tells callers through a watch ·
// 6 the caller keeps the last good list, so a registry outage does not stop calls. Nodes never move.
// Layout (880 × 490): caller at x 115 with its local cache below; registry (accent) at x 420; instances in a column at
// x 740 with the expired-lease marker under them. The call edge is routed above the registry.
// Colours (PATTERN_TONE): services teal (compute), the registry green (the pattern), the expiry lime (a check), the
// local cache violet (a store).
// Fact check (2026-11-16): etcd deletes the keys attached to a lease when no keep-alive arrives within its TTL and
// streams PUT and DELETE events to watchers; ZooKeeper deletes an ephemeral znode when its session ends.

const X = { caller: 115, reg: 420, inst: 740 } as const;

const spec: DiagramSpec = {
  title: "A service registry with leases and watches",
  width: 880,
  height: 490,
  steps: [
    { title: "Callers use addresses from config" },
    { title: "Instances register with a lease" },
    { title: "The caller looks up healthy instances" },
    { title: "A lease expires; the entry is deleted" },
    { title: "A watch tells the caller" },
    { title: "Keep the last good list" },
  ],
  zones: [{ id: "svc", title: "Product service", tone: PATTERN_TONE.compute, x: 650, y: 40, w: 185, h: 370 }],
  nodes: [
    {
      id: "caller",
      label: "Order service",
      sub: "the caller",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: X.caller,
      y: 235,
      w: 170,
    },
    {
      id: "i1",
      label: "Instance 1",
      sub: "10.0.1.7",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: X.inst,
      y: 100,
      w: 160,
    },

    {
      id: "reg",
      label: "Service registry",
      sub: "leases and watches",
      icon: "registry",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: X.reg,
      y: 235,
      w: 190,
    },
    {
      id: "i2",
      label: "Instance 2",
      sub: "10.0.2.9",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: X.inst,
      y: 225,
      w: 160,
    },
    {
      id: "i3",
      label: "Instance 3",
      sub: "10.0.3.4",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: X.inst,
      y: 350,
      w: 160,
    },

    {
      id: "expired",
      label: "Lease expired",
      sub: "no heartbeat for 10 s",
      icon: "timer",
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step: 4,
      x: X.inst,
      y: 450,
      w: 180,
    },

    {
      id: "cache",
      label: "Last good list",
      sub: "kept in memory",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 6,
      x: X.caller,
      y: 420,
      w: 170,
    },
  ],
  edges: [
    { from: "caller", to: "i1", label: "address in config", packet: true, until: 1, via: [[X.caller, 100]] },

    { from: "i1", to: "reg", packet: true, step: 2 },
    { from: "i2", to: "reg", label: "register + heartbeat", packet: true, delay: 0.3, step: 2 },
    { from: "i3", to: "reg", packet: true, delay: 0.6, step: 2, until: 3 },

    { from: "caller", to: "reg", label: "lookup", bidirectional: true, step: 3 },
    {
      from: "caller",
      to: "i2",
      label: "call",
      packet: true,
      delay: 0.8,
      step: 3,
      via: [
        [260, 160],
        [600, 160],
      ],
    },

    { from: "i3", to: "expired", dashed: true, step: 4 },

    {
      from: "reg",
      to: "caller",
      label: "watch: instance 3 gone",
      dashed: true,
      flow: true,
      step: 5,
      via: [
        [X.reg, 330],
        [X.caller + 40, 330],
      ],
    },

    { from: "caller", to: "cache", label: "fallback", bidirectional: true, step: 6 },
  ],
};

export default spec;
