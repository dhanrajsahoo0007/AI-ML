import {
  arrow,
  badge,
  captionBand,
  card,
  core,
  figure,
  panel,
  pill,
  step,
  stepOnly,
  text,
  tile,
  W,
  type Accent,
  type Hue,
  type IconName,
} from "./kit";
import type { FigureDef } from "./build";

// Figures for Issue #1, Harness Engineering (content/newsletter/2026/harness-engineering.mdx). Cover palette: dusk,
// so the accent is its violet. One colour per harness part, used the same way in every figure:
// context blue, tools amber, sandbox teal, memory violet, verification green, guardrails coral, observability pink.

const accent: Accent = {
  name: "harness",
  light: { accent: "#5b3fd1", soft: "#efebff" },
  dark: { accent: "#a896ff", soft: "#2a2350" },
};

const PART = {
  context: { label: "Context", hue: "blue", icon: "context", sub: "what it sees" },
  tools: { label: "Tools", hue: "amber", icon: "tools", sub: "what it can do" },
  sandbox: { label: "Sandbox", hue: "teal", icon: "sandbox", sub: "where it acts" },
  memory: { label: "Memory", hue: "violet", icon: "memory", sub: "what it keeps" },
  verification: { label: "Verification", hue: "ok", icon: "verify", sub: "is it right?" },
  guardrails: { label: "Guardrails", hue: "risk", icon: "guardrails", sub: "what it can't do" },
  observability: { label: "Observability", hue: "pink", icon: "observe", sub: "what it did" },
} satisfies Record<string, { label: string; hue: Hue; icon: IconName; sub: string }>;

const rad = (deg: number) => (deg * Math.PI) / 180;

// ── F1: model + harness ──────────────────────────────────────────────────────────────────────────

function modelPlusHarness(): string {
  const cx = 540;
  const cy = 650;
  const R = 356;
  const parts = Object.values(PART);
  const pos = parts.map((_, k) => {
    const a = rad(-90 + (k * 360) / parts.length);
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const;
  });
  const ring = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="nlf-s-line" stroke-width="3" stroke-dasharray="1 12" stroke-linecap="round"/>`;
  const spokes = pos
    .map(([x, y], k) => {
      const d = Math.hypot(x - cx, y - cy);
      const [ux, uy] = [(x - cx) / d, (y - cy) / d];
      return `<line x1="${(cx + ux * 140).toFixed(1)}" y1="${(cy + uy * 140).toFixed(1)}" x2="${(cx + ux * (d - 92)).toFixed(1)}" y2="${(cy + uy * (d - 92)).toFixed(1)}" class="nlf-s-${parts[k].hue}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`;
    })
    .join("");
  const cards = parts
    .map((p, k) =>
      card({
        x: pos[k][0],
        y: pos[k][1],
        w: 236,
        h: 176,
        label: p.label,
        sub: p.sub,
        hue: p.hue,
        icon: p.icon,
        size: 28,
      })
    )
    .join("");
  return figure({
    height: 1150,
    title: "Agent = model + harness",
    subtitle: "The model proposes. Seven parts around it decide what happens.",
    accent,
    glows: [[cx, cy, 300, "accent"]],
    body: ring + spokes + core(cx, cy, 104, "Model") + cards,
  });
}

// ── F2: the agent loop (build-up, 5 steps) ───────────────────────────────────────────────────────

