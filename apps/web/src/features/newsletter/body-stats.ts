import { findAssetRefs, findCallouts } from "./links";

// Plain-text statistics of an issue's Markdown body: reading time, the format rules' word and figure checks.
// Pure string work on the Markdown issues are written in; fenced code counts as words but not as sentences.

/** Words a minute for reading time (an explainer with figures reads slower than prose). */
export const WORDS_PER_MINUTE = 230;
/** Seconds added per image shown, for looking at it. */
export const SECONDS_PER_FIGURE = 12;

export interface BodyStats {
  words: number;
  /** Distinct figures (the steps of one build-up figure count once). */
  figures: number;
  /** Images shown, every step included: what the reader looks at. */
  images: number;
  /** H2 headings, in order. */
  headings: string[];
  avgSentenceWords: number;
  /** Most words in a row with no figure or callout in between, and the 1-based body line where that run starts. */
  longestPlainRun: { words: number; line: number };
}

const countWords = (text: string) => (text.match(/[A-Za-z0-9][\w'’-]*/g) ?? []).length;

/** Markdown syntax removed, so only the words readers see are counted. */
function plain(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images (alt text isn't read in the flow)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/^>\s*\[![A-Za-z]+\]/, " ") // callout markers
    .replace(/[#>*_`|~-]+/g, " ");
}

export function bodyStats(body: string): BodyStats {
  const lines = body.split("\n");
  const refs = findAssetRefs(body);
  const figureLines = new Set(refs.map((r) => r.line));
  const figureIds = new Set(refs.map((r) => r.ref?.id ?? r.url));
  const calloutLines = new Set(findCallouts(body).map((c) => c.line));
  let words = 0;
  let run = 0;
  let runStart = 1;
  let longest = { words: 0, line: 1 };
  let inFence = false;
  const headings: string[] = [];
  const prose: string[] = [];

  lines.forEach((raw, i) => {
    const line = i + 1;
    if (/^\s*```/.test(raw)) inFence = !inFence;
    if (figureLines.has(line) || calloutLines.has(line)) {
      run = 0;
      runStart = line + 1;
    }
    const h2 = !inFence && /^##\s+(.+?)\s*#*$/.exec(raw);
    if (h2) headings.push(h2[1]);
    const n = countWords(plain(raw));
    words += n;
    run += n;
    if (run > longest.words) longest = { words: run, line: runStart };
    if (!inFence && !/^\s*#/.test(raw)) prose.push(plain(raw));
  });

  const sentences = prose
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map(countWords)
    .filter((n) => n > 0);
  const avgSentenceWords = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
  return {
    words,
    figures: figureIds.size,
    images: refs.length,
    headings,
    avgSentenceWords,
    longestPlainRun: longest,
  };
}

/** Minutes to read, at least 1. */
export function readingMinutes(stats: Pick<BodyStats, "words" | "images">): number {
  return Math.max(1, Math.round(stats.words / WORDS_PER_MINUTE + (stats.images * SECONDS_PER_FIGURE) / 60));
}
