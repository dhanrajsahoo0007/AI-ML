import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE, RESULTS } from "@/components/diagrams/presets/rag";

// Using conversation history in the query: a chat follow-up ("And if I don't have backup codes?") has no subject of
// its own. Searched as typed, it matches articles about backup codes in general, such as "Set up two-factor sign-in"
// (where codes are made), not the customer's problem. An LLM reads the last turns and rewrites the follow-up as a
// standalone question; that question finds "No backup codes: verify your ID" (a relevant chunk in RESULTS).
// Which article the raw follow-up finds is illustrative; both titles come from RESULTS.
//
// Layout (860 wide): left, the chat so far (a neutral group: the customer's turns orange, the assistant's reply
// green); right, two lanes: top "searched as typed" (step 2), bottom "condensed with the chat" (steps 3 and 4).
// Tones (four plus neutral): the questions orange, the reply green, the wrong result red, the right chunk blue.

const byTitle = (t: string) => RESULTS.find((r) => r.title === t)!;
const WRONG = byTitle("Set up two-factor sign-in");
const RIGHT = byTitle("No backup codes: verify your ID");
const FOLLOW_UP = "And if I don't have backup codes?";
/** The condensed question: the main question plus the follow-up's new condition. */
const STANDALONE = `${QUESTIONS.main.replace("?", "")} and have no backup codes?`;

const R = { x: 450, w: 390 } as const;
const HALF = { w: 185, gap: 20 } as const;

const chat: LayoutShape[] = [
  {
    id: "t1",
    type: "box",
    x: 36,
    y: 60,
    w: 300,
    h: 48,
    label: QUESTIONS.main.replace(" if ", "\nif "),
    tone: RAG_TONE.query,
    fill: "pastel",
  },
  {
    id: "a1",
    type: "box",
    x: 76,
    y: 122,
    w: 300,
    h: 48,
    label: "Sign in with a backup code,\nthen reset your password.",
    tone: RAG_TONE.answer,
    fill: "soft",
  },
  {
    id: "t2",
    type: "box",
    x: 36,
    y: 184,
    w: 300,
    h: 48,
    label: FOLLOW_UP,
    tone: RAG_TONE.query,
    fill: "pastel",
    highlight: true,
  },
  {
    id: "chat-note",
    type: "text",
    x: 20,
    y: 262,
    w: 370,
    h: 38,
    label: "Turn 2 has no subject of its own:\nwhose password, which phone?",
    tone: RAG_TONE.infra,
  },
];

const asTyped: LayoutShape[] = [
  {
    id: "raw-title",
    type: "text",
    x: R.x,
    y: 30,
    w: R.w,
    h: 20,
    label: "Searched as typed",
    tone: RAG_TONE.infra,
    step: 2,
  },
  {
    id: "raw",
    type: "box",
    x: R.x,
    y: 56,
    w: HALF.w,
    h: 48,
    label: "and if I don't have\nbackup codes?",
    tone: RAG_TONE.query,
    fill: "paper",
    step: 2,
  },
  {
    id: "t2-raw",
    type: "arrow",
    x: 0,
    y: 0,
    from: "t2",
    to: "raw",
    via: [
      [414, 208],
      [414, 80],
    ],
    step: 2,
  },
  {
    id: "wrong",
    type: "box",
    x: R.x + HALF.w + HALF.gap,
    y: 56,
    w: HALF.w,
    h: 48,
    label: WRONG.title.replace(" sign-in", "\nsign-in"),
    tone: RAG_TONE.failure,
    fill: "paper",
    step: 2,
  },
  { id: "raw-wrong", type: "arrow", x: 0, y: 0, from: "raw", to: "wrong", step: 2 },
  {
    id: "wrong-note",
    type: "text",
    x: R.x + HALF.w + HALF.gap,
    y: 108,
    w: HALF.w,
    h: 38,
    label: "how to make codes,\nnot what to do without",
    tone: RAG_TONE.failure,
    step: 2,
  },
];

const condensed: LayoutShape[] = [
  {
    id: "cond-title",
    type: "text",
    x: R.x,
    y: 166,
    w: R.w,
    h: 20,
    label: "Condensed with the chat",
    tone: RAG_TONE.infra,
    step: 3,
  },
  {
    id: "llm",
    type: "box",
    x: R.x,
    y: 192,
    w: R.w,
    h: 40,
    label: "LLM rewrites turn 2 using turns 1 and 2",
    tone: RAG_TONE.infra,
    fill: "soft",
    step: 3,
  },
  { id: "t2-llm", type: "arrow", x: 0, y: 0, from: "t2", to: "llm", step: 3 },
  {
    id: "standalone",
    type: "box",
    x: R.x,
    y: 262,
    w: R.w,
    h: 48,
    label: STANDALONE.replace(" if ", "\nif "),
    tone: RAG_TONE.query,
    fill: "pastel",
    step: 3,
  },
  { id: "llm-standalone", type: "arrow", x: 0, y: 0, from: "llm", to: "standalone", step: 3 },
  {
    id: "right",
    type: "box",
    x: R.x,
    y: 340,
    w: R.w,
    h: 48,
    label: RIGHT.title,
    sub: "relevant: the step the customer needs",
    tone: RAG_TONE.text,
    fill: "pastel",
    step: 4,
  },
  { id: "standalone-right", type: "arrow", x: 0, y: 0, from: "standalone", to: "right", step: 4 },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Condensing a follow-up into a standalone question",
  width: 860,
  height: 410,
  groups: [{ id: "chat", title: "The chat so far", tone: RAG_TONE.infra, x: 20, y: 30, w: 372, h: 220 }],
  steps: [
    { title: "The follow-up leans on the turn before it" },
    { title: "Searched as typed, it finds the wrong article" },
    { title: "An LLM rewrites it as a standalone question" },
    { title: "The standalone question finds the chunk the customer needs" },
  ],
  shapes: [...chat, ...asTyped, ...condensed],
};

export default spec;
