import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// From requirements to a shortlist, for "Architecture" on the Choosing a Model page. Hard constraints are pass/fail
// and cheap to check, so they run first; quality is measured only on the survivors, with the team's own eval set;
// cost at real volume decides among the models that clear the quality bar. The shortlist is a primary model and a
// tested fallback, and it is re-run when a new model ships.
//
// The counts are an illustrative example (not data from a study), computed here so they always add up:
//   12 candidates − 7 failing a hard constraint = 5
//    5             − 2 below the quality bar      = 3
//    3             − 1 over the monthly budget    = 2 on the shortlist (a primary and a fallback)
//
// Tones: requirements neutral, hard constraints red (pass/fail), eval blue, cost teal, shortlist green; dropped
// candidates red text. Each step has one non-quiet labelled shape that carries the NEW ring.

const CANDIDATES = 12;
const DROP_HARD = 7;
const DROP_QUALITY = 2;
const DROP_COST = 1;
const AFTER_HARD = CANDIDATES - DROP_HARD; // 5
const AFTER_QUALITY = AFTER_HARD - DROP_QUALITY; // 3
const SHORTLIST = AFTER_QUALITY - DROP_COST; // 2
if (SHORTLIST !== 2) throw new Error(`shortlist should be 2, got ${SHORTLIST}`);

const COL_X = 40;
const COL_W = 340;
const MID = COL_X + COL_W / 2; // 210
const DROP_X = 440;
const H = 44;

const Y = { req: 24, group: 132, eval: 330, cost: 430, short: 530 };
const GROUP_H = 140;
const BOX_W = 155;
const GAP = 10;
const BX = [COL_X + (COL_W - 2 * BOX_W - GAP) / 2, COL_X + (COL_W - 2 * BOX_W - GAP) / 2 + BOX_W + GAP];
const BY = [Y.group + 30, Y.group + 30 + H + GAP];

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  opts: { sub?: string; quiet?: boolean } = {}
): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h: H,
  label,
  sub: opts.sub,
  tone,
  fill: "pastel",
  step,
  quiet: opts.quiet || undefined,
});

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true });

/** A text box as wide as its longest line (about 6.2 px per character at 12.5 px), so it starts at x. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.2) + 8;

/** A vertical arrow down the main column with a count pill. */
const down = (id: string, y0: number, y1: number, label: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: MID,
  y: y0,
  w: 0,
  h: y1 - y0,
  label,
  tone: "neutral",
  step,
  quiet: true,
});

/** A red arrow to the right, to the note naming what was dropped. */
const drop = (id: string, y: number, x0: number, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: x0,
  y,
  w: DROP_X - 6 - x0,
  h: 0,
  tone: "red",
  step,
  quiet: true,
});

const NOTE_REQ = "Write the numbers down first: e.g. TTFT under 1 s,\n400 output tokens in 5 s, a monthly budget cap.";
const NOTE_LOOP = "Dashed loop: when a new model ships, run it\nthrough the same eval and cost check.";
const NOTE_HARD = `${DROP_HARD} dropped: data may not leave the EU, no image\ninput, window under 64K tokens, or too slow\nat your prompt length`;
const NOTE_QUALITY = `${DROP_QUALITY} dropped: below the quality bar on your\ncases, whatever their leaderboard rank`;
const NOTE_COST = `${DROP_COST} dropped: meets the bar but costs 4× more\nper month than the next model`;

const shapes: LayoutShape[] = [
  // ── Step 1: requirements ──
  box("req", COL_X, Y.req, COL_W, "Task and requirements", "neutral", 1, {
    sub: "quality bar · latency · budget · volume",
  }),
  text("req-note", DROP_X, Y.req - 4, hug(NOTE_REQ), 52, NOTE_REQ, 1),
  down("req>group", Y.req + H, Y.group - 14, `${CANDIDATES} candidates`, 2),

  // ── Step 2: hard constraints, pass or fail ──
  box("hard-data", BX[0], BY[0], BOX_W, "Data, privacy\nand residency", "red", 2),
  box("hard-licence", BX[1], BY[0], BOX_W, "Licence and\ndeployment", "red", 2, { quiet: true }),
  box("hard-modality", BX[0], BY[1], BOX_W, "Modality, tools\nand languages", "red", 2, { quiet: true }),
  box("hard-context", BX[1], BY[1], BOX_W, "Context length\nand latency", "red", 2, { quiet: true }),
  drop("drop-hard", Y.group + GROUP_H / 2, COL_X + COL_W + 12, 2),
  text("drop-hard-note", DROP_X, Y.group + GROUP_H / 2 - 27, hug(NOTE_HARD), 54, NOTE_HARD, 2, "red"),
  down("group>eval", Y.group + GROUP_H, Y.eval, `${AFTER_HARD} pass`, 3),

  // ── Step 3: quality on your own eval set ──
  box("eval", COL_X, Y.eval, COL_W, "Quality on your own eval set", "blue", 3, {
    sub: "a few hundred real cases, scored the same way",
  }),
  drop("drop-quality", Y.eval + H / 2, COL_X + COL_W + 12, 3),
  text("drop-quality-note", DROP_X, Y.eval + H / 2 - 18, hug(NOTE_QUALITY), 36, NOTE_QUALITY, 3, "red"),
  down("eval>cost", Y.eval + H, Y.cost, `${AFTER_QUALITY} clear the bar`, 4),

  // ── Step 4: cost and measured latency at real volume ──
  box("cost", COL_X, Y.cost, COL_W, "Cost and latency at real volume", "teal", 4, {
    sub: "price × tokens × requests; TTFT under load",
  }),
  drop("drop-cost", Y.cost + H / 2, COL_X + COL_W + 12, 4),
  text("drop-cost-note", DROP_X, Y.cost + H / 2 - 18, hug(NOTE_COST), 36, NOTE_COST, 4, "red"),
  down("cost>short", Y.cost + H, Y.short, `${SHORTLIST} left`, 5),

  // ── Step 5: shortlist, and the loop back when a new model ships ──
  box("short", COL_X, Y.short, COL_W, "Shortlist: a primary and a fallback", "green", 5, {
    sub: "both tested on the same eval set",
  }),
  {
    id: "short>eval",
    type: "arrow",
    x: 0,
    y: 0,
    from: "short",
    to: "eval",
    via: [
      [COL_X - 22, Y.short + H / 2],
      [COL_X - 22, Y.eval + H / 2],
    ],
    dashed: true,
    tone: "neutral",
    step: 5,
    quiet: true,
  },
  text("loop-note", DROP_X, Y.short + 4, hug(NOTE_LOOP), 36, NOTE_LOOP, 5),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From requirements to a model shortlist",
  width: 860,
  height: Y.short + H + 24,
  groups: [
    {
      id: "g-hard",
      title: "Hard constraints: pass or fail",
      tone: "red",
      x: COL_X,
      y: Y.group,
      w: COL_W,
      h: GROUP_H,
    },
  ],
  steps: [
    { title: "Write down the task and the numbers it must meet" },
    { title: "Filter on hard constraints first: they are pass or fail" },
    { title: "Measure quality on your own eval set, not a leaderboard" },
    { title: "Price the survivors at your real volume and measure latency under load" },
    { title: "Keep a primary and a fallback; re-run when a new model ships" },
  ],
  shapes,
};

export default spec;
