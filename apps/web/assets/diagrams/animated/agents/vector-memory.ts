import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { MEMORY_VISIT } from "@/components/diagrams/presets/agents-memory";
import {
  CUSTOMER_MEMORIES,
  MEMORY_DIMS,
  OTHER_CUSTOMER_MEMORY,
  RECALL_K,
  RECALLED,
  WRITTEN,
} from "@/components/diagrams/presets/agents-vector-memory";
import { scatter, type ScatterPoint } from "@/components/diagrams/presets/rag";

// Long-term vector memory, Architecture (the hero): one memory written, then recalled a week later. On 12 Nov the
// fact "4471: £42 refund approved" is embedded and stored as a vector with customer_id 1847. On 19 Nov the customer's new message
// is embedded with the same model, the search is filtered to customer 1847, and the 3 nearest memories come back with
// their cosine similarity. Customer 2210's memory sits nearer than any of 1847's and is skipped by the filter.
//
// Five steps: 1 write: the fact becomes a vector with metadata · 2 the store holds every customer's memories ·
// 3 read: today's message is embedded with the same model · 4 the filter limits the search to customer 1847 ·
// 5 the 3 nearest come back with their scores.
//
// Layout: left column x 20–260 (fact y 38, embedding model y 168, today's message y 300, its title under it); the store group x 286–596
// with the stored record (y 56) above the 2-D scatter (RAG `scatter` builder, plot x 300–580, y 130–400); the right
// column x 616–860 holds the filter (step 4) and the ranked memories (step 5). Points are placed by hand so that
// nearer means more similar (a 2-D sketch of 1,536 dimensions): 2210 at 22 px from the message, refund 42, cracked
// 70, email 100, gift wrap 159; the dashed ring (r 108) holds 2210 and the top 3.
//
// Colour (agents legend, four tones plus neutral): embeddings and vectors pink (the only page that uses pink), the
// message and the ring orange, memories and the store violet, scores lime; other customers' memories and the filter
// neutral.

const PLOT = { x: 300, y: 130, w: 280, h: 270 } as const;
const RIGHT = { x: 616, w: 244 } as const;

/** Hand-placed points, 0..1 inside the plot (see the header for the distances). */
const AT: Record<string, [number, number]> = {
  other: [0.539, 0.57],
  refund: [0.45, 0.356],
  cracked: [0.257, 0.567],
  email: [0.271, 0.215],
  giftwrap: [0.893, 0.926],
};

/** Other customers' memories: far from today's message, unlabelled. */
const OTHERS: [number, number][] = [
  [0.071, 0.074],
  [0.929, 0.111],
  [0.964, 0.444],
  [0.107, 0.926],
  [0.464, 0.963],
  [0.786, 0.037],
  [0.046, 0.63],
];

const recalledIds = new Set(RECALLED.map((m) => m.id));

const points: ScatterPoint[] = [
  ...CUSTOMER_MEMORIES.map((m): ScatterPoint => ({
    id: m.id,
    x: AT[m.id][0],
    y: AT[m.id][1],
    label: m.short,
    kind: recalledIds.has(m.id) ? "relevant" : "chunk",
    step: m.id === WRITTEN.id ? 1 : 2,
  })),
  {
    id: OTHER_CUSTOMER_MEMORY.id,
    x: AT.other[0],
    y: AT.other[1],
    label: OTHER_CUSTOMER_MEMORY.short,
    kind: "other",
    step: 2,
  },
  ...OTHERS.map(([x, y], i): ScatterPoint => ({ id: `o${i}`, x, y, kind: "other", step: 2 })),
  { id: "q", x: 0.5, y: 0.5, kind: "query", label: "message", step: 3 },
];

const ROW_Y = (i: number) => 196 + i * 44;

const results: LayoutShape[] = RECALLED.flatMap((m, i): LayoutShape[] => [
  {
    id: `row-${m.id}`,
    type: "box",
    x: RIGHT.x,
    y: ROW_Y(i),
    w: 180,
    h: 38,
    label: m.text,
    tone: AGENT_TONE.memory,
    fill: "pastel",
    highlight: i === 0 ? true : undefined,
    quiet: i > 0 ? true : undefined,
    step: 5,
  },
  {
    id: `score-${m.id}`,
    type: "cell",
    x: RIGHT.x + 184,
    y: ROW_Y(i),
    w: 60,
    h: 38,
    label: m.cosine.toFixed(2),
    tone: AGENT_TONE.check,
    quiet: true,
    step: 5,
  },
]);

