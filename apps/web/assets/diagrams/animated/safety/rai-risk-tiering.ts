import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { blk, note } from "@/components/diagrams/presets/production-safety";

// Risk tiering (responsible-ai-and-alignment, Architecture): impact if the output is wrong against how easily the
// effect can be undone gives the review a use case needs. This is an internal triage grid, not the EU AI Act's tiers.
//   Step 1 the two axes and the four reviews · 2 four Brightpost use cases placed in the grid.
// Grid (880 wide): row labels x 20 (w 140); columns x 180 | 530 (w 330); rows y 56 | 206; review box h 76, use-case box h 44 under it.
// Colours (PROD_TONE): reviews neutral, lime (a check) and lime with a highlight for the strictest; use cases blue (data).

const COLS = [180, 530] as const;
const ROWS = [56, 206] as const;

const cells = [
  {
    id: "ll",
    c: 0,
    r: 0,
    review: "Automated checks",
    sub: "plus a weekly sample read by a person",
    tone: PROD_TONE.infra,
    use: "Summarise a help article",
  },
  {
    id: "hl",
    c: 1,
    r: 0,
    review: "Person approves before it goes",
    sub: "the model drafts, a person decides",
    tone: PROD_TONE.check,
    use: `Draft a reply about a £${REFUND_CASE.price} refund`,
  },
  {
    id: "lh",
    c: 0,
    r: 1,
    review: "Template and pre-send checks",
    sub: "plus a spot check each week",
    tone: PROD_TONE.check,
    use: "Send an order-status email",
  },
  {
    id: "hh",
    c: 1,
    r: 1,
    review: "Approval, audit log, red team",
    sub: "and sign-off by a named owner",
    tone: PROD_TONE.check,
    use: `Issue a refund over £${REFUND_CASE.approvalLimit}`,
  },
] as const;

const shapes: LayoutShape[] = [
  note("col-low", COLS[0], 22, "Impact if wrong: low", 1),
  note("col-high", COLS[1], 22, "Impact if wrong: high", 1),
  note("row-easy", 20, ROWS[0] + 30, "Easy to undo", 1),
  note("row-hard", 20, ROWS[1] + 30, "Hard to undo", 1),
];
cells.forEach((c) => {
  shapes.push(
    blk(`${c.id}-review`, COLS[c.c], ROWS[c.r], 330, 76, c.review, c.sub, c.tone, 1, c.id === "hh"),
    blk(`${c.id}-use`, COLS[c.c], ROWS[c.r] + 84, 330, 44, c.use, undefined, PROD_TONE.data, 2)
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Risk tiering: impact by reversibility",
  width: 880,
  height: 360,
  steps: [{ title: "Impact and reversibility set the review" }, { title: "Four Brightpost use cases placed" }],
  shapes,
};

export default spec;
