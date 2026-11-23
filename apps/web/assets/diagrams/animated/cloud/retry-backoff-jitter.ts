import type { SequenceSpec } from "@/components/diagrams/types";

// Retrying a throttled call with exponential backoff and jitter (cloud/resilience/quotas-and-retries).
// Brightpost's email worker runs as several copies that send order confirmations through a rented email service,
// which allows only so many sends a second. Step 1: a send is refused with "slow down". Step 2: one copy retries
// after 1 s, 2 s and 4 s, and the fourth try is sent. Step 3: three copies are refused at the same instant and each
// waits exactly 1 s, so all three arrive together again and are refused again. Step 4: each copy waits a random
// time up to its limit (jitter), the three tries arrive apart, and all are sent.
// The email service is rented, so its words are plain ("slow down", "sent") rather than a status code.
// Lanes: the service sits on the left, next to copy 1, because steps 1 and 2 use only those two lanes.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Backoff and jitter: wait longer, and not all at once",
  width: 760,
  steps: [
    { title: "Too fast: the service says slow down" },
    { title: "Back off: wait 1 s, 2 s, 4 s" },
    { title: "Three copies retry in step" },
    { title: "Jitter spreads the retries apart" },
  ],
  lanes: [
    { id: "email", label: "Email service", icon: "api", tone: "neutral" },
    { id: "c1", label: "Worker copy 1", icon: "function", tone: "teal" },
    { id: "c2", label: "Worker copy 2", icon: "function", tone: "teal" },
    { id: "c3", label: "Worker copy 3", icon: "function", tone: "teal" },
  ],
  messages: [
    // Step 1: one send, refused.
    { from: "c1", to: "email", label: "9:20:00 send order 5101", step: 1 },
    { from: "email", to: "c1", label: "refused: slow down", kind: "return", step: 1 },

    // Step 2: the wait doubles after each refusal; the fourth try gets through.
    { from: "c1", to: "email", label: "9:20:01 try 2 (waited 1 s)", step: 2, delay: 0.6 },
    { from: "email", to: "c1", label: "refused: slow down", kind: "return", step: 2 },
    { from: "c1", to: "email", label: "9:20:03 try 3 (waited 2 s)", step: 2, delay: 0.6 },
    { from: "email", to: "c1", label: "refused: slow down", kind: "return", step: 2 },
    { from: "c1", to: "email", label: "9:20:07 try 4 (waited 4 s)", step: 2, delay: 0.6 },
    { from: "email", to: "c1", label: "sent", kind: "return", step: 2 },

    // Step 3: no randomness. Three copies refused together wait the same 1 s and collide again.
    { from: "c1", to: "email", label: "9:30:01.0 retry", step: 3, delay: 0.4 },
    { from: "c2", to: "email", label: "9:30:01.0 retry", step: 3 },
    { from: "c3", to: "email", label: "9:30:01.0 retry", step: 3 },

    // Step 4: each copy picks a random wait between 0 and its limit.
    { from: "c2", to: "email", label: "9:40:00.3 retry", step: 4, delay: 0.4 },
    { from: "c3", to: "email", label: "9:40:00.7 retry", step: 4, delay: 0.4 },
    { from: "c1", to: "email", label: "9:40:01.6 retry", step: 4, delay: 0.4 },
  ],
  notes: [
    { lane: "email", text: "3 at the same instant: all refused", step: 3, at: 10.5 },
    { lane: "email", text: "Apart in time: all 3 sent", step: 4, at: 13.5 },
  ],
};

export default spec;
