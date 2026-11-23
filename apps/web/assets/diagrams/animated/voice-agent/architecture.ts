import type { DiagramSpec } from "@/components/diagrams/types";
import { HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { ZONE } from "@/components/diagrams/presets/case-study";
import { BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { BUDGET } from "@/components/diagrams/presets/gcase-voice";

// Brightpost's phone line: a voice agent for the support line, built one requirement at a time (hero of the "Design a
// Voice Agent for a Call Centre" case study; design sheet §8). Eight steps:
//   1 a call through a cascade (F1): caller → carrier and SIP trunk → media server → speech recognition →
//     orchestrator → agent model → speech synthesis → media server → back to the caller (an 800 ms silence timer in
//     the orchestrator ends the turn; told in the text)
//   2 know when the caller has finished (F3): the turn detector (voice isolation, VAD, audio end-of-turn model) gets
//     the audio frames and tells the orchestrator when the turn ends (~300 ms, backstop 600 ms)
//   3 barge-in that truncates the history (F3): the interruption handler hears speech while the agent talks and
//     cancels the reply, keeping only the words heard
//   4 verify, then act through the shared policy service (F1, F2): order tools and policy service, call state, case
//     store. The model's line to the tools is read calls only; writes (verify, refund request, withdraw + reship) are
//     fired by the orchestrator after a spoken yes, which the tools card says ("yes before writes")
//   5 guard the words and cover the waits (F4): every sentence goes orchestrator → sentence gate → synthesis; the
//     step-1 model → synthesis edge ends at step 4 (`until: 4`); filler clips cover tool waits
//   6 hand over with the context (F5): staff queue with a screen-pop, support staff
//   7 announcement, recording and redaction (F6): recorder and redaction, recordings
//   8 measure every turn, test before release (F7): turn traces, simulator and test calls
// Nodes never move between steps. The audio path: flow + packets. Secondary calls (state, stores, fillers, traces,
// recording, tests): dashed.
//
// Working: the only numbers drawn come from presets: the turn detector's ~BUDGET.wait (300) ms commit and
// BUDGET.backstop (600) ms backstop (gcase-voice.ts); the £BRIGHTPOST.approvalLimit (30) refund limit (agents.ts).
//
// Layout (1200 × 740, genaiZones). The Speech, models and tools title tab covers x 421–646 at y 316–344 (tab width =
// 24 characters × 8.2 + 28 = 225), so no edge crosses the core/services boundary left of x 646. Cross-zone links use
// three channels instead: the strip under the orchestrator (x 662, orchestrator ↔ model), the left gutter (x 394,
// between the edge zone and the middle zones: sentence gate → synthesis) and the right gutter (x 756, between the
// middle zones and Offline pipelines: recognition → orchestrator).
//   Clients x 105: caller 560, support staff 645.
//   Edge x 297: media server 450, SIP trunk 560 (under the media server, so the audio frames run up the empty edge
//   column to the turn detector at y 120).
//   Call orchestration, columns x 490 | 665, rows y 120 | 235: turn detector, interruption handler / sentence gate,
//   orchestrator (accent).
//   Speech, models and tools, columns x 490 | 665, rows y 395 | 505 | 625: synthesis, agent model / recognition,
//   order tools / ·, staff queue.
//   Offline pipelines x 879: simulator 115, recorder 400. Data and state x 1098 (glyphs 110 apart): filler clips
//   150, call state 260, turn traces 370, recordings 480, case store 600.
// Edge checks (lines against boxes, by hand):
//   - Synthesis → media server leaves synthesis's left side at y ≈ 416 and crosses the left gutter at y ≈ 422, below
//     the gate's gutter line (which ends at y 395); media server → recognition crosses it at y ≈ 478.
//   - Recognition → orchestrator: up-right out of recognition's top, along y 450 (26 px under the model, 26 px over
//     the tools), up the right gutter to y 335, then into the orchestrator's bottom-right. It crosses model ↔ tools at
//     (665, 450) from step 4: the one crossing in the figure.
//   - The orchestrator's right-hand fan crosses the right gutter above y 335: simulator (leaves the top edge), fillers
//     (y ≈ 218 at x 756), call state (240), traces (264), recorder (306). At x 974 the fillers line is at y 174 (the
//     simulator ends at 144) and the traces line at 332 (the recorder starts at 371).
//   - Tools → case store leaves at y ≈ 512 and passes under the Offline zone (bottom 500). Staff queue → support staff
//     runs at y ≈ 640, under the trunk (bottom 589).
// Colours: the zone tones of genaiZones (case-study ZONE); nodes take their zone's tone; the orchestrator is the one
// accent node.

const COL = { clients: 105, edge: 297, left: 490, right: 665, async: 879, store: 1098 } as const;
const ROW = { core1: 120, core2: 235, svc1: 395, svc2: 505, svc3: 625 } as const;
const GUTTER = { left: 394, right: 756 } as const;
const W = 150;
const Z = {
  clients: ZONE.clients.tone,
  edge: ZONE.edge.tone,
  core: ZONE.core.tone,
  services: ZONE.services.tone,
  async: ZONE.async.tone,
  storage: ZONE.storage.tone,
} as const;

const spec: DiagramSpec = {
  title: "Voice agent for a call centre: high-level architecture",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "A call through a cascade", covers: "F1" },
    { title: "Know when the caller has finished", covers: "F3" },
    { title: "Barge-in that truncates the history", covers: "F3" },
    { title: "Verify, then act through the shared policy service", covers: "F1, F2" },
    { title: "Guard the words and cover the waits", covers: "F4" },
    { title: "Hand over with the context", covers: "F5" },
    { title: "Announcement, recording and redaction", covers: "F6" },
    { title: "Measure every turn, test before release", covers: "F7" },
  ],
  zones: genaiZones({ core: "Call orchestration", services: "Speech, models and tools" }),
  nodes: [
    // Step 1: the cascade.
    { id: "caller", label: "Caller", sub: "phone", icon: "phone", tone: Z.clients, x: COL.clients, y: 560, w: W },
    {
      id: "trunk",
      label: "SIP trunk",
      sub: "carrier, 8 kHz",
      icon: "gateway",
      tone: Z.edge,
      fill: "pastel",
      x: COL.edge,
      y: 560,
      w: W,
    },
    {
      id: "media",
      label: "Media server",
      sub: "jitter, echo, marks",
      icon: "media",
      tone: Z.edge,
      fill: "pastel",
      x: COL.edge,
      y: 450,
      w: W + 4,
    },
    {
      id: "orch",
      label: "Orchestrator",
      sub: "state machine",
      icon: "coordinator",
      tone: Z.core,
      accent: true,
      x: COL.right,
      y: ROW.core2,
      w: W,
    },
    {
      id: "asr",
      label: "Recognition",
      sub: "streaming, hinted",
      icon: "signal",
      tone: Z.services,
      fill: "pastel",
      x: COL.left,
      y: ROW.svc2,
      w: W,
    },
    {
      id: "llm",
      label: "Agent model",
      sub: "small or mid-size",
      icon: "model",
      tone: Z.services,
      fill: "pastel",
      x: COL.right,
      y: ROW.svc1,
      w: W,
    },
    {
      id: "tts",
      label: "Synthesis",
      sub: "word timings on",
      icon: "radio",
      tone: Z.services,
      fill: "pastel",
      x: COL.left,
      y: ROW.svc1,
      w: W,
    },

    // Step 2: the turn detector.
    {
      id: "turn",
      label: "Turn detector",
      sub: `~${BUDGET.wait} ms, max ${BUDGET.backstop}`,
      icon: "activity",
      tone: Z.core,
      fill: "pastel",
      step: 2,
      x: COL.left,
      y: ROW.core1,
      w: W + 10,
    },

    // Step 3: barge-in (no icon: the full name needs the card's width).
    {
      id: "barge",
      label: "Interruption handler",
      sub: "barge-in, truncation",
      tone: Z.core,
      fill: "pastel",
      step: 3,
      x: COL.right,
      y: ROW.core1,
      w: W,
    },

    // Step 4: verify, then act.
    {
      id: "tools",
      label: "Tools, policy",
      sub: "yes before writes",
      icon: "tool",
      tone: Z.services,
      fill: "pastel",
      step: 4,
      x: COL.right,
      y: ROW.svc2,
      w: W,
    },
    {
      id: "state",
      label: "Call state",
      sub: "node, verified, pending",
      icon: "cache",
      tone: Z.storage,
      variant: "glyph",
      step: 4,
      x: COL.store,
      y: 260,
    },
    {
      id: "cases",
      label: "Case store",
      sub: "shared with chat",
      icon: "database",
      tone: Z.storage,
      variant: "glyph",
      step: 4,
      x: COL.store,
      y: 600,
    },

    // Step 5: words checked before they are spoken; waits covered.
    {
      id: "gate",
      label: "Sentence gate",
      sub: "before speech",
      icon: "shield",
      tone: Z.core,
      fill: "pastel",
      step: 5,
      x: COL.left,
      y: ROW.core2,
      w: W,
    },
    {
      id: "fillers",
      label: "Filler clips",
      sub: "pre-recorded",
      icon: "media",
      tone: Z.storage,
      variant: "glyph",
      step: 5,
      x: COL.store,
      y: 150,
    },

    // Step 6: hand-off.
    {
      id: "queue",
      label: "Staff queue",
      sub: "with screen-pop",
      icon: "queue",
      tone: Z.services,
      fill: "pastel",
      step: 6,
      x: COL.right,
      y: ROW.svc3,
      w: W,
    },
    {
      id: "staff",
      label: "Support staff",
      sub: `refunds over £${BRIGHTPOST.approvalLimit}`,
      icon: "users",
      tone: Z.clients,
      step: 6,
      x: COL.clients,
      y: 645,
      w: W,
    },

    // Step 7: recording.
    {
      id: "recorder",
      label: "Recorder, redaction",
      sub: "10 s delay, masked",
      icon: "lock",
      tone: Z.async,
      fill: "pastel",
      step: 7,
      x: COL.async,
      y: 400,
      w: 190,
    },
    {
      id: "recordings",
      label: "Recordings",
      sub: "two channels, masked",
      icon: "blob",
      tone: Z.storage,
      variant: "glyph",
      step: 7,
      x: COL.store,
      y: 480,
    },

    // Step 8: measure and test.
    {
      id: "sim",
      label: "Simulator, test calls",
      sub: "nightly and per release",
      icon: "sandbox",
      tone: Z.async,
      fill: "pastel",
      step: 8,
      x: COL.async,
      y: 115,
      w: 190,
    },
    {
      id: "traces",
      label: "Turn traces",
      sub: "stage timings",
      icon: "trace",
      tone: Z.storage,
      variant: "glyph",
      step: 8,
      x: COL.store,
      y: 370,
    },
  ],
  edges: [
    // Step 1: the audio path, packet by packet.
    { from: "caller", to: "trunk", bidirectional: true, flow: true, packet: true },
    { from: "trunk", to: "media", bidirectional: true, flow: true, packet: true, delay: 0.5 },
    { from: "media", to: "asr", flow: true, packet: true, delay: 1 },
    {
      from: "asr",
      to: "orch",
      label: "transcript",
      labelAt: 0.12,
      flow: true,
      packet: true,
      delay: 1.5,
      via: [
        [580, 450],
        [GUTTER.right, 450],
        [GUTTER.right, 335],
        [725, 335],
      ],
    },
    {
      from: "orch",
      to: "llm",
      label: "prompt",
      labelAt: 0.25,
      bidirectional: true,
      flow: true,
      packet: true,
      delay: 2,
    },
    { from: "llm", to: "tts", flow: true, packet: true, delay: 2.5, until: 4 },
    { from: "tts", to: "media", flow: true, packet: true, delay: 3 },

    // Step 2: audio frames straight up the edge column to the turn detector.
    { from: "media", to: "turn", label: "audio frames", labelAt: 0.4, via: [[COL.edge, ROW.core1]], step: 2 },
    { from: "turn", to: "orch", label: "end of turn", step: 2 },

    // Step 3: speech while the agent talks.
    { from: "turn", to: "barge", step: 3 },
    { from: "barge", to: "orch", label: "cancel", step: 3 },

    // Step 4: tools through the policy service; state and the shared case store.
    { from: "llm", to: "tools", label: "reads", labelAt: 0.3, bidirectional: true },
    { from: "tools", to: "cases", label: "orders, refunds", dashed: true, bidirectional: true },
    { from: "orch", to: "state", label: "case state", dashed: true, bidirectional: true },

    // Step 5: every sentence passes the gate before synthesis; fillers cover tool waits.
    { from: "orch", to: "gate", step: 5 },
    {
      from: "gate",
      to: "tts",
      label: "checked",
      labelAt: 0.42,
      flow: true,
      packet: true,
      via: [
        [GUTTER.left, ROW.core2],
        [GUTTER.left, ROW.svc1],
      ],
      step: 5,
    },
    { from: "fillers", to: "orch", label: "play at once", dashed: true },

    // Step 6: hand-off with the case on screen.
    { from: "tools", to: "queue", label: "transfer" },
    { from: "queue", to: "staff", label: "call + screen-pop" },

    // Step 7: both channels to the recorder, masked into the store.
    { from: "orch", to: "recorder", label: "both channels", labelAt: 0.8, dashed: true },
    { from: "recorder", to: "recordings", dashed: true },

    // Step 8: stage timings per turn; simulated and real test calls.
    { from: "orch", to: "traces", label: "stage timings", dashed: true },
    { from: "sim", to: "orch", label: "test calls", dashed: true },
  ],
};

export default spec;
