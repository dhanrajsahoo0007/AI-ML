import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Ontology sketch" on the semiconductor yield case study: the entity types a fab's knowledge graph needs and the
// typed relations between them. A lot's journey runs along the middle row (Lot PROCESSED_AT a step ON_TOOL a tool);
// the step's recipe and material hang above and below it; the wafers and their defects and test results hang below
// the lot. The one entity type that comes from documents, Failure mechanism (extracted from FMEA tables and past
// reports), is blue and highlighted: it closes the loop from a defect back to a tool. "(t)" marks relations that carry
// a timestamp, "(v)" the recipe version.
//
// Tones (two plus neutral): entity types from fab systems violet (they live in the graph store), the
// document-derived type blue (text). Relations are neutral arrows with the relation name as the pill.
//
// entityType() and relation() are local copies of the builders in rag/kg-ontology (a spec may not import another
// spec). Layout: three columns of 160-wide boxes at x 20 | 360 | 700 (180 apart, room for a 16-character pill) and
// four rows at y 20 | 140 | 260 | 380 (64 between rows, room for a pill on a vertical arrow). Row 2 of the right
// column stays empty so ASSOCIATED_WITH runs straight up from the failure mechanism to the tool.

/** An entity type: a pastel box with the type name and its key properties as the sub line. */
function entityType(
  id: string,
  x: number,
  y: number,
  name: string,
  props: string,
  opts: { tone?: LayoutTone; highlight?: boolean } = {}
): LayoutShape {
  return {
    id,
    type: "box",
    x,
    y,
    w: 160,
    h: 56,
    label: name,
    sub: props,
    tone: opts.tone ?? RAG_TONE.store,
    fill: "pastel",
    highlight: opts.highlight,
  };
}

/** A typed relation: a neutral arrow from one entity type to another with the relation name as its pill. */
function relation(from: string, to: string, name: string): LayoutShape {
  const slug = name.toLowerCase().replace(/[^a-z_]+/g, "");
  return { id: `${from}-${slug}-${to}`, type: "arrow", x: 0, y: 0, from, to, label: name };
}

const COL = [20, 360, 700] as const;
const ROW = [20, 140, 260, 380] as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A fab ontology: lots, steps, tools, recipes, materials, defects and their causes",
  width: 880,
  height: 456,
  shapes: [
    entityType("recipe", COL[1], ROW[0], "Recipe", "name, version"),
    entityType("maint", COL[2], ROW[0], "Maintenance / alarm", "type, time"),
    entityType("lot", COL[0], ROW[1], "Lot", "id, product"),
    entityType("step", COL[1], ROW[1], "Process step", "route position"),
    entityType("tool", COL[2], ROW[1], "Tool / chamber", "tool, chamber id"),
    entityType("wafer", COL[0], ROW[2], "Wafer", "id, slot"),
    entityType("material", COL[1], ROW[2], "Material batch", "supplier lot"),
    entityType("yield", COL[0], ROW[3], "Test / yield result", "bins, yield %"),
    entityType("defect", COL[1], ROW[3], "Defect type", "map signature"),
    entityType("cause", COL[2], ROW[3], "Failure mechanism", "from FMEA, reports", {
      tone: RAG_TONE.text,
      highlight: true,
    }),

    // The lot's journey through the line.
    relation("lot", "step", "PROCESSED_AT (t)"),
    relation("step", "tool", "ON_TOOL"),
    relation("step", "recipe", "USES_RECIPE (v)"),
    relation("step", "material", "USES_MATERIAL"),
    relation("tool", "maint", "HAD_EVENT (t)"),
    // What came out of it.
    relation("lot", "wafer", "CONTAINS"),
    relation("wafer", "yield", "HAS_RESULT"),
    relation("wafer", "defect", "HAS_DEFECT"),
    // Knowledge from documents closes the loop back to a tool.
    relation("defect", "cause", "KNOWN_CAUSE"),
    relation("cause", "tool", "ASSOCIATED_WITH"),
  ],
};

export default spec;
