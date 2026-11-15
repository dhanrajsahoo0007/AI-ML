import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { SELF_CHECK, blk, note } from "@/components/diagrams/presets/production-safety";

// Three ways to catch a hallucination at run time (hallucination-safety-detection, Core concepts), compared on four rows.
//   Grounding check (NLI): needs retrieved passages; a natural-language-inference model labels each claim entailed,
//     neutral or contradicted; one small-model call per claim.
//   Self-consistency (SelfCheckGPT): needs nothing external, only the ability to sample; the share of extra samples that
//     disagree with a claim is its score. Cost with 4 extra samples (ILLUSTRATIVE): 1 + 4 = 5 answers of 250 tokens =
//     1,250 output tokens, 5 × one answer (SELF_CHECK in presets/production-safety.ts).
//   Token-level uncertainty: needs token probabilities; low-probability tokens mark guesses (a number, a name); almost
//     free, the probabilities come from the same pass.
// Steps: 1 the three methods · 2 what each needs and what it measures · 3 what each costs · 4 what each cannot see.
// Grid (880 wide): row labels x 20 (w 110); columns x 130 | 380 | 630 (w 230); header y 24; rows y 100 | 180 | 260 | 340 (h 64).
// Colours (PROD_TONE): method headers lime (checks), cells neutral, blind spots red (where each breaks).

const COLS = [130, 380, 630] as const;
const ROWS = [100, 180, 260, 340] as const;

const methods = [
  { id: "nli", head: "Grounding check", sub: "an NLI model, per claim" },
  { id: "self", head: "Self-consistency", sub: "sample again, compare" },
  { id: "tok", head: "Token uncertainty", sub: "read the probabilities" },
] as const;
const rows = [
  {
    id: "needs",
    label: "Needs",
    step: 2,
    cells: ["retrieved passages", "nothing but sampling", "token probabilities"],
  },
  {
    id: "signal",
    label: "Signal",
    step: 2,
    cells: ["entailed, neutral or contradicted", "share of samples that disagree", "low-probability numbers, names"],
  },
  {
    id: "cost",
    label: "Cost",
    step: 3,
    cells: [
      "one small call per claim",
      `${SELF_CHECK.extraSamples} extra samples: ${SELF_CHECK.multiple}× the output`,
      "about free, same pass",
    ],
  },
  {
    id: "blind",
    label: "Blind to",
    step: 4,
    cells: ["the wrong passage, retrieved", "the same mistake every time", "a confident wrong answer"],
  },
] as const;

const shapes: LayoutShape[] = [];
methods.forEach((m, c) => shapes.push(blk(`m-${m.id}`, COLS[c], 24, 230, 56, m.head, m.sub, PROD_TONE.check, 1)));
rows.forEach((r, i) => {
  shapes.push(note(`r-${r.id}`, 10, ROWS[i] + 22, r.label, r.step));
  r.cells.forEach((text, c) =>
    shapes.push(
      blk(
        `${r.id}-${c}`,
        COLS[c],
        ROWS[i],
        230,
        64,
        text,
        undefined,
        r.id === "blind" ? PROD_TONE.failure : PROD_TONE.infra,
        r.step
      )
    )
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways to catch a hallucination",
  width: 880,
  height: 424,
  steps: [
    { title: "Three detection methods" },
    { title: "What each needs and measures" },
    { title: "What each costs" },
    { title: "What each cannot see" },
  ],
  shapes,
};

export default spec;
