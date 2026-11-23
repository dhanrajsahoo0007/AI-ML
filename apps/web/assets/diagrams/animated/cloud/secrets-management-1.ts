import type { SequenceSpec } from "@/components/diagrams/types";

// A third-party API key rotated with two valid keys (cloud/resilience/secrets-management).
// Brightpost's rotation job asks the payment provider for a second key, v2, while v1 keeps working. It saves v2 in the
// secret store as the current version and keeps v1 as the previous one. App servers re-read the store every hour and
// move to v2 on their own. A day later the job revokes v1. A server that still holds v1 is refused once, re-reads the
// store and retries with v2, so the customer's charge goes through. Lanes are cloud-neutral on purpose, and the
// refusal is written in words, because providers use different status codes.
// Lanes are ordered so the most frequent hops (server <-> store, server <-> provider) are between neighbours.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Rotating an API key with two valid keys",
  width: 800,
  steps: [
    { title: "Make v2, keep v1 valid" },
    { title: "Servers move to v2 on their own" },
    { title: "Revoke v1 a day later" },
    { title: "A straggler recovers by itself" },
  ],
  lanes: [
    { id: "job", label: "Rotation job", icon: "function", tone: "teal" },
    { id: "store", label: "Secret store", icon: "vault", tone: "red" },
    { id: "server", label: "App server", icon: "server", tone: "teal" },
    { id: "provider", label: "Payment API", icon: "card", tone: "neutral" },
  ],
  messages: [
    // Step 1: the provider allows two keys at once, so making v2 breaks nothing.
    { from: "job", to: "provider", label: "Mon 10:00 create key v2", step: 1 },
    { from: "provider", to: "job", label: "v2 (v1 still valid)", kind: "return", step: 1 },
    { from: "job", to: "store", label: "save v2 as current", step: 1 },

    // Step 2: the hourly re-read picks up the new version without a restart.
    { from: "server", to: "store", label: "10:40 hourly re-read", step: 2, delay: 0.6 },
    { from: "store", to: "server", label: "v2", kind: "return", step: 2 },
    { from: "server", to: "provider", label: "charge with v2", step: 2 },
    { from: "provider", to: "server", label: "paid", kind: "return", step: 2 },

    // Step 3: only after a full day, when every server has had 24 chances to re-read, does v1 stop working.
    { from: "job", to: "provider", label: "Tue 10:00 revoke v1", step: 3, delay: 0.6 },

    // Step 4: a server that missed every re-read is refused once, refreshes and retries.
    { from: "server", to: "provider", label: "charge with v1", step: 4, delay: 0.6 },
    { from: "provider", to: "server", label: "refused: key revoked", kind: "return", step: 4 },
    { from: "server", to: "store", label: "re-read now", step: 4 },
    { from: "store", to: "server", label: "v2", kind: "return", step: 4 },
    { from: "server", to: "provider", label: "retry once with v2", step: 4 },
    { from: "provider", to: "server", label: "paid", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "store", text: "v1 kept as previous", step: 1, at: 2.5 },
    { lane: "server", text: "No restart, no deploy", step: 2, at: 6.5 },
    { lane: "job", text: "Reads of v1 stopped hours ago", step: 3, at: 7.5 },
    { lane: "provider", text: "The customer never saw it", step: 4 },
  ],
};

export default spec;