function agentLoop(): string {
  const H = 1330;
  const cx = 540;
  const cy = 620;
  const rx = 338;
  const ry = 290;
  const nodes: { label: string; by: string; hue: Hue; icon: IconName; caption: string }[] = [
    {
      label: "Gather context",
      by: "harness",
      hue: "blue",
      icon: "context",
      caption:
        "Gather: the harness picks what the model sees on this turn: the task, the right files, earlier results.",
    },
    {
      label: "Propose",
      by: "model",
      hue: "accent",
      icon: "spark",
      caption: "Propose: the model suggests the next action, such as a tool call or an edit. Nothing has run yet.",
    },
    {
      label: "Check",
      by: "harness",
      hue: "ok",
      icon: "verify",
      caption: "Check: the harness tests the proposal against schemas, permissions and rules before anything runs.",
    },
    {
      label: "Act in a sandbox",
      by: "harness",
      hue: "teal",
      icon: "sandbox",
      caption: "Act: the approved action runs in a sandbox, where a mistake can't hurt real systems.",
    },
    {
      label: "Observe",
      by: "harness",
      hue: "pink",
      icon: "observe",
      caption: "Observe: output, errors and test results flow back in, and the loop repeats until the task is done.",
    },
  ];
  const pos = nodes.map((_, k) => {
    const a = rad(-90 + k * 72);
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  });
  const BW = 262;
  const BH = 172;
  const box = { w: BW, h: BH };
  const layers = nodes.map((n, k) => {
    const [x, y] = pos[k];
    const prev = pos[(k + nodes.length - 1) % nodes.length];
    const bend = Math.abs(prev[1] - y) < 40 ? 0 : -54;
    const link = k > 0 ? arrow(prev[0], prev[1], x, y, { tone: n.hue, bend, fromBox: box, toBox: box, width: 5 }) : "";
    const close =
      k === nodes.length - 1
        ? arrow(x, y, pos[0][0], pos[0][1], { tone: "accent", bend: -54, dashed: true, fromBox: box, toBox: box }) +
          `<circle cx="${cx}" cy="${cy}" r="92" class="nlf-f-accent-soft"/>` +
          tile("loop", cx, cy - 18, 38, "accent") +
          text(cx, cy + 50, "repeat", { size: 27, weight: 800, tone: "accent" })
        : "";
    return step(
      k + 1,
      link,
      close,
      card({ x, y, w: BW, h: BH, label: n.label, sub: `by the ${n.by}`, hue: n.hue, icon: n.icon, size: 27 }),
      badge(x - BW / 2 + 8, y - BH / 2 + 8, k + 1, n.hue)
    );
  });
  const captions = nodes.map((n, k) => stepOnly(k + 1, captionBand(H, n.caption)));
  return figure({
    height: H,
    title: "The agent loop",
    subtitle: "Every turn passes through the harness, not just the model.",
    accent,
    glows: [[cx, cy, 250, "accent"]],
    captionBand: true,
    body: layers.join("") + captions.join(""),
  });
}

// ── F3: what fills the context window ────────────────────────────────────────────────────────────

function contextBudget(): string {
  const x = 96;
  const w = 290;
  const top = 236;
  const height = 820;
  const parts: { label: string; share: number; hue: Hue; icon: IconName; note: string }[] = [
    { label: "Instructions", share: 0.1, hue: "violet", icon: "rules", note: "Short and stable: the role, the rules" },
    { label: "Tool definitions", share: 0.1, hue: "amber", icon: "tools", note: "Only the tools this task needs" },
    { label: "Task & plan", share: 0.09, hue: "accent", icon: "spark", note: "Restated each turn so it isn't lost" },
    {
      label: "Retrieved files",
      share: 0.27,
      hue: "blue",
      icon: "context",
      note: "Fetched just in time, not all up front",
    },
    {
      label: "History & results",
      share: 0.31,
      hue: "risk",
      icon: "loop",
      note: "Grows every turn, so summarise it (compaction)",
    },
    { label: "Free space", share: 0.13, hue: "ok", icon: "chart", note: "Room to think and to answer" },
  ];
  let y = top;
  const out: string[] = [
    `<rect x="${x - 10}" y="${top - 10}" width="${w + 20}" height="${height + 20}" rx="32" class="nlf-f-surface" filter="url(#nlf-shadow)"/>`,
  ];
  for (const p of parts) {
    const h = p.share * height;
    const mid = y + (h - 8) / 2;
    out.push(
      `<rect x="${x}" y="${y.toFixed(1)}" width="${w}" height="${(h - 8).toFixed(1)}" rx="20" class="nlf-f-${p.hue}-soft"/>`,
      `<rect x="${x}" y="${y.toFixed(1)}" width="10" height="${(h - 8).toFixed(1)}" rx="5" class="nlf-f-${p.hue}"/>`,
      text(x + w / 2 + 6, mid, p.label, { size: h > 100 ? 29 : 26, weight: 700 }),
      `<line x1="${x + w + 22}" y1="${mid.toFixed(1)}" x2="${x + w + 70}" y2="${mid.toFixed(1)}" class="nlf-s-${p.hue}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`,
      tile(p.icon, x + w + 100, mid, 26, p.hue),
      text(x + w + 142, mid, p.note, { size: 26, weight: 500, anchor: "start", wrapAt: 30 })
    );
    y += h;
  }
  out.push(text(x + w / 2, top + height + 54, "one context window", { size: 26, weight: 700, tone: "muted" }));
  return figure({
    height: 1160,
    title: "What fills the context window",
    subtitle: "The space is fixed, so the harness decides what goes in.",
    accent,
    body: out.join(""),
  });
}

