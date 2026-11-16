import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { MEMORY_VISIT } from "@/components/diagrams/presets/agents-memory";

// Agent memory, Deep dive "Memory against RAG": the same store-and-retrieve shape drawn twice, side by side, feeding
// one Brightpost support agent. The read half is identical (search a store, put the hits in the prompt). What differs
// is the write half: on the RAG side staff write help articles and an offline job indexes them, once, for every
// customer; on the memory side the agent's own memory writer reads each finished chat and writes to a store scoped to
// one customer, so the right side is a loop (the reply becomes part of the chat the writer reads).
//
// Three steps: 1 both read the same way · 2 RAG: staff write, an offline job indexes · 3 memory: the agent writes its
// own store after every chat (the writer is the highlight).
//
// Layout: two groups, 400 wide, at x 20 and x 440. Four rows per side at y 60 | 136 | 212 | 288 (44 tall), boxes 280
// wide at x 80 and x 500: source, writer, store, retrieved. One shared model box under both groups (x 300–560,
// y 392). The loop runs from the model's right edge along y 432, up a corridor at x 812 (inside the memory group,
// right of its boxes) and into the chat's right edge.
//
// Colour (agents legend, four tones plus neutral): help articles and retrieved text blue, the chat orange, stores
// violet, the memory writer and the agent green; the indexing job neutral (infrastructure).

const ROW = [60, 136, 212, 288] as const;
const H = 44;
const W = 280;
const LEFT_X = 80;
const RIGHT_X = 500;
const MODEL = { x: 300, y: 392, w: 260, h: 52 };

const box = (
  id: string,
  x: number,
  row: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x,
  y: ROW[row],
  w: W,
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  ...extra,
});

const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...extra,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Memory against RAG: one shape, a different writer",
  width: 860,
  height: 460,
  steps: [
    { title: "Both read the same way: search a store, add the hits to the prompt" },
    { title: "RAG: staff write, an offline job indexes, once for everyone" },
    { title: "Memory: the agent writes its own store after every chat" },
  ],
  groups: [
    { id: "rag", title: "RAG: the help centre", tone: AGENT_TONE.result, x: 20, y: 20, w: 400, h: 340 },
    { id: "mem", title: "Memory: this customer", tone: AGENT_TONE.memory, x: 440, y: 20, w: 400, h: 340 },
  ],
  shapes: [
    // The read half, the same on both sides (step 1).
    box("rag-store", LEFT_X, 2, "Help-centre index", "shared by every customer", AGENT_TONE.memory, 1),
    box("rag-hit", LEFT_X, 3, "Retrieved passage", `“${BRIGHTPOST.helpArticle}”`, AGENT_TONE.result, 1, {
      quiet: true,
    }),
    box("mem-store", RIGHT_X, 2, "Memory store", `only customer ${BRIGHTPOST.customerId}`, AGENT_TONE.memory, 1, {
      quiet: true,
    }),
    box(
      "mem-hit",
      RIGHT_X,
      3,
      "Recalled memories",
      `“${MEMORY_VISIT.oldPreference}”, “${MEMORY_VISIT.refundMemory}”`,
      AGENT_TONE.result,
      1,
      { quiet: true }
    ),
    {
      id: "model",
      type: "box",
      ...MODEL,
      label: "Support agent",
      sub: "one prompt, both inputs",
      tone: AGENT_TONE.model,
      fill: "pastel",
      quiet: true,
    },
    arrow("rag-search", "rag-store", "rag-hit", 1, { label: "search" }),
    arrow("mem-search", "mem-store", "mem-hit", 1, { label: "search" }),
    arrow("rag-in", "rag-hit", "model", 1, {
      via: [
        [LEFT_X + W / 2, MODEL.y + 18],
        [MODEL.x, MODEL.y + 18],
      ],
    }),
    arrow("mem-in", "mem-hit", "model", 1, {
      via: [
        [RIGHT_X + W / 2, MODEL.y + 18],
        [MODEL.x + MODEL.w, MODEL.y + 18],
      ],
    }),

    // RAG's write half (step 2): written by people, indexed offline, the same for everyone.
    box("rag-src", LEFT_X, 0, "Help articles", "written by staff", AGENT_TONE.result, 2),
    box("rag-writer", LEFT_X, 1, "Indexing job", "offline, when articles change", AGENT_TONE.infra, 2, {
      quiet: true,
    }),
    arrow("rag-a1", "rag-src", "rag-writer", 2),
    arrow("rag-a2", "rag-writer", "rag-store", 2, { label: "embed + store" }),

    // Memory's write half (step 3): the agent writes after every chat, so the right side is a loop.
    box("mem-src", RIGHT_X, 0, "This chat", "the customer and the agent", AGENT_TONE.task, 3, { quiet: true }),
    box("mem-writer", RIGHT_X, 1, "Memory writer", "the agent, after every chat", AGENT_TONE.model, 3, {
      highlight: true,
    }),
    arrow("mem-a1", "mem-src", "mem-writer", 3, { label: "extract" }),
    arrow("mem-a2", "mem-writer", "mem-store", 3, { label: "add, update, drop" }),
    // A free start on the model's right edge, so the loop leaves it level.
    {
      id: "mem-loop",
      type: "arrow",
      x: MODEL.x + MODEL.w,
      y: MODEL.y + 40,
      to: "mem-src",
      step: 3,
      dashed: true,
      via: [
        [812, MODEL.y + 40],
        [812, ROW[0] + H / 2],
      ],
    },
  ],
};

export default spec;
