import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { PORTAL, SCREEN, SUBMIT_REAL } from "@/components/diagrams/presets/agents-computer";

// Grounding: from intent to coordinates (computer-use-and-browser-agents, Core concepts "Grounding: from intent to
// coordinates"). The model's intent ("submit the claim") becomes a point in the 1280 × 800 screenshot, [812, 604];
// the harness divides by the scale 0.5 to click [1624, 1208] on the 2560 × 1600 display (full size would be 5,336
// visual tokens, over the 4,784 limit, so the harness must shrink it). Then the page moves: a cookie banner pushes
// the form down 88 px after the screenshot, and the stale point lands on empty space. Facts: Claude computer use docs
// (coordinate space, scaling, image limits, "acts as if its actions succeeded" without checking), checked
// 2026-11-16; SeeAct (Zheng et al., 2024) for grounding as the main bottleneck (in the page text, not the figure).
//
// Four steps: 1 the intent · 2 the model points at a pixel · 3 the harness scales it to the real screen · 4 the page
// moved: the stale point misses.
//
// Layout: intent top left (its arrow comes in from above, clear of the guides); the screenshot drawn to scale (0.21875 units per pixel) inside a dotted group in the
// middle, with dashed guides from the edges to the button's centre; the action, the harness and the failure stacked on
// the right.
//
// Colour (agents legend, four tones plus neutral): intent green, the screenshot frame blue, the action teal and
// ringed, the harness neutral, the banner and the miss red (the one thing that breaks).

const fmt = (n: number) => n.toLocaleString("en-GB");
const [px, py] = PORTAL.fields.submit.at;

// The screenshot area, to scale: 1280 × 800 pixels → 280 × 175 units.
const OX = 250;
const OY = 78;
const K = 280 / SCREEN.sent.w;
const BX = Math.round((OX + px * K) * 10) / 10;
const BY = Math.round((OY + py * K) * 10) / 10;
const BTN = { w: 104, h: 26 };
const BOTTOM = OY + SCREEN.sent.h * K;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h: 60, label, sub, tone, fill: "pastel", step, ...extra });

const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Grounding: an intent becomes a point on the screen",
  width: 860,
  height: 350,
  steps: [
    { title: "The model knows what it wants" },
    { title: "It points at a pixel in the screenshot" },
    { title: "The harness scales the point to the real screen" },
    { title: "The page moved: the old point misses" },
  ],
  groups: [
    {
      id: "screen",
      title: `Screenshot, ${SCREEN.sent.w} × ${SCREEN.sent.h}`,
      tone: AGENT_TONE.result,
      x: OX - 8,
      y: 50,
      w: 280 + 16,
      h: BOTTOM - 50 + 8,
    },
  ],
  shapes: [
    box("intent", 20, 90, 180, "Submit the claim", "the model's intent", AGENT_TONE.model, 1),
    {
      id: "btn",
      type: "cell",
      x: BX - BTN.w / 2,
      y: BY - BTN.h / 2,
      w: BTN.w,
      h: BTN.h,
      label: PORTAL.fields.submit.label,
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 1,
    },
    { id: "a-intent", type: "arrow", x: 0, y: 0, from: "intent", to: "btn", step: 1 },

    // Step 2: dashed guides from the frame's edges to the button's centre, and the action.
    {
      id: "gx",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [OX, BY],
        [BX - BTN.w / 2, BY],
      ],
      dashed: true,
      step: 2,
    },
    {
      id: "gy",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [BX, BY + BTN.h / 2],
        [BX, BOTTOM],
      ],
      dashed: true,
      step: 2,
    },
    text("ty", OX + 4, BY - 24, 60, `y ${py}`, 2),
    text("tx", BX - 30, BOTTOM + 14, 60, `x ${px}`, 2),
    box("act", 580, 90, 260, `left_click [${px}, ${py}]`, "screenshot pixels", AGENT_TONE.action, 2, {
      highlight: true,
    }),
    { id: "a-act", type: "arrow", x: 0, y: 0, from: "btn", to: "act", step: 2 },

    // Step 3: the harness maps the point back to the real screen.
    box(
      "scale",
      580,
      176,
      260,
      `÷ ${SCREEN.scale} → [${SUBMIT_REAL[0]}, ${SUBMIT_REAL[1]}]`,
      `on the ${SCREEN.real.w} × ${SCREEN.real.h} display`,
      AGENT_TONE.infra,
      3
    ),
    { id: "a-scale", type: "arrow", x: 0, y: 0, from: "act", to: "scale", step: 3 },
    text(
      "full",
      OX - 8,
      BOTTOM + 44,
      296,
      `Full size: ${fmt(SCREEN.realTokens)} tokens > ${fmt(SCREEN.tokenLimit)} limit`,
      3
    ),

    // Step 4: a banner arrives after the screenshot; the stale point misses.
    {
      id: "banner",
      type: "cell",
      x: OX + 4,
      y: OY + 4,
      w: 272,
      h: 24,
      label: `Cookie banner: page down ${PORTAL.bannerShift} px`,
      tone: AGENT_TONE.failure,
      step: 4,
    },
    box(
      "miss",
      580,
      262,
      260,
      `Click lands ${PORTAL.bannerShift} px above`,
      "nothing happens; check before going on",
      AGENT_TONE.failure,
      4
    ),
    { id: "a-miss", type: "arrow", x: 0, y: 0, from: "scale", to: "miss", step: 4 },
  ],
};

export default spec;
