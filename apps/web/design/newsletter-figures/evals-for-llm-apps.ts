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

// Figures for Issue #3, Evals (content/newsletter/2026/evals-for-llm-apps.mdx). Cover palette: sage, so the accent
// is a deep sage and stands for the eval itself. A pass is green and a failure is red in every figure; people are
// amber, code is blue and a model judge is violet.

const accent: Accent = {
  name: "evals",
  light: { accent: "#3f6f58", soft: "#e4efe8" },
  dark: { accent: "#9fd2b4", soft: "#1b2c23" },
};

// ── F1: the demo and the eval ────────────────────────────────────────────────────────────────────

/** The 38 failing cases of the 200, picked by a fixed shuffle so the figure never changes between builds. */
function failingDots(total: number, failing: number): Set<number> {
  let seed = 20261124;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const order = Array.from({ length: total }, (_, i) => [next(), i] as const).sort((a, b) => a[0] - b[0]);
  return new Set(order.slice(0, failing).map(([, i]) => i));
}

function demoVsEval(): string {
  const top = 240;
  const h = 590;
  const demo =
    panel(64, top, 320, h, "The demo", "amber", "5 cases you tried") +
    [0, 1, 2, 3, 4]
      .map((i) => `<circle cx="${224 + (i - 2) * 54}" cy="${top + 250}" r="20" class="nlf-f-ok"/>`)
      .join("") +
    text(224, top + 400, "100%", { size: 76, weight: 800, tone: "ok" }) +
    text(224, top + 480, "5 of 5 pass", { size: 28, weight: 700 }) +
    text(224, top + 524, "“It works!”", { size: 26, weight: 500, tone: "muted" });
  const cols = 20;
  const gap = 27;
  const x0 = 710 - ((cols - 1) * gap) / 2;
  const y0 = top + 138;
  const bad = failingDots(200, 38);
  const dots = Array.from({ length: 200 }, (_, i) => {
    const cx = x0 + (i % cols) * gap;
    const cy = y0 + Math.floor(i / cols) * gap;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy}" r="9.5" class="nlf-f-${bad.has(i) ? "risk" : "ok"}"/>`;
  }).join("");
  const evalPanel =
    panel(404, top, 612, h, "The eval", "accent", "200 cases your users will try") +
    dots +
    text(710, top + 460, "81%", { size: 76, weight: 800, tone: "accent" }) +
    text(710, top + 536, "162 pass · 38 fail", { size: 28, weight: 700 });
  return figure({
    height: 980,
    title: "The demo and the eval",
    subtitle: "Same app, same day. One of these numbers is true.",
    accent,
    body: demo + evalPanel + pill(540, 896, "Each red dot is a bug a user finds before you do.", "risk", 26),
  });
}

// ── F2: the eval loop (build-up, 5 steps) ────────────────────────────────────────────────────────

function evalLoop(): string {
  const H = 1270;
  const box = { w: 300, h: 164 };
  const at: [number, number][] = [
    [540, 320],
    [850, 540],
    [740, 900],
    [340, 900],
    [230, 540],
  ];
  const parts: [string, string, IconName, Hue][] = [
    ["Collect", "real questions, real answers", "file", "blue"],
    ["Read", "pass or fail, and why", "human", "amber"],
    ["Name", "the failure types", "rules", "risk"],
    ["Check", "one test per failure", "verify", "violet"],
    ["Run", "on every change", "loop", "accent"],
  ];
  const captions = [
    "Collect: save what users really asked and what the app really answered. Fifty is enough to start.",
    "Read: go through them yourself. Mark each one pass or fail and write one line saying why.",
    "Name: group your notes. The same few failure types will keep coming up. Count them.",
    "Check: write one automatic test for each failure type, starting with the biggest.",
    "Run: score every change before it ships. New failures from real users go back into the set.",
  ];
  const layers = parts.map(([label, sub, ic, hue], i) => {
    const [x, y] = at[i]!;
    const prev = at[i - 1];
    return step(
      i + 1,
      prev ? arrow(prev[0], prev[1], x, y, { tone: parts[i - 1]![3], fromBox: box, toBox: box }) : "",
      i === 4 ? arrow(x, y, at[0]![0], at[0]![1], { tone: "accent", dashed: true, fromBox: box, toBox: box }) : "",
      card({ x, y, ...box, label, sub, hue, icon: ic, size: 31 }),
      badge(x - box.w / 2 + 8, y - box.h / 2 + 8, i + 1, hue)
    );
  });
  return figure({
    height: H,
    title: "The eval loop",
    subtitle: "Five steps. The first three need no tools at all.",
    accent,
    glows: [[540, 630, 250, "accent"]],
    captionBand: true,
    body:
      text(540, 610, "the eval", { size: 32, weight: 800, tone: "accent" }) +
      text(540, 654, "loop", { size: 32, weight: 800, tone: "accent" }) +
      layers.join("") +
      captions.map((c, k) => stepOnly(k + 1, captionBand(H, c))).join(""),
  });
}

