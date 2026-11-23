import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// From the whole corpus to one page of 10 (tiktok, Deep dive 1 "Two-stage retrieval and ranking").
// Six rows, each narrower than the one above: the eligible corpus · retrieval keeps 2,000 candidates from five sources
// · the seen filter and rules leave 1,500 · a light ranker keeps 200 · a heavy ranker scores those 200 · a rerank picks
// a page of 10. On the right of each row: the time it may spend and the count it handles.
// Steps: 1 retrieval (corpus → 2,000) · 2 filter and the light ranker (→ 1,500 → 200) · 3 the heavy ranker · 4 the
// rerank to a page of 10.
// Working (round numbers chosen to size the system): corpus 500,000,000 videos posted in the last 90 days;
// 500,000,000 ÷ 2,000 = 1 kept in 250,000. Sources: ANN 1,000 + followed 300 + trending 300 + new videos 200 +
// local-language fresh 200 = 2,000. The filter drops 25 %: 2,000 × 0.75 = 1,500. The light ranker keeps
// 200 ÷ 1,500 ≈ 13 %. The heavy ranker predicts 4 outcomes (watch time, finish, like, share): 200 × 4 = 800
// predictions. Times are the budget of tiktok/latency-budget: 40 + 10 + 20 + 80 + 10 ms.
// Grid: boxes centred on x 320, 52 high, 34 apart; widths 600, 500, 420, 340, 280, 220. Notes start at x 650.
// Colours (PATTERN_TONE): corpus neutral (infra), retrieval blue (data), the filter lime (a check), both rankers teal
// (compute), the page green (what the figure is about). Four tones plus neutral.

const CX = 320;
const H = 52;
const PITCH = H + 34;
const TOP = 16;
const NOTE_X = 650;

const rows = [
  {
    id: "corpus",
    label: "500,000,000 videos",
    sub: "eligible corpus: posted in the last 90 days",
    w: 600,
    tone: PATTERN_TONE.infra,
    note: "new videos join within minutes",
    step: 1,
  },
  {
    id: "retrieval",
    label: "2,000 candidates",
    sub: "retrieval: 5 sources in parallel",
    w: 500,
    tone: PATTERN_TONE.data,
    note: "40 ms · 1 kept in 250,000",
    step: 1,
  },
  {
    id: "filter",
    label: "1,500 left",
    sub: "seen filter, blocks, duplicates",
    w: 420,
    tone: PATTERN_TONE.check,
    note: "10 ms · 25 % dropped",
    step: 2,
  },
  {
    id: "light",
    label: "200 candidates",
    sub: "light ranker: dot products",
    w: 340,
    tone: PATTERN_TONE.compute,
    note: "20 ms · 1,500 cheap scores",
    step: 2,
  },
  {
    id: "heavy",
    label: "200 ranked",
    sub: "heavy ranker: 4 predictions",
    w: 280,
    tone: PATTERN_TONE.compute,
    note: "80 ms · 800 predictions",
    step: 3,
  },
  {
    id: "page",
    label: "A page of 10",
    sub: "rerank: diversity, explore",
    w: 220,
    tone: PATTERN_TONE.pattern,
    note: "10 ms · rules, not a model",
    step: 4,
  },
];

const shapes: LayoutShape[] = [];
rows.forEach((r, i) => {
  const y = TOP + i * PITCH;
  shapes.push({
    id: r.id,
    type: "box",
    x: CX - r.w / 2,
    y,
    w: r.w,
    h: H,
    label: r.label,
    sub: r.sub,
    tone: r.tone,
    fill: "pastel",
    highlight: r.id === "page" || undefined,
    step: r.step,
  });
  shapes.push({
    id: `${r.id}-note`,
    type: "text",
    x: NOTE_X,
    y: y + H / 2 - 9,
    w: 200,
    h: 18,
    label: r.note,
    tone: PATTERN_TONE.infra,
    step: r.step,
  });
  if (i > 0) {
    shapes.push({
      id: `${r.id}-in`,
      type: "arrow",
      x: 0,
      y: 0,
      from: rows[i - 1].id,
      to: r.id,
      step: r.step,
    });
  }
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "From the corpus to a page of 10",
  width: 860,
  height: TOP + rows.length * PITCH - 34 + 16,
  steps: [
    { title: "Retrieval: 2,000 from 500,000,000" },
    { title: "Filter, then a light ranker keeps 200" },
    { title: "A heavy ranker scores 200" },
    { title: "Rerank to a page of 10" },
  ],
  shapes,
};

export default spec;
