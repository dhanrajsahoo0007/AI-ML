import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Load balancing, one layer at a time (load-balancing, the Architecture figure). Brightpost's shoppers reach the
// product service; each step adds one layer of balancing.
//
// Five steps: 1 one app server takes every request (the "before") · 2 an L7 balancer spreads requests over 40 app
// servers · 3 health checks take a failing server out of rotation · 4 an L4 balancer in front spreads TCP connections
// over several L7 balancers · 5 global DNS sends each shopper to a region and fails over to Frankfurt. Nodes never move;
// the direct edges of earlier steps end with `until`.
//
// Layout (880 × 470): shoppers at x 80; global DNS above the L4 balancer (x 270); the L7 balancer (accent) at x 470;
// app servers in a column at x 750; health checks under the L7 balancer; Frankfurt bottom left.
// Colours (PATTERN_TONE): shoppers orange (traffic), app servers teal (compute), the L7 balancer green (the pattern),
// health checks lime (a check), L4 balancer, DNS and the second region neutral (infra).
// Fact check (2026-11-16): AWS ALB balances at layer 7 with round robin by default and least outstanding requests
// as an option; NLB balances TCP at layer 4; Google's SRE book describes DNS for global balancing in front of
// datacenter balancers.

const spec: DiagramSpec = {
  title: "Load balancing, one layer at a time",
  width: 880,
  height: 470,
  steps: [
    { title: "One server takes every request" },
    { title: "A balancer spreads requests over 40 servers" },
    { title: "Health checks take a bad server out" },
    { title: "An L4 balancer in front of several L7 balancers" },
    { title: "Global DNS picks a region and fails over" },
  ],
  zones: [
    { id: "fleet", title: `${SHOP.appServers} app servers`, tone: PATTERN_TONE.compute, x: 655, y: 40, w: 190, h: 400 },
  ],
  nodes: [
    {
      id: "shoppers",
      label: "Shoppers",
      sub: `${n(SHOP.peakReadsPerSecond)} reads/s`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 80,
      y: 235,
      w: 140,
    },
    {
      id: "app1",
      label: "App server 1",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 750,
      y: 110,
      w: 160,
    },

    {
      id: "lb",
      label: "L7 balancer",
      sub: "HTTP, per request",
      icon: "load-balancer",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 470,
      y: 235,
      w: 170,
    },
    {
      id: "app2",
      label: "App server 2",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: 750,
      y: 235,
      w: 160,
    },
    {
      id: "app40",
      label: "App server 40",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: 750,
      y: 360,
      w: 160,
    },

    {
      id: "health",
      label: "Health checks",
      sub: "GET /healthz",
      icon: "shield",
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step: 3,
      x: 470,
      y: 400,
      w: 170,
    },

    {
      id: "l4",
      label: "L4 balancer",
      sub: "TCP, per connection",
      icon: "load-balancer",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 4,
      x: 275,
      y: 235,
      w: 160,
    },

    {
      id: "dns",
      label: "Global DNS",
      sub: `${SHOP.homeRegion} first`,
      icon: "dns",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 5,
      x: 275,
      y: 90,
      w: 160,
    },
    {
      id: "fra",
      label: SHOP.secondRegion,
      sub: "failover region",
      icon: "globe",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 5,
      x: 275,
      y: 400,
      w: 160,
    },
  ],
  edges: [
    { from: "shoppers", to: "app1", label: "every request", packet: true, until: 1 },

    { from: "shoppers", to: "lb", packet: true, step: 2, until: 3 },
    { from: "lb", to: "app1", packet: true, delay: 0.5, step: 2 },
    { from: "lb", to: "app2", label: "1 of 40", packet: true, delay: 0.7, step: 2 },
    { from: "lb", to: "app40", packet: true, delay: 0.9, step: 2 },

    { from: "lb", to: "health", label: "in or out", bidirectional: true, step: 3 },
    { from: "health", to: "app40", label: "probe", dashed: true, step: 3 },

    { from: "shoppers", to: "l4", packet: true, step: 4 },
    { from: "l4", to: "lb", packet: true, delay: 0.3, step: 4 },

    { from: "shoppers", to: "dns", label: "lookup", dashed: true, step: 5 },
    {
      from: "dns",
      to: "fra",
      dashed: true,
      step: 5,
      via: [
        [178, 90],
        [178, 400],
      ],
    },
  ],
};

export default spec;
