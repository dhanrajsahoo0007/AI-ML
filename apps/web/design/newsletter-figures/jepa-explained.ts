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
  W,
  type Accent,
  type Hue,
  type IconName,
} from "./kit";
import type { FigureDef } from "./build";

// Figures for Issue #5, JEPA (content/newsletter/2026/jepa-explained.mdx). Cover palette: lagoon, so the accent is a
// deep teal-blue. In every figure an LLM is violet, a JEPA is teal and "the real answer" is amber.

const accent: Accent = {
  name: "jepa",
  light: { accent: "#0b5873", soft: "#dcf0f2" },
  dark: { accent: "#8fd3df", soft: "#10303a" },
};

/** An embedding, drawn as a short strip of dots: "a summary as a list of numbers". */
function embed(cx: number, cy: number, hue: Hue): string {
  const op = [1, 0.45, 0.8, 0.3, 0.65];
  return (
    `<rect x="${cx - 110}" y="${cy - 30}" width="220" height="60" rx="30" class="nlf-f-${hue}-soft"/>` +
    `<rect x="${cx - 110}" y="${cy - 30}" width="220" height="60" rx="30" fill="none" class="nlf-s-${hue}" stroke-width="2" stroke-opacity="0.5"/>` +
    op
      .map((o, i) => `<circle cx="${cx - 80 + i * 40}" cy="${cy}" r="12" class="nlf-f-${hue}" opacity="${o}"/>`)
      .join("")
  );
}

/** A picture cut into a 4 by 4 grid of patches; `hidden` patches are greyed out. */
function patches(cx: number, cy: number, hidden: number[], hue: Hue): string {
  const out: string[] = [];
  for (let i = 0; i < 16; i++) {
    const x = cx - 100 + (i % 4) * 52;
    const y = cy - 100 + Math.floor(i / 4) * 52;
    const hide = hidden.includes(i);
    out.push(
      `<rect x="${x}" y="${y}" width="44" height="44" rx="9" class="${hide ? "nlf-f-dot" : `nlf-f-${hue}`}" opacity="${hide ? 0.55 : 0.35 + ((i * 7) % 5) * 0.13}"/>`
    );
  }
  return out.join("");
}

// ── F1: next word against next state ─────────────────────────────────────────────────────────────

function wordVsWorld(): string {
  const top = 250;
  const h = 590;
  const lx = 44 + 242;
  const rx = 552 + 242;
  const words = ["The", "cup", "fell", "and"];
  let wx = lx - 196;
  const tokens = words
    .map((w) => {
      const width = w.length * 15 + 44;
      const s =
        `<rect x="${wx}" y="${top + 174}" width="${width}" height="52" rx="26" class="nlf-f-surface" filter="url(#nlf-shadow)"/>` +
        text(wx + width / 2, top + 200, w, { size: 25, weight: 700, tone: "violet" });
      wx += width + 10;
      return s;
    })
    .join("");
  const left =
    panel(44, top, 484, h, "An LLM", "violet", "reads text") +
    tokens +
    arrow(lx, top + 244, lx, top + 330, { tone: "violet", width: 5 }) +
    `<rect x="${lx - 110}" y="${top + 344}" width="220" height="76" rx="22" class="nlf-f-violet"/>` +
    text(lx, top + 382, "broke", { size: 34, weight: 800, extra: ' style="fill:#fff"' }) +
    text(lx, top + 470, "predicts", { size: 24, weight: 500, tone: "muted" }) +
    text(lx, top + 510, "the exact next word", { size: 28, weight: 800 });
  const right =
    panel(552, top, 484, h, "A JEPA", "teal", "watches video") +
    patches(rx, top + 220, [], "teal") +
    arrow(rx, top + 334, rx, top + 370, { tone: "teal", width: 5 }) +
    embed(rx, top + 410, "teal") +
    text(rx, top + 470, "predicts", { size: 24, weight: 500, tone: "muted" }) +
    text(rx, top + 510, "a summary of what's next", { size: 28, weight: 800 });
  return figure({
    height: 1020,
    title: "Two ways to predict",
    subtitle: "One guesses the next word. The other guesses the gist.",
    accent,
    body: left + right + pill(540, 926, "A JEPA never writes the word or paints the picture.", "accent", 25),
  });
}

// ── F2: how an LLM learns (recap) ────────────────────────────────────────────────────────────────

