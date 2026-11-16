import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Range, hash and directory sharding compared on the same five questions (sharding, Core concepts).
//
// Layout: optionColumns, three columns of 210. No steps: a comparison, not a story.
// Colours (PATTERN_TONE): every strategy is the pattern (green); the red cells are the two ways a strategy breaks:
// range sharding on a time-ordered key sends every new write to the newest shard, and a directory that is down
// stops every request. Everything else is a cost, drawn neutral.
// Fact check: the trade-offs follow the partitioning chapter of Designing Data-Intensive Applications and Vitess's
// keyspace and vindex model (lookup vindexes are a directory), checked 2026-11-16.

const opts = {
  rowLabels: ["Shard picked by", "A range scan", "Load spread", "Adding a shard", "Extra moving part"],
  colW: 210,
  labelW: 130,
  columns: [
    {
      id: "range",
      title: "Range",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Which range the key is in" },
        { label: "Hits one shard" },
        { label: "Newest range runs hot", sub: "time-ordered keys", tone: PATTERN_TONE.fail },
        { label: "Split one range" },
        { label: "A range map" },
      ],
    },
    {
      id: "hash",
      title: "Hash",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "hash(key)" },
        { label: "Hits every shard", sub: "scatter-gather" },
        { label: "Even" },
        { label: "Ring moves about 1/N" },
        { label: "None" },
      ],
    },
    {
      id: "dir",
      title: "Directory",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "A lookup table" },
        { label: "Depends on placement" },
        { label: "Whatever you choose" },
        { label: "Move any key, update map" },
        { label: "Directory on every call", sub: "down means all down", tone: PATTERN_TONE.fail },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Range, hash and directory sharding",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("sh", PAD, PAD, opts),
};

export default spec;
