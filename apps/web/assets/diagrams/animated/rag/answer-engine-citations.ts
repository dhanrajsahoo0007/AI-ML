import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Answer synthesis with citations" (genai-system-design/case-studies/ai-answer-engine). The answer engine's own
// example, not Brightpost: a web question about HTTP/3. Four ranked passages are numbered [1]..[4]; each sentence of
// the streamed answer names the passages it rests on, and a sentence that rests on none is removed.
//
// The passages paraphrase their sources (all checked):
// - [1] RFC 9114 (HTTP/3): "a mapping of HTTP semantics over the QUIC transport protocol".
// - [2] RFC 9000 (QUIC), titled "QUIC: A UDP-Based Multiplexed and Secure Transport".
// - [3] Head-of-line blocking: over one TCP connection a lost packet holds back every HTTP/2 stream behind it
//   (the motivation RFC 9114 gives in its introduction); the source shown is a generic CDN blog.
// - [4] RFC 9001, "Using TLS to Secure QUIC": QUIC's handshake uses TLS 1.3.
// Sentence 4 ("always twice as fast") is the kind of claim no passage supports.
//
// Tones (four, RAG legend): the question orange, passages blue, the answer green, the unsupported sentence red.
// Columns: passages x 20..390, sentences x 490..860; rows 64 apart from y 112 so the arrows run in parallel.

const COL_P = 20;
const COL_S = 490;
const W = 370;
const H = 52;
const ROW = (i: number) => 112 + i * 64;

const passages = [
  { label: "[1] HTTP/3 maps HTTP onto QUIC", sub: "rfc-editor.org · RFC 9114" },
  { label: "[2] QUIC is a UDP-based, multiplexed transport", sub: "rfc-editor.org · RFC 9000" },
  { label: "[3] On TCP, one lost packet stalls every stream", sub: "a CDN engineering blog" },
  { label: "[4] QUIC's handshake uses TLS 1.3", sub: "rfc-editor.org · RFC 9001" },
];

const sentences = [
  { label: "HTTP/3 carries HTTP over QUIC, not TCP. [1]", cites: [0] },
  { label: "QUIC runs on UDP with separate streams [2],\nso a lost packet stalls only its stream. [3]", cites: [1, 2] },
  { label: "Encryption is built in: QUIC uses TLS 1.3. [4]", cites: [3] },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Every sentence of the answer points at a numbered passage",
  width: 880,
  height: 440,
  steps: [
    { title: "The reranked passages are numbered" },
    { title: "Each sentence streams with the numbers it rests on" },
    { title: "A sentence with no supporting passage is removed" },
  ],
  groups: [
    { id: "g-passages", title: "Top passages, numbered", tone: RAG_TONE.infra, x: 8, y: 88, w: 394, h: 282 },
    { id: "g-answer", title: "Streamed answer", tone: RAG_TONE.infra, x: 478, y: 88, w: 394, h: 282 },
  ],
  shapes: [
    {
      id: "question",
      type: "box",
      x: 260,
      y: 16,
      w: 360,
      h: 40,
      label: "What changed between HTTP/2 and HTTP/3?",
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    ...passages.map((p, i): LayoutShape => ({
      id: `p${i + 1}`,
      type: "box",
      x: COL_P,
      y: ROW(i),
      w: W,
      h: H,
      label: p.label,
      sub: p.sub,
      tone: RAG_TONE.text,
      fill: "pastel",
    })),
    ...sentences.flatMap((s, i): LayoutShape[] => [
      {
        id: `s${i + 1}`,
        type: "box",
        x: COL_S,
        y: ROW(i),
        w: W,
        h: H,
        label: s.label,
        tone: RAG_TONE.answer,
        fill: "pastel",
        step: 2,
      },
      ...s.cites.map((c): LayoutShape => ({
        id: `a${i + 1}-${c + 1}`,
        type: "arrow",
        x: 0,
        y: 0,
        from: `s${i + 1}`,
        to: `p${c + 1}`,
        step: 2,
      })),
    ]),

    // Step 3: the unsupported sentence.
    {
      id: "s4",
      type: "box",
      x: COL_S,
      y: ROW(3),
      w: W,
      h: H,
      label: "HTTP/3 is always twice as fast as HTTP/2.",
      sub: "no passage supports it: removed",
      tone: RAG_TONE.failure,
      fill: "soft",
      step: 3,
    },
    {
      id: "check-note",
      type: "text",
      x: 120,
      y: 388,
      w: 640,
      h: 40,
      label:
        "Each finished sentence is checked against the passages it cites before it is shown.\n3 of 4 sentences are supported; the fourth never reaches the reader.",
      step: 3,
    },
  ],
};

export default spec;
