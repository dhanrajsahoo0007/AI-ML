import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CONTEXT, COST } from "@/components/diagrams/presets/gcase-kghealth";
import { fmt } from "@/components/diagrams/presets/rag";

// Where PHI may flow, and which model runs where (kg-healthcare-case-study, deep dive 1; design sheet §14, §11, §15.1).
//   PHI zone: the network's HIPAA-eligible cloud account under its BAA with the cloud provider (F57): gateway,
//   orchestrator, rules service with the snapshot, the fact store with note chunks (embeddings are PHI, F56), the
//   encoders on GPUs (NER, linking, assertion, cross-encoder, the 0.8B checker), answers, provenance and audit, logs,
//   annotation and the clinician-graded set.
//   Vendor model under BAA (F58, F69): receives the CONTEXT.total = 4,470-token prompt; structured facts pseudonymised
//   (no name, record number or address; relative dates); note text in record prompts sent as is; both are PHI. Covered
//   features only (Messages, prompt caching, structured outputs with PHI-free schemas); the cache holds PHI in memory
//   for its TTL.
//   Knowledge build (no PHI): vocabularies, the licensed base, labels, guidelines and crosswalks, shipped in as a
//   versioned snapshot; nothing flows back out.
//   De-identified copies only for anything that leaves: Expert Determination with surrogate substitution in free text,
//   a measured residual (the best published tool misses ≈ 4%, F55, vendor-authored), per-patient date shifts.
//   Restricted data: psychotherapy notes not ingested; confidential notes and 42 CFR Part 2 records carry security
//   labels, follow the user's entitlements, are read live with the clinician's own token where the EHR permits, and
//   are otherwise a named gap. Logs carry ids only; a scanner blocks names, record numbers and free text.
//   Self-hosting the answer model instead: COST.selfHostAnswerPerDay = 480 USD a day against COST.llmPerDay ≈ 74
//   (≈ 6.5×), and a lower quality tier that must pass the same clinician gate.
// Steps: 1 the PHI zone and the EHR feeding it · 2 the vendor model under BAA and what crosses to it · 3 the knowledge
// build in, de-identified copies out · 4 restricted notes, ids-only logs, and the self-hosted alternative.
// Layout (960 wide): the EHR left of the PHI zone; the PHI zone x 200–630 with two columns of 196-wide boxes at x 216 |
// 422, rows 80 apart from y 70; the vendor (top) and knowledge build (below) groups at x 690; the "leaves the zone"
// group along the bottom; arrows cross a group border only where data crosses the boundary.
// Colours (GENAI_TONE): the EHR teal, PHI-zone services neutral, the encoders and models green, stores violet, checks
// and rules lime, restricted data orange, the knowledge build blue, de-identified copies blue soft.

const A = 216;
const B = 422;
const V = 720;
const BW = 196;
const BH = 56;
const ROW = (i: number) => 70 + i * 80;

const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w: BW, h: BH, label, sub, tone, fill: "pastel", step, ...extra });
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

const DEID_Y = 548;
const OUT_X = 400;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where PHI may flow: one zone in the network's account, a vendor model under BAA, nothing back from the build",
  width: 960,
  height: 676,
  steps: [
    { title: "The PHI zone: every service and store that holds patient data" },
    { title: `The vendor model under BAA: a ${fmt(CONTEXT.total)}-token prompt, covered features only` },
    { title: "The knowledge build ships in; only de-identified copies go out" },
    { title: "Restricted notes, ids-only logs, and the self-hosted alternative" },
  ],
  groups: [
    { id: "g-phi", title: "PHI zone: the network's account", tone: "violet", x: 200, y: 30, w: 430, h: 476 },
    { id: "g-vendor", title: "Vendor model, BAA", tone: "green", x: 690, y: 30, w: 250, h: 218 },
    { id: "g-kb", title: "Knowledge build: no PHI", tone: "blue", x: 690, y: 288, w: 250, h: 218 },
    { id: "g-out", title: "De-identified only", tone: "neutral", x: 200, y: 524, w: 740, h: 92 },
  ],
  shapes: [
    // Step 1: the PHI zone.
    box("ehr", 20, 222, "EHR", "FHIR reads, HL7 v2 feeds", GENAI_TONE.tool, 1, { w: 150, h: 72 }),
    box("gateway", A, ROW(0), "Gateway", "token, care team, audit", "neutral", 1),
    box("encoders", A, ROW(1), "Encoders on GPUs", "NER, linking, rerank, checker", GENAI_TONE.model, 1),
    box("facts", A, ROW(2), "Fact store, note chunks", "embeddings are PHI too", GENAI_TONE.store, 1),
    box("annot", A, ROW(4), "Annotation, eval sets", "workforce annotators", GENAI_TONE.check, 1),
    box("orch", B, ROW(0), "Orchestrator", "builds the prompt", "neutral", 1),
    box("answers", B, ROW(1), "Answers, PROV, audit", "stored with their inputs", GENAI_TONE.store, 1),
    box("rules", B, ROW(3), "Rules + snapshot", "in memory, versioned", GENAI_TONE.check, 1),
    arrow("a-ehr", "ehr", "facts", 1),

    // Step 2: the vendor model under BAA.
    box("model", V, ROW(0), "Answer, planner models", "covered features only", GENAI_TONE.model, 2),
    box("cache", V, ROW(1), "Prompt cache", "PHI in memory for the TTL", GENAI_TONE.model, 2, { fill: "soft" }),
    arrow("a-prompt", "orch", "model", 2, { label: `${fmt(CONTEXT.total)} tokens` }),
    arrow("a-cache", "model", "cache", 2),

    // Step 3: the knowledge build in, de-identified copies out.
    box("kb", V, 330, "Vocabularies, drug KB,", "labels, guidelines, crosswalks", GENAI_TONE.data, 3),
    {
      id: "kb-note",
      type: "text",
      x: V,
      y: 400,
      w: BW,
      h: 36,
      label: "versioned snapshot in;\nnothing flows back out",
      tone: "neutral",
      step: 3,
    },
    arrow("a-kb", "kb", "rules", 3, { label: "snapshot" }),
    box("deid", 220, DEID_Y, "Expert Determination", "surrogates, date shifts; ≈ 4% residual", GENAI_TONE.data, 3, {
      w: 400,
      fill: "soft",
    }),
    box("outside", V, DEID_Y, "Outside annotators,", "research: copies only", "neutral", 3),
    // Leaves the annotation box at x 400, right of the bottom group's title tab (x 216–392).
    arrow("a-deid", "annot", "deid", 3, {
      via: [
        [OUT_X, ROW(4) + BH + 4],
        [OUT_X, DEID_Y - 4],
      ],
    }),
    arrow("a-out", "deid", "outside", 3),

    // Step 4: restricted notes and logs.
    box("restricted", B, ROW(4), "Restricted notes", "labels; Part 2 needs consent", "orange", 4, { highlight: true }),
    box("logs", B, ROW(2), "Logs, traces", "ids only; scanner on names", "neutral", 4),
    text(
      "foot-1",
      630,
      "Structured facts are pseudonymised; note text in record prompts goes as is. Both are PHI under the BAA.",
      4
    ),
    text(
      "foot-2",
      652,
      `Self-hosting the answer model: ≈ ${Math.round(COST.selfHostAnswerPerDay)} USD a day against ≈ ${Math.round(COST.llmPerDay)} hosted (${COST.selfHostRatio.toFixed(1)}×), and a lower quality tier.`,
      4
    ),
  ],
};

export default spec;
