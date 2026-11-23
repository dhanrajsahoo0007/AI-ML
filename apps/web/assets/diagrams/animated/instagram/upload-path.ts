import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One photo from the phone to four stored sizes (instagram, Step 2 and Deep dive 3).
// Steps: 1 the happy path: the app creates the post with an idempotency key; the post service inserts a pending row
// and returns the id with a signed upload URL; the app sends the 2 MB original straight to the blob store (through
// the CDN edge, not drawn); the blob store's "object created" event lands on the resize queue; a worker writes four
// sizes, marks the post ready and acks · 2 a worker dies after two of four sizes; its ack never comes (the red
// arrow), so the job is visible again after the queue's 60 s timeout; the next worker writes all four sizes under the
// same keys and marks the row ready again, which changes nothing · 3 the app's create call timed out and is retried
// with the same key: the post service finds the key and returns the same post and URL, so no second post appears.
// Working: original 2 MB; sizes 150, 320, 640 and 1080 px at about 10 + 30 + 100 + 250 = 390 KB; a visibility
// timeout of 60 s is about 20 × a 3 s resize, so a slow worker is rarely mistaken for a dead one.
// Layout: six lanes. Colours (PATTERN_TONE): the app orange (traffic), the post service and resize worker teal
// (compute), the posts DB and blob store violet (stores), the resize queue neutral (plumbing); the crash is the red
// timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Upload a photo: signed URL, resize off the request path, safe retries",
  lanes: [
    { id: "app", label: "App", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "post", label: "Post service", icon: "image", tone: PATTERN_TONE.compute },
    { id: "db", label: "Posts DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "blob", label: "Blob store", icon: "blob", tone: PATTERN_TONE.store },
    { id: "queue", label: "Resize queue", icon: "queue", tone: PATTERN_TONE.infra },
    { id: "worker", label: "Resize worker", icon: "workers", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "app", to: "post", label: "create post, key k7", step: 1 },
    { from: "post", to: "db", label: "INSERT pending", step: 1 },
    { from: "db", to: "post", label: "post id", kind: "return", step: 1 },
    { from: "post", to: "app", label: "id + signed PUT URL", kind: "return", step: 1 },
    { from: "app", to: "blob", label: "PUT original, 2 MB", step: 1 },
    { from: "blob", to: "queue", label: "object created", kind: "async", step: 1 },
    { from: "queue", to: "worker", label: "job: post id", step: 1 },
    { from: "worker", to: "blob", label: "write 4 sizes", step: 1 },
    { from: "worker", to: "db", label: "status = ready", step: 1 },
    { from: "worker", to: "queue", label: "ack", kind: "return", step: 1 },

    { from: "queue", to: "worker", label: "job: post id", step: 2 },
    { from: "worker", to: "blob", label: "2 of 4 sizes", step: 2 },
    { from: "worker", to: "queue", label: "no ack: worker died", kind: "timeout", step: 2 },
    { from: "queue", to: "worker", label: "same job, 60 s later", step: 2 },
    { from: "worker", to: "blob", label: "4 sizes, same keys", step: 2 },
    { from: "worker", to: "db", label: "ready (already set: no-op)", step: 2 },
    { from: "worker", to: "queue", label: "ack", kind: "return", step: 2 },

    { from: "app", to: "post", label: "retry create, key k7", step: 3 },
    { from: "post", to: "db", label: "find key k7", step: 3 },
    { from: "db", to: "post", label: "post exists", kind: "return", step: 3 },
    { from: "post", to: "app", label: "same id, same URL", kind: "return", step: 3 },
  ],
  notes: [{ lane: "app", text: "own post shown at once", step: 1, at: 4.5 }],
  steps: [
    { title: "Upload, then resize off the request path" },
    { title: "A worker dies mid-job" },
    { title: "A retried create returns the same post" },
  ],
};

export default spec;
