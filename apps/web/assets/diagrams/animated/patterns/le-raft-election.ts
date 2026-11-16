import type { SequenceSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A Raft election in a three-node stock group in London (leader-election, Architecture).
// Four steps: 1 leader A, term 4, replicates a kettle reservation to B and C, then crashes · 2 B's randomised election
// timer fires first (210 ms of silence, drawn from 150–300 ms); B moves to term 5, becomes a candidate and votes for
// itself · 3 B asks C for a vote; C's last log entry (term 4, index 812) is no newer than B's, so C grants it: 2 of
// 3 is a majority · 4 B leads term 5: it commits a no-op entry, takes the retried reservation, and rejects A's stale
// term-4 message when A restarts, so A steps down to follower.
// Working (illustrative): B's timeout 210 ms and C's 280 ms are two draws from 150–300 ms; majority of 3 = 2; index
// 812 is an illustrative log position.
// Layout: four lanes (Order service, A, B, C) so the vote is between neighbours.
// Colours (PATTERN_TONE): the order service orange (traffic), the three nodes teal (compute); the crash is the red
// timeout arrow.
// Fact check (2026-11-16, Ongaro & Ousterhout, Raft paper §5.2, §5.4.1, §8): a follower that hears nothing for an
// election timeout increments its term, becomes a candidate, votes for itself and sends RequestVote in parallel;
// each server votes for at most one candidate per term, first come first served; a candidate with votes from a
// majority becomes leader; timeouts are randomised, e.g. 150–300 ms; a voter denies its vote if its own log is more
// up to date (later last term, or same term and longer); a server that sees a higher term reverts to follower and
// rejects requests with a stale term; a new leader commits a blank no-op entry at the start of its term.

const reserve = `reserve ${FLASH_SALE.item}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A Raft election: timeout, candidate, votes, leader",
  lanes: [
    { id: "o", label: "Order service", icon: "api", tone: PATTERN_TONE.traffic },
    { id: "a", label: "Node A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "b", label: "Node B", icon: "server", tone: PATTERN_TONE.compute },
    { id: "c", label: "Node C", icon: "server", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "o", to: "a", label: reserve, step: 1 },
    { from: "a", to: "b", label: "append 4/812, term 4", step: 1 },
    { from: "a", to: "c", label: "append 4/812, term 4", step: 1 },
    { from: "a", to: "o", label: "reserved (2 of 3 stored)", kind: "return", step: 1 },
    { from: "a", to: "b", label: "heartbeat (A crashed)", kind: "timeout", step: 1, duration: 1.6 },

    { from: "b", to: "b", label: "210 ms silent: term 5", kind: "note", step: 2 },
    { from: "b", to: "b", label: "candidate, votes for itself", kind: "note", step: 2 },

    { from: "b", to: "c", label: "vote? term 5, last 4/812", step: 3 },
    { from: "b", to: "c", label: "C: my last is 4/812, not newer", kind: "note", step: 3 },
    { from: "c", to: "b", label: "yes: 2 of 3", kind: "return", step: 3 },

    { from: "b", to: "c", label: "append no-op, term 5", step: 4 },
    { from: "c", to: "b", label: "ok: committed", kind: "return", step: 4 },
    { from: "o", to: "b", label: `${reserve} (retry)`, step: 4 },
    { from: "b", to: "o", label: "reserved", kind: "return", step: 4 },
    { from: "a", to: "b", label: "restarts: append, term 4", step: 4 },
    { from: "b", to: "a", label: "rejected: term 5", kind: "return", step: 4 },
  ],
  steps: [
    { title: "Leader A replicates, then crashes" },
    { title: "B times out first: term 5" },
    { title: "C checks B's log and votes yes" },
    { title: "B leads term 5; A steps down" },
  ],
};

export default spec;
