import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One SWIM protocol period that finds a dead node, then suspicion and confirmation (gossip-and-failure-detection,
// Architecture).
// Four steps: 1 A pings B, its probe target this period; no ack within the 500 ms probe timeout · 2 A asks C and D to
// ping B for it (ping-req); neither gets an ack, so A has none by the end of the 1 s period · 3 A marks B suspect and
// the suspicion rides on the pings and acks A sends anyway; every node that hears it starts a suspicion timer · 4 B
// does not refute before the timer runs out, so it is declared dead and that news spreads the same way.
// Working (memberlist DefaultLANConfig, illustrative cluster of 1,000 nodes): probe interval 1 s, probe timeout 500 ms;
// suspicion timeout = SuspicionMult 4 × max(1, log10 1,000 = 3) × 1 s = 12 s. The figure shows k = 2 helpers (C and
// D) to keep it narrow; memberlist's default IndirectChecks is 3.
// Layout: five lanes. Colours (PATTERN_TONE): the healthy nodes teal (compute), node B red (it has failed), the rest
// of the cluster neutral; lost pings are timeouts.
// Fact check (2026-11-16): SWIM (DSN 2002) §3.1 ping, ping-req to k random members, end of protocol period; §4.2
// Suspect, Alive and Confirm messages with incarnation numbers; §4.1 piggybacked dissemination. memberlist config.go
// DefaultLANConfig: ProbeInterval 1 s, ProbeTimeout 500 ms, IndirectChecks 3, SuspicionMult 4; util.go
// suspicionTimeout = SuspicionMult × max(1, log10 n) × ProbeInterval.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "SWIM: a missed ping, indirect probes, suspect, then dead",
  width: 820,
  lanes: [
    { id: "a", label: "Node A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "b", label: "Node B", icon: "server", tone: PATTERN_TONE.fail },
    { id: "c", label: "Node C", icon: "server", tone: PATTERN_TONE.compute },
    { id: "d", label: "Node D", icon: "server", tone: PATTERN_TONE.compute },
    { id: "rest", label: "Other nodes", icon: "workers", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "a", to: "b", label: "ping (no ack in 500 ms)", kind: "timeout", step: 1 },

    { from: "a", to: "c", label: "ping-req B", step: 2 },
    { from: "a", to: "d", label: "ping-req B", step: 2 },
    { from: "c", to: "b", label: "ping", kind: "timeout", step: 2 },
    { from: "d", to: "b", label: "ping", kind: "timeout", step: 2 },
    { from: "a", to: "a", label: "1 s period ends: no ack", kind: "note", step: 2 },

    { from: "a", to: "c", label: "ping + “B suspect”", kind: "async", step: 3 },
    { from: "c", to: "rest", label: "ack, ping + “B suspect”", kind: "async", step: 3 },
    { from: "d", to: "rest", label: "each node starts a 12 s timer", kind: "note", step: 3 },

    { from: "a", to: "a", label: "12 s, no refutation", kind: "note", step: 4 },
    { from: "a", to: "d", label: "ping + “B dead”", kind: "async", step: 4 },
    { from: "d", to: "rest", label: "ping + “B dead”", kind: "async", step: 4 },
  ],
  steps: [
    { title: "A pings B: no ack" },
    { title: "C and D probe B for A" },
    { title: "A marks B suspect" },
    { title: "No refutation: B is dead" },
  ],
};

export default spec;
