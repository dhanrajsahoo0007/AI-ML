import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Three write policies compared on the same four questions (caching, Core concepts). Cache-aside writes the database
// and deletes the key; write-through writes the cache and the database in one step; write-back writes only the cache
// and flushes to the database later.
//
// Layout: optionColumns (row labels left, three columns of 200). No steps: a comparison, not a story.
// Colours (PATTERN_TONE): every option is the pattern (green), cache-aside highlighted as the default; the only red
// cell is the write-back loss when the cache dies before a flush.
// Fact check: the trade-offs match the AWS Builders' Library article "Caching challenges and strategies" and the
// Memcache paper (delete on write, "deletes are idempotent"), checked 2026-11-16. Timings are not drawn: they depend on
// the store.

const opts = {
  rowLabels: ["On a write", "The write waits for", "Next read", "Cache node dies"],
  colW: 200,
  labelW: 140,
  columns: [
    {
      id: "aside",
      title: "Cache-aside",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "Write DB, delete key", sub: "next read refills it" },
        { label: "The database", sub: "the delete is cheap" },
        { label: "One miss, then fresh", sub: "pays one database read" },
        { label: "Nothing lost", sub: "reads fall back to the DB" },
      ],
    },
    {
      id: "through",
      title: "Write-through",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Write cache and DB", sub: "both, in one step" },
        { label: "Both stores", sub: "slower writes" },
        { label: "A fresh hit", sub: "caches unread data too" },
        { label: "Nothing lost", sub: "the DB has every write" },
      ],
    },
    {
      id: "back",
      title: "Write-back",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Write cache only", sub: "flush to DB later" },
        { label: "The cache", sub: "fastest writes" },
        { label: "A fresh hit", sub: "from the cache" },
        { label: "Unflushed writes lost", sub: "up to one flush interval", tone: PATTERN_TONE.fail },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cache-aside, write-through and write-back",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("wp", PAD, PAD, opts),
};

export default spec;
