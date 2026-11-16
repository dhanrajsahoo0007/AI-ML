import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { MEMORY_VISIT, WRITE_CASES } from "@/components/diagrams/presets/agents-memory";

// Agent memory, Deep dive "The write policy": what the memory writer does after the Brightpost customer's return
// visit. It extracts three candidate facts from today's chat, compares each with the nearest memories already stored,
// and decides: "prefers text" conflicts with "prefers email" → UPDATE (the old one is kept as superseded history);
// "4471: £42 refund approved" is already stored → DROP; "chased refund 4471" is new → ADD. The last column is the
// customer's store after the write.
//
// Four steps: 1 extract three candidates · 2 compare each with the nearest stored memory · 3 decide: update, drop or
// add (UPDATE is the highlight) · 4 the store after the write.
//
// Layout: one row per candidate at y 104 | 176 | 248 (52 tall, 20 apart). Columns: candidate x 20 (w 200) | nearest
// in store x 244 (w 210) | decision x 478 (w 130) | store after x 632 (w 228), inside a group "Memory store, customer
// 1847". Headers at y 58. Arrows run straight across each row; DROP has none into
// the store, because nothing is written.
//
// Colour (agents legend, three tones plus neutral): the chat orange (header strip), memories violet (candidates soft,
// stored memories pastel), decisions lime (a check).

const ROW_Y = [104, 176, 248] as const;
const H = 52;
const COL = {
  cand: { x: 20, w: 200 },
  near: { x: 244, w: 210 },
  verdict: { x: 478, w: 130 },
  after: { x: 632, w: 228 },
} as const;

const header = (id: string, col: keyof typeof COL, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: COL[col].x,
  y: 58,
  w: COL[col].w,
  h: 36,
  label,
  step,
  quiet: true,
});

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const rows: LayoutShape[] = WRITE_CASES.flatMap((c, i): LayoutShape[] => {
  const y = ROW_Y[i];
  const quiet = i > 0 ? true : undefined;
  return [
    {
      id: `cand-${c.id}`,
      type: "box",
      x: COL.cand.x,
      y,
      w: COL.cand.w,
      h: H,
      label: c.candidate,
      sub: c.kind,
      tone: AGENT_TONE.memory,
      fill: "soft",
      step: 1,
      quiet,
    },
    {
      id: `near-${c.id}`,
      type: "box",
      x: COL.near.x,
      y,
      w: COL.near.w,
      h: H,
      label: c.nearest,
      sub: c.relation,
      tone: c.relation === "new" ? AGENT_TONE.infra : AGENT_TONE.memory,
      fill: c.relation === "new" ? "paper" : "pastel",
      step: 2,
      quiet,
    },
    {
      id: `verdict-${c.id}`,
      type: "cell",
      x: COL.verdict.x,
      y,
      w: COL.verdict.w,
      h: H,
      label: c.verdict,
      sub: c.why,
      tone: AGENT_TONE.check,
      fill: "pastel",
      highlight: c.verdict === "UPDATE" ? true : undefined,
      step: 3,
      quiet,
    },
    {
      id: `after-${c.id}`,
      type: "box",
      x: COL.after.x + 10,
      y,
      w: COL.after.w - 20,
      h: H,
      label: c.after,
      sub: c.afterSub,
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 4,
      quiet,
    },
    arrow(`a1-${c.id}`, `cand-${c.id}`, `near-${c.id}`, 2),
    arrow(`a2-${c.id}`, `near-${c.id}`, `verdict-${c.id}`, 3),
    // A dropped fact writes nothing, so DROP has no arrow into the store.
    ...(c.verdict === "DROP" ? [] : [arrow(`a3-${c.id}`, `verdict-${c.id}`, `after-${c.id}`, 4)]),
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The memory write policy: extract, compare, then add, update or drop",
  width: 880,
  height: 320,
  steps: [
    { title: "The writer extracts three candidate facts from today's chat" },
    { title: "Each is compared with the nearest memories already stored" },
    { title: "Decide: update the conflict, drop the duplicate, add the new" },
    { title: "The store after the write" },
  ],
  groups: [
    {
      id: "store",
      title: `Store, customer ${BRIGHTPOST.customerId}`,
      tone: AGENT_TONE.memory,
      x: COL.after.x,
      y: 20,
      w: COL.after.w,
      h: 292,
    },
  ],
  shapes: [
    {
      id: "chat",
      type: "box",
      x: 20,
      y: 16,
      w: 434,
      h: 36,
      label: `Today's chat, ${MEMORY_VISIT.today}`,
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    header("h-cand", "cand", "1. Extract", 1),
    header("h-near", "near", "2. Nearest in store", 2),
    header("h-verdict", "verdict", "3. Decide", 3),
    ...rows,
  ],
};

export default spec;
