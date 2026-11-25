import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// Three caches that get confused (prompt-caching, Core concepts and Deep dive). One row each; columns: what a hit
// reuses, where it lives, who controls it. Rows appear one at a time, in the order a request meets them.
//   1 semantic cache (violet): a whole stored answer for a similar question; in your app or gateway (a vector index and
//     an answer store); you control the threshold, lifetime and purge. A hit skips the model call.
//   2 provider prompt cache (violet): the model's work on an identical prefix; on the provider's servers, per
//     organisation; you control prompt order, breakpoints and the lifetime option, the provider sets minimums and expiry.
//     A hit skips part of the prefill and is billed at a discount; the answer is still generated fresh.
//   3 engine KV or prefix cache (teal, compute): key-value blocks of tokens already computed; in one replica's GPU
//     memory; the engine's operator controls flags, block size and routing (you, if self-hosted).
// The provider's prompt cache is usually the same idea as row 3 offered as a priced feature; providers do not publish
// how, so the figure does not claim it. Layout: header row y 14; rows at y 52, 160, 268 (h 96); name x 20 (w 190),
// columns x 225 (w 210), 450 (w 210), 675 (w 185).

const COLS = [225, 450, 675] as const;
const COL_W = [210, 210, 185] as const;
const ROWS = [52, 160, 268] as const;

const WRAP = [27, 27, 23] as const;
/** Break a sentence into lines of at most `max` characters (the lint allows three lines). */
function wrap(text: string, max: number): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? line + " " + word : word;
  }
  lines.push(line);
  return lines.join("\n");
}

const heads = ["A hit reuses", "It lives in", "Who controls it"];
const shapes: LayoutShape[] = heads.map((h, i) => ({
  id: `head-${i}`,
  type: "text",
  x: COLS[i],
  y: 14,
  w: COL_W[i],
  h: 22,
  label: h,
  tone: PROD_TONE.infra,
}));

const rows = [
  {
    name: "Semantic cache",
    sub: "skips the model call",
    tone: PROD_TONE.store,
    cells: [
      "a whole stored answer, for a similar question",
      "your app or gateway: a vector index plus answers",
      "you: similarity threshold, lifetime, purge",
    ],
  },
  {
    name: "Prompt cache",
    sub: "skips part of the prefill, billed less",
    tone: PROD_TONE.store,
    cells: [
      "the work done on an identical prefix; the answer is fresh",
      "the provider's servers, apart per organisation",
      "you: order, breakpoints. Provider: minimum, expiry",
    ],
  },
  {
    name: "Engine KV cache",
    sub: "skips part of the prefill",
    tone: PROD_TONE.compute,
    cells: [
      "key-value blocks a replica already computed",
      "the GPU memory of one replica (vLLM, SGLang)",
      "the engine's operator: flags, routing",
    ],
  },
];

rows.forEach((r, i) => {
  const step = i + 1;
  shapes.push({
    id: `name-${step}`,
    type: "box",
    x: 20,
    y: ROWS[i],
    w: 190,
    h: 96,
    label: r.name,
    sub: r.sub,
    tone: r.tone,
    fill: "pastel",
    step,
    highlight: i === 1 || undefined,
  });
  r.cells.forEach((c, k) => {
    shapes.push({
      id: `cell-${step}-${k}`,
      type: "box",
      x: COLS[k],
      y: ROWS[i],
      w: COL_W[k],
      h: 96,
      label: wrap(c, WRAP[k]),
      tone: r.tone,
      fill: "paper",
      step,
      quiet: true,
    });
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three caches: semantic, prompt and engine",
  width: 880,
  height: 376,
  steps: [
    { title: "The semantic cache reuses an answer" },
    { title: "The prompt cache reuses a prefix" },
    { title: "The engine cache reuses key-value blocks" },
  ],
  shapes,
};

export default spec;
