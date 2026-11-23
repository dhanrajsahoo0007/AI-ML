import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { CASCADE, HOLD, LATENCY, TIERS, WALK_SAFETY } from "@/components/diagrams/presets/gcase-moderation";

// Holds for the worst harms (content-moderation-system, design sheet §2, §6, §10.6, §9 walk-through 2, review 1 and
// R2-4; preset CASCADE, TIERS, LATENCY, HOLD, WALK_SAFETY in presets/gcase-moderation.ts). Volumes ILLUSTRATIVE.
//   Step 1, three paths after the pre-publish check (≈ 34 / 97 ms for text):
//     clear units (outside every band): allowed, nudged or removed at once (TIERS.autoAct ≈ 201,748 removals a day);
//     severity 2–3 band (hate, graphic, spam): published with limited distribution (not recommended, not in search or
//       notifications) while the small model decides in LATENCY.modelText ≈ 1.2 / 4.9 s: about 1.99M units a day
//       (Σ CASCADE.per[sev ≥ 2].all.toModel);
//     severity 0–1 band (CSEA, NCII, terrorism, threats): held: nobody else sees it, the author sees it as posted (so
//       the band edge cannot be probed); a model "no" releases it in LATENCY.heldRelease ≈ 2.0 / 6.3 s; a "yes", an
//       escalation or a score above the release line goes to a person (specialists ≤ 1 h, threats ≤ 30 min at p95);
//       TIERS.held ≈ 562,833 distinct units a day.
//   Step 2, why: holding costs HOLD.cfpHold = 0.05 harm units (a delay); a held threat at P 0.30 avoids 0.30 × 400 =
//     120 harm units of risk for 0.70 × 0.05 = 0.035 (WALK_SAFETY); the hold line 0.05 ÷ (0.05 + cfn) sits below every
//     severity 0–1 lower edge, so the whole band is held. Holding the 2–3 band too would make ≈ 1.99M posts a day
//     "pending" for seconds, to save errors that cost little.
// Layout (880 wide): the check on the left; three rows (condition → while it waits → outcome); two reason boxes below.
// Colours: the check lime; clear neutral; the 2–3 path green (the small model decides); the 0–1 path orange (held for a
// person); reasons neutral with the harm arithmetic red.

const s = (ms: number) => (ms / 1000).toFixed(1);
const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const band23 = CASCADE.per.filter((p) => p.sev >= 2).reduce((t, p) => t + p.all.toModel, 0);
const M = (v: number) => `${(v / 1e6).toFixed(2)}M`;

const ROWS: { id: string; cond: [string, string]; wait: [string, string]; out: [string, string]; tone: LayoutTone }[] =
  [
    {
      id: "clear",
      cond: ["Clear: outside every band", "most units"],
      wait: ["Nothing waits", `decided at ≈ ${Math.round(LATENCY.textPre.p50)} ms`],
      out: ["Allow, nudge or remove", `${n0(TIERS.autoAct)} removed a day`],
      tone: "neutral",
    },
    {
      id: "band23",
      cond: ["Band, severity 2–3", "hate, graphic, spam"],
      wait: ["Published, limited", "not recommended or searchable"],
      out: [
        "Small model decides",
        `≈ ${s(LATENCY.modelText.p50)} / ${s(LATENCY.modelText.p95)} s · ${M(band23)} a day`,
      ],
      tone: GENAI_TONE.model,
    },
    {
      id: "band01",
      cond: ["Band, severity 0–1", "CSEA, NCII, terrorism, threats"],
      wait: ["Held: only the author sees it", "shown to them as posted"],
      out: [
        "“No” releases; else a person",
        `≈ ${s(LATENCY.heldRelease.p50)} / ${s(LATENCY.heldRelease.p95)} s · ${n0(TIERS.held)} a day`,
      ],
      tone: GENAI_TONE.user,
    },
  ];

