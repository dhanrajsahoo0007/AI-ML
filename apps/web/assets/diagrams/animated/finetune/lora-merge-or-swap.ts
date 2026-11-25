import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { LLAMA7, blockBox, gb, link, loraAllLinear, note } from "@/components/diagrams/presets/production-finetune";

// "Merge the adapter, or keep it separate" on the LoRA, QLoRA & PEFT page (Deep dive). Two ways to serve a LoRA.
//   Merge (Hu et al. 2021): W' = W + (α/r)·B·A, same shape as W, so no extra latency; one full model per task.
//   Swap (S-LoRA, Sheng et al. 2023, arXiv 2311.03285; vLLM LoRA support): one base in GPU memory, adapters selected
//   per request by name. The S-LoRA abstract: thousands of adapters on one GPU, up to 4× the throughput of vLLM with
//   naive LoRA support and of HuggingFace PEFT.
// Arithmetic for a 7 B model (LLaMA-7B shape) with r = 8 on all linear layers:
//   adapter = 19,988,480 numbers × 2 bytes = 39.98 MB ≈ 40 MB; base = 6.74 B × 2 = about 13.5 GB (written 14 GB, 7 B × 2).
//   100 merged copies: 100 × 14 = 1,400 GB. One base + 100 adapters: 14 + 100 × 0.04 = 18 GB.
// Steps: 1 merge · 2 swap · 3 the memory for 100 tasks.
// Grid: merge lane x 30–400, swap lane x 450–840, notes y 300+. Colours: frozen base neutral, adapters orange,
// merged model green, the GPU engine teal (a zone), the router neutral.

const adapterMB = (loraAllLinear(8, LLAMA7) * 2) / 1e6;
const baseGB = gb(7e9, 2);
const tasks = 100;
const merged = tasks * baseGB;
const swapped = baseGB + (tasks * adapterMB) / 1e3;

const shapes: LayoutShape[] = [
  note("h-merge", 30, 16, 370, "Merge: fold the adapter into the weights", { step: 1 }),
  blockBox("base", 30, 60, 150, 56, "Base W", T.frozen, { sub: `${baseGB} GB at 16-bit` }),
  blockBox("ad", 250, 60, 150, 56, "Adapter B·A", T.trained, { sub: `${Math.round(adapterMB)} MB at r = 8` }),
  blockBox("merged", 120, 170, 190, 56, "Merged W′", PROD_TONE.model, { sub: `${baseGB} GB, one model`, step: 1 }),
  link("base>merged", "base", "merged"),
  link("ad>merged", "ad", "merged"),
  note("n-merge", 30, 240, 370, "W′ = W + (α ÷ r)·B·A has the shape of W,\nso serving adds no latency.", {
    step: 1,
    h: 36,
  }),

  note("h-swap", 450, 16, 390, "Swap: one base, adapters chosen per request", { step: 2 }),
  blockBox("router", 440, 62, 100, 52, "Router", PROD_TONE.infra, { sub: "picks by name", step: 2 }),
  blockBox("sbase", 610, 70, 220, 52, "Base W, loaded once", T.frozen, { sub: `${baseGB} GB`, step: 2 }),
  ...[1, 2, 3].map((i) =>
    blockBox(`sa${i}`, 516 + (i - 1) * 100, 140, 84, 44, `A${i}`, T.trained, {
      sub: `${Math.round(adapterMB)} MB`,
      step: 2,
    })
  ),
  link("router>sbase", "router", "sbase", { step: 2 }),
  ...[1, 2, 3].map((i) => link(`sa${i}>sbase`, `sa${i}`, "sbase", { step: 2 })),
  note(
    "n-swap",
    450,
    240,
    390,
    "S-LoRA reports thousands of adapters on one GPU and up\nto 4× the throughput of naive vLLM and PEFT serving.",
    {
      step: 2,
      h: 36,
    }
  ),

  note("m1", 30, 310, 370, `${tasks} tasks, merged: ${tasks} × ${baseGB} GB = ${n(merged)} GB`, {
    tone: PROD_TONE.failure,
    step: 3,
  }),
  note(
    "m2",
    450,
    310,
    390,
    `${tasks} tasks, swapped: ${baseGB} GB + ${tasks} × ${(adapterMB / 1e3).toFixed(2)} GB = ${Math.round(swapped)} GB`,
    {
      tone: T.trained,
      step: 3,
    }
  ),
  note(
    "m3",
    30,
    340,
    810,
    "Weights only, a 7 B model with r = 8 on all linear layers; adapters switch per request, merged copies do not.",
    {
      step: 3,
    }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Merge the adapter, or keep it separate",
  width: 860,
  height: 380,
  groups: [{ id: "engine", title: "One GPU engine", tone: PROD_TONE.compute, x: 500, y: 58, w: 340, h: 138 }],
  steps: [
    { title: "Merge: one model per task" },
    { title: "Swap: one base, many adapters" },
    { title: "Memory for a hundred tasks" },
  ],
  shapes,
};

export default spec;
