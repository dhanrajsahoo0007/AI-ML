import type { SequenceSpec } from "@/components/diagrams/types";

// One cold page load, top to bottom: a browser in Lisbon asks a bookshop in Frankfurt for "My orders".
// Nine numbered hops carry their cost in milliseconds. A round trip between Lisbon and Frankfurt is about 40 ms
// (about 2,500 km of fibre each way at roughly 200,000 km/s, plus routers), so one crossing is about 20 ms.
// The hops inside the data center cost 1 to 10 ms. Packet durations follow the same idea: long trips move
// slowly, short ones quickly.
// Totals: 20 + 40 + 40 + 20 + 1 + 1 + 8 + 10 + 20 = 160 ms, of which about 140 ms is travel.
//
// Five lanes, so the drawing stays readable in a 640 px column. The DNS lookup (hop 1) is drawn as a note on the
// browser lane; the map spec (fundamentals/anatomy-of-a-request-hops) shows the resolver as its own box.
// Row indices: 0 DNS, 1-4 handshakes, 5-11 request and work, 12-13 the way home. The JSON note sits at 10.5,
// right after the database answers and before the copy goes into the cache.
const WAN = 1.4;
const LAN = 0.5;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A request's journey: nine hops and what each one costs",
  width: 840,
  steps: [
    { title: "Find the address" },
    { title: "Open a secure connection" },
    { title: "Ask, and do the work" },
    { title: "Carry the answer home" },
  ],
  lanes: [
    { id: "browser", label: "Browser", icon: "browser", tone: "neutral" },
    { id: "lb", label: "Load balancer", icon: "load-balancer", tone: "blue" },
    { id: "app", label: "App server", icon: "server", tone: "green" },
    { id: "cache", label: "Cache", icon: "cache", tone: "orange" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: DNS. The resolver lives at the reader's internet provider, outside this drawing.
    { from: "browser", to: "browser", label: "1. DNS lookup · 20 ms", kind: "note", step: 1 },

    // Step 2: TCP, then TLS 1.3, one round trip each.
    { from: "browser", to: "lb", label: "2. TCP handshake · 40 ms", step: 2, duration: WAN },
    { from: "lb", to: "browser", label: "SYN-ACK", kind: "return", step: 2, duration: WAN },
    { from: "browser", to: "lb", label: "3. TLS handshake · 40 ms", step: 2, duration: WAN },
    { from: "lb", to: "browser", label: "certificate, keys", kind: "return", step: 2, duration: WAN },

    // Step 3: the request crosses the internet once, then everything happens inside one data center.
    { from: "browser", to: "lb", label: "4. GET /orders · 20 ms", step: 3, duration: WAN },
    { from: "lb", to: "app", label: "5. Forward · 1 ms", step: 3, duration: LAN },
    { from: "app", to: "cache", label: "6. Lookup · 1 ms", step: 3, duration: LAN },
    { from: "cache", to: "app", label: "miss", kind: "return", step: 3, duration: LAN },
    { from: "app", to: "db", label: "7. SQL query · 8 ms", step: 3, duration: LAN },
    { from: "db", to: "app", label: "12 rows", kind: "return", step: 3, duration: LAN },
    { from: "app", to: "cache", label: "save copy, 60 s", kind: "async", step: 3, duration: LAN },

    // Step 4: the answer goes back the way it came.
    { from: "app", to: "lb", label: "response", kind: "return", step: 4, duration: LAN },
    { from: "lb", to: "browser", label: "9. 200 OK · 20 ms", kind: "return", step: 4, duration: WAN },
  ],
  notes: [
    { lane: "app", text: "8. Build JSON · 10 ms", step: 3, at: 10.5 },
    { lane: "browser", text: "Total about 160 ms", step: 4 },
  ],
};

export default spec;
