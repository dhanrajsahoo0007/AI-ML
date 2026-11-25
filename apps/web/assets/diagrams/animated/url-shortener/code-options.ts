import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Three ways to make a short code, compared on the same five questions (url-shortener, Deep dive 1).
//
// Working (round numbers chosen to size the system):
//   Codes of 7 base62 characters: 62^7 = 3,521,614,606,208 ≈ 3.5 trillion.
//   Links kept: 100 M a month × 12 × 5 years = 6 billion. Fill = 6 × 10^9 ÷ 3.52 × 10^12 = 0.17 %.
//   Hash and retry: a random code collides with probability fill = 0.0017, about 1 insert in 590 retries once.
//   Counter + blocks: 1.2 B ids a year (100 M × 12), so 62^7 lasts 3.52 × 10^12 ÷ 1.2 × 10^9 ≈ 2,900 years;
//   one counter call per block of 1,000 ids.
//   Time-based (Snowflake-style) 64-bit id: 62^10 ≈ 8.4 × 10^17 < 2^63 ≈ 9.2 × 10^18, so up to 11 characters.
// Layout: optionColumns, three columns of 200 and a label column of 130. Colours (PATTERN_TONE): every scheme green
// (the pattern), the chosen counter + blocks highlighted; red marks the cell where each one fails.
// Fact check (2026-11-17): Snowflake README (snowflake-2010 tag): 41-bit millisecond timestamp, 10-bit machine id,
// 12-bit sequence; Flickr ticket servers (2010): one auto-increment row per ticket database.

const opts = {
  rowLabels: ["Code length", "Collisions", "Coordination", "Guessable", "Breaks when"],
  colW: 200,
  labelW: 130,
  columns: [
    {
      id: "hash",
      title: "Hash and retry",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "7 characters", sub: "any length you pick" },
        { label: "1 in 590 at 6 B links", sub: "retry with a new salt" },
        { label: "None", sub: "the store checks each insert" },
        { label: "No", sub: "random-looking codes" },
        { label: "No insert-if-absent", sub: "two links share a code", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "counter",
      title: "Counter + blocks",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "7 characters", sub: "3.5 T codes ≈ 2,900 years" },
        { label: "None", sub: "each id is handed out once" },
        { label: "1 call per 1,000 ids", sub: "to the counter DB" },
        { label: "Yes, unless scrambled", sub: "permute before base 62" },
        { label: "Counter DB rolls back", sub: "ids repeat after a restore", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "time",
      title: "Time-based id",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Up to 11 characters", sub: "a 64-bit id in base 62", tone: PATTERN_TONE.fail },
        { label: "None", sub: "node id + sequence" },
        { label: "Node id at start-up", sub: "from config" },
        { label: "Partly", sub: "time order leaks" },
        { label: "Clock runs back", sub: "ids can repeat", tone: PATTERN_TONE.fail },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways to make a short code",
  width: size.width + 40,
  height: size.height + 30,
  shapes: optionColumns("opt", 20, 15, opts),
};

export default spec;
