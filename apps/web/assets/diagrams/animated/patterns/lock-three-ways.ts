import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Three ways to stop the lost update, one per step (concurrency-and-locking, Core concepts): a row lock, a version
// check and an atomic conditional update, compared on four questions.
// Working (illustrative timings, the flash sale from presets/patterns.ts):
//   Row lock: the lock is held for the whole read-decide-write transaction, about 5 ms, so one row sells at most
//   1,000 ÷ 5 = 200 kettles a second: 10,000 kettles take 50 s, with buyers queued on the lock.
//   Version check: no waiting, but with many buyers reading the same version only one write wins per round; the
//   rest retry.
//   Atomic update: one statement checks and decrements, holding the row lock for well under a millisecond (say 0.5 ms):
//   about 2,000 a second, 10,000 kettles in about 5 s, and every loser gets "0 rows" at once.
// Layout: optionColumns, three columns of 200, one column per step. Colours (PATTERN_TONE): all green (the pattern);
// red marks each option's weak spot under a flash sale.

const opts = {
  rowLabels: ["The statement", "The second buyer", "Lock held for", "At a flash sale"],
  colW: 200,
  labelW: 130,
  columns: [
    {
      id: "lock",
      title: "Row lock",
      tone: PATTERN_TONE.pattern,
      step: 1,
      rows: [
        { label: "SELECT … FOR UPDATE" },
        { label: "Waits for the lock" },
        { label: "The whole transaction", sub: "about 5 ms" },
        { label: "Queue on one row", sub: "about 200 sales/s", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "version",
      title: "Version check",
      tone: PATTERN_TONE.pattern,
      step: 2,
      rows: [
        { label: "… WHERE version = 7" },
        { label: "0 rows: re-read, retry" },
        { label: "One statement" },
        { label: "Most attempts conflict", sub: "retries pile up", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "atomic",
      title: "Atomic update",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      step: 3,
      rows: [
        { label: "… WHERE stock > 0" },
        { label: "0 rows: sold out" },
        { label: "One statement", sub: "under a millisecond" },
        { label: "About 2,000 sales/s", sub: "losers fail fast" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Row lock, version check and atomic update",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("l3", PAD, PAD, opts),
  steps: [{ title: "A row lock" }, { title: "A version check" }, { title: "An atomic conditional update" }],
};

export default spec;
