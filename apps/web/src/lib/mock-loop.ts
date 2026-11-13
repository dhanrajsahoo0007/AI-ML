// The mock loop: picks a short set of behavioural prompts shaped like one company's round, and summarises how
// the reader rated their answers. Pure helpers, shared by the island and its tests. Prompts only: the answers
// never leave the server for this tool.

import type { Rating } from "./practice";

export interface MockQuestion {
  id: string;
  q: string;
  level?: "Junior" | "Mid" | "Senior";
  /** Company slugs the prompt is tagged to. */
  companies: string[];
  /** What it tests (slugs from signals.yaml). */
  signals: string[];
  /** The bank subsection it is filed under, used to spread a loop across areas. */
  area: string;
  /** The interviewer's follow-up questions, in order. */
  followUps: string[];
}

export interface LoopChoice {
  /** A company slug, or null for any company. */
  company: string | null;
  /** A level, or null for any level. */
  level: MockQuestion["level"] | null;
}

/** How many prompts a loop has: a 45-minute round fits five or six with follow-ups. */
export const LOOP_SIZE = 5;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draws up to `size` prompts. Prompts tagged to the chosen company come first, then the rest; inside each of
 * those, prompts at the chosen level come first. Areas are not repeated until every area has been used once.
 * `random` returns a number in [0, 1), as Math.random does.
 */
export function drawLoop(
  questions: readonly MockQuestion[],
  choice: LoopChoice,
  random: () => number,
  size = LOOP_SIZE
): MockQuestion[] {
  const rank = (q: MockQuestion) =>
    (choice.company && q.companies.includes(choice.company) ? 0 : 2) +
    (choice.level && q.level !== choice.level ? 1 : 0);
  const pool = shuffle(questions, random).sort((a, b) => rank(a) - rank(b));
  const picked: MockQuestion[] = [];
  const used = new Set<string>();
  while (picked.length < size && picked.length < pool.length) {
    const next = pool.find((q) => !picked.includes(q) && !used.has(q.area)) ?? pool.find((q) => !picked.includes(q));
    if (!next) break;
    picked.push(next);
    used.add(next.area);
    if (pool.every((q) => picked.includes(q) || used.has(q.area))) used.clear();
  }
  return picked;
}

interface LoopSummary {
  answered: number;
  /** Mean rating to one decimal place, or null when nothing was rated. */
  average: number | null;
  /** The ids rated 1 or 2: practise these again. */
  weak: string[];
  /** The signals of the prompts in the loop, most frequent first. */
  signals: string[];
}

export function summariseLoop(loop: readonly MockQuestion[], ratings: Readonly<Record<string, Rating>>): LoopSummary {
  const rated = loop.filter((q) => ratings[q.id] !== undefined);
  const total = rated.reduce((n, q) => n + ratings[q.id], 0);
  const counts = new Map<string, number>();
  for (const q of loop) for (const s of q.signals) counts.set(s, (counts.get(s) ?? 0) + 1);
  return {
    answered: rated.length,
    average: rated.length ? Math.round((total / rated.length) * 10) / 10 : null,
    weak: rated.filter((q) => ratings[q.id] <= 2).map((q) => q.id),
    signals: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug),
  };
}
