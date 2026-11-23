import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// Why one region is a single point of failure (multi-region-and-failover, first figure).
// Two steps: 1 Brightpost runs in London only: shoppers reach a load balancer, 40 app servers and an orders database
// with a standby in a second zone of the same region; the standby survives a lost zone · 2 the whole region goes
// down (power, network or the provider's control plane): the standby goes with it, every request fails, and orders
// at the sale peak of 300/s have nowhere to land.
// Working: no arithmetic beyond the preset constants (40 app servers, 300 orders/s sale peak).
// Layout (880 × 400): shoppers at x 80, a London region zone from x 200 to 865 holding the load balancer (x 350),
// the app servers (x 555) and the database pair in a column at x 775; the outage node under the app servers.
// Colours (PATTERN_TONE): shoppers orange (traffic), the load balancer neutral (plumbing), app servers teal
// (compute), the database and its standby violet (stores); red only for the outage and the failing requests.

const spec: DiagramSpec = {
  title: "One region, one outage, everything down",
  width: 880,
  height: 400,
  steps: [{ title: "One region serves every shopper" }, { title: "The whole region goes down" }],
  zones: [
    {
      id: "london",
      title: `${SHOP.homeRegion} region (two zones)`,
      tone: PATTERN_TONE.infra,
      kind: "region",
      x: 200,
      y: 30,
      w: 665,
      h: 350,
    },
  ],
  nodes: [
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "UK and EU",
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 80,
      y: 180,
      w: 140,
    },
    {
      id: "lb",
      label: "Load balancer",
      icon: "load-balancer",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      x: 350,
      y: 180,
      w: 160,
    },
    {
      id: "apps",
      label: `${SHOP.appServers} app servers`,
      sub: "zones A and B",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 555,
      y: 180,
      w: 170,
    },
    {
      id: "db",
      label: "Orders DB",
      sub: "primary, zone A",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 775,
      y: 100,
      w: 170,
    },
    {
      id: "standby",
      label: "Standby DB",
      sub: "zone B",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 775,
      y: 260,
      w: 170,
    },
    {
      id: "outage",
      label: "Region outage",
      sub: "both zones down",
      icon: "signal",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step: 2,
      x: 555,
      y: 330,
      w: 190,
    },
  ],
  edges: [
    { from: "shoppers", to: "lb", label: "orders", packet: true, until: 1 },
    { from: "lb", to: "apps", packet: true },
    { from: "apps", to: "db", label: "write", packet: true },
    { from: "db", to: "standby", label: "sync copy" },

    {
      from: "shoppers",
      to: "lb",
      label: `${SHOP.peakOrdersPerSecond} orders/s fail`,
      tone: PATTERN_TONE.fail,
      dashed: true,
      step: 2,
    },
    { from: "outage", to: "apps", tone: PATTERN_TONE.fail, dashed: true, step: 2 },
    { from: "outage", to: "standby", tone: PATTERN_TONE.fail, dashed: true, step: 2 },
  ],
};

export default spec;
