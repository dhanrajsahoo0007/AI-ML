import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { EXAMPLE, FRESHNESS } from "@/components/diagrams/presets/gcase-kghealth";

// The graph slice behind the apixaban example (kg-healthcare-case-study, Step 4 and design sheet §7, §9, §15): both
// layers, provenance on every edge, a DOSING_RULE node holding a multi-fact predicate, the patient's facts joined to the
// knowledge layer by code, and the two alert paths.
// Clinical content (EXAMPLE in presets/gcase-kghealth.ts; the Eliquis label as read on DailyMed, revised 8/2026, F66,
// F67; the patient is illustrative, not clinical guidance):
//   AF dosing rule: the label's dose for patients with at least 2 of: age ≥ 80 years, body weight ≤ 60 kg, serum
//   creatinine ≥ 1.5 mg/dL is 2.5 mg twice daily. She is 82, 58 kg (measured today; outpatient window
//   FRESHNESS.weightRecencyOutpatientDays = 30 days), creatinine 141 µmol/L from an outside lab on 15 November = 141 ÷ 88.4
//   = 1.595 mg/dL (EXAMPLE.scrMgDl; thresholds compare unrounded values; shown as 1.6): EXAMPLE.criteriaMet = 3 of 3 →
//   EXAMPLE.afDose = 2.5 mg twice daily, against the intended 5 mg twice daily.
//   Combined P-gp and strong CYP3A4 inhibitor (itraconazole, active): on 5 or 10 mg twice daily reduce the dose by 50%;
//   already on 2.5 mg twice daily, avoid coadministration. Phase 2 evaluates it on the criteria dose 2.5 mg →
//   EXAMPLE.inhibitorAction = "avoid" (on the intended 5 mg it would wrongly say "reduce by 50%").
//   No RxNorm number is printed (the sheet's open item: check RXCUI 1364430 on RxNav before printing it).
// Provenance on edges: every relation pill names its source ("§2" = Eliquis label section 2, revised 8/2026; "KB" =
// the licensed drug-knowledge release vendor-2026.11.2); the footer says what else each edge stores (valid_from,
// valid_to, curated_by, status). Join pills name the code system the patient fact carries.
// Steps: 1 knowledge layer with provenance · 2 patient layer, joined by codes (coded and note-derived facts with
// lifecycle and units) · 3 path 1, the dosing rule (phase 1) · 4 path 2, the interaction on the criteria dose (phase 2).
// Layout (960 wide): three columns 220 wide at x 20 | 370 | 710 (the rule column 240 wide), 130 px apart so a pill fits
// on each horizontal relation; knowledge rows y 56 and 196; patient facts in 44-tall boxes 52 apart from y 366; the
// alerts in the middle column of the patient band, fed straight down from the inhibitor class and level from the
// dosing facts' bracket (x 690).
// Colours (GENAI_TONE): knowledge concepts violet (the snapshot), the label section blue (source text), the DOSING_RULE
// lime (a rule), patient facts blue (coded) and blue soft (note-derived), alerts red.

const COL = { c0: 20, c1: 370, c2: 710 } as const;
const W = 220;
const W2 = 240;
const K1 = 56;
const K2 = 196;
const KH = 56;
const FY = (i: number) => 366 + i * 52;
const FH = 44;
const SPINE = 690;
const JOIN_X = 222;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });

const rel = (id: string, from: string, to: string, label: string, step: number, extra: Partial<LayoutShape> = {}) =>
  ({ id, type: "arrow", x: 0, y: 0, from, to, label, step, ...extra }) as LayoutShape;