// ── F4: the verification ladder (build-up, 4 steps) ──────────────────────────────────────────────

function verificationLadder(): string {
  const H = 1500;
  const rungs: { label: string; sub: string; hue: Hue; icon: IconName; caption: string }[] = [
    {
      label: "Schema & format",
      sub: "certain · instant · free",
      hue: "teal",
      icon: "code",
      caption: "Is the output even well formed? Valid JSON, the right fields, a real file path. Free and instant.",
    },
    {
      label: "Tests, linters, types",
      sub: "certain · seconds · cheap",
      hue: "blue",
      icon: "test",
      caption: "Does the change work? Run the tests and the type checker. Still certain, still cheap.",
    },
    {
      label: "A reviewer model",
      sub: "judgment · costs tokens",
      hue: "accent",
      icon: "spark",
      caption: "Is it what was asked? A second model checks intent and quality that no test can see.",
    },
    {
      label: "A human approves",
      sub: "judgment · costs attention",
      hue: "amber",
      icon: "human",
      caption: "Risky or irreversible actions wait for a person. Their time is the scarcest check, so it comes last.",
    },
  ];
  const x = 500;
  const BW = 600;
  const BH = 140;
  const top = 320;
  const gap = 192;
  const box = { w: BW, h: BH };
  const meter =
    arrow(118, top - 40, 118, top + 3 * gap + 40, { tone: "muted", width: 4 }) +
    text(84, top + 1.5 * gap, "cheap and certain  →  costly judgment", {
      size: 24,
      weight: 700,
      tone: "muted",
      extra: ` transform="rotate(90 84 ${top + 1.5 * gap})"`,
    });
  const layers = rungs.map((r, k) => {
    const y = top + k * gap;
    return step(
      k + 1,
      k > 0 ? arrow(x, y - gap, x, y, { tone: "muted", fromBox: box, toBox: box }) : "",
      card({ x, y, w: BW, h: BH, label: r.label, sub: r.sub, hue: r.hue, icon: r.icon, layout: "row", size: 30 }),
      badge(x - BW / 2 + 8, y - BH / 2 + 8, k + 1, r.hue),
      arrow(x + BW / 2, y, 960, y, { tone: "risk", width: 4, inset: 14 }),
      text(905, y - 28, "fail", { size: 24, weight: 800, tone: "risk", anchor: "end" })
    );
  });
  const feedback =
    `<line x1="980" y1="${top}" x2="980" y2="${top + 3 * gap}" class="nlf-s-risk" stroke-width="4" stroke-dasharray="1 12" stroke-linecap="round"/>` +
    text(1010, top + 1.5 * gap, "the error goes back to the model", {
      size: 24,
      weight: 700,
      tone: "risk",
      extra: ` transform="rotate(90 1010 ${top + 1.5 * gap})"`,
    });
  const accepted = step(
    4,
    arrow(x, top + 3 * gap, x, top + 3 * gap + 150, { tone: "ok", fromBox: box }),
    pill(x, top + 3 * gap + 180, "accepted", "ok", 30)
  );
  const captions = rungs.map((r, k) => stepOnly(k + 1, captionBand(H, r.caption, 58)));
  return figure({
    height: H,
    title: "Checking the work",
    subtitle: "Cheap, certain checks first. Costly judgment last.",
    accent,
    glows: [[x, top + 1.5 * gap, 320, "ok"]],
    captionBand: true,
    body: meter + step(1, feedback) + layers.join("") + accepted + captions.join(""),
  });
}

