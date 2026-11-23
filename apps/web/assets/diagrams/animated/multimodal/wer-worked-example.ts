import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { WER, WER_ALIGN, WER_REF, bx, txt } from "@/components/diagrams/presets/production-speech";

// "Word error rate, computed" on the Speech: ASR & TTS page. One Brightpost sentence: the caller says "i want a refund
// for order four four seven one" (N = 10 words) and the recogniser writes "i want refund for order for four seven one
// please". Aligned word by word (preset WER_ALIGN, checked against a minimum edit distance in the preset):
//   deletion D = 1 ("a"), substitution S = 1 ("four" -> "for"), insertion I = 1 ("please").
//   WER = (S + D + I) / N = (1 + 1 + 1) / 10 = 0.30 = 30 %.
// The order number lost a digit (four seven one is 471, not 4471): one substitution, and the error that matters.
//
// Steps: 1 what was said and what was written · 2 line the words up · 3 count the three kinds of error · 4 the formula.
// Grid: columns 66 px apart from x 120 (cells 60 x 34); rows: said y 56, written y 104, verdict y 152; counts y 214;
// formula y 292.
// Colours: words orange (text), a match lime (check), an error red (it breaks); counters red; one accent.

const X = (c: number) => 120 + c * 66;
const ROW = { said: 56, heard: 104, verdict: 152 } as const;
const cell = (
  id: string,
  c: number,
  y: number,
  label: string,
  tone: LayoutTone,
  step: number,
  fill: "pastel" | "soft" = "pastel"
): LayoutShape => ({ id, type: "cell", x: X(c), y, w: 60, h: 34, label, tone, fill, step, quiet: true });

const shapes: LayoutShape[] = [
  txt("h-said", 6, ROW.said + 8, 108, "Caller said", 1),
  txt("h-heard", 6, ROW.heard + 8, 108, "Recogniser wrote", 1),
  txt("h-verdict", 6, ROW.verdict + 8, 108, "Verdict", 2),
];

WER_ALIGN.forEach(([ref, hyp, op], c) => {
  const bad = op !== "ok";
  shapes.push(
    cell(
      `ref-${c}`,
      c,
      ROW.said,
      ref || "—",
      bad && op !== "I" ? PROD_TONE.failure : MODALITY_TONE.text,
      1,
      ref ? "pastel" : "soft"
    ),
    cell(
      `hyp-${c}`,
      c,
      ROW.heard,
      hyp || "—",
      bad && op !== "D" ? PROD_TONE.failure : MODALITY_TONE.text,
      1,
      hyp ? "pastel" : "soft"
    ),
    cell(`op-${c}`, c, ROW.verdict, op === "ok" ? "ok" : op, bad ? PROD_TONE.failure : PROD_TONE.check, 2)
  );
});

const counts: [string, string, number][] = [
  ["S", `Substitutions S = ${WER.S}`, 0],
  ["D", `Deletions D = ${WER.D}`, 1],
  ["I", `Insertions I = ${WER.I}`, 2],
];
counts.forEach(([k, label, i]) => {
  shapes.push(
    bx(`cnt-${k}`, 120 + i * 240, 214, 220, 46, PROD_TONE.failure, label, {
      sub: k === "S" ? "four → for" : k === "D" ? "“a” was missed" : "“please” was invented",
      step: 3,
    })
  );
});
shapes.push(
  txt("t-n", 120, 268, 330, `N = ${WER_REF.length} words in what the caller said`, 3),
  txt(
    "f1",
    120,
    298,
    520,
    `WER = (S + D + I) ÷ N = (${WER.S} + ${WER.D} + ${WER.I}) ÷ ${WER.N} = ${WER.percent} %`,
    4,
    PROD_TONE.check
  ),
  txt(
    "f2",
    120,
    322,
    660,
    "Three small errors, 30 %. But the one that matters is the order number: “four seven one” is 471, not 4471.",
    4,
    PROD_TONE.failure
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Word error rate, computed on one Brightpost sentence",
  width: 860,
  height: 352,
  steps: [
    { title: "What the caller said and what was written" },
    { title: "Line the words up, one column each" },
    { title: "Count substitutions, deletions and insertions" },
    { title: "Divide the errors by the words said" },
  ],
  shapes,
};

export default spec;
