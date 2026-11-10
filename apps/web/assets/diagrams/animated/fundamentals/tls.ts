import type { SequenceSpec } from "@/components/diagrams/types";

// A TLS 1.3 handshake from Maya's laptop in a Lisbon cafe to the ticket server in Frankfurt (round trip about
// 40 ms). The TCP connection is already open. Labels in {braces} travel encrypted. The middle lane is the cafe
// Wi-Fi, so readers can see which messages an eavesdropper on the same network can read: only the two hellos.
// Session resumption and 0-RTT are covered in the page text, not here, to keep one idea per diagram.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "TLS 1.3 handshake",
  width: 760,
  steps: [
    { title: "The browser says hello and sends a key share" },
    { title: "The server answers, then proves who it is" },
    { title: "The request leaves after one round trip" },
  ],
  lanes: [
    { id: "browser", label: "Laptop", icon: "browser", tone: "neutral" },
    { id: "wifi", label: "Cafe Wi-Fi", icon: "globe", tone: "orange" },
    { id: "server", label: "Ticket server", icon: "server", tone: "green" },
  ],
  messages: [
    // Step 1: one message, in the clear.
    { from: "browser", to: "server", label: "ClientHello: key share, name", step: 1 },

    // Step 2: the server's half of the key exchange, then everything else encrypted.
    { from: "server", to: "browser", label: "ServerHello: key share", kind: "return", step: 2 },
    { from: "server", to: "browser", label: "{Certificate + signature}", kind: "return", step: 2 },
    { from: "server", to: "browser", label: "{Finished}", kind: "return", step: 2 },

    // Step 3: the browser's Finished and the first request share one flight.
    { from: "browser", to: "server", label: "{Finished} {GET /checkout}", step: 3 },
    { from: "server", to: "browser", label: "{200 OK: seat map}", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "browser", text: "New key pair, made for this visit", step: 1, at: 0.4 },
    { lane: "wifi", text: "Can read the hello and the name", step: 1, at: 0.6 },
    { lane: "server", text: "Shared secret ready: encrypt from here", step: 2, at: 1.5 },
    { lane: "browser", text: "Checks the chain up to a trusted root", step: 2, at: 3.5 },
    { lane: "wifi", text: "Sees sizes and timing, not the page", step: 3 },
  ],
};

export default spec;
