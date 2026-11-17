import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { arr, bx, txt } from "@/components/diagrams/presets/production-speech";
import { TELEPHONY as T } from "@/components/diagrams/presets/gcase-voice";

// The phone path under step 1 of the voice-agent hero (design sheet §5, §12 and the Figures table): one way from the
// caller's handset to the agent worker, with a time range per leg, and (step 2) what a queue transfer does.
// Working (TELEPHONY in presets/gcase-voice.ts; every range ILLUSTRATIVE, chosen to add up to the sheet's 80–200 ms
// phone leg):
//   handset → carrier 30–80 · carrier → SIP trunk 10–40 · SIP trunk → media server 10–30 · jitter buffer → worker
//   30–50; best 30 + 10 + 10 + 30 = 80 ms, worst 80 + 40 + 30 + 50 = 200 ms; the latency budget uses
//   TELEPHONY.designMs (BUDGET.leg, 100) each way.
//   G.711 carries 8,000 samples a second × 8 bits = 64 kbit/s; the media server resamples to 16 kHz PCM for
//   recognition and the turn model.
//   A transfer to the staff queue is a SIP REFER to the contact-centre platform: the call leaves our media server, so
//   the room and the worker are free (sheet §5, "Workers and streams").
// Steps: 1 the path with its legs · 2 the transfer.
// Layout (880 wide): five 120 px boxes at x 12, 196, 380, 564, 748 (64 px gaps) on y 58; leg times centred over the
// gaps at y 34; detail lines under three boxes at y 126; the staff queue under the SIP trunk at y 236 with the REFER
// arrow down the empty space under the trunk; the arithmetic at the foot.
// Colours (GENAI_TONE): the caller and the staff queue orange (people), carrier and trunk neutral (infrastructure),
// the media server blue (audio frames), the agent worker green (it runs the models).

const BOX_W = 120;
const GAP = 64;
const X0 = 12;
const BOX_Y = 58;
const BOX_H = 60;
const xAt = (i: number) => X0 + i * (BOX_W + GAP);
const gapCentre = (i: number) => xAt(i) + BOX_W + GAP / 2;
const range = (l: { minMs: number; maxMs: number }) => `${l.minMs}–${l.maxMs} ms`;

const lines = (id: string, x: number, y: number, w: number, label: string, step = 1): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: label.split("\n").length * 16 + 4,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const DETAIL_Y = BOX_Y + BOX_H + 8;
const QUEUE_Y = 236;
const FOOT_Y = 312;

const shapes: LayoutShape[] = [
  txt(
    "head",
    X0,
    6,
    856,
    `One way, handset to agent worker: ${T.minMs}–${T.maxMs} ms (illustrative); the budget uses ${T.designMs} ms each way`,
    1
  ),
  bx("handset", xAt(0), BOX_Y, BOX_W, BOX_H, GENAI_TONE.user, "Handset", { sub: "the caller" }),
  bx("carrier", xAt(1), BOX_Y, BOX_W, BOX_H, PROD_TONE.infra, "Carrier", { sub: `G.711, ${T.phoneHz / 1_000} kHz` }),
  bx("trunk", xAt(2), BOX_Y, BOX_W, BOX_H, PROD_TONE.infra, "SIP trunk", { sub: "SIP + RTP" }),
  bx("media", xAt(3), BOX_Y, BOX_W, BOX_H, GENAI_TONE.data, "Media server", { sub: "jitter, echo" }),
  bx("worker", xAt(4), BOX_Y, BOX_W, BOX_H, GENAI_TONE.model, "Agent worker", {
    sub: `${T.workerHz / 1_000} kHz PCM`,
    highlight: true,
  }),
  arr("a1", "handset", "carrier"),
  arr("a2", "carrier", "trunk"),
  arr("a3", "trunk", "media"),
  arr("a4", "media", "worker"),
  ...T.legs.map((l, i) => txt(`leg-${l.id}`, gapCentre(i) - 34, 34, 68, range(l), 1)),
  lines(
    "d-carrier",
    xAt(1) - 20,
    DETAIL_Y,
    BOX_W + 40,
    `μ-law, ${T.g711Kbps} kbit/s\n(${T.phoneHz.toLocaleString("en-GB")} samples/s)`
  ),
  lines("d-media", xAt(3) - 20, DETAIL_Y, BOX_W + 40, "jitter buffer,\necho cancellation,\nplayback marks"),
  lines(
    "d-worker",
    xAt(4) - 24,
    DETAIL_Y,
    BOX_W + 28,
    `resampled to ${T.workerHz / 1_000} kHz\nfor recognition and\nthe turn model`
  ),

  // Step 2: a transfer hands the call to the contact-centre platform.
  bx("queue", xAt(2), QUEUE_Y, BOX_W, 56, GENAI_TONE.user, "Staff queue", { sub: "contact centre", step: 2 }),
  arr("refer", "trunk", "queue", 2, "SIP REFER", { dashed: true }),
  lines(
    "refer-note",
    xAt(2) + BOX_W + 12,
    QUEUE_Y + 4,
    250,
    "The call leaves our media server:\nthe room and the worker are free\nfor the next call.",
    2
  ),

  txt(
    "foot-1",
    X0,
    FOOT_Y,
    856,
    `Best ${T.legs.map((l) => l.minMs).join(" + ")} = ${T.minMs} ms; worst ${T.legs.map((l) => l.maxMs).join(" + ")} = ${T.maxMs} ms. The reply comes back the same way.`,
    1
  ),
  txt("foot-2", X0, FOOT_Y + 20, 856, "Leg times are illustrative; probe calls measure the real offset at the ear.", 1),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The phone path: handset to agent worker, one way, with a time per leg",
  width: 880,
  height: FOOT_Y + 46,
  steps: [
    { title: `Handset to worker: ${T.minMs}–${T.maxMs} ms one way` },
    { title: "A transfer is a SIP REFER that frees the room" },
  ],
  shapes,
};

export default spec;