// ── F3: fifty answers, sorted ────────────────────────────────────────────────────────────────────

function failureTally(): string {
  const rows: [string, number, IconName, Hue, string?][] = [
    ["Fine", 31, "verify", "ok"],
    ["Wrong refund policy", 8, "rules", "risk", "fix this first"],
    ["Invented order details", 5, "spark", "risk"],
    ["Missed a request for a human", 4, "human", "risk"],
    ["Too long to be useful", 2, "context", "risk"],
  ];
  const top = 330;
  const gap = 158;
  const left = 64;
  const w = W - 128;
  const barX = left + 124;
  const barW = w - 300;
  const out: string[] = [];
  rows.forEach(([label, n, ic, hue, tag], i) => {
    const y = top + i * gap;
    out.push(
      `<rect x="${left}" y="${y - 66}" width="${w}" height="132" rx="24" class="nlf-f-surface" filter="url(#nlf-shadow)"/>`,
      `<rect x="${left}" y="${y - 66}" width="${w}" height="132" rx="24" fill="none" class="nlf-s-${hue}" stroke-width="2" stroke-opacity="0.35"/>`,
      tile(ic, left + 62, y, 32, hue),
      text(barX, y - 22, label, { size: 29, weight: 700, anchor: "start" }),
      tag ? pill(barX + 440, y - 22, tag, "risk", 24) : "",
      `<rect x="${barX}" y="${y + 20}" width="${barW}" height="16" rx="8" class="nlf-f-dot"/>`,
      `<rect x="${barX}" y="${y + 20}" width="${((n / 50) * barW).toFixed(1)}" height="16" rx="8" class="nlf-f-${hue}"/>`,
      text(left + w - 40, y, String(n), { size: 46, weight: 800, anchor: "end", tone: hue })
    );
  });
  return figure({
    height: 1160,
    title: "Fifty answers, sorted",
    subtitle: "Read them, label them, count the labels.",
    accent,
    body: out.join("") + pill(540, top + 5 * gap - 10, "19 of 50 failed, for just four reasons", "accent", 26),
  });
}

// ── F4: three graders (build-up, 3 steps) ────────────────────────────────────────────────────────

function graderLadder(): string {
  const H = 1090;
  const rows: [string, string, IconName, Hue, string][] = [
    ["Code", "format, facts, forbidden words", "code", "blue", "instant · free"],
    ["A model judge", "tone, accuracy, helpfulness", "spark", "violet", "seconds · cents"],
    ["A person", "sets the standard", "human", "amber", "minutes · costly"],
  ];
  const captions = [
    "Code first. If a rule can decide it (valid JSON? right price? has a link?), write the rule.",
    "A model next, for what needs judgement. Ask it one yes-or-no question, not for a score out of ten.",
    "A person last. People are slow, so use them to set the standard and to check the judge.",
  ];
  const x = 410;
  const top = 330;
  const gap = 196;
  const layers = rows.map(([label, sub, ic, hue, costLabel], i) => {
    const y = top + i * gap;
    return step(
      i + 1,
      card({ x, y, w: 560, h: 150, label, sub, hue, icon: ic, layout: "row", size: 31 }),
      badge(x - 280 + 8, y - 75 + 8, i + 1, hue),
      pill(868, y, costLabel, hue, 24)
    );
  });
  return figure({
    height: H,
    title: "Three graders",
    subtitle: "Use the cheapest one that can tell good from bad.",
    accent,
    glows: [[410, 530, 280, "accent"]],
    captionBand: true,
    body:
      text(x, 232, "who grades", { size: 25, weight: 700, tone: "muted" }) +
      text(868, 232, "speed · cost", { size: 25, weight: 700, tone: "muted" }) +
      layers.join("") +
      captions.map((c, k) => stepOnly(k + 1, captionBand(H, c))).join(""),
  });
}

