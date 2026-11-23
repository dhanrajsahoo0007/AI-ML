import type { SequenceSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Split brain from heartbeat-only failover, and the majority rule that stops it (leader-election, Core concepts).
// Brightpost's stock service for the flash-sale kettle has one leader that decrements stock.
// Two steps: 1 two nodes, heartbeat only: the link between A and B is cut; B hears nothing for 3 s (illustrative)
// and promotes itself; A never learns it lost; both sell the last kettle, so one kettle is sold twice · 2 three
// voters, a majority of 2 needed: A is cut off from B and C, cannot store the sale on a second node and refuses it;
// B asks C for a vote in term 5, gets 2 of 3, and sells the last kettle once.
// Working: a majority of 3 is 2; A alone has 1 of 3, so it can never commit; B plus C have 2 of 3.
// Layout: five lanes, ordered so the vote and the sale are neighbours (Shopper 1, A, C, B, Shopper 2).
// Colours (PATTERN_TONE): shoppers orange (traffic), nodes A and B teal (compute), voter C green (the pattern's own
// part: the third vote that makes a majority); the cut link and the cut-off replication are red timeouts.

const kettle = `buy last ${FLASH_SALE.item}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two leaders from a heartbeat, one leader from a majority",
  lanes: [
    { id: "s1", label: "Shopper 1", icon: "users", tone: PATTERN_TONE.traffic },
    { id: "a", label: "Node A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "c", label: "Voter C", icon: "server", tone: PATTERN_TONE.pattern },
    { id: "b", label: "Node B", icon: "server", tone: PATTERN_TONE.compute },
    { id: "s2", label: "Shopper 2", icon: "users", tone: PATTERN_TONE.traffic },
  ],
  messages: [
    { from: "a", to: "b", label: "heartbeat", step: 1 },
    { from: "a", to: "b", label: "heartbeat (link cut)", kind: "timeout", step: 1, duration: 1.6 },
    { from: "b", to: "b", label: "3 s silence: B promotes itself", kind: "note", step: 1 },
    { from: "s1", to: "a", label: kettle, step: 1 },
    { from: "a", to: "s1", label: "sold: stock 0", kind: "return", step: 1 },
    { from: "s2", to: "b", label: kettle, step: 1 },
    { from: "b", to: "s2", label: "sold: stock 0", kind: "return", step: 1 },
    { from: "a", to: "b", label: "two leaders: one kettle sold twice", kind: "note", step: 1 },

    { from: "s1", to: "a", label: kettle, step: 2 },
    { from: "a", to: "c", label: "store sale (cut off)", kind: "timeout", step: 2, duration: 1.6 },
    { from: "a", to: "s1", label: "1 of 3: refused", kind: "return", step: 2 },
    { from: "b", to: "c", label: "vote for B, term 5", step: 2 },
    { from: "c", to: "b", label: "yes: 2 of 3", kind: "return", step: 2 },
    { from: "s2", to: "b", label: kettle, step: 2 },
    { from: "b", to: "s2", label: "sold once: on B and C", kind: "return", step: 2 },
  ],
  steps: [{ title: "Two nodes, heartbeat only: two leaders" }, { title: "Three voters: only a majority leads" }],
};

export default spec;
