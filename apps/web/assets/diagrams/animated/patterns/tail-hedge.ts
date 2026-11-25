import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One price call from the product page, three ways (tail-latency-and-degradation, Core concepts "Hedged and tied
// requests"). The price service has two replicas, A and B.
// Three steps: 1 no hedge: replica A stalls (a 400 ms garbage-collection pause) and the page waits 400 ms · 2 a hedged
// request: no answer by the price service's p95 (20 ms), so the page sends the same call to B; B answers in 8 ms, the
// page keeps the first answer and cancels A · 3 tied requests: the page sends the call to both replicas 1 ms apart,
// each tagged with the other; the replica that starts first tells its twin to drop its copy.
// Working (illustrative latencies for the price service): p50 8 ms, p95 20 ms, a slow tail of 400 ms. Hedged: 20 ms
// wait + 8 ms = 28 ms instead of 400 ms. Only calls still out at the p95 are hedged, so at most about 5 % extra calls.
// Layout: three lanes. Colours (PATTERN_TONE): the page orange (traffic), the two replicas teal (compute). Two tones.
// Fact check (2026-11-16, Dean and Barroso, "The Tail at Scale", CACM 2013): defer the secondary request "until the
// first request has been outstanding for more than the 95th-percentile expected latency", which "limits the additional
// load to approximately 5%"; the client "cancels remaining outstanding requests once the first result is received";
// tied requests are sent to two servers "each tagged with the identity of the other", and the one that begins
// execution sends a cancellation to its counterpart; the client waits about 1 ms (two network message delays) between
// the two copies.

const price = `£${ORDER.price}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A hedged call and a tied call",
  lanes: [
    { id: "page", label: "Product page", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "a", label: "Price replica A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "b", label: "Price replica B", icon: "server", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "page", to: "a", label: "get price: kettle", step: 1 },
    { from: "a", to: "a", label: "GC pause: 400 ms", kind: "note", step: 1 },
    { from: "a", to: "page", label: `${price}, 400 ms later`, kind: "return", step: 1, duration: 2 },

    { from: "page", to: "a", label: "get price: kettle", step: 2 },
    { from: "page", to: "page", label: "no answer by p95 (20 ms)", kind: "note", step: 2 },
    { from: "page", to: "b", label: "same call (hedge)", step: 2 },
    { from: "b", to: "page", label: `${price} in 8 ms`, kind: "return", step: 2 },
    { from: "page", to: "a", label: "cancel", kind: "async", step: 2 },

    { from: "page", to: "a", label: "get price, tied to B", step: 3 },
    { from: "page", to: "b", label: "tied to A, 1 ms later", step: 3 },
    { from: "b", to: "a", label: "B started: drop yours", kind: "async", step: 3 },
    { from: "b", to: "page", label: price, kind: "return", step: 3 },
  ],
  steps: [
    { title: "One slow replica holds the page" },
    { title: "Hedge after the p95 delay" },
    { title: "Tied requests cancel their twin" },
  ],
};

export default spec;
