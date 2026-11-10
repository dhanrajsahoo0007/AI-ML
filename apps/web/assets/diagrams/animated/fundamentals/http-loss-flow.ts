import type { SequenceSpec } from "@/components/diagrams/types";

// One lost packet, two transports. The server sends three panel images, one per packet to keep the drawing small
// (real images span many packets). The middle "Network" lane exists so the lost packet can visibly stop part-way.
//
// Step 1, HTTP/2 over TCP: TCP delivers bytes strictly in order, so segment 3 (p3) arrives but sits in the
// operating system's buffer until segment 2 is resent. Every stream on the connection waits, even though p3 has
// nothing to do with p2.
// Step 2, HTTP/3 over QUIC: each stream is ordered on its own. p3 goes to the page at once; only p2 waits for the
// resend. QUIC never reuses a packet number, so the resent data travels in a new packet (14).
// The resend takes at least one more round trip (about 80 ms on the story's phone), often longer if a timer fires.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "One lost packet: TCP stalls every stream, QUIC stalls one",
  width: 760,
  steps: [
    { title: "HTTP/2 over TCP: the loss blocks everything behind it" },
    { title: "HTTP/3 over QUIC: only the stream that lost data waits" },
  ],
  lanes: [
    { id: "browser", label: "Phone browser", icon: "phone", tone: "neutral" },
    { id: "net", label: "Network", icon: "globe", tone: "blue" },
    { id: "server", label: "Web server", icon: "server", tone: "green" },
  ],
  messages: [
    // Step 1: HTTP/2 on TCP.
    { from: "server", to: "browser", label: "TCP seg 1 · p1.jpg", step: 1 },
    { from: "server", to: "net", label: "TCP seg 2 · p2.jpg (lost)", kind: "timeout", step: 1, duration: 1.6 },
    { from: "server", to: "browser", label: "TCP seg 3 · p3.jpg", step: 1 },
    { from: "browser", to: "server", label: "ACK: seg 2 missing", kind: "return", step: 1 },
    { from: "server", to: "browser", label: "resend seg 2 · p2.jpg", step: 1, delay: 1.2 },

    // Step 2: HTTP/3 on QUIC.
    { from: "server", to: "browser", label: "QUIC pkt 11 · p1.jpg", step: 2 },
    { from: "server", to: "net", label: "QUIC pkt 12 · p2.jpg (lost)", kind: "timeout", step: 2, duration: 1.6 },
    { from: "server", to: "browser", label: "QUIC pkt 13 · p3.jpg", step: 2 },
    { from: "browser", to: "server", label: "ACK 11, 13 · 12 missing", kind: "return", step: 2 },
    { from: "server", to: "browser", label: "pkt 14 · p2.jpg again", step: 2, delay: 1.2 },
  ],
  notes: [
    { lane: "browser", text: "p3 is here but held back", step: 1, at: 2.5 },
    { lane: "browser", text: "p2 and p3 shown together, late", step: 1, at: 4.5 },
    { lane: "browser", text: "p3 shown at once", step: 2, at: 7.5 },
    { lane: "browser", text: "Only p2 waited", step: 2, at: 9.5 },
  ],
};

export default spec;
