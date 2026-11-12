import type { SequenceSpec } from "@/components/diagrams/types";

// How a workload gets, uses and renews a short-lived credential (cloud/fundamentals/identity-and-access).
// Brightpost's app server has a service identity attached and no key on disk. It asks an address that only the
// server itself can reach (the local endpoint) for a credential. The identity service signs a token that expires
// at 11:00. The app sends the token with each storage call, renews it at 10:50, and a copy of the 10:00 token used
// at 11:30 is refused. The labels are cloud-neutral on purpose: every provider has these four parts.
// Lanes are ordered so that the most frequent hop (app <-> local endpoint) is between neighbours.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A short-lived credential: get it, use it, renew it",
  width: 800,
  steps: [
    { title: "Ask for a credential, not a key" },
    { title: "Call storage with the token" },
    { title: "Renew before it expires" },
    { title: "An expired token is refused" },
  ],
  lanes: [
    { id: "app", label: "App server", icon: "server", tone: "teal" },
    { id: "local", label: "Local endpoint", icon: "api", tone: "neutral" },
    { id: "iam", label: "Identity (IAM)", icon: "key", tone: "red" },
    { id: "storage", label: "Orders bucket", icon: "blob", tone: "violet" },
  ],
  messages: [
    // Step 1: the app has no secret. It asks the platform, which knows which identity is attached to this server.
    { from: "app", to: "local", label: "10:00 GET credential", step: 1 },
    { from: "local", to: "iam", label: "token for this server?", step: 1 },
    { from: "iam", to: "local", label: "signed, expires 11:00", kind: "return", step: 1 },
    { from: "local", to: "app", label: "token (1 hour)", kind: "return", step: 1 },

    // Step 2: the token travels with the request; storage checks it before it reads anything.
    { from: "app", to: "storage", label: "GET orders/2026-11-10.csv + token", step: 2 },
    { from: "storage", to: "app", label: "200 OK, the file", kind: "return", step: 2 },

    // Step 3: renewal is automatic and happens before the old token runs out.
    { from: "app", to: "local", label: "10:50 GET credential", step: 3, delay: 0.6 },
    { from: "local", to: "iam", label: "renew", step: 3 },
    { from: "iam", to: "local", label: "signed, expires 11:50", kind: "return", step: 3 },
    { from: "local", to: "app", label: "new token", kind: "return", step: 3 },

    // Step 4: a copy of the first token, used half an hour after it expired.
    { from: "app", to: "storage", label: "11:30 GET + the 10:00 token", step: 4, delay: 0.6 },
    { from: "storage", to: "app", label: "refused: token expired", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "iam", text: "Is an identity attached?", step: 1, at: 1.5 },
    { lane: "storage", text: "Checks signature, expiry, policy", step: 2, at: 4.5 },
    { lane: "app", text: "Nothing was typed or stored", step: 3, at: 9.5 },
    { lane: "storage", text: "A stolen copy dies the same way", step: 4 },
  ],
};

export default spec;
