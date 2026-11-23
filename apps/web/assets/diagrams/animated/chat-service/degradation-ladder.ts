import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { textWidth } from "@/components/diagrams/diagram-style";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { CAPACITY, DEGRADE, FAILOVER } from "@/components/diagrams/presets/gcase-chat";

// Peak and failure: the degradation ladder (chatgpt-style-chat-service, design sheet deep dive 6 and §20; preset
// DEGRADE, FAILOVER, CAPACITY in presets/gcase-chat.ts). GPUs needed at the GLOBAL peak after each rung (no regional
// headroom), prefill + decode + small model, rungs cumulative, paid users always on the large model:
//   0 normal 11,819 · 1 free tier without reasoning 10,621 · 2 run hot (decode busy 0.95, prefill ρ 0.8; fast p95 629
//   ms) 8,109 · 3 free tier on the small model 3,183 · 4 paid thinking capped at 1,000 tokens 3,034 · 5 shed new free
//   chats (429 with retry-after) 2,766.
// Lines: a region lost leaves DEGRADE.regionLoss = 2/3 × 14,520 = 9,680; half the fleet DEGRADE.halved = 7,260. First
// rung that fits: DEGRADE.regionLossRung = 2, DEGRADE.halvedRung = 3. The ladder is computed on the FP8 plan
// (CAPACITY.design = 14,520); if decode must run BF16 attention (16,896), the ladder covers the 2,376-GPU gap at peak
// until those GPUs arrive (sheet §13).
//   Step 2, the transients: rung 3's first minutes, when every free chat's first small-model turn is cold:
//   DEGRADE.rung3ColdSmallGpus ≈ 3,321 small GPUs instead of 1,610, so rung 3 needs ≈ 4,894, inside half the fleet.
//   A region lost (FAILOVER, one placement): survivors run rung 2 for their own users and the lost region's paid users
//   (DEGRADE.need with freeScale 2/3, ≈ 5,930) + the lost paid chats' one cold prefill each (FAILOVER.coldPaidGpus ≈ 1,011) = FAILOVER.largeNeed ≈ 6,941
//   of 9,680; the lost free users start cold on the small model, FAILOVER.smallNeed ≈ 1,107 GPUs, covered 2.6× by the
//   2,739 spare large GPUs loading the small model plus the survivors' small pool (175, background paused).
//   Step 3, streams in flight at half the fleet (DEGRADE.inflightSlots): 210,710 in flight at peak against 268,786
//   decode slots at plan and 170,035 in half the racks running hot (u 0.95): 40,675 without a slot; new turns are shed
//   first, then free streams pause, ≤ 26 s (one reasoning answer). The 105,355 streams on lost GPUs resume elsewhere:
//   72.6M tokens recomputed, ≈ 1.6 s on the surviving prefill. In-flight streams are NOT all kept whole (interviewer B12).
// Layout (880 wide): label column 260 px; bars on one scale to 12,500 GPUs (560 px); the two capacity lines run through
// every row with their labels at the top. Colours: prefill teal (compute), decode green (models), small model blue,
// a cold transient red (soft); lines neutral (region lost) and orange (half the fleet).

const X = 12;
const LABEL_W = 260;
const BAR_X = X + LABEL_W + 10;
const BAR_W = 520;
const MAX = 12_500;
const gx = (g: number) => Math.round((BAR_W * g) / MAX);
const ROW = 30;
const BAR_H = 20;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });
const note = (id: string, x: number, y: number, label: string, step: number, tone: LayoutTone = PROD_TONE.infra) =>
  text(id, x, y, Math.ceil(textWidth(label)) + 6, label, step, tone);
const rowLabel = (id: string, y: number, label: string, step: number, tone: LayoutTone = PROD_TONE.infra) => {
  const w = Math.ceil(textWidth(label)) + 6;
  return text(id, BAR_X - 10 - w, y, w, label, step, tone);
};
type Part = { key: string; gpus: number; tone: LayoutTone; fill?: LayoutShape["fill"] };
function stacked(id: string, y: number, parts: Part[], step: number): { shapes: LayoutShape[]; end: number } {
  let x = BAR_X;
  const shapes: LayoutShape[] = [];
  for (const p of parts) {
    const w = gx(p.gpus);
    if (w < 1) continue;
    shapes.push({
      id: `${id}-${p.key}`,
      type: "cell",
      x,
      y,
      w: Math.max(2, w),
      h: BAR_H,
      tone: p.tone,
      fill: p.fill ?? "pastel",
      step,
      quiet: true,
    });
    x += w;
  }
  return { shapes, end: x };
}
const prefillT = PROD_TONE.compute;
const decodeT = GENAI_TONE.model;
const smallT = PROD_TONE.data;

