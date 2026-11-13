// Practice mode for interview questions: the two-minute answer timer and the learner's own ratings.
//
// Ratings live in this browser's localStorage (never tokens or personal data). The account sync planned for
// this data will read and write through this module, so nothing else touches the storage key.
// No zod here: this file ships to the browser, and every entry is shape-checked by hand on the way in.

const PRACTICE_KEY = "tts_practice_v1";

/** Fired on `window` after this page changes the stored ratings, so every question list on it can update. */
export const PRACTICE_EVENT = "tts-practice";

export type Rating = 1 | 2 | 3 | 4 | 5;

/** The self-rating scale, weakest first. The hint says what an answer at that score sounded like. */
export const RATINGS: readonly { value: Rating; label: string; hint: string }[] = [
  { value: 1, label: "Blanked", hint: "No story came to mind" },
  { value: 2, label: "Rambled", hint: "Long backstory, or it missed the question" },
  { value: 3, label: "Covered it", hint: "Clear actions, but no numbers" },
  { value: 4, label: "Strong", hint: "Clear actions and a measured result" },
  { value: 5, label: "Ready", hint: "Result, learning, and inside two minutes" },
];

export interface PracticeEntry {
  rating: Rating;
  /** How many times the question has been practised. */
  times: number;
  /** When it was last practised (ISO 8601). */
  at: string;
}

export type PracticeLog = Record<string, PracticeEntry>;

const isRating = (v: unknown): v is Rating => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

/** Keeps the well-formed entries of whatever was stored; anything else is dropped. */
export function parsePracticeLog(raw: string | null): PracticeLog {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: PracticeLog = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { rating, times, at } = value as Record<string, unknown>;
    if (!isRating(rating) || typeof at !== "string") continue;
    out[id] = { rating, times: typeof times === "number" && times >= 1 ? Math.floor(times) : 1, at };
  }
  return out;
}

/** The log with one more practice of `id` at `rating`. */
export function withPractice(log: PracticeLog, id: string, rating: Rating, now: Date): PracticeLog {
  return { ...log, [id]: { rating, times: (log[id]?.times ?? 0) + 1, at: now.toISOString() } };
}

export function readPracticeLog(): PracticeLog {
  try {
    return parsePracticeLog(window.localStorage.getItem(PRACTICE_KEY));
  } catch {
    return {};
  }
}

/** Records one practice of a question in this browser and tells the page. Returns the new log. */
export function recordPractice(id: string, rating: Rating): PracticeLog {
  const next = withPractice(readPracticeLog(), id, rating, new Date());
  try {
    window.localStorage.setItem(PRACTICE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PRACTICE_EVENT));
  } catch {
    // Storage is full or blocked: the rating still shows for this visit.
  }
  return next;
}

/**
 * The ids ordered for "Weakest first": never practised, then the lowest rating, then the one practised longest
 * ago. Ids that tie keep the order they were given in.
 */
export function weakestFirst(ids: readonly string[], log: PracticeLog): string[] {
  const score = (id: string) => log[id]?.rating ?? 0;
  const when = (id: string) => log[id]?.at ?? "";
  return ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => score(a.id) - score(b.id) || when(a.id).localeCompare(when(b.id)) || a.i - b.i)
    .map((x) => x.id);
}

/** A shuffled copy (Fisher-Yates). `random` returns a number in [0, 1), as Math.random does. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── The answer timer ──────────────────────────────────────────────────────────────────────────────

/** Target length of a first answer, in seconds. */
export const ANSWER_SECONDS = 120;

interface AnswerPart {
  key: "situation" | "action" | "result" | "learning";
  label: string;
  /** One word for the timer bar, where the first part is too narrow for its full label. */
  short: string;
  /** Share of the answer, 0 to 1. The shares add up to 1. */
  share: number;
  /** What to say in this part. */
  cue: string;
}

/** The STAR+L time budget: most of the answer is what you did. */
export const ANSWER_PARTS: readonly AnswerPart[] = [
  {
    key: "situation",
    label: "Situation and task",
    short: "Setup",
    share: 0.15,
    cue: "The system, what was at risk, your constraint.",
  },
  { key: "action", label: "Action", short: "Action", share: 0.6, cue: "Three things you did, and why you chose them." },
  { key: "result", label: "Result", short: "Result", share: 0.15, cue: "The number that moved, and what stayed safe." },
  {
    key: "learning",
    label: "Learning",
    short: "+L",
    share: 0.1,
    cue: "What you changed so it does not happen again.",
  },
];

/** The part of the answer a speaker should be in after `seconds`, or null once the time is up. */
export function partAt(seconds: number, total = ANSWER_SECONDS): AnswerPart | null {
  let end = 0;
  for (const part of ANSWER_PARTS) {
    end += part.share * total;
    if (seconds < end - 1e-9) return part;
  }
  return null;
}

/** "1:05" for 65 seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
