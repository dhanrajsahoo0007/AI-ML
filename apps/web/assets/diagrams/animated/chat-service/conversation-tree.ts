import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { STORAGE } from "@/components/diagrams/presets/gcase-chat";

// Conversation storage and deletion (chatgpt-style-chat-service, design sheet §7 and deep dive 5; preset STORAGE in
// presets/gcase-chat.ts). An EXTRA figure, not in the sheet's Figures table; the page may use it in deep dive 5.
//   Step 1: messages are a tree in one partition per conversation (`conversation_id`, clustered by a time-sortable
//     `message_id`, each with a `parent_id`). Editing turn 47 posts a new user message with turn 46's reply as parent,
//     so it is a sibling branch; regenerating turn 49's reply adds a sibling reply. `current_leaf` on the conversation
//     row moves with a conditional update (expected old leaf), so two devices cannot both move it. Summaries are stored
//     with the message they run through: both branches here fork after turn 40, so both use "summary 1–40"; a branch
//     that forks earlier than the last fold uses the older summary. A chat is ≈ STORAGE.avgConversationKb = 17.4 KB on
//     average and STORAGE.turn50ConversationKb = 145 KB at turn 50; peak writes STORAGE.messageWritesPeak ≈ 46,300
//     messages a second.
//   Step 2: deletion fans out from one `deleted` event; each store acknowledges on its own clock (STORAGE.deletion):
//     caches, stream buffer and sidebar ≤ 1 min · KV blocks, dropped by the conversation's salt, ≤ 15 min · recall and
//     file indexes and shared links ≤ 1 h · messages, summaries and file objects soft-deleted now, hard-deleted ≤ 30
//     days · backups unreadable to the service by destroying the conversation's data key (and its cached copies) (KMS backups of the key age out ≤ 30
//     days) · memories from the chat kept but marked "source deleted" (the user is told) · a legal hold, set only by
//     legal, suspends hard deletion. A weekly audit probes every store for sampled deleted ids.
// Layout (880 wide): step 1 a tree of turn boxes left to right, two forks, the leaf pointer; step 2 an event box and a
// three-column table (store, action, deadline). Colours: user turns orange, replies green, the summary neutral, the
// active branch highlighted by a lime leaf pointer; stores violet, deadlines neutral, key destruction lime, the hold
// orange.

const X = 12;
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  fill: LayoutShape["fill"] = "pastel"
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill, step, quiet: true });
const arrow = (id: string, from: string, to: string, step: number, dashed = false): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  dashed: dashed || undefined,
  quiet: true,
});

// Step 1: the tree.
const T = 34;
const BW = 76;
const BH = 40;
const GAP = 16;
const colX = (i: number) => X + 108 + i * (BW + GAP);
const MAIN_Y = T + 26;
const FORK_Y = MAIN_Y + 92;
const user = GENAI_TONE.user;
const reply = GENAI_TONE.model;
const main: [string, string, string | undefined, LayoutTone][] = [
  ["u46", "46", "user", user],
  ["a46", "46", "reply", reply],
  ["u47", "47", "user", user],
  ["a47", "47", "reply", reply],
  ["u48", "48", "…", user],
  ["u49", "49", "user", user],
  ["a49", "49", "reply", reply],
];
const step1: LayoutShape[] = [
  text(
    "h1",
    X,
    4,
    856,
    "Messages are a tree: an edit or a regenerate adds a sibling; current_leaf picks the branch shown",
    1,
    PROD_TONE.infra,
    false
  ),
  box("summary", X, MAIN_Y, 96, BH, "Summary", "1–40, both", PROD_TONE.infra, 1),
  ...main.map(([id, label, sub, tone], i) => box(id, colX(i), MAIN_Y, BW, BH, label, sub, tone, 1)),
  arrow("t-0", "summary", "u46", 1),
  ...main.slice(1).map((_, i) => arrow(`t-${i + 1}`, main[i][0], main[i + 1][0], 1)),
  // Regenerate at 49: a sibling reply under the same user message.
  box("a49r", colX(7), MAIN_Y, BW, BH, "49", "regenerated", reply, 1, "soft"),
  {
    id: "t-regen",
    type: "arrow",
    x: 0,
    y: 0,
    from: "u49",
    to: "a49r",
    via: [
      [colX(5) + BW / 2, MAIN_Y - 12],
      [colX(7) + BW / 2, MAIN_Y - 12],
    ],
    dashed: true,
    step: 1,
    quiet: true,
  },
  text("regen-l", colX(6) - 20, MAIN_Y - 32, 150, "regenerate: sibling reply", 1, reply),
  // Edit at 47: a sibling user message under 46's reply.
  box("u47b", colX(2), FORK_Y, BW, BH, "47b", "edited", user, 1),
  box("a47b", colX(3), FORK_Y, BW, BH, "47b", "reply", reply, 1),
  {
    id: "t-edit",
    type: "arrow",
    x: 0,
    y: 0,
    from: "a46",
    to: "u47b",
    via: [[colX(1) + BW / 2, FORK_Y + BH / 2]],
    step: 1,
    quiet: true,
  },
  text("edit-l", colX(1) + BW / 2 - 176, FORK_Y + BH / 2 - 9, 170, "edit: parent is 46's reply", 1, user),
  arrow("t-edit-2", "u47b", "a47b", 1),
  // The leaf pointer.
  box("leaf", colX(5), FORK_Y, 190, BH, "current_leaf", "conditional update", GENAI_TONE.check, 1),
  arrow("t-leaf", "leaf", "a47b", 1),
  text(
    "n1",
    X,
    FORK_Y + BH + 22,
    856,
    `One partition per conversation: ${STORAGE.avgConversationKb.toFixed(1)} KB on average, ${n(STORAGE.turn50ConversationKb)} KB at turn 50; a branch forking before the last fold uses the older summary.`,
    1
  ),
];

