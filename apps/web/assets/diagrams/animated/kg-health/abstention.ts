import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CHECKS, FRESHNESS } from "@/components/diagrams/presets/gcase-kghealth";

// "No alert" is not "safe": abstention by coverage rules, and provenance (kg-healthcare-case-study, Step 5 and deep dive
// 3; design sheet §10.9, §10.16–17, §15.3). Numbers from presets/gcase-kghealth.ts (ESTIMATES):
//   Recency (FRESHNESS): renal input within renalRecencyInpatientHours = 48 h for an inpatient, renalRecencyOutpatientDays
//   = 90 days outpatient; weight within this admission or weightRecencyOutpatientDays = 30 days; administrations within
//   medAdministrationWindowHours = 72 h. Rates: partialAbstainShare = 8% of safety questions carry at least one named
//   gap; fullAbstainShare = 2% cannot run the rules at all; CHECKS.pFallback ≈ 1.7% of answers have their explanation
//   replaced by the rules card (three or more dropped sentences).
//   The gap wordings are the sheet's: "dose check needs the indication: AF or VTE treatment have different rules";
//   "renal input not current for an inpatient"; "allergy list not reviewed"; "some notes are restricted and were not
//   read"; "sources disagree"; "no rule covers this question type; no safety check run"; an unknown unit is a gap,
//   never a number.
// Steps: 1 the seven templates and the inputs each needs · 2 the state of each input, and the gap it produces · 3 the
// coverage line and gap events on every answer · 4 the provenance chain from a sentence and from a fact.
// Layout (960 wide): the templates table on the left (name 150 + inputs 380, rows 40 apart from y 70), the input states
// on the right (x 590, 350 wide, the same rows); the coverage line and a gap event under them; two provenance chains
// at the bottom, four boxes each, 210 wide and 26 px apart.
// Colours (GENAI_TONE): templates lime (rules), inputs neutral, a present input green, the six gap states orange (a
// named gap) and red (no check run), the coverage line neutral, provenance violet (stores) and blue (source text).

const T = { x: 20, nameW: 150, inputX: 176, inputW: 384 } as const;
const S = { x: 590, chipW: 100, sayX: 696, sayW: 244 } as const;
const RY = (i: number) => 70 + i * 40;
const RH = 34;

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "cell", x, y, w, h: RH, label, tone, fill: "pastel", step, quiet: true, ...extra });

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  quiet = false
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: "neutral",
  step,
  quiet,
});

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

const templates: [string, string][] = [
  ["Interaction", `active meds: requests, statements, ${FRESHNESS.medAdministrationWindowHours} h admin.`],
  ["Allergy", "a reviewed allergy list, or NKDA recorded"],
  ["Drug–disease", "a mapped problem list (ICD-10-CM → SNOMED CT)"],
  ["Dosing (AF)", "indication, confirmed dose, age, weight, creatinine"],
  ["Duplicate therapy", "active meds, ingredient and class expansion"],
  ["Cumulative risk", "QT: latest QTc and potassium; risk counts"],
  ["Coverage", "a template covers the question type"],
];

const states: [string, string, LayoutTone][] = [
  ["present", "the rule runs", GENAI_TONE.model],
  ["stale", '"renal input not current"', "orange"],
  ["missing", '"dose check needs the indication"', "orange"],
  ["unmapped", "a gap, never silence", "orange"],
  ["restricted", '"some notes are restricted"', "orange"],
  ["conflicting", 'both shown: "sources disagree"', "orange"],
  ["not covered", '"no rule covers this question"', GENAI_TONE.failure],
];

const COV_Y = RY(7) + 34;
const GAP_Y = COV_Y + 58;
const PROV_Y = GAP_Y + 74;
const PX = (i: number) => 20 + i * 236;
const PW = 210;
const PH = 50;

