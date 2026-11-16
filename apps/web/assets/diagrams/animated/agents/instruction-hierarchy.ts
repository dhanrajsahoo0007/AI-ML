import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { HIERARCHY, HIERARCHY_CASES } from "@/components/diagrams/presets/agents-sysprompt";

// The instruction hierarchy on system-prompt-design (Core concepts, "Instruction hierarchy: system, developer and
// user"): four sources of text in the Brightpost support agent's context, ranked by authority, and what the model
// should do with an instruction from each. A user instruction that fits the system prompt is followed; one that
// conflicts with it is declined; the forum note inside a tool result (BRIGHTPOST.injectedOrder) has no authority and
// is treated as data. Order as in OpenAI's Model Spec (2026-10-29) and Wallace et al. (arXiv 2404.13208); Claude's
// docs say system instructions take precedence over user messages.
//
// Four steps: 1 the four sources and the operator's rule · 2 an aligned user instruction, followed · 3 a conflicting
// user instruction, declined · 4 an instruction inside a tool result, treated as data.
//
// Layout: three columns. Sources x 20, 220 wide (the user box spans two rows); instructions x 280, 340 wide; verdicts
// x 660, 160 wide. Rows 72 apart from y 48, 56 high. A note on the order's sources under the last row.
//
// Colour (agents legend, three tones plus neutral, red where something breaks): provider, system prompt and verdicts
// neutral; the user orange; tool results blue; the injected note red, with the one highlight.

const H = 56;
const PITCH = 72;
const Y0 = 48;
const ROWS = [0, 1, 2, 3, 4].map((r) => Y0 + r * PITCH);
const SRC = { x: 20, w: 220 } as const;
const INS = { x: 280, w: 340 } as const;
const VER = { x: 660, w: 160 } as const;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  fill: "paper" | "pastel",
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill, step, ...extra });

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step = 1): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

// One instruction and what the model should do with it.
const verdict = (key: string, row: number, label: string, sub: string, step: number): LayoutShape[] => [
  box(`v-${key}`, VER.x, ROWS[row], VER.w, H, label, sub, AGENT_TONE.infra, "paper", step),
  arrow(`a-${key}`, `i-${key}`, `v-${key}`, step),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The instruction hierarchy: which text wins when instructions conflict",
  width: 840,
  height: ROWS[4] + H + 60,
  steps: [
    { title: "Four sources of text, most authority at the top" },
    { title: "A user instruction that fits the rules is followed" },
    { title: "One that conflicts with the system prompt is declined" },
    { title: "Text inside a tool result has no authority" },
  ],
  shapes: [
    text("h-src", SRC.x, 14, SRC.w, 22, "Source (most authority first)"),
    text("h-ins", INS.x, 14, INS.w, 22, "An instruction it brings"),
    text("h-ver", VER.x, 14, VER.w, 22, "What the model does"),

    // Step 1: the four sources, and the operator's own rule.
    box(
      "s-provider",
      SRC.x,
      ROWS[0],
      SRC.w,
      H,
      HIERARCHY.provider.label,
      HIERARCHY.provider.sub,
      "neutral",
      "paper",
      1
    ),
    box("s-system", SRC.x, ROWS[1], SRC.w, H, HIERARCHY.system.label, HIERARCHY.system.sub, "neutral", "pastel", 1),
    box(
      "s-user",
      SRC.x,
      ROWS[2],
      SRC.w,
      H + PITCH,
      HIERARCHY.user.label,
      HIERARCHY.user.sub,
      AGENT_TONE.task,
      "pastel",
      1
    ),
    box("s-tool", SRC.x, ROWS[4], SRC.w, H, HIERARCHY.tool.label, HIERARCHY.tool.sub, AGENT_TONE.result, "pastel", 1),
    text("i-provider", INS.x, ROWS[0], INS.w, H, HIERARCHY_CASES.provider, 1),
    box("i-system", INS.x, ROWS[1], INS.w, H, HIERARCHY_CASES.system, undefined, "neutral", "pastel", 1),
    ...verdict("system", 1, "Binding", "the operator's rule", 1),

    // Step 2: aligned with the system prompt.
    box("i-aligned", INS.x, ROWS[2], INS.w, H, HIERARCHY_CASES.aligned, undefined, AGENT_TONE.task, "pastel", 2),
    ...verdict("aligned", 2, "Followed", "fits the rules", 2),

    // Step 3: conflicts with the system prompt.
    box("i-misaligned", INS.x, ROWS[3], INS.w, H, HIERARCHY_CASES.misaligned, undefined, AGENT_TONE.task, "pastel", 3),
    ...verdict("misaligned", 3, "Declined", "the system rule wins", 3),

    // Step 4: the forum note inside a search_help result.
    box("i-injected", INS.x, ROWS[4], INS.w, H, HIERARCHY_CASES.injected, undefined, AGENT_TONE.failure, "pastel", 4, {
      highlight: true,
    }),
    ...verdict("injected", 4, "Treated as data", "code still checks", 4),

    text(
      "note",
      SRC.x,
      ROWS[4] + H + 14,
      800,
      36,
      "Order as in OpenAI's Model Spec and Wallace et al. (2024). Training makes the model follow it most of the time,\n" +
        "not always: the owner check in code still refuses a refund on a stranger's order.",
      4
    ),
  ],
};

export default spec;
