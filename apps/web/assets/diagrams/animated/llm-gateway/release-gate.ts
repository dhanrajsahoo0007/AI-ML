import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, PROD_TONE } from "@/components/diagrams/presets/production";
import { CANARIES, GATES, GATE_POWER, OVERHEAD, REDACTION_EVAL } from "@/components/diagrams/presets/gcase-gateway";

// The gateway's release gate (llm-platform-gateway, design sheet §13; GATES, GATE_POWER, OVERHEAD and REDACTION_EVAL in
// presets/gcase-gateway.ts). A gateway release meets the eight gates; this one is the sheet's tracing build, which put
// the request id into the system prompt on half the replicas. Same input, different bytes: determinism fails. The
// 1-hour cache replay runs through the same release, so its cache-read share falls with it (sheet §13: "the replay's
// cache-read share fell"); the figure shows both, and the release is blocked. Measured values are ILLUSTRATIVE (RUN):
//   overhead p95 at 2 × design load (OVERHEAD.podKneeRps = 100 RPS): 8.9 plain, 34.2 NER ≤ 20 / 60 ms: pass
//   determinism: 40 golden requests per alias × 2 runs through all 16 pods and old vs new: diffs on 8 pods: FAIL
//   cache: replay read share 34 points under direct (≥ direct − 1 point): FAIL
//   budget: a labs-shaped loop (20 in flight, 32,000-token prompts) overshoots 0 USD: pass
//   redaction: lower bounds 99.4% (n = 1,000) and 96.2% (n = 800); 0 raw values in 500 × 4 turns: pass
//   fallback: B −1.5 points on support's 200 tickets; MDD GATE_POWER.mdd ≈ 4.4 points: pass
//   drill: one T0 alias 100% on B for 10 minutes: 99.6% good calls (≥ 99%): pass
//   reconcile: metered vs provider usage, gap 0.4% (≤ 1%): pass
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 54 px apart and widened to 300 px, the
// result moved right by the extra width, arrows fanned through points 24 px from each check (as in
// enterprise-assistant/release-gate); a heading above and two notes below.
// Colours (gate builder): the change neutral, passing checks lime, failing checks red, Block red.

const RUN = {
  overhead: { plain: 8.9, ner: 34.2 },
  diffPods: 8,
  pods: 16,
  cacheDrop: 34,
  overshootUsd: 0,
  recall: { structured: 0.994, names: 0.962 },
  carried: 0,
  fallbackDrop: 1.5,
  drillGood: 0.996,
  reconcileGap: 0.004,
};
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const label = (id: (typeof GATES)[number]["id"]) => GATES.find((g) => g.id === id)?.target ?? "";
const T = OVERHEAD.targets;

const checks = [
  {
    label: `Overhead p95 ≤ ${T.plain.p95} / ${T.ner.p95} ms`,
    pass: RUN.overhead.plain <= T.plain.p95 && RUN.overhead.ner <= T.ner.p95,
    sub: `${RUN.overhead.plain} / ${RUN.overhead.ner} ms at ${OVERHEAD.podKneeRps} RPS a pod`,
  },
  {
    label: `Determinism: ${label("determinism")}`,
    pass: RUN.diffPods === 0,
    sub: `byte diffs on ${RUN.diffPods} of ${RUN.pods} pods: request id`,
  },
  {
    label: "Cache read share ≥ direct − 1",
    pass: RUN.cacheDrop <= 1,
    sub: `1-hour replay: ${RUN.cacheDrop} points under direct`,
  },
  {
    label: `Budget overshoot: ${label("budget")}`,
    pass: RUN.overshootUsd === 0,
    sub: "labs-shaped loop, 20 in flight: 0 USD",
  },
  {
    label: "Redaction recall; carry-over",
    pass:
      RUN.recall.structured >= REDACTION_EVAL.structured.target &&
      RUN.recall.names >= REDACTION_EVAL.names.target &&
      RUN.carried === 0,
    sub: `${pct(RUN.recall.structured)} / ${pct(RUN.recall.names)} lower bounds; 0 raw`,
  },
  {
    label: "Fallback B on the gold set",
    pass: RUN.fallbackDrop < 5,
    sub: `−${RUN.fallbackDrop} points (MDD ${(GATE_POWER.mdd * 100).toFixed(1)})`,
  },
  {
    label: "Drill: T0 on B for 10 min",
    pass: RUN.drillGood >= 0.99,
    sub: `${pct(RUN.drillGood)} good calls (≥ 99%)`,
  },
  {
    label: `Reconcile: ${label("reconcile")}`,
    pass: RUN.reconcileGap <= 0.01,
    sub: `${pct(RUN.reconcileGap)} against provider usage`,
  },
];

const opts = {
  change: { label: "Gateway release", sub: "tracing build" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "take the id out",
};
const size = gateSize(opts);
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 10;
const CHECK_W = 300;
const EXTRA_GAP = 30;
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH - 10;
const GX = Math.round((880 - (size.width + extraW + 2 * EXTRA_GAP)) / 2);
const GY = 40;
const midY = GY + spreadH / 2;
const checkX = (sh: LayoutShape | undefined) => GX + (sh?.x ?? 0) + EXTRA_GAP;
const rowY = (i: number) => midY - spreadH / 2 + i * ROW_PITCH + CHECK_H / 2;
const placed = built.map((sh): LayoutShape => {
  if (sh.type === "arrow") {
    const inArrow = sh.id.startsWith("g-in-");
    const i = Number(sh.id.slice(inArrow ? "g-in-".length : "g-out-".length));
    const x = inArrow ? checkX(check0) - 24 : checkX(check0) + CHECK_W + 24;
    return { ...sh, via: [[x, rowY(i)]] };
  }
  const i = sh.id.startsWith("g-check-") ? Number(sh.id.slice("g-check-".length)) : -1;
  if (i >= 0) return { ...sh, x: GX + sh.x + EXTRA_GAP, y: midY - spreadH / 2 + i * ROW_PITCH, w: CHECK_W };
  const shift = sh.id === "g-result" ? extraW + 2 * EXTRA_GAP : 0;
  return { ...sh, x: GX + sh.x + shift, y: midY - (sh.h ?? CHECK_H) / 2 };
});
const NOTE_Y = GY + spreadH + 18;

const text = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The gateway's release gate: a request id in the prompt on half the pods fails determinism, so it is blocked",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text("head", 8, "Every gateway release, proxy upgrade, or alias or chain change runs the same eight gates"),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `Canaries keep running after release: ${CANARIES.prompts} prompts every ${CANARIES.everyMinutes} min a target (${CANARIES.perDay.toLocaleString("en-GB")} a day); they catch large shifts only.`
    ),
    text("note-2", NOTE_Y + 20, "Measured values are illustrative; the targets are the design's."),
  ],
};

export default spec;
