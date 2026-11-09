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

// ── F3: what fills the context window ────────────────────────────────────────────────────────────

function contextBudget(): string {
  const x = 96;
  const w = 300;
  const top = 250;
  const height = 760;
  const parts: { label: string; share: number; tone: "accent" | "ink" | "muted" | "risk" | "ok"; note: string }[] = [
    { label: "Instructions", share: 0.09, tone: "ink", note: "Short and stable: who the agent is, the rules" },
    { label: "Tool definitions", share: 0.1, tone: "ink", note: "Only the tools this task needs" },
    { label: "Task & plan", share: 0.08, tone: "accent", note: "Restated each turn so it isn't lost" },
    { label: "Retrieved files", share: 0.28, tone: "accent", note: "Fetched just in time, not all up front" },
    { label: "History & results", share: 0.33, tone: "risk", note: "Grows every turn: summarise it (compaction)" },
    { label: "Free space", share: 0.12, tone: "ok", note: "Room to think and to answer" },
  ];
  let y = top;
  const out: string[] = [
    `<rect x="${x - 6}" y="${top - 6}" width="${w + 12}" height="${height + 12}" rx="26" fill="none" class="nlf-s-ink" stroke-width="3"/>`,
  ];
  for (const p of parts) {
    const h = p.share * height;
    const fill = p.tone === "ink" ? "nlf-f-surface" : `nlf-f-${p.tone}-soft`;
    out.push(
      `<rect x="${x}" y="${y.toFixed(1)}" width="${w}" height="${(h - 6).toFixed(1)}" rx="16" class="${fill} nlf-s-${p.tone === "ink" ? "line" : p.tone}" stroke-width="2.5"${p.label === "Free space" ? ` stroke-dasharray="6 8"` : ""}/>`,
      text(x + w / 2, y + (h - 6) / 2, p.label, { size: h > 90 ? 30 : 26, weight: 600 }),
      `<line x1="${x + w + 20}" y1="${(y + (h - 6) / 2).toFixed(1)}" x2="${x + w + 56}" y2="${(y + (h - 6) / 2).toFixed(1)}" class="nlf-s-line" stroke-width="3"/>`,
      text(x + w + 76, y + (h - 6) / 2, p.note, { size: 27, weight: 500, anchor: "start", wrapAt: 30, tone: "ink" })
    );
    y += h;
  }
  out.push(text(x + w / 2, top + height + 50, "One context window", { size: 26, weight: 600, tone: "muted" }));
  return figure({
    height: 1120,
    title: "What fills the context window",
    subtitle: "The space is fixed, so the harness decides what goes in.",
    accent,
    body: out.join(""),
  });
}

// ── F4: the verification ladder (build-up, 4 steps) ──────────────────────────────────────────────