// Step 2: deletion fan-out.
const H2 = FORK_Y + BH + 64;
const D = STORAGE.deletion;
const ROWS: [string, string, string, LayoutTone][] = [
  ["Caches, buffer, sidebar, data keys", "purge keys and cached data keys", `≤ ${D.cachesMin} min`, PROD_TONE.infra],
  ["KV blocks: home unit, KV store", "drop by the conversation's salt", `≤ ${D.kvBlocksMin} min`, PROD_TONE.infra],
  [
    "Recall, file index, shared links",
    "delete entries, revoke links",
    `≤ ${D.recallAndFileIndexHours} h`,
    PROD_TONE.infra,
  ],
  ["Messages, summaries, files", "soft delete now, partition later", `≤ ${D.storeDays} days`, PROD_TONE.infra],
  ["Backups", "destroy the conversation's data key", "now; KMS ≤ 30 days", GENAI_TONE.check],
  ["Memories from the chat", "kept, marked source deleted", "the user is told", PROD_TONE.infra],
  ["Legal hold (legal only)", "suspends hard deletion", "while it lasts", "orange"],
];
const EV_W = 150;
const C1 = 230;
const C2 = 280;
const C3 = 856 - EV_W - 40 - C1 - C2 - 12;
const c1x = X + EV_W + 40;
const c2x = c1x + C1 + 6;
const c3x = c2x + C2 + 6;
const RH = 30;
const R0 = H2 + 28;
const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  fill: LayoutShape["fill"]
): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w,
  h: RH - 4,
  label,
  tone,
  fill,
  step: 2,
  quiet: true,
});
const evY = R0 + (ROWS.length * RH) / 2 - 28;
const step2: LayoutShape[] = [
  text(
    "h2",
    X,
    H2,
    856,
    "DELETE a conversation: one deleted event, every store acknowledges on its own clock",
    2,
    PROD_TONE.infra,
    false
  ),
  box("event", X, evY, EV_W, 56, "deleted event", "on a log", PROD_TONE.infra, 2),
  ...ROWS.flatMap(([store, action, deadline, tone], i): LayoutShape[] => {
    const y = R0 + i * RH;
    return [
      cell(`s-${i}`, c1x, y, C1, store, GENAI_TONE.store, "soft"),
      cell(`a-${i}`, c2x, y, C2, action, tone, tone === PROD_TONE.infra ? "soft" : "pastel"),
      cell(`d-${i}`, c3x, y, C3, deadline, PROD_TONE.infra, "soft"),
      {
        id: `e-${i}`,
        type: "arrow",
        x: X + EV_W + 2,
        y: evY + 28,
        w: c1x - (X + EV_W + 2) - 4,
        h: y + (RH - 4) / 2 - (evY + 28),
        step: 2,
        quiet: true,
      },
    ];
  }),
  text(
    "n2",
    X,
    R0 + ROWS.length * RH + 10,
    856,
    `Key per conversation, wrapped by a key per user; KMS backups of a destroyed key age out within ${D.kmsBackupDays} days. A weekly audit probes every store.`,
    2
  ),
];
const END = R0 + ROWS.length * RH + 40;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Conversations as a tree of messages, and deletion fanned out to every store with a deadline each",
  width: 880,
  height: END,
  steps: [
    { title: "A tree: edits and regenerations are siblings; current_leaf moves conditionally" },
    { title: "Deletion: one event, every store on its own deadline, backups unreadable to the service" },
  ],
  shapes: [...step1, ...step2],
};

export default spec;
