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

// Figures for Issue #4, fine-tuning (content/newsletter/2026/is-fine-tuning-dead.mdx). Cover palette: sand, so the
// accent is a warm brown. In every figure a prompt is blue, retrieval is teal and fine-tuning is violet.

const accent: Accent = {
  name: "tuning",
  light: { accent: "#8a6427", soft: "#f4ead6" },
  dark: { accent: "#e2c48a", soft: "#2d2414" },
};

// ── F1: three ways to change what a model does ───────────────────────────────────────────────────

function threeWays(): string {
  const cols: [string, string, IconName, Hue, string, string][] = [
    ["Prompt", "a briefing", "context", "blue", "what you ask", "minutes"],
    ["Retrieval", "a reference binder", "memory", "teal", "what it can read", "days"],
    ["Fine-tuning", "weeks of training", "model", "violet", "the model itself", "weeks"],
  ];
  const top = 250;
  const w = 310;
  const body = cols
    .map(([title, sub, ic, hue, changes, time], i) => {
      const x = 44 + i * 341;
      const cx = x + w / 2;
      return (
        panel(x, top, w, 560, title, hue, sub) +
        tile(ic, cx, top + 200, 46, hue) +
        text(cx, top + 310, "it changes", { size: 24, weight: 500, tone: "muted" }) +
        text(cx, top + 350, changes, { size: 28, weight: 800 }) +
        text(cx, top + 436, "time to try", { size: 24, weight: 500, tone: "muted" }) +
        text(cx, top + 476, time, { size: 28, weight: 800, tone: hue }) +
        badge(x + 12, top + 12, i + 1, hue)
      );
    })
    .join("");
  return figure({
    height: 990,
    title: "Three ways to change a model",
    subtitle: "Same goal, very different cost. Try them in this order.",
    accent,
    body: body + pill(540, 896, "Most problems are solved at step one or two.", "accent", 26),
  });
}

// ── F2: what fine-tuning changes (build-up, 3 steps) ─────────────────────────────────────────────

function grid(x0: number, y0: number, cols: number, rows: number, cls: string): string {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(`<rect x="${x0 + c * 26}" y="${y0 + r * 26}" width="18" height="18" rx="4" class="${cls}"/>`);
    }
  }
  return out.join("");
}

function whatChanges(): string {
  const H = 1180;
  const captions = [
    "A model is billions of numbers called weights. Full fine-tuning adjusts every one of them.",
    "LoRA freezes those weights and adds a small adapter: a few million new numbers beside them.",
    "Your examples train only the adapter: up to 10,000 times fewer numbers, in the LoRA paper.",
  ];
  const base = step(
    1,
    `<rect x="64" y="260" width="600" height="470" rx="30" class="nlf-f-blue-soft"/>`,
    `<rect x="64" y="260" width="600" height="470" rx="30" fill="none" class="nlf-s-blue" stroke-width="2.5" stroke-opacity="0.5"/>`,
    text(364, 312, "The base model", { size: 31, weight: 800, tone: "blue" }),
    grid(104, 350, 20, 13, "nlf-f-blue"),
    text(364, 770, "billions of weights", { size: 25, weight: 700, tone: "muted" })
  );
  const adapter = step(
    2,
    pill(364, 260, "frozen", "blue", 25),
    text(702, 500, "+", { size: 56, weight: 800, tone: "muted" }),
    `<rect x="740" y="380" width="276" height="250" rx="30" class="nlf-f-violet-soft"/>`,
    `<rect x="740" y="380" width="276" height="250" rx="30" fill="none" class="nlf-s-violet" stroke-width="2.5" stroke-opacity="0.6"/>`,
    text(878, 430, "An adapter", { size: 29, weight: 800, tone: "violet" }),
    grid(804, 474, 6, 4, "nlf-f-violet"),
    text(878, 668, "a few million", { size: 25, weight: 700, tone: "muted" })
  );
  const train = step(
    3,
    card({
      x: 300,
      y: 890,
      w: 440,
      h: 124,
      label: "Your examples",
      sub: "an input, and the output you want",
      hue: "amber",
      icon: "file",
      layout: "row",
      size: 28,
    }),
    arrow(520, 890, 878, 704, { tone: "amber", bend: 50, width: 5 }),
    pill(878, 340, "only this learns", "violet", 24)
  );
  return figure({
    height: H,
    title: "What fine-tuning changes",
    subtitle: "A prompt changes the input. Fine-tuning changes the model.",
    accent,
    captionBand: true,
    body: base + adapter + train + captions.map((c, k) => stepOnly(k + 1, captionBand(H, c))).join(""),
  });
}

