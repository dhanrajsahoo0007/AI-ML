import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CAPACITY, TARGETS } from "@/components/diagrams/presets/gcase-answer";
import { n } from "@/components/diagrams/presets/production";

// Publisher controls (ai-answer-engine, Step 8 and §14; design sheet §14). Four kinds of publisher rule become one set
// of per-host flags, enforced wherever a page could reach an answer. Numbers from TARGETS and CAPACITY in
// presets/gcase-answer.ts:
//   flags cached for CAPACITY.hostFlagHosts = 50M hosts, refreshed ≤ 24 h (TARGETS.stopAnsweringHours), hourly for the
//   top CAPACITY.topHostsHourly = 10,000 news hosts (TARGETS.stopAnsweringTopHostsHours = 1 h);
//   after the flag flips: out of retrieval in minutes; cached answers citing the host evicted ≤ 1 h
//   (TARGETS.evictAfterFlagHours); stored spans and pages purged ≤ 24 h after the flip, ≤ 48 h from the publisher's
//   change (TARGETS.purgeFromChangeHours).
// Rules (sheet §14): may_index = robots allows our agent and RSL does not prohibit ai-index (and any crawl price is in
// budget); may_answer_from = may_index and ai-input is not "no" and RSL permits ai-input and the page is not
// nosnippet; max_snippet caps quoted characters. A missing signal is "no preference" (treated as allowed if robots
// allows our agent). Fact check (17 November 2026, dossier F70–F75): RFC 9309 (robots, 5xx → disallow), Cloudflare
// Content Signals (search, ai-input, ai-train; September 2025), RSL 1.0 (December 2025), Google robots meta tags
// (nosnippet, max-snippet, data-nosnippet).
// Steps: 1 four rule sources → host flags · 2 where the flags are enforced · 3 how fast a change takes effect.
// Layout (880 wide): inputs in a column at x 20 (220 × 52, 14 apart), the flags box in the middle (x 320, 220 wide),
// enforcement points in a column at x 640 (220 wide); arrows input → flags → each output; three timing lines below.
// Tones (GENAI_TONE): rule sources blue (data from publishers), the flags violet (a store), enforcement lime (checks),
// purge and eviction red (removal).

const ROW = (i: number) => 30 + i * 66;
const IN_X = 20;
const OUT_X = 640;
const COL_W = 220;

const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  w = COL_W,
  h = 52
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step });
const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const inputs: [string, string, string][] = [
  ["robots", "robots.txt", "RFC 9309: our agent allowed?"],
  ["signals", "Content Signals", "search, ai-input, ai-train"],
  ["rsl", "RSL licence", "ai-index, ai-input, payment"],
  ["snippet", "Snippet rules", "nosnippet, max-snippet"],
];
const outputs: [string, string, string, LayoutTone, number][] = [
  ["crawl", "Crawler", "skip unless may_index", GENAI_TONE.check, 2],
  ["retrieval", "Retrieval prefilter", "own index and API results", GENAI_TONE.check, 2],
  ["evict", "Evict cached answers", `≤ ${TARGETS.evictAfterFlagHours} h after the flip`, GENAI_TONE.failure, 3],
  ["purge", "Purge spans and pages", `≤ ${TARGETS.purgeFromChangeHours} h from the change`, GENAI_TONE.failure, 3],
];

const FLAGS_Y = ROW(1) - 6;
const FLAGS_H = ROW(2) + 52 - ROW(1) + 12;
const NOTE_Y = ROW(4) + 4;
const note = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 840,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Publisher controls: four kinds of rule become per-host flags, enforced at crawl, retrieval and in the cache",
  width: 880,
  height: NOTE_Y + 70,
  steps: [
    { title: "Four kinds of publisher rule become host flags" },
    { title: "Enforced at crawl time and at retrieval, on API results too" },
    { title: "A change takes effect within hours, then purges" },
  ],
  shapes: [
    ...inputs.map(([id, label, sub], i) => box(id, IN_X, ROW(i), label, sub, GENAI_TONE.data, 1)),
    {
      id: "flags",
      type: "box",
      x: 320,
      y: FLAGS_Y,
      w: 220,
      h: FLAGS_H,
      label: "Host flags\nmay_index\nmay_answer_from",
      sub: "max_snippet, licence, version",
      tone: GENAI_TONE.store,
      fill: "pastel",
      step: 1,
    },
    ...inputs.map(([id]) => arrow(`in-${id}`, id, "flags", 1)),
    ...outputs.map(([id, label, sub, tone, step], i) => box(id, OUT_X, ROW(i), label, sub, tone, step)),
    ...outputs.map(([id, , , , step]) => arrow(`out-${id}`, "flags", id, step)),
    note(
      "note-1",
      NOTE_Y,
      `Flags for ${n(CAPACITY.hostFlagHosts / 1e6)}M hosts, refreshed ≤ ${TARGETS.stopAnsweringHours} h; the top ${n(CAPACITY.topHostsHourly)} news hosts hourly (≤ ${TARGETS.stopAnsweringTopHostsHours} h).`,
      3
    ),
    note(
      "note-2",
      NOTE_Y + 22,
      "A flip removes the host from retrieval in minutes; syndicated copies inherit the original's flags.",
      3
    ),
    note(
      "note-3",
      NOTE_Y + 44,
      'A missing signal means "no preference": allowed if robots allows our agent, and we say so.',
      2
    ),
  ],
};

export default spec;
