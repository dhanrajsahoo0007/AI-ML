import type { SequenceSpec } from "@/components/diagrams/types";

// One deadline carried along a three-hop call chain (cloud/networking/service-to-service).
// The shop's Pay step gives the whole chain 3 seconds. The order service passes the time that is left to the print
// service, which passes it on to the poster files. Step 2: print server A is slow, so the order service's first
// try stops at its 1 s per-try limit instead of waiting. Step 3: one retry, sent while time is left, lands on
// print server B through the layer 7 balancer. Step 4: when the retry budget is spent, the order service does not
// retry; it saves the order and queues the print booking, so Pay still answers inside 3 seconds.
// Labels are cloud-neutral and use time left, not status codes, which differ between libraries.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A deadline passed along three hops",
  width: 800,
  steps: [
    { title: "One deadline for the whole chain" },
    { title: "A slow server: stop at the per-try limit" },
    { title: "One retry, while time is left" },
    { title: "Budget spent: answer without the print call" },
  ],
  lanes: [
    { id: "shop", label: "Shop app", icon: "server", tone: "teal" },
    { id: "order", label: "Order service", icon: "server", tone: "teal" },
    { id: "print", label: "Print service", icon: "server", tone: "teal" },
    { id: "files", label: "Poster files", icon: "blob", tone: "violet" },
  ],
  messages: [
    // Step 1: the deadline is set once, at the edge of the system, and each hop passes on what is left.
    { from: "shop", to: "order", label: "place order, 3.0 s left", step: 1 },
    { from: "order", to: "print", label: "BookPrint, 2.8 s left", step: 1 },
    { from: "print", to: "files", label: "read poster, 2.7 s left", step: 1 },
    { from: "files", to: "print", label: "file, 30 ms", kind: "return", step: 1 },
    { from: "print", to: "order", label: "booked", kind: "return", step: 1 },
    { from: "order", to: "shop", label: "order saved, 0.4 s in all", kind: "return", step: 1 },

    // Step 2: the first try goes to the busy server and is cut at 1 s.
    { from: "order", to: "print", label: "try 1 on server A, 1 s limit", step: 2, delay: 0.6 },
    { from: "print", to: "order", label: "no answer in 1 s", kind: "timeout", step: 2, duration: 2 },

    // Step 3: one retry with the time that is left; the balancer sends it to server B.
    { from: "order", to: "print", label: "try 2 on server B, 1.7 s left", step: 3, delay: 0.4 },
    { from: "print", to: "order", label: "booked, 60 ms", kind: "return", step: 3 },
    { from: "order", to: "shop", label: "order saved, 1.3 s in all", kind: "return", step: 3 },

    // Step 4: retries already make up a tenth of recent calls, so no retry; the booking waits in a queue.
    { from: "order", to: "print", label: "try 1, 1 s limit", step: 4, delay: 0.6 },
    { from: "print", to: "order", label: "no answer in 1 s", kind: "timeout", step: 4, duration: 2 },
    { from: "order", to: "shop", label: "saved; print booked later", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "shop", text: "Pay waits 3 s at most", step: 1, at: 0.5 },
    { lane: "print", text: "Server A is at 100%", step: 2, at: 6.5 },
    { lane: "order", text: "Retries are under 10% of calls", step: 3, at: 8.5 },
    { lane: "order", text: "Budget spent: no retry", step: 4, at: 12.5 },
  ],
};

export default spec;
