import type { SequenceSpec } from "@/components/diagrams/types";

// How a server inside a cloud network looks up a name (cloud/networking/dns).
// Every cloud network has a built-in resolver at a fixed address. It checks the private zones linked to that network
// first and sends every other question out to public DNS. Step 1: Brightpost's app server asks for the database's
// private name and the linked private zone answers 10.0.21.5 with a 60-second TTL. Step 2: a public name is in no
// linked zone, so the resolver asks public DNS and keeps the answer for its 300-second TTL. Step 3: two minutes later
// the same question is answered from the resolver's cache. Step 4: the export job asks the same private question
// from the jobs network, where no zone is linked; the resolver asks public DNS, which has never heard of the name.
// Lane names are cloud-neutral on purpose: every provider has these four parts.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A lookup from inside a cloud network",
  width: 800,
  steps: [
    { title: "A private name, from a linked network" },
    { title: "A public name goes out" },
    { title: "The cache answers" },
    { title: "The same private name, from an unlinked network" },
  ],
  lanes: [
    { id: "server", label: "Server", icon: "server", tone: "teal" },
    { id: "resolver", label: "Resolver", icon: "search", tone: "blue" },
    { id: "private", label: "Private zone", icon: "dns", tone: "blue" },
    { id: "public", label: "Public DNS", icon: "globe", tone: "neutral" },
  ],
  messages: [
    // Step 1: the zone is linked to the app server's network, so the resolver can read it.
    { from: "server", to: "resolver", label: "10:00 db.brightpost.internal?", step: 1 },
    { from: "resolver", to: "private", label: "linked zone: look up db", step: 1 },
    { from: "private", to: "resolver", label: "10.0.21.5, TTL 60 s", kind: "return", step: 1 },
    { from: "resolver", to: "server", label: "10.0.21.5", kind: "return", step: 1 },

    // Step 2: no linked zone holds this name, so the question leaves the network.
    { from: "server", to: "resolver", label: "10:01 www.brightpost.example?", step: 2, delay: 0.6 },
    { from: "resolver", to: "public", label: "not private: ask outside", step: 2 },
    { from: "public", to: "resolver", label: "LB address, TTL 300 s", kind: "return", step: 2 },
    { from: "resolver", to: "server", label: "LB address", kind: "return", step: 2 },

    // Step 3: within the TTL the resolver answers from memory.
    { from: "server", to: "resolver", label: "10:03 www again", step: 3, delay: 0.6 },
    { from: "resolver", to: "server", label: "LB address, from cache", kind: "return", step: 3 },

    // Step 4: the jobs network has no zone linked, so the private name is sent out like any other.
    { from: "server", to: "resolver", label: "03:30 db.brightpost.internal?", step: 4, delay: 0.6 },
    { from: "resolver", to: "public", label: "no linked zone: ask outside", step: 4 },
    { from: "public", to: "resolver", label: "no such name", kind: "return", step: 4 },
    { from: "resolver", to: "server", label: "no such name", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "resolver", text: "Checks linked zones first", step: 1, at: 0.5 },
    { lane: "resolver", text: "Keeps it for 300 s", step: 2, at: 6.5 },
    { lane: "resolver", text: "Nothing leaves the network", step: 3, at: 8.5 },
    { lane: "server", text: "From the jobs network", step: 4, at: 9.5 },
  ],
};

export default spec;
