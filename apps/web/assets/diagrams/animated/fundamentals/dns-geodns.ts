import type { DiagramSpec } from "@/components/diagrams/types";

// DNS as a load balancer for the recipe site. One authoritative GeoDNS service answers the same name with a
// different address depending on where the asking resolver is.
// Step 1: Sydney gets Singapore, Paris gets Frankfurt.
// Step 2: a health checker probes each region every 10 s and tells GeoDNS which ones are up.
// Step 3: Singapore fails three probes (about 30 s); GeoDNS starts answering Frankfurt, and Sydney moves over
// once its cached answer (TTL 60 s) runs out. Worst case about 30 + 60 = 90 s.
//
// Layout check (card boxes, centre ± w/2, h 64): sydney 35-195 x 108-172, paris 35-195 x 308-372,
// geodns 285-475 x 168-232, health 285-475 x 308-372, sg 625-815 x 108-172, fra 625-815 x 308-372.
// Column gaps: 90 and 150. Row gaps in the DNS column: 76. Sydney's HTTPS line at y 140 clears geodns (top 168).
// Paris's HTTPS route runs under everything at y 410; the failover route runs over everything at y 82 and down
// the right edge at x 860 (zone tabs end near y 50).
const spec: DiagramSpec = {
  title: "GeoDNS: the nearest region, with failover",
  width: 900,
  height: 470,
  steps: [
    { title: "Answer by the asker's location" },
    { title: "Health checks watch each region" },
    { title: "Fail over when a region goes down" },
  ],
  zones: [
    { id: "readers", title: "Readers", tone: "neutral", x: 20, y: 40, w: 190, h: 400 },
    { id: "dns", title: "DNS provider", tone: "green", x: 250, y: 40, w: 260, h: 400 },
    { id: "regions", title: "Your regions", tone: "teal", x: 560, y: 40, w: 320, h: 400 },
  ],
  nodes: [
    {
      id: "sydney",
      label: "Sydney reader",
      sub: "resolver in Australia",
      icon: "phone",
      x: 115,
      y: 140,
      w: 160,
      h: 64,
    },
    { id: "paris", label: "Paris reader", sub: "resolver in France", icon: "phone", x: 115, y: 340, w: 160, h: 64 },
    {
      id: "geodns",
      label: "GeoDNS",
      sub: "answers by location",
      icon: "dns",
      tone: "green",
      accent: true,
      x: 380,
      y: 200,
      w: 190,
      h: 64,
    },
    {
      id: "health",
      label: "Health checker",
      sub: "probes every 10 s",
      icon: "presence",
      tone: "green",
      step: 2,
      x: 380,
      y: 340,
      w: 190,
      h: 64,
    },
    {
      id: "sg",
      label: "Singapore region",
      sub: "LB at 203.0.113.50",
      icon: "load-balancer",
      tone: "teal",
      x: 720,
      y: 140,
      w: 190,
      h: 64,
    },
    {
      id: "fra",
      label: "Frankfurt region",
      sub: "LB at 198.51.100.20",
      icon: "load-balancer",
      tone: "teal",
      x: 720,
      y: 340,
      w: 190,
      h: 64,
    },
  ],
  edges: [
    // Step 1: each reader looks up the same name and gets a different answer.
    {
      from: "sydney",
      to: "geodns",
      label: "lookup",
      tone: "blue",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0,
    },
    { from: "sydney", to: "sg", label: "HTTPS", tone: "green", flow: true, packet: true, delay: 0.8, until: 2 },
    {
      from: "paris",
      to: "geodns",
      label: "lookup",
      tone: "blue",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 1.2,
    },
    {
      from: "paris",
      to: "fra",
      label: "HTTPS",
      tone: "green",
      flow: true,
      packet: true,
      delay: 2.0,
      via: [
        [115, 410],
        [720, 410],
      ],
    },

    // Step 2: probes and the status they feed back.
    { from: "health", to: "sg", label: "probe", tone: "teal", dashed: true, flow: true, step: 2, until: 2 },
    { from: "health", to: "fra", label: "probe", tone: "teal", dashed: true, flow: true, step: 2 },
    { from: "health", to: "geodns", label: "status", tone: "green", dashed: true, flow: true, step: 2 },

    // Step 3: Singapore stops answering; Sydney is sent to Frankfurt after its cached answer expires.
    { from: "health", to: "sg", label: "probes fail", tone: "red", dashed: true, flow: true, step: 3 },
    {
      from: "sydney",
      to: "fra",
      label: "after TTL expires",
      tone: "orange",
      flow: true,
      packet: true,
      step: 3,
      delay: 0.8,
      labelAt: 0.4,
      via: [
        [115, 82],
        [860, 82],
        [860, 340],
      ],
    },
  ],
};

export default spec;
