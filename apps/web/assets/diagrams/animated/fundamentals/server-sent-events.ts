import type { SequenceSpec } from "@/components/diagrams/types";

// One fan's live match stream, from first request to a resumed stream after a dropped connection.
//
// Step 1: the browser opens the stream with one GET. The server answers 200 with Content-Type
// text/event-stream and never finishes the body.
// Step 2: the match feed publishes events 41 (a goal) and 42 (a yellow card). The live server writes each one
// down the open response with its id. The browser remembers the last id it saw: 42.
// Step 3: the phone loses signal. Events 43 and 44 are published while the fan is away. The browser waits the
// retry time (3 s) before it tries again.
// Step 4: the browser reconnects and sends Last-Event-ID: 42 on its own. The server reads the feed's log after
// id 42, replays 43 and 44, then carries on live with 45.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "SSE: open a stream, receive events, drop, resume from the last id",
  width: 760,
  steps: [
    { title: "Open one long response" },
    { title: "Events arrive with ids" },
    { title: "The connection drops" },
    { title: "Reconnect with Last-Event-ID and replay" },
  ],
  lanes: [
    { id: "browser", label: "Fan's browser", icon: "browser", tone: "neutral" },
    { id: "server", label: "Live server", icon: "server", tone: "teal" },
    { id: "feed", label: "Match feed", icon: "queue", tone: "orange" },
  ],
  messages: [
    // Step 1: open the stream.
    { from: "browser", to: "server", label: "GET /matches/7/live", step: 1 },
    { from: "server", to: "browser", label: "200 text/event-stream", kind: "return", step: 1 },

    // Step 2: events flow down the open response.
    { from: "feed", to: "server", label: "goal (id 41)", kind: "async", step: 2, delay: 0.6 },
    { from: "server", to: "browser", label: "id: 41  event: goal", kind: "async", step: 2 },
    { from: "feed", to: "server", label: "card (id 42)", kind: "async", step: 2, delay: 0.6 },
    { from: "server", to: "browser", label: "id: 42  event: card", kind: "async", step: 2 },

    // Step 3: the phone loses signal.
    { from: "server", to: "browser", label: "connection lost", kind: "timeout", step: 3, delay: 0.6 },

    // Step 4: reconnect and replay.
    { from: "browser", to: "server", label: "GET  Last-Event-ID: 42", step: 4, delay: 1 },
    { from: "server", to: "feed", label: "read log after 42", step: 4 },
    { from: "feed", to: "server", label: "events 43, 44", kind: "return", step: 4 },
    { from: "server", to: "browser", label: "id: 43 ... id: 44", kind: "async", step: 4 },
    { from: "feed", to: "server", label: "sub (id 45)", kind: "async", step: 4, delay: 0.6 },
    { from: "server", to: "browser", label: "id: 45  live again", kind: "async", step: 4 },
  ],
  notes: [
    { lane: "server", text: "body stays open", step: 1, at: 1.5 },
    { lane: "browser", text: "remembers id 42", step: 2, at: 5.5 },
    { lane: "feed", text: "43, 44 published", step: 3, at: 6.4 },
    { lane: "browser", text: "waits 3 s (retry)", step: 3, at: 6.7 },
  ],
};

export default spec;
