import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Moving orders to a new store under live traffic (online-migrations, the Architecture figure): the four phases of
// Stripe's online migrations, with a way back at every step.
// Six steps: 1 only the old store (the "before") · 2 dual write: new writes also go to the new store · 3 a backfill
// copies history · 4 reads are compared between the stores · 5 reads move to the new store · 6 writes move to the new
// store only; the old store is kept for rollback. Nodes never move; replaced edges use `until`; the dual-write edge is
// routed below so it never sits on the read edge.
// Layout (860 × 470): order service at x 110 with the read comparer below it; old store top and new store bottom at
// x 440; the backfill job at x 740.
// Colours (PATTERN_TONE): order service teal (compute), both stores violet (stores), backfill green (the pattern),
// the comparer lime (a check).
// Fact check (2026-11-16): Stripe, "Online migrations at scale": dual writing, changing reads (after GitHub Scientist
// showed the paths agreed), changing writes, removing old data; the backfill ran offline from database snapshots.

const spec: DiagramSpec = {
  title: "An online migration in four phases",
  width: 860,
  height: 470,
  steps: [
    { title: "Only the old store" },
    { title: "Dual write: new writes go to both" },
    { title: "Backfill the history" },
    { title: "Compare reads from both stores" },
    { title: "Read from the new store" },
    { title: "Write to the new store only" },
  ],
  zones: [],
  nodes: [
    {
      id: "app",
      label: "Order service",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 115,
      y: 230,
      w: 170,
    },
    {
      id: "old",
      label: "Old store",
      sub: "one database",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 445,
      y: 100,
      w: 170,
    },
    {
      id: "new",
      label: "New store",
      sub: "8 shards",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 445,
      y: 360,
      w: 170,
    },

    {
      id: "fill",
      label: "Backfill job",
      sub: "resumable, throttled",
      icon: "pipeline",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: 745,
      y: 230,
      w: 180,
    },

    {
      id: "cmp",
      label: "Compare reads",
      sub: "log mismatches",
      icon: "chart",
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step: 4,
      x: 115,
      y: 400,
      w: 170,
    },
  ],
  edges: [
    { from: "app", to: "old", label: "reads + writes", packet: true, until: 4 },

    {
      from: "app",
      to: "new",
      label: "dual write",
      dashed: true,
      step: 2,
      until: 5,
      via: [
        [115, 300],
        [300, 440],
        [445, 440],
      ],
    },

    { from: "old", to: "fill", label: "scan by id", packet: true, step: 3 },
    { from: "fill", to: "new", label: "upsert if newer", packet: true, delay: 0.5, step: 3 },

    { from: "app", to: "cmp", label: "both answers", step: 4 },

    { from: "app", to: "old", label: "writes", packet: true, step: 5, until: 5 },
    { from: "app", to: "new", label: "reads", packet: true, step: 5, until: 5 },

    { from: "app", to: "new", label: "reads + writes", packet: true, step: 6 },
    { from: "new", to: "old", label: "kept for rollback", dashed: true, step: 6 },
  ],
};

export default spec;
