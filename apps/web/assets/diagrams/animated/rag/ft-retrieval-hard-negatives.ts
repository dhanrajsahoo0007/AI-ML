import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE, RESULTS, rankList, rankListWidth } from "@/components/diagrams/presets/rag";

// Hard-negative mining for one training question (fine-tuning-embeddings-and-rerankers). The current embedding model
// retrieves the top 8 chunks for the main question (RESULTS, ranks 1-8). The labelled answers (ranks 2, 4, 7) are the
// positives and are dropped from the candidates; the highest-scoring wrong chunks (ranks 1, 3, 5, 6) are the hard
// negatives. Step 4 is the denoising check RocketQA describes: a cross-encoder scores each candidate negative and only
// confident negatives (score below 0.1, the paper's cut-off) are kept. "Locked out after failed sign-ins" scores
// 0.62: it may well answer the question, so training on it as a negative would teach the model the wrong thing.
//
// Cross-encoder scores are illustrative (no source; the page labels them). The 0.1 cut-off is from RocketQA
// (Qu et al., 2021): "we select the top retrieved passages with scores less than 0.1 as negatives".
//
// Layout: the question across the top; the ranked list from rankList (x 20, rows 34 apart from y 96); then a role
// column (x 370..510), a cross-encoder column (x 525..615) and a verdict column (x 630..850), each filled in by its
// step. Tones (four): the question orange, the chunks and the positives blue, the hard negatives lime (ranking), the
// false negative red. Similarity scores in the list are neutral so the figure stays at four tones.

const TOP = 8;
const CUTOFF = 0.1;
const ITEMS = RESULTS.slice(0, TOP);
const CE: Record<number, number> = { 1: 0.04, 3: 0.06, 5: 0.09, 6: 0.62 };
const HARD = Object.keys(CE).map(Number);

const LIST = { x: 20, y: 96, w: 240, rowH: 30, gap: 4 } as const;
const rowY = (rank: number) => LIST.y + (rank - 1) * (LIST.rowH + LIST.gap);
const COL = { role: { x: 370, w: 140 }, ce: { x: 525, w: 90 }, verdict: { x: 630, w: 220 } } as const;

const cell = (
  id: string,
  col: { x: number; w: number },
  rank: number,
  label: string,
  tone: LayoutTone,
  step: number,
  fill: "soft" | "pastel" = "pastel"
): LayoutShape => ({ id, type: "cell", x: col.x, y: rowY(rank), w: col.w, h: LIST.rowH, label, tone, fill, step });

const header = (id: string, x: number, w: number, label: string, step?: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 66,
  w,
  h: 20,
  label,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Mining hard negatives with the current model, then removing the likely false negative",
  width: 860,
  height: 410,
  steps: [
    { title: "Retrieve with the current model" },
    { title: "The labelled answers are the positives" },
    { title: "The highest-scoring wrong chunks are hard negatives" },
    { title: "A cross-encoder removes a likely false negative" },
  ],
  shapes: [
    {
      id: "question",
      type: "box",
      x: 20,
      y: 10,
      w: 830,
      h: 36,
      label: `Training question: ${QUESTIONS.main}`,
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    header("h-list", LIST.x, rankListWidth({ w: LIST.w }), `Current model's top ${TOP}`),
    header("h-role", COL.role.x, COL.role.w, "Role", 2),
    header("h-ce", COL.ce.x, COL.ce.w, "Cross-encoder", 4),
    header("h-verdict", COL.verdict.x, COL.verdict.w, `Keep if below ${CUTOFF}`, 4),
    ...rankList("list", LIST.x, LIST.y, ITEMS, {
      w: LIST.w,
      rowH: LIST.rowH,
      gap: LIST.gap,
      scoreTone: RAG_TONE.infra,
    }),
    ...ITEMS.flatMap((r, i): LayoutShape[] => {
      const rank = i + 1;
      if (r.relevant) return [cell(`role-${rank}`, COL.role, rank, "positive", RAG_TONE.text, 2)];
      if (!HARD.includes(rank)) return [];
      const ce = CE[rank];
      const keep = ce < CUTOFF;
      return [
        cell(`role-${rank}`, COL.role, rank, "hard negative", RAG_TONE.rank, 3),
        cell(`ce-${rank}`, COL.ce, rank, ce.toFixed(2), keep ? RAG_TONE.infra : RAG_TONE.failure, 4, "soft"),
        cell(
          `verdict-${rank}`,
          COL.verdict,
          rank,
          keep ? "keep as negative" : "drop: may answer it",
          keep ? RAG_TONE.rank : RAG_TONE.failure,
          4,
          keep ? "soft" : "pastel"
        ),
      ];
    }),
    {
      id: "summary",
      type: "text",
      x: 20,
      y: rowY(TOP) + 48,
      w: 830,
      h: 20,
      label: "One training example: the question, positives at ranks 2, 4 and 7, hard negatives at ranks 1, 3 and 5",
      step: 4,
    },
  ],
};

export default spec;
