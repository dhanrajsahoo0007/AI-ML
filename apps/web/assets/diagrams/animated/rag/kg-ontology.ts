import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "A minimal ontology pattern": the schema behind the multi-hop question. Three entity types (Incident, Service,
// Team) joined by typed relations (AFFECTED, OWNED_BY); the incident and the service are MENTIONED_IN document
// chunks (the highlight: the bridge between the graph and the vector index), and every chunk points FROM_SOURCE to its
// source with a date and a confidence (provenance).
//
// Tones (three plus neutral): entity types violet (they live in the graph store), chunks blue (text), the source
// neutral. Relations are neutral arrows with the relation name as the pill.
//
// The two builders below, entityType() and relation(), take no running-example data, so the knowledge-graph case
// studies (semiconductor, healthcare) can reuse them for their own ontologies; the lead may move them into
// presets/rag.ts. Layout: three type boxes 180 wide at x 40 | 340 | 640 (120 apart, room for a pill) on row y 30;
// the chunk at x 190 and the source at x 560 on row y 200.

/** An entity type: a pastel box with the type name and its key properties as the sub line. */
function entityType(
  id: string,
  x: number,
  y: number,
  name: string,
  props: string,
  opts: { tone?: LayoutTone; w?: number; h?: number; highlight?: boolean; step?: number } = {}
): LayoutShape {
  return {
    id,
    type: "box",
    x,
    y,
    w: opts.w ?? 180,
    h: opts.h ?? 56,
    label: name,
    sub: props,
    tone: opts.tone ?? RAG_TONE.store,
    fill: "pastel",
    highlight: opts.highlight,
    step: opts.step,
  };
}

/** A typed relation: a neutral arrow from one entity type to another with the relation name as its pill. */
function relation(
  from: string,
  to: string,
  name: string,
  opts: { via?: [number, number][]; step?: number } = {}
): LayoutShape {
  return {
    id: `${from}-${name.toLowerCase()}-${to}`,
    type: "arrow",
    x: 0,
    y: 0,
    from,
    to,
    label: name,
    ...opts,
  };
}

const ROW = { types: 30, text: 200 } as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A minimal ontology: entity types, typed relations and provenance",
  width: 860,
  height: 286,
  shapes: [
    entityType("incident", 40, ROW.types, "Incident", "id, date, severity"),
    entityType("service", 340, ROW.types, "Service", "name, tier"),
    entityType("team", 640, ROW.types, "Team", "name, on-call"),
    entityType("chunk", 190, ROW.text, "Document chunk", "text, vector", {
      tone: RAG_TONE.text,
      w: 200,
      highlight: true,
    }),
    entityType("source", 560, ROW.text, "Source", "URL, date, confidence", { tone: RAG_TONE.infra, w: 220 }),
    relation("incident", "service", "AFFECTED"),
    relation("service", "team", "OWNED_BY"),
    relation("incident", "chunk", "MENTIONED_IN"),
    relation("service", "chunk", "MENTIONED_IN"),
    relation("chunk", "source", "FROM_SOURCE"),
  ],
};

export default spec;
