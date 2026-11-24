import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { AGENT, APPLY, MID_DECODE_MS } from "@/components/diagrams/presets/gcase-code";

// Applying an edit fast and exactly (code-assistant, design sheet §10.7, §12 "Edits", Step 6; preset APPLY and AGENT in
// presets/gcase-code.ts; the speculative speed is Cursor's 2024 vendor figure for a 70B model, dossier F19, held as
// our design point at a batch of 8 or less):
//   Speculative edits: the rewritten region is mostly the original, so the apply model drafts the next 16 tokens
//   (APPLY.draftLength) from the original and verifies them in one step; only at the edit does it write its own
//   tokens. APPLY.speculative = 1,000 tokens/s against ≈ 77 vanilla (13×). A 40-line region is 40 × 10 = 400 tokens:
//   0.4 s. Rewriting a 2,000-line file: 20 s speculative, 260 s vanilla (APPLY.rewrite2000).
//   End to end, from the agent's edit step to the diff (one step = 400 ms first token + (visible + 800 thinking) ×
//   12.5 ms, MID_DECODE_MS: the hosted mid-size model at 80 tokens a second, section review N1):
//     search-and-replace: 400 + (60 + 800) × 12.5 + 10 ms harness = APPLY.searchReplaceS ≈ 11.2 s;
//     sketch + region apply: 400 + (150 + 800) × 12.5 = 12.28 s, + 50 network + 10 prefill + 30 first token + 400
//       tokens at 1,000/s = 0.49 s → APPLY.sketchApplyS ≈ 12.8 s;
//     the agent model rewriting a 400-line file: 400 + (4,000 + 800) × 12.5 = APPLY.wholeFile400S ≈ 60.4 s;
//     a 2,000-line file: APPLY.wholeFile2000S ≈ 260.4 s.
// Steps: 1 one region, mostly copied · 2 four ways to land the same edit, end to end.
// Layout (880 wide): 40 line cells across 800 px (lines 18–20 edited), labels under them; then four bars on one
// seconds scale (x 250 = 0 s, 2 px a second), each split into the agent model's step (green) and the apply model's
// rewrite (teal), the time printed after the bar.
// Colours: copied lines neutral; edited lines orange (the change); agent model green; apply model teal (compute).

const X = 20;
const LINES = 40;
const EDITED = [17, 18, 19]; // lines 18–20
const LINE_W = 19;
const LINE_GAP = 1;
const LINE_Y = 44;
const LINE_H = 28;
const regionTokens = LINES * APPLY.tokensPerLine; // 400

const s1 = (v: number) => v.toFixed(1);
const textW = (label: string) => Math.ceil(label.length * 6) + 6;
const text = (id: string, x: number, y: number, label: string, step: number, quiet = true): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: textW(label),
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

const lineX = (i: number) => X + 20 + i * (LINE_W + LINE_GAP);
const lines: LayoutShape[] = Array.from({ length: LINES }, (_, i) => {
  const edited = EDITED.includes(i);
  return {
    id: `l${i}`,
    type: "cell",
    x: lineX(i),
    y: LINE_Y,
    w: LINE_W,
    h: LINE_H,
    tone: edited ? GENAI_TONE.user : PROD_TONE.infra,
    fill: edited ? "pastel" : "soft",
    step: 1,
    quiet: i !== EDITED[1],
  };
});

/** A bracket under lines [from, to] with a label below it. */
const under = (id: string, from: number, to: number, label: string, tone: LayoutTone): LayoutShape[] => {
  const x1 = lineX(from) + 1;
  const x2 = lineX(to) + LINE_W - 1;
  const y = LINE_Y + LINE_H + 6;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, y],
        [x1, y + 6],
        [x2, y + 6],
        [x2, y],
      ],
      tone,
      step: 1,
    },
    {
      id: `${id}-t`,
      type: "text",
      x: Math.round((x1 + x2) / 2 - textW(label) / 2),
      y: y + 10,
      w: textW(label),
      h: 18,
      label,
      tone,
      step: 1,
      quiet: true,
    },
  ];
};

const step1: LayoutShape[] = [
  text(
    "h1",
    X,
    6,
    `The enclosing ${LINES}-line region (${n(regionTokens)} tokens), rewritten by the apply model: most of it is the original`,
    1,
    false
  ),
  ...lines,
  ...under(
    "copied-a",
    0,
    EDITED[0] - 1,
    `Drafted from the original, ${APPLY.draftLength} tokens a step`,
    PROD_TONE.infra
  ),
  ...under("edited", EDITED[0], EDITED[EDITED.length - 1], "Written", GENAI_TONE.user),
  ...under("copied-b", EDITED[EDITED.length - 1] + 1, LINES - 1, "Drafted, verified", PROD_TONE.infra),
  text(
    "speed",
    X,
    LINE_Y + LINE_H + 46,
    `${n(APPLY.speculative)} tokens/s with speculative edits, ≈ ${Math.round(APPLY.vanilla)} without (13×, vendor, 2024): this region in ${s1(regionTokens / APPLY.speculative)} s; a 2,000-line file in ${APPLY.rewrite2000.speculative} s, not ${APPLY.rewrite2000.vanilla}`,
    1
  ),
];

