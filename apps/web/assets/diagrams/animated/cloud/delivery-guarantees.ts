import type { SequenceSpec } from "@/components/diagrams/types";

// When a stream reader saves its offset decides what a crash does (cloud/data/streaming-and-messaging-services).
// Brightpost's stock worker reads a batch of 500 events, applies them to the stock counts and saves its offset,
// its place in the partition. Step 1: offset first, then a crash: 500 events are never counted (at most once).
// Step 2: counts first, then a crash: the same 500 are applied twice (at least once). Step 3: the counts and the
// offset are saved in one database commit, so after a crash the worker reads where it stopped and nothing is lost
// or doubled: the effect happens once. The labels are cloud-neutral on purpose: every stream has these four parts.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Where the offset is saved decides what a crash does",
  width: 800,
  steps: [
    { title: "Save the offset first: a crash loses events" },
    { title: "Count first: a crash counts twice" },
    { title: "Save both in one commit: counted once" },
  ],
  lanes: [
    { id: "stream", label: "Stock stream", icon: "log", tone: "orange" },
    { id: "worker", label: "Stock worker", icon: "workers", tone: "teal" },
    { id: "offsets", label: "Offset store", icon: "history", tone: "violet" },
    { id: "db", label: "Stock counts", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: at most once.
    { from: "stream", to: "worker", label: "events 1,000-1,499", step: 1 },
    { from: "worker", to: "offsets", label: "save offset 1,500", step: 1 },
    { from: "stream", to: "worker", label: "restart: from 1,500", step: 1, at: 3.5, delay: 0.6 },

    // Step 2: at least once.
    { from: "stream", to: "worker", label: "events 1,500-1,999", step: 2, at: 5 },
    { from: "worker", to: "db", label: "apply 500 events", step: 2, at: 6 },
    { from: "stream", to: "worker", label: "restart: from 1,500 again", step: 2, at: 7.5, delay: 0.6 },
    { from: "worker", to: "db", label: "apply the same 500 again", step: 2, at: 8.5 },

    // Step 3: the effect happens once.
    { from: "stream", to: "worker", label: "events 1,500-1,999", step: 3, at: 10 },
    { from: "worker", to: "db", label: "counts + offset 2,000, one commit", step: 3, at: 11 },
    { from: "worker", to: "db", label: "restart: where did I stop?", step: 3, at: 12.5, delay: 0.6 },
    { from: "db", to: "worker", label: "offset 2,000", kind: "return", step: 3, at: 13 },
    { from: "stream", to: "worker", label: "from 2,000", step: 3, at: 14 },
  ],
  notes: [
    { lane: "worker", text: "crashes before counting", step: 1, at: 2 },
    { lane: "db", text: "500 events never counted", step: 1, at: 4 },
    { lane: "worker", text: "crashes before saving the offset", step: 2, at: 7 },
    { lane: "db", text: "500 events counted twice", step: 2, at: 9 },
    { lane: "worker", text: "crashes after the commit", step: 3, at: 12 },
    { lane: "db", text: "each event counted once", step: 3, at: 15 },
  ],
};

export default spec;