function llmTraining(): string {
  const rows: [string, string, IconName, Hue][] = [
    ["Read the words so far", "“The cup fell and …”", "file", "blue"],
    ["Guess the next word", "broke 61% · rolled 14% · sang 0.1%", "model", "violet"],
    ["Check the real next word", "the text says “broke”", "verify", "amber"],
    ["Nudge the weights", "so the right word is likelier next time", "tools", "ok"],
  ];
  const top = 300;
  const gap = 160;
  const body = rows
    .map(
      ([label, sub, ic, hue], i) =>
        card({ x: 580, y: top + i * gap, w: 840, h: 124, label, sub, hue, icon: ic, layout: "row", size: 30 }) +
        badge(100, top + i * gap, i + 1, hue) +
        (i > 0 ? arrow(100, top + (i - 1) * gap + 34, 100, top + i * gap - 34, { tone: "muted", width: 4 }) : "")
    )
    .join("");
  return figure({
    height: 990,
    title: "How an LLM learns",
    subtitle: "Four steps, repeated across a huge library of text.",
    accent,
    body: body + pill(540, top + 4 * gap - 34, "The answer key is free: it's the next word in the text.", "accent", 25),
  });
}

// ── F3: how a JEPA learns (build-up, 4 steps) ────────────────────────────────────────────────────

function jepaTraining(): string {
  const H = 1210;
  const gx = 170;
  const cx = 530;
  const ex = 900;
  const [ya, yb, yc] = [370, 610, 860];
  const captions = [
    "Take a picture and hide some of its patches. The model sees only what's left.",
    "An encoder turns the visible patches into a summary: a list of numbers called an embedding.",
    "A predictor guesses the summary of the hidden patches. It never draws the pixels.",
    "A second encoder sees the whole picture and gives the real summary. The two are compared.",
  ];
  const s1 = step(
    1,
    patches(gx, ya, [5, 6, 9, 10, 14, 15], "teal"),
    text(gx, ya - 130, "some patches hidden", { size: 24, weight: 700, tone: "muted" })
  );
  const s2 = step(
    2,
    arrow(gx + 114, ya, cx - 180, ya, { tone: "teal", width: 5 }),
    card({ x: cx, y: ya, w: 340, h: 116, label: "Encoder", hue: "teal", icon: "model", layout: "row", size: 30 }),
    arrow(cx + 180, ya, ex - 120, ya, { tone: "teal", width: 5 }),
    embed(ex, ya, "teal"),
    text(ex, ya - 58, "summary", { size: 24, weight: 700, tone: "teal" })
  );
  const s3 = step(
    3,
    arrow(ex, ya + 40, cx + 184, yb - 20, { tone: "violet", width: 5, bend: -40 }),
    card({ x: cx, y: yb, w: 340, h: 116, label: "Predictor", hue: "violet", icon: "spark", layout: "row", size: 30 }),
    arrow(cx + 180, yb + 14, ex - 120, yb + 14, { tone: "violet", width: 5 }),
    embed(ex, yb + 14, "violet"),
    text(ex, yb + 72, "its guess", { size: 24, weight: 700, tone: "violet" })
  );
  const s4 = step(
    4,
    patches(gx, yc, [], "amber"),
    text(gx, yc - 130, "the whole picture", { size: 24, weight: 700, tone: "muted" }),
    arrow(gx + 114, yc, cx - 180, yc, { tone: "amber", width: 5 }),
    card({
      x: cx,
      y: yc,
      w: 340,
      h: 116,
      label: "Target encoder",
      hue: "amber",
      icon: "model",
      layout: "row",
      size: 27,
    }),
    arrow(cx + 180, yc, ex - 120, yc, { tone: "amber", width: 5 }),
    embed(ex, yc, "amber"),
    text(ex, yc + 58, "the real summary", { size: 24, weight: 700, tone: "amber" }),
    `<path d="M${ex} ${yb + 112} V${yc - 40}" fill="none" class="nlf-s-risk" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 14"/>`,
    pill(ex, (yb + 112 + yc - 40) / 2, "compare", "risk", 24)
  );
  return figure({
    height: H,
    title: "How a JEPA learns",
    subtitle: "Hide a part, then predict its meaning, not its pixels.",
    accent,
    captionBand: true,
    body: s1 + s2 + s3 + s4 + captions.map((c, k) => stepOnly(k + 1, captionBand(H, c))).join(""),
  });
}

// ── F4: pixels or meaning ────────────────────────────────────────────────────────────────────────

