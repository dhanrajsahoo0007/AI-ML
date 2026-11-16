import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Agent memory, "Architecture": Brightpost's support agent reads memory before the model call and writes it after.
// The running example is the agents track's (plans/agents-diagrams-plan.md §4 A): a week after the cracked-kettle
// refund (order 4471, £42, the over-£30 case on cloud/resilience/ai-security), the customer writes "Has my kettle
// refund gone through? Text me from now on, not email."
//
// Read path (before the call): the message joins the recent turns (short-term memory) → it is embedded → the memory
// store returns the closest memories for this customer ("prefers email", "4471: £42 refund approved") → the context
// builder puts turns and memories into one prompt → the agent replies.
// Write path (after the call): a memory writer extracts what is worth keeping ("prefers text") → the check finds the
// related old memory ("prefers email"), a conflict, so the new one replaces it, stamped with time and source → saved.
// The customer can view and delete what is stored. (Node labels: "Build context" is the context builder.)
//
// Six steps: 1 the message joins the recent turns · 2 the message is embedded and recalls memories · 3 the agent
// replies from turns and memories · 4 after the reply, a writer extracts what is worth keeping · 5 a new memory is
// checked against old ones, then saved · 6 the customer can view and delete memories. Nodes never move.
//
// Layout: columns x 90 | 265 | 440 | 615 | 790 (as rag/pipeline: cards 150 wide, 25 apart). Rows: 95 (the
// conversation) | 230 (embedding, store, check) | 365 (the customer's controls). The reply returns to the customer
// along the corridor at y 30. The read loop is a square: turns → embed (down) → store (right) → builder (up).
//
// Colour (three tones plus neutral, the agents legend): memory and the store violet (the store is the accent), the
// embedding model pink, the agent and the memory writer green; the customer, the context builder and the controls
// neutral.
//
// Local constant (illustrative): RECALL = 3, the memories the store returns per message (the page labels it so).

const RECALL = 3;

const X = [90, 265, 440, 615, 790] as const;
const ROW = { chat: 95, store: 230, controls: 365, reply: 30 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: "Agent memory: recall before the model call, write after it",
  width: 880,
  height: 410,
  steps: [
    { title: "The message joins the recent turns" },
    { title: "The message is embedded and recalls memories" },
    { title: "The agent replies from turns and memories" },
    { title: "After the reply, a writer extracts what is worth keeping" },
    { title: "A new memory is checked against old ones, then saved" },
    { title: "The customer can view and delete memories" },
  ],
  zones: [],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: "a week later",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[0],
      y: ROW.chat,
      w: W,
    },
    {
      id: "turns",
      label: "Recent turns",
      sub: "short-term",
      icon: "message-square",
      tone: RAG_TONE.store,
      fill: "soft",
      x: X[1],
      y: ROW.chat,
      w: W,
    },
    {
      id: "builder",
      label: "Build context",
      sub: `turns + top ${RECALL}`,
      icon: "prompt",
      tone: RAG_TONE.infra,
      fill: "pastel",
      x: X[2],
      y: ROW.chat,
      w: W,
    },
    {
      id: "embed",
      label: "Embed",
      sub: "the message",
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.store,
      w: W,
    },
    {
      id: "store",
      label: "Memory store",
      sub: "per customer",
      icon: "database",
      tone: RAG_TONE.store,
      accent: true,
      step: 2,
      x: X[2],
      y: ROW.store,
      w: W,
    },
    {
      id: "agent",
      label: "Support agent",
      sub: "the LLM",
      icon: "robot",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 3,
      x: X[3],
      y: ROW.chat,
      w: W,
    },
    {
      id: "writer",
      label: "Memory writer",
      sub: "extract facts",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 4,
      x: X[4],
      y: ROW.chat,
      w: W,
    },
    {
      id: "check",
      label: "Check + save",
      sub: "dupe? conflict?",
      icon: "policy",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 5,
      x: X[4],
      y: ROW.store,
      w: W,
    },
    {
      id: "controls",
      label: "User controls",
      sub: "view, delete",
      icon: "eye",
      tone: RAG_TONE.infra,
      step: 6,
      x: X[2],
      y: ROW.controls,
      w: W,
    },
  ],
  edges: [
    // Step 1: the message joins the recent turns, which feed the context builder.
    { from: "customer", to: "turns", packet: true },
    { from: "turns", to: "builder", packet: true, delay: 0.6 },

    // Step 2: recall. The latest message is embedded and the store returns the nearest memories.
    { from: "turns", to: "embed", label: "latest", packet: true, delay: 0.6 },
    { from: "embed", to: "store", packet: true, delay: 1.2 },
    { from: "store", to: "builder", label: `top ${RECALL}`, packet: true, delay: 1.8 },

    // Step 3: the model call, and the reply.
    { from: "builder", to: "agent", packet: true, delay: 2.4 },
    {
      from: "agent",
      to: "customer",
      label: "reply: refunded",
      dashed: true,
      labelAt: 0.55,
      via: [
        [X[3], ROW.reply],
        [X[0], ROW.reply],
      ],
    },

    // Step 4: after the reply, extract what is worth keeping.
    { from: "agent", to: "writer", packet: true, delay: 3 },

    // Step 5: check against old memories, then save (the conflict replaces "prefers email").
    { from: "writer", to: "check", label: "prefers text", packet: true, delay: 3.6 },
    { from: "check", to: "store", label: "replaces email", packet: true, delay: 4.2 },

    // Step 6: the customer's controls.
    { from: "controls", to: "store", label: "view, edit, delete", bidirectional: true },
  ],
};

export default spec;
