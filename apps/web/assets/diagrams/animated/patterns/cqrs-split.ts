import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// CQRS, one part at a time (cqrs-event-sourcing, the Architecture figure). Brightpost's order service starts with one
// model for writes and reads, then splits: commands write, events flow, a projector builds a view that queries read.
// Four steps: 1 one model serves "place order" and "list my orders" from the same tables (the "before") · 2 every
// committed write publishes an order event · 3 a projector builds a "my orders" view shaped for the page · 4 queries
// read the view through their own API; the read path no longer touches the write tables.
// Layout (880 × 420): a U: writes along the top (app, order service, orders DB, event stream), reads along the bottom
// (projector, view, query API) back to the app. The step-1 read edge is replaced (`until`).
// Colours (PATTERN_TONE): app orange (traffic), services teal (compute), orders DB and view violet (stores), the
// projector green (the pattern's own part), the event stream neutral (infra).
// Fact check (2026-11-16): Fowler's CQRS note warns that for most systems it "adds risky complexity"; Azure's pattern
// pages pair it with materialized views built from events, eventually consistent with the write side.

const spec: DiagramSpec = {
  title: "Splitting writes from reads",
  width: 880,
  height: 420,
  steps: [
    { title: "One model serves writes and reads" },
    { title: "Every write publishes an event" },
    { title: "A projector builds a read model" },
    { title: "Queries read the view" },
  ],
  zones: [],
  nodes: [
    { id: "app", label: "Shop app", icon: "phone", tone: PATTERN_TONE.traffic, fill: "pastel", x: 85, y: 210, w: 130 },
    {
      id: "svc",
      label: "Order service",
      sub: "commands",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 300,
      y: 90,
      w: 170,
    },
    {
      id: "db",
      label: "Orders DB",
      sub: "normalised tables",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 540,
      y: 90,
      w: 170,
    },

    {
      id: "stream",
      label: "Order events",
      sub: "topic",
      icon: "topic",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 2,
      x: 775,
      y: 90,
      w: 160,
    },

    {
      id: "proj",
      label: "Projector",
      sub: "events to rows",
      icon: "pipeline",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: 775,
      y: 320,
      w: 160,
    },
    {
      id: "view",
      label: "My orders view",
      sub: "one row per order",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 540,
      y: 320,
      w: 180,
    },

    {
      id: "query",
      label: "Query API",
      sub: "reads only",
      icon: "api",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 4,
      x: 300,
      y: 320,
      w: 170,
    },
  ],
  edges: [
    { from: "app", to: "svc", label: "place order", packet: true },
    { from: "svc", to: "db", label: "writes and reads", bidirectional: true, until: 3 },

    { from: "db", to: "stream", label: "committed", packet: true, delay: 0.5, step: 2 },

    { from: "stream", to: "proj", packet: true, delay: 1, step: 3 },
    { from: "proj", to: "view", label: "upsert", packet: true, delay: 1.3, step: 3 },

    { from: "svc", to: "db", label: "writes", packet: true, delay: 0.3, step: 4 },
    { from: "query", to: "view", label: "SELECT", bidirectional: true, step: 4 },
    { from: "app", to: "query", label: "list my orders", packet: true, step: 4 },
  ],
};

export default spec;