// ── F5: can you trust the judge? ─────────────────────────────────────────────────────────────────

function judgeCalibration(): string {
  const cell = (x: number, y: number, n: number, label: string, hue: Hue) =>
    `<rect x="${x}" y="${y}" width="360" height="250" rx="30" class="nlf-f-${hue}-soft" filter="url(#nlf-shadow)"/>` +
    `<rect x="${x}" y="${y}" width="360" height="250" rx="30" fill="none" class="nlf-s-${hue}" stroke-width="2.5" stroke-opacity="0.5"/>` +
    text(x + 180, y + 100, String(n), { size: 96, weight: 800, tone: hue }) +
    text(x + 180, y + 196, label, { size: 27, weight: 700 });
  const x1 = 276;
  const x2 = 656;
  const y1 = 350;
  const y2 = 620;
  const body =
    text(x1 + 180, 262, "You said", { size: 25, weight: 500, tone: "muted" }) +
    text(x1 + 180, 302, "pass", { size: 32, weight: 800, tone: "ok" }) +
    text(x2 + 180, 262, "You said", { size: 25, weight: 500, tone: "muted" }) +
    text(x2 + 180, 302, "fail", { size: 32, weight: 800, tone: "risk" }) +
    text(160, y1 + 105, "Judge said", { size: 25, weight: 500, tone: "muted" }) +
    text(160, y1 + 147, "pass", { size: 32, weight: 800, tone: "ok" }) +
    text(160, y2 + 105, "Judge said", { size: 25, weight: 500, tone: "muted" }) +
    text(160, y2 + 147, "fail", { size: 32, weight: 800, tone: "risk" }) +
    cell(x1, y1, 27, "both say pass", "ok") +
    cell(x2, y1, 5, "failures it missed", "risk") +
    cell(x1, y2, 2, "false alarms", "amber") +
    cell(x2, y2, 16, "both say fail", "ok") +
    pill(540, 950, "They agree on 43 of 50: that's 86%", "accent", 27) +
    pill(540, 1024, "But the judge caught only 16 of 21 failures", "risk", 27);
  return figure({
    height: 1110,
    title: "Can you trust the judge?",
    subtitle: "Grade 50 answers yourself. Then compare with the model.",
    accent,
    body,
  });
}

// ── F6: before release, after release ────────────────────────────────────────────────────────────

function offlineOnline(): string {
  const col = (x: number, title: string, sub: string, hue: Hue, items: [string, IconName, Hue][]) =>
    panel(x, 330, 440, 500, title, hue, sub) +
    items
      .map(([label, ic, h], i) =>
        card({ x: x + 220, y: 516 + i * 116, w: 380, h: 96, label, hue: h, icon: ic, layout: "row", size: 27 })
      )
      .join("");
  const left = col(64, "Before release", "your test set, on every change", "accent", [
    ["Run the test set", "test", "blue"],
    ["Grade the answers", "verify", "violet"],
    ["Pass mark met?", "gate", "ok"],
  ]);
  const right = col(576, "After release", "real users, every day", "amber", [
    ["Watch real traffic", "observe", "amber"],
    ["Grade a sample", "verify", "violet"],
    ["Spot new failures", "warning", "risk"],
  ]);
  const flows =
    arrow(284, 300, 796, 300, { tone: "ok", bend: 46, width: 5, dot: true }) +
    pill(540, 232, "passes the gate: ship it", "ok", 25) +
    arrow(796, 862, 284, 862, { tone: "risk", bend: 46, width: 5, dot: true }) +
    pill(540, 934, "each new failure becomes a test case", "risk", 25);
  return figure({
    height: 1010,
    title: "Before release, after release",
    subtitle: "The test set grows every time a real user finds a bug.",
    accent,
    body: left + right + flows,
  });
}

// ── F7: one prompt change, 60 test cases ─────────────────────────────────────────────────────────

