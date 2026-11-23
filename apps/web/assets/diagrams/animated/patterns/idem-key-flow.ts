import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// An idempotency key from first request to replay (idempotency, the Architecture figure). The app sends the key
// k-4471 with the payment; the order service reserves it before doing any work.
// Four steps: 1 reserve the key in a key store (insert in progress) · 2 charge once and save the status code and body
// against the key · 3 a retry with the same key gets the saved response, without a second charge · 4 a duplicate that
// arrives while the first is still running gets 409 and retries later.
// Layout: four lanes. Colours (PATTERN_TONE): app orange (traffic), order service teal (compute), key store violet
// (store), payment provider neutral (infra).
// Fact check (2026-11-16): Stripe saves the status code and body of the first request for a key and returns it for
// retries, including 500s; the IETF Idempotency-Key draft (-07) answers 409 for a retry while the original is still
// being processed and 422 for a reused key with a different payload.

const key = `k-${ORDER.orderId}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "An idempotency key, from first request to replay",
  lanes: [
    { id: "app", label: "Shopper's app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Order service", icon: "server", tone: PATTERN_TONE.compute },
    { id: "store", label: "Key store", icon: "key", tone: PATTERN_TONE.store },
    { id: "psp", label: "Card provider", icon: "coin", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "app", to: "svc", label: `POST /pay, key ${key}`, step: 1 },
    { from: "svc", to: "store", label: `INSERT ${key}: in progress`, step: 1 },
    { from: "store", to: "svc", label: "new key", kind: "return", step: 1 },

    { from: "svc", to: "psp", label: `charge £${ORDER.price}`, step: 2 },
    { from: "psp", to: "svc", label: "ok, charge ch_19", kind: "return", step: 2 },
    { from: "svc", to: "store", label: "save 200 + body", step: 2 },
    { from: "svc", to: "app", label: "200 paid", kind: "return", step: 2 },

    { from: "app", to: "svc", label: `retry, key ${key}`, step: 3 },
    { from: "svc", to: "store", label: `INSERT ${key}`, step: 3 },
    { from: "store", to: "svc", label: "exists: done, 200", kind: "return", step: 3 },
    { from: "svc", to: "app", label: "200 paid (saved body)", kind: "return", step: 3 },

    { from: "app", to: "svc", label: "duplicate, still running", step: 4 },
    { from: "svc", to: "store", label: `INSERT ${key}`, step: 4 },
    { from: "store", to: "svc", label: "exists: in progress", kind: "return", step: 4 },
    { from: "svc", to: "app", label: "409, retry later", kind: "return", step: 4 },
  ],
  steps: [
    { title: "Reserve the key before any work" },
    { title: "Charge once, save the response" },
    { title: "A retry gets the saved response" },
    { title: "A concurrent duplicate gets 409" },
  ],
};

export default spec;
