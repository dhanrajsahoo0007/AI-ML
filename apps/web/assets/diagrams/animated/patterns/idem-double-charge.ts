import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// How a retry charges a card twice (idempotency, first figure). The shopper's app pays for order 4471 with a 2 s
// timeout; the payment provider takes 2.4 s (illustrative timings).
// Two steps: 1 the first attempt is slow, the app gives up at 2 s, but the charge goes through at 2.4 s · 2 the app
// retries and the order service charges again: £84 taken for a £42 kettle.
// Layout: three lanes. Colours (PATTERN_TONE): app orange (traffic), order service teal (compute), payment provider
// neutral (infra); the timeout and the second charge use the red timeout arrow.

const pay = `POST /pay order ${ORDER.orderId}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A timeout, a retry and two charges",
  lanes: [
    { id: "app", label: "Shopper's app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Order service", icon: "server", tone: PATTERN_TONE.compute },
    { id: "psp", label: "Card provider", icon: "coin", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "app", to: "svc", label: pay, step: 1 },
    { from: "svc", to: "psp", label: `charge £${ORDER.price}`, step: 1 },
    { from: "svc", to: "app", label: "no reply in 2 s", kind: "timeout", step: 1, duration: 1.4 },
    { from: "psp", to: "svc", label: "ok at 2.4 s", kind: "return", step: 1 },

    { from: "app", to: "svc", label: `${pay} (retry)`, step: 2 },
    { from: "svc", to: "psp", label: `charge £${ORDER.price} again`, kind: "timeout", step: 2, duration: 1.4 },
    { from: "psp", to: "svc", label: "ok", kind: "return", step: 2 },
    { from: "svc", to: "app", label: "200 paid", kind: "return", step: 2 },
  ],
  notes: [{ lane: "psp", text: `£${ORDER.price * 2} taken`, step: 2, at: 7.5 }],
  steps: [{ title: "The first attempt times out, but succeeds" }, { title: "The retry charges again" }],
};

export default spec;
