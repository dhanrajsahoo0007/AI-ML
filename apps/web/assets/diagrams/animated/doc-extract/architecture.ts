import type { DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { GATES, SCENARIOS } from "@/components/diagrams/presets/gcase-docextract";
import { fmt } from "@/components/diagrams/presets/rag";

// Brightpost's accounts-payable extraction pipeline (genai-system-design/case-studies/document-extraction-pipeline),
// the hero. Built one requirement at a time, exactly as design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/
// design/document-extraction-pipeline.md):
//   1 One model call per PDF (F1, F3): suppliers → intake API → orchestrator → extraction model; the original goes to
//     the document store; the JSON is posted straight to the ERP (`until: 5`, replaced by the poster in step 6).
//   2 Ingest once; classify, split, detect e-invoices (F1, F2): expense app, page classifier.
//   3 Parse pages into words with boxes (F3, N6): page parser, OCR (Azure Read), pages and words.
//   4 Route by difficulty; extract with word ids (F3): router, schema registry and supplier profiles. The orchestrator's
//     step-1 call to the model (`until: 3`) is replaced by the router's routed call on the same line.
//   5 Independent second reader, rules, calibrated score (F4, N1): second reader (Textract), validator (reads the ERP),
//     scorer, field records.
//   6 Review queue and effectively-once posting (F5, F6, N3): review app, review queue, poster (outbox → ERP).
//   7 Close the loop with labels the scorer did not choose (F7, N1, N2): labels and calibrator, gold set.
//   8 Data boundary, guardrails, release gate (N5, N6): release gate (gold set, weekly calibrator candidate, gates the
//     model). Bank-detail masking and zero data retention are on the page, not drawn.
// Names that had to be shortened to fit a 150 px card: the sheet's "Extraction model (small and mid)" is "Extractor,
// small or mid VLM"; "Second reader (Textract)" and "OCR (Azure Read)" keep the vendor in the sub line.
// Numbers: SCENARIOS.steady.mix (A 55%, B 40%, C 5%) and GATES.n (2,000 gold-set invoices), presets/gcase-docextract.ts.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The "Models and readers" tab is 18 characters × 8.2 +
// 28 = 176 px wide, x 421–597 at y 316–344; nothing crosses the core/services boundary left of x 605.
//   Clients x 105: review app 96, suppliers 210 (the main line), expense app 330.
//   Edge x 297: intake API 210.
//   Extraction pipeline, cards 40 tall (48 for the orchestrator), columns x 490 | 660, rows 96 | 153 | 210 | 267:
//            x 490          x 660
//     96     Review queue   Poster
//     153    Scorer         Validator
//     210    Orchestrator (accent, 320 wide)
//     267    Page parser    Router
//   The orchestrator spans both columns, so it touches the validator above and the parser and router below; the
//   decision path runs validator → scorer → review queue or poster, and the queue's approvals → poster.
//   Models and readers, columns x 490 | 660, rows 400 | 505 | 615: second reader, page classifier, OCR (left, taps of
//   one trunk down the left gutter x 394 from the orchestrator's left side at y 226) | extraction model (right, under
//   the router: the x 660 drop right of the tab).
//   Offline x 879 (190 wide, 46 tall): labels and calibrator 340, release gate 440.
//   Data and state x 1098 (glyphs 102 apart, the first clear of the zone tab): ERP 104, schemas and profiles 206,
//   field records 308, gold set 410, pages and words 512, document store 614 (its label ends at y 676, inside the zone).
// Routing (every long edge checked against the boxes and tabs it passes):
//   - The trunk starts at y 226, under the main line (y 210) where it crosses x 394; the review app's line (y 96) is
//     above it, so no line crosses the trunk.
//   - The orchestrator's store lines leave its right side through stubs at x 752 (ERP y 200, field records y 222) or
//     straight (schema y 208), so none clips the validator (bottom 173) or the router (top 247). Store targets are
//     ordered as their sources are (poster and validator above the orchestrator), so no two store lines cross.
//   - The step-1 orchestrator → model call bends at (660, 250) and drops at x 660 through the router's slot, which is
//     empty until step 4, when the router → model call replaces it on the same line.
//   - OCR → pages and words leaves the OCR's right side over the empty services slots and passes under Offline (y ≈
//     550 at x 974). Intake → document store runs down the edge column and along y 705, under every zone.
//   - Release gate → model is a short line left across the right gutter into the model's right side, unlabelled (a
//     label there covers the gate's border); the page says the gate covers model, prompt, schema, OCR and scorer.
// Colours (GENAI_TONE roles): suppliers, the expense app and the review app orange (people); the extraction model,
// second reader and classifier green (model calls); the parser and OCR blue (page data); router and scorer lime
// (ranking, a score); validator, labels and the release gate lime (checks); review queue and poster teal (actions);
// stores violet glyphs; the intake API neutral; the orchestrator the one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 879, store: 1098 } as const;
const ROW = { c1: 96, c2: 153, c3: 210, c4: 267, s1: 400, s2: 505, s3: 615 } as const;
const GUTTER = { left: 394, stub: 752, bottom: 705 } as const;
const TRUNK_Y = 226;
const W = 150;
const CH = 40;
const AW = 190;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, icon, x, y, w: W, step, fill: "pastel", ...extra });

