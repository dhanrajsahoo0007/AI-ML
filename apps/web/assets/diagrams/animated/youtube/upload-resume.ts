import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A resumable upload that survives a dropped connection (youtube case study, Step 2).
// Two steps: 1 the creator app asks the upload service for a session, gets a session URL, and sends 16 MB chunks
// straight to the blob store; the link drops during chunk 31 · 2 the app asks the store how many bytes it holds,
// resumes from that offset, and the last chunk completes the object; the store tells the upload service, which starts
// the transcode workflow and shows the creator "processing".
// Working (round numbers chosen to size the system): a 20-minute 1080p original at 8 Mb/s = 1 MB/s × 1,200 s =
// 1,200 MB; 1,200 ÷ 16 = 75 chunks; 30 chunks stored = 30 × 16 = 480 MB; the resume sends 45 × 16 = 720 MB, not
// 1,200 MB.
// Layout: four lanes. Colours (PATTERN_TONE, section tones only): the creator orange (traffic), the upload service
// teal (compute), the blob store violet (store), the transcode workflow green (the part this design adds); the lost
// chunk is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A resumable upload: drop, ask, resume",
  lanes: [
    { id: "app", label: "Creator app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "up", label: "Upload service", icon: "file", tone: PATTERN_TONE.compute },
    { id: "blob", label: "Blob store", icon: "blob", tone: PATTERN_TONE.store },
    { id: "wf", label: "Transcode flow", icon: "workflow", tone: PATTERN_TONE.pattern },
  ],
  messages: [
    { from: "app", to: "up", label: "start: 1,200 MB, title", step: 1 },
    { from: "up", to: "app", label: "session URL, video id", kind: "return", step: 1 },
    { from: "app", to: "blob", label: "chunks 1 to 30 (480 MB)", step: 1 },
    { from: "blob", to: "app", label: "stored", kind: "return", step: 1 },
    { from: "app", to: "blob", label: "chunk 31: link drops", kind: "timeout", step: 1 },

    { from: "app", to: "blob", label: "how many bytes?", step: 2 },
    { from: "blob", to: "app", label: "0 to 480 MB", kind: "return", step: 2 },
    { from: "app", to: "blob", label: "chunks 31 to 75 (720 MB)", step: 2 },
    { from: "blob", to: "up", label: "object complete", kind: "async", step: 2 },
    { from: "up", to: "wf", label: "start transcode", step: 2 },
    { from: "up", to: "app", label: "status: processing", kind: "return", step: 2 },
  ],
  steps: [{ title: "Send chunks; the link drops" }, { title: "Ask the offset, resume, complete" }],
};

export default spec;
