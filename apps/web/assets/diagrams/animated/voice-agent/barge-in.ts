import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { n } from "@/components/diagrams/presets/production";
import { BARGE_IN as BI, BUDGET } from "@/components/diagrams/presets/gcase-voice";

// Deep dive 1 of the voice-agent case study (design sheet §15.1 and the walk-through §9 step 5): the caller cuts in
// while the agent says "I've asked a colleague to approve your £42 refund". Which words were heard, and what happens
// to the write that was already sent.
// Working (BARGE_IN and BUDGET in presets/gcase-voice.ts):
//   - agent audio stops at the caller's ear BUDGET.bargeInStop ≈ 466 ms after the caller starts speaking, mouth to ear:
//     inbound leg 100 + detection 216 (median, vendor) + inference 30 + cancel and clear 20 + outbound leg 100;
//     drawn as "≈ 470 ms" (rounded to 10)
//   - the clear lands at the last playback mark, BI.playedMs = 1,300 ms into the sentence; audio already on the line is
//     still heard, so the caller heard 1,300 ms (nothing subtracted for audio in flight)
//   - synthesis word timings (illustrative): "I've" ends 350, "asked" 750, "a" 900, "colleague" 1,450; words ended by
//     1,300 ms are kept: "I've asked a…" (BI.heardText)
//   - request_refund was sent after the spoken yes, before this sentence; it stays pending_approval (over £30). The
//     next turn changes the remedy once, after a second spoken yes: the orchestrator (not the model) fires withdraw,
//     then request_reship.
// Steps: 1 the agent is speaking · 2 the caller speaks over it · 3 cancel and clear · 4 which words were heard ·
// 5 the write already sent stays pending · 6 next turn: one confirmed change of remedy.
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): Caller orange (user), Media server blue (audio
// frames), Orchestrator neutral (harness), Agent model green, Synthesis violet (audio, the store tone).

const stopMs = Math.round(BUDGET.bargeInStop / 10) * 10; // 466 → 470
const firstWords = BI.sentence.split(" ").slice(0, 3).join(" ");

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: the agent is speaking.
  m("orch", "tts", "sentence, gate passed", 1),
  m("tts", "orch", "audio + word timings", 1, "return"),
  m("orch", "media", "audio, playback marks", 1),
  m("media", "caller", `"${firstWords} colleague…"`, 1),

  // Step 2: the caller speaks over the agent.
  m("caller", "media", `"Actually, can I…"`, 2),
  m("media", "orch", "caller audio", 2),

  // Step 3: cancel everything that would keep talking.
  m("orch", "llm", "cancel", 3),
  m("orch", "tts", "cancel", 3),
  m("orch", "media", "clear playback", 3),

  // Step 4: which words were heard.
  m("media", "orch", `last mark: ${n(BI.playedMs)} ms`, 4, "return"),

  // Step 6: the next turn.
  m("orch", "llm", "turn + truncated history", 6),
  m("llm", "orch", "propose: cancel, reship", 6, "return"),
  m("orch", "caller", `"Shall I cancel the refund and send a new ${BRIGHTPOST.item}?"`, 6),
  m("caller", "orch", `"Yes"`, 6),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);
const lastOf = (step: number) => messages.length - 1 - [...messages].reverse().findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "orch", text: `Interruption model: speech, not "mm-hmm" or echo`, step: 2, at: lastOf(2) + 0.5 },
  { lane: "media", text: `Agent audio stops ≈ ${n(stopMs)} ms after the caller starts`, step: 3, at: lastOf(3) + 0.5 },
  {
    lane: "orch",
    text: `Words ended by ${n(BI.heardMs)} ms: ${BI.words
      .filter((w) => w.endMs <= BI.heardMs)
      .map((w) => `${w.word} ${n(w.endMs)}`)
      .join(", ")}; ${BI.words[BI.words.length - 1].word} ends ${n(BI.words[BI.words.length - 1].endMs)}`,
    step: 4,
    at: lastOf(4) + 0.4,
  },
  { lane: "orch", text: `History keeps "${BI.heardText}"`, step: 4, at: lastOf(4) + 0.6 },
  {
    lane: "orch",
    text: `request_refund was sent before: £${BRIGHTPOST.price} stays pending_approval`,
    step: 5,
    at: firstOf(6) - 0.2,
  },
  {
    lane: "orch",
    text: "After the yes, the orchestrator fires withdraw, then request_reship",
    step: 6,
    at: messages.length,
  },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Barge-in: keep only the words the caller heard, and change the remedy once",
  width: 880,
  lanes: [
    { id: "caller", label: "Caller", icon: "phone", tone: SEQUENCE_LANE.user },
    { id: "media", label: "Media server", icon: "media", tone: SEQUENCE_LANE.data },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "llm", label: "Agent model", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "tts", label: "Synthesis", icon: "radio", tone: SEQUENCE_LANE.store },
  ],
  steps: [
    { title: "The agent is speaking" },
    { title: "The caller speaks over it" },
    { title: "Cancel the reply, clear the playback" },
    { title: `Which words were heard: "${BI.heardText}"` },
    { title: "The write already sent stays pending" },
    { title: "Next turn: one confirmed change of remedy" },
  ],
  messages,
  notes,
};

export default spec;
