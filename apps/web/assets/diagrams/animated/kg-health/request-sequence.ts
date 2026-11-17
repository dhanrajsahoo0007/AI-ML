import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { CONTEXT, EXAMPLE, LATENCY, WALK } from "@/components/diagrams/presets/gcase-kghealth";

// One drug-safety question, end to end (kg-healthcare-case-study, Steps 4–5 and the walk-through in design sheet §9):
// "Is it safe to start apixaban 5 mg twice daily for her AF?", an outpatient cardiology visit, encoder route, p50.
// Times are WALK in presets/gcase-kghealth.ts (the same stages LATENCY uses):
//   edge 40 (SMART token, Patient/8841 from context, care team, entitlements, one AuditEvent); classifier ‖ six FHIR
//   reads, the slowest of six LATENCY.headEncoder ≈ 374 → 414; resolve the drug 50 → 464 (exact RxNorm match; the
//   dose comes only from the question text, so the chip asks for one tap, clinician time outside the budget);
//   expansions ≈ 30 + join 2 + phase 2 1 → 497; `alerts` event 10 → WALK.alertsMs ≈ 507 (≈ 516 mixed over both routes,
//   LATENCY.safetyAlerts); passages 60 + rerank 80 + context 10 → 657; first token 500 → 1,157; first sentence 25
//   tokens at 80 a second = 312.5 → 1,470; checks 60 → WALK.safetyFirstMs ≈ 1,530 (≈ 1,562 mixed with drops).
//   Clinical facts (EXAMPLE, Eliquis label F66, F67): age 82, 58 kg, creatinine 141 µmol/L = 1.595 mg/dL (shown 1.6),
//   3 of 3 criteria → the label's dose for patients meeting at least 2 is 2.5 mg twice daily; itraconazole is a combined
//   P-gp and strong CYP3A4 inhibitor, evaluated in phase 2 on the criteria dose 2.5 mg → "avoid coadministration".
//   A dropped sentence: the checker rejects it, it is never shown, generation restarts from the last shown sentence with
//   the claim excluded (LATENCY.restartMs = 672.5: cached-prompt first token 300 + a sentence + checks).
//   A patient switch: the EHR's FHIRcast hub says the current patient changed; the panel drops the event stamped
//   Patient/8841 and closes the stream.
// Steps: 1 identity and patient before data · 2 classifier ‖ FHIR, resolve the drug · 3 rules: expansions, two phases,
// alerts · 4 passages, model, the first verified sentence · 5 a drop and a restart · 6 a patient switch drops an event.
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): Clinician orange, Gateway and Orchestrator neutral
// (harness), EHR FHIR blue (data), Rules and Checks teal (checks), Answer model green.

const ms = (v: number) => `${n(Math.round(v))} ms`;
const head = WALK.safety[0].ms + WALK.safety[1].ms; // ≈ 414
const resolved = head + WALK.safety[2].ms; // ≈ 464

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: identity and patient before data.
  m("user", "gateway", '"Is it safe to start apixaban 5 mg twice daily?"', 1),
  m("gateway", "orch", `Patient/8841 from token; care team ✓ (${WALK.safety[0].ms} ms)`, 1),

  // Step 2: classifier in parallel with six FHIR reads; resolve the drug.
  m("orch", "ehr", "6 reads: meds, allergies, conditions, labs", 2),
  m("ehr", "orch", `slowest of 6 ≈ ${ms(LATENCY.headEncoder.p50)}`, 2, "return"),
  m("orch", "gateway", "drug chip: apixaban, oral; dose from text", 2, "return"),
  m("gateway", "user", "tap: confirm 5 mg twice daily", 2, "return"),
  m("user", "gateway", "confirmed (outside the budget)", 2),

  // Step 3: rules decide; alerts sent before any model text.
  m("orch", "rules", `facts at ${ms(resolved)}: 82 y, ${EXAMPLE.weightKg} kg, SCr 1.6, itraconazole`, 3),
  m("rules", "orch", `${EXAMPLE.criteriaMet} of 3 criteria; phase 2 on ${EXAMPLE.afDose} mg: avoid`, 3, "return"),
  m("orch", "gateway", `alerts at ${ms(WALK.alertsMs)}`, 3, "return"),
  m("gateway", "user", "2 alerts with sources, first", 3, "return"),

  // Step 4: passages, the model, the first sentence checked.
  m("orch", "model", `${n(CONTEXT.total)}-token context at ${ms(WALK.contextMs)}`, 4),
  m("model", "orch", `sentence 1 [rule, label §2] at ${ms(WALK.firstSentenceMs)}`, 4, "return"),
  m("orch", "checks", "check sentence 1", 4),
  m("checks", "orch", "cited rule and passage support it ✓", 4, "return"),
  m("orch", "gateway", `sentence 1 at ${ms(WALK.safetyFirstMs)}`, 4, "return"),
  m("gateway", "user", "first verified sentence", 4, "return"),

  // Step 5: a dropped sentence restarts generation.
  m("model", "orch", '"no other interactions" (sentence 4)', 5, "return"),
  m("orch", "checks", "check sentence 4", 5),
  m("checks", "orch", "contradicts an alert: drop", 5, "return"),
  m("orch", "model", "restart after sentence 3, claim out", 5),
  m("model", "orch", `next sentence ≈ ${ms(LATENCY.restartMs)} later`, 5, "return"),

  // Step 6: the EHR switches patient mid-stream.
  m("ehr", "gateway", "FHIRcast: patient-open Patient/9120", 6, "async"),
  m("orch", "gateway", "sentence 6 for Patient/8841", 6, "return"),
  m("gateway", "user", "dropped at display: stamp ≠ current", 6, "return"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "ehr", text: "classifier ‖ reads; no model call", step: 2, at: firstOf(2) + 1.5 },
  { lane: "rules", text: "label: ≥ 2 criteria → 2.5 mg twice daily", step: 3, at: firstOf(3) + 1.5 },
  { lane: "checks", text: "dropped: never shown", step: 5, at: firstOf(5) + 2.5 },
  { lane: "user", text: "stream closed, logged", step: 6, at: messages.length },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One drug-safety question: alerts at 507 ms before any model text, the first verified sentence at 1,530 ms",
  width: 1120,
  lanes: [
    { id: "user", label: "Clinician", icon: "users", tone: SEQUENCE_LANE.user },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "ehr", label: "EHR FHIR", icon: "building", tone: SEQUENCE_LANE.data },
    { id: "rules", label: "Rules", icon: "policy", tone: SEQUENCE_LANE.check },
    { id: "model", label: "Answer model", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "checks", label: "Checks", icon: "shield", tone: SEQUENCE_LANE.check },
  ],
  steps: [
    { title: "Identity and patient before any read" },
    { title: `Classifier in parallel with six FHIR reads; the drug resolved by ${ms(resolved)}` },
    { title: `Rules decide: alerts at ${ms(WALK.alertsMs)}, before any model text` },
    { title: `Passages, model and checks: the first verified sentence at ${ms(WALK.safetyFirstMs)}` },
    { title: "A sentence that contradicts an alert is dropped and generation restarts" },
    { title: "A patient switch mid-stream: the stale event is dropped" },
  ],
  messages,
  notes,
};

export default spec;
