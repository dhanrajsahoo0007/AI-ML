import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Three ways to keep a view fresh, compared on four questions (materialized-views, Technical mechanics): update it in
// the same transaction as the write, update it from a change stream, or recompute it on a timer.
// Working (illustrative): stream lag about 1 s; a 5-minute timer leaves data up to 300 s old, 150 s on average.
// Layout: optionColumns, three columns of 210. Colours (PATTERN_TONE): all green (the pattern), the change stream
// highlighted as the usual choice; red marks where each one hurts.
// Fact check (2026-11-16): PostgreSQL's REFRESH MATERIALIZED VIEW CONCURRENTLY keeps the view readable during a refresh
// but needs a unique index, and a plain refresh is usually faster when many rows change.

const opts = {
  rowLabels: ["Updated when", "Worst staleness", "Cost on the write path", "Rebuilding it"],
  colW: 210,
  labelW: 150,
  columns: [
    {
      id: "write",
      title: "On write",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "In the same transaction" },
        { label: "None" },
        { label: "Every write does more", sub: "and must reach the view", tone: PATTERN_TONE.fail },
        { label: "A one-off backfill" },
      ],
    },
    {
      id: "stream",
      title: "Change stream",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "A projector applies changes" },
        { label: "About 1 s", sub: "illustrative" },
        { label: "None" },
        { label: "Replay the stream" },
      ],
    },
    {
      id: "timer",
      title: "Timer",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Recompute every 5 min" },
        { label: "Up to 5 minutes", sub: "150 s on average", tone: PATTERN_TONE.fail },
        { label: "None" },
        { label: "Every refresh is one" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Keeping a view fresh: on write, by stream, by timer",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("mvs", PAD, PAD, opts),
};

export default spec;