const core = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => card(id, label, sub, icon, x, y, step, { h: CH, ...extra });

const store = (id: string, label: string, sub: string, icon: string, y: number, step: number): DiagramNode => ({
  id,
  label,
  sub,
  icon,
  tone: GENAI_TONE.store,
  variant: "glyph",
  x: C.store,
  y,
  step,
});

const mix = SCENARIOS.steady.mix;
const pct = (v: number) => `${Math.round(v * 100)}`;
const trunk = (y: number): [number, number][] => [
  [GUTTER.left, TRUNK_Y],
  [GUTTER.left, y],
];

const spec: DiagramSpec = {
  title: "Document extraction pipeline: route by difficulty, read twice on different inputs, check in code, post once",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "One model call per PDF", covers: "F1, F3" },
    { title: "Ingest once; classify, split, detect e-invoices", covers: "F1, F2" },
    { title: "Parse pages into words with boxes", covers: "F3, N6" },
    { title: "Route by difficulty; extract with word ids", covers: "F3" },
    { title: "Independent second reader, rules, calibrated score", covers: "F4, N1" },
    { title: "Review queue and effectively-once posting", covers: "F5, F6, N3" },
    { title: "Close the loop with labels the scorer did not choose", covers: "F7, N1, N2" },
    { title: "Data boundary, guardrails, release gate", covers: "N5, N6" },
  ],
  zones: genaiZones({ core: "Extraction pipeline", services: "Models and readers" }),
  nodes: [
    // Clients
    card("review-app", "Review app", "AP clerks", "users", C.clients, ROW.c1, 6, { tone: GENAI_TONE.user }),
    card("suppliers", "Suppliers", "email, portal", "users", C.clients, ROW.c3, 1, { tone: GENAI_TONE.user }),
    card("expense", "Expense app", "receipts", "phone", C.clients, 330, 2, { tone: GENAI_TONE.user }),

    // Edge and gateway
    card("intake", "Intake API", "dedup, scan", "gateway", C.edge, ROW.c3, 1),

    // Extraction pipeline
    core("queue", "Review queue", "by due date", "queue", C.left, ROW.c1, 6, { tone: GENAI_TONE.tool }),
    core("poster", "Poster", "outbox, one key", "api", C.right, ROW.c1, 6, { tone: GENAI_TONE.tool }),
    core("scorer", "Scorer", "calibrated score", "meter", C.left, ROW.c2, 5, { tone: GENAI_TONE.rank }),
    core("validator", "Validator", "rules per family", "shield", C.right, ROW.c2, 5, { tone: GENAI_TONE.check }),
    {
      id: "orch",
      label: "Orchestrator",
      sub: "durable workflow, one row per document",
      icon: "coordinator",
      accent: true,
      x: 575,
      y: ROW.c3,
      w: 320,
      h: 48,
      step: 1,
    },
    core("parser", "Page parser", "render, hidden text", "file", C.left, ROW.c4, 3, { w: 160, tone: GENAI_TONE.data }),
    core("router", "Router", `A ${pct(mix.A)} · B ${pct(mix.B)} · C ${pct(mix.C)}%`, "router", C.right, ROW.c4, 4, {
      w: 158,
      tone: GENAI_TONE.rank,
    }),

    // Models and readers
    card("second", "Second reader", "Textract", "model", C.left, ROW.s1, 5, { tone: GENAI_TONE.model }),
    card("model", "Extractor", "small or mid VLM", "model", C.right, ROW.s1, 1, { tone: GENAI_TONE.model }),
    card("classifier", "Page classifier", "kind, split", "model", C.left, ROW.s2, 2, { tone: GENAI_TONE.model }),
    card("ocr", "OCR", "Azure Read, boxes", "image", C.left, ROW.s3, 3, { w: 160, tone: GENAI_TONE.data }),

    // Offline pipelines
    card("labels", "Labels, calibrator", "audits, weekly retrain", "chart", C.async, 340, 7, {
      w: AW,
      h: 46,
      tone: GENAI_TONE.check,
    }),
    card("gate", "Release gate", "gold set, canary", "shield-check", C.async, 440, 8, {
      w: AW,
      h: 46,
      tone: GENAI_TONE.check,
    }),

    // Data and state
    store("erp", "ERP", "master, POs, ledger", "ledger", 104, 1),
    store("schema", "Schemas, profiles", "per type and supplier", "database", 206, 4),
    store("fields", "Field records", "words, page, box", "database", 308, 5),
    store("gold", "Gold set", `${fmt(GATES.n)} invoices`, "database", 410, 7),
    store("words", "Pages and words", "per OCR version", "blob", 512, 3),
    store("docs", "Document store", "originals, object lock", "blob", 614, 1),
  ],
  edges: [
    // Step 1: one call, packet by packet; the original is kept; the JSON is posted directly.
    { from: "suppliers", to: "intake", flow: true, packet: true },
    { from: "intake", to: "orch", flow: true, packet: true, delay: 0.6 },
    {
      from: "orch",
      to: "model",
      label: "PDF in, JSON out",
      labelAt: 0.55,
      flow: true,
      packet: true,
      delay: 1.2,
      bidirectional: true,
      via: [[C.right, 250]],
      until: 3,
    },
    {
      from: "orch",
      to: "erp",
      label: "post",
      labelAt: 0.7,
      flow: true,
      packet: true,
      delay: 1.8,
      via: [[GUTTER.stub, 200]],
      until: 5,
    },
    {
      from: "intake",
      to: "docs",
      label: "original, by sha256",
      labelAt: 0.55,
      dashed: true,
      via: [
        [C.edge, GUTTER.bottom],
        [C.store, GUTTER.bottom],
      ],
    },

    // Step 2: receipts arrive too; every page is classified and split.
    { from: "expense", to: "intake" },
    { from: "orch", to: "classifier", via: trunk(ROW.s2) },

    // Step 3: words with ids and boxes before any extraction.
    { from: "orch", to: "parser", bidirectional: true },
    { from: "orch", to: "ocr", via: trunk(ROW.s3) },
    { from: "ocr", to: "words", label: "words, boxes", labelAt: 0.3, dashed: true },

    // Step 4: route; the routed call replaces the step-1 call on the same line.
    { from: "orch", to: "router", bidirectional: true },
    { from: "router", to: "model", label: "A / B / C", labelAt: 0.5, bidirectional: true, step: 4 },
    { from: "schema", to: "orch", label: "schema, hints", labelAt: 0.4, dashed: true },

    // Step 5: an independent reader, rules against the ERP, a calibrated score per field.
    { from: "orch", to: "second", bidirectional: true, via: trunk(ROW.s1) },
    { from: "orch", to: "validator" },
    { from: "validator", to: "erp", label: "POs, master", labelAt: 0.5, dashed: true, bidirectional: true },
    { from: "validator", to: "scorer" },
    { from: "orch", to: "fields", label: "values, word ids", labelAt: 0.55, dashed: true, via: [[GUTTER.stub, 222]] },

    // Step 6: flagged fields to a clerk; approvals and auto-approvals post once through the outbox.
    { from: "scorer", to: "queue", label: "flagged" },
    { from: "scorer", to: "poster", label: "auto", labelAt: 0.6 },
    { from: "review-app", to: "queue", bidirectional: true },
    { from: "queue", to: "poster" },
    { from: "poster", to: "erp", label: "post once, await ack", labelAt: 0.45 },

    // Step 7: labels the scorer did not choose.
    { from: "fields", to: "labels", label: "corrections", labelAt: 0.5, dashed: true },
    { from: "labels", to: "gold", dashed: true },

    // Step 8: the gate decides each release.
    { from: "gold", to: "gate", dashed: true },
    { from: "labels", to: "gate", label: "weekly candidate", labelAt: 0.5, dashed: true },
    { from: "gate", to: "model", dashed: true },
  ],
};

export default spec;
