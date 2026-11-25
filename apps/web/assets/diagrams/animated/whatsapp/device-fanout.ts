import type { LayoutGroup, LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Several devices per account: the sender's phone encrypts one copy per device (whatsapp, Step 6).
// Two steps: 1 one phone each: Ana's phone encrypts one ciphertext for Ben's phone; the server queues one entry ·
// 2 Ben links a laptop and a web client and Ana links a laptop: the same message becomes four pairwise sessions,
// four ciphertexts and four mailbox entries, one per device, including Ana's own laptop so her history matches.
// Working: copies per one-to-one message = the recipient's devices + the sender's other devices = 3 + 1 = 4 here;
// with 1.5 devices per user on average, 1.5 + 0.5 = 2 copies per one-to-one message (the page's estimate). 4 × 300 B
// = 1.2 KB uploaded from Ana's phone for this message.
// Fact check (2026-11-17, Meta Engineering 2021 and the WhatsApp encryption overview): each device has its own
// identity key; the client "transmits a single message N number of times to N number of different devices", each
// encrypted with its own pairwise session, including the sender's other devices.
// Layout: Ana's phone on the left (x 30, centred at y 150; its arrows run along a bus at x 200); four rows (y 60, 120, 180, 240): ciphertext cell (x 230), mailbox entry
// inside the "Server mailboxes" group (x 480), device box (x 660). Colours (PATTERN_TONE): Ana's devices orange
// (traffic), ciphertexts blue (data), mailbox entries violet (store), Ben's devices neutral.

const ROWS = [
  { id: "r0", to: "Ben's phone", step: 1, ana: false },
  { id: "r1", to: "Ben's laptop", step: 2, ana: false },
  { id: "r2", to: "Ben's web", step: 2, ana: false },
  { id: "r3", to: "Ana's laptop", step: 2, ana: true },
];
const y = (i: number) => 60 + i * 60;
const H = 38;
const shapes: LayoutShape[] = [
  {
    id: "ana",
    type: "box",
    x: 30,
    y: 150 - H / 2,
    w: 140,
    h: H,
    label: "Ana's phone",
    sub: "sender",
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
  },
];
const groups: LayoutGroup[] = [
  { id: "server", title: "Server mailboxes", tone: PATTERN_TONE.store, x: 460, y: 20, w: 160, h: 270 },
];
ROWS.forEach((r, i) => {
  const n = i + 1;
  shapes.push({
    id: `${r.id}-c`,
    type: "cell",
    x: 230,
    y: y(i),
    w: 170,
    h: H,
    label: `c${n}`,
    sub: `session ${n}`,
    tone: PATTERN_TONE.data,
    quiet: i > 1,
    step: r.step,
  });
  shapes.push({
    id: `${r.id}-m`,
    type: "cell",
    x: 480,
    y: y(i),
    w: 120,
    h: H,
    label: "queued",
    sub: "300 B",
    tone: PATTERN_TONE.store,
    quiet: i > 1,
    step: r.step,
  });
  shapes.push({
    id: `${r.id}-d`,
    type: "box",
    x: 660,
    y: y(i),
    w: 140,
    h: H,
    label: r.to,
    tone: r.ana ? PATTERN_TONE.traffic : PATTERN_TONE.infra,
    fill: "pastel",
    quiet: i > 1,
    step: r.step,
  });
  shapes.push({
    id: `${r.id}-a1`,
    type: "arrow",
    x: 0,
    y: 0,
    from: "ana",
    to: `${r.id}-c`,
    via: [
      [200, 150],
      [200, y(i) + H / 2],
    ],
    step: r.step,
  });
  shapes.push({ id: `${r.id}-a2`, type: "arrow", x: 0, y: 0, from: `${r.id}-c`, to: `${r.id}-m`, step: r.step });
  shapes.push({ id: `${r.id}-a3`, type: "arrow", x: 0, y: 0, from: `${r.id}-m`, to: `${r.id}-d`, step: r.step });
});
shapes.push({
  id: "sum",
  type: "text",
  x: 30,
  y: 302,
  w: 770,
  h: 20,
  label: "1 message → 4 sessions, 4 encryptions, 4 mailbox entries: 1.2 KB up from Ana's phone",
  tone: PATTERN_TONE.data,
  step: 2,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One message, one copy per device",
  width: 830,
  height: 340,
  groups,
  shapes,
  steps: [{ title: "One phone each: one copy" }, { title: "Linked devices: a copy for each" }],
};

export default spec;
