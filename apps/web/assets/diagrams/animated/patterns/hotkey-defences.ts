import type { DiagramSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// Three defences against one hot key, added one at a time (hot-keys-and-coalescing, the Architecture figure).
// Four steps: 1 all 40 app servers read the kettle's key from one cache node: 690 reads/s on one node (the "before")
// · 2 an in-process cache with a 1 s TTL on each server: at most 40 reads/s leave the fleet · 3 salted copies
// kettle#1 to kettle#4 on four cache nodes: about 10 reads/s each · 4 the stock count is a write-hot key: each server
// buffers decrements and flushes once a second.
// Working: 40 servers × 1 refresh per second = 40 reads/s; 40 ÷ 4 copies = 10 per node. Sale-day peak 300 orders/s,
// all kettles: 300 decrements a second become 40 flushes a second (one per server), each carrying about 7.5.
// Layout (880 × 470): app servers at x 150 with the local cache above and the counter buffer below; cache nodes in a
// column at x 720; the stock row at x 500 under the fleet's edges.
// Colours (PATTERN_TONE): app servers teal (compute), cache nodes and the stock row violet (stores), the local cache
// and the counter buffer green (the pattern).

const flushesPerSecond = SHOP.appServers; // one flush per server per second
const perFlush = SHOP.peakOrdersPerSecond / SHOP.appServers; // 7.5

const spec: DiagramSpec = {
  title: "Defending one hot key",
  width: 880,
  height: 470,
  steps: [
    { title: "Every server reads one cache node" },
    { title: "An in-process cache with a 1 s TTL" },
    { title: "Salted copies on four cache nodes" },
    { title: "Buffer writes to a hot counter" },
  ],
  zones: [{ id: "cache", title: "Shared cache", tone: PATTERN_TONE.store, x: 630, y: 30, w: 180, h: 420 }],
  nodes: [
    {
      id: "apps",
      label: `${SHOP.appServers} app servers`,
      sub: `${FLASH_SALE.hotKeyReadsPerSecond} kettle reads/s`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 150,
      y: 235,
      w: 190,
    },
    {
      id: "c1",
      label: "Cache node 1",
      sub: "kettle, kettle#1",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 720,
      y: 90,
      w: 160,
    },
    {
      id: "c2",
      label: "Cache node 2",
      sub: "kettle#2",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 720,
      y: 190,
      w: 160,
    },
    {
      id: "c3",
      label: "Cache node 3",
      sub: "kettle#3",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 720,
      y: 290,
      w: 160,
    },
    {
      id: "c4",
      label: "Cache node 4",
      sub: "kettle#4",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 720,
      y: 390,
      w: 160,
    },

    {
      id: "local",
      label: "In-process cache",
      sub: "1 s TTL per server",
      icon: "cache",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 150,
      y: 85,
      w: 190,
    },

    {
      id: "buffer",
      label: "Counter buffer",
      sub: "flush every 1 s",
      icon: "meter",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 4,
      x: 150,
      y: 390,
      w: 190,
    },
    {
      id: "stock",
      label: "Stock row",
      sub: "kettle: 10,000",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 4,
      x: 500,
      y: 390,
      w: 170,
    },
  ],
  edges: [
    { from: "apps", to: "c1", label: `${FLASH_SALE.hotKeyReadsPerSecond} reads/s`, packet: true, until: 1 },

    { from: "apps", to: "local", label: "hit", bidirectional: true, step: 2 },
    { from: "apps", to: "c1", label: `≤ ${SHOP.appServers} reads/s`, packet: true, step: 2, until: 2 },

    { from: "apps", to: "c1", packet: true, step: 3 },
    { from: "apps", to: "c2", label: "≤ 10 reads/s each", packet: true, delay: 0.2, step: 3 },
    { from: "apps", to: "c3", packet: true, delay: 0.4, step: 3 },
    { from: "apps", to: "c4", packet: true, delay: 0.6, step: 3 },

    { from: "apps", to: "buffer", label: "−1 per order", step: 4 },
    { from: "buffer", to: "stock", label: `${flushesPerSecond} flushes/s of −${perFlush}`, packet: true, step: 4 },
  ],
};

export default spec;
