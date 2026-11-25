import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The alerting path (metrics-and-logging, Step 6 and Deep dive 3): an error spike pages on-call in about 40 s, and
// keeps paging when the dashboards and object storage are down.
// Steps: 1 the normal path: at 10:00:00 the error rate jumps; the agent's next batch lands at 10:00:10; the alert
// rule (errors > 5% for 15 s, evaluated every 15 s) sees 7.2% at 10:00:15 (pending) and 7.5% at 10:00:30 (firing);
// the notifier waits 10 s to group related alerts and pages at 10:00:40 · 2 the monitor under stress: the query tier
// is shed and object storage is down, but the rule reads the ingesters' memory in the same zone and still pages; a
// watchdog alert that always fires sends a heartbeat to a watcher outside the system; when the heartbeat stops for 3
// minutes, the watcher pages on its own.
// Working: worst case = 10 s (collection interval) + 5 s (ingest lag) + 15 s (evaluation interval) + 15 s (hold)
// + 10 s (group wait) + 5 s (delivery) = 60 s, the N2 budget; the example takes 40 s.
// Layout: six lanes. Colours (PATTERN_TONE, section tones only on lanes): host agent and on-call orange (traffic),
// ingesters violet (store), alert rules and notifier teal (compute), the watcher outside the system neutral (infra); the missed
// heartbeat is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "The alerting path, and who watches the monitor",
  lanes: [
    { id: "agent", label: "Host agent", icon: "server", tone: PATTERN_TONE.traffic },
    { id: "ing", label: "Ingesters", icon: "chart", tone: PATTERN_TONE.store },
    { id: "rules", label: "Alert rules", icon: "timer", tone: PATTERN_TONE.compute },
    { id: "notify", label: "Notifier", icon: "webhook", tone: PATTERN_TONE.compute },
    { id: "oncall", label: "On-call", icon: "bell", tone: PATTERN_TONE.traffic },
    { id: "watch", label: "Watcher", icon: "globe", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "agent", to: "ing", label: "batch at 10:00:10", step: 1 },
    { from: "rules", to: "ing", label: "10:00:15: errors > 5%?", step: 1 },
    { from: "ing", to: "rules", label: "7.2%: pending", kind: "return", step: 1 },
    { from: "rules", to: "ing", label: "10:00:30: errors > 5%?", step: 1 },
    { from: "ing", to: "rules", label: "7.5% for 15 s: firing", kind: "return", step: 1 },
    { from: "rules", to: "notify", label: "firing", step: 1 },
    { from: "notify", to: "oncall", label: "page at 10:00:40", step: 1 },

    { from: "rules", to: "ing", label: "same zone, from memory", step: 2 },
    { from: "ing", to: "rules", label: "firing", kind: "return", step: 2 },
    { from: "rules", to: "notify", label: "firing", step: 2 },
    { from: "notify", to: "oncall", label: "page", step: 2 },
    { from: "notify", to: "watch", label: "heartbeat stops", kind: "timeout", step: 2 },
    { from: "watch", to: "oncall", label: "3 min silent: page", step: 2 },
  ],
  notes: [
    { lane: "notify", text: "group wait 10 s", step: 1, at: 5.5 },
    { lane: "ing", text: "dashboards shed, object storage down", step: 2, at: 6.5 },
  ],
  steps: [{ title: "An error spike pages in 40 s" }, { title: "Storage down; the monitor dies" }],
};

export default spec;
