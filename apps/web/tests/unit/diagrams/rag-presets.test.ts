import { describe, expect, it } from "vitest";
import {
  ARTICLES,
  CONTEXT_BUDGET,
  CORPUS,
  LATENCY_MS,
  METRICS,
  PROMPT,
  QUESTIONS,
  RAG_TONE,
  RELEVANT_RANKS,
  RESULTS,
  SEMCACHE,
  STAGES,
  TOP_K,
  VECTOR_INDEX,
  chunkRow,
  docStrip,
  fmt,
  funnel,
  ndcgAt,
  rankList,
  rankListWidth,
  recallAt,
  reciprocalRank,
  scatter,
  stageStrip,
  stageStripWidth,
  stripX,
  vector,
} from "@/components/diagrams/presets/rag";
import { lintSpec } from "@/components/diagrams/spec-lint";
import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

const specOf = (shapes: LayoutShape[], width = 880, height = 500): LayoutSpec => ({
  kind: "layout",
  title: "t",
  width,
  height,
  shapes,
});

describe("RAG presets: the running example", () => {
  it("keeps the fixed legend", () => {
    expect(RAG_TONE).toMatchObject({
      text: "blue",
      embedding: "pink",
      store: "violet",
      keyword: "teal",
      query: "orange",
      rank: "lime",
      answer: "green",
      failure: "red",
      infra: "neutral",
    });
  });

  it("derives the corpus numbers from each other", () => {
    expect(CORPUS.stride).toBe(CORPUS.chunkTokens - CORPUS.overlapTokens);
    expect(CORPUS.chunksPerArticle).toBe(Math.ceil((CORPUS.articleTokens - CORPUS.overlapTokens) / CORPUS.stride));
    expect(CORPUS.chunks).toBe(CORPUS.articles * CORPUS.chunksPerArticle);
    expect(CORPUS.embedTokens).toBe(CORPUS.chunks * CORPUS.chunkTokens);
    expect(CORPUS.bytesPerVector).toBe(CORPUS.dims * CORPUS.bytesPerFloat);
    expect(CORPUS.indexBytes).toBe(CORPUS.chunks * CORPUS.bytesPerVector);
    expect(CORPUS.indexMB).toBe(Math.round(CORPUS.indexBytes / 1e6));
    expect(PROMPT.total).toBe(2_215);
    expect(VECTOR_INDEX.pqSubvectors * VECTOR_INDEX.pqSubDims).toBe(CORPUS.dims);
    expect(VECTOR_INDEX.pqRatio).toBe(CORPUS.bytesPerVector / VECTOR_INDEX.pqBytesPerVector);
    expect(VECTOR_INDEX.pqIndexBytes).toBe(CORPUS.chunks * VECTOR_INDEX.pqBytesPerVector);
    expect(VECTOR_INDEX.ivfCompared).toBe((CORPUS.chunks * VECTOR_INDEX.ivfProbe) / VECTOR_INDEX.ivfCells);
  });

  it("computes the retrieval metrics for the ranked list", () => {
    expect(RESULTS).toHaveLength(10);
    expect(RELEVANT_RANKS).toEqual([2, 4, 7]);
    expect(recallAt(TOP_K)).toBeCloseTo(2 / 3);
    expect(reciprocalRank()).toBe(0.5);
    expect(ndcgAt(10)).toBeCloseTo(1.3949 / 2.1309, 3);
    expect(METRICS).toEqual({ recall5: 0.67, recall10: 1, mrr: 0.5, ndcg10: 0.65 });
    // Scores fall as the rank rises.
    for (let i = 1; i < RESULTS.length; i++) expect(RESULTS[i].score).toBeLessThan(RESULTS[i - 1].score);
  });

  it("pins the shared examples: the paraphrase and the look-alike error codes", () => {
    expect(QUESTIONS.paraphrase).toBe("Can't log in, phone was stolen");
    expect(ARTICLES.errorCode).toBe("Error E1234: session expired");
    expect(ARTICLES.lookAlikeCode).toBe("Error E1243: card declined");
    expect(QUESTIONS.keyword).toContain("E1234");
  });

  it("keeps the semantic cache numbers consistent", () => {
    expect(SEMCACHE).toEqual({
      threshold: 0.92,
      strict: 0.96,
      hitSim: 0.97,
      falseHitSim: 0.94,
      lookupMs: 5,
      ttlHours: 24,
    });
    // The hit clears both thresholds; the false hit clears only the loose one.
    expect(SEMCACHE.hitSim).toBeGreaterThanOrEqual(SEMCACHE.strict);
    expect(SEMCACHE.falseHitSim).toBeGreaterThanOrEqual(SEMCACHE.threshold);
    expect(SEMCACHE.falseHitSim).toBeLessThan(SEMCACHE.strict);
    expect(LATENCY_MS.embedQuery + SEMCACHE.lookupMs).toBe(25);
  });

  it("derives the context budget working", () => {
    const b = CONTEXT_BUDGET;
    expect(b.toolDefs).toBe(b.tools * b.tokensPerTool);
    const fixed = b.instructions + b.toolDefs + b.memory + PROMPT.contextTokens;
    expect(fixed).toBe(4_800);
    const turn = (n: number) => fixed + n * (b.historyPerTurn + b.toolResultsPerTurn);
    expect(turn(14)).toBe(25_800);
    expect(turn(14)).toBeGreaterThan(b.window * b.compactAt);
    expect(b.window * b.compactAt).toBeCloseTo(25_600);
    expect(turn(19)).toBe(33_300);
    expect(turn(19)).toBeGreaterThan(b.window);
    expect(fixed + b.summary + b.keepTurns * b.historyPerTurn + b.toolResultsPerTurn).toBe(7_000);
  });

  it("formats numbers with thousands separators", () => {
    expect(fmt(1200)).toBe("1,200");
    expect(fmt(22118400)).toBe("22,118,400");
  });
});

