import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The exit gate with and without the network (parking-garage, Step 6 and Deep dive 3).
// Two steps: 1 online: the camera reads the plate; the controller prices the stay from its cached rate table, takes
// the card, appends exit event e-9041 to its local log (fsync) and opens the barrier; the upload to the sync service
// happens after, and the sync service inserts the event only if (garage, event id) is new, then acks up to 9041 ·
// 2 the link is down: the controller decides exactly the same way, the card terminal stores the payment, the upload
// gets no answer (red); when the link returns 40 minutes later the controller replays 9042 to 9101; the sync service
// skips ids it has already seen and acks up to 9101, so a replayed event is never applied twice.
// Working: a 500-space garage at its peak has about 375 entries an hour; 40 minutes offline is about 60 exits in the
// replay here (9042 to 9101 = 60 events), uploaded in one batch of up to 500.
// Layout: five lanes. Colours (PATTERN_TONE): the driver orange (traffic), the controller teal (compute), the local
// log and the garage DB violet (stores), the sync service green (the part this figure is about); the unanswered
// upload is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "The exit gate online and offline",
  lanes: [
    { id: "driver", label: "Driver", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "ctrl", label: "Controller", icon: "controller", tone: PATTERN_TONE.compute },
    { id: "log", label: "Local log", icon: "log", tone: PATTERN_TONE.store },
    { id: "sync", label: "Sync service", icon: "api", tone: PATTERN_TONE.pattern },
    { id: "db", label: "Garage DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "driver", to: "ctrl", label: "plate read, card", step: 1 },
    { from: "ctrl", to: "log", label: "append e-9041, fsync", step: 1 },
    { from: "ctrl", to: "driver", label: "$12 paid, barrier opens", kind: "return", step: 1 },
    { from: "ctrl", to: "sync", label: "upload e-9041", kind: "async", step: 1 },
    { from: "sync", to: "db", label: "insert if new", step: 1 },
    { from: "sync", to: "ctrl", label: "acked up to 9041", kind: "return", step: 1 },

    { from: "driver", to: "ctrl", label: "plate read, card", step: 2 },
    { from: "ctrl", to: "log", label: "append e-9042, card stored", step: 2 },
    { from: "ctrl", to: "driver", label: "$12 paid, barrier opens", kind: "return", step: 2 },
    { from: "ctrl", to: "sync", label: "upload e-9042: no link", kind: "timeout", step: 2 },
    { from: "ctrl", to: "sync", label: "40 min later: replay 9042 to 9101", step: 2 },
    { from: "sync", to: "db", label: "insert new, skip seen ids", step: 2 },
    { from: "sync", to: "ctrl", label: "acked up to 9101", kind: "return", step: 2 },
  ],
  steps: [{ title: "Online: decide locally, upload after" }, { title: "Link down: same decision, replay later" }],
};

export default spec;
