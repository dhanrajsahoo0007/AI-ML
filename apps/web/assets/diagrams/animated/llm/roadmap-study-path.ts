import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROADMAP_BRANCH, ROADMAP_PREREQS, ROADMAP_TIERS } from "@/components/diagrams/presets/llm-roadmap";

// The study path through the GenAI hub (genai-interview-roadmap, Architecture). One row per tier, in the order the
// page gives (1 Orientation, 2 Foundations, 3 Building blocks, 4 Running it), then the Multimodal & Voice branch. Each
// tile is one of the hub's groups (content/sections.yaml `groups`, built from _index.yaml categories). Under a tile,
// small chips name the pages from the page's prerequisites table; an arrow runs from the page to read first to the
// page that needs it. Tiers, groups and edges come from presets/llm-roadmap.ts, which also records the check that
// every page sits in the group drawn for it. No numbers.
//
// Layout (880 × 718): four columns 195 wide from x 20, 215 apart (gaps 20, so the gap centres x 225, 440 and 655 are
// the arrow lanes). A tier heading, then tiles 52 high, then chips 36 high on a 54 pitch, inset 12 from the tile so an
// arrow can enter a chip's side from a lane. RAG & Knowledge spans columns 1 and 2 with its chips in two sub-columns;
// RAG Evaluation sits centred on lane x 225 so the arrow from LLM Evaluation Fundamentals rises straight into it.
// Routes: Self-Attention Explained → right to lane 440 → down to tier 4 → left into LLM Inference Engine; Tool Use &
// Function Calling → right to lane 655 → down → right into Prompt Injection & Jailbreaks; LLM Evaluation
// Fundamentals → right to lane 225 → up into RAG Evaluation. The one crossing: the short Agent Architectures →
// Agentic RAG arrow crosses lane 440 at right angles.
// Colour: one tone per tier (violet, green, blue, teal) and neutral for the branch; tiles pastel, chips soft, arrows
// neutral. Start Here is the one highlight: read it first and return to it after each group.

const COL_X = [20, 235, 450, 665];
const COL_W = 195;
const INSET = 12;
const CHIP_W = COL_W - 2 * INSET;
const TILE_H = 52;
const CHIP_H = 36;
const CHIP_PITCH = 54;
const HEAD_H = 18;
const ROW_GAP = 22;
const LANE = { a: 225, b: 440, c: 655 };

const TIER_TONE: Record<number, LayoutTone> = { 1: "violet", 2: "green", 3: "blue", 4: "teal" };

type Group = (typeof ROADMAP_TIERS)[number]["groups"][number] | typeof ROADMAP_BRANCH.name;

/** Where each group's tile sits: its column, how many columns it spans, a two-line label where one would crowd it. */
const TILE: Record<Group, { col: number; span?: number; label?: string; sub: string }> = {
  "Start Here": { col: 0, sub: "the map: read first" },
  "LLM Foundations": { col: 0, sub: "transformer, training, decoding" },
  "RAG & Knowledge": { col: 0, span: 2, sub: "the model reads retrieved data" },
  "AI Agents & Engineering": { col: 2, sub: "the model calls tools" },
  "Fine-Tuning & Adaptation": { col: 3, sub: "the weights change" },
  Evaluation: { col: 0, sub: "first: measure quality" },
  "Inference & Serving": { col: 1, sub: "speed and cost" },
  "LLMOps & Observability": { col: 2, sub: "see it, ship changes" },
  "Safety, Security & Governance": { col: 3, label: "Safety, Security\n& Governance", sub: "guardrails, attacks" },
  "Multimodal & Voice": { col: 1, sub: "assumes tiers 2 and 4" },
};

/** Each chip: its row under the tile (0 is the first), an x when it is not the tile's inset, a two-line label. */
const RAG_L = COL_X[0] + INSET;
const RAG_R = COL_X[1] + INSET;
const CHIP: Record<string, { row: number; x?: number; label?: string }> = {
  "Self-Attention Explained": { row: 0, label: "Self-Attention\nExplained" },
  "RAG Fundamentals": { row: 0, x: RAG_L },
  "Agentic RAG": { row: 0, x: RAG_R },
  Embeddings: { row: 1, x: RAG_L },
  "Vector Databases": { row: 1, x: RAG_R },
  "RAG Evaluation": { row: 2, x: LANE.a - CHIP_W / 2 },
  "Agent Architectures": { row: 0 },
  "Tool Use & Function Calling": { row: 1, label: "Tool Use &\nFunction Calling" },
  "Fine-Tuning LLMs": { row: 0 },
  "LoRA, QLoRA & PEFT": { row: 1 },
  "LLM Evaluation Fundamentals": { row: 0, label: "LLM Evaluation\nFundamentals" },
  "LLM Inference Engine": { row: 0 },
  "Prompt Injection & Jailbreaks": { row: 0, label: "Prompt Injection\n& Jailbreaks" },
};

