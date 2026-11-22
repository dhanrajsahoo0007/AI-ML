import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { PCACHE_PROMPT } from "@/components/diagrams/presets/production-pcache";

// A stable prefix is cached; one early edit invalidates everything after it (prompt-caching, Core concepts). Brightpost's
// prompt is three blocks, in order: instructions (200 tokens), tool definitions and refund policy (1,000), then the
// retrieved articles and the customer's question (1,000, different every time). The fixed part is 200 + 1,000 = 1,200.
//   Step 1, the first request: the fixed 1,200 tokens are written to the cache (violet), the rest is new (orange).
//   Step 2, the second request, 0.4 s later: the same 1,200 tokens are read from the cache; only 1,000 are new.
//   Step 3, someone adds today's date to the first line of the instructions: the first block no longer matches, so it
//     and every block after it miss (red) and all 2,200 tokens are processed again. A match runs from the start of the
//     prompt and stops at the first difference.
// Block widths are not to scale (a 15-token question would be a sliver). Rows at y 34, 148 and 262; blocks at
// x 30 (w 164), 204 (w 230), 444 (w 256). Colours: cache violet (a store), new text orange (the prompt), a miss red.

const ROWS = [34, 148, 262] as const;
const X = [30, 204, 444] as const;
const W = [164, 230, 256] as const;

const label = (
  id: string,
  y: number,
  text: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x: 30,
  y,
  w: Math.round(text.length * 6.6),
  h: 20,
  label: text,
  tone,
  step,
  quiet: true,
});

const names = ["Instructions", "Tools + refund policy", "Retrieved articles + question"] as const;
const tokens = [PCACHE_PROMPT.instructions, PCACHE_PROMPT.tools, PCACHE_PROMPT.changing] as const;

const shapes: LayoutShape[] = [];
const rows = [
  { step: 1, title: "Request 1: the cache is empty, so the fixed part is written", cached: true, miss: false },
  { step: 2, title: "Request 2, 0.4 s later: the fixed part is read, not recomputed", cached: true, miss: false },
  { step: 3, title: "A date added to line 1: nothing matches, everything is recomputed", cached: false, miss: true },
] as const;

rows.forEach((r, i) => {
  const y = ROWS[i];
  shapes.push(label(`head-${r.step}`, y - 26, r.title, r.step, r.miss ? PROD_TONE.failure : PROD_TONE.infra));
  names.forEach((name, b) => {
    const fixed = b < 2;
    const tone = r.miss ? PROD_TONE.failure : fixed ? PROD_TONE.store : PROD_TONE.traffic;
    const state = r.miss
      ? b === 0
        ? "edited"
        : "miss"
      : fixed
        ? r.step === 1
          ? "written"
          : "read from cache"
        : "new";
    shapes.push({
      id: `b-${r.step}-${b}`,
      type: "box",
      x: X[b],
      y,
      w: W[b],
      h: 62,
      label: name,
      sub: `${n(tokens[b])} tokens · ${state}`,
      tone,
      fill: "pastel",
      step: r.step,
      quiet: true,
      highlight: (r.step === 2 && b === 1) || (r.step === 3 && b === 0) || undefined,
    });
  });
});

shapes.push(
  {
    id: "note-1",
    type: "text",
    x: 720,
    y: ROWS[0] + 6,
    w: 150,
    h: 50,
    label: `Fixed part: ${n(PCACHE_PROMPT.fixed)} tokens\nwritten once`,
    tone: PROD_TONE.store,
    step: 1,
    quiet: true,
  },
  {
    id: "note-2",
    type: "text",
    x: 720,
    y: ROWS[1] + 6,
    w: 150,
    h: 50,
    label: `${n(PCACHE_PROMPT.fixed)} read at a\ndiscount, ${n(PCACHE_PROMPT.changing)} new`,
    tone: PROD_TONE.store,
    step: 2,
    quiet: true,
  },
  {
    id: "note-3",
    type: "text",
    x: 720,
    y: ROWS[2] + 6,
    w: 150,
    h: 50,
    label: `All ${n(PCACHE_PROMPT.fixed + PCACHE_PROMPT.changing)} tokens\nprocessed again`,
    tone: PROD_TONE.failure,
    step: 3,
    quiet: true,
  },
  {
    id: "foot",
    type: "text",
    x: 30,
    y: 336,
    w: 560,
    h: 20,
    label: "Block widths are not to scale. A match starts at the first token and stops at the first difference.",
    tone: PROD_TONE.infra,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A stable prefix is cached; one early edit invalidates everything after it",
  width: 880,
  height: 366,
  steps: [
    { title: "The first request writes the fixed part" },
    { title: "The second request reads it" },
    { title: "An early edit breaks the match" },
  ],
  shapes,
};

export default spec;
