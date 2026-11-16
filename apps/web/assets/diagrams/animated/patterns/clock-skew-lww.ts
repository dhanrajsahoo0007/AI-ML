import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// Last-write-wins with skewed clocks (distributed-time-and-clocks, first figure). A shopper adds a kettle to the cart on
// a phone (served by London), and 100 ms later removes it on a laptop (served by Frankfurt). Frankfurt's clock is
// 200 ms slow (illustrative skew).
// Two steps: 1 each server stamps its write with its own clock: the add 12:00:00.000, the later remove 11:59:59.900 ·
// 2 the servers replicate; last-write-wins keeps the higher timestamp, which is the earlier write, so the removal is lost.
// Working: real times 0 ms and 100 ms; Frankfurt stamps 100 − 200 = −100 ms, i.e. 11:59:59.900; LWW keeps max(0, −100).
// Layout: four lanes. Colours (PATTERN_TONE): devices orange (traffic), servers teal (compute); the lost write is red.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Last-write-wins with a slow clock",
  lanes: [
    { id: "phone", label: "Phone", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "lon", label: SHOP.homeRegion, icon: "server", tone: PATTERN_TONE.compute },
    { id: "fra", label: SHOP.secondRegion, icon: "server", tone: PATTERN_TONE.compute },
    { id: "laptop", label: "Laptop", icon: "browser", tone: PATTERN_TONE.traffic },
  ],
  messages: [
    { from: "phone", to: "lon", label: "add kettle", step: 1 },
    { from: "laptop", to: "fra", label: "remove kettle (+100 ms)", step: 1 },

    { from: "lon", to: "fra", label: "add @ 12:00:00.000", kind: "async", step: 2 },
    { from: "fra", to: "lon", label: "remove @ 11:59:59.900", kind: "timeout", step: 2, duration: 1.4 },
  ],
  notes: [
    { lane: "lon", text: "stamps 12:00:00.000", step: 1, at: 0.5 },
    { lane: "fra", text: "clock 200 ms slow: 11:59:59.900", step: 1, at: 1.5 },
    { lane: "lon", text: "LWW keeps the add: kettle is back", step: 2, at: 3.5 },
  ],
  steps: [{ title: "Each server stamps with its own clock" }, { title: "Last-write-wins keeps the earlier write" }],
};

export default spec;