function ballAndLeaves(): string {
  const top = 250;
  const h = 560;
  const cells: string[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 12; c++) {
      const o = 0.2 + (((r * 31 + c * 17 + r * c * 7) % 11) / 11) * 0.75;
      cells.push(
        `<rect x="${84 + c * 34}" y="${top + 130 + r * 34}" width="28" height="28" rx="5" class="nlf-f-risk" opacity="${o.toFixed(2)}"/>`
      );
    }
  }
  const facts = ["a ball", "rolling right", "slowing down"];
  const left =
    panel(44, top, 484, h, "Predict the pixels", "risk", "every leaf, every shadow") +
    cells.join("") +
    text(286, top + 474, "thousands of values,", { size: 26, weight: 700 }) +
    text(286, top + 510, "mostly unpredictable", { size: 26, weight: 700 });
  const right =
    panel(552, top, 484, h, "Predict the meaning", "teal", "only what matters") +
    facts.map((f, i) => pill(794, top + 180 + i * 84, f, "teal", 28)).join("") +
    text(794, top + 474, "a few numbers,", { size: 26, weight: 700 }) +
    text(794, top + 510, "the leaves left out", { size: 26, weight: 700 });
  return figure({
    height: 990,
    title: "Pixels or meaning?",
    subtitle: "One clip: a ball rolls under a tree on a windy day.",
    accent,
    body: left + right + pill(540, 896, "To know where the ball goes, the meaning is enough.", "accent", 25),
  });
}

// ── F5: the collapse problem ─────────────────────────────────────────────────────────────────────

function collapse(): string {
  const top = 250;
  const h = 470;
  const pts: [number, number, Hue][] = [
    [-120, -60, "teal"],
    [-90, -100, "teal"],
    [-140, -110, "teal"],
    [-70, -50, "teal"],
    [90, -80, "violet"],
    [130, -40, "violet"],
    [70, -30, "violet"],
    [140, -100, "violet"],
    [-20, 70, "amber"],
    [30, 100, "amber"],
    [-60, 110, "amber"],
    [10, 40, "amber"],
  ];
  const lc = [286, top + 270] as const;
  const rc = [794, top + 270] as const;
  const left =
    panel(44, top, 484, h, "Healthy", "ok", "different inputs, different places") +
    pts.map(([dx, dy, hue]) => `<circle cx="${lc[0] + dx}" cy="${lc[1] + dy}" r="15" class="nlf-f-${hue}"/>`).join("");
  const right =
    panel(552, top, 484, h, "Collapsed", "risk", "every input, the same place") +
    pts
      .map(
        ([, , hue], i) =>
          `<circle cx="${rc[0] + ((i % 3) - 1) * 5}" cy="${rc[1] + ((i % 4) - 1.5) * 4}" r="15" class="nlf-f-${hue}" opacity="0.8"/>`
      )
      .join("") +
    text(rc[0], rc[1] + 110, "easy to predict, and useless", { size: 25, weight: 700, tone: "risk" });
  const fy = top + h + 90;
  const fixes =
    card({
      x: 540,
      y: fy,
      w: W - 128,
      h: 120,
      label: "Fix 1: a slow-moving target encoder",
      sub: "I-JEPA and V-JEPA: the target changes more slowly than the learner",
      hue: "amber",
      icon: "clock",
      layout: "row",
      size: 28,
    }) +
    card({
      x: 540,
      y: fy + 140,
      w: W - 128,
      h: 120,
      label: "Fix 2: a rule that keeps points spread out",
      sub: "LeJEPA: one extra term in the training goal",
      hue: "teal",
      icon: "rules",
      layout: "row",
      size: 28,
    });
  return figure({
    height: 1090,
    title: "The collapse problem",
    subtitle: "The lazy way to win: give every input the same summary.",
    accent,
    body: left + right + fixes,
  });
}

// ── F6: the JEPA family ──────────────────────────────────────────────────────────────────────────

function familyTimeline(): string {
  const rows: [string, string, string, IconName, Hue][] = [
    ["2022", "The proposal", "LeCun's position paper sets out the idea", "file", "blue"],
    ["2023", "I-JEPA", "images: predict the hidden patches", "context", "teal"],
    ["2024", "V-JEPA", "video: trained on 2 million clips", "observe", "teal"],
    ["2025", "V-JEPA 2", "1 million hours of video; plans robot moves", "act", "violet"],
    ["2025", "LeJEPA", "simpler training, in about 50 lines of code", "code", "amber"],
    ["2026", "AMI Labs", "LeCun's new lab raises $1.03 billion", "coin", "pink"],
  ];
  const top = 300;
  const gap = 136;
  const out: string[] = [];
  rows.forEach(([year, label, sub, ic, hue], i) => {
    const y = top + i * gap;
    out.push(
      text(120, y, year, { size: 31, weight: 800, tone: hue }),
      card({ x: 612, y, w: 808, h: 114, label, sub, hue, icon: ic, layout: "row", size: 29 }),
      i > 0 ? arrow(120, y - gap + 30, 120, y - 30, { tone: "muted", width: 4 }) : ""
    );
  });
  return figure({
    height: 1150,
    title: "The JEPA family so far",
    subtitle: "From a position paper to a billion-dollar lab in four years.",
    accent,
    body: out.join(""),
  });
}

