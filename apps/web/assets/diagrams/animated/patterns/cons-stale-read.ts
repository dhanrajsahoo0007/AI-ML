import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A read from a lagging replica, then read-your-writes with a version token (consistency-models, the Architecture
// figure). A shopper changes their delivery address and reloads the page one second later; the follower is two
// seconds behind the leader (illustrative lag).
// Two steps: 1 the write goes to the leader, the reload is served by the follower, which still has the old address ·
// 2 the session carries the write's log position (LSN 4471); the follower has not reached it, so the app reads from
// the leader and the shopper sees the new address.
// Layout: four lanes. Colours (PATTERN_TONE): shopper orange (traffic), app server teal (compute), leader and follower
// violet (stores).
// Fact check (2026-11-16): PostgreSQL exposes a standby's replayed position with pg_last_wal_replay_lsn(), which an app
// can compare with the LSN of its write; MongoDB's causally consistent sessions give read-your-writes with majority read
// and write concern.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A stale read from a follower, and read-your-writes",
  lanes: [
    { id: "shopper", label: "Shopper", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "app", label: "App server", icon: "server", tone: PATTERN_TONE.compute },
    { id: "leader", label: "Leader", icon: "database", tone: PATTERN_TONE.store },
    { id: "follower", label: "Follower", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "shopper", to: "app", label: "save new address", step: 1 },
    { from: "app", to: "leader", label: "UPDATE address", step: 1 },
    { from: "leader", to: "app", label: "ok, LSN 4471", kind: "return", step: 1 },
    { from: "leader", to: "follower", label: "replicate (2 s lag)", kind: "async", step: 1 },
    { from: "shopper", to: "app", label: "reload after 1 s", step: 1 },
    { from: "app", to: "follower", label: "SELECT address", step: 1 },
    { from: "follower", to: "app", label: "old address", kind: "return", step: 1 },

    { from: "shopper", to: "app", label: "reload, token LSN 4471", step: 2 },
    { from: "app", to: "follower", label: "replayed past 4471?", step: 2 },
    { from: "follower", to: "app", label: "not yet", kind: "return", step: 2 },
    { from: "app", to: "leader", label: "SELECT address", step: 2 },
    { from: "leader", to: "app", label: "new address", kind: "return", step: 2 },
  ],
  notes: [{ lane: "follower", text: "2 s behind", step: 1, at: 6.5 }],
  steps: [{ title: "Read from a follower: the old address" }, { title: "Carry a version: read your own write" }],
};

export default spec;
