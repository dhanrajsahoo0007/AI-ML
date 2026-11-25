import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Four ways to make ids, compared on the same four questions (unique-id-generation, Core concepts, first figure).
//
// Working:
//   Auto-increment, Snowflake and ranges fit a 64-bit integer (a bigint column); a UUID is 128 bits.
//   UUIDv4 has 122 random bits and no time order; UUIDv7 starts with a 48-bit Unix millisecond timestamp.
//   Snowflake: 41 bits of ms time + 10 bits of node id + 12 bits of sequence (see id-snowflake-bits).
//   Ranges: a server takes a block (1,000 ids here, illustrative) with one call to a counter and hands them out from
//   memory; a restart loses the rest of the block, which leaves a gap.
// Layout: optionColumns, four columns of 160 and a label column of 120. Colours (PATTERN_TONE): every scheme is the
// pattern (green), Snowflake highlighted; red marks what breaks each one.
// Fact check (2026-11-16): RFC 9562 §5.4 (UUIDv4: 122 random bits), §5.7 (UUIDv7: 48-bit unix_ts_ms first), §2.1
// (v4 has "poor database-index locality"); Snowflake README (snowflake-2010 tag): 41 + 10 + 12 bits, "k-sorted";
// Flickr ticket servers (2010): GUIDs "are big, and they index badly in MySQL".

const opts = {
  rowLabels: ["Size", "Time order", "Coordination", "Breaks when"],
  colW: 160,
  labelW: 120,
  columns: [
    {
      id: "auto",
      title: "Auto-increment",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "64 bits" },
        { label: "Yes", sub: "one writer counts" },
        { label: "Every insert", sub: "one database hands out" },
        { label: "One writer is full", sub: "and ids leak volume", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "uuid",
      title: "UUID v4 or v7",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "128 bits" },
        { label: "v4 none, v7 yes", sub: "v7: 48-bit ms prefix" },
        { label: "None" },
        { label: "v4 is a B-tree key", sub: "random page splits", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "snow",
      title: "Snowflake",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "64 bits" },
        { label: "Roughly, by ms", sub: "k-sorted across nodes" },
        { label: "Node id at start", sub: "config or ZooKeeper" },
        { label: "Clock runs back", sub: "or two nodes share an id", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "range",
      title: "Ranges",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "64 bits" },
        { label: "Within a block", sub: "not across servers" },
        { label: "One call per block", sub: "1,000 ids (illustrative)" },
        { label: "A server restarts", sub: "the rest of its block: gap", tone: PATTERN_TONE.fail },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Auto-increment, UUID, Snowflake and ranges",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("opt", PAD, PAD, opts),
};

export default spec;
