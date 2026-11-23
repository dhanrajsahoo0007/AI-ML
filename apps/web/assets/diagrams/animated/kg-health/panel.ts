import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { EXAMPLE } from "@/components/diagrams/presets/gcase-kghealth";

// The clinician panel, a wireframe (kg-healthcare-case-study, design sheet §14 "Clinician panel"), on the apixaban
// example (EXAMPLE in presets/gcase-kghealth.ts; Eliquis label section 2, revised 8/2026; the patient is illustrative,
// not clinical guidance; the banner's name and date of birth are placeholders, shown from the EHR context and never
// sent to the model). Each element and why, from the sheet:
//   banner with two identifiers (wrong patient); the resolved-drug chip with route, dose and indication, each with its
//   source, and a tap when needed (look-alike names; free-text dose or indication); alerts first, in the EHR's tier,
//   each labelled "also shown by the EHR" or "found only in notes" (alert fatigue, consistency); gaps only where the
//   rule could apply (no pregnancy gap for an 82-year-old); the explanation after the basis (automation bias); "Data as
//   of 10:41; notes read to 10:30; unsigned notes not read" (freshness); a DailyMed link on every label citation;
//   provenance collapsed by default, one click to expand; "code this fact" on note-derived alerts; override reasons.
//   The explanation's first sentence is the walk-through's (sheet §6): no "safe", "start" or "do not start"; options
//   and doses only as the label states them, with its criteria.
// Steps: 1 banner and drug chip · 2 alerts first, in the EHR's tier · 3 gaps and the cited explanation · 4 freshness,
// sources and provenance, actions.
// Layout (960 wide): the panel wireframe x 20–570 in a group; a "why" note to the right of each element (x 600, 340
// wide), at the element's height.
// Colours (GENAI_TONE): the banner orange (the patient and clinician), the chip lime (a resolution), alerts red, gaps
// neutral, the explanation green (model text), coverage and sources neutral, provenance violet, actions orange.

const PX = 30;
const PW = 530;
const NX = 600;
const NW = 340;

const el = (
  id: string,
  y: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x: PX, y, w: PW, h, label, sub, tone, fill: "soft", step, ...extra });
const why = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: NX,
  y,
  w: NW,
  h: 36,
  label,
  tone: "neutral",
  step,
  quiet: true,
});

const Y = { banner: 52, chip: 104, a1: 170, a2: 238, gaps: 304, expl: 346, cov: 470, src: 522, act: 574 } as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The clinician panel: the patient, the drug, the alerts first, then the cited explanation and what was read",
  width: 960,
  height: 650,
  steps: [
    { title: "Who and what: two identifiers, and the drug with each input's source" },
    { title: "Alerts first, from the rules, in the EHR's tier" },
    { title: "Gaps where a rule could apply, then the cited explanation" },
    { title: "What was read and when, sources, and the clinician's actions" },
  ],
  groups: [{ id: "g-panel", title: "Side panel (SMART launch)", tone: "neutral", x: 18, y: 22, w: 554, h: 610 }],
  shapes: [
    // Step 1: banner and drug chip.
    el(
      "banner",
      Y.banner,
      42,
      `A. Example · DOB 1944-03-02 · female, ${EXAMPLE.age}`,
      "from the EHR context; never sent to the model",
      GENAI_TONE.user,
      1,
      { fill: "pastel" }
    ),
    why("w-banner", Y.banner + 4, "Two identifiers on every view:\nthe wrong patient is the worst error.", 1),
    el(
      "chip",
      Y.chip,
      54,
      "apixaban · oral · 5 mg twice daily · nonvalvular AF",
      "dose: question text, tap ✓ · indication: problem list (Condition/61)",
      GENAI_TONE.rank,
      1,
      { fill: "pastel" }
    ),
    why("w-chip", Y.chip + 8, "Each input shows its source; a tap when\nonly free text or a look-alike name.", 1),

    // Step 2: alerts first, in the EHR's tier.
    el(
      "a1",
      Y.a1,
      52,
      "Major · interaction: itraconazole · avoid coadministration",
      `evaluated at the label's dose ${EXAMPLE.afDose} mg · also shown by the EHR`,
      GENAI_TONE.failure,
      2,
      { fill: "pastel", highlight: true }
    ),
    el(
      "a2",
      Y.a2,
      52,
      `Warning · dosing: ${EXAMPLE.criteriaMet} of 3 criteria (age, weight, creatinine)`,
      `the label's dose for ≥ 2 criteria: ${EXAMPLE.afDose} mg twice daily · intended 5 mg`,
      GENAI_TONE.failure,
      2
    ),
    why(
      "w-alerts",
      Y.a1 + 30,
      'Rendered by code before any model text;\n"also shown by the EHR" or "found only in notes".',
      2
    ),

    // Step 3: gaps and the explanation.
    el("gaps", Y.gaps, 36, "Gaps: none for this question", undefined, "neutral", 3),
    why("w-gaps", Y.gaps, "Only where a rule could apply: no pregnancy\ngap for an 82-year-old.", 3),
    el(
      "expl",
      Y.expl,
      112,
      "She meets all three of the label's dose-reduction criteria for atrial\nfibrillation, and the label's dose for patients meeting at least two\nis 2.5 mg twice daily [1]. At that dose it says to avoid itraconazole [1].",
      "options and doses only in the label's words; never “safe”, “start” or “do not start”",
      GENAI_TONE.model,
      3
    ),
    why("w-expl", Y.expl + 36, "The basis comes before the prose, against\nautomation bias; every sentence cites.", 3),

    // Step 4: freshness, sources, provenance and actions.
    el(
      "cov",
      Y.cov,
      44,
      "Data as of 10:41 · notes read to 10:30; unsigned notes not read",
      "checked: 8 meds · 2 allergies · 10 conditions · outside medication history 10:41",
      "neutral",
      4
    ),
    why("w-cov", Y.cov + 4, "Freshness on every answer: what was\nread, and what was not.", 4),
    el(
      "src",
      Y.src,
      44,
      "[1] Eliquis label, section 2, revised 8/2026 · DailyMed ↗",
      "▸ Provenance: rules, edges, facts, versions (collapsed)",
      GENAI_TONE.store,
      4
    ),
    why("w-src", Y.src + 4, "A DailyMed link on every label citation;\nprovenance one click away, not in the way.", 4),
    el(
      "act",
      Y.act,
      44,
      "Flag a sentence · Override with a reason · Code this fact",
      "code this fact: on note-derived alerts; the EHR applies it on acceptance",
      GENAI_TONE.user,
      4
    ),
    why("w-act", Y.act + 4, "Every action goes to the pharmacist queue;\nthe service never writes to the chart.", 4),
  ],
};

export default spec;