const CHECK = { x: 12, w: 150 };
const COND = { x: 190, w: 200 };
const WAIT = { x: 418, w: 210 };
const OUT = { x: 656, w: 212 };
const Y0 = 34;
const RH = 54;
const RG = 24;
const rowY = (i: number) => Y0 + i * (RH + RG);

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  quiet = true,
  fill: "pastel" | "paper" = "pastel"
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill, step, quiet });
const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const flow: LayoutShape[] = [
  box(
    "check",
    CHECK.x,
    rowY(0),
    CHECK.w,
    rowY(2) + RH - rowY(0),
    "Pre-publish check",
    `≈ ${Math.round(LATENCY.textPre.p50)} / ${Math.round(LATENCY.textPre.p95)} ms text`,
    GENAI_TONE.check,
    1,
    false
  ),
  ...ROWS.flatMap((r, i): LayoutShape[] => {
    const y = rowY(i);
    return [
      box(`${r.id}-c`, COND.x, y, COND.w, RH, r.cond[0], r.cond[1], "neutral", 1, true, "paper"),
      box(`${r.id}-w`, WAIT.x, y, WAIT.w, RH, r.wait[0], r.wait[1], r.tone, 1, r.id !== "band01"),
      box(`${r.id}-o`, OUT.x, y, OUT.w, RH, r.out[0], r.out[1], r.tone, 1),
      arrow(`${r.id}-a0`, "check", `${r.id}-c`, 1),
      arrow(`${r.id}-a1`, `${r.id}-c`, `${r.id}-w`, 1),
      arrow(`${r.id}-a2`, `${r.id}-w`, `${r.id}-o`, 1),
    ];
  }),
];

const S2 = rowY(2) + RH + 34;
const RW = 418;
const reason = (id: string, x: number, lines: string[], tone: LayoutTone, quiet: boolean): LayoutShape[] => [
  { id, type: "box", x, y: S2, w: RW, h: 22 + lines.length * 20, tone, fill: "paper", step: 2, quiet },
  ...lines.map((l, i): LayoutShape => ({
    id: `${id}-l${i}`,
    type: "text",
    x: x + 10,
    y: S2 + 10 + i * 20,
    w: RW - 20,
    h: 18,
    label: l,
    tone: i === 0 ? tone : PROD_TONE.infra,
    step: 2,
    quiet: true,
  })),
];
const W = WALK_SAFETY;
const reasons: LayoutShape[] = [
  ...reason(
    "why-hold",
    12,
    [
      "Why hold severity 0–1",
      `A threat at P ${W.p.toFixed(2)} risks ${W.p.toFixed(2)} × ${W.edges.cfn} = ${W.missCostHeld} harm units if shown`,
      `Holding it costs ${(1 - W.p).toFixed(2)} × ${HOLD.cfpHold} = ${W.holdCost.toFixed(3)}: a delay, not a removal`,
      `Hold line ${HOLD.cfpHold} ÷ (${HOLD.cfpHold} + cfn) is below every lower edge`,
    ],
    PROD_TONE.failure,
    false
  ),
  ...reason(
    "why-not",
    450,
    [
      "Why not hold severity 2–3 too",
      `≈ ${M(band23)} posts a day would sit “pending” for seconds`,
      "a wrong view of a hate-band comment costs little",
      `a hold is no oracle: “under review” only once a person holds it`,
    ],
    "neutral",
    true
  ),
];
const FOOT = S2 + 22 + 4 * 20 + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Three paths after the check: the worst harms held out of view (≈ ${n0(TIERS.held)} a day), the 2–3 band limited while the model decides`,
  width: 880,
  height: FOOT + 26,
  steps: [
    { title: "Three paths: clear, limited while the model decides, held for the worst harms" },
    { title: "Why hold the worst harms, and why not everything" },
  ],
  shapes: [
    ...flow,
    ...reasons,
    {
      id: "foot",
      type: "text",
      x: 12,
      y: FOOT,
      w: 856,
      h: 18,
      label: "Harm units are a policy device, not dollars; volumes and latencies are illustrative.",
      tone: PROD_TONE.infra,
      step: 2,
      quiet: true,
    },
  ],
};

export default spec;
