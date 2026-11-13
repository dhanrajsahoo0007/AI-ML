import type { SequenceSpec } from "@/components/diagrams/types";

// How Brightpost's delivery worker sends a "shipped" webhook to a gift shop (cloud/networking/webhooks-on-the-cloud).
// Step 1: the worker takes an unsent row from the outbox, signs the POST with that shop's secret, gets a 2xx and
// marks the row sent. Step 2: a server error; the worker waits about 1 minute plus a random part (jitter) and tries
// again, which succeeds. Step 3: a shop whose server does not answer: each try stops at 5 s and the waits double
// (1, 2, 4 ... minutes, capped at 2 hours). Step 4: after 24 hours the worker gives up, parks the row as failed and
// tells the shop, which can ask for a replay. Status codes here are the gift shop's own HTTP replies, the same on
// every cloud. Lanes are ordered so that the busiest hop (worker <-> shop) is between neighbours on the right.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Sending a webhook: success, retry with backoff, give up",
  width: 760,
  steps: [
    { title: "A 2xx reply ends the job" },
    { title: "An error: wait, then try again" },
    { title: "No reply counts as a failure" },
    { title: "Give up after 24 hours, park it" },
  ],
  lanes: [
    { id: "outbox", label: "Outbox", icon: "log", tone: "violet" },
    { id: "worker", label: "Delivery worker", icon: "workers", tone: "teal" },
    { id: "shop", label: "Gift shop API", icon: "bag", tone: "neutral" },
  ],
  messages: [
    // Step 1: one row, one signed POST, one 2xx.
    { from: "outbox", to: "worker", label: "16:00 evt_5210 shipped", step: 1 },
    { from: "worker", to: "shop", label: "POST, signed", step: 1 },
    { from: "shop", to: "worker", label: "200 in 0.4 s", kind: "return", step: 1 },
    { from: "worker", to: "outbox", label: "mark sent", kind: "return", step: 1 },

    // Step 2: a server error is worth another try, after a short wait.
    { from: "worker", to: "shop", label: "16:00 POST evt_5211", step: 2, delay: 0.6 },
    { from: "shop", to: "worker", label: "500 server error", kind: "return", step: 2 },
    { from: "worker", to: "shop", label: "16:01 retry 1", step: 2, delay: 0.8 },
    { from: "shop", to: "worker", label: "200", kind: "return", step: 2 },

    // Step 3: the shop's server is down. Each try waits 5 s at most, and the gaps between tries double.
    { from: "worker", to: "shop", label: "16:00 evt_5212: no reply in 5 s", kind: "timeout", step: 3, delay: 0.6 },
    { from: "worker", to: "shop", label: "16:07 retry 3: no reply", kind: "timeout", step: 3 },
    { from: "worker", to: "shop", label: "18:07 retry 7: no reply", kind: "timeout", step: 3 },

    // Step 4: after 24 hours the row is parked, not deleted.
    { from: "worker", to: "outbox", label: "next day 16:00: failed, parked", step: 4, delay: 0.6 },
  ],
  notes: [
    { lane: "worker", text: "Wait about 1 min plus jitter", step: 2, at: 5.5 },
    { lane: "worker", text: "Waits double, up to 2 hours", step: 3, at: 9.5 },
    { lane: "shop", text: "Shop is told; it can ask for a replay", step: 4 },
  ],
};

export default spec;
