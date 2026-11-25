import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { COMPANY, COST, MEMORY } from "@/components/diagrams/presets/gcase-enterprise";

// Step 7 of the enterprise assistant (design sheet §8 step 7, §10.15, N9): memory the user can see and correct. The
// model can only PROPOSE; code accepts a proposal only if its text is a span of one of the user's own messages; the user
// saves it; every item shows its source and can be edited or deleted; "forget that" is confirmed in the UI.
// Numbers (MEMORY and COST in presets/gcase-enterprise.ts): MEMORY.injectedItems = 5 relevant items (MEMORY.injectedTokens
// = 200 tokens) a prompt; MEMORY.maxItemsPerUser = 50 kept; unused items expire after MEMORY.unusedExpiryDays = 180;
// deletes take effect next turn and are purged from backups within MEMORY.purgeFromBackupsDays = 30 days. Extraction is
// one small-model call a conversation: COST.memoryPerTurn × COMPANY.turnsPerConversation = 0.00023 USD.
// The memory items are illustrative (Tom, Leeds warehouse shift lead).
// Steps: 1 a proposal from Tom's own words · 2 the list he sees, with sources, edit and delete · 3 "forget that".
// Layout (880 wide): left column x 12–412 (the proposal, top to bottom, joined by arrows); right column x 460–868 (the
// memory list under its heading, rows 48 tall, Edit and Delete cells beside each); the "forget that" flow across the
// bottom, three boxes joined by arrows.
// Colours: Tom's words orange (the user), extraction green (a model), the span check and the UI confirm lime (checks),
// the memory list violet (a store), Delete red.

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, tone, fill: "pastel", step, ...extra });
const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number
): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w,
  h: 32,
  label,
  tone,
  fill: "soft",
  step,
  quiet: true,
});
const arrow = (id: string, from: string, to: string, step: number, via?: [number, number][]): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...(via ? { via } : {}),
});
const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone: "neutral",
  step,
  quiet: true,
});

const L = { x: 12, w: 400 };
const extraction = (COST.memoryPerTurn * COMPANY.turnsPerConversation).toFixed(5);

// Step 1: a proposal from Tom's own words.
const proposal: LayoutShape[] = [
  text("h1", L.x, 6, L.w, "The model proposes; Tom decides", 1),
  box("msg", L.x, 34, L.w, 56, "Tom: “I work nights at Leeds, so show me\nthe night-shift rota.”", GENAI_TONE.user, 1),
  box(
    "extract",
    L.x,
    122,
    L.w,
    56,
    `Memory extraction (small model), once a\nconversation, ${extraction} USD: proposes a chip`,
    GENAI_TONE.model,
    1,
    { quiet: true }
  ),
  box("span", L.x, 210, L.w, 56, "Code: is the text a span of one of\nTom's own messages? Yes", GENAI_TONE.check, 1, {
    quiet: true,
  }),
  box("chip", L.x, 298, 258, 44, "Proposed: “Works nights at Leeds”", GENAI_TONE.user, 1, {
    fill: "soft",
    quiet: true,
  }),
  cell("save", 282, 304, 60, "Save", GENAI_TONE.model, 1),
  cell("dismiss", 350, 304, 62, "Dismiss", "neutral", 1),
  arrow("msg-extract", "msg", "extract", 1),
  arrow("extract-span", "extract", "span", 1),
  // Straight down into the chip (it is narrower than the boxes above): an arrow by start point and vector.
  { id: "span-chip", type: "arrow", x: 141, y: 268, w: 0, h: 28, step: 1 },
];

// Step 2: the list Tom sees.
const R = { x: 460, w: 408, rowX: 476, rowW: 248, rowH: 48, y0: 64, pitch: 58 };
const items: [string, string][] = [
  ["Works nights at Leeds", "from your message today"],
  ["Answers in English, rota in Polish", "from your message, 3 Nov"],
  ["Shift lead, Leeds inbound dock", "from your message, 28 Oct"],
];
const list: LayoutShape[] = [
  text("h2", R.x, 6, R.w, `Tom's memory: 3 of ≤ ${MEMORY.maxItemsPerUser} items, each with its source`, 2),
  ...items.flatMap(([label, sub], i) => {
    const y = R.y0 + i * R.pitch;
    return [
      box(`item-${i}`, R.rowX, y, R.rowW, R.rowH, label, GENAI_TONE.store, 2, {
        sub,
        fill: "soft",
        quiet: i > 0,
      }),
      cell(`edit-${i}`, R.rowX + R.rowW + 10, y + 8, 54, "Edit", "neutral", 2),
      cell(`delete-${i}`, R.rowX + R.rowW + 72, y + 8, 60, "Delete", GENAI_TONE.failure, 2),
    ];
  }),
  text(
    "list-note-1",
    R.x,
    R.y0 + 3 * R.pitch + 2,
    R.w,
    `≤ ${MEMORY.injectedItems} relevant items (${MEMORY.injectedTokens} tokens) go into a prompt`,
    2
  ),
  text(
    "list-note-2",
    R.x,
    R.y0 + 3 * R.pitch + 24,
    R.w,
    `≤ ${MEMORY.maxItemsPerUser} kept; unused ${MEMORY.unusedExpiryDays} days → expire`,
    2
  ),
  arrow("save-item", "save", "item-0", 2, [
    [312, 278],
    [436, 278],
    [436, R.y0 + R.rowH / 2],
  ]),
];

// Step 3: "forget that".
const FY = 384;
const FW = 270;
const forget: LayoutShape[] = [
  text("h3", L.x, FY - 26, 856, "“Forget that”: the UI confirms, the item is gone next turn", 3),
  box("forget", 12, FY, FW, 56, "Tom: “forget that I work nights”", GENAI_TONE.user, 3),
  box("confirm", 305, FY, FW, 56, "UI: delete “Works nights at\nLeeds”? Tom confirms", GENAI_TONE.check, 3, {
    quiet: true,
  }),
  box(
    "gone",
    598,
    FY,
    FW,
    56,
    `Deleted next turn; purged from\nbackups ≤ ${MEMORY.purgeFromBackupsDays} days; audited`,
    GENAI_TONE.store,
    3,
    { quiet: true }
  ),
  arrow("forget-confirm", "forget", "confirm", 3),
  arrow("confirm-gone", "confirm", "gone", 3),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Memory the user can see and correct: the model proposes, the user saves, edits and deletes",
  width: 880,
  height: FY + 56 + 12,
  steps: [
    { title: "A proposal from Tom's own words; he saves it" },
    { title: "Every item shows its source and can be edited or deleted" },
    { title: "“Forget that” is confirmed in the UI and audited" },
  ],
  shapes: [...proposal, ...list, ...forget],
};

export default spec;
