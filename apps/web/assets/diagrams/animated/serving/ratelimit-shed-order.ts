import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { SHED } from "@/components/diagrams/presets/production-ratelimit";
import { SUPPORT_TPM } from "@/components/diagrams/presets/production-gateway";

// The order Brightpost sheds load when the model is overloaded: cheapest to the customer first (illustrative policy).
// One rung per step, top to bottom, each with what a customer notices and what it frees.
//   1 Pause batch jobs: nobody waits for them; frees the whole batch share.
//   2 Skip optional retrieval, 5 chunks down to 2: 200 + 2 × 400 + 15 = 1,015 in + 250 out = 1,265 tokens a request,
//     against 2,450: down 48 %.
//   3 Cap answers at 150 tokens: 1,015 + 150 = 1,165 tokens; 100 fewer tokens × 4.4 ms = 440 ms of decode each.
//   4 Refuse free-tier chat with a 429 and retry-after; paid chat keeps running.
//   Footer, step 3: 720 requests a minute × 1,165 = 838,800 tokens a minute, against 1,764,000 before (48 %).
// Grid: header row y 14; rows at y 44 + 88 i, 64 tall; columns: rung x 30 w 270, customer x 350 w 260, frees x 660 w
// 190. Arrows run down the left between rungs. Colours: rungs neutral, what the customer sees orange, red for the rung
// where a user is refused, what is freed blue.

const ROW_Y = (i: number) => 44 + i * 88;
const H = 64;
const rungs = [
  {
    id: "batch",
    label: "1  Pause batch jobs",
    sub: "overnight summaries, re-indexing",
    sees: "Nobody: results arrive later",
    seesSub: "no one is waiting for them",
    frees: "The whole batch share",
    freesSub: "run it again off-peak",
  },
  {
    id: "retrieval",
    label: "2  Skip optional retrieval",
    sub: `${5} chunks down to ${SHED.keptChunks}`,
    sees: "Slightly thinner answers",
    seesSub: "fewer passages to quote",
    frees: `${n(SHED.perRequestAfterRetrieval)} tokens a request`,
    freesSub: `down from ${n(SHED.perRequestBefore)}, 48 % less`,
  },
  {
    id: "output",
    label: "3  Shorten long answers",
    sub: `cap at ${SHED.outputCap} output tokens`,
    sees: "Shorter replies",
    seesSub: "the same help, fewer words",
    frees: `${SHED.decodeMsSavedPerAnswer} ms of decode each`,
    freesSub: `${n(SHED.perRequestAfterCap)} tokens a request`,
  },
  {
    id: "free",
    label: "4  Refuse free-tier chat",
    sub: "429 with retry-after",
    sees: "Free users wait and retry",
    seesSub: "paid customers are served",
    frees: "The free tier's share",
    freesSub: "the last resort",
  },
];

const shapes: LayoutShape[] = [];
const head = (id: string, x: number, w: number, text: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 14,
  w,
  h: 20,
  label: text,
  tone: PROD_TONE.infra,
  quiet: true,
});
shapes.push(
  head("h-drop", 30, 270, "Drop, in this order"),
  head("h-sees", 350, 260, "What a customer sees"),
  head("h-frees", 660, 190, "What it frees")
);

rungs.forEach((r, i) => {
  const step = i + 1;
  const y = ROW_Y(i);
  shapes.push(
    {
      id: `${r.id}-rung`,
      type: "box",
      x: 30,
      y,
      w: 270,
      h: H,
      label: r.label,
      sub: r.sub,
      tone: PROD_TONE.infra,
      fill: "pastel",
      step,
    },
    {
      id: `${r.id}-sees`,
      type: "box",
      x: 350,
      y,
      w: 260,
      h: H,
      label: r.sees,
      sub: r.seesSub,
      tone: i === 3 ? PROD_TONE.failure : PROD_TONE.traffic,
      fill: "pastel",
      step,
    },
    {
      id: `${r.id}-frees`,
      type: "box",
      x: 660,
      y,
      w: 190,
      h: H,
      label: r.frees,
      sub: r.freesSub,
      tone: PROD_TONE.data,
      fill: "pastel",
      step,
    },
    { id: `${r.id}-a1`, type: "arrow", from: `${r.id}-rung`, to: `${r.id}-sees`, x: 0, y: 0, step },
    { id: `${r.id}-a2`, type: "arrow", from: `${r.id}-sees`, to: `${r.id}-frees`, x: 0, y: 0, step }
  );
  if (i > 0) {
    shapes.push({
      id: `${r.id}-down`,
      type: "arrow",
      from: `${rungs[i - 1].id}-rung`,
      to: `${r.id}-rung`,
      x: 0,
      y: 0,
      step,
    });
  }
});

shapes.push({
  id: "footer",
  type: "text",
  x: 130,
  y: ROW_Y(3) + H + 24,
  w: 620,
  h: 20,
  label: `After rungs 2 and 3: ${SUPPORT_TPM.requestsPerMinute} × ${n(SHED.perRequestAfterCap)} = ${n(SUPPORT_TPM.requestsPerMinute * SHED.perRequestAfterCap)} tokens a minute, from ${n(SUPPORT_TPM.tokensPerMinute)}`,
  tone: PROD_TONE.data,
  step: 3,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "What to drop first when the model is overloaded",
  width: 880,
  height: ROW_Y(3) + H + 56,
  steps: [
    { title: "First, work nobody is waiting for" },
    { title: "Then, optional retrieval" },
    { title: "Then, long outputs" },
    { title: "Last, the free tier" },
  ],
  shapes,
};

export default spec;