function verificationLadder(): string {
  const rungs: { label: string; kind: string; icon: IconName; caption: string }[] = [
    {
      label: "Schema & format",
      kind: "certain · milliseconds",
      icon: "verify",
      caption: "Is the output even well formed? Valid JSON, the right fields, a real file path. Free and instant.",
    },
    {
      label: "Tests, linters, types",
      kind: "certain · seconds",
      icon: "tools",
      caption: "Does the change work? Run the tests and the type checker. Still deterministic, still cheap.",
    },
    {
      label: "A second model reviews",
      kind: "judgment · costs tokens",
      icon: "model",
      caption: "Is it what was asked? A reviewer model checks intent and quality that no test can see.",
    },
    {
      label: "A human approves",
      kind: "judgment · costs attention",
      icon: "human",
      caption: "Risky or irreversible actions wait for a person. Their time is the scarcest check, so it comes last.",
    },
  ];
  const x = 470;
  const BW = 600;
  const BH = 132;
  const top = 300;
  const gap = 176;
  const layers = rungs.map((r, k) => {
    const y = top + k * gap;
    const certain = k < 2;
    return step(
      k + 1,
      k > 0 ? arrow(x, y - gap, x, y, { tone: "muted", fromBox: { w: BW, h: BH }, toBox: { w: BW, h: BH } }) : "",
      `<rect x="${x - BW / 2}" y="${y - BH / 2}" width="${BW}" height="${BH}" rx="22" class="${certain ? "nlf-f-surface" : "nlf-f-accent-soft"} nlf-s-${certain ? "ink" : "accent"}" stroke-width="3"/>`,
      icon(r.icon, x - BW / 2 + 36, y - 28, 56, certain ? "ink" : "accent"),
      text(x - BW / 2 + 120, y - 20, r.label, { size: 32, weight: 700, anchor: "start" }),
      text(x - BW / 2 + 120, y + 26, r.kind, { size: 25, weight: 500, anchor: "start", tone: "muted" }),
      badge(x - BW / 2 + 4, y - BH / 2 + 4, k + 1),
      // A failed check goes back to the model with the error.
      arrow(x + BW / 2, y, 1010, y, { tone: "risk", width: 3, inset: 12 }),
      text(1010, y - 30, "fail", { size: 24, weight: 600, tone: "risk", anchor: "end" })
    );
  });
  const feedback =
    `<line x1="1010" y1="${top}" x2="1010" y2="${top + 3 * gap}" class="nlf-s-risk" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>` +
    text(1040, top + 1.5 * gap, "error goes back to the model", {
      size: 24,
      weight: 600,
      tone: "risk",
      extra: ` transform="rotate(90 1040 ${top + 1.5 * gap})"`,
    });
  const accepted = step(
    4,
    arrow(x, top + 3 * gap, x, top + 3 * gap + 150, { tone: "ok", fromBox: { w: BW, h: BH }, inset: 0 }),
    `<rect x="${x - 120}" y="${top + 3 * gap + 150}" width="240" height="64" rx="32" class="nlf-f-ok"/>`,
    text(x, top + 3 * gap + 182, "accepted", { size: 28, weight: 700, tone: "on-accent" })
  );
  const captions = rungs.map((r, k) =>
    stepOnly(k + 1, text(540, 1296, r.caption, { size: 29, weight: 500, wrapAt: 58, lineHeight: 1.35 }))
  );
  return figure({
    height: 1400,
    title: "Checking the work",
    subtitle: "Cheap, certain checks first. Costly judgment last.",
    accent,
    body:
      step(1, feedback) +
      layers.join("") +
      accepted +
      `<line x1="64" y1="1218" x2="1016" y2="1218" class="nlf-s-line" stroke-width="2"/>` +
      captions.join(""),
  });
}

// ── F5: the two harnesses ────────────────────────────────────────────────────────────────────────

function twoHarnesses(): string {
  const col = (cx: number, title: string, sub: string, items: [string, IconName][], tone: "accent" | "ok") => {
    const top = 330;
    const out = [
      `<rect x="${cx - 220}" y="${top}" width="440" height="560" rx="30" class="nlf-f-${tone}-soft nlf-s-${tone}" stroke-width="3"/>`,
      text(cx, top + 52, title, { size: 32, weight: 700 }),
      text(cx, top + 94, sub, { size: 25, weight: 500, tone: "muted" }),
    ];
    items.forEach(([label, ic], i) => {
      const y = top + 172 + i * 96;
      out.push(
        `<rect x="${cx - 180}" y="${y - 38}" width="360" height="76" rx="18" class="nlf-f-surface nlf-s-line" stroke-width="2.5"/>`,
        icon(ic, cx - 160, y - 20, 40, tone),
        text(cx - 104, y, label, { size: 28, weight: 600, anchor: "start" })
      );
    });
    return out.join("");
  };
  const left = col(
    272,
    "Agent harness",
    "runs the agent",
    [
      ["Context", "context"],
      ["Tools", "tools"],
      ["Sandbox", "sandbox"],
      ["Checks", "verify"],
    ],
    "accent"
  );
  const right = col(
    808,
    "Eval harness",
    "tests the agent",
    [
      ["Test cases", "context"],
      ["Graders", "verify"],
      ["Scores", "observe"],
      ["Release gate", "guardrails"],
    ],
    "ok"
  );
  const flows =
    arrow(300, 290, 780, 290, { tone: "ink", bend: 40, width: 4 }) +
    text(540, 236, "traces of real runs become test cases", { size: 27, weight: 600 }) +
    arrow(780, 930, 300, 930, { tone: "ink", bend: 40, width: 4 }) +
    text(540, 990, "only changes that keep the scores ship", { size: 27, weight: 600 });
  return figure({
    height: 1060,
    title: "Two harnesses, one system",
    subtitle: "One runs the agent. The other proves it still works.",
    accent,
    body: left + right + flows,
  });
}

