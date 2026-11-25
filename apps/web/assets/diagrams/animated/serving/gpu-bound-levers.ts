import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { H100, RIDGE } from "@/components/diagrams/presets/production-gpu";

// Memory-bound against compute-bound, and the fixes that help each, for "Which lever for which bottleneck" on the GPU
// Performance for LLMs page. A fix helps only if it moves the limit the work is actually hitting (the roofline of
// gpu-roofline: the sloped roof is bandwidth, the flat roof is compute).
//
// Fact checks (November 2026): dense FP8 Tensor Core rate of the H100 SXM is 1,979 TFLOPS, twice dense BF16 (989),
// from NVIDIA's datasheet (printed 3,958 and 1,979 "with sparsity"); FlashAttention (Dao et al., arXiv 2205.14135)
// cuts reads and writes between HBM and on-chip SRAM by tiling; grouped-query attention (Ainslie et al., 2023,
// arXiv 2305.13245) shares each key and value head across several query heads, so the cache is smaller.
//
// Steps: 1 the two problems, with Brightpost's example of each and the test · 2 the four fixes for a memory-bound
// step (fewer bytes) · 3 the four fixes for a compute-bound step (more or better FLOPs).
// Grid: two columns, x 40 and 450, each 390 wide. Headers y 20 (h 78); fix cells y 150 + 62 × row (h 54); a "does not
// help" line under each column at y 410.
// Colours: memory side violet, compute side teal (as the roofline figures); the test strip neutral.

const COL = [40, 450] as const;
const W = 390;

const shapes: LayoutShape[] = [];

const heads = [
  {
    id: "mem",
    label: "Memory-bound",
    sub: "waiting for bytes: left of the ridge",
    tone: PROD_TONE.store,
    example: "Brightpost decode: 1 token per request",
  },
  {
    id: "comp",
    label: "Compute-bound",
    sub: "waiting for FLOPs: right of the ridge",
    tone: PROD_TONE.compute,
    example: "Brightpost prefill: the 2,200-token prompt",
  },
] as const;
heads.forEach((h, i) => {
  shapes.push(
    {
      id: `head-${h.id}`,
      type: "cell",
      x: COL[i],
      y: 20,
      w: W,
      h: 64,
      label: h.label,
      sub: h.sub,
      tone: h.tone,
      fill: "pastel",
      step: 1,
      quiet: true,
    },
    {
      id: `ex-${h.id}`,
      type: "text",
      x: COL[i],
      y: 92,
      w: W,
      h: 18,
      label: h.example,
      tone: h.tone,
      step: 1,
      quiet: true,
    }
  );
});
shapes.push({
  id: "test",
  type: "text",
  x: 40,
  y: 118,
  w: 800,
  h: 18,
  label: `Test: is the work's FLOPs per byte below or above ${Math.round(RIDGE)} (${H100.name}, BF16)?`,
  tone: PROD_TONE.infra,
  step: 1,
  quiet: true,
});

const fixes: Record<"mem" | "comp", { label: string; sub: string }[]> = {
  mem: [
    { label: "Batch more requests", sub: "one weight read serves every sequence" },
    { label: "Quantise the weights", sub: "half the bytes, about half the read" },
    { label: "Shrink the KV cache", sub: "grouped-query attention, 8-bit cache" },
    { label: "Fuse kernels", sub: "FlashAttention keeps tiles on the chip" },
  ],
  comp: [
    { label: "Use lower-precision maths", sub: "FP8 tensor cores: 1,979 vs 989 TFLOPS" },
    { label: "Use better kernels", sub: "keep the tensor cores fed, not idle" },
    { label: "Split across GPUs", sub: "more FLOPS, paid for in communication" },
    { label: "Skip repeated work", sub: "reuse the cached prefix of a prompt" },
  ],
};
(["mem", "comp"] as const).forEach((side, i) => {
  const tone = side === "mem" ? PROD_TONE.store : PROD_TONE.compute;
  const step = i + 2;
  fixes[side].forEach((f, row) => {
    shapes.push({
      id: `fix-${side}-${row}`,
      type: "cell",
      x: COL[i],
      y: 154 + row * 62,
      w: W,
      h: 54,
      label: f.label,
      sub: f.sub,
      tone,
      fill: "pastel",
      step,
      quiet: true,
    });
  });
  shapes.push({
    id: `no-${side}`,
    type: "text",
    x: COL[i],
    y: 154 + 4 * 62 + 4,
    w: W,
    h: 18,
    label: side === "mem" ? "Does not help: more TFLOPS" : "Does not help: more bandwidth",
    tone: PROD_TONE.infra,
    step,
    quiet: true,
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Memory-bound and compute-bound: which fix helps which",
  width: 880,
  height: 154 + 4 * 62 + 36,
  steps: [
    { title: "Two bottlenecks, one test" },
    { title: "Memory-bound: move fewer bytes" },
    { title: "Compute-bound: do the FLOPs faster, or fewer" },
  ],
  shapes,
};

export default spec;