// ── F7: planning in summary space ────────────────────────────────────────────────────────────────

function planInLatent(): string {
  const rows: [string, string, string, Hue][] = [
    ["Try: move left", "imagined: cup further away", "far", "risk"],
    ["Try: move forward", "imagined: hand above the cup", "closer", "amber"],
    ["Try: reach down", "imagined: hand on the cup", "closest", "ok"],
  ];
  const top = 420;
  const gap = 170;
  const nowY = top + gap;
  const out: string[] = [
    text(150, nowY - 150, "now", { size: 25, weight: 700, tone: "muted" }),
    patches(150, nowY, [], "teal"),
    text(150, nowY + 136, "camera view", { size: 24, weight: 500, tone: "muted" }),
    text(560, 290, "imagine each move", { size: 25, weight: 700, tone: "muted" }),
    text(930, 290, "gap to goal", { size: 25, weight: 700, tone: "muted" }),
  ];
  rows.forEach(([label, sub, dist, hue], i) => {
    const y = top + i * gap;
    out.push(
      arrow(266, nowY + (i - 1) * 40, 324, y, { tone: "muted", width: 4 }),
      card({ x: 560, y, w: 460, h: 124, label, sub, hue, layout: "row", icon: "act", size: 27, tinted: i === 2 }),
      arrow(796, y, 846, y, { tone: hue, width: 4 }),
      pill(940, y, dist, hue, 26)
    );
  });
  return figure({
    height: 1090,
    title: "Planning without painting",
    subtitle: "A robot picks its next move by imagining summaries.",
    accent,
    body:
      out.join("") +
      pill(540, top + 3 * gap - 20, "Do the best move, look again, repeat.", "accent", 26) +
      text(540, top + 3 * gap + 54, "A sketch of V-JEPA 2's planner. The real one tries 800 moves per step.", {
        size: 24,
        weight: 500,
        tone: "muted",
      }),
  });
}

// ── F8: side by side ─────────────────────────────────────────────────────────────────────────────

function llmVsJepa(): string {
  const rows: [string, string, string][] = [
    ["Learns from", "text", "images and video"],
    ["Predicts", "the exact next word", "a summary of the hidden part"],
    ["Gives you", "text you can read", "numbers for another system"],
    ["Strong at", "language, code, knowledge", "seeing, physics, planning moves"],
    ["Today", "in everyday products", "mostly in research labs"],
  ];
  const top = 370;
  const gap = 134;
  const [ca, cb] = [520, 860];
  const out: string[] = [pill(ca, 270, "LLM", "violet", 28), pill(cb, 270, "JEPA", "teal", 28)];
  rows.forEach(([label, a, b], i) => {
    const y = top + i * gap;
    out.push(
      `<rect x="64" y="${y - 56}" width="${W - 128}" height="112" rx="24" class="nlf-f-surface" filter="url(#nlf-shadow)"/>`,
      `<rect x="64" y="${y - 56}" width="${W - 128}" height="112" rx="24" fill="none" class="nlf-s-accent" stroke-width="2" stroke-opacity="0.25"/>`,
      text(96, y, label, { size: 27, weight: 800, tone: "accent", anchor: "start" }),
      text(ca, y, a, { size: 26, weight: 600, wrapAt: 18 }),
      text(cb, y, b, { size: 26, weight: 600, wrapAt: 18 })
    );
  });
  return figure({
    height: 1120,
    title: "LLM and JEPA, side by side",
    subtitle: "Different training goals, different jobs.",
    accent,
    body: out.join("") + pill(540, top + 5 * gap - 20, "Not rivals for the same job, at least not yet.", "accent", 25),
  });
}

