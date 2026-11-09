import type { DiagramSpec } from "@/components/diagrams/types";

// The same nine hops as fundamentals/anatomy-of-a-request, drawn as a map instead of a timeline. Main row at
// y = 260: browser -> load balancer -> app server -> database. The DNS resolver and the cache sit one row up
// (y = 130) and are reached with an elbow. The answer returns along the bottom (y = 340), so the slow internet
// leg shows twice: once going out, once coming back.
//
// Layout check (cards 64 tall):
//   zones  device 8-148, edge 168-454, data center 474-684, storage 704-944 (canvas 960 x 400)
//   nodes  browser 20-132, dns and lb 300-440, app 494-664, cache and db 759-909
//   gaps   browser to lb 168, lb to app 54, app to db 95; dns to lb 66 vertically (98-162 vs 228-292)
//   labels "TCP, TLS, GET · 100 ms" is 22 chars, about 136 px, inside the 168 px gap;
//          "query · 8 ms" is about 74 px inside the 95 px gap.
// Costs add up to 20 + 100 + 1 + 1 + 8 + 10 + 20 = 160 ms.
const spec: DiagramSpec = {
  title: "A request's journey: the hops as a map",
  width: 960,
  height: 400,
  zones: [
    { id: "device", title: "Your device", tone: "neutral", x: 8, y: 60, w: 140, h: 310 },
    { id: "edge", title: "Internet edge", tone: "blue", x: 168, y: 60, w: 286, h: 310 },
    { id: "datacenter", title: "Data center", tone: "green", x: 474, y: 60, w: 210, h: 310 },
    { id: "storage", title: "Storage", tone: "violet", x: 704, y: 60, w: 240, h: 310 },
  ],
  nodes: [
    {
      id: "browser",
      label: "Browser",
      sub: "in Lisbon",
      icon: "browser",
      tone: "neutral",
      x: 76,
      y: 260,
      w: 112,
      h: 64,
    },
    {
      id: "dns",
      label: "DNS resolver",
      sub: "name to address",
      icon: "dns",
      tone: "blue",
      x: 370,
      y: 130,
      w: 140,
      h: 64,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "ends TCP and TLS",
      icon: "load-balancer",
      tone: "blue",
      x: 370,
      y: 260,
      w: 140,
      h: 64,
    },
    {
      id: "app",
      label: "App server",
      sub: "builds JSON · 10 ms",
      icon: "server",
      tone: "green",
      accent: true,
      x: 579,
      y: 260,
      w: 170,
      h: 64,
    },
    { id: "cache", label: "Cache", sub: "in memory", icon: "cache", tone: "orange", x: 834, y: 130, w: 150, h: 64 },
    {
      id: "db",
      label: "Database",
      sub: "orders table",
      icon: "database",
      tone: "violet",
      x: 834,
      y: 260,
      w: 150,
      h: 64,
    },
  ],
  edges: [
    {
      from: "browser",
      to: "dns",
      label: "DNS · 20 ms",
      tone: "blue",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0,
      via: [[76, 130]],
      labelAt: 0.7,
    },
    { from: "browser", to: "lb", label: "TCP, TLS, GET · 100 ms", tone: "blue", flow: true, packet: true, delay: 0.8 },
    { from: "lb", to: "app", label: "1 ms", tone: "green", flow: true, packet: true, bidirectional: true, delay: 1.6 },
    {
      from: "app",
      to: "cache",
      label: "lookup · 1 ms",
      tone: "orange",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 2.0,
      via: [[579, 130]],
      labelAt: 0.68,
    },
    {
      from: "app",
      to: "db",
      label: "query · 8 ms",
      tone: "violet",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 2.4,
    },
    {
      from: "lb",
      to: "browser",
      label: "answer · 20 ms",
      tone: "green",
      flow: true,
      packet: true,
      delay: 3.2,
      via: [
        [370, 340],
        [76, 340],
      ],
    },
  ],
};

export default spec;
