import type { DiagramSpec } from "@/components/diagrams/types";
import { FLASH_SALE, ORDER, PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// How a message finds one socket among many gateways (realtime-gateways-and-presence, the Architecture figure).
// Four steps: 1 no route: the order service has an update for shopper A, whose socket is on gateway 2, and hands it
// to gateway 1, which has no socket for A · 2 a session registry: gateway 2 writes "A = gw 2" with a TTL when the
// socket opens; the order service looks A up and pushes to gateway 2 · 3 the pub/sub alternative: gateway 2
// subscribes to channel user:A and the order service publishes once; the broker delivers to the subscriber · 4 gateway
// 2 dies: it stops refreshing, so A's entry expires; A reconnects through the balancer to gateway 1, which writes
// "A = gw 1".
// Working: 500,000 sockets at 12:00 (FLASH_SALE.shoppers) ÷ 50,000 per gateway (fundamentals/websockets) = 10
// gateways; run 12 for headroom, so each holds 500,000 ÷ 12 ≈ 41,667 (shown as "gateway 1 of 12").
// Layout (880 × 470): shopper x 75, balancer x 245, gateways in a column at x 455 (y 80, 235, 390), the registry,
// order service and broker in a column at x 745 at the same heights, so every edge is horizontal, vertical or one
// clean diagonal.
// Colours (PATTERN_TONE): the shopper orange (traffic), gateways and the order service teal (compute), the registry
// green (the pattern's own part, the accent), balancer and broker neutral (plumbing); the misrouted push and the
// expired entry red.

const GW_CAP = 50_000;
const gateways = Math.ceil(FLASH_SALE.shoppers / GW_CAP) + 2; // 12

const gw = (id: string, label: string, sub: string, y: number) => ({
  id,
  label,
  sub,
  icon: "gateway",
  tone: PATTERN_TONE.compute,
  fill: "pastel" as const,
  x: 455,
  y,
  w: 160,
});

const spec: DiagramSpec = {
  title: "Routing a message to one socket among many gateways",
  width: 880,
  height: 470,
  steps: [
    { title: "No route: the wrong gateway" },
    { title: "A session registry" },
    { title: "Or a pub/sub channel per user" },
    { title: "A gateway dies, its entries expire" },
  ],
  zones: [],
  nodes: [
    {
      id: "shopper",
      label: "Shopper A",
      sub: `order ${ORDER.orderId}`,
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 75,
      y: 235,
      w: 130,
    },
    {
      id: "lb",
      label: "Balancer",
      sub: "layer 4",
      icon: "load-balancer",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      x: 245,
      y: 235,
      w: 130,
    },
    gw("gw1", "Gateway 1", `1 of ${gateways}`, 80),
    gw("gw2", "Gateway 2", "holds A’s socket", 235),
    gw("gw3", "Gateway 3", `${n(Math.round(FLASH_SALE.shoppers / gateways))} sockets`, 390),
    {
      id: "orders",
      label: "Order service",
      sub: "4471 shipped",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 745,
      y: 235,
      w: 170,
    },
    {
      id: "registry",
      label: "Session registry",
      sub: "user → gateway, TTL",
      icon: "registry",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 745,
      y: 80,
      w: 190,
    },
    {
      id: "broker",
      label: "Pub/sub broker",
      sub: "channel per user",
      icon: "topic",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 3,
      x: 745,
      y: 390,
      w: 180,
    },
  ],
  edges: [
    { from: "shopper", to: "lb" },
    { from: "lb", to: "gw2", bidirectional: true, until: 3 },
    { from: "orders", to: "gw1", label: "no socket for A", tone: PATTERN_TONE.fail, packet: true, until: 1 },

    { from: "gw2", to: "registry", label: "SET A = gw 2", step: 2, until: 2 },
    { from: "orders", to: "registry", label: "GET A", bidirectional: true, step: 2, until: 2 },
    { from: "orders", to: "gw2", label: "push", packet: true, step: 2, until: 2 },

    { from: "orders", to: "broker", label: "PUBLISH user:A", packet: true, step: 3, until: 3 },
    { from: "broker", to: "gw2", label: "to subscriber", packet: true, delay: 0.4, step: 3, until: 3 },

    { from: "gw2", to: "registry", label: "gw 2 dead: expires", tone: PATTERN_TONE.fail, dashed: true, step: 4 },
    { from: "lb", to: "gw1", label: "reconnect", packet: true, step: 4 },
    { from: "gw1", to: "registry", label: "SET A = gw 1", step: 4 },
  ],
};

export default spec;
