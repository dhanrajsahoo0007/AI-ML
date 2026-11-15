import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { BATCH_ROWS } from "@/components/diagrams/presets/production-engine";

// Static against continuous batching (llm-inference-engine; reused on llm-serving-inference). Four batch slots on
// one engine, ten iterations; an iteration is one forward pass that advances every running request by one token.
// Each cell is one request in one slot for one iteration. The darker cell is a request's first iteration (prefill:
// the whole prompt at once); lighter cells add one token each. Ten requests, A to J, are all waiting at iteration 1.
//
// Steps: 1 a static batch starts A–D together · 2 slots that finish early sit idle until B, the longest, ends; E–H
// only start at iteration 9 · 3 a continuous batch refills each slot the iteration after it frees (E takes A's slot
// at 4) · 4 the count: busy slot-iterations and finished answers by iteration 8.
//
// Fact checks: iteration-level scheduling, where the scheduler runs one iteration, returns finished requests at once
// and lets a new request start after the current iteration (Yu et al., OSDI 2022, Orca, §3.2 S1); after each
// iteration completed requests leave the batch and new ones join (Kwon et al., 2023, arXiv 2309.06180, §2.3).
// Lengths are illustrative and the arithmetic is in BATCH_ROWS (presets/production-engine.ts):
//   iterations 1–8, static busy = 3 + 8 + 4 + 6 = 21 of 32 (66 %); continuous busy = 32 of 32 (100 %).
//   answers done by iteration 8: static 4 (A–D), continuous 6 (A–F). E starts at 9 (static) or 4 (continuous).
//
// Layout: label column x 20..104; ten columns of 40-wide cells on a 44 pitch from x 110 (to 546); a stats box per
// panel at x 576..806. Static panel rows from y 76, continuous from y 308, rows 34 apart.
// Tones (three plus neutral): requests orange (traffic), idle slots neutral, the counts lime (a metric), the one
// highlight on E's first cell in the continuous batch.

const W = 820;
const CELL = { w: 40, h: 28, pitch: 44, rowPitch: 34 } as const;
const GRID_X = 110;
const STATS = { x: 576, w: 230 } as const;
const PANEL = {
  static: { group: 16, head: 48, rows: 76 },
  continuous: { group: 248, head: 280, rows: 308 },
} as const;

const text = (id: string, x: number, y: number, w: number, label: string, step: number, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true }) as LayoutShape;

const busy = (rows: readonly string[], upTo: number) =>
  rows.reduce((sum, row) => sum + [...row.slice(0, upTo)].filter((c) => c !== ".").length, 0);

function grid(kind: "static" | "continuous", firstStep: number): LayoutShape[] {
  const p = PANEL[kind];
  const rows = BATCH_ROWS[kind];
  const out: LayoutShape[] = [text(`${kind}-iter`, 20, p.head, 84, "iteration", firstStep)];
  for (let c = 0; c < 10; c++)
    out.push(text(`${kind}-col-${c}`, GRID_X + c * CELL.pitch, p.head, CELL.w, String(c + 1), firstStep));
  rows.forEach((row, r) => {
    const y = p.rows + r * CELL.rowPitch;
    out.push(text(`${kind}-slot-${r}`, 20, y + 5, 84, `slot ${r + 1}`, firstStep));
    [...row].forEach((seq, c) => {
      const idle = seq === ".";
      const first = !idle && (c === 0 || row[c - 1] !== seq);
      // Static batching: E–H (columns 9 and 10) and the idle cells arrive in step 2, with the waiting they cause.
      const step = kind === "static" && (idle || c >= 8) ? 2 : firstStep;
      out.push({
        id: `${kind}-${r}-${c}`,
        type: "cell",
        x: GRID_X + c * CELL.pitch,
        y,
        w: CELL.w,
        h: CELL.h,
        label: idle ? "idle" : seq,
        tone: idle ? PROD_TONE.infra : PROD_TONE.traffic,
        fill: idle ? "paper" : first ? undefined : "pastel",
        weight: first ? 0.75 : undefined,
        step,
        quiet: true,
        highlight: kind === "continuous" && seq === "E" && first ? true : undefined,
      });
    });
  });
  return out;
}

const staticBusy = busy(BATCH_ROWS.static, 8); // 21
const contBusy = busy(BATCH_ROWS.continuous, 8); // 32
const pct = (n: number) => Math.round((n / 32) * 100);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Static batching waits for the longest request; continuous batching refills a slot at once",
  width: W,
  height: 520,
  steps: [
    { title: "A static batch starts four requests together" },
    { title: "Finished slots sit idle until the longest one ends" },
    { title: "A continuous batch refills a slot the moment it frees" },
    { title: "Count the work done by iteration 8" },
  ],
  groups: [
    { id: "static", title: "Static batching", tone: PROD_TONE.infra, x: 12, y: PANEL.static.group, w: 800, h: 210 },
    {
      id: "continuous",
      title: "Continuous batching",
      tone: PROD_TONE.infra,
      x: 12,
      y: PANEL.continuous.group,
      w: 800,
      h: 210,
    },
  ],
  shapes: [
    ...grid("static", 1),
    {
      id: "static-start",
      type: "text",
      x: STATS.x,
      y: PANEL.static.rows,
      w: STATS.w,
      h: 54,
      label: "A, B, C and D start together.\nE to J wait in the queue until\nthe whole batch is done.",
      tone: "neutral",
    },
    {
      id: "static-stats",
      type: "box",
      x: STATS.x,
      y: PANEL.static.rows + 70,
      w: STATS.w,
      h: 66,
      label: `${staticBusy} of 32 busy (${pct(staticBusy)} %)\n4 answers done by iteration 8\nE starts at iteration 9`,
      sub: "iterations 1 to 8",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 2,
    },
    ...grid("continuous", 3),
    {
      id: "cont-start",
      type: "text",
      x: STATS.x,
      y: PANEL.continuous.rows,
      w: STATS.w,
      h: 54,
      label: "Each slot refills the next\niteration: E at 4, F at 5,\nG at 7, then H, I and J at 9.",
      tone: "neutral",
      step: 3,
    },
    {
      id: "cont-stats",
      type: "box",
      x: STATS.x,
      y: PANEL.continuous.rows + 70,
      w: STATS.w,
      h: 66,
      label: `${contBusy} of 32 busy (${pct(contBusy)} %)\n6 answers done by iteration 8\nE starts at iteration 4`,
      sub: "iterations 1 to 8",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 4,
    },
    {
      id: "legend",
      type: "text",
      x: 20,
      y: 472,
      w: W - 40,
      h: 36,
      label:
        "One column is one forward pass for every request in the batch. Darker cell: a request's first iteration\n" +
        "(prefill, the whole prompt at once); lighter cells add one token each. Lengths are illustrative.",
      tone: "neutral",
    },
  ],
};

export default spec;
