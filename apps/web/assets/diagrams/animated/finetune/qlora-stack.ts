import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, n } from "@/components/diagrams/presets/production";
import {
  FULL_FT_BYTES,
  LLAMA65,
  LLAMA7,
  NF4_DQ_BITS,
  blockBox,
  gb,
  gbBits,
  link,
  loraAllLinear,
  note,
} from "@/components/diagrams/presets/production-finetune";

// "The QLoRA stack and its memory" on the LoRA, QLoRA & PEFT page (Architecture). Dettmers et al. (2023, arXiv
// 2305.14314): a frozen base stored in 4-bit NormalFloat (NF4), 16-bit LoRA adapters trained on top, double
// quantisation, paged optimisers; "regular 16-bit finetuning of a LLaMA 65B model requires more than 780 GB".
// Memory in GB (10^9 bytes), weights plus gradients plus optimiser state; activations and the KV-free forward pass extra.
//   Full 16-bit: 12 bytes per parameter (2 weight + 2 gradient + 8 Adam): 7 B → 84 GB; 65 B → 780 GB.
//   LoRA on a 16-bit base: base 2 bytes per parameter (14 GB; 130 GB) + adapters r = 64 on all linear layers,
//     12 bytes per adapter number: 7 B: 159,907,840 × 12 = 1.92 GB; 65 B: 799,539,200 × 12 = 9.59 GB.
//     → 7 B 15.9 GB; 65 B 139.6 GB.
//   QLoRA: base NF4 with double quantisation 4.127 bits per parameter (4 + 8/64 + 32/(64 × 256) = 4.127):
//     7 B 3.61 GB; 65 B 33.53 GB; + the same adapters → 5.5 GB; 43.1 GB. Fits a 48 GB GPU with about 5 GB left for
//     activations (the paper's 65 B result also uses gradient checkpointing and paged optimisers).
//   Double quantisation: constants per weight 32/64 = 0.5 bit → 8/64 + 32/(64·256) = 0.127 bit, saves 0.373 bit.
// Steps: 1 the stack · 2 double quantisation · 3 memory for 7 B and 65 B · 4 paged optimisers.
// Grid: left column x 30–400 (stack y 50–200, notes below); table x 440–800, label column 440, value columns 515, 620, 725.
// Colours: frozen base neutral, adapters orange, GPU teal, CPU memory violet (a store); too big for the GPU red.

const GPU = 48;
const r = 64;
const a7 = gb(loraAllLinear(r, LLAMA7), FULL_FT_BYTES);
const a65 = gb(loraAllLinear(r, LLAMA65), FULL_FT_BYTES);
const rows = [
  {
    id: "7b",
    label: "7 B",
    vals: [gb(7e9, FULL_FT_BYTES), gb(7e9, 2) + a7, gbBits(7e9, NF4_DQ_BITS) + a7],
  },
  {
    id: "65b",
    label: "65 B",
    vals: [gb(65e9, FULL_FT_BYTES), gb(65e9, 2) + a65, gbBits(65e9, NF4_DQ_BITS) + a65],
  },
];
const fmt = (v: number) => `${v >= 100 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1)} GB`;
const COLS = [
  { id: "full", x: 515, head: "Full\n16-bit" },
  { id: "lora", x: 620, head: "LoRA,\n16-bit base" },
  { id: "qlora", x: 725, head: "QLoRA,\n4-bit base" },
];

const shapes: LayoutShape[] = [
  blockBox("ad", 30, 50, 370, 60, "LoRA adapters, 16-bit, trained", T.trained, {
    sub: `r = ${r} on every linear layer: ${n(loraAllLinear(r, LLAMA7))} numbers in a 7 B model`,
  }),
  blockBox("base", 30, 140, 370, 60, "Base weights, NF4, frozen", T.frozen, {
    sub: "4 bits each, a block of 64 shares a constant",
  }),
  link("base>ad", "base", "ad"),
  note(
    "n-fwd",
    30,
    212,
    370,
    "Each layer: unpack a block to 16-bit, multiply,\ndrop it. Gradients reach the adapters only.",
    {
      step: 1,
      h: 36,
    }
  ),
  note(
    "n-dq",
    30,
    262,
    370,
    "Double quantisation shrinks the constants:\n32 ÷ 64 = 0.5 bit per weight  →  8 ÷ 64 + 32 ÷ (64 × 256) = 0.127 bit\nSaves 0.373 bit per weight, about 3 GB on 65 B.",
    { tone: T.trained, step: 2, h: 54 }
  ),
  blockBox("gpu", 30, 346, 140, 50, "GPU memory", PROD_TONE.compute, { sub: "optimiser state", step: 4 }),
  blockBox("cpu", 260, 346, 140, 50, "CPU memory", PROD_TONE.store, { sub: "pages parked here", step: 4 }),
  { ...link("gpu<>cpu", "gpu", "cpu", { step: 4, dashed: true }), packet: true },
  note(
    "n-page",
    30,
    404,
    370,
    "On a memory spike, optimiser pages move to CPU memory\nand come back when needed (NVIDIA unified memory).",
    {
      step: 4,
      h: 36,
    }
  ),
  note("t-head", 440, 20, 360, "GB to fine-tune, weights + gradients + optimiser (r = 64)", { step: 3 }),
];
COLS.forEach((c) => shapes.push(note(`ch-${c.id}`, c.x, 48, 100, c.head, { step: 3, h: 36 })));
rows.forEach((row, ri) => {
  const y = 98 + ri * 58;
  shapes.push(note(`rl-${row.id}`, 440, y + 12, 60, row.label, { step: 3 }));
  row.vals.forEach((v, ci) => {
    const over = v > GPU;
    shapes.push({
      id: `v-${row.id}-${COLS[ci].id}`,
      type: "cell",
      x: COLS[ci].x,
      y,
      w: 100,
      h: 42,
      label: fmt(v),
      tone: over ? PROD_TONE.failure : T.trained,
      fill: over ? "soft" : "pastel",
      step: 3,
      highlight: row.id === "65b" && ci === 2 ? true : undefined,
    });
  });
});
shapes.push(
  note(
    "t-limit",
    440,
    218,
    360,
    `Red: more than one ${GPU} GB GPU holds.\nQLoRA 65 B: ${fmt(rows[1].vals[2])}, about 5 GB left for activations.`,
    {
      step: 3,
      h: 36,
    }
  ),
  note(
    "t-basis",
    440,
    262,
    360,
    "Full: 12 bytes per number (2 weight + 2 gradient + 8 Adam).\nBase in 16-bit: 2 bytes. Adapters: 12 bytes per number.\nActivations are extra and grow with batch and length.",
    {
      step: 3,
      h: 54,
    }
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The QLoRA stack and its memory",
  width: 830,
  height: 450,
  steps: [
    { title: "A 4-bit frozen base, 16-bit adapters on top" },
    { title: "Double quantisation trims the constants" },
    { title: "Memory for a 7 B and a 65 B model" },
    { title: "Paged optimisers absorb spikes" },
  ],
  shapes,
};

export default spec;