// ── F3: the moving baseline ──────────────────────────────────────────────────────────────────────

function movingBaseline(): string {
  const x0 = 130;
  const x1 = 1010;
  const yBase = 800;
  // Base-model releases: a staircase that keeps climbing.
  const stairs: [number, number][] = [
    [x0, 700],
    [330, 620],
    [530, 540],
    [730, 430],
    [900, 340],
  ];
  let d = `M${x0} ${stairs[0]![1]}`;
  stairs.forEach(([x, y], i) => {
    if (i > 0) d += ` H${x} V${y}`;
  });
  d += ` H${x1}`;
  const tuneY = 500;
  const tuneX = 400;
  const body =
    `<rect x="${x0}" y="270" width="4" height="${yBase - 270}" rx="2" class="nlf-f-dot"/>` +
    `<rect x="${x0}" y="${yBase}" width="${x1 - x0}" height="4" rx="2" class="nlf-f-dot"/>` +
    text(x0 + 16, 290, "quality on your task", { size: 24, weight: 700, tone: "muted", anchor: "start" }) +
    text(x1, yBase + 40, "time", { size: 24, weight: 700, tone: "muted", anchor: "end" }) +
    `<path d="${d}" fill="none" class="nlf-s-blue" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>` +
    stairs
      .slice(1)
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" class="nlf-f-blue"/>`)
      .join("") +
    `<path d="M${tuneX} 620 V${tuneY} H${x1}" fill="none" class="nlf-s-violet" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="2 16"/>` +
    `<circle cx="${tuneX}" cy="${tuneY}" r="13" class="nlf-f-violet"/>` +
    text(tuneX - 20, tuneY - 44, "you fine-tune here", { size: 25, weight: 700, tone: "violet" }) +
    `<circle cx="730" cy="${tuneY}" r="20" fill="none" class="nlf-s-risk" stroke-width="5"/>` +
    pill(860, tuneY + 60, "overtaken", "risk", 25) +
    text(330, 740, "base models: a new one", { size: 25, weight: 700, tone: "blue", anchor: "start" }) +
    text(330, 774, "every few months", { size: 25, weight: 700, tone: "blue", anchor: "start" }) +
    text(x1, tuneY - 34, "your fine-tune: frozen", { size: 25, weight: 700, tone: "violet", anchor: "end" });
  return figure({
    height: 990,
    title: "The moving baseline",
    subtitle: "Your fine-tune stands still. The models around it don't.",
    accent,
    body: body + pill(540, 906, "An illustration, not data. The shape is the point.", "accent", 25),
  });
}

// ── F4: OpenAI closes self-serve fine-tuning ─────────────────────────────────────────────────────

function hostedWinddown(): string {
  const rows: [string, string, string, string, Hue][] = [
    ["May 7", "2026", "Closed to new organisations", "never fine-tuned before? no access", "amber"],
    ["July 2", "2026", "Closed to inactive ones", "no tuned-model use in the last 60 days", "amber"],
    ["Jan 6", "2027", "No new training jobs", "for any customer", "risk"],
  ];
  const top = 330;
  const gap = 172;
  const out: string[] = [];
  rows.forEach(([day, year, label, sub, hue], i) => {
    const y = top + i * gap;
    out.push(
      text(130, y - 18, day, { size: 31, weight: 800, tone: hue }),
      text(130, y + 22, year, { size: 25, weight: 700, tone: "muted" }),
      card({ x: 616, y, w: 800, h: 132, label, sub, hue, icon: "gate", layout: "row", size: 30 }),
      i > 0 ? arrow(130, y - gap + 54, 130, y - 54, { tone: "muted", width: 4 }) : ""
    );
  });
  return figure({
    height: 900,
    title: "OpenAI is closing self-serve tuning",
    subtitle: "Three dates from OpenAI's own deprecations page.",
    accent,
    body:
      out.join("") +
      pill(540, top + 3 * gap - 18, "Tuned models run on until their base model is retired.", "accent", 25),
  });
}

// ── F5: where it still wins ──────────────────────────────────────────────────────────────────────

