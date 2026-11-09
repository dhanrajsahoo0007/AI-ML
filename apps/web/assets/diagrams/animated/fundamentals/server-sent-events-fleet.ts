import type { DiagramSpec } from "@/components/diagrams/types";

// The club's live match page on match day: 50,000 fans, each holding one open SSE response.
//
// Step 1: every fan's browser opens GET /live through the edge proxy (buffering off, long idle timeout) to one
// of four live servers, about 12,500 open streams each.
// Step 2: the commentator posts an event. Pub/sub hands it to every live server, and each server writes it to
// all of its open streams, back through the proxy to the fans. The request edges of step 1 are replaced by the
// push edges (until: 1).
// Step 3: pub/sub also appends every event to an event log with its id. When a fan reconnects with
// Last-Event-ID, the live server reads the log after that id and replays what the fan missed.
//
// Layout check (card boxes, centre +/- w/2, +/- h/2, all 140 x 64):
// fans 40-180 x 118-182, proxy 260-400 x 118-182, live 490-630 x 118-182, pubsub 740-880 x 118-182,
// log 490-630 x 258-322, commentator 740-880 x 258-322. Gaps: 80, 90, 110 across; 76 down.
// Zones: clients 20-200, edge 240-420, app 470-650 (y 40-220), storage 470-650 (y 240-350), feed 700-920.
// The pubsub -> log edge runs from (810,150) to (560,290): at x = 630 it is at y = 251, below live (182), and at
// x = 740 it is at y = 189, above the commentator (258).
const spec: DiagramSpec = {
  title: "SSE fleet for a live match page",
  width: 940,
  height: 370,
  steps: [
    { title: "Each fan holds one open response" },
    { title: "A new event fans out to every stream" },
    { title: "Reconnects replay from the event log" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 180, h: 310 },
    { id: "edge", title: "Edge", tone: "blue", x: 240, y: 40, w: 180, h: 310 },
    { id: "app", title: "Live servers", tone: "green", x: 470, y: 40, w: 180, h: 180 },
    { id: "storage", title: "Storage", tone: "violet", x: 470, y: 240, w: 180, h: 110 },
    { id: "feed", title: "Match feed", tone: "orange", x: 700, y: 40, w: 220, h: 310 },
  ],
  nodes: [
    { id: "fans", label: "Fans' browsers", sub: "50,000 EventSource", icon: "browser", x: 110, y: 150, w: 140, h: 64 },
    {
      id: "proxy",
      label: "Edge proxy",
      sub: "buffering off",
      icon: "load-balancer",
      tone: "blue",
      x: 330,
      y: 150,
      w: 140,
      h: 64,
    },
    {
      id: "live",
      label: "Live servers",
      sub: "4 x 12,500 streams",
      icon: "server",
      tone: "green",
      accent: true,
      x: 560,
      y: 150,
      w: 140,
      h: 64,
    },
    {
      id: "pubsub",
      label: "Pub/sub",
      sub: "topic match-7",
      icon: "queue",
      tone: "orange",
      x: 810,
      y: 150,
      w: 140,
      h: 64,
      step: 2,
    },
    {
      id: "commentator",
      label: "Commentator",
      sub: "posts each event",
      icon: "phone",
      tone: "orange",
      x: 810,
      y: 290,
      w: 140,
      h: 64,
      step: 2,
    },
    {
      id: "log",
      label: "Event log",
      sub: "last 10 min, by id",
      icon: "log",
      tone: "violet",
      x: 560,
      y: 290,
      w: 140,
      h: 64,
      step: 3,
    },
  ],
  edges: [
    // Step 1: the requests that open the streams.
    { from: "fans", to: "proxy", label: "GET /live", flow: true, packet: true, until: 1 },
    { from: "proxy", to: "live", label: "held open", flow: true, packet: true, delay: 0.6, until: 1 },

    // Step 2: an event travels from the commentator to every open stream.
    { from: "commentator", to: "pubsub", label: "publish", packet: true, step: 2 },
    { from: "pubsub", to: "live", label: "fan out", flow: true, packet: true, delay: 0.6, step: 2 },
    { from: "live", to: "proxy", label: "event", flow: true, packet: true, delay: 1.2, step: 2 },
    { from: "proxy", to: "fans", label: "event", flow: true, packet: true, delay: 1.8, step: 2 },

    // Step 3: the log that makes resume possible.
    { from: "pubsub", to: "log", label: "append", dashed: true, step: 3 },
    { from: "live", to: "log", label: "read after id", dashed: true, step: 3 },
  ],
};

export default spec;
