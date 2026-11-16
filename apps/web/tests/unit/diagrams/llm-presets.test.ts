import { describe, expect, it } from "vitest";
import { attend } from "@/components/diagrams/presets/llm-attention";
import * as arch from "@/components/diagrams/presets/llm-architecture";

// The LLM Foundations pages quote these numbers in prose; the presets compute them once. If a constant changes,
// the page text must change with it.

describe("llm-attention: the cat sat", () => {
  it("matches the page's worked example", () => {
    const plain = attend(false);
    expect(plain.raw[2]).toEqual([1, 2, 2]);
    expect(plain.shownWeights[2]).toEqual([0.2, 0.4, 0.4]);
    expect(plain.outputs[2].map((v) => Math.round(v * 100) / 100)).toEqual([0.6, 0.8]);
    expect(plain.outputs[1].map((v) => Math.round(v * 100) / 100)).toEqual([0.42, 0.86]);
  });

  it("the causal mask changes earlier rows only", () => {
    const causal = attend(true);
    expect(causal.shownWeights).toEqual([
      [1, 0, 0],
      [0.2, 0.8, 0],
      [0.2, 0.4, 0.4],
    ]);
    expect(causal.outputs[1].map((v) => Math.round(v * 100) / 100)).toEqual([0.2, 0.8]);
    expect(causal.outputs[2]).toEqual(attend(false).outputs[2]);
  });
});

describe("llm-architecture: base Transformer arithmetic", () => {
  it("weights per layer and in total", () => {
    expect(arch.ATTN_WEIGHTS).toBe(1_048_576);
    expect(arch.FFN_WEIGHTS).toBe(2_097_152);
    expect(arch.ENC_LAYER).toBe(3_145_728);
    expect(arch.DEC_LAYER).toBe(4_194_304);
    expect(arch.FFN_SHARE).toBeCloseTo(2 / 3);
    expect(arch.STACKS).toBe(44_040_192);
    expect(arch.EMBED).toBe(18_944_000);
    expect(arch.TOTAL_TIED).toBe(62_984_192);
    expect(arch.UNTIED_EXTRA).toBe(37_888_000);
  });

  it("KV cache and logits", () => {
    expect(arch.KV_BASE_TOKEN).toBe(6_144);
    expect(arch.KV_BASE_PROMPT).toBe(18_432);
    expect(arch.KV_BASE_PROMPT_BYTES).toBe(36_864);
    expect(arch.KV_GPT3_TOKEN).toBe(2_359_296);
    expect(arch.KV_GPT3_SEQ_BYTES).toBe(9_663_676_416);
    expect(arch.LOGITS_PER_PASS).toBe(111_000);
    expect(arch.BASE.heads * arch.BASE.dK).toBe(arch.BASE.dModel);
    expect(arch.GPT3.ctx).toBe(2_048);
  });
});