function whereItWins(): string {
  const rows: [string, string, IconName, Hue][] = [
    ["A strict output format", "every reply must fit the same schema", "code", "blue"],
    ["A fixed house style", "a voice that a few examples can't pin down", "spark", "pink"],
    ["Narrow sorting at volume", "the same labels, millions of times", "chart", "teal"],
    ["A small, cheap, fast model", "a small model trained for one job", "bolt", "amber"],
    ["Data that must stay in-house", "open weights on your own servers", "guardrails", "violet"],
  ];
  const top = 300;
  const gap = 144;
  const body = rows
    .map(([label, sub, ic, hue], i) =>
      card({ x: 540, y: top + i * gap, w: W - 128, h: 124, label, sub, hue, icon: ic, layout: "row", size: 30 })
    )
    .join("");
  return figure({
    height: 1070,
    title: "Where fine-tuning still wins",
    subtitle: "Five jobs where training beats a longer prompt.",
    accent,
    body: body + pill(540, top + 5 * gap - 30, "The common thread: one narrow job, done the same way.", "accent", 25),
  });
}

// ── F6: the real cost (an iceberg) ───────────────────────────────────────────────────────────────

function trueCost(): string {
  const water = 430;
  const under = [
    "Collecting and labelling examples",
    "Building the eval set",
    "Hosting the tuned model",
    "Watching for drift",
    "Redoing it for each new base model",
  ];
  const body =
    `<rect x="40" y="${water}" width="1000" height="610" rx="30" class="nlf-f-blue-soft" opacity="0.6"/>` +
    `<path d="M540 250 L672 ${water} L408 ${water} Z" class="nlf-f-surface" filter="url(#nlf-shadow)"/>` +
    `<path d="M540 250 L672 ${water} L408 ${water} Z" fill="none" class="nlf-s-accent" stroke-width="3"/>` +
    `<path d="M240 ${water} L840 ${water} L990 720 L820 1010 L260 1010 L90 720 Z" class="nlf-f-surface" filter="url(#nlf-shadow)"/>` +
    `<path d="M240 ${water} L840 ${water} L990 720 L820 1010 L260 1010 L90 720 Z" fill="none" class="nlf-s-accent" stroke-width="3" stroke-opacity="0.6"/>` +
    `<rect x="40" y="${water - 3}" width="1000" height="6" rx="3" class="nlf-f-blue"/>` +
    text(700, 320, "The training run", { size: 30, weight: 800, anchor: "start", tone: "accent" }) +
    text(700, 362, "the part everyone prices", { size: 25, weight: 500, anchor: "start", tone: "muted" }) +
    under
      .map(
        (label, i) =>
          `<circle cx="258" cy="${520 + i * 96}" r="9" class="nlf-f-accent"/>` +
          text(286, 520 + i * 96, label, { size: 28, weight: 700, anchor: "start" })
      )
      .join("");
  return figure({
    height: 1160,
    title: "The real cost of a fine-tune",
    subtitle: "The training run is the small part you can see.",
    accent,
    body: body + pill(540, 1090, "Budget for all of it, again, at every base model change.", "accent", 25),
  });
}

// ── F7: sorting two million messages a month ─────────────────────────────────────────────────────

