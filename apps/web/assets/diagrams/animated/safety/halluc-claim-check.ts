import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { CLAIMS, CLAIM_STATS, arr, blk, note } from "@/components/diagrams/presets/production-safety";

// A claim check (hallucination-safety-detection, Architecture): one Brightpost answer is split into five claims, each
// claim is checked against the retrieved passages, and faithfulness is computed. Definition (RAGAS faithfulness):
// supported claims ÷ total claims. Passage texts are ILLUSTRATIVE help-centre sentences.
//   Claims 1 to 3 are supported by passages; claim 4 ("within 2 days") has no passage; claim 5 ("refund £42, no
//   approval") is contradicted by "Refunds over £30 need approval". Supported = 3, total = 5, 3 ÷ 5 = 0.60.
// Steps: 1 the answer split into claims · 2 the retrieved passages · 3 a verdict for each claim · 4 the score.
// Grid (880 wide): claims x 20 (w 330); verdict cells x 380 (w 110); passages x 530 (w 330); rows y 50 + 66 i (h 54).
// Colours (PROD_TONE): claims green (the model), passages blue (data), supported verdicts and the score lime,
// unsupported and contradicted verdicts red (failure).

const ROW = (i: number) => 50 + i * 66;

const shapes: LayoutShape[] = [
  note("h-claims", 20, 16, "Claims in the answer", 1),
  note("h-verdict", 380, 16, "Verdict", 3),
  note("h-passages", 530, 16, "Retrieved passages (illustrative)", 2),
];
CLAIMS.forEach((c, i) => {
  const ok = c.verdict === "supported";
  shapes.push(blk(`claim${i}`, 20, ROW(i), 330, 54, c.text, undefined, PROD_TONE.model, 1));
  shapes.push(
    blk(
      `verdict${i}`,
      380,
      ROW(i),
      110,
      54,
      c.verdict,
      undefined,
      ok ? PROD_TONE.check : PROD_TONE.failure,
      3,
      !ok || undefined
    )
  );
  if (c.passage) {
    shapes.push(blk(`passage${i}`, 530, ROW(i), 330, 54, c.passage, undefined, PROD_TONE.data, 2));
    shapes.push(arr(`link${i}`, `verdict${i}`, `passage${i}`, 3));
  } else {
    shapes.push(note(`none${i}`, 530, ROW(i) + 17, "no passage says so", 3, PROD_TONE.failure, 330));
  }
});
shapes.push(
  blk(
    "score",
    20,
    ROW(5) + 4,
    840,
    56,
    `Faithfulness = supported ÷ total = ${CLAIM_STATS.supported} ÷ ${CLAIM_STATS.total} = ${CLAIM_STATS.score.toFixed(2)}`,
    "Two claims lack support: flag or block this answer",
    PROD_TONE.check,
    4,
    true
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A claim check: each claim against the passages",
  width: 880,
  height: ROW(5) + 4 + 56 + 16,
  steps: [
    { title: "The answer is split into claims" },
    { title: "The retrieved passages" },
    { title: "Each claim gets a verdict" },
    { title: "Faithfulness is supported over total" },
  ],
  shapes,
};

export default spec;