// ── Step 2: four ways to land the same edit ───────────────────────────────────────────────────────────────────────
const H2_Y = LINE_Y + LINE_H + 86;
const BAR_X = 250;
const PX_PER_S = 2;
const ROW_Y0 = H2_Y + 34;
const ROW_PITCH = 34;
const BAR_H = 20;
const stepS = (visible: number) => (LATENCY.firstTokenMs + (visible + AGENT.thinkingOf.edit) * MID_DECODE_MS) / 1_000;

const rows = [
  { id: "sr", label: "Exact search-and-replace", agent: APPLY.searchReplaceS, apply: 0, total: APPLY.searchReplaceS },
  {
    id: "sk",
    label: "Sketch + region fast apply",
    agent: stepS(150),
    apply: APPLY.sketchApplyS - stepS(150),
    total: APPLY.sketchApplyS,
  },
  {
    id: "w4",
    label: "Agent rewrites a 400-line file",
    agent: APPLY.wholeFile400S,
    apply: 0,
    total: APPLY.wholeFile400S,
  },
  {
    id: "w2",
    label: "Agent rewrites a 2,000-line file",
    agent: APPLY.wholeFile2000S,
    apply: 0,
    total: APPLY.wholeFile2000S,
  },
];

const bars: LayoutShape[] = rows.flatMap((r, i): LayoutShape[] => {
  const y = ROW_Y0 + i * ROW_PITCH;
  const agentW = Math.max(3, Math.round(r.agent * PX_PER_S));
  const applyW = r.apply > 0 ? Math.max(3, Math.round(r.apply * PX_PER_S)) : 0;
  const out: LayoutShape[] = [
    {
      id: `${r.id}-label`,
      type: "text",
      x: BAR_X - 10 - textW(r.label),
      y: y + 1,
      w: textW(r.label),
      h: 18,
      label: r.label,
      tone: PROD_TONE.infra,
      step: 2,
      quiet: true,
    },
    {
      id: `${r.id}-agent`,
      type: "cell",
      x: BAR_X,
      y,
      w: agentW,
      h: BAR_H,
      tone: GENAI_TONE.model,
      fill: "pastel",
      step: 2,
      quiet: true,
    },
  ];
  if (applyW > 0)
    out.push({
      id: `${r.id}-apply`,
      type: "cell",
      x: BAR_X + agentW,
      y,
      w: applyW,
      h: BAR_H,
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 2,
      quiet: true,
    });
  out.push(text(`${r.id}-t`, BAR_X + agentW + applyW + 8, y + 1, `${s1(r.total)} s`, 2));
  return out;
});

const AXIS_Y = ROW_Y0 + rows.length * ROW_PITCH;
const step2: LayoutShape[] = [
  text("h2", X, H2_Y, "The same edit, end to end from the agent's step to the diff on screen", 2, false),
  ...bars,
  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [BAR_X, AXIS_Y - 6],
      [BAR_X + 250 * PX_PER_S, AXIS_Y - 6],
    ],
    tone: PROD_TONE.infra,
    step: 2,
  },
  ...[0, 50, 100, 150, 200, 250].map((s) => ({
    ...text(`tick-${s}`, BAR_X + s * PX_PER_S - 14, AXIS_Y, `${s} s`, 2),
    w: 28,
  })),
  {
    id: "key-agent",
    type: "cell",
    x: X,
    y: AXIS_Y + 28,
    w: 14,
    h: 12,
    tone: GENAI_TONE.model,
    fill: "pastel",
    step: 2,
    quiet: true,
  },
  text("key-agent-t", X + 18, AXIS_Y + 25, "agent model's step (thinking 800 + the tokens it writes)", 2),
  {
    id: "key-apply",
    type: "cell",
    x: X + 400,
    y: AXIS_Y + 28,
    w: 14,
    h: 12,
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 2,
    quiet: true,
  },
  text("key-apply-t", X + 418, AXIS_Y + 25, "apply model: 400 tokens at 1,000/s + 90 ms", 2),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Applying an edit: ${s1(APPLY.searchReplaceS)} s exact, ${s1(APPLY.sketchApplyS)} s with a region apply, ${Math.round(APPLY.wholeFile2000S)} s to rewrite a 2,000-line file`,
  width: 880,
  height: AXIS_Y + 52,
  steps: [
    { title: `Speculative edits: the region is drafted from the original, ${n(APPLY.speculative)} tokens/s` },
    {
      title: `End to end: ${s1(APPLY.searchReplaceS)} s exact, ${s1(APPLY.sketchApplyS)} s sketch + apply, ${s1(APPLY.wholeFile400S)} and ${Math.round(APPLY.wholeFile2000S)} s whole files`,
    },
  ],
  shapes: [...step1, ...step2],
};

export default spec;