const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 920,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const scr = EXAMPLE.scrMgDl.toFixed(3);
const dosingFacts = ["fAf", "fAge", "fWeight", "fScr", "fDose"] as const;

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "The apixaban slice: a DOSING_RULE and an interaction edge, each with its source, joined to the patient by code",
  width: 960,
  height: 712,
  steps: [
    { title: "Knowledge layer: concepts, a dosing rule and edges that name their source" },
    { title: "Patient layer: coded and note-derived facts, joined by code" },
    {
      title: `Path 1, phase 1: ${EXAMPLE.criteriaMet} of 3 criteria → the label's dose ${EXAMPLE.afDose} mg twice daily`,
    },
    { title: `Path 2, phase 2: itraconazole evaluated on ${EXAMPLE.afDose} mg → avoid coadministration` },
  ],
  groups: [
    {
      id: "g-kg",
      title: "Knowledge layer: snapshot kg-2026-11-14 (no PHI)",
      tone: "violet",
      x: 8,
      y: 24,
      w: 944,
      h: 262,
    },
    { id: "g-pt", title: "Patient layer (PHI)", tone: "blue", x: 8, y: 330, w: 944, h: 302 },
  ],
  shapes: [
    // Step 1: the knowledge layer.
    box("label", COL.c0, K1, W, KH, "Eliquis label, section 2", "DailyMed, revised 8/2026", GENAI_TONE.data, 1),
    box("apixaban", COL.c1, K1, W, KH, "Apixaban", "RxNorm ingredient, oral", GENAI_TONE.store, 1, { highlight: true }),
    box(
      "rule",
      COL.c2,
      44,
      W2,
      96,
      "DOSING_RULE · apixaban · AF\n≥ 2 of: age ≥ 80, weight ≤ 60 kg,\nserum creatinine ≥ 1.5 mg/dL",
      "→ the label's dose: 2.5 mg twice daily",
      GENAI_TONE.check,
      1
    ),
    box("itra", COL.c0, K2, W, KH, "Itraconazole", "RxNorm ingredient", GENAI_TONE.store, 1),
    box("class", COL.c1, K2, W, KH, "P-gp + strong CYP3A4 inhibitor", "drug class", GENAI_TONE.store, 1),
    box("af", COL.c2, K2, W2, KH, "Nonvalvular atrial fibrillation", "SNOMED CT concept", GENAI_TONE.store, 1),
    rel("apixaban-label", "apixaban", "label", "DESCRIBED_IN", 1),
    rel("apixaban-rule", "apixaban", "rule", "HAS_RULE · §2", 1),
    rel("rule-af", "rule", "af", "indication · §2", 1),
    rel("itra-class", "itra", "class", "IN_CLASS · KB", 1),
    rel("class-apixaban", "class", "apixaban", "INTERACTS_WITH · KB, §2", 1),

    // Step 2: the patient layer, joined by codes.
    box("fItra", COL.c0, FY(0), W, FH, "Itraconazole, active", "MedicationRequest/77", GENAI_TONE.data, 2),
    box("fPcn", COL.c0, FY(1), W, FH, "Penicillin allergy, rash", "note-derived, active", GENAI_TONE.data, 2, {
      fill: "soft",
    }),
    box("fBleed", COL.c0, FY(2), W, FH, "GI bleed: negated", "note-derived, never fires", GENAI_TONE.data, 2, {
      fill: "soft",
    }),
    box("fAf", COL.c2, FY(0), W2, FH, "Atrial fibrillation, active", "Condition/61, problem list", GENAI_TONE.data, 2),
    box("fAge", COL.c2, FY(1), W2, FH, `Age ${EXAMPLE.age}, female`, "Patient", GENAI_TONE.data, 2),
    box(
      "fWeight",
      COL.c2,
      FY(2),
      W2,
      FH,
      `Weight ${EXAMPLE.weightKg} kg`,
      `measured today (≤ ${FRESHNESS.weightRecencyOutpatientDays} days)`,
      GENAI_TONE.data,
      2
    ),
    box(
      "fScr",
      COL.c2,
      FY(3),
      W2,
      FH,
      `Creatinine ${scr} mg/dL`,
      `${EXAMPLE.scrUmolL} µmol/L, outside lab, 15 Nov`,
      GENAI_TONE.data,
      2
    ),
    box(
      "fDose",
      COL.c2,
      FY(4),
      W2,
      FH,
      "Intended 5 mg twice daily",
      "question text, tap-confirmed",
      GENAI_TONE.data,
      2
    ),
    rel("join-itra", "fItra", "itra", "RxNorm code", 2, {
      // Offset right of the group's title tab (x 24–208), so the join line does not cross it.
      via: [
        [JOIN_X, FY(0) - 4],
        [JOIN_X, K2 + KH + 4],
      ],
    }),
    rel("join-af", "fAf", "af", "SNOMED CT code", 2),

    // Step 3: path 1, the dosing rule on several facts at once (phase 1).
    {
      id: "spine",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [COL.c2 - 4, FY(0) + FH / 2],
        [SPINE, FY(0) + FH / 2],
        [SPINE, FY(4) + FH / 2],
        [COL.c2 - 4, FY(4) + FH / 2],
      ],
      step: 3,
    },
    ...dosingFacts.slice(1, 4).map((id, i): LayoutShape => ({
      id: `tick-${id}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [COL.c2 - 4, FY(i + 1) + FH / 2],
        [SPINE, FY(i + 1) + FH / 2],
      ],
      step: 3,
      quiet: true,
    })),
    box(
      "alert1",
      COL.c1,
      500,
      W,
      84,
      `Alert 1 · dosing, warning\n${EXAMPLE.criteriaMet} of 3 criteria met; the label's\ndose: ${EXAMPLE.afDose} mg twice daily`,
      "intended 5 mg twice daily",
      GENAI_TONE.failure,
      3,
      { highlight: true }
    ),
    {
      id: "bracket-alert1",
      type: "arrow",
      x: SPINE,
      y: 542,
      w: COL.c1 + W + 4 - SPINE,
      h: 0,
      label: "3 of 3",
      step: 3,
    },

    // Step 4: path 2, the inhibitor rule on the criteria dose (phase 2).
    box(
      "alert2",
      COL.c1,
      FY(0),
      W,
      84,
      "Alert 2 · interaction, major\nitraconazole with apixaban\nat 2.5 mg: avoid coadministration",
      "on 5 mg it would say: reduce 50%",
      GENAI_TONE.failure,
      4,
      { highlight: true }
    ),
    rel("class-alert2", "class", "alert2", "phase 2", 4),
    rel("alert1-alert2", "alert1", "alert2", "criteria dose", 4),

    text(
      "foot-1",
      650,
      "Edge sources: §2 = Eliquis label section 2 (revised 8/2026); KB = licensed drug-knowledge release vendor-2026.11.2.",
      1
    ),
    text(
      "foot-2",
      672,
      "Every edge also stores valid_from, valid_to, curated_by and status. The patient is illustrative, not clinical guidance.",
      2
    ),
  ],
};

export default spec;
