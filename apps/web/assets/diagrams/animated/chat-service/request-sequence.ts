import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { CAPACITY, HARDWARE, LATENCY, POOLS, STREAM, TURN50 } from "@/components/diagrams/presets/gcase-chat";

// Turn 50 of the example chat c_8f2a, fast, prefix on its home unit (chatgpt-style-chat-service, design sheet §9
// walk-through, §6 rules and deep dive 5; preset presets/gcase-chat.ts). Steps:
//   1 A turn with affinity: POST with an Idempotency-Key → the plan from the signed session token and the token
//     bucket → in parallel the input screen, the turn router (P = 0.07 → fast), the conversation cache (summary of
//     1–40, turns 41–49) and recall → the inference router hashes c_8f2a to its home prefill unit p-0412, whose block
//     cache holds the TURN50.cachedIfHit = 13,700-token prefix; it computes TURN50.newTokens = 450 tokens in
//     CAPACITY.turn50.hitPrefillMs ≈ 9 ms of work after LATENCY.prefillWaitSmall.p50 ≈ 41 ms in the small-job queue
//     (work included) → TURN50.total = 14,150 tokens of KV (14,150 × 35,136 B ≈ 0.50 GB) to decode rack d-07 in
//     CAPACITY.turn50.transferMs ≈ 1.2 ms → numbered events, each also appended to the resume buffer → 452 tokens at
//     60 a second → the reply is stored in-region (quorum) before `done` (event 151).
//   2 A drop and resume from another device: the laptop drops after event 80; generation continues for the
//     STREAM.graceSec = 10 s grace (a fast answer has STREAM.fastRemainingSec = 3.75 s left, so it finishes); the
//     phone asks with Last-Event-ID: 80 and the gateway replays 81–151 from the buffer (kept 10 minutes after the
//     end). Same region only: after a region failover the buffer is gone and the client reloads the stored message.
//   3 A stop that reaches the engine, then an edit that forks a branch: the cancel is idempotent, takes a queued turn
//     out of the prefill queue or stops the decode sequence and frees its KV blocks; the partial reply is stored with
//     status cancelled. Stops and dropped reasoning turns free STREAM.savedGpusAverage ≈ 58 GPUs of capacity on
//     average. The edit posts with an earlier parent (m_47b): a sibling branch, `current_leaf` moved by a conditional
//     update, the summary chosen for that branch point; the prefix up to turn 46 still hits.
// Lanes (SEQUENCE_LANE, section tones only, labels ≤ 15 characters): User app orange (user), Gateway teal (check:
// auth, idempotency, limits), Orchestrator neutral (harness), Hot state violet (store), Prefill unit and Decode rack
// green (models). Ids (c_8f2a, m_49b, r_77, p-0412, d-07) are the sheet's illustrative ones.

const gb = (tokens: number) => ((tokens * HARDWARE.model.kvBytesPerToken) / 1e9).toFixed(2);
const T = CAPACITY.turn50;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: a turn with affinity.
  m("user", "gateway", "POST turn 50, Idempotency-Key", 1),
  m("gateway", "orch", "plan from signed token; bucket ok", 1),
  m("orch", "hot", "conversation cache", 1),
  m("hot", "orch", "summary 1–40, turns 41–49", 1, "return"),
  m("orch", "prefill", `hash c_8f2a → p-0412; ${TURN50.newTokens} new`, 1),
  m("prefill", "decode", `${n(TURN50.total)} tokens of KV (${gb(TURN50.total)} GB)`, 1),
  m("decode", "orch", "first step: 1.7 tokens", 1, "return"),
  m("orch", "user", "id 1 message.created, id 2 delta …", 1, "return"),
  m("orch", "hot", "every event to the resume buffer", 1, "async"),
  m("orch", "user", "id 151 done, once stored (quorum)", 1, "return"),

  // Step 2: the laptop drops; the phone resumes from event 81.
  m("gateway", "user", "laptop connection drops after id 80", 2, "timeout"),
  m("decode", "orch", `keeps generating: ${STREAM.graceSec} s grace`, 2, "return"),
  m("orch", "hot", "events 81–151 buffered", 2, "async"),
  m("user", "gateway", "phone: GET events, Last-Event-ID: 80", 2),
  m("gateway", "hot", "read from 81", 2),
  m("hot", "gateway", "events 81–151", 2, "return"),
  m("gateway", "user", "replayed; no regeneration", 2, "return"),

  // Step 3: stop reaches the engine; an edit forks a branch.
  m("user", "gateway", "Stop: POST cancel r_78", 3),
  m("gateway", "orch", "cancel (idempotent)", 3),
  m("orch", "prefill", "still queued? leave the queue", 3),
  m("orch", "decode", "stop the sequence; free KV blocks", 3),
  m("orch", "user", "stored: status cancelled", 3, "return"),
  m("user", "gateway", "edit turn 47: POST, parent m_47b", 3),
  m("gateway", "orch", "new sibling branch", 3),
  m("orch", "prefill", "prefix to turn 46 still hits", 3),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  {
    lane: "orch",
    text: "in parallel: input screen, router 0.07 → fast, recall",
    step: 1,
    at: firstOf(1) + 3.5,
  },
  {
    lane: "prefill",
    text: `${n(TURN50.cachedIfHit)} cached; queue ≈ ${Math.round(LATENCY.prefillWaitSmall.p50)} ms, work ${Math.round(T.hitPrefillMs)} ms`,
    step: 1,
    at: firstOf(1) + 4.5,
  },
  {
    lane: "decode",
    text: `RDMA ${T.transferMs.toFixed(1)} ms; ${POOLS.fastSpeed} tokens a second`,
    step: 1,
    at: firstOf(1) + 5.5,
  },
  {
    lane: "decode",
    text: `${STREAM.fastRemainingSec} s left: the answer finishes`,
    step: 2,
    at: firstOf(2) + 1.5,
  },
  {
    lane: "hot",
    text: "kept 10 min after the end; not across a region failover",
    step: 2,
    at: firstOf(2) + 5.5,
  },
  {
    lane: "orch",
    text: `stops and drops free ≈ ${Math.round(STREAM.savedGpusAverage)} GPUs of capacity on average`,
    step: 3,
    at: firstOf(3) + 4.5,
  },
  {
    lane: "orch",
    text: "current_leaf moved by a conditional update",
    step: 3,
    at: firstOf(3) + 6.5,
  },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: `Turn 50 on its home unit, a dropped stream resumed from the buffer, and a stop that reaches the engine`,
  width: 1000,
  lanes: [
    { id: "user", label: "User app", icon: "browser", tone: SEQUENCE_LANE.user },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.check },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "hot", label: "Hot state", icon: "cache", tone: SEQUENCE_LANE.store },
    { id: "prefill", label: "Prefill unit", icon: "gpu", tone: SEQUENCE_LANE.model },
    { id: "decode", label: "Decode rack", icon: "gpu", tone: SEQUENCE_LANE.model },
  ],
  steps: [
    { title: `A turn with affinity: ${n(TURN50.cachedIfHit)} tokens cached, ${TURN50.newTokens} computed` },
    { title: "The laptop drops; the phone replays from event 81" },
    { title: "Stop reaches the engine; an edit forks a branch" },
  ],
  messages,
  notes,
};

export default spec;