// ── F5: the two harnesses ────────────────────────────────────────────────────────────────────────

function twoHarnesses(): string {
  const col = (x: number, title: string, sub: string, hue: Hue, items: [string, IconName, Hue][]) =>
    panel(x, 330, 440, 600, title, hue, sub) +
    items
      .map(([label, ic, h], i) =>
        card({ x: x + 220, y: 488 + i * 112, w: 380, h: 92, label, hue: h, icon: ic, layout: "row", size: 28 })
      )
      .join("");
  const left = col(64, "Agent harness", "runs the agent", "accent", [
    ["Context", "context", "blue"],
    ["Tools", "tools", "amber"],
    ["Sandbox", "sandbox", "teal"],
    ["Checks", "verify", "ok"],
  ]);
  const right = col(576, "Eval harness", "tests the agent", "ok", [
    ["Test cases", "test", "blue"],
    ["Graders", "verify", "accent"],
    ["Scores", "chart", "pink"],
    ["Release gate", "gate", "amber"],
  ]);
  const flows =
    arrow(284, 300, 796, 300, { tone: "accent", bend: 46, width: 5, dot: true }) +
    pill(540, 232, "traces of real runs become test cases", "accent", 25) +
    arrow(796, 962, 284, 962, { tone: "ok", bend: 46, width: 5, dot: true }) +
    pill(540, 1032, "only changes that keep the scores ship", "ok", 25);
  return figure({
    height: 1100,
    title: "Two harnesses, one system",
    subtitle: "One runs the agent. The other proves it still works.",
    accent,
    body: left + right + flows,
  });
}

// ── F6: a coding agent fixes a bug ───────────────────────────────────────────────────────────────