// Step 1: the rungs.
const H1 = 4;
const TOP = H1 + 50;
const rungLabels = [
  "Normal",
  "1 · Free tier: no reasoning",
  "2 · Run hot: decode 0.95, prefill ρ 0.8",
  "3 · Free tier on the small model",
  "4 · Paid thinking capped at 1,000",
  "5 · Shed new free chats (429)",
];
const step1: LayoutShape[] = [
  text(
    "h1",
    X,
    H1,
    856,
    `GPUs needed at the global peak, rung by rung (the FP8 plan: ${n(DEGRADE.fleet)} GPUs)`,
    1,
    PROD_TONE.infra,
    false
  ),
  ...DEGRADE.rungs.flatMap((rung, i): LayoutShape[] => {
    const y = TOP + i * ROW;
    const bar = stacked(
      `r${rung.id}`,
      y,
      [
        { key: "p", gpus: rung.prefill, tone: prefillT },
        { key: "d", gpus: rung.decode, tone: decodeT },
        { key: "s", gpus: rung.small, tone: smallT },
      ],
      1
    );
    return [
      rowLabel(`r${rung.id}-l`, y + 1, rungLabels[i], 1),
      ...bar.shapes,
      note(`r${rung.id}-v`, bar.end + 6, y + 1, n(Math.round(rung.total)), 1),
    ];
  }),
];
const RUNGS_END = TOP + DEGRADE.rungs.length * ROW;

// Step 2: the transients.
const T0 = RUNGS_END + 4;
const r3 = DEGRADE.rungs[3];
const r3Cold = r3.prefill + r3.decode + DEGRADE.rung3ColdSmallGpus;
const F = FAILOVER;
const survivors = DEGRADE.need({ ...DEGRADE.hot, freeScale: 2 / 3 }); // rung 2 without the lost region's free users
const failTotal = F.largeNeed + F.smallNeed;
const coldBar = stacked(
  "cold3",
  T0,
  [
    { key: "p", gpus: r3.prefill, tone: prefillT },
    { key: "d", gpus: r3.decode, tone: decodeT },
    { key: "s", gpus: DEGRADE.rung3SteadySmallGpus, tone: smallT },
    {
      key: "x",
      gpus: DEGRADE.rung3ColdSmallGpus - DEGRADE.rung3SteadySmallGpus,
      tone: GENAI_TONE.failure,
      fill: "soft",
    },
  ],
  2
);
const failBar = stacked(
  "fail",
  T0 + ROW,
  [
    { key: "p", gpus: survivors.prefill, tone: prefillT },
    { key: "d", gpus: survivors.decode, tone: decodeT },
    { key: "x", gpus: F.coldPaidGpus, tone: GENAI_TONE.failure, fill: "soft" },
    { key: "s", gpus: F.smallNeed, tone: smallT, fill: "soft" },
  ],
  2
);
const step2: LayoutShape[] = [
  { ...rowLabel("cold3-label", T0 + 1, "3, first minutes: small model cold", 2, GENAI_TONE.failure), quiet: false },
  ...coldBar.shapes,
  note("cold3-v", coldBar.end + 6, T0 + 1, `≈ ${n(Math.round(r3Cold))}`, 2),
  rowLabel("fail-label", T0 + ROW + 1, "Region lost, first minutes", 2, GENAI_TONE.failure),
  ...failBar.shapes,
  note("fail-v", failBar.end + 6, T0 + ROW + 1, `≈ ${n(Math.round(failTotal))}`, 2),
];
const LINES_END = T0 + 2 * ROW;

// The two capacity lines through every row, labels at the top.
const line = (
  id: string,
  gpus: number,
  label: string,
  tone: LayoutTone,
  labelY: number,
  side: "left" | "right"
): LayoutShape[] => {
  const x = BAR_X + gx(gpus);
  const w = Math.ceil(textWidth(label)) + 6;
  const lx = side === "left" ? x - w - 2 : x + 2;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, TOP - 6],
        [x, LINES_END],
      ],
      tone,
      dashed: true,
      step: 1,
      quiet: true,
    },
    text(`${id}-l`, lx, labelY, w, label, 1, tone),
  ];
};
const lines = [
  ...line("region", DEGRADE.regionLoss, `region lost: ${n(DEGRADE.regionLoss)}`, PROD_TONE.infra, TOP - 26, "right"),
  ...line("half", DEGRADE.halved, `half the fleet: ${n(DEGRADE.halved)}`, "orange", TOP - 26, "left"),
];

