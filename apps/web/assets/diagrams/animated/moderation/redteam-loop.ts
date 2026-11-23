import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { REDTEAM } from "@/components/diagrams/presets/gcase-moderation";

// Adversarial adaptation: the red-team loop (content-moderation-system, design sheet deep dive 5 and step 8; preset
// REDTEAM in presets/gcase-moderation.ts). New figure: safety/mod-redteam-loop attacks an assistant, not a cascade.
//   Step 1, attack and measure: REDTEAM.families (10) × REDTEAM.perFamily (100) crafted units a month run through the
//     whole cascade (normaliser, hashes, classifiers, the model, holds); success per family with its Wilson 95%
//     interval; worked example (illustrative): homoglyph and zero-width slurs succeed 23 of 100 (REDTEAM.before
//     15.8–32.2%). 100 a family separates families ≥ 15 points apart (15 of 100 → 9.3–23.3%).
//   Step 2, fix and keep it fixed: fix the cause (the confusables table, a term rule, a hash variant, a detector rule, a
//     prompt example: hours; a classifier retrain: weeks); re-run: 3 of 100 (REDTEAM.after 1.0–8.5%); every success
//     becomes a regression test in gate 3; each week misses from prevalence positives, overturned appeals and
//     confirmed reports are tagged by evasion family and feed next month's attacks.
// Layout (880 wide): the ten families as a list on the left (x 12, 330 wide); a four-box loop on the right (run →
// success → fix → re-run → back to run), misses feeding in from the centre.
// Colours: the attack families red (attacks); the cascade lime (checks); the measured success red; the fix teal (it
// acts); the re-run lime; the misses orange (found by people).

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const SHORT = [
  "Homoglyphs, zero-width, leetspeak",
  "Words split across comments",
  "Text inside an image",
  "Image edits against the hash",
  "New coded terms; paraphrased hate",
  "Context flips; counter-speech",
  "Instructions aimed at the model",
  "Code-switching; romanised scripts",
  "Fresh accounts; probing the oracle",
  "Synthetic media, incl. AI CSAM",
];

const X = 12;
const LIST_W = 330;
const Y0 = 40;
const PITCH = 27;
const list: LayoutShape[] = [
  {
    id: "fam-head",
    type: "text",
    x: X,
    y: Y0 - 26,
    w: LIST_W,
    h: 18,
    label: `${REDTEAM.families.length} attack families × ${REDTEAM.perFamily} units a month`,
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  },
  ...SHORT.map((f, i): LayoutShape => ({
    id: `fam-${i}`,
    type: "cell",
    x: X,
    y: Y0 + i * PITCH,
    w: LIST_W,
    h: 23,
    label: `${i + 1}. ${f}`,
    tone: PROD_TONE.failure,
    fill: i === 0 ? "pastel" : "soft",
    step: 1,
    quiet: i > 0,
  })),
];

const BW = 236;
const BH = 64;
const LX = 380;
const RX = 632;
const TY = Y0;
const BY = Y0 + 9 * PITCH + 23 - BH;
const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "box", x, y, w: BW, h: BH, label, sub, tone, fill: "pastel", step, quiet });
const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...extra,
});

const b = REDTEAM.before;
const a = REDTEAM.after;
const loop: LayoutShape[] = [
  box("run", LX, TY, "Run the whole cascade", "normaliser, hashes, model, holds", GENAI_TONE.check, 1, false),
  box(
    "success",
    RX,
    TY,
    `Homoglyphs: ${Math.round(b.p * 100)} of 100 get through`,
    `${pct(b.lo)}–${pct(b.hi)} (Wilson 95%)`,
    PROD_TONE.failure,
    1
  ),
  box("fix", RX, BY, "Fix the cause", "confusables, term rule: hours", GENAI_TONE.tool, 2, false),
  box(
    "rerun",
    LX,
    BY,
    `Re-run: ${Math.round(a.p * 100)} of 100`,
    `${pct(a.lo)}–${pct(a.hi)}; now a regression test`,
    GENAI_TONE.check,
    2
  ),
  box(
    "misses",
    LX + (RX - LX) / 2,
    TY + (BY - TY) / 2,
    "Misses, tagged weekly",
    "prevalence, appeals, reports",
    GENAI_TONE.user,
    2
  ),
  arrow("a-list", "fam-0", "run", 1),
  arrow("a-run", "run", "success", 1),
  arrow("a-fix", "success", "fix", 2),
  arrow("a-rerun", "fix", "rerun", 2),
  arrow("a-loop", "rerun", "run", 2, { dashed: true }),
  arrow("a-misses", "misses", "run", 2, { dashed: true }),
];

const FOOT = BY + BH + 20;
const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: `The red-team loop: ten attack families a month; homoglyph slurs from ${Math.round(b.p * 100)} of 100 to ${Math.round(a.p * 100)} after the fix`,
  width: 880,
  height: FOOT + 48,
  steps: [
    { title: "Attack the whole cascade and measure each family" },
    { title: "Fix the cause, re-run, keep it as a regression test" },
  ],
  shapes: [
    ...list,
    ...loop,
    text(
      "foot-1",
      FOOT,
      `${REDTEAM.perFamily} units a family separates families about 15 points apart (15 of 100: ${pct(REDTEAM.ci15.lo)}–${pct(REDTEAM.ci15.hi)}).`,
      1
    ),
    text(
      "foot-2",
      FOOT + 22,
      "Rule and normaliser fixes ship in hours; a classifier retrain takes weeks. Counts are illustrative.",
      2
    ),
  ],
};

export default spec;
