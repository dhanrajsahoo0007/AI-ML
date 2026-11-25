import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, n } from "@/components/diagrams/presets/production";
import { LLAMA7, loraAllLinear, FULL_FT_BYTES, gb } from "@/components/diagrams/presets/production-finetune";
import { blockBox, link, note } from "@/components/diagrams/presets/production-finetune";

// Which weights change (Fine-Tuning LLMs, Deep dive). A LLaMA-7B-shaped decoder (6.74 B parameters; presets/
// production-finetune.ts LLAMA7) drawn as four blocks: embeddings, attention, feed-forward, output head.
//   Full fine-tuning: all four are trained (orange). 6.74 B x 12 bytes (2 weight + 2 gradient + 8 Adam) = 80.9 GB, and
//   every task stores a full copy: 6.74 B x 2 bytes = 13.5 GB.
//   LoRA r = 16 on all linear layers: the four blocks stay frozen (neutral); small orange adapters sit beside the
//   attention and feed-forward matrices: 39,976,960 numbers (0.59 %), x 2 bytes = 80 MB per task.
// Steps: 1 full fine-tuning · 2 LoRA · 3 the cost of each. Nodes never move. Grid: four blocks x 30 + i x 190 (w 170, h 64);
// full row y 50; LoRA row y 200, adapters y 290 (h 44). Colours: frozen neutral, trained orange.

const names = [
  { id: "emb", label: "Embeddings", sub: "token table" },
  { id: "att", label: "Attention", sub: "q, k, v, o" },
  { id: "ffn", label: "Feed-forward", sub: "gate, up, down" },
  { id: "out", label: "Output head", sub: "scores per token" },
];
const X = (i: number) => 30 + i * 190;
const trainedCount = loraAllLinear(16);
const fullGb = gb(LLAMA7.params, FULL_FT_BYTES);
const copyGb = gb(LLAMA7.params, 2);
const adapterMb = (trainedCount * 2) / 1e6;

const shapes: LayoutShape[] = [
  note("t-full", 30, 18, 400, "Full fine-tuning: every weight changes", { tone: T.trained }),
  ...names.map((b) => blockBox(`f-${b.id}`, X(names.indexOf(b)), 50, 170, 64, b.label, T.trained, { sub: b.sub })),
  note("t-lora", 30, 168, 400, "LoRA: the weights stay frozen; small adapters are trained", {
    tone: T.frozen,
    step: 2,
  }),
  ...names.map((b) =>
    blockBox(`p-${b.id}`, X(names.indexOf(b)), 200, 170, 64, b.label, T.frozen, { sub: b.sub, step: 2 })
  ),
  blockBox("ad-att", X(1), 290, 170, 44, "Adapter", T.trained, { sub: "B·A beside each matrix", step: 2 }),
  blockBox("ad-ffn", X(2), 290, 170, 44, "Adapter", T.trained, { sub: "B·A beside each matrix", step: 2 }),
  link("l-att", "ad-att", "p-att", { step: 2 }),
  link("l-ffn", "ad-ffn", "p-ffn", { step: 2 }),
  note(
    "n-full1",
    30,
    372,
    760,
    `Trained: ${LLAMA7.params / 1e9} B numbers × ${FULL_FT_BYTES} bytes = ${fullGb.toFixed(1)} GB in training.`,
    {
      tone: T.trained,
      step: 3,
    }
  ),
  note(
    "n-full2",
    30,
    392,
    760,
    `Stored per task: ${LLAMA7.params / 1e9} B × 2 bytes = ${copyGb.toFixed(1)} GB, a full copy.`,
    {
      tone: T.trained,
      step: 3,
    }
  ),
  note(
    "n-lora1",
    30,
    420,
    760,
    `Trained: ${n(trainedCount)} numbers (${((trainedCount / LLAMA7.params) * 100).toFixed(2)} % of the model), rank 16.`,
    {
      step: 3,
    }
  ),
  note(
    "n-lora2",
    30,
    440,
    760,
    `Stored per task: ${n(trainedCount)} × 2 bytes = ${adapterMb.toFixed(0)} MB, an adapter file.`,
    {
      step: 3,
    }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Which weights change: full fine-tuning against LoRA",
  width: 800,
  height: 470,
  steps: [
    { title: "Full fine-tuning: every weight is trained" },
    { title: "LoRA: frozen weights, small adapters" },
    { title: "What each one costs" },
  ],
  shapes,
};

export default spec;