const provBox = (id: string, i: number, row: number, label: string, sub: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "box",
  x: PX(i),
  y: PROV_Y + row * 70,
  w: PW,
  h: PH,
  label,
  sub,
  tone,
  fill: "pastel",
  step: 4,
});
const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "Abstention by coverage rules: every template names its inputs, and a missing input is a gap, never “no alert”",
  width: 960,
  height: PROV_Y + 70 + PH + 48,
  steps: [
    { title: "Seven templates, and the inputs each one needs" },
    { title: "Each input is present, or it produces a named gap" },
    { title: "A coverage line and gap events on every answer and card" },
    { title: "Provenance: from a sentence to a source version, from a fact to its stored input" },
  ],
  shapes: [
    // Step 1: the templates and their inputs.
    text("h-tpl", T.x, 44, T.nameW, "Template", 1),
    text("h-in", T.inputX, 44, T.inputW, "Inputs it needs", 1, true),
    ...templates.flatMap(([name, inputs], i): LayoutShape[] => [
      cell(`t${i}`, T.x, RY(i), T.nameW, name, GENAI_TONE.check, 1),
      cell(`t${i}-in`, T.inputX, RY(i), T.inputW, inputs, "neutral", 1, { fill: "soft" }),
    ]),

    // Step 2: the state of each input and the gap it produces.
    text("h-state", S.x, 44, S.sayX + S.sayW - S.x, "Input state → what the answer says", 2),
    ...states.flatMap(([state, says, tone], i): LayoutShape[] => [
      cell(`s${i}`, S.x, RY(i), S.chipW, state, tone, 2, i === 2 ? { quiet: false, highlight: true } : {}),
      cell(`s${i}-says`, S.sayX, RY(i), S.sayW, says, "neutral", 2, { fill: "soft" }),
    ]),
    text(
      "recency",
      T.x,
      RY(7) + 2,
      920,
      `Recency: creatinine ≤ ${FRESHNESS.renalRecencyInpatientHours} h inpatient, ≤ ${FRESHNESS.renalRecencyOutpatientDays} days outpatient; weight this admission or ≤ ${FRESHNESS.weightRecencyOutpatientDays} days; an unknown unit is a gap, never a number.`,
      2
    ),

    // Step 3: the coverage line and gap events.
    {
      id: "coverage",
      type: "box",
      x: 20,
      y: COV_Y,
      w: 920,
      h: 46,
      label: "Checked: 8 active meds · 2 allergies (confirmed) · 10 conditions · outside medication history read 10:41",
      sub: "data as of 10:41 · notes read to 10:30; unsigned notes not read · kg-2026-11-14 · vendor-2026.11.2",
      tone: "neutral",
      fill: "soft",
      step: 3,
    },
    {
      id: "gap",
      type: "box",
      x: 20,
      y: GAP_Y,
      w: 560,
      h: 46,
      label: 'gap: "dose check needs the indication: AF or VTE treatment have different rules"',
      sub: "the interaction alert still shows, worded for both doses",
      tone: "orange",
      fill: "pastel",
      step: 3,
    },
    text(
      "rates",
      600,
      GAP_Y + 4,
      340,
      `${pct(FRESHNESS.partialAbstainShare)} of safety questions name a gap; ${pct(FRESHNESS.fullAbstainShare)} cannot run the rules;`,
      3
    ),
    text(
      "rates-2",
      600,
      GAP_Y + 24,
      340,
      `${pct(CHECKS.pFallback, 1)} of explanations replaced by the rules card.`,
      3,
      true
    ),

    // Step 4: the provenance chains.
    provBox("p-sent", 0, 0, "Sentence 1 [1]", "shown 10:41:02, checks passed", GENAI_TONE.model),
    provBox("p-rule", 1, 0, "rule_dose_apx_af", "snapshot kg-2026-11-14", GENAI_TONE.check),
    provBox("p-src", 2, 0, "Eliquis label, section 2", "revised 8/2026, DailyMed set", GENAI_TONE.data),
    provBox("p-prov", 3, 0, "PROV record", "entity, activity, agent", GENAI_TONE.store),
    provBox("f-fact", 0, 1, "Fact: creatinine 1.595 mg/dL", "UCUM from 141 µmol/L", GENAI_TONE.store),
    provBox("f-in", 1, 1, "Stored input content", "Observation, outside lab", GENAI_TONE.store),
    provBox("f-audit", 2, 1, "AuditEvent", "every resource read", GENAI_TONE.store),
    provBox("f-ans", 3, 1, "Answer ans_4f2", "stored with its inputs", GENAI_TONE.store),
    arrow("pa-1", "p-sent", "p-rule", 4),
    arrow("pa-2", "p-rule", "p-src", 4),
    arrow("pa-3", "p-src", "p-prov", 4),
    arrow("fa-1", "f-fact", "f-in", 4),
    arrow("fa-2", "f-in", "f-audit", 4),
    arrow("fa-3", "f-audit", "f-ans", 4),
    text(
      "foot",
      20,
      PROV_Y + 70 + PH + 16,
      920,
      "Same facts and snapshot give the same alerts; determinism is claimed for the alerts, not for the model's text.",
      4
    ),
  ],
};

export default spec;
