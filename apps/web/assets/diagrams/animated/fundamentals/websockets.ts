import type { SequenceSpec } from "@/components/diagrams/types";

// One student's WebSocket in the classroom quiz app, from the first request to a dead phone.
//
// Step 1: the upgrade handshake. The page sends an ordinary HTTP GET with Upgrade: websocket and a random
// Sec-WebSocket-Key. The load balancer forwards it; the gateway answers 101 Switching Protocols with
// Sec-WebSocket-Accept (a hash of the key), and the same TCP connection now carries WebSocket frames.
// Step 2: frames in both directions. The quiz service pushes "question 3"; the gateway writes it as a small text
// frame. The student answers with a masked frame on the same connection; the gateway forwards it. The load
// balancer only pipes bytes now.
// Step 3: heartbeats. The gateway pings every 30 s and the page answers pong. When the phone loses signal the next
// ping gets no answer; after about 60 s without a pong the gateway closes the socket and tells the quiz service.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A WebSocket: upgrade, frames both ways, heartbeats",
  width: 780,
  steps: [
    { title: "Upgrade an HTTP request to a WebSocket" },
    { title: "Frames flow both ways on one connection" },
    { title: "Heartbeats find dead connections" },
  ],
  lanes: [
    { id: "page", label: "Student page", icon: "browser", tone: "neutral" },
    { id: "lb", label: "Load balancer", icon: "load-balancer", tone: "blue" },
    { id: "gw", label: "Socket gateway", icon: "chat", tone: "green" },
    { id: "quiz", label: "Quiz service", icon: "server", tone: "teal" },
  ],
  messages: [
    // Step 1: the handshake (indices 0-3).
    { from: "page", to: "lb", label: "GET /ws  Upgrade: websocket", step: 1 },
    { from: "lb", to: "gw", label: "same request, forwarded", step: 1 },
    { from: "gw", to: "lb", label: "101 Switching Protocols", kind: "return", step: 1 },
    { from: "lb", to: "page", label: "101 + Sec-WebSocket-Accept", kind: "return", step: 1 },

    // Step 2: frames (indices 4-7).
    { from: "quiz", to: "gw", label: "event: question 3", kind: "async", step: 2, delay: 0.8 },
    { from: "gw", to: "page", label: "text frame: question 3", step: 2 },
    { from: "page", to: "gw", label: "masked frame: answer B", step: 2, delay: 0.6 },
    { from: "gw", to: "quiz", label: "answer B, student 17", step: 2 },

    // Step 3: heartbeats (indices 8-11).
    { from: "gw", to: "page", label: "ping (every 30 s)", step: 3, delay: 0.8 },
    { from: "page", to: "gw", label: "pong", kind: "return", step: 3 },
    { from: "gw", to: "page", label: "ping (phone lost signal)", kind: "timeout", step: 3, delay: 0.6, duration: 2 },
    { from: "gw", to: "quiz", label: "student 17 offline", kind: "async", step: 3 },
  ],
  notes: [
    { lane: "gw", text: "checks key, version 13, origin", step: 1, at: 1.5 },
    { lane: "lb", text: "now only pipes bytes", step: 2, at: 3.5 },
    { lane: "gw", text: "no pong for 60 s: close", step: 3, at: 10.5 },
  ],
};

export default spec;