// Text shapes are centred in their box, so the box is sized to the text: a per-character estimate of the 12.5 px
// label face, scaled to widths measured on a spec-shot render (so headings and legend lines start at their x).
const textW = (s: string) =>
  1.08 *
  [...s].reduce(
    (a, ch) =>
      a +
      (/[ilj'.,:·!|]/.test(ch)
        ? 3
        : /[frt]/.test(ch)
          ? 4.2
          : ch === " "
            ? 3.4
            : /[mw]/.test(ch)
              ? 9.6
              : /[MW]/.test(ch)
                ? 10
                : /[A-Z]/.test(ch)
                  ? 8
                  : /[0-9]/.test(ch)
                    ? 7
                    : 6.6),
    0
  );

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const text = (id: string, x: number, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: Math.ceil(textW(label)),
  h: HEAD_H,
  label,
  tone: "neutral",
});

// Which pages hang under which group (from the edges), so each tier row is as tall as its tallest chip column.
const pagesOf = new Map<Group, string[]>();
for (const e of ROADMAP_PREREQS) {
  for (const end of [e.from, e.to]) {
    const list = pagesOf.get(end.group) ?? [];
    if (!list.includes(end.page)) list.push(end.page);
    pagesOf.set(end.group, list);
  }
}

const rows = [
  ...ROADMAP_TIERS.map((t) => ({
    id: `tier-${t.n}`,
    head: `${t.n} · ${t.name}`,
    tone: TIER_TONE[t.n],
    groups: t.groups as readonly Group[],
  })),
  {
    id: "branch",
    head: "Branch · only if the role needs it",
    tone: "neutral" as LayoutTone,
    groups: [ROADMAP_BRANCH.name] as readonly Group[],
  },
];

const shapes: LayoutShape[] = [];
const chipCentre = new Map<string, [number, number]>();
let y = 4;
for (const row of rows) {
  shapes.push(text(`${row.id}-head`, COL_X[0], y, row.head));
  const tileY = y + HEAD_H + 4;
  const chipY0 = tileY + TILE_H + 10;
  let chipRows = 0;
  for (const g of row.groups) {
    const t = TILE[g];
    const x = COL_X[t.col];
    const w = t.span ? COL_X[t.col + t.span - 1] + COL_W - x : COL_W;
    shapes.push({
      id: `tile-${slug(g)}`,
      type: "cell",
      x,
      y: tileY,
      w,
      h: TILE_H,
      label: t.label ?? g,
      sub: t.sub,
      tone: row.tone,
      fill: "pastel",
      highlight: g === "Start Here" || undefined,
    });
    for (const page of pagesOf.get(g) ?? []) {
      const c = CHIP[page];
      const cx = c.x ?? x + INSET;
      const cy = chipY0 + c.row * CHIP_PITCH;
      chipRows = Math.max(chipRows, c.row + 1);
      shapes.push({
        id: `chip-${slug(page)}`,
        type: "cell",
        x: cx,
        y: cy,
        w: CHIP_W,
        h: CHIP_H,
        label: c.label ?? page,
        tone: row.tone,
        fill: "soft",
      });
      chipCentre.set(page, [cx + CHIP_W / 2, cy + CHIP_H / 2]);
    }
  }
  y = (chipRows ? chipY0 + (chipRows - 1) * CHIP_PITCH + CHIP_H : tileY + TILE_H) + ROW_GAP;
}

// Arrow routes through the lanes (see the header); pages in one row of one tile join with a straight arrow.
const at = (page: string) => chipCentre.get(page)!;
const ROUTE: Record<string, (from: [number, number], to: [number, number]) => [number, number][]> = {
  "Self-Attention Explained": (f, t) => [
    [LANE.b, f[1]],
    [LANE.b, t[1]],
  ],
  "Tool Use & Function Calling": (f, t) => [
    [LANE.c, f[1]],
    [LANE.c, t[1]],
  ],
  "LLM Evaluation Fundamentals": (f, t) => [
    [LANE.a, f[1]],
    [LANE.a, t[1] + CHIP_H],
  ],
};
for (const e of ROADMAP_PREREQS) {
  const route = ROUTE[e.from.page];
  shapes.push({
    id: `arrow-${slug(e.from.page)}-${slug(e.to.page)}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `chip-${slug(e.from.page)}`,
    to: `chip-${slug(e.to.page)}`,
    via: route ? route(at(e.from.page), at(e.to.page)) : undefined,
  });
}

// Legend in the empty right of tier 1.
shapes.push(
  text("legend-1", COL_X[1] + 20, 30, "Tiles: the hub's groups, one row per tier."),
  text("legend-2", COL_X[1] + 20, 52, "Chips: pages from the prerequisites table."),
  text("legend-3", COL_X[1] + 20, 74, "Arrow: from the page to read first to the page that needs it.")
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The study path: the hub's groups by tier, with the prerequisites that cross them",
  width: 880,
  height: Math.ceil(y - ROW_GAP + 10),
  shapes,
};

export default spec;
