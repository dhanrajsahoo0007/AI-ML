import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Telling Ben about the match (tinder, Step 6 and "Real-time push").
// Two steps: 1 online: the match notifier reads the match event, looks up Ben's socket in the session store (gateway
// 7), and sends a nudge with no data in it; Ben's app fetches the change over the normal API, from a cursor, so a
// lost nudge costs a little delay, never a lost match · 2 offline: the session store has no socket for Ben, so the
// notifier sends a mobile push through the platform's push service; when Ben opens the app it fetches from the same
// cursor.
// Working: 350 matches/s on average, 870/s at peak (30,000,000 a day, × 2.5); 2 people per match, so 1,740 nudges or
// pushes a second at peak.
// Layout: six lanes. Colours (PATTERN_TONE): the notifier, the gateway and the match API teal (compute), the session
// store violet (store), the push service neutral (infra), Ben orange (traffic).

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A match reaches Ben: nudge, then fetch",
  lanes: [
    { id: "notif", label: "Match notifier", icon: "bell", tone: PATTERN_TONE.compute },
    { id: "sess", label: "Session store", icon: "registry", tone: PATTERN_TONE.store },
    { id: "sock", label: "Gateway 7", icon: "signal", tone: PATTERN_TONE.compute },
    { id: "push", label: "Mobile push", icon: "bell", tone: PATTERN_TONE.infra },
    { id: "ben", label: "Ben's app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "api", label: "Match API", icon: "api", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "notif", to: "sess", label: "where is Ben?", step: 1 },
    { from: "sess", to: "notif", label: "gateway 7", kind: "return", step: 1 },
    { from: "notif", to: "sock", label: "nudge Ben", step: 1 },
    { from: "sock", to: "ben", label: "nudge: updates", kind: "async", step: 1 },
    { from: "ben", to: "api", label: "GET updates since c41", step: 1 },
    { from: "api", to: "ben", label: "match Ana, cursor c42", kind: "return", step: 1 },

    { from: "notif", to: "sess", label: "where is Ben?", step: 2 },
    { from: "sess", to: "notif", label: "no socket", kind: "return", step: 2 },
    { from: "notif", to: "push", label: "push: new match", step: 2 },
    { from: "push", to: "ben", label: "notification", kind: "async", step: 2 },
    { from: "ben", to: "api", label: "app opens: since c41", step: 2 },
    { from: "api", to: "ben", label: "match Ana, cursor c42", kind: "return", step: 2 },
  ],
  steps: [{ title: "Online: a nudge, then a fetch" }, { title: "Offline: a mobile push, then a fetch" }],
};

export default spec;
