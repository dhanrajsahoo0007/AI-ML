import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// From a phone's location fixes to a new road weight (google-maps, Step 4 and Deep dive 3).
// Two steps: 1 the normal path: the phone sends batch b17 (five 1 s fixes) every 5 s; the ingest appends it to the
// report stream keyed by the map cell of the first fix and acks; the traffic processor map-matches the fixes to road
// segment s88, adds the speed to s88's 1-minute window and, when the watermark passes the window end, writes the
// window's median (24 km/h) to live speeds; the customizer reads the changed segments and recomputes the weights of
// the cells they lie in · 2 duplicates and lateness: the ack is lost and the phone resends b17; the processor drops
// the copy by batch id (a copy would only nudge a median anyway); a batch held 3 minutes in a tunnel arrives after
// its window closed and goes to the history only.
// Working (round numbers, the same as the page): 20,000,000 navigating phones ÷ 5 s = 4,000,000 batches/s × 100 bytes
// = 400 MB/s into the stream; a segment's window closes 60 s after it opens plus a 15 s allowance for lateness.
// Layout: six lanes. Colours (PATTERN_TONE, section tones only): the phone orange (traffic), ingest neutral (infra),
// the stream blue (data), the processor and customizer teal (compute), live speeds violet (store); the lost ack is the
// red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "From location fixes to a new road weight",
  lanes: [
    { id: "phone", label: "Phone", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "ingest", label: "Report ingest", icon: "signal", tone: PATTERN_TONE.infra },
    { id: "stream", label: "Report stream", icon: "log", tone: PATTERN_TONE.data },
    { id: "proc", label: "Traffic proc.", icon: "workers", tone: PATTERN_TONE.compute },
    { id: "live", label: "Live speeds", icon: "cache", tone: PATTERN_TONE.store },
    { id: "cust", label: "Customizer", icon: "timer", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "phone", to: "ingest", label: "batch b17: 5 fixes", step: 1 },
    { from: "ingest", to: "stream", label: "append, key = cell", step: 1 },
    { from: "ingest", to: "phone", label: "ack b17", kind: "return", step: 1 },
    { from: "stream", to: "proc", label: "b17", kind: "async", step: 1 },
    { from: "proc", to: "proc", label: "match to s88, add to window", kind: "note", step: 1 },
    { from: "proc", to: "live", label: "s88: median 24 km/h", step: 1 },
    { from: "live", to: "cust", label: "changed segments", kind: "async", step: 1 },
    { from: "live", to: "cust", label: "recompute s88's cell", kind: "note", step: 1 },

    { from: "ingest", to: "phone", label: "ack b17 lost", kind: "timeout", step: 2 },
    { from: "phone", to: "ingest", label: "resend b17", step: 2 },
    { from: "ingest", to: "stream", label: "append b17 again", step: 2 },
    { from: "stream", to: "proc", label: "b17 (copy)", kind: "async", step: 2 },
    { from: "proc", to: "proc", label: "seen b17: drop", kind: "note", step: 2 },
    { from: "phone", to: "ingest", label: "b09 from a tunnel, 3 min late", step: 2 },
    { from: "stream", to: "proc", label: "b09 after the window closed", kind: "async", step: 2 },
    { from: "proc", to: "proc", label: "history only", kind: "note", step: 2 },
  ],
  steps: [{ title: "Fixes become a segment speed" }, { title: "A duplicate and a late batch" }],
};

export default spec;
