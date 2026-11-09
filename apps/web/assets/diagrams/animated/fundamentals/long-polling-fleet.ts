import type { DiagramSpec } from "@/components/diagrams/types";

// The help chat's long-poll fleet at peak: 30,000 open chat widgets, each holding one request, spread over three
// poll servers that hold about 10,000 each.
//
// Step 1: the cost of waiting. Every widget keeps one GET open through the load balancer (which cuts connections
// idle for 60 s) to a poll server (which answers after at most 30 s). The servers do almost no work; what they
// spend is memory, sockets and file descriptors for 30,000 open requests.
// Step 2: getting the event to the right server. The chat service saves the agent's reply in the message store and
// publishes it on the chat's topic. Pub/sub delivers it to whichever poll server subscribed for that chat (server 2
// here), which answers the held request. A client that reconnects to any server catches up by reading the store
// after its cursor (the dashed route under the zones).
//
// Layout (centres): client (100,210), lb (285,210), poll1/2/3 (490, 115/210/305), bus (690,115), chat (690,305),
// store (875,305). Zones: clients 20-180, edge 200-370, poll servers 390-590, async 610-770 (top), services
// 610-770 (bottom), storage 800-950.
const spec: DiagramSpec = {
  title: "A long-poll fleet holding 30,000 requests",
  width: 960,
  height: 430,
  steps: [
    { title: "Every open chat holds one request" },
    { title: "Pub/sub carries each message to the server holding the request" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 160, h: 340 },
    { id: "edge", title: "Edge", tone: "blue", x: 200, y: 40, w: 170, h: 340 },
    { id: "pollers", title: "Poll servers", tone: "green", x: 390, y: 40, w: 200, h: 340 },
    { id: "async", title: "Async", tone: "orange", x: 610, y: 40, w: 160, h: 150 },
    { id: "services", title: "Services", tone: "teal", x: 610, y: 230, w: 160, h: 150 },
    { id: "storage", title: "Storage", tone: "violet", x: 800, y: 230, w: 150, h: 150 },
  ],
  nodes: [
    { id: "client", label: "Chat widgets", sub: "30k open", icon: "browser", x: 100, y: 210, w: 130 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "idle cut 60 s",
      icon: "load-balancer",
      tone: "blue",
      x: 285,
      y: 210,
      w: 136,
    },
    {
      id: "poll1",
      label: "Poll server 1",
      sub: "10k held GETs",
      icon: "server",
      tone: "green",
      x: 490,
      y: 115,
      w: 150,
    },
    {
      id: "poll2",
      label: "Poll server 2",
      sub: "10k held GETs",
      icon: "server",
      tone: "green",
      accent: true,
      x: 490,
      y: 210,
      w: 150,
    },
    {
      id: "poll3",
      label: "Poll server 3",
      sub: "10k held GETs",
      icon: "server",
      tone: "green",
      x: 490,
      y: 305,
      w: 150,
    },
    {
      id: "bus",
      label: "Pub/sub",
      sub: "topic per chat",
      icon: "queue",
      tone: "orange",
      x: 690,
      y: 115,
      w: 136,
      step: 2,
    },
    {
      id: "chat",
      label: "Chat service",
      sub: "agent replies",
      icon: "chat",
      tone: "teal",
      x: 690,
      y: 305,
      w: 136,
      step: 2,
    },
    {
      id: "store",
      label: "Message store",
      sub: "seq per chat",
      icon: "database",
      tone: "violet",
      x: 875,
      y: 305,
      w: 130,
      step: 2,
    },
  ],
  edges: [
    // Step 1: one held request per widget.
    { from: "client", to: "lb", label: "held GET", flow: true, packet: true },
    { from: "lb", to: "poll2", label: "hold 30 s", flow: true, packet: true, delay: 0.6 },
    { from: "lb", to: "poll1", dashed: true },
    { from: "lb", to: "poll3", dashed: true },

    // Step 2: save, publish, deliver to the subscribed server.
    { from: "chat", to: "store", label: "save", flow: true, packet: true },
    { from: "chat", to: "bus", label: "publish", flow: true, packet: true, delay: 0.8 },
    { from: "bus", to: "poll2", label: "msg 18", flow: true, packet: true, delay: 1.6 },
    { from: "bus", to: "poll1", dashed: true },
    { from: "bus", to: "poll3", dashed: true, via: [[600, 305]] },
    {
      from: "poll3",
      to: "store",
      label: "read after cursor",
      dashed: true,
      via: [
        [490, 405],
        [875, 405],
      ],
    },
  ],
};

export default spec;
