import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Push, pull and the hybrid, priced for one ordinary seller and one huge account (fan-out, Core concepts).
// Working (illustrative values marked):
//   An ordinary seller has 300 followers (illustrative); the Deals account has 2,000,000 (every daily shopper).
//   A shopper follows 50 sellers (illustrative). The feed cache takes 100,000 appends a second (illustrative).
//   Push: a seller post = 300 appends; a Deals post = 2,000,000 appends, 2,000,000 ÷ 100,000 = 20 s to land, and
//     2,000,000 ids × 8 bytes = 16 MB of feed entries for one post. A feed open = 1 list read.
//   Pull: every post = 1 write; a feed open = 50 author reads, then a merge and sort.
//   Hybrid (push below 10,000 followers, illustrative): seller post = 300 appends; Deals post = 1 write; a feed open
//     = 1 list read + 1 read per large author followed.
// Layout: optionColumns, three columns of 200. Colours (PATTERN_TONE): each option green (the pattern); red marks the
// cost that breaks each option.

const SELLER = 300;
const FOLLOWS = 50;
const APPENDS_PER_S = 100_000;
const deals = SHOP.shoppersPerDay;
const landS = deals / APPENDS_PER_S; // 20
const mb = (deals * 8) / 1_000_000; // 16

const opts = {
  rowLabels: ["Seller post", "Deals post", "Deals post lands", "Feed open"],
  colW: 200,
  labelW: 130,
  columns: [
    {
      id: "push",
      title: "Push (on write)",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: `${SELLER} appends` },
        { label: `${n(deals)} appends`, sub: `${mb} MB of ids`, tone: PATTERN_TONE.fail },
        { label: `after ${landS} s`, sub: `at ${n(APPENDS_PER_S)} appends/s`, tone: PATTERN_TONE.fail },
        { label: "1 list read" },
      ],
    },
    {
      id: "pull",
      title: "Pull (on read)",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "1 write" },
        { label: "1 write" },
        { label: "at once" },
        { label: `${FOLLOWS} reads + merge`, sub: "on every open", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "hybrid",
      title: "Hybrid",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: `${SELLER} appends`, sub: "pushed: under 10,000" },
        { label: "1 write", sub: "pulled: a huge account" },
        { label: "at once" },
        { label: "1 list read + 1", sub: "merge the Deals posts" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Push, pull and hybrid for a seller and a huge account",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("fan", PAD, PAD, opts),
};

export default spec;