// ── F6: a coding agent fixes a failing test ──────────────────────────────────────────────────────

function codingAgentTrace(): string {
  const rows: { part: string; tone: "accent" | "ink" | "risk" | "ok"; text: string }[] = [
    { part: "Context", tone: "ink", text: "Reads the bug report, the failing test and the two files it touches." },
    { part: "Model", tone: "accent", text: "Proposes a one-line fix in parser.ts." },
    { part: "Guardrails", tone: "ink", text: "The edit stays inside the repo and needs no network: allowed." },
    { part: "Sandbox", tone: "ink", text: "Applies the edit and runs the tests in a throwaway container." },
    { part: "Observe", tone: "risk", text: "One test still fails: empty input crashes the parser." },
    {
      part: "Model + checks",
      tone: "ok",
      text: "Handles empty input. Tests, lint and types pass. A human reviews the PR.",
    },
  ];
  const top = 270;
  const gap = 170;
  const lineX = 124;
  const out = [
    `<line x1="${lineX}" y1="${top}" x2="${lineX}" y2="${top + (rows.length - 1) * gap}" class="nlf-s-line" stroke-width="4"/>`,
  ];
  rows.forEach((r, i) => {
    const y = top + i * gap;
    out.push(
      badge(lineX, y, i + 1, r.tone === "ink" ? "accent" : r.tone),
      box({ x: 320, y, w: 260, h: 64, label: r.part, tone: r.tone, size: 26 }),
      text(482, y, r.text, { size: 28, weight: 500, anchor: "start", wrapAt: 30 })
    );
  });
  return figure({
    height: 1240,
    title: "A coding agent fixes a bug",
    subtitle: "One task, traced through the harness.",
    accent,
    body: out.join(""),
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
  {
    slug: "context-budget",
    svg: contextBudget,
    meta: {
      title: "What fills the context window",
      alt: "A tall bar split into six parts: instructions, tool definitions, task and plan, retrieved files, history and results, and free space, each with a note on how the harness manages it.",
      caption:
        "The window is a fixed budget; the harness keeps the high-signal parts and compacts the history before it crowds out the rest.",
      slide: "The context window is a fixed budget. The harness decides what earns a place in it.",
    },
  },
  {
    slug: "verification-ladder",
    svg: verificationLadder,
    meta: {
      title: "Checking the work",
      alt: "Four checks stacked top to bottom: schema and format, tests linters and types, a second model reviews, a human approves. Each can fail back to the model; passing all four leads to accepted.",
      caption:
        "Run cheap, certain checks first and save costly judgment, from a model or a person, for what they can't catch.",
      slide: "Check an agent's work like a ladder: cheap and certain first, costly judgment last.",
    },
  },
  {
    slug: "two-harnesses",
    svg: twoHarnesses,
    meta: {
      title: "Two harnesses, one system",
      alt: "Two panels side by side. The agent harness holds context, tools, sandbox and checks. The eval harness holds test cases, graders, scores and a release gate. Traces flow from the first to the second; only changes that keep the scores flow back.",
      caption: "Real runs feed the eval harness, and the eval harness decides which harness changes ship.",
      slide: "The agent harness runs the agent. The eval harness proves each change didn't break it.",
    },
  },
  {
    slug: "coding-agent-trace",
    svg: codingAgentTrace,
    meta: {
      title: "A coding agent fixes a bug",
      alt: "A six-step timeline: context is gathered, the model proposes a fix, guardrails allow it, the sandbox runs the tests, one test still fails, and the model fixes the edge case before a human reviews the pull request.",
      caption:
        "The model made two decisions; the harness did everything else, including catching the first fix's mistake.",
      slide: "In one real fix, the model made two decisions. The harness did the rest.",
    },
  },
];
