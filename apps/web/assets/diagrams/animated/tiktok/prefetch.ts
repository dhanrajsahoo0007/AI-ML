import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The next page arrives before it is needed, and a retry never repeats or skips a video (tiktok, Deep dive 3).
// Two steps: 1 with 3 videos left in the app's queue, it asks for the next page with cursor c7 and the ids it has
// just shown; the feed service drops candidates the seen filter knows, records the 10 it serves, and returns page c8;
// the app fetches the first 1 MB of the next two videos from the CDN, so a swipe plays from the phone's buffer ·
// 2 the response is lost; the app retries with the same cursor c7 and gets the same page c8, which the feed service
// kept for 5 minutes keyed by the cursor, so no video is repeated or skipped.
// Working (round numbers chosen for this design): 3 videos left × 20 s average watch = 60 s before the queue runs
// dry, against a 250 ms page (N2). 1 MB at 1.5 Mbps (187.5 KB/s) is about 5.3 s of video, enough to start at once.
// Retrieval brings 2,000 candidates; the filter drops about 500 of them, 25 %, as in tiktok/funnel.
// Layout: four lanes. Colours (PATTERN_TONE): the app orange (traffic), the feed service teal (compute), the seen
// filter violet (store), the CDN neutral (plumbing); the lost response is the red timeout.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Prefetch the next page and the next videos; a retry gets the same page",
  lanes: [
    { id: "app", label: "Viewer app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "feed", label: "Feed service", icon: "feed", tone: PATTERN_TONE.compute },
    { id: "seen", label: "Seen filter", icon: "hash", tone: PATTERN_TONE.store },
    { id: "cdn", label: "CDN", icon: "cdn", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "app", to: "feed", label: "3 left: GET c7 + shown ids", step: 1 },
    { from: "feed", to: "seen", label: "check 2,000 candidates", step: 1 },
    { from: "seen", to: "feed", label: "500 seen: drop", kind: "return", step: 1 },
    { from: "feed", to: "seen", label: "add the 10 served", kind: "async", step: 1 },
    { from: "feed", to: "app", label: "page c8: 10 videos", kind: "return", step: 1 },
    { from: "app", to: "cdn", label: "first 1 MB of next 2", step: 1 },
    { from: "cdn", to: "app", label: "segments", kind: "return", step: 1 },

    { from: "feed", to: "app", label: "page c8 lost", kind: "timeout", step: 2 },
    { from: "app", to: "feed", label: "retry: cursor c7", step: 2 },
    { from: "feed", to: "app", label: "same page c8 (kept 5 min)", kind: "return", step: 2 },
  ],
  notes: [{ lane: "app", text: "swipe: plays from buffer", step: 1, at: 6.5 }],
  steps: [{ title: "Fetch ahead, then prefetch the start" }, { title: "Lost response: same cursor, same page" }],
};

export default spec;
