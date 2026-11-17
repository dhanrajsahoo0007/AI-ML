import type { DiagramSpec, LayoutTone } from "@/components/diagrams/types";

// The document extraction pipeline (genai-system-design/case-studies/document-extraction-pipeline), built up one
// requirement at a time for Brightpost's finance team and its supplier invoices. Case-study figure: zones and tones
// follow the "Architecture diagram groups" table in content/system-design/CASE-STUDY-FORMAT.md, not the RAG legend.
//
// Seven steps: 1 upload a PDF, get fields into the ERP · 2 classify and split each file · 3 OCR and layout for scans ·
// 4 extract to a versioned schema · 5 validate and score every field · 6 send doubtful invoices to a clerk ·
// 7 measure accuracy and drift. Nodes never move between steps. Shortcuts that a later step replaces carry `until`:
// ingest feeds the extractor directly until the classifier arrives (step 2), the classifier feeds the extractor
// directly until OCR arrives (step 3), and the extractor posts straight to the ERP until the validator arrives
// (step 5).
//
// Grid: five columns at x 90 | 265 | 440 | 615 | 790 (175 apart, cards 150 wide) and rows at y 100 | 225 | 355.
//
//            c1               c2             c3               c4              c5
//   r1       Suppliers        Classifier     OCR + layout     Extractor*      ERP
//   r2       Ingest           Doc store      Schemas          Review queue    Validator
//   r3       ·                ·              ·                ·  Accuracy monitor (between c4 and c5)
//
// The pipeline runs along the top row; the validator posts up into the ERP and trades doubtful invoices with the
// review queue beside it. Edges into a zone's left-hand column never come from straight above, so no line crosses a
// zone's title tab, and nothing crosses.
//
// Zones (CASE-STUDY-FORMAT): Clients neutral, Edge blue, core pipeline green (the extractor is the accent),
// application services teal, async pipeline orange, storage violet. The ERP is the finance team's own system, in a
// neutral "Finance systems" zone. Data stores use the glyph variant.

/** The zone table from CASE-STUDY-FORMAT.md, by group. */
const ZONE_TONE = {
  clients: "neutral",
  edge: "blue",
  core: "green",
  services: "teal",
  async: "orange",
  storage: "violet",
} as const satisfies Record<string, LayoutTone>;

const X = [90, 265, 440, 615, 790] as const;
const Y = [100, 225, 355] as const;
const W = 150;

/** A zone around columns c0..c1 (0-based), from top `y` to bottom `b`. */
const zone = (id: string, title: string, tone: LayoutTone, c0: number, c1: number, y: number, b: number) => ({
  id,
  title,
  tone,
  x: X[c0] - 82,
  y,
  w: X[c1] - X[c0] + 164,
  h: b - y,
});