const left = CUSTOMER_MEMORIES.filter((m) => !recalledIds.has(m.id));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Vector memory: write a fact as a vector, recall the nearest for one customer",
  width: 880,
  height: 440,
  steps: [
    { title: `Write: “${WRITTEN.text}” becomes a vector with customer_id ${BRIGHTPOST.customerId}` },
    { title: "The store holds every customer's memories" },
    { title: "Read: today's message is embedded with the same model" },
    { title: `The filter limits the search to customer ${BRIGHTPOST.customerId}` },
    { title: `The ${RECALL_K} nearest memories come back with their scores` },
  ],
  groups: [
    {
      id: "store",
      title: "Memory store: every customer's vectors",
      tone: AGENT_TONE.memory,
      x: 286,
      y: 28,
      w: 310,
      h: 400,
    },
  ],
  shapes: [
    {
      id: "write-title",
      type: "text",
      x: 20,
      y: 12,
      w: 240,
      h: 20,
      label: `Write · ${WRITTEN.date}`,
      tone: AGENT_TONE.infra,
      quiet: true,
    },
    {
      id: "fact",
      type: "box",
      x: 20,
      y: 38,
      w: 240,
      h: 50,
      label: `“${WRITTEN.text}”`,
      sub: `customer ${BRIGHTPOST.customerId} · from the chat`,
      tone: AGENT_TONE.memory,
      fill: "pastel",
    },
    {
      id: "embed",
      type: "box",
      x: 20,
      y: 168,
      w: 240,
      h: 50,
      label: "Embedding model",
      sub: "the same model writes and reads",
      tone: AGENT_TONE.embedding,
      fill: "pastel",
    },
    { id: "fact-embed", type: "arrow", x: 0, y: 0, from: "fact", to: "embed" },
    {
      id: "record",
      type: "cell",
      x: 300,
      y: 56,
      w: 280,
      h: 44,
      label: WRITTEN.vector,
      sub: `${MEMORY_DIMS.toLocaleString("en-GB")} numbers · customer_id ${BRIGHTPOST.customerId}`,
      tone: AGENT_TONE.embedding,
    },
    { id: "embed-record", type: "arrow", x: 0, y: 0, from: "embed", to: "record" },
    ...scatter("sp", PLOT.x, PLOT.y, PLOT.w, PLOT.h, points, {
      dot: 14,
      labelLeft: ["giftwrap"],
      ring: { around: "q", r: 108, step: 5 },
    }),
    { id: "record-point", type: "arrow", x: 0, y: 0, from: "record", to: `sp-${WRITTEN.id}`, dashed: true },
    {
      id: "sketch",
      type: "text",
      x: 300,
      y: 404,
      w: 280,
      h: 20,
      label: "2-D sketch: nearer means more similar",
      tone: AGENT_TONE.infra,
      step: 2,
    },
    {
      id: "read-title",
      type: "text",
      x: 20,
      y: 366,
      w: 240,
      h: 20,
      label: `Read · ${MEMORY_VISIT.today}`,
      tone: AGENT_TONE.infra,
      step: 3,
      quiet: true,
    },
    {
      id: "message",
      type: "box",
      x: 20,
      y: 300,
      w: 240,
      h: 60,
      label: "Today's message",
      sub: "“Has my kettle refund gone through?”",
      tone: AGENT_TONE.task,
      fill: "pastel",
      step: 3,
    },
    { id: "message-embed", type: "arrow", x: 0, y: 0, from: "message", to: "embed", step: 3 },
    { id: "embed-query", type: "arrow", x: 0, y: 0, from: "embed", to: "sp-q", step: 3 },
    {
      id: "filter",
      type: "cell",
      x: RIGHT.x,
      y: 56,
      w: RIGHT.w,
      h: 44,
      label: `filter: customer_id = ${BRIGHTPOST.customerId}`,
      sub: "applied inside the search",
      tone: AGENT_TONE.infra,
      step: 4,
    },
    {
      id: "skipped",
      type: "text",
      x: RIGHT.x,
      y: 108,
      w: RIGHT.w,
      h: 40,
      label: `${OTHER_CUSTOMER_MEMORY.customerId} is nearer, but another\ncustomer's memory: skipped`,
      tone: AGENT_TONE.infra,
      step: 4,
    },
    {
      id: "list-title",
      type: "text",
      x: RIGHT.x,
      y: 168,
      w: RIGHT.w,
      h: 20,
      label: `Top ${RECALL_K} for customer ${BRIGHTPOST.customerId} · cosine`,
      tone: AGENT_TONE.infra,
      step: 5,
    },
    ...results,
    {
      id: "left-out",
      type: "text",
      x: RIGHT.x,
      y: ROW_Y(RECALL_K) + 4,
      w: RIGHT.w,
      h: 20,
      label: left.map((m) => `${m.short} ${m.cosine.toFixed(2)}: not in the top ${RECALL_K}`).join("\n"),
      tone: AGENT_TONE.infra,
      step: 5,
      quiet: true,
    },
  ],
};

export default spec;