describe("RAG presets: builders", () => {
  it("draws a document as touching token cells with chunk marks", () => {
    const strip = docStrip("doc", 100, 100, { marks: [350, 400] });
    const cells = strip.filter((s) => s.type === "cell");
    expect(cells).toHaveLength(22);
    expect(cells[0]).toMatchObject({ x: 100, tone: "blue", w: 30 });
    expect(stripX(400, 100)).toBe(340);
    expect(strip.find((s) => s.id === "doc-t400")?.label).toBe("400");
    expect(lintSpec(specOf(strip))).toEqual([]);
  });

  it("lays out chunks, a scatter and a ranked list that pass lint", () => {
    const chunks = chunkRow("c", 20, 20, [{ label: "Chunk 1" }, { label: "Chunk 2", highlight: true }]);
    expect(chunks[1]).toMatchObject({ x: 152, tone: "blue", fill: "pastel", highlight: true });
    const pts = scatter(
      "s",
      20,
      100,
      300,
      200,
      [
        { id: "q", x: 0.5, y: 0.5, kind: "query", label: "question" },
        { id: "a", x: 0.6, y: 0.4, kind: "relevant", label: "reset" },
        { id: "b", x: 0.1, y: 0.9 },
      ],
      { ring: { around: "q", r: 50 } }
    );
    expect(pts.find((s) => s.id === "s-q")).toMatchObject({ type: "circle", tone: "orange", x: 170, y: 200 });
    expect(pts.find((s) => s.id === "s-b")).toMatchObject({ tone: "pink", fill: "soft" });
    expect(pts.find((s) => s.id === "s-ring")?.points).toHaveLength(49);
    const list = rankList("r", 400, 100, RESULTS, { cut: TOP_K, cutLabel: "top 5" });
    expect(list.find((s) => s.id === "r-t2")).toMatchObject({ fill: "pastel" });
    expect(list.find((s) => s.id === "r-t1")).toMatchObject({ fill: "paper" });
    expect(list.find((s) => s.id === "r-s1")?.label).toBe("0.82");
    expect(rankListWidth()).toBe(324);
    expect(lintSpec(specOf([...chunks, ...pts, ...list], 880, 460))).toEqual([]);
  });

  it("narrows a funnel in proportion to the counts", () => {
    const f = funnel("f", 300, 20, [
      { label: "All chunks", count: 3600 },
      { label: "Vector search", count: 100 },
      { label: "Reranker", count: 5 },
    ]);
    const widths = f.filter((s) => s.type === "box").map((s) => s.w);
    expect(widths[0]).toBe(420);
    expect(widths[2]).toBe(140);
    expect(widths[1]).toBeGreaterThan(140);
    expect(f.filter((s) => s.type === "arrow")).toHaveLength(2);
    expect(lintSpec(specOf(f, 600, 300))).toEqual([]);
  });

  it("draws the six-stage locator, colouring only the current stage", () => {
    const { shapes, centres } = stageStrip("st", 10, 10, { current: ["Retrieve"] });
    const boxes = shapes.filter((s) => s.type === "box");
    expect(boxes.map((b) => b.label)).toEqual([...STAGES]);
    expect(boxes.find((b) => b.label === "Retrieve")).toMatchObject({
      tone: "violet",
      fill: "pastel",
      highlight: true,
    });
    expect(boxes.find((b) => b.label === "Parse")).toMatchObject({ tone: "neutral", fill: "soft" });
    expect(centres.Parse).toBe(60);
    expect(stageStripWidth()).toBe(710);
    expect(lintSpec(specOf(shapes, 740, 60))).toEqual([]);
  });

  it("re-exports the Transformer vector builder", () => {
    expect(vector("v", 0, 0, 3, RAG_TONE.embedding)).toHaveLength(3);
  });
});