function routingMath(): string {
  const rows: [string, string, string, string, IconName, Hue, boolean][] = [
    ["Claude Opus 5, prompted", "10 examples per intent", "0.898", "$30,028", "model", "blue", false],
    ["Claude Haiku 4.5, prompted", "10 examples per intent", "0.899", "$4,370", "model", "blue", false],
    ["Fine-tuned small model", "ModernBERT, 395M weights, one GPU", "0.933", "$584", "bolt", "violet", true],
    ["No language model", "word counts and a linear classifier", "0.913", "$12", "code", "teal", false],
  ];
  const top = 350;
  const gap = 146;
  const left = 64;
  const w = W - 128;
  const colS = 716;
  const colC = 900;
  const out = [
    text(left + 30, 258, "how the job is done", { size: 25, weight: 700, tone: "muted", anchor: "start" }),
    text(colS, 258, "score", { size: 25, weight: 700, tone: "muted" }),
    text(colC, 258, "cost a month", { size: 25, weight: 700, tone: "muted" }),
  ];
  rows.forEach(([label, sub, score, cost, ic, hue, best], i) => {
    const y = top + i * gap;
    out.push(
      `<rect x="${left}" y="${y - 60}" width="${w}" height="120" rx="24" class="${best ? "nlf-f-violet-soft" : "nlf-f-surface"}" filter="url(#nlf-shadow)"/>`,
      `<rect x="${left}" y="${y - 60}" width="${w}" height="120" rx="24" fill="none" class="nlf-s-${hue}" stroke-width="2" stroke-opacity="${best ? 0.7 : 0.3}"/>`,
      tile(ic, left + 58, y, 30, hue),
      text(left + 110, y - 18, label, { size: 27, weight: 700, anchor: "start" }),
      text(left + 110, y + 20, sub, { size: 24, weight: 500, anchor: "start", tone: "muted" }),
      text(colS, y, score, { size: 34, weight: 800, tone: best ? "violet" : "ink" }),
      text(colC, y, cost, { size: 34, weight: 800, tone: best ? "violet" : "ink" })
    );
  });
  return figure({
    height: 1070,
    title: "Sorting 2 million messages a month",
    subtitle: "One public test, four ways to do the job.",
    accent,
    body:
      out.join("") +
      pill(540, top + 4 * gap - 18, "Break-even against Haiku: about 270,000 messages a month", "accent", 25) +
      text(540, top + 4 * gap + 50, "Banking77, 77 intents. Running cost only. Source: Azad Djan, Sept 2026.", {
        size: 24,
        weight: 500,
        tone: "muted",
      }),
  });
}

// ── F8: the decision ─────────────────────────────────────────────────────────────────────────────

function decisionTree(): string {
  const qs: [string, string, string, string, string, Hue][] = [
    ["Got an eval set?", "can you measure better or worse?", "no", "Build one first", "yes", "accent"],
    ["Missing facts?", "is the knowledge absent or out of date?", "yes", "Use retrieval", "no", "teal"],
    ["Prompt done properly?", "clear rules plus a few good examples", "no", "Fix the prompt", "yes", "blue"],
    ["Narrow and high volume?", "one fixed job, thousands of times a day", "no", "Keep prompting", "yes", "blue"],
  ];
  const x = 350;
  const cw = 572;
  const ch = 124;
  const top = 310;
  const gap = 186;
  const out: string[] = [];
  qs.forEach(([label, sub, side, outcome, down, hue], i) => {
    const y = top + i * gap;
    out.push(
      card({ x, y, w: cw, h: ch, label, sub, hue: "amber", icon: "target", layout: "row", size: 29 }),
      arrow(x + cw / 2 + 6, y, 742, y, { tone: hue, width: 4 }),
      text(692, y - 24, side, { size: 24, weight: 700, tone: "muted" }),
      pill(888, y, outcome, hue, 24),
      arrow(x, y + ch / 2 + 4, x, y + gap - ch / 2 - 6, { tone: "muted", width: 4 }),
      text(x + 44, y + gap / 2, down, { size: 24, weight: 700, tone: "muted" })
    );
  });
  const fy = top + 4 * gap;
  out.push(
    card({
      x,
      y: fy,
      w: cw,
      h: ch,
      label: "Fine-tune a small model",
      sub: "and re-test at every new base model",
      hue: "violet",
      icon: "model",
      layout: "row",
      size: 29,
      tinted: true,
    })
  );
  return figure({
    height: 1160,
    title: "Should you fine-tune?",
    subtitle: "Four questions. Fine-tuning is the last answer, not the first.",
    accent,
    body: out.join(""),
  });
}

