import { describe, expect, it } from "vitest";
import { attend } from "@/components/diagrams/presets/llm-attention";
import * as arch from "@/components/diagrams/presets/llm-architecture";
import { HEAD, LOSS, TABLES } from "@/components/diagrams/presets/llm-families";
import { BALANCE, BATCH_CHOICE, CAPACITY_SWEEP, ROUTING, Z_LOSS } from "@/components/diagrams/presets/llm-moe";
import { ENCODED, TEA, WORDPIECE_FIRST } from "@/components/diagrams/presets/llm-tokens";

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

describe("llm-tokens: BPE on low, lower, newest", () => {
  it("encodes unseen words with the learned merges", () => {
    const byWord = Object.fromEntries(ENCODED.map((e) => [e.word, e]));
    expect(byWord.lowest.tokens).toEqual(["lowe", "s", "t"]);
    expect(byWord.lowest.ids).toEqual([10, 6, 7]);
    expect(byWord.newer.tokens).toHaveLength(5);
    expect(byWord.slowly.tokens).toEqual(["s", "low", "l", "y"]);
    expect(byWord.slowly.ids.at(-1)).toBeUndefined();
  });

  it("WordPiece scores s + t highest, BPE's l + o at 0.50", () => {
    const score = (a: string, b: string) => WORDPIECE_FIRST.find((p) => p.a === a && p.b === b)?.score;
    expect(score("l", "o")).toBeCloseTo(0.5);
    expect(score("s", "t")).toBeCloseTo(1);
    expect(Math.max(...WORDPIECE_FIRST.map((p) => p.score))).toBeCloseTo(1);
  });

  it("UTF-8 byte counts for tea", () => {
    expect(TEA.map((t) => t.byteCount)).toEqual([3, 3, 6, 9, 3, 4]);
  });
});

describe("llm-families: BERT on the kettle example", () => {
  it("losses match the probabilities bert-pretrain-finetune shows", () => {
    expect(LOSS.pBoiled.toFixed(2)).toBe("0.54");
    expect(LOSS.pTea.toFixed(2)).toBe("0.63");
    expect(LOSS.pIsNext.toFixed(2)).toBe("0.97");
    expect(LOSS.boiled.toFixed(3)).toBe("0.610");
    expect(LOSS.tea.toFixed(3)).toBe("0.456");
    expect(LOSS.mlmMean.toFixed(3)).toBe("0.533");
    expect(LOSS.nsp.toFixed(3)).toBe("0.033");
    expect(LOSS.total.toFixed(3)).toBe("0.566");
  });

  it("head and embedding table sizes", () => {
    expect(HEAD.weights).toBe(1_536);
    expect(HEAD.withBias).toBe(1_538);
    expect(HEAD.squadVectors).toBe(1_536);
    expect(TABLES.token).toBe(23_040_000);
    expect(TABLES.position).toBe(393_216);
    expect(TABLES.segment).toBe(1_536);
    expect(TABLES.maxPositions).toBe(512);
  });
});

describe("llm-moe: routing, balance and capacity", () => {
  it("top-2 routing renormalizes the two winners", () => {
    expect(ROUTING.top2).toEqual([1, 4]);
    expect(ROUTING.top2Weights.map((w) => w.toFixed(4))).toEqual(["0.6225", "0.3775"]);
    expect(ROUTING.fullTop2.map((w) => w.toFixed(3))).toEqual(["0.337", "0.204"]);
  });

  it("Switch load-balancing loss on the 8-token batch", () => {
    expect(BATCH_CHOICE).toEqual([0, 2, 0, 1, 0, 3, 1, 2]);
    expect(BALANCE.routed).toEqual([3, 2, 2, 1]);
    expect(BALANCE.loss.toFixed(3)).toBe("1.056");
    expect(BALANCE.added.toFixed(4)).toBe("0.0106");
    expect(BALANCE.grad).toEqual([1.5, 1, 1, 0.5]);
    expect(BALANCE.collapsed).toBe(4);
  });

  it("capacity factor sweep and z-loss", () => {
    expect(CAPACITY_SWEEP.map((c) => c.dropped.length)).toEqual([4, 1, 0, 0]);
    expect(Z_LOSS.z.toFixed(2)).toBe("4.79");
    expect(Math.round(Z_LOSS.zSharp)).toBe(251);
  });
});
