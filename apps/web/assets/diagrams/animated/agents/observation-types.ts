import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { OBSERVATION_TOKENS, PORTAL } from "@/components/diagrams/presets/agents-computer";

// Three ways to see the same button (computer-use-and-browser-agents, Core concepts "Screenshots, accessibility trees
// and the DOM"): Swiftline's claim form as a screenshot, as an accessibility tree and as raw DOM, with "Submit claim"
// marked in each, and under each column how the agent then points at it (pixels, a ref, a selector). Facts: the
// accessibility-tree line format follows Playwright MCP snapshots (`- role "name" [ref=eN]`, playwright.dev/mcp/
// snapshots, checked 2026-11-16); the screenshot's token count comes from the Claude docs' formula (presets
// agents-computer SCREEN); the tree and DOM token counts are illustrative (said on the caption).
//
// Three steps, one per column: 1 the screenshot · 2 the accessibility tree · 3 the DOM.
//
// Layout: three columns (x 16 w 240, x 280 w 300, x 604 w 260) under headings; the screenshot column draws the form
// as cells inside a dotted group titled with the portal's address; the other two are one cell per line; one "acts by"
// box at the foot of each column.
//
// Colour (agents legend, three tones plus neutral): observations blue (tree and DOM lines, the screenshot frame), the
// button in every column teal (the action's target), form fields and DOM noise neutral, the "acts by" boxes teal.
// The tree's button line is ringed: it names the element the model needs, at a fraction of the tokens.

const fmt = (n: number) => n.toLocaleString("en-GB");
const F = PORTAL.fields;
const ROW = 34;
const TOP = 52;

const C1 = { x: 16, w: 240 };
const C2 = { x: 280, w: 300 };
const C3 = { x: 604, w: 260 };

const heading = (id: string, x: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 12,
  w,
  h: 28,
  label,
  step,
});

const line = (
  id: string,
  col: { x: number; w: number },
  i: number,
  label: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "cell",
  x: col.x,
  y: TOP + i * ROW,
  w: col.w,
  h: 30,
  label,
  tone,
  step,
  quiet: true,
  ...extra,
});

const ref = (f: { role: string; label: string; ref: string }) => `- ${f.role} "${f.label}" [ref=${f.ref}]`;

const TREE: { label: string; button?: boolean }[] = [
  { label: '- heading "New claim" [ref=e3]' },
  { label: ref(F.tracking) },
  { label: ref(F.damage) },
  { label: ref(F.value) },
  { label: ref(F.submit), button: true },
  { label: '- link "Cancel" [ref=e13]' },
];

const DOM: { label: string; button?: boolean }[] = [
  { label: '<div class="hdr-wrap x9">' },
  { label: '<script src="/t.js"></script>' },
  { label: '<form id="clm" data-v="3">' },
  { label: '<input name="trk" class="f1">' },
  { label: '<div role="listbox" …>' },
  { label: '<input name="amt" class="f1">' },
  { label: '<button class="btn js-s">', button: true },
  { label: "Submit claim</button>", button: true },
  { label: '<div id="ad-slot-2"></div>' },
];

const FOOT_Y = TOP + DOM.length * ROW + 18;

const foot = (id: string, col: { x: number; w: number }, label: string, sub: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x: col.x,
  y: FOOT_Y,
  w: col.w,
  h: 52,
  label,
  sub,
  tone: AGENT_TONE.action,
  fill: "pastel",
  step,
});

const field = (id: string, i: number, label: string): LayoutShape => ({
  id,
  type: "cell",
  x: C1.x + 16,
  y: 100 + i * 50,
  w: C1.w - 32,
  h: 34,
  label,
  tone: AGENT_TONE.infra,
  step: 1,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One button, three observations: screenshot, accessibility tree, DOM",
  width: 880,
  height: FOOT_Y + 64,
  steps: [
    { title: "Screenshot: pixels, as a person sees them" },
    { title: "Accessibility tree: roles, names and refs" },
    { title: "DOM: everything the page is made of" },
  ],
  groups: [
    {
      id: "screen",
      title: PORTAL.host,
      tone: AGENT_TONE.result,
      x: C1.x,
      y: TOP,
      w: C1.w,
      h: DOM.length * ROW - 4,
    },
  ],
  shapes: [
    heading("h1", C1.x, C1.w, `Screenshot: ${fmt(OBSERVATION_TOKENS.screenshot)} tokens`, 1),
    field("f-trk", 0, F.tracking.label),
    field("f-dmg", 1, `${F.damage.label} ▾`),
    field("f-val", 2, F.value.label),
    {
      id: "f-sub",
      type: "cell",
      x: C1.x + 96,
      y: 258,
      w: 128,
      h: 34,
      label: F.submit.label,
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 1,
    },
    foot("act1", C1, `click [${F.submit.at[0]}, ${F.submit.at[1]}]`, "by pixels", 1),

    heading("h2", C2.x, C2.w, `Accessibility tree: ~${fmt(OBSERVATION_TOKENS.tree)} tokens`, 2),
    ...TREE.map((t, i) =>
      line(`t${i}`, C2, i, t.label, t.button ? AGENT_TONE.action : AGENT_TONE.result, 2, {
        fill: t.button ? "pastel" : undefined,
        highlight: t.button ? true : undefined,
        quiet: t.button ? undefined : true,
      })
    ),
    foot("act2", C2, `click ${F.submit.ref}`, "by ref: the browser finds it", 2),

    heading("h3", C3.x, C3.w, `DOM: ~${fmt(OBSERVATION_TOKENS.dom)} tokens`, 3),
    ...DOM.map((d, i) =>
      line(`d${i}`, C3, i, d.label, d.button ? AGENT_TONE.action : AGENT_TONE.infra, 3, {
        fill: d.button ? "pastel" : undefined,
      })
    ),
    foot("act3", C3, "click button.js-s", "by selector", 3),
  ],
};

export default spec;
