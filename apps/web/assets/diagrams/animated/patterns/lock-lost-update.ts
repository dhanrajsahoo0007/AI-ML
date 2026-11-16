import type { SequenceSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The lost update: two buyers, one kettle (concurrency-and-locking, first figure). Both requests read stock = 1, both
// decide there is one left, both write 0, and two orders are confirmed for one kettle.
// One step. Layout: three lanes. Colours (PATTERN_TONE): checkout requests teal (compute), the stock table violet
// (store); the second write, which silently overwrites the first, is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two buyers, one kettle: the lost update",
  lanes: [
    { id: "a", label: "Checkout A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "db", label: "Stock table", icon: "database", tone: PATTERN_TONE.store },
    { id: "b", label: "Checkout B", icon: "server", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "a", to: "db", label: `SELECT stock (${FLASH_SALE.item})` },
    { from: "b", to: "db", label: "SELECT stock" },
    { from: "db", to: "a", label: "1", kind: "return" },
    { from: "db", to: "b", label: "1", kind: "return" },
    { from: "a", to: "db", label: "UPDATE stock = 0" },
    { from: "b", to: "db", label: "UPDATE stock = 0", kind: "timeout", duration: 1.4 },
    { from: "db", to: "a", label: "order confirmed", kind: "return" },
    { from: "db", to: "b", label: "order confirmed", kind: "return" },
  ],
  notes: [{ lane: "db", text: "2 orders, 1 kettle", at: 7.5 }],
};

export default spec;
