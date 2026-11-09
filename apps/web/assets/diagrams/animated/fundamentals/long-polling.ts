import type { SequenceSpec } from "@/components/diagrams/types";

// Long polling on a shop's help chat (chat 77). The customer's page always has one request open to a poll server.
// The server answers it the moment a new message exists, or after 30 s with nothing.
//
// Step 1: the held request. The page asks for messages after the last one it has (seq 17). The poll server
// subscribes to the chat's topic first, then reads the store, finds nothing and holds the request open.
// Step 2: an event answers it. The agent's reply is saved as msg 18 and published. The poll server receives it,
// answers 200 on the open request, and the page asks again at once with the new cursor (after=18).
// Step 3: nothing happens for 30 s. The server answers 204 No Content and the page asks again, so no request ever
// sits idle long enough for a proxy or load balancer (60 s idle timeout) to cut it.
// Step 4: the connection drops (the poll server restarts). Msg 19 is saved while the page has no request open, so
// no server is listening for it. The page waits about 1 s with jitter, asks again with after=18, and the new server
// finds msg 19 in the store: the cursor, not the open connection, is what makes delivery complete.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Long polling: hold the request until there is news",
  width: 880,
  steps: [
    { title: "The request waits on the server" },
    { title: "A new message answers it" },
    { title: "Nothing for 30 s: answer empty, ask again" },
    { title: "Connection lost: reconnect with the cursor" },
  ],
  lanes: [
    { id: "page", label: "Customer page", icon: "browser", tone: "neutral" },
    { id: "poll", label: "Poll server", icon: "server", tone: "green" },
    { id: "bus", label: "Pub/sub", icon: "queue", tone: "orange" },
    { id: "store", label: "Message store", icon: "database", tone: "violet" },
    { id: "chat", label: "Chat service", icon: "chat", tone: "teal" },
  ],
  messages: [
    // Step 1: the held request.
    { from: "page", to: "poll", label: "GET after=17", step: 1 },
    { from: "poll", to: "bus", label: "subscribe chat:77", kind: "async", step: 1 },
    { from: "poll", to: "store", label: "read after 17", step: 1 },
    { from: "store", to: "poll", label: "nothing yet", kind: "return", step: 1 },

    // Step 2: the agent replies; the open request carries it back.
    { from: "chat", to: "store", label: "save msg 18", step: 2, delay: 1.2 },
    { from: "chat", to: "bus", label: "publish chat:77", kind: "async", step: 2 },
    { from: "bus", to: "poll", label: "msg 18", kind: "async", step: 2 },
    { from: "poll", to: "page", label: "200 [msg 18]", kind: "return", step: 2 },
    { from: "page", to: "poll", label: "GET after=18", step: 2 },

    // Step 3: the hold timeout ends the request with no news.
    { from: "poll", to: "page", label: "204 No Content", kind: "return", step: 3, delay: 1.5 },
    { from: "page", to: "poll", label: "GET after=18", step: 3 },

    // Step 4: the open request dies; a message lands while nobody is listening; the cursor catches it up.
    { from: "page", to: "poll", label: "held GET lost", kind: "timeout", step: 4, duration: 1.8 },
    { from: "chat", to: "store", label: "save msg 19", step: 4 },
    { from: "page", to: "poll", label: "retry: GET after=18", step: 4, delay: 1 },
    { from: "poll", to: "bus", label: "subscribe chat:77", kind: "async", step: 4 },
    { from: "poll", to: "store", label: "read after 18", step: 4 },
    { from: "store", to: "poll", label: "msg 19", kind: "return", step: 4 },
    { from: "poll", to: "page", label: "200 [msg 19]", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "poll", text: "held open, up to 30 s", step: 1, at: 3.5 },
    { lane: "page", text: "on screen in about 0.1 s", step: 2, at: 7.5 },
    { lane: "poll", text: "30 s pass, no news", step: 3, at: 8.5 },
    { lane: "page", text: "wait 1 s plus jitter", step: 4, at: 12.5 },
  ],
};

export default spec;
