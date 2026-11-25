import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Three ways to run two regions (multi-region-and-failover, Core concepts: topologies).
// Columns: active-passive (London takes every write, Frankfurt holds an asynchronous copy) · active-active with home
// regions (each shopper's data has one home region that takes its writes; both regions serve traffic) · active-active
// where any region writes any row (both regions write the same cart; replication resolves the clash, for example by
// last writer wins).
// Rows: who takes writes, the cross-region link, two writes to the same cart, losing a region, the second region's
// work. No arithmetic: the regions are the preset London and Frankfurt.
// Layout: optionColumns, three columns of 220 and a label column of 130 (width 832 + 2 × 20 padding).
// Colours (PATTERN_TONE): every topology is the pattern (green), the home-region column highlighted as the default
// answer; red marks the cell where data is silently lost.
// Fact check (2026-11-16, DynamoDB global tables docs, "How global tables work"): in multi-Region eventual consistency
// mode, simultaneous changes to one item are resolved by "last writer wins" on the latest internal timestamp.

const [home, second] = [SHOP.homeRegion, SHOP.secondRegion];

const opts = {
  rowLabels: ["Takes writes", "Cross-region copy", "Same cart, 2 writes", "Region lost", "Second region"],
  colW: 220,
  labelW: 130,
  columns: [
    {
      id: "ap",
      title: "Active-passive",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: `${home} only` },
        { label: `Async, ${home} to ${second}` },
        { label: "Cannot clash", sub: "one writer for everything" },
        { label: `Promote ${second}`, sub: "lose the writes still in flight" },
        { label: "Idle standby", sub: "reads at most" },
      ],
    },
    {
      id: "home",
      title: "Active-active, home regions",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "Each shopper's home region" },
        { label: "Async, both directions" },
        { label: "Cannot clash", sub: "one home per cart" },
        { label: "Rehome its shoppers", sub: "lose that region's in-flight writes" },
        { label: "Serves its own shoppers" },
      ],
    },
    {
      id: "any",
      title: "Active-active, any region",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Both, for any row" },
        { label: "Async, both directions" },
        { label: "Last writer wins", sub: "one write silently dropped", tone: PATTERN_TONE.fail },
        { label: "Other region carries on", sub: "its unsent writes wait or vanish" },
        { label: "Serves anyone" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Active-passive, home regions and write-anywhere",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("topo", PAD, PAD, opts),
};

export default spec;
