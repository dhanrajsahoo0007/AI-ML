import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { FRESHNESS, INDEX, TARGETS } from "@/components/diagrams/presets/gcase-answer";
import { n } from "@/components/diagrams/presets/production";

// "Own the head of the web": how a new story becomes answerable, and how cached answers stop being stale (ai-answer-engine,
// Step 7; design sheet §8 step 7, §20). Numbers from FRESHNESS, INDEX and TARGETS in presets/gcase-answer.ts:
//   INDEX.fastSources = 200,000 fast sources polled every INDEX.pollMinutes = 5 min (57.6M light polls a day);
//   a story waits for the next poll: 0–5 min, 2.5 on average; fetch, parse, embed and write to the fresh segment
//   FRESHNESS.processMinutes = 1 (illustrative); retrievable at FRESHNESS.p50Minutes = 2.5 + 1 = 3.5 min, at worst
//   FRESHNESS.worstMinutes = 5 + 1 = 6 min (N4: ≤ TARGETS.freshP50Min 5, ≤ freshP95Min 15).
//   Answer-cache TTLs FRESHNESS.ttlMinutes: news 5 min, recent 6 h, evergreen 24 h; a cached news answer can lag a
//   story by at most 5 + 1 + 5 = FRESHNESS.newsAnswerMaxLagMinutes = 11 min.
//   Three eviction rules (sheet §7, §20): a cited span's content hash changes; a new fast-tier story tags an entity the
//   answer names; a cited host opts out (evicted within TARGETS.evictAfterFlagHours = 1 h of the flag flip).
// Steps: 1 publish to retrievable · 2 cache TTLs by freshness class · 3 the three eviction rules.
// Layout (880 wide): five boxes in a row (150 × 56, 22 apart) joined by arrows; the timing line under them; three TTL
// cells; three trigger boxes over one cache box.
// Tones (GENAI_TONE): the story blue (data), the poller neutral, fetch and parse teal (a tool), the fresh segment and
// the cache violet (stores), retrievable lime (the freshness target met), triggers blue (page and news data) and red
// (an opt-out).

const BOX = { w: 150, h: 56, gap: 22, y: 34 } as const;
const bx = (i: number) => 21 + i * (BOX.w + BOX.gap);
const fmtMin = (v: number) => `${v} min`;
const h = (min: number) => (min >= 60 ? `${min / 60} h` : `${min} min`);

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  hh: number = BOX.h
): LayoutShape => ({ id, type: "box", x, y, w, h: hh, label, sub, tone, fill: "pastel", step });
const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});
const text = (id: string, y: number, label: string, step: number, x = 21, w = 838): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const pipeline: [string, string, string, LayoutTone][] = [
  ["publish", "Story published", "t = 0", GENAI_TONE.data],
  ["poll", "Next poll", `every ${fmtMin(INDEX.pollMinutes)}: 0–${INDEX.pollMinutes} min`, "neutral"],
  ["fetch", "Fetch, parse, embed", "spans + vectors", GENAI_TONE.tool],
  ["fresh", "Fresh segment", `≈ ${fmtMin(FRESHNESS.processMinutes)} after the poll`, GENAI_TONE.store],
  ["ready", "Retrievable", `${FRESHNESS.p50Minutes} min p50`, GENAI_TONE.check],
];

const TTL_Y = 186;
const TTL_W = 270;
const ttl = Object.entries(FRESHNESS.ttlMinutes) as [keyof typeof FRESHNESS.ttlMinutes, number][];
const TTL_LABEL = { news: "News", recent: "Recent", evergreen: "Evergreen" } as const;

const TRIG_Y = 300;
const TRIG_W = 270;
const CACHE_Y = 400;

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "Freshness: a polled story is retrievable in 3.5 minutes; cached answers expire by class and are evicted on change",
  width: 880,
  height: CACHE_Y + 52 + 12,
  steps: [
    { title: `Publish to retrievable: ${FRESHNESS.p50Minutes} min p50, ${FRESHNESS.worstMinutes} at worst` },
    { title: "Cache TTLs by freshness class" },
    { title: "Three rules evict cached answers early" },
  ],
  shapes: [
    ...pipeline.map(([id, label, sub, tone], i) => box(id, bx(i), BOX.y, BOX.w, label, sub, tone, 1)),
    ...pipeline.slice(1).map(([id], i) => arrow(`a-${id}`, pipeline[i][0], id, 1)),
    text(
      "timing-1",
      BOX.y + BOX.h + 14,
      `${n(INDEX.fastSources)} fast sources polled every ${INDEX.pollMinutes} min: wait ${INDEX.pollMinutes / 2} min on average + process ${FRESHNESS.processMinutes} = ${FRESHNESS.p50Minutes} min p50, ${FRESHNESS.worstMinutes} at worst`,
      1
    ),
    text(
      "timing-2",
      BOX.y + BOX.h + 34,
      `Target N4: ≤ ${TARGETS.freshP50Min} min p50, ≤ ${TARGETS.freshP95Min} min p95. Other pages: per-URL recrawl by predicted change × importance.`,
      1
    ),
    ...ttl.map(([k, min], i) =>
      box(
        `ttl-${k}`,
        21 + i * (TTL_W + 14),
        TTL_Y,
        TTL_W,
        `${TTL_LABEL[k]}: ${h(min)}`,
        "answer-cache TTL",
        GENAI_TONE.store,
        2,
        48
      )
    ),
    text(
      "lag",
      TTL_Y + 58,
      `A cached news answer lags a story by at most ${INDEX.pollMinutes} + ${FRESHNESS.processMinutes} + ${FRESHNESS.ttlMinutes.news} = ${FRESHNESS.newsAnswerMaxLagMinutes} min.`,
      2
    ),
    box("t-page", 21, TRIG_Y, TRIG_W, "A cited span changes", "content hash per span", GENAI_TONE.data, 3, 50),
    box(
      "t-entity",
      21 + TRIG_W + 14,
      TRIG_Y,
      TRIG_W,
      "News tags an entity",
      "a fast-tier story names it",
      GENAI_TONE.data,
      3,
      50
    ),
    box(
      "t-host",
      21 + 2 * (TRIG_W + 14),
      TRIG_Y,
      TRIG_W,
      "A cited host opts out",
      `evicted ≤ ${TARGETS.evictAfterFlagHours} h after the flag flips`,
      GENAI_TONE.failure,
      3,
      50
    ),
    box(
      "cache",
      290,
      CACHE_Y,
      300,
      "Answer cache",
      "evict every answer that cites or names it",
      GENAI_TONE.store,
      3,
      52
    ),
    arrow("e-page", "t-page", "cache", 3),
    arrow("e-entity", "t-entity", "cache", 3),
    arrow("e-host", "t-host", "cache", 3),
  ],
};

export default spec;
