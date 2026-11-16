import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two gateways share one counter for key k42 (rate-limiting, Distributed counters).
// Two steps: 1 read, then write: gateway A and gateway B both GET the counter while it reads 99, both see room under
// the limit of 100, both allow and both SET 100; two requests pass but the count rises by one · 2 one atomic script:
// each gateway sends one script that runs INCR (and EXPIRE on the first hit); Redis runs scripts one at a time, so A
// gets 100 (allow) and B gets 101 (reject, 429 with Retry-After).
// Working: limit 100 a minute; before the race the count is 99; read-then-write lets 101 through and stores 100;
// the script stores 101 and rejects the 101st. Retry-After 30 s is illustrative (seconds left in the window).
// Layout: four lanes. Colours (PATTERN_TONE): the client orange (traffic), the gateways teal (compute), the counter
// store violet (store); the lost update is a note.
// Fact check (2026-11-16, Redis docs): INCR is O(1) on a 64-bit signed integer; the INCR page's rate-limiter pattern
// fixes its INCR-then-EXPIRE race with a Lua script; "Redis guarantees the script's atomic execution" and blocks all
// server activity while it runs.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two gateways race on one counter",
  lanes: [
    { id: "client", label: "Client k42", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "a", label: "Gateway A", icon: "gateway", tone: PATTERN_TONE.compute },
    { id: "b", label: "Gateway B", icon: "gateway", tone: PATTERN_TONE.compute },
    { id: "r", label: "Counter store", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "client", to: "a", label: "request 100", step: 1 },
    { from: "client", to: "b", label: "request 101", step: 1 },
    { from: "a", to: "r", label: "GET k42", step: 1 },
    { from: "r", to: "a", label: "99", kind: "return", step: 1 },
    { from: "b", to: "r", label: "GET k42", step: 1 },
    { from: "r", to: "b", label: "99", kind: "return", step: 1 },
    { from: "a", to: "r", label: "SET k42 100", step: 1 },
    { from: "b", to: "r", label: "SET k42 100", step: 1 },
    { from: "a", to: "r", label: "101 allowed, count says 100", kind: "note", step: 1 },

    { from: "client", to: "a", label: "request 100", step: 2 },
    { from: "client", to: "b", label: "request 101", step: 2 },
    { from: "a", to: "r", label: "EVALSHA incr + expire", step: 2 },
    { from: "r", to: "a", label: "100: allow", kind: "return", step: 2 },
    { from: "b", to: "r", label: "EVALSHA incr + expire", step: 2 },
    { from: "r", to: "b", label: "101: reject", kind: "return", step: 2 },
    { from: "b", to: "client", label: "429, Retry-After: 30", kind: "return", step: 2 },
  ],
  steps: [{ title: "Read, then write: both allow" }, { title: "One atomic script: one rejects" }],
};

export default spec;
