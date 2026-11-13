import type { SequenceSpec } from "@/components/diagrams/types";

// How one connection passes two layers of rules, there and back (cloud/networking/firewalls).
// Brightpost's app server opens a connection to the orders database on port 5432. On the way in, the data subnet's
// list checks its numbered "in" rules, then the database's own rules check the source group and remember the
// connection. On the way back, the database's rules let the reply pass because they remember it (stateful), while
// the subnet list checks its "out" rules again because it remembers nothing (stateless). Step 3 shows the same
// call with the "out" rule missing: the reply is dropped and the app times out.
// The labels are cloud-neutral on purpose: the rule numbers and port ranges are Brightpost's, not a provider's.
// Lanes are ordered as the packet meets them, so every hop is between neighbours.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two layers of rules, there and back",
  width: 800,
  steps: [
    { title: "On the way in, both layers check" },
    { title: "On the way back, only one checks" },
    { title: "No out rule: the reply is dropped" },
  ],
  lanes: [
    { id: "app", label: "App server", icon: "server", tone: "teal" },
    { id: "nacl", label: "Subnet list", icon: "policy", tone: "blue" },
    { id: "rules", label: "Database rules", icon: "firewall", tone: "red" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: a new connection. The list reads its "in" rules by number; the database's rules check the group.
    { from: "app", to: "nacl", label: "09:14:02 connect, port 5432", step: 1 },
    { from: "nacl", to: "rules", label: "in rule 100: allow", step: 1 },
    { from: "rules", to: "db", label: "from app group: allow", step: 1 },

    // Step 2: the reply. Remembered by the database's rules, checked afresh by the list.
    { from: "db", to: "rules", label: "reply", kind: "return", step: 2 },
    { from: "rules", to: "nacl", label: "known connection: pass", kind: "return", step: 2 },
    { from: "nacl", to: "app", label: "out rule 100: allow", kind: "return", step: 2 },

    // Step 3: the same call on a list with no "out" rule for the reply.
    { from: "app", to: "nacl", label: "09:20:00 connect, port 5432", step: 3, delay: 0.6 },
    { from: "nacl", to: "rules", label: "in rule 100: allow", step: 3 },
    { from: "rules", to: "db", label: "from app group: allow", step: 3 },
    { from: "db", to: "rules", label: "reply", kind: "return", step: 3 },
    { from: "rules", to: "nacl", label: "known connection: pass", kind: "return", step: 3 },
    { from: "nacl", to: "app", label: "no out rule: dropped", kind: "timeout", step: 3, duration: 2 },
  ],
  notes: [
    { lane: "rules", text: "Remembers this connection", step: 1, at: 2.5 },
    { lane: "nacl", text: "Remembers nothing: checks again", step: 2, at: 5.5 },
    { lane: "app", text: "Waits, then gives up", step: 3 },
  ],
};

export default spec;
