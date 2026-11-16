import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { FATIGUE } from "@/components/diagrams/presets/agents-hitl";

// Approval fatigue (human-in-the-loop-and-approvals, Technical mechanics "Approval fatigue and risk-based gating"):
// the share of dangerous commands a person catches falls as prompts pile up. Anthropic's Claude Code study (claude.com,
// 7 Aug 2026; FATIGUE in presets/agents-hitl): 1,053 paid testers, one routine prompt per session swapped for a clearly
// dangerous command. People caught about 17 % early in a session and about 5 % after 50 or more prompts; auto mode's
// classifier blocked 89 % overall, flat whatever the session length; users approve 97 % of prompts. The two measured
// points are dots; the curve between them is ours (5 + 12·e^(−(n−2)/16)), labelled illustrative. Step 3 applies
// "Beyond permission prompts" (20 Oct 2025): sandboxing cut prompts by 84 %, so a session of 50 prompts has 8.
//
// Three steps: 1 people's catch rate falls from about 17 % to about 5 % · 2 the classifier stays flat at 89 % · 3 84 %
// fewer prompts moves the 50th prompt back to the 8th.
//
// Layout: plot area x 110–630 (0 to 60 prompts, 8.67 px each), y 40–260 (100 % to 0 %); tick labels left and below;
// curve labels next to their curves; the 97 % note at the top.
//
// Colour (agents legend, two tones plus neutral): people orange (the approver), the classifier lime (a check); the
// marker, axes and text neutral. One highlight: the dot after 50 prompts.

const PLOT = { x: 110, y: 40, w: 520, h: 220 } as const;
const MAX_PROMPTS = 60;
const px = (n: number) => Math.round(PLOT.x + (n / MAX_PROMPTS) * PLOT.w);
const py = (pct: number) => Math.round(PLOT.y + PLOT.h * (1 - pct / 100));

/** People's catch rate: the measured 17 % (early) and about 5 % (after 50), joined by an illustrative curve. */
const human = (n: number) => FATIGUE.latePct + (FATIGUE.earlyPct - FATIGUE.latePct) * Math.exp(-(n - 2) / 16);
const HUMAN: [number, number][] = Array.from({ length: 15 }, (_, i) => {
  const n = 2 + (i * (MAX_PROMPTS - 2)) / 14;
  return [px(n), py(human(n))];
});

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = AGENT_TONE.infra,
  step = 1
): LayoutShape => ({ id, type: "text", x, y, w, h: 20, label, tone, step });

const path = (id: string, points: [number, number][], extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  ...extra,
});

const dot = (id: string, n: number, pct: number, step: number, highlight?: boolean): LayoutShape => ({
  id,
  type: "circle",
  x: px(n),
  y: py(pct),
  w: 10,
  tone: AGENT_TONE.task,
  fill: "pastel",
  step,
  highlight,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Approval fatigue: people catch less as prompts pile up",
  width: 800,
  height: 316,
  steps: [
    { title: `People catch about ${FATIGUE.earlyPct} %, then about ${FATIGUE.latePct} %` },
    { title: `A classifier stays flat at ${FATIGUE.classifierPct} %` },
    { title: `${Math.round(FATIGUE.sandboxCut * 100)} % fewer prompts: the 50th becomes the 8th` },
  ],
  shapes: [
    // Axes and ticks.
    path(
      "y-axis",
      [
        [PLOT.x, PLOT.y + PLOT.h],
        [PLOT.x, PLOT.y - 10],
      ],
      { head: true }
    ),
    path(
      "x-axis",
      [
        [PLOT.x, PLOT.y + PLOT.h],
        [PLOT.x + PLOT.w + 10, PLOT.y + PLOT.h],
      ],
      { head: true }
    ),
    text("y-100", 50, py(100) - 10, 54, "100 %"),
    text("y-50", 50, py(50) - 10, 54, "50 %"),
    text("y-0", 50, py(0) - 10, 54, "0 %"),
    text("y-label", 4, PLOT.y + 70, 52, "caught"),
    text("x-0", px(0) - 20, PLOT.y + PLOT.h + 6, 40, "0"),
    text("x-25", px(25) - 20, PLOT.y + PLOT.h + 6, 40, "25"),
    text("x-50", px(50) - 20, PLOT.y + PLOT.h + 6, 40, "50"),
    text("x-label", PLOT.x, PLOT.y + PLOT.h + 28, PLOT.w, "Permission prompts already seen in the session"),
    text("approve", PLOT.x + 150, 4, 470, `Users approve ${FATIGUE.approvePct} % of prompts (Claude Code, 2026)`),

    // Step 1: people.
    path("human", HUMAN, { smooth: true, tone: AGENT_TONE.task, weight: 0.8 }),
    dot("early", 2, FATIGUE.earlyPct, 1),
    dot("late", FATIGUE.lateAfter, FATIGUE.latePct, 1, true),
    text("early-l", px(9), py(FATIGUE.earlyPct) - 30, 170, `about ${FATIGUE.earlyPct} % early`, AGENT_TONE.task),
    text(
      "late-l",
      px(34),
      py(FATIGUE.latePct) - 34,
      190,
      `about ${FATIGUE.latePct} % after ${FATIGUE.lateAfter}+`,
      AGENT_TONE.task
    ),
    text("people-l", PLOT.x + PLOT.w + 14, py(FATIGUE.latePct) - 12, 150, "people", AGENT_TONE.task),
    text("illus", px(26), py(FATIGUE.earlyPct) - 52, 230, "line between the dots: illustrative"),

    // Step 2: the classifier.
    path(
      "classifier",
      [
        [px(0), py(FATIGUE.classifierPct)],
        [px(MAX_PROMPTS), py(FATIGUE.classifierPct)],
      ],
      { tone: AGENT_TONE.check, weight: 0.8, step: 2 }
    ),
    text(
      "classifier-l",
      PLOT.x + PLOT.w + 14,
      py(FATIGUE.classifierPct) - 10,
      150,
      `classifier ${FATIGUE.classifierPct} %`,
      AGENT_TONE.check,
      2
    ),
    text(
      "classifier-n",
      px(20),
      py(FATIGUE.classifierPct) + 6,
      300,
      "flat, whatever the session length",
      AGENT_TONE.check,
      2
    ),

    // Step 3: fewer prompts.
    path(
      "fewer",
      [
        [px(FATIGUE.promptsAfterSandbox), PLOT.y + 40],
        [px(FATIGUE.promptsAfterSandbox), PLOT.y + PLOT.h],
      ],
      { dashed: true, weight: 0.6, step: 3 }
    ),
    {
      id: "fewer-arrow",
      type: "arrow",
      x: px(FATIGUE.lateAfter),
      y: PLOT.y + 90,
      w: px(FATIGUE.promptsAfterSandbox) - px(FATIGUE.lateAfter) + 6,
      h: 0,
      dashed: true,
      step: 3,
    },
    text(
      "fewer-l",
      px(FATIGUE.promptsAfterSandbox) + 30,
      PLOT.y + 62,
      300,
      `sandbox: ${Math.round(FATIGUE.sandboxCut * 100)} % fewer, 50 → ${FATIGUE.promptsAfterSandbox}`,
      AGENT_TONE.infra,
      3
    ),
  ],
};

export default spec;
