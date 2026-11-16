import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A direct multipart upload with presigned URLs (blob-storage-and-chunking, the first figure). A Brightpost seller
// uploads an 800 MB demonstration video of the kettle; the bytes never pass through the upload API.
//
// Three steps: 1 the app asks to upload; the API writes a pending row, starts a multipart upload, signs 50 part URLs
// (no call to the store: signing is local) and the app sends parts 1 to 30 · 2 the connection drops during part 31;
// the app asks to resume, the API lists the parts the store holds (1 to 30) and signs 20 fresh URLs; the app sends
// parts 31 to 50 · 3 the app reports the 50 ETags, the API completes the upload and marks the row ready.
// Working (illustrative sizes): 800 MB ÷ 16 MB parts = 50 parts; 30 parts = 480 MB already stored; the resume sends
// 20 × 16 MB = 320 MB. The 15-minute URL lifetime is an illustrative choice.
//
// Layout: four lanes. Colours (PATTERN_TONE): the seller app orange (traffic), the upload API teal (compute), the
// metadata database and the object store violet (stores); the lost part is the red timeout.
// Fact check (2026-11-16, Amazon S3 user guide): a presigned URL carries the permissions of the principal who signed
// it, can be used many times until it expires, and lasts up to 7 days from the CLI or SDKs; multipart parts are
// 5 MiB to 5 GiB (the last part may be smaller), at most 10,000 per upload; ListParts returns the parts uploaded.

const PART_MB = 16;
const FILE_MB = 800;
const parts = FILE_MB / PART_MB; // 50
const sent = 30;
const left = parts - sent; // 20

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A direct multipart upload with presigned URLs",
  width: 820,
  lanes: [
    { id: "app", label: "Seller app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "api", label: "Upload API", icon: "server", tone: PATTERN_TONE.compute },
    { id: "db", label: "Metadata DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "store", label: "Object store", icon: "blob", tone: PATTERN_TONE.store },
  ],
  messages: [
    // Step 1: ask, sign, send the first parts.
    { from: "app", to: "api", label: `start: video, ${FILE_MB} MB`, step: 1 },
    { from: "api", to: "db", label: "row: pending", step: 1 },
    { from: "api", to: "store", label: "start multipart upload", step: 1 },
    { from: "store", to: "api", label: "upload id u7", kind: "return", step: 1 },
    { from: "api", to: "app", label: `u7 + ${parts} signed part URLs`, kind: "return", step: 1 },
    { from: "app", to: "store", label: `PUT parts 1 to ${sent} (${PART_MB} MB each)`, step: 1 },
    { from: "store", to: "app", label: "an ETag per part", kind: "return", step: 1 },

    // Step 2: the link drops; resume from the store's own list.
    { from: "app", to: "store", label: `PUT part ${sent + 1}: link lost`, kind: "timeout", step: 2 },
    { from: "app", to: "api", label: "resume u7", step: 2 },
    { from: "api", to: "store", label: "list parts of u7", step: 2 },
    { from: "store", to: "api", label: `parts 1 to ${sent}`, kind: "return", step: 2 },
    { from: "api", to: "app", label: `${left} fresh URLs`, kind: "return", step: 2 },
    { from: "app", to: "store", label: `PUT parts ${sent + 1} to ${parts}`, step: 2 },

    // Step 3: complete and mark ready.
    { from: "app", to: "api", label: `done: ${parts} ETags`, step: 3 },
    { from: "api", to: "store", label: "complete u7", step: 3 },
    { from: "store", to: "api", label: "one object", kind: "return", step: 3 },
    { from: "api", to: "db", label: "row: ready", step: 3 },
  ],
  notes: [{ lane: "api", text: "signs locally, 15 min", step: 1, at: 3.5 }],
  steps: [
    { title: "Ask, sign, send the parts" },
    { title: "The link drops: resume at part 31" },
    { title: "Complete and mark ready" },
  ],
};

export default spec;
