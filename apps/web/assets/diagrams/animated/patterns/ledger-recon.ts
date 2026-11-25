import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Daily reconciliation of Brightpost's ledger against the card provider's settlement file (ledgers-and-reconciliation,
// the Architecture figure).
// Four steps: 1 two records of one day's payments, ours and the provider's (the "before": nobody compares them) ·
// 2 a matcher joins them by payment id and amount · 3 the matched pairs are closed · 4 two kinds of mismatch go to a
// review queue: in the provider's file but not our ledger, and in our ledger but not the file.
// Working (illustrative rates): 200,000 payments a day; 0.05 % unmatched = 100 items; split 60 only in the provider's
// file and 40 only in our ledger; matched = 200,000 − 100 = 199,900.
// Layout (860 × 460): the two sources at x 110; matcher (accent) at x 400; outcomes in a column at x 690; the review
// queue under the matcher.
// Colours (PATTERN_TONE): ledger and file violet (stores), matcher green (the pattern), matched lime (a check passed),
// mismatches red, the review queue neutral.

const total = SHOP.ordersPerDay;
const unmatched = Math.round(total * 0.0005); // 100
const onlyTheirs = 60;
const onlyOurs = unmatched - onlyTheirs; // 40
const matched = total - unmatched; // 199,900

const spec: DiagramSpec = {
  title: "Daily reconciliation against the provider's file",
  width: 860,
  height: 460,
  steps: [
    { title: "Two records of the same day" },
    { title: "Match by payment id and amount" },
    { title: "Close the matched pairs" },
    { title: "Send both kinds of mismatch for review" },
  ],
  zones: [],
  nodes: [
    {
      id: "ledger",
      label: "Our ledger",
      sub: `${n(total)} payments`,
      icon: "ledger",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 115,
      y: 120,
      w: 180,
    },
    {
      id: "file",
      label: "Provider file",
      sub: "daily settlement",
      icon: "file",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 115,
      y: 330,
      w: 180,
    },

    {
      id: "match",
      label: "Matcher",
      sub: "by id and amount",
      icon: "search",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 400,
      y: 225,
      w: 180,
    },

    {
      id: "ok",
      label: "Matched",
      sub: n(matched),
      icon: "shield",
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step: 3,
      x: 695,
      y: 90,
      w: 190,
    },

    {
      id: "theirs",
      label: "Only in their file",
      sub: `${onlyTheirs}: a lost event?`,
      icon: "file",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step: 4,
      x: 695,
      y: 225,
      w: 190,
    },
    {
      id: "ours",
      label: "Only in our ledger",
      sub: `${onlyOurs}: settles tomorrow?`,
      icon: "ledger",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step: 4,
      x: 695,
      y: 360,
      w: 190,
    },
    {
      id: "review",
      label: "Review queue",
      sub: `${unmatched} items a day`,
      icon: "users",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 4,
      x: 400,
      y: 400,
      w: 180,
    },
  ],
  edges: [
    { from: "ledger", to: "match", packet: true, step: 2 },
    { from: "file", to: "match", label: "join", packet: true, delay: 0.3, step: 2 },

    { from: "match", to: "ok", packet: true, delay: 0.8, step: 3 },

    { from: "match", to: "theirs", packet: true, delay: 1, step: 4 },
    { from: "match", to: "ours", packet: true, delay: 1.2, step: 4 },
    { from: "theirs", to: "review", dashed: true, step: 4, via: [[560, 300]] },
    { from: "ours", to: "review", dashed: true, step: 4 },
  ],
};

export default spec;