function beforeAfter(): string {
  const rows: [string, number, number, IconName][] = [
    ["Wrong refund policy", 9, 2, "rules"],
    ["Invented order details", 6, 5, "spark"],
    ["Missed request for a human", 5, 0, "human"],
    ["Too long to be useful", 4, 7, "context"],
  ];
  const top = 350;
  const gap = 146;
  const left = 64;
  const w = W - 128;
  const colB = 640;
  const colA = 780;
  const colC = 926;
  const out = [
    text(left + 30, 258, "failing cases, by type", { size: 25, weight: 700, tone: "muted", anchor: "start" }),
    text(colB, 258, "before", { size: 25, weight: 700, tone: "muted" }),
    text(colA, 258, "after", { size: 25, weight: 700, tone: "muted" }),
    text(colC, 258, "change", { size: 25, weight: 700, tone: "muted" }),
  ];
  rows.forEach(([label, before, after, ic], i) => {
    const y = top + i * gap;
    const worse = after > before;
    const hue: Hue = worse ? "risk" : "ok";
    out.push(
      `<rect x="${left}" y="${y - 58}" width="${w}" height="116" rx="24" class="${worse ? "nlf-f-risk-soft" : "nlf-f-surface"}" filter="url(#nlf-shadow)"/>`,
      `<rect x="${left}" y="${y - 58}" width="${w}" height="116" rx="24" fill="none" class="nlf-s-${hue}" stroke-width="2" stroke-opacity="${worse ? 0.7 : 0.3}"/>`,
      tile(ic, left + 58, y, 30, worse ? "risk" : "blue"),
      text(left + 110, y, label, { size: 27, weight: 700, anchor: "start" }),
      text(colB, y, String(before), { size: 38, weight: 800, tone: "muted" }),
      text(colA, y, String(after), { size: 38, weight: 800 }),
      pill(colC, y, worse ? `+${after - before} worse` : `−${before - after}`, hue, 25)
    );
  });
  const ty = top + 4 * gap + 20;
  out.push(
    `<rect x="${left}" y="${ty - 70}" width="${w}" height="140" rx="28" class="nlf-f-accent-soft"/>`,
    `<rect x="${left}" y="${ty - 70}" width="${w}" height="140" rx="28" fill="none" class="nlf-s-accent" stroke-width="2.5" stroke-opacity="0.5"/>`,
    tile("chart", left + 58, ty, 30, "accent"),
    text(left + 110, ty - 20, "Cases passing, of 60", { size: 27, weight: 800, anchor: "start", tone: "accent" }),
    text(left + 110, ty + 22, "60% before, 77% after", { size: 25, weight: 500, anchor: "start", tone: "muted" }),
    text(colB, ty, "36", { size: 38, weight: 800, tone: "muted" }),
    text(colA, ty, "46", { size: 38, weight: 800 }),
    pill(colC, ty, "+10", "ok", 25)
  );
  return figure({
    height: 1090,
    title: "One prompt change, 60 cases",
    subtitle: "Three things got better. One got worse, and the eval saw it.",
    accent,
    body: out.join(""),
  });
}

// ── F8: what to measure in an agent ──────────────────────────────────────────────────────────────

function whatToMeasure(): string {
  const rows: [string, string, IconName, Hue, string][] = [
    ["The outcome", "is the job really done?", "target", "ok", "grade this first"],
    ["The steps", "which tools, how many turns", "tools", "blue", "read, don't dictate"],
    ["The cost", "tokens and money per task", "coin", "amber", "set a budget"],
    ["The time", "seconds from start to done", "clock", "violet", "set a limit"],
  ];
  const x = 380;
  const top = 340;
  const gap = 168;
  const out = [
    text(x, 244, "what you measure", { size: 25, weight: 700, tone: "muted" }),
    text(858, 244, "how to use it", { size: 25, weight: 700, tone: "muted" }),
  ];
  rows.forEach(([label, sub, ic, hue, how], i) => {
    const y = top + i * gap;
    out.push(
      card({ x, y, w: 540, h: 136, label, sub, hue, icon: ic, layout: "row", size: 30 }),
      pill(858, y, how, hue, 24)
    );
  });
  out.push(pill(540, top + 4 * gap - 6, "Run each task several times: agents vary from run to run.", "accent", 25));
  return figure({
    height: 1100,
    title: "Grading an agent",
    subtitle: "An agent gives you four things to measure, not one.",
    accent,
    glows: [[380, 590, 290, "accent"]],
    body: out.join(""),
  });
}

