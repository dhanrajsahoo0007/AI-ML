import { arrow, badge, box, core, figure, icon, step, stepOnly, text, type Accent, type IconName } from "./kit";
import type { FigureDef } from "./build";

// Figures for Issue #1, Harness Engineering (content/newsletter/2026/harness-engineering.mdx). Cover palette: dusk,
// so the accent is its violet.

const accent: Accent = {
  name: "harness",
  light: { accent: "#5b3fd1", soft: "#efebff", on: "#ffffff" },
  dark: { accent: "#a896ff", soft: "#2a2350", on: "#15122e" },
};

const TAU = Math.PI * 2;
const at = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos((deg * TAU) / 360),
  cy + r * Math.sin((deg * TAU) / 360),
];

// ── F1: model + harness ──────────────────────────────────────────────────────────────────────────

function modelPlusHarness(): string {
  const cx = 540;
  const cy = 620;
  const R = 330;
  const parts: [string, IconName][] = [
    ["Context", "context"],
    ["Tools", "tools"],
    ["Sandbox", "sandbox"],
    ["Memory", "memory"],
    ["Verification", "verify"],
    ["Guardrails", "guardrails"],
    ["Observability", "observe"],
  ];
  const pos = parts.map((_, k) => at(cx, cy, R, -90 + (k * 360) / parts.length));
  const ring = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="nlf-s-line" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round"/>`;
  const spokes = pos
    .map(([x, y]) => {
      const d = Math.hypot(x - cx, y - cy);
      const [sx, sy] = [cx + ((x - cx) / d) * 130, cy + ((y - cy) / d) * 130];
      const [ex, ey] = [cx + ((x - cx) / d) * (d - 70), cy + ((y - cy) / d) * (d - 70)];
      return `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="nlf-s-line" stroke-width="3"/>`;
    })
    .join("");
  const boxes = parts
    .map(([label, ic], k) => box({ x: pos[k][0], y: pos[k][1], w: 236, h: 118, label, icon: ic }))
    .join("");
  return figure({
    height: 1080,
    title: "Agent = model + harness",
    subtitle: "The model proposes. The seven parts around it decide what happens.",
    accent,
    body: ring + spokes + core(cx, cy, 104, "Model") + boxes,
  });
}

// ── F2: the agent loop (build-up, 5 steps) ───────────────────────────────────────────────────────

function agentLoop(): string {
  const cx = 540;
  const cy = 590;
  const R = 300;
  const nodes: { label: string; icon: IconName; tone: "ink" | "accent" | "ok"; solid?: boolean; caption: string }[] = [
    {
      label: "Gather context",
      icon: "context",
      tone: "ink",
      caption: "Gather: the harness assembles what the model sees: the task, the right files, earlier results.",
    },
    {
      label: "Model proposes",
      icon: "model",
      tone: "accent",
      solid: true,
      caption: "Propose: the model suggests the next action, such as a tool call or an edit. Nothing has run yet.",
    },
    {
      label: "Harness checks",
      icon: "verify",
      tone: "ok",
      caption: "Check: the harness tests the proposal against schemas, permissions and rules before anything runs.",
    },
    {
      label: "Act in a sandbox",
      icon: "sandbox",
      tone: "ink",
      caption: "Act: the approved action runs in a sandbox, where a mistake can't hurt real systems.",
    },
    {
      label: "Observe result",
      icon: "observe",
      tone: "ink",
      caption: "Observe: output, errors and test results flow back in, and the loop repeats until the task is done.",
    },
  ];
  // A loop a little wider than tall, so the two bottom boxes have room between them.
  const pos = nodes.map((_, k) => {
    const [x, y] = at(0, 0, 1, -90 + k * 72);
    return [cx + x * (R + 36), cy + y * R] as [number, number];
  });
  const BW = 262;
  const BH = 124;
  const layers = nodes.map((n, k) => {
    const [x, y] = pos[k];
    const prev = pos[(k + nodes.length - 1) % nodes.length];
    const sizes = { fromBox: { w: BW, h: BH }, toBox: { w: BW, h: BH } };
    // Level neighbours (the bottom pair) get a straight arrow; the rest follow the loop's curve.
    const bend = Math.abs(prev[1] - y) < 40 ? 0 : -46;
    const link = k > 0 ? arrow(prev[0], prev[1], x, y, { tone: "muted", bend, ...sizes }) : "";
    const close =
      k === nodes.length - 1
        ? arrow(x, y, pos[0][0], pos[0][1], { tone: "accent", bend: -46, dashed: true, ...sizes }) +
          icon("loop", cx - 34, cy - 58, 68, "accent") +
          text(cx, cy + 40, "repeat", { size: 28, weight: 600, tone: "accent" })
        : "";
    return step(
      k + 1,
      link,
      close,
      box({ x, y, w: BW, h: BH, label: n.label, icon: n.icon, tone: n.tone, solid: n.solid, size: 28 }),
      badge(x - BW / 2 + 6, y - BH / 2 + 6, k + 1)
    );
  });
  const captions = nodes.map((n, k) =>
    stepOnly(k + 1, text(540, 1068, n.caption, { size: 30, weight: 500, tone: "ink", wrapAt: 56, lineHeight: 1.35 }))
  );
  return figure({
    height: 1180,
    title: "The agent loop",
    subtitle: "Every turn passes through the harness, not just the model.",
    accent,
    body:
      `<line x1="64" y1="990" x2="1016" y2="990" class="nlf-s-line" stroke-width="2"/>` +
      layers.join("") +
      captions.join(""),
  });
}

export const figures: FigureDef[] = [
  {
    slug: "model-plus-harness",
    svg: modelPlusHarness,
    meta: {
      title: "Agent = model + harness",
      alt: "A glowing core labelled Model sits inside a dashed ring of seven boxes: Context, Tools, Sandbox, Memory, Verification, Guardrails and Observability, each linked to the core.",
      caption:
        "The model is one part of an agent; the seven parts of the harness around it decide what it sees, does and keeps.",
      slide:
        "An agent is a model plus a harness. The harness decides what the model sees, what it can do, and whether its work is accepted.",
    },
  },
  {
    slug: "agent-loop",
    svg: agentLoop,
    meta: {
      title: "The agent loop",
      alt: "Five boxes in a circle connected by arrows: Gather context, Model proposes, Harness checks, Act in a sandbox, Observe result, and a dashed arrow back to the start labelled repeat.",
      caption: "Each turn goes gather, propose, check, act, observe; the model only does the second step.",
      slide: "Every turn of an agent goes through five steps. The model does exactly one of them.",
    },
  },
];
