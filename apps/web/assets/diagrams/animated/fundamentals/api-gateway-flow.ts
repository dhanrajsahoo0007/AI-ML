import type { SequenceSpec } from "@/components/diagrams/types";

// The Spokes home screen needs the rider's active ride and the bikes near them.
// Step 1: without a BFF the phone makes two trips over the mobile network (about 100 ms each),
//         and downloads full service payloads (12 KB + 30 KB).
// Step 2: with a mobile BFF the phone makes one trip; the BFF calls rides and bikes at the same time
//         inside the data centre (about 20 ms) and returns a trimmed 4 KB screen.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Home screen with and without a backend for frontend",
  width: 800,
  lanes: [
    { id: "phone", label: "Phone app", icon: "phone" },
    { id: "gateway", label: "API gateway", icon: "gateway", tone: "green" },
    { id: "bff", label: "Mobile BFF", icon: "server", tone: "green" },
    { id: "rides", label: "Rides", icon: "map", tone: "teal" },
    { id: "bikes", label: "Bikes", icon: "map-pin", tone: "teal" },
  ],
  messages: [
    // Step 1: two round trips from the phone.
    { from: "phone", to: "gateway", label: "GET /rides/active" },
    { from: "gateway", to: "rides", label: "GetActiveRide" },
    { from: "rides", to: "gateway", label: "ride, 12 KB", kind: "return" },
    { from: "gateway", to: "phone", label: "200, 12 KB", kind: "return" },
    { from: "phone", to: "gateway", label: "GET /bikes/near", delay: 0.3 },
    { from: "gateway", to: "bikes", label: "ListNearby" },
    { from: "bikes", to: "gateway", label: "50 bikes, 30 KB", kind: "return" },
    { from: "gateway", to: "phone", label: "200, 30 KB", kind: "return" },

    // Step 2: one round trip; the BFF fans out inside the data centre.
    { from: "phone", to: "gateway", label: "GET /home", step: 2 },
    { from: "gateway", to: "bff", label: "GET /home", step: 2 },
    { from: "bff", to: "rides", label: "GetActiveRide", step: 2 },
    { from: "bff", to: "bikes", label: "ListNearby", step: 2, delay: 0 },
    { from: "rides", to: "bff", label: "ride", kind: "return", step: 2 },
    { from: "bikes", to: "bff", label: "50 bikes", kind: "return", step: 2 },
    { from: "bff", to: "gateway", label: "home screen, 4 KB", kind: "return", step: 2 },
    { from: "gateway", to: "phone", label: "200, 4 KB", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "phone", text: "2 mobile round trips: about 240 ms", at: 7.5 },
    { lane: "bff", text: "both calls sent at once", step: 2, at: 11.5 },
    { lane: "phone", text: "1 mobile round trip: about 125 ms", step: 2, at: 15.5 },
  ],
  steps: [
    { title: "Without a BFF: the phone makes two trips" },
    { title: "With a BFF: one trip, two calls in parallel inside" },
  ],
};

export default spec;
