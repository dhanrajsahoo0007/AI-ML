import type { SequenceSpec } from "@/components/diagrams/types";

// Head-of-line blocking on one HTTP/1.1 connection, then the same three requests multiplexed over HTTP/2.
// Story from the page: a web-comics chapter page loads panel images and also calls /api/next-chapters, which needs
// about 800 ms because the web server asks a recommendations service. The phone's round trip is about 80 ms.
//
// Step 1 zooms in on ONE of the browser's six HTTP/1.1 connections: the browser cannot send the next request on
// it until the whole previous response has arrived, so p1 and p2 queue behind the slow call.
// Step 2 sends all three requests at once on one HTTP/2 connection. Client streams use odd ids (1, 3, 5).
// Replies come back in whatever order they are ready, each frame tagged with its stream id.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Head-of-line blocking vs multiplexing",
  width: 760,
  steps: [
    { title: "HTTP/1.1: one request at a time on a connection" },
    { title: "HTTP/2: many streams share one connection" },
  ],
  lanes: [
    { id: "browser", label: "Browser", icon: "browser", tone: "neutral" },
    { id: "web", label: "Web server", icon: "server", tone: "green" },
    { id: "recs", label: "Recs service", icon: "workers", tone: "teal" },
  ],
  messages: [
    // Step 1: HTTP/1.1. Each request waits for the previous response on this connection.
    { from: "browser", to: "web", label: "GET /api/next-chapters", step: 1 },
    { from: "web", to: "recs", label: "load suggestions", step: 1 },
    { from: "recs", to: "web", label: "suggestions", kind: "return", step: 1, delay: 1.6 },
    { from: "web", to: "browser", label: "200 OK · next.json", kind: "return", step: 1 },
    { from: "browser", to: "web", label: "GET /p1.jpg", step: 1 },
    { from: "web", to: "browser", label: "200 OK · p1.jpg", kind: "return", step: 1 },
    { from: "browser", to: "web", label: "GET /p2.jpg", step: 1 },
    { from: "web", to: "browser", label: "200 OK · p2.jpg", kind: "return", step: 1 },

    // Step 2: HTTP/2. Three streams leave together; the images do not wait for the slow reply.
    { from: "browser", to: "web", label: "stream 1 · GET /api/next-chapters", step: 2 },
    { from: "browser", to: "web", label: "stream 3 · GET /p1.jpg", step: 2, delay: 0.1 },
    { from: "browser", to: "web", label: "stream 5 · GET /p2.jpg", step: 2, delay: 0.1 },
    { from: "web", to: "recs", label: "load suggestions", step: 2 },
    { from: "web", to: "browser", label: "stream 3 · p1.jpg", kind: "return", step: 2 },
    { from: "web", to: "browser", label: "stream 5 · p2.jpg", kind: "return", step: 2 },
    { from: "recs", to: "web", label: "suggestions", kind: "return", step: 2, delay: 1 },
    { from: "web", to: "browser", label: "stream 1 · next.json", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "recs", text: "About 800 ms to answer", step: 1, at: 1.5 },
    { lane: "browser", text: "p1 and p2 wait in line", step: 1, at: 3.5 },
    { lane: "browser", text: "Images arrive first, any order", step: 2, at: 13.5 },
  ],
};

export default spec;