export const figures: FigureDef[] = [
  {
    slug: "three-ways",
    svg: threeWays,
    meta: {
      title: "Three ways to change a model",
      alt: "Three panels in order. One, the prompt, a briefing: it changes what you ask and takes minutes to try. Two, retrieval, a reference binder: it changes what the model can read and takes days. Three, fine-tuning, weeks of training: it changes the model itself and takes weeks. Most problems are solved at step one or two.",
      caption:
        "A prompt changes the request, retrieval changes the reading material, and fine-tuning changes the model.",
      slide: "Three ways to change what an AI model does: a prompt, retrieval, fine-tuning. Try them in that order.",
    },
  },
  {
    slug: "what-changes",
    svg: whatChanges,
    meta: {
      title: "What fine-tuning changes",
      alt: "A large block of small squares stands for the base model's billions of weights. A small adapter block with a few squares is added beside it while the base model is frozen. Your examples, each an input and the output you want, flow into the adapter only: only the adapter learns.",
      caption: "Modern fine-tuning freezes the model and trains a small adapter beside it.",
      slide: "Fine-tuning today rarely retrains the whole model. It trains a tiny add-on called an adapter.",
    },
  },
  {
    slug: "moving-baseline",
    svg: movingBaseline,
    meta: {
      title: "The moving baseline",
      alt: "A chart of quality on your task over time. Base models form a rising staircase, with a new step every few months. Your fine-tune jumps above the staircase on the day you train it and then stays flat. A later base model climbs past it: the fine-tune is overtaken. The chart is an illustration, not data.",
      caption:
        "A fine-tune is frozen on the day you train it, while each new base model raises the bar it has to beat.",
      slide: "Your fine-tune is a flat line. Base models are a staircase. Sooner or later the staircase wins.",
    },
  },
  {
    slug: "hosted-winddown",
    svg: hostedWinddown,
    meta: {
      title: "OpenAI is closing self-serve tuning",
      alt: "A timeline of three dates from OpenAI's deprecations page. May 7, 2026: fine-tuning closed to organisations that had never fine-tuned. July 2, 2026: closed to organisations with no tuned-model use in the last 60 days. January 6, 2027: no new training jobs for any customer. Tuned models run on until their base model is retired.",
      caption: "OpenAI is closing its self-serve fine-tuning in three stages, ending on January 6, 2027.",
      slide: "OpenAI is closing self-serve fine-tuning. New customers were shut out in May 2026.",
    },
  },
  {
    slug: "where-it-wins",
    svg: whereItWins,
    meta: {
      title: "Where fine-tuning still wins",
      alt: "Five jobs where fine-tuning still wins. A strict output format: every reply must fit the same schema. A fixed house style: a voice that a few examples can't pin down. Narrow sorting at volume: the same labels, millions of times. A small, cheap, fast model: a small model trained for one job. Data that must stay in-house: open weights on your own servers. The common thread is one narrow job, done the same way.",
      caption: "Fine-tuning earns its place on narrow, repeated jobs, not on general intelligence.",
      slide: "Five jobs where fine-tuning still beats a longer prompt. The common thread: narrow and repeated.",
    },
  },
  {
    slug: "true-cost",
    svg: trueCost,
    meta: {
      title: "The real cost of a fine-tune",
      alt: "An iceberg. Above the water is the training run, the part everyone prices. Below the water are five larger costs: collecting and labelling examples, building the eval set, hosting the tuned model, watching for drift, and redoing it for each new base model.",
      caption: "The training run is the cheap, visible part; data, evals, hosting and re-training sit below the water.",
      slide: "The training run is the tip of the iceberg. Data, evals, hosting and re-training are the rest.",
    },
  },
  {
    slug: "routing-math",
    svg: routingMath,
    meta: {
      title: "Sorting 2 million messages a month",
      alt: "A table of four ways to sort bank messages into 77 intents, with score and running cost per month at 2 million messages. Claude Opus 5 prompted with 10 examples per intent: 0.898, 30,028 dollars. Claude Haiku 4.5 prompted the same way: 0.899, 4,370 dollars. A fine-tuned small model, ModernBERT on one GPU: 0.933, 584 dollars. No language model, word counts and a linear classifier: 0.913, 12 dollars. Break-even against Haiku is about 270,000 messages a month. Source: Azad Djan, September 2026.",
      caption:
        "On one narrow sorting task the small tuned model was the most accurate, and a classifier with no language model beat both prompted models.",
      slide:
        "2 million messages a month: a prompted model costs $4,370. A small fine-tuned one costs $584 and scores higher.",
    },
  },
  {
    slug: "decision-tree",
    svg: decisionTree,
    meta: {
      title: "Should you fine-tune?",
      alt: "A flowchart of four questions. Got an eval set? If no, build one first. Missing facts? If yes, use retrieval. Prompt done properly? If no, fix the prompt. Narrow and high volume? If no, keep prompting. If yes, fine-tune a small model and re-test at every new base model.",
      caption: "Four questions in order; only a narrow, high-volume job reaches fine-tuning.",
      slide: "Should you fine-tune? Four questions to ask first. Keep this one.",
    },
  },
];
