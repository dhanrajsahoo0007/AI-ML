import type { SequenceSpec } from "@/components/diagrams/types";

// One timeline, four clients. Four browsers watch the same auction item on one app server, each with a different
// method. At t = 3 s a new bid of $120 lands on the server. Rows run in time order, so the full view shows who
// hears about the bid first and what each method costs while nothing happens.
//
// Step 1: short polling every 5 s. The t = 0 poll gets the old price; the bid lands at t = 3 s; the page only
// sees it at its t = 5 s poll, 2 s late.
// Step 2: long polling. The request sent at t = 0 is held open; the server answers it the moment the bid lands,
// and the client sends the next held request straight away.
// Step 3: server-sent events. One GET opens a stream at t = 0; the bid arrives as one small event at t = 3 s.
// Step 4: WebSocket. An HTTP Upgrade turns into a two-way connection; the server pushes the bid as a frame, and
// the client sends its own bid back on the same connection at t = 4 s.
//
// Lane x at width 820: polling 98, long polling 254, server 410, SSE 566, WebSocket 722 (156 apart).
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Four ways to hear about the same bid",
  width: 820,
  steps: [
    { title: "Short polling: ask every 5 s" },
    { title: "Long polling: the server holds the request" },
    { title: "Server-sent events: one open stream" },
    { title: "WebSocket: one two-way connection" },
  ],
  lanes: [
    { id: "poll", label: "Short polling", icon: "browser", tone: "neutral" },
    { id: "longpoll", label: "Long polling", icon: "browser", tone: "blue" },
    { id: "server", label: "App server", icon: "server", tone: "teal" },
    { id: "sse", label: "SSE stream", icon: "browser", tone: "green" },
    { id: "ws", label: "WebSocket", icon: "browser", tone: "orange" },
  ],
  messages: [
    // t = 0: every client starts.
    { from: "poll", to: "server", label: "t=0 s: GET /bid", step: 1 },
    { from: "server", to: "poll", label: "200 $110", kind: "return", step: 1 },
    { from: "longpoll", to: "server", label: "t=0 s: GET, held", step: 2 },
    { from: "sse", to: "server", label: "t=0 s: open stream", step: 3 },
    { from: "ws", to: "server", label: "t=0 s: GET, Upgrade", step: 4 },
    { from: "server", to: "ws", label: "101 Switching Protocols", kind: "return", step: 4 },

    // t = 3 s: the bid lands (note at 5.5). Each open channel delivers it at once.
    { from: "server", to: "longpoll", label: "200 $120", kind: "return", step: 2, delay: 0.6 },
    { from: "server", to: "sse", label: "data: $120", kind: "async", step: 3, delay: 0.6 },
    { from: "server", to: "ws", label: "frame: $120", kind: "async", step: 4, delay: 0.6 },
    { from: "longpoll", to: "server", label: "t=3 s: GET, held", step: 2 },
    { from: "ws", to: "server", label: "t=4 s: frame, my bid $125", step: 4 },

    // t = 5 s: the polling client finally asks again.
    { from: "poll", to: "server", label: "t=5 s: GET /bid", step: 1, delay: 0.6 },
    { from: "server", to: "poll", label: "200 $120, 2 s late", kind: "return", step: 1 },
  ],
  notes: [{ lane: "server", text: "t=3 s: new bid $120", step: 1, at: 5.5 }],
};

export default spec;