export const figures: FigureDef[] = [
  {
    slug: "demo-vs-eval",
    svg: demoVsEval,
    meta: {
      title: "The demo and the eval",
      alt: "Two panels. The demo shows 5 cases you tried, all green: 100 percent, 5 of 5 pass. The eval shows a grid of 200 cases your users will try, 162 green and 38 red: 81 percent. Each red dot is a bug a user finds before you do.",
      caption: "A demo shows the five cases you tried; an eval shows the two hundred you didn't.",
      slide: "Your demo passed 5 out of 5. Your users will try 200 things. An eval shows you the other 195.",
    },
  },
  {
    slug: "eval-loop",
    svg: evalLoop,
    meta: {
      title: "The eval loop",
      alt: "Five steps in a circle. Collect real questions and answers. Read them and mark each pass or fail with a reason. Name the failure types. Write one check per failure type. Run the checks on every change. A dashed arrow returns from Run to Collect.",
      caption: "Evals are a loop: collect, read, name, check, run. Reading comes before any tool.",
      slide: "The eval loop in five steps: collect, read, name, check, run. The first three need no tools.",
    },
  },
  {
    slug: "failure-tally",
    svg: failureTally,
    meta: {
      title: "Fifty answers, sorted",
      alt: "Fifty answers from a support bot sorted into five rows with bars. Fine: 31. Wrong refund policy: 8, marked fix this first. Invented order details: 5. Missed a request for a human: 4. Too long to be useful: 2. In total 19 of 50 failed, for four reasons.",
      caption: "Nineteen failures turned out to be four problems, and one of them caused almost half.",
      slide: "Read 50 real answers. Label each failure. Count the labels. Now you know what to fix first.",
    },
  },
  {
    slug: "grader-ladder",
    svg: graderLadder,
    meta: {
      title: "Three graders",
      alt: "Three graders in order of use. Code checks format, facts and forbidden words: instant and free. A model judge checks tone, accuracy and helpfulness: seconds and cents. A person sets the standard: minutes and costly.",
      caption:
        "Grade with code where a rule can decide, a model where judgement is needed, and a person to set the bar.",
      slide: "Three ways to grade an AI answer: code, a model, a person. Use the cheapest one that works.",
    },
  },
  {
    slug: "judge-calibration",
    svg: judgeCalibration,
    meta: {
      title: "Can you trust the judge?",
      alt: "A two by two grid comparing your grades with a model judge on 50 answers. Both say pass: 27. Both say fail: 16. The judge said pass but you said fail: 5 failures it missed. The judge said fail but you said pass: 2 false alarms. They agree on 43 of 50, 86 percent, but the judge caught only 16 of 21 failures.",
      caption:
        "Agreement of 86% sounds fine, yet this judge misses one failure in four. Look at the misses, not the average.",
      slide: "An AI judge that agrees with you 86% of the time can still miss 1 failure in 4. Check it first.",
    },
  },
  {
    slug: "offline-online",
    svg: offlineOnline,
    meta: {
      title: "Before release, after release",
      alt: "Two panels. Before release: run the test set, grade the answers, check the pass mark. If it passes the gate, ship it. After release: watch real traffic, grade a sample, spot new failures. Each new failure becomes a test case and flows back to the test set.",
      caption:
        "The eval is a gate before release and a net after it; every failure the net catches joins the test set.",
      slide: "Evals before release are a gate. Evals after release are a net. Each one feeds the other.",
    },
  },
  {
    slug: "before-after",
    svg: beforeAfter,
    meta: {
      title: "One prompt change, 60 cases",
      alt: "A table of failing cases by type, before and after one prompt change. Wrong refund policy: 9 to 2. Invented order details: 6 to 5. Missed request for a human: 5 to 0. Too long to be useful: 4 to 7, three worse. Cases passing out of 60: 36 before, 46 after, from 60 percent to 77 percent.",
      caption: "The total went up ten points, and the breakdown shows the one thing the change made worse.",
      slide: "One prompt change: three failure types got better, one got worse. Only the eval noticed.",
    },
  },
  {
    slug: "what-to-measure",
    svg: whatToMeasure,
    meta: {
      title: "Grading an agent",
      alt: "Four things to measure in an agent run. The outcome, is the job really done: grade this first. The steps, which tools and how many turns: read, don't dictate. The cost, tokens and money per task: set a budget. The time, seconds from start to done: set a limit. Run each task several times, because agents vary from run to run.",
      caption: "For an agent, grade the outcome first, then use steps, cost and time to explain it.",
      slide: "Grading an AI agent? Measure four things: the outcome, the steps, the cost and the time.",
    },
  },
];