const spec: DiagramSpec = {
  title: "Document extraction pipeline: from supplier invoice to ERP posting",
  width: 880,
  height: 420,
  steps: [
    { title: "Upload a PDF, get the fields into the ERP", covers: "F1, F6" },
    { title: "Classify each file and split it into documents", covers: "F2" },
    { title: "Read scans with OCR and layout", covers: "F1" },
    { title: "Extract to a versioned schema", covers: "F3" },
    { title: "Validate and score every field", covers: "F4" },
    { title: "Send doubtful invoices to a clerk", covers: "F5, N1" },
    { title: "Measure accuracy and drift", covers: "N1, N2" },
  ],
  zones: [
    zone("clients", "Clients", ZONE_TONE.clients, 0, 0, 40, 145),
    zone("edge", "Edge", ZONE_TONE.edge, 0, 0, 165, 270),
    zone("core", "Core pipeline", ZONE_TONE.core, 1, 3, 40, 145),
    zone("finance", "Finance systems", "neutral", 4, 4, 40, 145),
    // Starts a little lower than the edge zone so the ingest-to-classifier line passes above its title tab.
    zone("storage", "Storage", ZONE_TONE.storage, 1, 2, 175, 300),
    zone("services", "Services", ZONE_TONE.services, 3, 4, 165, 270),
    zone("async", "Async pipeline", ZONE_TONE.async, 3, 4, 290, 405),
  ],
  nodes: [
    // Step 1: the smallest pipeline.
    { id: "suppliers", label: "Suppliers", sub: "email PDFs", icon: "building", x: X[0], y: Y[0], w: W },
    {
      id: "ingest",
      label: "Ingest",
      sub: "inbox, upload",
      icon: "gateway",
      tone: ZONE_TONE.edge,
      x: X[0],
      y: Y[1],
      w: W,
    },
    {
      id: "docstore",
      label: "Doc store",
      sub: "originals",
      icon: "blob",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      x: X[1],
      y: Y[1],
    },
    {
      id: "extractor",
      label: "Extractor",
      sub: "VLM → JSON",
      icon: "model",
      tone: ZONE_TONE.core,
      accent: true,
      x: X[3],
      y: Y[0],
      w: W,
    },
    { id: "erp", label: "ERP", sub: "suppliers, POs", icon: "ledger", x: X[4], y: Y[0], w: W },

    // Step 2: classify and split.
    {
      id: "classifier",
      label: "Classifier",
      sub: "type, split",
      icon: "flag",
      tone: ZONE_TONE.core,
      step: 2,
      x: X[1],
      y: Y[0],
      w: W,
    },

    // Step 3: OCR and layout.
    {
      id: "ocr",
      label: "OCR + layout",
      sub: "words, boxes",
      icon: "file",
      tone: ZONE_TONE.core,
      step: 3,
      x: X[2],
      y: Y[0],
      w: W,
    },

    // Step 4: schemas.
    {
      id: "schemas",
      label: "Schemas",
      sub: "per doc type",
      icon: "registry",
      tone: ZONE_TONE.storage,
      variant: "glyph",
      step: 4,
      x: X[2],
      y: Y[1],
    },

    // Step 5: validation.
    {
      id: "validator",
      label: "Validator",
      sub: "rules, scores",
      icon: "policy",
      tone: ZONE_TONE.services,
      step: 5,
      x: X[4],
      y: Y[1],
      w: W,
    },

    // Step 6: people.
    {
      id: "review",
      label: "Review queue",
      sub: "clerks check",
      icon: "users",
      tone: ZONE_TONE.services,
      step: 6,
      x: X[3],
      y: Y[1],
      w: W,
    },

    // Step 7: accuracy and drift.
    {
      id: "monitor",
      label: "Accuracy monitor",
      sub: "eval set, drift",
      icon: "chart",
      tone: ZONE_TONE.async,
      step: 7,
      x: (X[3] + X[4]) / 2,
      y: Y[2],
      w: 170,
    },
  ],
  edges: [
    // The path of one invoice, packet by packet.
    { from: "suppliers", to: "ingest", packet: true },
    { from: "ingest", to: "docstore", packet: true, delay: 0.6 },
    // Step 1 only: along the later ingest-to-classifier line, then through the empty classifier and OCR slots.
    { from: "ingest", to: "extractor", packet: true, delay: 0.6, until: 1, via: [[X[1], Y[0]]] },
    { from: "ingest", to: "classifier", packet: true, delay: 0.6 },
    { from: "classifier", to: "extractor", packet: true, delay: 1.2, until: 2 },
    { from: "classifier", to: "ocr", packet: true, delay: 1.2 },
    { from: "ocr", to: "extractor", packet: true, delay: 1.8 },
    { from: "schemas", to: "extractor" },
    { from: "extractor", to: "erp", packet: true, delay: 2.4, until: 4 },
    { from: "extractor", to: "validator", label: "scored fields", packet: true, delay: 2.4 },
    { from: "validator", to: "erp", bidirectional: true, packet: true, delay: 3 },

    // Doubtful invoices go to a person and come back corrected.
    { from: "validator", to: "review", bidirectional: true, dashed: true },

    // Every decision and correction is measured.
    { from: "validator", to: "monitor", dashed: true },
  ],
};

export default spec;
