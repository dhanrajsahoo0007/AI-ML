import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Four consistency models from strongest to weakest, with what a read sees, what each allows, what each costs and
// where Brightpost uses it (consistency-models, Core concepts).
// Layout: optionColumns, four columns of 165 (the canvas stays under 880). Colours (PATTERN_TONE): every model is the
// pattern (green), read-your-writes highlighted because it is the guarantee users notice first; the red cell is the
// anomaly eventual consistency allows that users report as a bug.
// Fact check (2026-11-16): the ordering follows Jepsen's consistency-model map (linearizable above causal above the
// session guarantees above eventual); MongoDB's causally consistent sessions bundle read-your-writes, monotonic reads,
// monotonic writes and writes-follow-reads.

const opts = {
  rowLabels: ["A read sees", "It allows", "It costs", "Brightpost uses it for"],
  colW: 165,
  labelW: 110,
  columns: [
    {
      id: "lin",
      title: "Linearizable",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "The latest write" },
        { label: "Nothing stale" },
        { label: "Leader or quorum" },
        { label: "Stock at checkout" },
      ],
    },
    {
      id: "causal",
      title: "Causal",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Causes before effects" },
        { label: "Unrelated reorder" },
        { label: "Track dependencies" },
        { label: "Reviews and replies" },
      ],
    },
    {
      id: "ryw",
      title: "Read-your-writes",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "Your own writes" },
        { label: "Others' stale data" },
        { label: "A session token" },
        { label: "My address, my basket" },
      ],
    },
    {
      id: "ev",
      title: "Eventual",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Some past value" },
        { label: "Stale, out of order", tone: PATTERN_TONE.fail },
        { label: "Almost nothing" },
        { label: "View counts" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "From linearizable to eventual",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("cs", PAD, PAD, opts),
};

export default spec;