const FOOT = LINES_END + 12;
const foot: LayoutShape[] = [
  text(
    "f1",
    X,
    FOOT,
    856,
    `A region lost fits at rung ${DEGRADE.regionLossRung}; half the fleet at rung ${DEGRADE.halvedRung}. Paid users stay on the large model.`,
    1
  ),
  text(
    "f2",
    X,
    FOOT + 22,
    856,
    `If decode must run BF16 (${n(CAPACITY.bf16Attention.gpus)} GPUs), the ladder covers the ${n(CAPACITY.bf16Attention.gpus - CAPACITY.design.gpus)}-GPU gap until they arrive.`,
    1
  ),
  text(
    "f3",
    X,
    FOOT + 44,
    856,
    `Failover: ${n(Math.round(F.largeNeed))} of ${n(DEGRADE.regionLoss)} large GPUs; cold free chats need ${n(Math.round(F.smallNeed))} small GPUs, covered ${F.coverage.toFixed(1)}× by spare large GPUs.`,
    2
  ),
  {
    ...note(
      "legend",
      X,
      FOOT + 66,
      "Teal: prefill · green: decode · blue: small model · red: the cold extra. Volumes illustrative.",
      1
    ),
    w: 856,
  },
];

// Step 3: streams in flight when half the fleet is lost (DEGRADE.inflightSlots).
const IS = DEGRADE.inflightSlots;
const S3 = FOOT + 100;
const SMAX = 280_000;
const sx = (v: number) => Math.round((BAR_W * v) / SMAX);
const SR = S3 + 30;
const withSlot = IS.inflight - IS.withoutSlot;
const step3: LayoutShape[] = [
  text(
    "h3",
    X,
    S3,
    856,
    "Half the fleet lost at peak: streams in flight against decode slots",
    3,
    PROD_TONE.infra,
    false
  ),
  rowLabel("s-plan-l", SR + 1, "Decode slots at plan", 3),
  {
    id: "s-plan",
    type: "cell",
    x: BAR_X,
    y: SR,
    w: sx(IS.planSlots),
    h: BAR_H,
    tone: decodeT,
    fill: "soft",
    step: 3,
    quiet: true,
  },
  note("s-plan-v", BAR_X + sx(IS.planSlots) + 6, SR + 1, n(Math.round(IS.planSlots)), 3),
  rowLabel("s-half-l", SR + ROW + 1, "Slots, half the racks running hot", 3),
  {
    id: "s-half",
    type: "cell",
    x: BAR_X,
    y: SR + ROW,
    w: sx(IS.halfHotSlots),
    h: BAR_H,
    tone: decodeT,
    step: 3,
    quiet: true,
  },
  note("s-half-v", BAR_X + sx(IS.halfHotSlots) + 6, SR + ROW + 1, n(Math.round(IS.halfHotSlots)), 3),
  rowLabel("s-in-l", SR + 2 * ROW + 1, "Streams in flight at peak", 3),
  {
    id: "s-in",
    type: "cell",
    x: BAR_X,
    y: SR + 2 * ROW,
    w: sx(withSlot),
    h: BAR_H,
    tone: PROD_TONE.infra,
    step: 3,
    quiet: true,
  },
  {
    id: "s-out",
    type: "cell",
    x: BAR_X + sx(withSlot),
    y: SR + 2 * ROW,
    w: sx(IS.withoutSlot),
    h: BAR_H,
    tone: GENAI_TONE.failure,
    fill: "soft",
    step: 3,
    quiet: true,
  },
  note(
    "s-in-v",
    BAR_X + sx(IS.inflight) + 6,
    SR + 2 * ROW + 1,
    `${n(Math.round(IS.inflight))}: ${n(Math.round(IS.withoutSlot))} without a slot`,
    3,
    GENAI_TONE.failure
  ),
  text(
    "s-n1",
    X,
    SR + 3 * ROW + 6,
    856,
    `New turns are shed first, then free streams pause; a slot frees within one reasoning answer, so the wait is ≤ ${IS.maxPauseSec} s.`,
    3
  ),
  text(
    "s-n2",
    X,
    SR + 3 * ROW + 28,
    856,
    `${n(Math.round(IS.lostStreams))} streams on lost GPUs resume elsewhere: ${(IS.resumeTokens / 1e6).toFixed(1)}M tokens recomputed, ≈ ${IS.resumeSec.toFixed(1)} s on the surviving prefill.`,
    3
  ),
];
const END3 = SR + 3 * ROW + 54;

const spec: LayoutSpec = {
  kind: "layout",
  title: `The degradation ladder: ${n(Math.round(DEGRADE.rungs[0].total))} GPUs at peak down to ${n(Math.round(DEGRADE.rungs[5].total))}; a region loss fits at rung ${DEGRADE.regionLossRung}, half the fleet at rung ${DEGRADE.halvedRung}`,
  width: 880,
  height: END3,
  steps: [
    { title: `Rungs against a region lost (${n(DEGRADE.regionLoss)}) and half the fleet (${n(DEGRADE.halved)})` },
    { title: "The first minutes: cold small-model turns and a region failover" },
    {
      title: `Half the fleet: ${n(Math.round(IS.withoutSlot))} streams wait up to ${IS.maxPauseSec} s for a decode slot`,
    },
  ],
  shapes: [...step1, ...lines, ...step2, ...foot, ...step3],
};

export default spec;
