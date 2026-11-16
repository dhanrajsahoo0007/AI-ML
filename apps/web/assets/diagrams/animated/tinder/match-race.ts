import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Both people swipe right at the same moment (tinder, Step 5 and Deep dive 2).
// Two steps: 1 check, then write: Ana's request reads "has Ben liked Ana?" and Ben's reads "has Ana liked Ben?"
// before either like is saved; both reads say no, both likes are then written, and nobody is told about the match
// (a note marks the lost match; with "write, then read" on replicas that lag, the same race can also create it twice) ·
// 2 one row per pair: both requests update the same row, keyed by the two ids in sorted order, with one atomic
// "set my flag, return the row"; the store applies them one after the other, so Ana's sees Ben's flag unset and
// Ben's sees both set; only Ben's request writes the match, and the write is insert-if-absent with the pair key as
// the match id, so a retry cannot create a second one.
// Layout: four lanes. Colours (PATTERN_TONE): users orange (traffic), the swipe service teal (compute), the likes
// store violet (store); the lost match is a note across the service and the store.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two likes at once: the lost match and the pair row",
  lanes: [
    { id: "ana", label: "Ana", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "ben", label: "Ben", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Swipe service", icon: "users", tone: PATTERN_TONE.compute },
    { id: "db", label: "Likes store", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "ana", to: "svc", label: "like Ben", step: 1 },
    { from: "ben", to: "svc", label: "like Ana", step: 1 },
    { from: "svc", to: "db", label: "Ben liked Ana? (for Ana)", step: 1 },
    { from: "db", to: "svc", label: "no", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "Ana liked Ben? (for Ben)", step: 1 },
    { from: "db", to: "svc", label: "no", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "save Ana → Ben", step: 1 },
    { from: "svc", to: "db", label: "save Ben → Ana", step: 1 },
    { from: "svc", to: "db", label: "both liked, nobody told: match lost", kind: "note", step: 1 },
    { from: "svc", to: "ana", label: "no match", kind: "return", step: 1 },
    { from: "svc", to: "ben", label: "no match", kind: "return", step: 1 },

    { from: "ana", to: "svc", label: "like Ben", step: 2 },
    { from: "ben", to: "svc", label: "like Ana", step: 2 },
    { from: "svc", to: "db", label: "row (Ana, Ben): set ana_likes, return row", step: 2 },
    { from: "db", to: "svc", label: "ben_likes = false", kind: "return", step: 2 },
    { from: "svc", to: "db", label: "row (Ana, Ben): set ben_likes, return row", step: 2 },
    { from: "db", to: "svc", label: "ana_likes = true: both", kind: "return", step: 2 },
    { from: "svc", to: "db", label: "insert match (Ana, Ben) if absent", step: 2 },
    { from: "svc", to: "ana", label: "liked", kind: "return", step: 2 },
    { from: "svc", to: "ben", label: "it's a match", kind: "return", step: 2 },
  ],
  steps: [{ title: "Check, then write: the match is lost" }, { title: "One row per pair: exactly one match" }],
};

export default spec;
