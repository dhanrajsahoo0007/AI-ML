import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The commit protocol (dropbox, Step 3 and Deep dive 1): send the block list first, upload only what the server lacks,
// and a retried commit returns the first result.
// Two steps: 1 the desktop saves report.pdf (12 MB = three 4 MB blocks h1, h2, h3, parent revision 7) and commits the
// block list with request key c9; the metadata service asks the block service which hashes exist; h2 is already
// stored (an unchanged block), so the answer is "need h1, h3"; the client puts h1 and h3, the block service stores
// them by hash; the client commits again, the metadata service writes revision 8 and journal row 9006 in one
// transaction · 2 the reply to the second commit is lost; the client retries with the same key c9; the metadata
// service finds c9 already applied and returns revision 8 and row 9006 again, writing nothing.
// Working: 12 MB ÷ 4 MB = 3 blocks; only 2 × 4 MB = 8 MB cross the network instead of 12 MB; a block re-sent after a
// timeout lands under the same hash, so it is stored once. Ids and revisions are illustrative.
// Layout: five lanes. Colours (PATTERN_TONE): the client orange (traffic), the metadata service green (the pattern's
// own part: the commit), the block service teal (compute), both stores violet; the lost reply is the red timeout.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Commit the block list, upload only what is missing",
  lanes: [
    { id: "client", label: "Desktop", icon: "server", tone: PATTERN_TONE.traffic },
    { id: "meta", label: "Metadata svc", icon: "folder", tone: PATTERN_TONE.pattern },
    { id: "blocks", label: "Block service", icon: "hash", tone: PATTERN_TONE.compute },
    { id: "store", label: "Object store", icon: "blob", tone: PATTERN_TONE.store },
    { id: "db", label: "Metadata DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "client", to: "meta", label: "commit [h1,h2,h3], rev 7, c9", step: 1 },
    { from: "meta", to: "blocks", label: "which of h1,h2,h3 exist?", step: 1 },
    { from: "blocks", to: "meta", label: "h2 only", kind: "return", step: 1 },
    { from: "meta", to: "client", label: "need h1, h3", kind: "return", step: 1 },
    { from: "client", to: "blocks", label: "PUT h1, PUT h3 (8 MB)", step: 1 },
    { from: "blocks", to: "store", label: "store by hash", step: 1 },
    { from: "client", to: "meta", label: "commit again, c9", step: 1 },
    { from: "meta", to: "db", label: "rev 8 + journal 9006, one tx", step: 1 },
    { from: "meta", to: "client", label: "rev 8, journal 9006", kind: "return", step: 1 },

    { from: "meta", to: "client", label: "reply lost", kind: "timeout", step: 2 },
    { from: "client", to: "meta", label: "retry commit, c9", step: 2 },
    { from: "meta", to: "db", label: "key c9 applied?", step: 2 },
    { from: "db", to: "meta", label: "yes: rev 8", kind: "return", step: 2 },
    { from: "meta", to: "client", label: "rev 8, journal 9006 again", kind: "return", step: 2 },
  ],
  steps: [{ title: "Commit, need blocks, upload, commit" }, { title: "The reply is lost: retry, same result" }],
};

export default spec;
