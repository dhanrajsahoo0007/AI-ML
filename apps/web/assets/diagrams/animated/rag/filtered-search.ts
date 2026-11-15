import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARTICLES, RAG_TONE, RESULTS, TOP_K, rankList, rankListWidth } from "@/components/diagrams/presets/rag";

// Filtering in vector search, with the access-control case: a customer asks the main question, and the index also
// holds staff-only chunks (the runbook and two staff notes) that sit very close to it. The filter is "visible to
// customers".
//
// Left, filter after search: the index returns its 5 nearest chunks, then the filter drops the 3 staff-only ones, so
// the prompt gets 2 chunks instead of 5. Right, filter during search: the search skips chunks that fail the filter
// while it walks the index and keeps going until it has 5 that pass, which are RESULTS' top 5 (the same 5 the pilot's
// figures use). Scores of the staff chunks (0.83, 0.81, 0.79) are illustrative and placed between RESULTS' scores so
// that 3 of the 5 nearest are staff-only.
//
// Tones (four): chunk titles blue, the filter teal, the question orange, blocked chunks red. Scores neutral.

/** The 5 nearest chunks before any filter: 3 staff-only (illustrative scores) among RESULTS' first two. */
const UNFILTERED: { title: string; score: number; staff: boolean; relevant?: boolean }[] = [
  { title: ARTICLES.runbook, score: 0.83, staff: true },
  { ...RESULTS[0], staff: false },
  { title: "Staff: reset a customer's 2FA", score: 0.81, staff: true },
  { ...RESULTS[1], staff: false },
  { title: "Staff: verify a caller's ID", score: 0.79, staff: true },
];
const kept = UNFILTERED.filter((r) => !r.staff).length; // 2
const dropped = UNFILTERED.length - kept; // 3

const W = 232;
const LIST_W = rankListWidth({ w: W });
const LEFT = 20;
const RIGHT = 470;
const LIST_Y = 150;
const ROW_H = 30;
const GAP = 4;

const left = rankList(
  "after",
  LEFT,
  LIST_Y,
  UNFILTERED.map((r) => ({ title: r.title, score: r.score, relevant: r.relevant })),
  { w: W, rowH: ROW_H, gap: GAP, scoreTone: RAG_TONE.infra, step: 2 }
).map((s): LayoutShape => {
  const rank = Number(/-t(\d+)$/.exec(s.id)?.[1]);
  return rank && UNFILTERED[rank - 1].staff ? { ...s, tone: RAG_TONE.failure, fill: "soft" } : s;
});

const blocked: LayoutShape[] = UNFILTERED.flatMap((r, i) =>
  r.staff
    ? [
        {
          id: `blocked${i + 1}`,
          type: "text" as const,
          x: LEFT + LIST_W + 6,
          y: LIST_Y + i * (ROW_H + GAP) + 6,
          w: 70,
          h: 18,
          label: "dropped",
          tone: RAG_TONE.failure,
          step: 2,
        },
      ]
    : []
);

const right = rankList("during", RIGHT, LIST_Y, RESULTS.slice(0, TOP_K), {
  w: W,
  rowH: ROW_H,
  gap: GAP,
  scoreTone: RAG_TONE.infra,
  step: 3,
});

const listBottom = LIST_Y + TOP_K * (ROW_H + GAP) - GAP;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Filter after search returns too few; filter during search returns k",
  width: 860,
  height: 420,
  steps: [
    { title: "A customer's question, with a filter: visible to customers" },
    { title: `Filter after search: ${dropped} of the ${TOP_K} nearest are dropped` },
    { title: `Filter during search: the walk skips them and returns ${TOP_K}` },
  ],
  groups: [
    {
      id: "g-after",
      title: "Filter after search",
      tone: RAG_TONE.infra,
      x: LEFT - 10,
      y: LIST_Y - 52,
      w: LIST_W + 96,
      h: 308,
    },
    {
      id: "g-during",
      title: "Filter during search",
      tone: RAG_TONE.infra,
      x: RIGHT - 10,
      y: LIST_Y - 52,
      w: LIST_W + 20,
      h: 308,
    },
  ],
  shapes: [
    {
      id: "question",
      type: "box",
      x: 170,
      y: 20,
      w: 260,
      h: 44,
      label: "Customer asks",
      sub: "reset password, lost phone",
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    {
      id: "filter",
      type: "box",
      x: 450,
      y: 20,
      w: 240,
      h: 44,
      label: "Filter",
      sub: "visible to customers",
      tone: RAG_TONE.keyword,
      fill: "pastel",
    },
    {
      id: "plus",
      type: "text",
      x: 430,
      y: 32,
      w: 20,
      h: 20,
      label: "+",
      tone: RAG_TONE.infra,
    },
    {
      id: "t-after",
      type: "text",
      x: LEFT,
      y: LIST_Y - 26,
      w: LIST_W,
      h: 18,
      label: `${TOP_K} nearest, then filter`,
      tone: RAG_TONE.infra,
      step: 2,
    },
    ...left,
    ...blocked,
    {
      id: "after-result",
      type: "box",
      x: LEFT,
      y: listBottom + 24,
      w: LIST_W,
      h: 50,
      label: `${kept} chunks left, not ${TOP_K}\nthe answer misses the backup-code step`,
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 2,
    },
    {
      id: "t-during",
      type: "text",
      x: RIGHT,
      y: LIST_Y - 26,
      w: LIST_W,
      h: 18,
      label: `Skip what fails, stop at ${TOP_K}`,
      tone: RAG_TONE.infra,
      step: 3,
    },
    ...right,
    {
      id: "during-result",
      type: "box",
      x: RIGHT,
      y: listBottom + 24,
      w: LIST_W,
      h: 50,
      label: `${TOP_K} permitted chunks\nboth articles the answer needs`,
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 3,
    },
  ],
};

export default spec;
