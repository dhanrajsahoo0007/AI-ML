import {
  arrow,
  badge,
  captionBand,
  card,
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

// Figures for Issue #2, Loop Engineering (content/newsletter/2026/loop-engineering.mdx). Cover palette: coral, so
// the accent is its red-orange and stands for the loop itself. People are amber, the goal is blue, a passing check
// is green and a safety exit is red, in every figure.

const accent: Accent = {
  name: "loop",
  light: { accent: "#c2412d", soft: "#ffece5" },
  dark: { accent: "#ff9a82", soft: "#3a1f18" },
};

// ── F1: four layers ──────────────────────────────────────────────────────────────────────────────

function fourLayers(): string {
  const layer = (
    x: number,
    y: number,
    w: number,
    h: number,
    hue: Hue,
    ic: IconName,
    title: string,
    sub: string,
    when: string
  ) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="36" class="nlf-f-${hue}-soft" filter="url(#nlf-shadow)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="36" fill="none" class="nlf-s-${hue}" stroke-width="2.5" stroke-opacity="0.5"/>` +
    tile(ic, x + 70, y + 75, 32, hue) +
    text(x + 122, y + 54, title, { size: 31, weight: 800, anchor: "start", tone: hue }) +
    text(x + 122, y + 98, sub, { size: 25, weight: 500, anchor: "start", tone: "muted" }) +
    pill(x + w - 112, y + 54, when, hue, 24);
  const body =
    layer(
      64,
      220,
      952,
      880,
      "accent",
      "loop",
      "Loop engineering",
      "decides when the agent runs again, and when it stops",
      "mid-2026"
    ) +
    layer(
      108,
      370,
      864,
      686,
      "teal",
      "sandbox",
      "Harness engineering",
      "decides what the agent can do, and checks its work",
      "2026"
    ) +
    layer(
      152,
      520,
      776,
      492,
      "blue",
      "context",
      "Context engineering",
      "decides what the model sees on each turn",
      "2025"
    ) +
    layer(196, 670, 688, 298, "amber", "rules", "Prompt engineering", "decides how one request is worded", "2023") +
    `<rect x="240" y="836" width="600" height="92" rx="22" class="nlf-f-surface"/>` +
    text(540, 882, "“Fix the failing test in parser.ts”", { size: 27, weight: 600 });
  return figure({
    height: 1160,
    title: "Four layers of one craft",
    subtitle: "Each layer wraps the one before. The loop is the outermost.",
    accent,
    body,
  });
}

// ── F2: the anatomy of a loop (build-up, 4 steps) ────────────────────────────────────────────────

function loopAnatomy(): string {
  const H = 1250;
  const wide = { w: 520, h: 140 };
  const box = { w: 380, h: 180 };
  const goal = [540, 300] as const;
  const act = [290, 600] as const;
  const check = [790, 600] as const;
  const stop = [540, 920] as const;
  const captions = [
    "Goal: say what done looks like in a way a program can test. “All tests pass”, not “make it better”.",
    "Act: the agent takes a turn. It reads files, edits code and runs commands inside its harness.",
    "Check: something other than the agent's own word tests the result. Not there yet? Round again.",
    "Stop: the loop ends when the goal is met, or when a cap on turns, time or money is hit.",
  ];
  const layers = [
    step(
      1,
      card({
        x: goal[0],
        y: goal[1],
        ...wide,
        label: "A goal",
        sub: "what done looks like",
        hue: "blue",
        icon: "target",
        layout: "row",
        size: 31,
      }),
      badge(goal[0] - wide.w / 2 + 8, goal[1] - wide.h / 2 + 8, 1, "blue")
    ),
    step(
      2,
      arrow(goal[0], goal[1], act[0], act[1], { tone: "blue", fromBox: wide, toBox: box }),
      card({
        x: act[0],
        y: act[1],
        ...box,
        label: "Act",
        sub: "the agent works",
        hue: "accent",
        icon: "act",
        size: 31,
      }),
      badge(act[0] - box.w / 2 + 8, act[1] - box.h / 2 + 8, 2, "accent")
    ),
    step(
      3,
      arrow(act[0], act[1] - 30, check[0], check[1] - 30, { tone: "accent", fromBox: box, toBox: box }),
      arrow(check[0], check[1], act[0], act[1], { tone: "risk", bend: -110, dashed: true, fromBox: box, toBox: box }),
      pill(540, 800, "not yet: go again", "risk", 24),
      card({
        x: check[0],
        y: check[1],
        ...box,
        label: "Check",
        sub: "is the goal met?",
        hue: "ok",
        icon: "verify",
        size: 31,
      }),
      badge(check[0] - box.w / 2 + 8, check[1] - box.h / 2 + 8, 3, "ok")
    ),
    step(
      4,
      arrow(check[0] + 110, check[1], stop[0] + 190, stop[1], {
        tone: "ok",
        fromBox: { w: 160, h: 180 },
        toBox: { w: 140, h: 140 },
      }),
      pill(900, 770, "yes", "ok", 24),
      card({
        x: stop[0],
        y: stop[1],
        ...wide,
        label: "Stop",
        sub: "done, or out of budget",
        hue: "amber",
        icon: "stop",
        layout: "row",
        size: 31,
      }),
      badge(stop[0] - wide.w / 2 + 8, stop[1] - wide.h / 2 + 8, 4, "amber")
    ),
  ];
  return figure({
    height: H,
    title: "The anatomy of a loop",
    subtitle: "Four parts. Leave one out and you can't trust the loop.",
    accent,
    glows: [[540, 600, 260, "accent"]],
    captionBand: true,
    body: layers.join("") + captions.map((c, k) => stepOnly(k + 1, captionBand(H, c))).join(""),
  });
}

// ── F3: four kinds of loop ───────────────────────────────────────────────────────────────────────

function loopTypes(): string {
  const rows: [string, string, IconName, Hue, string][] = [
    ["Turn-based", "you prompt, it self-checks", "human", "amber", "the checking"],
    ["Goal-based", "runs until a goal is met", "target", "ok", "+ when to stop"],
    ["Time-based", "runs on a schedule", "clock", "blue", "+ when to start"],
    ["Proactive", "an event starts it", "bolt", "accent", "+ the prompt"],
  ];
  const x = 430;
  const top = 370;
  const gap = 176;
  const out = [
    arrow(110, top - 50, 110, top + 3 * gap + 50, { tone: "accent", width: 5 }),
    text(76, top + 1.5 * gap, "more hands-off", {
      size: 26,
      weight: 800,
      tone: "accent",
      extra: ` transform="rotate(90 76 ${top + 1.5 * gap})"`,
    }),
    text(x, 258, "kind of loop", { size: 25, weight: 700, tone: "muted" }),
    text(862, 258, "you hand over", { size: 25, weight: 700, tone: "muted" }),
  ];
  rows.forEach(([label, sub, ic, hue, hand], i) => {
    const y = top + i * gap;
    out.push(
      card({ x, y, w: 520, h: 140, label, sub, hue, icon: ic, layout: "row", size: 30 }),
      pill(862, y, hand, hue, 24)
    );
  });
  return figure({
    height: 1040,
    title: "Four kinds of loop",
    subtitle: "Each step down, you hand one more job to the system.",
    accent,
    glows: [[430, 640, 300, "accent"]],
    body: out.join(""),
  });
}

// ── F4: how strong is the check ──────────────────────────────────────────────────────────────────

function checkStrength(): string {
  const rows: [string, string, IconName, Hue, string][] = [
    ["The agent says “done”", "a claim, not a proof", "warning", "risk", "no check"],
    ["It compiles and lints", "catches the obvious", "code", "blue", "weak"],
    ["The tests pass", "certain and repeatable", "test", "teal", "strong"],
    ["A second model reviews", "fresh eyes on the work", "spark", "violet", "judgment"],
    ["A person signs off", "for what can't be undone", "human", "amber", "final say"],
  ];
  const x = 440;
  const top = 310;
  const gap = 156;
  const out = [
    arrow(110, top - 50, 110, top + 4 * gap + 50, { tone: "ok", width: 5 }),
    text(76, top + 2 * gap, "stronger evidence", {
      size: 26,
      weight: 800,
      tone: "ok",
      extra: ` transform="rotate(90 76 ${top + 2 * gap})"`,
    }),
  ];
  rows.forEach(([label, sub, ic, hue, verdict], i) => {
    const y = top + i * gap;
    out.push(
      card({ x, y, w: 540, h: 126, label, sub, hue, icon: ic, layout: "row", size: 28 }),
      pill(878, y, verdict, hue, 25)
    );
  });
  return figure({
    height: 1090,
    title: "How strong is your check?",
    subtitle: "A loop is only as good as the evidence it stops on.",
    accent,
    glows: [[440, 620, 300, "ok"]],
    body: out.join(""),
  });
}

// ── F5: five ways out ────────────────────────────────────────────────────────────────────────────

function stopConditions(): string {
  const cx = 540;
  const cy = 650;
  const hub = { w: 250, h: 250 };
  const exits: [number, number, number, string, string, IconName, Hue][] = [
    [540, 330, 300, "Goal met", "the check passes", "verify", "ok"],
    [190, 650, 250, "Turn cap", "max 25 rounds", "loop", "amber"],
    [890, 650, 250, "Budget cap", "max $15 spent", "coin", "amber"],
    [290, 960, 270, "No progress", "same error 3 times", "warning", "risk"],
    [790, 960, 270, "Needs a human", "a risky step", "human", "blue"],
  ];
  const out: string[] = [];
  for (const [x, y, w, label, sub, ic, hue] of exits) {
    out.push(
      arrow(cx, cy, x, y, { tone: hue, width: 5, fromBox: hub, toBox: { w, h: 170 } }),
      card({ x, y, w, h: 170, label, sub, hue, icon: ic, size: 28 })
    );
  }
  out.push(
    `<circle cx="${cx}" cy="${cy}" r="118" class="nlf-f-accent-soft" filter="url(#nlf-shadow)"/>`,
    `<circle cx="${cx}" cy="${cy}" r="118" fill="none" class="nlf-s-accent" stroke-width="3" stroke-dasharray="1 11" stroke-linecap="round"/>`,
    tile("loop", cx, cy - 22, 42, "accent"),
    text(cx, cy + 56, "the loop", { size: 28, weight: 800, tone: "accent" }),
    pill(300, 1130, "1 exit for success", "ok", 25),
    pill(760, 1130, "4 exits for safety", "risk", 25)
  );
  return figure({
    height: 1210,
    title: "Five ways out of a loop",
    subtitle: "Decide every exit before the loop starts.",
    accent,
    glows: [[cx, cy, 280, "accent"]],
    body: out.join(""),
  });
}

// ── F6: one night, 30 failing tests ──────────────────────────────────────────────────────────────

function overnightTrace(): string {
  const rows: { when: string; hue: Hue; icon: IconName; text: string; left: number }[] = [
    {
      when: "22:00 · Start",
      hue: "blue",
      icon: "target",
      text: "Goal: all tests pass. Caps: 25 rounds, $15.",
      left: 30,
    },
    {
      when: "Rounds 1–4",
      hue: "accent",
      icon: "code",
      text: "Finds one shared date bug behind 18 failures.",
      left: 12,
    },
    {
      when: "Rounds 5–9",
      hue: "accent",
      icon: "test",
      text: "One fix per round. The suite re-runs each time.",
      left: 7,
    },
    {
      when: "Rounds 10–12",
      hue: "risk",
      icon: "warning",
      text: "Same test fails 3 times. Flagged and skipped.",
      left: 7,
    },
    {
      when: "Rounds 13–18",
      hue: "accent",
      icon: "test",
      text: "Six more fixes, each one proven by the suite.",
      left: 1,
    },
    { when: "02:40 · Stop", hue: "ok", icon: "stop", text: "29 fixed, 1 left for a person. Cost: $9.40.", left: 1 },
  ];
  const top = 300;
  const gap = 166;
  const lineX = 112;
  const left = 168;
  const w = W - 64 - left;
  const barX = left + 112;
  const barW = w - 148;
  const out = [
    `<line x1="${lineX}" y1="${top}" x2="${lineX}" y2="${top + (rows.length - 1) * gap}" class="nlf-s-line" stroke-width="5" stroke-linecap="round"/>`,
  ];
  rows.forEach((r, i) => {
    const y = top + i * gap;
    const done = ((30 - r.left) / 30) * barW;
    out.push(
      badge(lineX, y, i + 1, r.hue),
      `<rect x="${left}" y="${y - 70}" width="${w}" height="140" rx="24" class="nlf-f-surface" filter="url(#nlf-shadow)"/>`,
      `<rect x="${left}" y="${y - 70}" width="${w}" height="140" rx="24" fill="none" class="nlf-s-${r.hue}" stroke-width="2" stroke-opacity="0.35"/>`,
      tile(r.icon, left + 58, y, 30, r.hue),
      text(barX, y - 38, r.when, { size: 26, weight: 800, anchor: "start", tone: r.hue }),
      text(left + w - 36, y - 38, `${r.left} failing`, { size: 25, weight: 800, anchor: "end" }),
      text(barX, y + 2, r.text, { size: 25, weight: 500, anchor: "start" }),
      `<rect x="${barX}" y="${y + 34}" width="${barW}" height="12" rx="6" class="nlf-f-dot"/>`,
      done > 0 ? `<rect x="${barX}" y="${y + 34}" width="${done.toFixed(1)}" height="12" rx="6" class="nlf-f-ok"/>` : ""
    );
  });
  return figure({
    height: 1260,
    title: "One night, 30 failing tests",
    subtitle: "A loop at work, round by round. Green is tests fixed.",
    accent,
    body: out.join(""),
  });
}

// ── F7: who does what ────────────────────────────────────────────────────────────────────────────

function whoDoesWhat(): string {
  const col = (x: number, title: string, sub: string, hue: Hue, items: [string, IconName, Hue][]) =>
    panel(x, 330, 440, 600, title, hue, sub) +
    items
      .map(([label, ic, h], i) =>
        card({ x: x + 220, y: 510 + i * 112, w: 380, h: 92, label, hue: h, icon: ic, layout: "row", size: 27 })
      )
      .join("");
  const left = col(64, "You", "design the loop, once", "amber", [
    ["Write the goal", "target", "blue"],
    ["Build the check", "verify", "ok"],
    ["Set the caps", "stop", "risk"],
    ["Read the result", "observe", "amber"],
  ]);
  const right = col(576, "The loop", "runs it, every round", "accent", [
    ["Pick the task", "rules", "blue"],
    ["Prompt the agent", "act", "accent"],
    ["Run the check", "test", "ok"],
    ["Stop or repeat", "loop", "risk"],
  ]);
  const flows =
    arrow(284, 300, 796, 300, { tone: "amber", bend: 46, width: 5, dot: true }) +
    pill(540, 232, "the goal, the check and the caps go in", "amber", 25) +
    arrow(796, 962, 284, 962, { tone: "accent", bend: 46, width: 5, dot: true }) +
    pill(540, 1032, "finished work and flagged problems come back", "accent", 24);
  return figure({
    height: 1100,
    title: "Who does what now",
    subtitle: "You stop typing prompts. You start designing the system.",
    accent,
    body: left + right + flows,
  });
}

export const figures: FigureDef[] = [
  {
    slug: "four-layers",
    svg: fourLayers,
    meta: {
      title: "Four layers of one craft",
      alt: "Four nested panels. Innermost is prompt engineering (how one request is worded), then context engineering (what the model sees), then harness engineering (what the agent can do and how it is checked), and outermost loop engineering (when the agent runs again and when it stops).",
      caption:
        "Loop engineering doesn't replace prompts, context or the harness; it wraps them and decides when they run.",
      slide: "Prompt, context, harness, loop. Each layer wraps the last. The loop decides when the agent runs again.",
    },
  },
  {
    slug: "loop-anatomy",
    svg: loopAnatomy,
    meta: {
      title: "The anatomy of a loop",
      alt: "A goal card feeds an Act card. Act leads to Check. A dashed arrow labelled not yet, go again returns from Check to Act, and an arrow labelled yes leads from Check to Stop: done, or out of budget.",
      caption: "Every loop has a goal, a way to act, a check and a stop; the check and the stop are what make it safe.",
      slide: "Every agent loop has four parts: a goal, a way to act, a check and a stop.",
    },
  },
  {
    slug: "loop-types",
    svg: loopTypes,
    meta: {
      title: "Four kinds of loop",
      alt: "Four loops from hands-on to hands-off. Turn-based: you prompt and the agent checks its own work, so you hand over the checking. Goal-based: runs until a goal is met, you hand over when to stop. Time-based: runs on a schedule, you hand over when to start. Proactive: an event starts it, you hand over the prompt.",
      caption: "Move down one rung at a time: each kind of loop hands one more decision to the system.",
      slide: "Four kinds of loop. Each one hands a little more of your job to the system.",
    },
  },
  {
    slug: "check-strength",
    svg: checkStrength,
    meta: {
      title: "How strong is your check?",
      alt: "Five checks from weakest to strongest evidence: the agent says done (no check), it compiles and lints (weak), the tests pass (strong), a second model reviews (judgment), and a person signs off (final say).",
      caption: "“The agent says it's done” is not a check; stop a loop only on evidence the agent didn't write.",
      slide: "A loop is only as good as its check. “The agent says it's done” is not a check.",
    },
  },
  {
    slug: "stop-conditions",
    svg: stopConditions,
    meta: {
      title: "Five ways out of a loop",
      alt: "A loop in the centre with five exits: goal met (the check passes), turn cap (max 25 rounds), budget cap (max 15 dollars spent), no progress (same error three times) and needs a human (a risky step). One exit is for success and four are for safety.",
      caption: "A loop needs one exit for success and four for safety: turns, money, no progress and a human gate.",
      slide: "Every loop needs five exits. One for success. Four so it can't run away.",
    },
  },
  {
    slug: "overnight-trace",
    svg: overnightTrace,
    meta: {
      title: "One night, 30 failing tests",
      alt: "A six-step timeline of an overnight loop. It starts at 22:00 with 30 failing tests, drops to 12 after rounds 1 to 4, to 7 after rounds 5 to 9, stays at 7 while one test fails three times and is skipped, drops to 1 after rounds 13 to 18, and stops at 02:40 with 29 fixed and 1 left for a person, at a cost of 9 dollars 40.",
      caption: "The loop fixed 29 of 30 tests without a single prompt, and stopped itself on the one it couldn't fix.",
      slide: "30 failing tests at 10 pm. 29 fixed by 2:40 am. Nobody typed a prompt.",
    },
  },
  {
    slug: "who-does-what",
    svg: whoDoesWhat,
    meta: {
      title: "Who does what now",
      alt: "Two panels. You design the loop once: write the goal, build the check, set the caps, read the result. The loop runs it every round: pick the task, prompt the agent, run the check, stop or repeat. The goal, check and caps go in; finished work and flagged problems come back.",
      caption: "Your job moves from writing prompts to writing goals, checks and limits.",
      slide: "The engineer's job is changing: from writing prompts to writing goals, checks and limits.",
    },
  },
];
