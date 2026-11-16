import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A materialized view for the "My orders" page, built one part at a time (materialized-views, the Architecture figure).
// Five steps: 1 the page joins three services at read time: 8 order-shard queries plus 20 item and 20 shipment
// lookups for one customer's last 20 orders (the "before") · 2 each service publishes its changes to a stream ·
// 3 a projector folds the changes into a my_orders view keyed by customer id · 4 the page reads one row set by key ·
// 5 a v2 view is rebuilt by replaying the stream from the start, then reads swap to it.
// Working: 8 + 20 + 20 = 48 queries per page view before; 1 after.
// Layout (880 × 470): page at x 90; services in a column at x 330; stream at x 560; projector (accent) at x 760 with
// the view above it and the v2 view below. The page's view lookup is routed along the top.
// Colours (PATTERN_TONE): page orange (traffic), services teal (compute), stream neutral (infra), projector green (the
// pattern), views violet (stores).

const spec: DiagramSpec = {
  title: "A view for the My orders page",
  width: 880,
  height: 470,
  steps: [
    { title: "Join three services at read time" },
    { title: "Services publish their changes" },
    { title: "A projector keeps a view by customer" },
    { title: "The page reads one key" },
    { title: "Rebuild a v2 view, then swap" },
  ],
  zones: [],
  nodes: [
    {
      id: "page",
      label: "My orders page",
      sub: "customer 1847",
      icon: "browser",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 95,
      y: 240,
      w: 170,
    },
    {
      id: "orders",
      label: "Orders",
      sub: "8 shards",
      icon: "database",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 335,
      y: 100,
      w: 150,
    },
    {
      id: "items",
      label: "Items",
      icon: "database",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 335,
      y: 240,
      w: 150,
    },
    {
      id: "ships",
      label: "Shipments",
      icon: "map",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 335,
      y: 380,
      w: 150,
    },

    {
      id: "stream",
      label: "Change stream",
      icon: "topic",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 2,
      x: 565,
      y: 240,
      w: 170,
    },

    {
      id: "proj",
      label: "Projector",
      sub: "changes to rows",
      icon: "pipeline",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: 775,
      y: 240,
      w: 170,
    },
    {
      id: "view",
      label: "my_orders view",
      sub: "key: customer id",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 775,
      y: 100,
      w: 170,
    },

    {
      id: "v2",
      label: "my_orders v2",
      sub: "rebuilt from start",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 5,
      x: 775,
      y: 380,
      w: 170,
    },
  ],
  edges: [
    { from: "page", to: "orders", label: "8 queries", packet: true, until: 3 },
    { from: "page", to: "items", label: "20", packet: true, delay: 0.3, until: 3 },
    { from: "page", to: "ships", label: "20", packet: true, delay: 0.6, until: 3 },

    { from: "orders", to: "stream", packet: true, step: 2 },
    { from: "items", to: "stream", label: "changes", packet: true, delay: 0.3, step: 2 },
    { from: "ships", to: "stream", packet: true, delay: 0.6, step: 2 },

    { from: "stream", to: "proj", packet: true, delay: 1, step: 3 },
    { from: "proj", to: "view", label: "upsert", packet: true, delay: 1.3, step: 3 },

    {
      from: "page",
      to: "view",
      label: "1 lookup",
      packet: true,
      step: 4,
      via: [
        [95, 40],
        [775, 40],
      ],
    },

    { from: "proj", to: "v2", label: "replay, then swap", dashed: true, step: 5 },
  ],
};

export default spec;
