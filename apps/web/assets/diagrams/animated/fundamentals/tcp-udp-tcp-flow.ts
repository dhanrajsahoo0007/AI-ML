import type { SequenceSpec } from "@/components/diagrams/types";

// TCP from the laptop's point of view: open the connection, receive the shop page in numbered pieces, then lose
// one piece and get it back. Byte numbers start at 0 (tools such as Wireshark show them this way; real
// connections start from a random number). Segments carry 1,000 bytes to keep the arithmetic easy; real ones
// carry up to about 1,460.
//
// The middle "Internet" lane exists so the lost segment can visibly stop part-way. Every other message crosses it.
// Round trip in the story: about 40 ms. The resend waits for the retransmission timer, at least 200 ms on Linux,
// because a single duplicate ACK is not enough to trigger fast retransmit (that needs three).
const spec: SequenceSpec = {
  kind: "sequence",
  title: "TCP: handshake, acknowledgements and a resend",
  width: 760,
  steps: [
    { title: "Open the connection: one round trip" },
    { title: "Send numbered bytes, acknowledge them" },
    { title: "A segment is lost and sent again" },
  ],
  lanes: [
    { id: "client", label: "Laptop", icon: "browser", tone: "neutral" },
    { id: "net", label: "Internet", icon: "globe", tone: "blue" },
    { id: "server", label: "Web server", icon: "server", tone: "green" },
  ],
  messages: [
    // Step 1: the three-way handshake. The request rides along with the final ACK.
    { from: "client", to: "server", label: "SYN · seq 0", step: 1 },
    { from: "server", to: "client", label: "SYN-ACK · seq 0, ack 1", kind: "return", step: 1 },
    { from: "client", to: "server", label: "ACK + GET /shop", step: 1 },

    // Step 2: data in order. Each ACK names the next byte the laptop expects.
    { from: "server", to: "client", label: "bytes 0-999", step: 2 },
    { from: "client", to: "server", label: "ACK 1000", kind: "return", step: 2 },
    { from: "server", to: "client", label: "bytes 1000-1999", step: 2 },
    { from: "client", to: "server", label: "ACK 2000", kind: "return", step: 2 },

    // Step 3: one segment dies on the way; the next one arrives but cannot be handed to the app yet.
    { from: "server", to: "net", label: "bytes 2000-2999 (lost)", kind: "timeout", step: 3, duration: 1.6 },
    { from: "server", to: "client", label: "bytes 3000-3999", step: 3 },
    { from: "client", to: "server", label: "ACK 2000 again", kind: "return", step: 3 },
    { from: "server", to: "client", label: "resend 2000-2999", step: 3, delay: 1.5 },
    { from: "client", to: "server", label: "ACK 4000", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "client", text: "About 40 ms before the request can leave", step: 1, at: 2.5 },
    { lane: "client", text: "Holds 3000-3999, the app waits", step: 3, at: 9.4 },
    { lane: "server", text: "Timer fires after 200 ms or more", step: 3, at: 9.6 },
    { lane: "client", text: "App gets 2000-3999 at once, late", step: 3 },
  ],
};

export default spec;