function codingAgentTrace(): string {
  const rows: { part: string; hue: Hue; icon: IconName; text: string }[] = [
    {
      part: "Context",
      hue: "blue",
      icon: "context",
      text: "Reads the bug report, the failing test and the two files it touches.",
    },
    { part: "Model", hue: "accent", icon: "spark", text: "Proposes a one-line fix in parser.ts." },
    {
      part: "Guardrails",
      hue: "risk",
      icon: "guardrails",
      text: "The edit stays inside the repo and needs no network: allowed.",
    },
    {
      part: "Sandbox",
      hue: "teal",
      icon: "sandbox",
      text: "Applies the edit and runs the tests in a throwaway container.",
    },
    { part: "Observe", hue: "pink", icon: "observe", text: "One test still fails: empty input crashes the parser." },
    {
      part: "Model + checks",
      hue: "ok",
      icon: "verify",
      text: "Handles empty input. Tests, lint and types pass. A human reviews the PR.",
    },
  ];
  const top = 290;
  const gap = 168;
  const lineX = 112;
  const out = [
    `<line x1="${lineX}" y1="${top}" x2="${lineX}" y2="${top + (rows.length - 1) * gap}" class="nlf-s-line" stroke-width="5" stroke-linecap="round"/>`,
  ];
  rows.forEach((r, i) => {
    const y = top + i * gap;
    const left = 168;
    const w = W - 64 - left;
    out.push(
      badge(lineX, y, i + 1, r.hue),
      `<rect x="${left}" y="${y - 64}" width="${w}" height="128" rx="24" class="nlf-f-surface" filter="url(#nlf-shadow)"/>`,
      `<rect x="${left}" y="${y - 64}" width="${w}" height="128" rx="24" fill="none" class="nlf-s-${r.hue}" stroke-width="2" stroke-opacity="0.35"/>`,
      tile(r.icon, left + 58, y, 30, r.hue),
      text(left + 112, y - 30, r.part, { size: 26, weight: 800, anchor: "start", tone: r.hue }),
      text(left + 112, y + 18, r.text, { size: 26, weight: 500, anchor: "start", wrapAt: 50, lineHeight: 1.3 })
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

// ── F7: guides and sensors ───────────────────────────────────────────────────────────────────────

function guidesAndSensors(): string {
  const items = (x: number, list: [string, string, IconName, Hue][]) =>
    list
      .map(([label, sub, ic, h], i) =>
        card({ x: x + 190, y: 470 + i * 126, w: 344, h: 106, label, sub, hue: h, icon: ic, layout: "row", size: 27 })
      )
      .join("");
  const left =
    panel(46, 300, 380, 640, "Guides", "blue", "before it acts") +
    items(46, [
      ["Instructions", "the rules", "rules", "violet"],
      ["Examples", "show, don't tell", "context", "blue"],
      ["Tool docs", "how to use them", "tools", "amber"],
      ["A plan", "the steps", "spark", "accent"],
    ]);
  const right =
    panel(654, 300, 380, 640, "Sensors", "ok", "after it acts") +
    items(654, [
      ["Tests", "computational", "test", "ok"],
      ["Linters, types", "computational", "code", "teal"],
      ["Reviewer model", "inferential", "spark", "accent"],
      ["Human review", "inferential", "human", "amber"],
    ]);
  const mid =
    arrow(430, 560, 482, 560, { tone: "blue", width: 5 }) +
    core(540, 620, 62, "Agent") +
    arrow(598, 560, 650, 560, { tone: "ok", width: 5 }) +
    arrow(650, 700, 598, 700, { tone: "risk", width: 4, dashed: true }) +
    text(540, 778, "feedback", { size: 24, weight: 800, tone: "risk" });
  const legend =
    pill(540, 1000, "computational: fast, certain, cheap", "teal", 24) +
    pill(540, 1066, "inferential: judgment, costs more", "accent", 24);
  return figure({
    height: 1130,
    title: "Guides and sensors",
    subtitle: "Steer the agent before it acts. Check it after.",
    accent,
    body: left + right + mid + legend,
  });
}

// ── F8: how much freedom (permissions) ───────────────────────────────────────────────────────────

function permissions(): string {
  const levels: [string, string, IconName, Hue, string][] = [
    ["Read files", "nothing changes", "file", "ok", "always allowed"],
    ["Write in the sandbox", "can be thrown away", "sandbox", "teal", "allowed"],
    ["Call networks and APIs", "leaves the machine", "globe", "amber", "allow-list only"],
    ["Deploy, pay, delete", "can't be undone", "warning", "risk", "a human approves"],
  ];
  const x = 470;
  const top = 320;
  const gap = 176;
  const out = [
    arrow(110, top - 50, 110, top + 3 * gap + 50, { tone: "risk", width: 5 }),
    text(76, top + 1.5 * gap, "more risk", {
      size: 26,
      weight: 800,
      tone: "risk",
      extra: ` transform="rotate(90 76 ${top + 1.5 * gap})"`,
    }),
  ];
  levels.forEach(([label, sub, ic, hue, rule], i) => {
    const y = top + i * gap;
    out.push(
      card({ x, y, w: 560, h: 140, label, sub, hue, icon: ic, layout: "row", size: 30 }),
      pill(880, y, rule, hue, 24)
    );
  });
  return figure({
    height: 1000,
    title: "How much freedom?",
    subtitle: "Give the agent the least access the task needs.",
    accent,
    glows: [[470, 600, 300, "amber"]],
    body: out.join(""),
  });
}

// ── F9: long tasks across sessions ───────────────────────────────────────────────────────────────

function longRunning(): string {
  const sessions: [string, string, Hue][] = [
    ["Session 1", "sets up the project", "accent"],
    ["Session 2", "builds one feature", "blue"],
    ["Session 3", "builds the next one", "blue"],
  ];
  const xs = [200, 540, 880];
  const sy = 400;
  const out: string[] = [];
  sessions.forEach(([label, sub, hue], i) => {
    out.push(card({ x: xs[i], y: sy, w: 290, h: 200, label, sub, hue, icon: i === 0 ? "rules" : "code", size: 30 }));
    if (i > 0) {
      out.push(
        arrow(xs[i - 1], sy, xs[i], sy, {
          tone: "muted",
          width: 4,
          fromBox: { w: 290, h: 200 },
          toBox: { w: 290, h: 200 },
        })
      );
    }
  });
  out.push(pill(540, 246, "each session starts with an empty context window", "accent", 24));
  out.push(
    panel(64, 640, 952, 300, "Memory on disk", "violet", "read at the start of every session, updated at the end")
  );
  const store: [string, IconName, Hue][] = [
    ["Feature list", "rules", "violet"],
    ["Progress log", "file", "amber"],
    ["Git history", "git", "teal"],
  ];
  store.forEach(([label, ic, hue], i) => {
    out.push(card({ x: [226, 540, 854][i], y: 850, w: 286, h: 100, label, hue, icon: ic, layout: "row", size: 25 }));
  });
  xs.forEach((x) => {
    out.push(arrow(x - 40, sy + 112, x - 40, 640, { tone: "violet", width: 4, inset: 8 }));
    out.push(arrow(x + 40, 640, x + 40, sy + 112, { tone: "violet", width: 4, inset: 8 }));
  });
  return figure({
    height: 1020,
    title: "Long tasks, short memories",
    subtitle: "Files on disk carry the work from one session to the next.",
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
      alt: "A glowing core labelled Model sits inside a ring of seven coloured cards: Context (what it sees), Tools (what it can do), Sandbox (where it acts), Memory (what it keeps), Verification (is it right?), Guardrails (what it can't do) and Observability (what it did).",
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
      alt: "Five cards in a loop connected by arrows: Gather context, Propose (by the model), Check, Act in a sandbox and Observe (all by the harness), with a dashed arrow back to the start labelled repeat.",
      caption: "Each turn goes gather, propose, check, act, observe; the model only does the second step.",
      slide: "Every turn of an agent goes through five steps. The model does exactly one of them.",
    },
  },
  {
    slug: "context-budget",
    svg: contextBudget,
    meta: {
      title: "What fills the context window",
      alt: "A tall bar split into six coloured parts: instructions, tool definitions, task and plan, retrieved files, history and results, and free space, each with a note on how the harness manages it.",
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
      alt: "Four checks stacked top to bottom: schema and format, tests linters and types, a reviewer model, a human approves. Each can fail back to the model; passing all four leads to accepted.",
      caption:
        "Run cheap, certain checks first and save costly judgment, from a model or a person, for what they can't catch.",
      slide: "Check an agent's work like a ladder: cheap and certain first, costly judgment last.",
    },
  },
  {
    slug: "guides-and-sensors",
    svg: guidesAndSensors,
    meta: {
      title: "Guides and sensors",
      alt: "Guides on the left (instructions, examples, tool docs, a plan) steer the agent before it acts; sensors on the right (tests, linters and types, a reviewer model, human review) check it after, and send feedback back.",
      caption: "Guides make a good first attempt likely; sensors catch what still goes wrong and feed it back.",
      slide: "Guides steer an agent before it acts. Sensors check its work after. A good harness has both.",
    },
  },
  {
    slug: "permissions",
    svg: permissions,
    meta: {
      title: "How much freedom?",
      alt: "Four levels of access from safe to risky: read files (always allowed), write in the sandbox (allowed), call networks and APIs (allow-list only), deploy pay or delete (a human approves).",
      caption: "Grant access by risk: the harder an action is to undo, the more the harness restricts it.",
      slide: "The harder an action is to undo, the less freedom the agent gets.",
    },
  },
  {
    slug: "long-running",
    svg: longRunning,
    meta: {
      title: "Long tasks, short memories",
      alt: "Three sessions in a row, each starting with an empty context window, reading from and writing to memory on disk: a feature list, a progress log and git history.",
      caption: "For work longer than one context window, files on disk are the agent's memory between sessions.",
      slide: "Long tasks outlast the context window. Files on disk become the agent's memory.",
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
