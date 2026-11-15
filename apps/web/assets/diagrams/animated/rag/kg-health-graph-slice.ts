import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Medical knowledge graph slice" on the healthcare case study, with the page's own generic entities (Drug A, Drug B):
// no real drug pair is named, so the figure makes no clinical claim. Two paths reach Drug B, the drug being
// prescribed (highlighted): Drug A INTERACTS_WITH Drug B, and Drug B is CONTRAINDICATED_IN renal impairment, which an
// eGFR lab result INDICATES. Each path is one deterministic safety rule. Drug A also has a condition it TREATS, a gene
// variant that AFFECTS_METABOLISM_OF it, and a guideline section that RECOMMENDS it.
//
// Tones (two plus neutral): entity types violet (the graph store); the guideline section blue (text, which the
// passage index also holds). Relations are neutral arrows with the relation name as the pill.
//
// entityType() and relation() are local copies of the builders in rag/kg-ontology (a spec may not import another
// spec). Layout: three columns of 140-wide boxes at x 20 | 370 | 720 (210 apart, room for the 22-character
// INTERACTS_WITH (major) pill) and three rows at y 30 | 170 | 310 (84 between rows, room for a pill on a vertical
// arrow). The guideline sits above Drug B so RECOMMENDS is the one diagonal.

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
    w: 140,
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

const COL = [20, 370, 720] as const;
const ROW = [30, 170, 310] as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A slice of the medical knowledge graph: two paths lead to an alert for Drug B",
  width: 880,
  height: 390,
  shapes: [
    entityType("gene", COL[0], ROW[0], "Gene variant", "gene, allele"),
    entityType("guide", COL[1], ROW[0], "Guideline section", "source, version", { tone: RAG_TONE.text }),
    entityType("lab", COL[2], ROW[0], "Lab: eGFR", "LOINC, value"),
    entityType("drugA", COL[0], ROW[1], "Drug A", "RxNorm code"),
    entityType("drugB", COL[1], ROW[1], "Drug B", "RxNorm code", { highlight: true }),
    entityType("renal", COL[2], ROW[1], "Renal impairment", "SNOMED CT code"),
    entityType("condition", COL[0], ROW[2], "Condition", "SNOMED CT code"),

    relation("drugA", "drugB", "INTERACTS_WITH (major)"),
    relation("drugB", "renal", "CONTRAINDICATED_IN"),
    relation("lab", "renal", "INDICATES"),
    relation("drugA", "condition", "TREATS"),
    relation("gene", "drugA", "AFFECTS_METABOLISM_OF"),
    relation("guide", "drugA", "RECOMMENDS"),
  ],
};

export default spec;
