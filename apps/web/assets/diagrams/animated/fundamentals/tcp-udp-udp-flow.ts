import type { SequenceSpec } from "@/components/diagrams/types";

// UDP in the kart race from the page's story. The game server sends the whole race state 30 times a second
// (one datagram every 33 ms) and the phone sends steering input. Nothing is acknowledged by UDP itself.
// Step 2 loses state #43 and shows the phone simply drawing #44. Step 3 shows the game adding the one piece of
// reliability it needs: the phone reports the last state it saw, and the server sends changes since that state,
// so lost packets never have to be resent.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "UDP: send and forget, then let the app decide",
  width: 760,
  steps: [
    { title: "No handshake, no acknowledgement" },
    { title: "A datagram is lost; the next one replaces it" },
    { title: "The game adds only the reliability it needs" },
  ],
  lanes: [
    { id: "phone", label: "Phone", icon: "phone", tone: "neutral" },
    { id: "net", label: "Internet", icon: "globe", tone: "blue" },
    { id: "game", label: "Game server", icon: "server", tone: "teal" },
  ],
  messages: [
    // Step 1: the first datagram carries data. No setup round trip.
    { from: "phone", to: "game", label: "input #120: steer left", kind: "async", step: 1 },
    { from: "game", to: "phone", label: "state #41", kind: "async", step: 1 },
    { from: "game", to: "phone", label: "state #42, 33 ms later", kind: "async", step: 1 },

    // Step 2: #43 dies on the way. Nobody notices or resends; #44 follows on schedule.
    { from: "game", to: "net", label: "state #43 (lost)", kind: "timeout", step: 2, duration: 1.6 },
    { from: "game", to: "phone", label: "state #44", kind: "async", step: 2, delay: 0.3 },

    // Step 3: application-level acknowledgement folded into the input the phone sends anyway.
    { from: "phone", to: "game", label: "input #121, last seen #44", kind: "async", step: 3 },
    { from: "game", to: "phone", label: "state #45 as changes since #44", kind: "async", step: 3 },
  ],
  notes: [
    { lane: "game", text: "30 states a second, none acknowledged", step: 1, at: 2.5 },
    { lane: "phone", text: "Skips #43, draws #44 at once", step: 2, at: 4.5 },
    { lane: "game", text: "Never resends #43; it is already stale", step: 3 },
  ],
};

export default spec;
