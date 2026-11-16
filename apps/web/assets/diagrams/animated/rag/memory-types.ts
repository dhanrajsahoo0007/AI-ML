import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Agent memory, "Types of memory side by side": the four memory types named in CoALA (Sumers et al., 2023), each
// with one example from Brightpost's support agent (the cracked kettle, order 4471, a £42 refund approved by a
// support agent; plans/agents-diagrams-plan.md §4 A). Working memory is the context window of this session; the three
// long-term types live in stores and survive the session.
// - Semantic: facts about the world and the user ("prefers email"), stored as a profile record.
// - Episodic: what happened in earlier sessions ("12 Nov: £42 kettle refund approved"), an event log with vectors.
// - Procedural: how to act ("damaged item: ask for a photo first"), kept in the prompt or a rules file. CoALA counts
//   the model's weights and the agent's code as procedural memory too; this figure shows only the editable part.
//
// Steps: 1 working memory is this session's context · 2 facts are saved as semantic memory · 3 outcomes are logged as
// episodic memory · 4 lessons from many episodes become procedural memory (the highlight).
//
// Tones (two plus neutral): memory violet, the agent green; the "stored as" cells neutral.
// Grid: left group x 20 (240 wide), right group x 360 (480 wide): the 100-unit gap between them holds the arrow
// pills. Long-term rows at y 70 | 170 | 270, 52 tall, 48 apart (room for a pill); type boxes 270 wide at x 375,
// "stored as" cells 165 wide at x 660. The working-memory box is centred on the episodic row, so "log outcomes" runs
// straight across and "save facts" turns up at x 300.

const ROW_Y = [70, 170, 270] as const;
const ROW_H = 52;
const TYPE_X = 375;
const TYPE_W = 270;
const STORE_X = 660;
const STORE_W = 165;
const MID = (i: number) => ROW_Y[i] + ROW_H / 2;

const LONG_TERM: { id: string; label: string; sub: string; storedAs: string; step: number }[] = [
  { id: "semantic", label: "Semantic: facts", sub: "“prefers email”", storedAs: "profile record", step: 2 },
  {
    id: "episodic",
    label: "Episodic: what happened",
    sub: "“12 Nov: £42 kettle refund approved”",
    storedAs: "event log + vectors",
    step: 3,
  },
  {
    id: "procedural",
    label: "Procedural: how to act",
    sub: "“damaged item: ask for a photo first”",
    storedAs: "prompt or rules file",
    step: 4,
  },
];

const longTerm: LayoutShape[] = LONG_TERM.flatMap((m, i): LayoutShape[] => [
  {
    id: m.id,
    type: "box",
    x: TYPE_X,
    y: ROW_Y[i],
    w: TYPE_W,
    h: ROW_H,
    label: m.label,
    sub: m.sub,
    tone: RAG_TONE.store,
    fill: "pastel",
    highlight: m.id === "procedural" ? true : undefined,
    step: m.step,
  },
  {
    id: `${m.id}-store`,
    type: "cell",
    x: STORE_X,
    y: ROW_Y[i] + 8,
    w: STORE_W,
    h: ROW_H - 16,
    label: m.storedAs,
    tone: RAG_TONE.infra,
    step: m.step,
  },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Four kinds of agent memory, one Brightpost example each",
  width: 860,
  height: 360,
  groups: [
    { id: "short", title: "Short-term: this session", tone: RAG_TONE.infra, x: 20, y: 30, w: 240, h: 316 },
    { id: "long", title: "Long-term: across sessions", tone: RAG_TONE.store, x: 360, y: 30, w: 480, h: 316 },
  ],
  shapes: [
    {
      id: "agent",
      type: "box",
      x: 40,
      y: 70,
      w: 200,
      h: 48,
      label: "Support agent",
      sub: "reads the window",
      tone: RAG_TONE.answer,
      fill: "pastel",
    },
    {
      id: "working",
      type: "box",
      x: 40,
      y: MID(1) - 50,
      w: 200,
      h: 100,
      label: "Working memory\n(the context window)",
      sub: "order 4471, cracked kettle",
      tone: RAG_TONE.store,
      fill: "soft",
    },
    { id: "w-agent", type: "arrow", x: 0, y: 0, from: "working", to: "agent" },
    { id: "stored-head", type: "text", x: STORE_X, y: 44, w: STORE_W, h: 20, label: "Stored as" },
    ...longTerm,
    {
      id: "w-sem",
      type: "arrow",
      // A free start on working memory's right edge (x 240), so the route leaves it level, turns up at x 300.
      x: 240,
      y: MID(1) - 30,
      to: "semantic",
      label: "save facts",
      via: [
        [300, MID(1) - 30],
        [300, MID(0)],
      ],
      step: 2,
    },
    {
      id: "w-epi",
      type: "arrow",
      x: 0,
      y: 0,
      from: "working",
      to: "episodic",
      label: "log outcomes",
      step: 3,
    },
    {
      id: "epi-proc",
      type: "arrow",
      x: 0,
      y: 0,
      from: "episodic",
      to: "procedural",
      label: "distil a lesson",
      step: 4,
    },
  ],
  steps: [
    { title: "Working memory is this session's context window" },
    { title: "Facts worth keeping become semantic memory" },
    { title: "Outcomes are logged as episodic memory" },
    { title: "Lessons from many episodes become procedural memory" },
  ],
};

export default spec;