export const figures: FigureDef[] = [
  {
    slug: "word-vs-world",
    svg: wordVsWorld,
    meta: {
      title: "Two ways to predict",
      alt: "Two panels. An LLM reads the words 'The cup fell and' and predicts the exact next word, 'broke'. A JEPA watches video, shown as a grid of patches, and predicts a summary of what happens next, shown as a short strip of dots. A JEPA never writes the word or paints the picture.",
      caption: "An LLM predicts the exact next word; a JEPA predicts a summary of what comes next.",
      slide: "Every chatbot predicts the next word. JEPA predicts the gist of what happens next.",
    },
  },
  {
    slug: "llm-training",
    svg: llmTraining,
    meta: {
      title: "How an LLM learns",
      alt: "Four steps in order. One, read the words so far: 'The cup fell and'. Two, guess the next word: broke 61 percent, rolled 14 percent, sang 0.1 percent. Three, check the real next word: the text says 'broke'. Four, nudge the weights so the right word is likelier next time. The answer key is free: it's the next word in the text.",
      caption: "An LLM learns by guessing the next word and checking it against the real text.",
      slide: "How an LLM learns, in four steps: read, guess the next word, check, adjust.",
    },
  },
  {
    slug: "jepa-training",
    svg: jepaTraining,
    meta: {
      title: "How a JEPA learns",
      alt: "A picture is cut into a grid of patches and some are hidden. An encoder turns the visible patches into a summary, drawn as a strip of dots. A predictor uses that summary to guess the summary of the hidden patches. A target encoder sees the whole picture and produces the real summary. The guess and the real summary are compared.",
      caption: "A JEPA is graded on how well it predicts the summary of the hidden part, never on the pixels.",
      slide: "How a JEPA learns: hide part of a picture, then predict the meaning of what's missing.",
    },
  },
  {
    slug: "ball-and-leaves",
    svg: ballAndLeaves,
    meta: {
      title: "Pixels or meaning?",
      alt: "One clip of a ball rolling under a tree on a windy day, predicted two ways. Predicting the pixels means thousands of values, mostly unpredictable: every leaf and every shadow. Predicting the meaning means a few numbers: a ball, rolling right, slowing down, with the leaves left out.",
      caption: "Predicting pixels spends effort on leaves; predicting meaning keeps only the ball.",
      slide: "Nobody can predict every leaf in the wind. JEPA doesn't try.",
    },
  },
  {
    slug: "collapse",
    svg: collapse,
    meta: {
      title: "The collapse problem",
      alt: "Two panels of dots. Healthy: dots of three colours sit in three separate groups, so different inputs land in different places. Collapsed: every dot sits on the same spot, which is easy to predict and useless. Two fixes follow. Fix one, a slow-moving target encoder, used by I-JEPA and V-JEPA. Fix two, a rule that keeps points spread out, used by LeJEPA.",
      caption: "If every input gets the same summary, prediction is perfect and the model has learned nothing.",
      slide: "The trap in JEPA training: give every input the same answer and you're never wrong.",
    },
  },
  {
    slug: "family-timeline",
    svg: familyTimeline,
    meta: {
      title: "The JEPA family so far",
      alt: "A timeline. 2022: LeCun's position paper sets out the idea. 2023: I-JEPA, for images, predicts the hidden patches. 2024: V-JEPA, for video, trained on 2 million clips. 2025: V-JEPA 2, trained on 1 million hours of video, plans robot moves. 2025: LeJEPA, simpler training in about 50 lines of code. 2026: AMI Labs, LeCun's new lab, raises 1.03 billion dollars.",
      caption: "JEPA went from a position paper in 2022 to a funded lab in 2026.",
      slide: "The JEPA family in six steps, from a 2022 position paper to a $1.03 billion lab.",
    },
  },
  {
    slug: "plan-in-latent",
    svg: planInLatent,
    meta: {
      title: "Planning without painting",
      alt: "A robot's camera view on the left. Three candidate moves are imagined. Move left: the cup ends up further away, far from the goal. Move forward: the hand is above the cup, closer. Reach down: the hand is on the cup, closest, and this move is chosen. The robot does the best move, looks again and repeats. It is a sketch of V-JEPA 2's planner, which tries 800 moves per step.",
      caption: "The robot imagines the summary each move would lead to and picks the one nearest the goal.",
      slide: "How a JEPA robot plans: imagine each move, pick the one that lands nearest the goal.",
    },
  },
  {
    slug: "llm-vs-jepa",
    svg: llmVsJepa,
    meta: {
      title: "LLM and JEPA, side by side",
      alt: "A comparison table. Learns from: an LLM, text; a JEPA, images and video. Predicts: the exact next word; a summary of the hidden part. Gives you: text you can read; numbers for another system. Strong at: language, code and knowledge; seeing, physics and planning moves. Today: in everyday products; mostly in research labs.",
      caption: "LLMs and JEPAs differ in what they learn from, what they predict and where they're used.",
      slide: "LLM against JEPA in one table. Keep this one.",
    },
  },
];
