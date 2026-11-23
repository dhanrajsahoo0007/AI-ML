import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CONTEXT, LATENCY, RETRIEVAL } from "@/components/diagrams/presets/gcase-answer";
import { fmt, funnel } from "@/components/diagrams/presets/rag";

// "Rank spans in stages" (ai-answer-engine, Step 4; design sheet §8 step 4, §10 choice 6). Every number from
// presets/gcase-answer.ts:
//   retrieved = RETRIEVAL.indexQueries 3 × (100 lexical + 100 vector) = 600 spans, from 100 shards with a 60 ms
//   per-shard deadline (hedged at 40) + 20 ms merge = the 80 ms index stage (LATENCY.own "index");
//   unique 400 after merging the three rewrites with RRF; prefilter 300 (stale, spam, syndicated copies, hosts whose
//   flags forbid answering); cheap scorer 60 (gradient-boosted trees, 30 ms, LATENCY.own "cheap"); cross-encoder 12
//   (80 ms, LATENCY.own "cross"), at most RETRIEVAL.maxPerDomain 3 per domain and maxPerPage 2 per page.
//   The cross-encoder reads RETRIEVAL.rerankTokens = 60 × (200 + 30) = 13,800 tokens a pass.
//   On all 300 after the prefilter it would take 80 × 300 ÷ 60 = 400 ms: RETRIEVAL.crossOn300ExtraMs = +320 ms.
//   What reaches the model: CONTEXT.spansWithHeaders = 12 × 25 + 12 × 200 = 2,700 tokens, against
//   CONTEXT.wholePagesTokens = 8 pages × 2,000 = 16,000 (13,300 fewer, CONTEXT.pagesExtraTokens).
// Three steps: 1 retrieve and merge (600, 400) · 2 filter and score cheaply (300, 60) · 3 the cross-encoder (12).
// Layout (860 wide): funnel() from presets/rag.ts centred at x 250 (box width linear in the count), one note per
// stage at x 500, two footer lines.
// Tones (GENAI_TONE): retrieved spans violet (from the index), unique spans blue (data), the prefilter lime (a check),
// the cheap scorer and the cross-encoder lime (ranking).

const STAGE = { y: 24, h: 46, gap: 26 } as const;
const stageY = (i: number) => STAGE.y + i * (STAGE.h + STAGE.gap);
const ms = (id: string) => LATENCY.own.find((s) => s.id === id)?.ms ?? 0;
const [retrieved, unique, prefilter, cheap, cross] = RETRIEVAL.funnel;
const STEP = [1, 1, 2, 2, 3] as const;

const note = (i: number, label: string): LayoutShape => ({
  id: `note-${i}`,
  type: "text",
  x: 480,
  y: stageY(i) + 3,
  w: 370,
  h: 40,
  label,
  tone: "neutral",
  step: STEP[i],
});

const FOOT_Y = stageY(5) + 4;
const foot = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 830,
  h: 18,
  label,
  tone: "neutral",
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Ranking spans in stages: 600 retrieved, 12 reach the model",
  width: 860,
  height: FOOT_Y + 48,
  steps: [
    { title: `Retrieve ${retrieved.spans} spans and merge to ${unique.spans}` },
    { title: `Prefilter to ${prefilter.spans}, cheap scorer to ${cheap.spans}` },
    { title: `The cross-encoder keeps ${cross.spans}` },
  ],
  shapes: [
    ...funnel(
      "f",
      240,
      STAGE.y,
      [
        {
          label: "Retrieved",
          count: retrieved.spans,
          sub: `${retrieved.spans} spans`,
          tone: GENAI_TONE.store,
          step: 1,
        },
        { label: "Unique", count: unique.spans, sub: `${unique.spans} spans`, tone: GENAI_TONE.data, step: 1 },
        {
          label: "Prefilter",
          count: prefilter.spans,
          sub: `${prefilter.spans} spans`,
          tone: GENAI_TONE.check,
          step: 2,
        },
        { label: "Cheap scorer", count: cheap.spans, sub: `${cheap.spans} spans`, tone: GENAI_TONE.rank, step: 2 },
        { label: "Cross-encoder", count: cross.spans, sub: `${cross.spans} spans`, tone: GENAI_TONE.rank, step: 3 },
      ],
      { maxW: 420, minW: 180, h: STAGE.h, gap: STAGE.gap }
    ),
    note(
      0,
      `${RETRIEVAL.indexQueries} rewrites × (100 lexical + 100 vector) from ${RETRIEVAL.shards} shards;\n${ms("index")} ms: a ${RETRIEVAL.shardDeadlineMs} ms deadline per shard, hedged, + merge`
    ),
    note(1, "The same span found by several rewrites counts once;\nRRF merges the three ranked lists"),
    note(2, "Stale, spam and syndicated copies out, and every\nhost whose flags forbid answering from it"),
    note(
      3,
      `Gradient-boosted trees in ${ms("cheap")} ms: RRF rank, BM25, vector score,\nfreshness, host-and-path quality, links`
    ),
    note(
      4,
      `${fmt(RETRIEVAL.rerankTokens)} tokens read in ${ms("cross")} ms; at most ${RETRIEVAL.maxPerDomain} spans\na domain and ${RETRIEVAL.maxPerPage} a page`
    ),
    foot(
      "foot-1",
      FOOT_Y,
      `To the model: 12 × 200 + 12 headers × 25 = ${fmt(CONTEXT.spansWithHeaders)} tokens, not 8 pages × ${fmt(CONTEXT.pageTokens)} = ${fmt(CONTEXT.wholePagesTokens)}.`
    ),
    foot(
      "foot-2",
      FOOT_Y + 22,
      `A cross-encoder on all ${prefilter.spans}: ${ms("cross")} × ${prefilter.spans} ÷ ${cheap.spans} = ${(ms("cross") * prefilter.spans) / cheap.spans} ms, ${RETRIEVAL.crossOn300ExtraMs} ms more. Cheap scorers first.`
    ),
  ],
};

export default spec;
