// The reader's own interview stories, written in the story builder: the browser store and the checks shown
// while writing (speaking time against the STAR+L budget, "I" against "we", a result without a number).
//
// Stories live in this browser's localStorage. When the account sync is on and the reader is signed in,
// src/lib/practice-sync.ts copies them to the account; nothing else touches the storage key.
// No zod here: this file ships to the browser, and every stored entry is shape-checked by hand on the way in.

import { ANSWER_PARTS } from "./practice";

const STORIES_KEY = "tts_stories_v1";

/** Fired on `window` after this page changes the stored stories, so every tool on it can update. */
export const STORIES_EVENT = "tts-stories";

export const STORY_PARTS = ["situation", "action", "result", "learning"] as const;
export type StoryPart = (typeof STORY_PARTS)[number];

export interface Story {
  id: string;
  title: string;
  situation: string;
  action: string;
  result: string;
  learning: string;
  /** What the story can answer: slugs from content/question-bank/signals.yaml. */
  covers: string[];
  /** Last edit (ISO 8601). The newer copy wins when two devices disagree. */
  updatedAt: string;
  /** True once the account has this copy. */
  synced?: boolean;
}

/** Size limits, the same in the browser and in the API. */
export const STORY_LIMITS = {
  stories: 30,
  title: 120,
  covers: 40,
  part: { situation: 1500, action: 4000, result: 1500, learning: 1500 } satisfies Record<StoryPart, number>,
} as const;

const ID = /^[a-z0-9][a-z0-9-]{5,39}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isStoryId = (v: unknown): v is string => typeof v === "string" && ID.test(v);

/** A new story id from 12 random base-36 digits. `random` returns a number in [0, 1), as Math.random does. */
export function newStoryId(random: () => number): string {
  let out = "s-";
  for (let i = 0; i < 12; i++) out += Math.floor(random() * 36).toString(36);
  return out;
}

export function emptyStory(id: string, now: Date): Story {
  return {
    id,
    title: "",
    situation: "",
    action: "",
    result: "",
    learning: "",
    covers: [],
    updatedAt: now.toISOString(),
  };
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** One stored entry as a Story, or null when it is not one. Text over a limit is cut to the limit. */
export function toStory(value: unknown): Story | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!isStoryId(v.id) || typeof v.updatedAt !== "string" || Number.isNaN(Date.parse(v.updatedAt))) return null;
  const covers = Array.isArray(v.covers)
    ? [...new Set(v.covers.filter((c): c is string => typeof c === "string" && SLUG.test(c) && c.length <= 60))]
    : [];
  return {
    id: v.id,
    title: clip(v.title, STORY_LIMITS.title),
    situation: clip(v.situation, STORY_LIMITS.part.situation),
    action: clip(v.action, STORY_LIMITS.part.action),
    result: clip(v.result, STORY_LIMITS.part.result),
    learning: clip(v.learning, STORY_LIMITS.part.learning),
    covers: covers.slice(0, STORY_LIMITS.covers),
    updatedAt: v.updatedAt,
    ...(v.synced === true ? { synced: true } : {}),
  };
}

/** Keeps the well-formed stories of whatever was stored, up to the limit. */
export function parseStories(raw: string | null): Story[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: Story[] = [];
  for (const entry of parsed) {
    const story = toStory(entry);
    if (!story || seen.has(story.id)) continue;
    seen.add(story.id);
    out.push(story);
    if (out.length === STORY_LIMITS.stories) break;
  }
  return out;
}

export function readStories(): Story[] {
  try {
    return parseStories(window.localStorage.getItem(STORIES_KEY));
  } catch {
    return [];
  }
}

/** Replaces the stored stories and tells the page. Returns false when the browser refused to store them. */
export function writeStories(stories: readonly Story[]): boolean {
  try {
    window.localStorage.setItem(STORIES_KEY, JSON.stringify(stories.slice(0, STORY_LIMITS.stories)));
    window.dispatchEvent(new Event(STORIES_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** The story as the account stores it: without this browser's `synced` mark. */
export function storyBody(story: Story): Omit<Story, "synced"> {
  return {
    id: story.id,
    title: story.title,
    situation: story.situation,
    action: story.action,
    result: story.result,
    learning: story.learning,
    covers: story.covers,
    updatedAt: story.updatedAt,
  };
}

/** The list with `story` added or replaced (same id). A new story goes first. */
export function withStory(stories: readonly Story[], story: Story): Story[] {
  return stories.some((s) => s.id === story.id)
    ? stories.map((s) => (s.id === story.id ? story : s))
    : [story, ...stories];
}

// ── Checks shown while writing ────────────────────────────────────────────────────────────────────

/** A comfortable speaking pace for an interview answer, in words per minute. */
const WORDS_PER_MINUTE = 140;

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export const speakingSeconds = (words: number) => Math.round((words / WORDS_PER_MINUTE) * 60);

export interface PartTiming {
  part: StoryPart;
  words: number;
  seconds: number;
  /** Share of the whole story, 0 to 1 (0 for an empty story). */
  share: number;
  /** The share this part should have, from the STAR+L time budget. */
  target: number;
}

export function storyTiming(story: Pick<Story, StoryPart>): { parts: PartTiming[]; words: number; seconds: number } {
  const counts = STORY_PARTS.map((part) => wordCount(story[part]));
  const words = counts.reduce((a, b) => a + b, 0);
  const parts = STORY_PARTS.map((part, i) => ({
    part,
    words: counts[i],
    seconds: speakingSeconds(counts[i]),
    share: words ? counts[i] / words : 0,
    target: ANSWER_PARTS.find((p) => p.key === part)!.share,
  }));
  return { parts, words, seconds: speakingSeconds(words) };
}

/** How often the text says "I" and how often "we" (with I'm, I've, we're and so on). */
export function countIAndWe(text: string): { i: number; we: number } {
  return { i: (text.match(/\bI\b/g) ?? []).length, we: (text.match(/\bwe\b/gi) ?? []).length };
}

export interface StoryCheck {
  id: "length" | "action-share" | "setup-share" | "i-we" | "result-number" | "learning";
  ok: boolean;
  text: string;
}

const percent = (share: number) => `${Math.round(share * 100)}%`;
const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** What a listener would notice, in the order to fix it. Empty until there is enough text to judge. */
export function storyChecks(story: Pick<Story, StoryPart>): StoryCheck[] {
  const { parts, words, seconds } = storyTiming(story);
  if (words < 40) return [];
  const share = (part: StoryPart) => parts.find((p) => p.part === part)!.share;
  const { i, we } = countIAndWe(story.action);
  return [
    seconds > 150
      ? { id: "length", ok: false, text: `About ${minutes(seconds)} spoken. Cut it to two minutes.` }
      : seconds < 75
        ? { id: "length", ok: false, text: `About ${minutes(seconds)} spoken. Add detail to what you did.` }
        : { id: "length", ok: true, text: `About ${minutes(seconds)} spoken, which fits a first answer.` },
    share("action") >= 0.5
      ? { id: "action-share", ok: true, text: `${percent(share("action"))} of the story is what you did.` }
      : {
          id: "action-share",
          ok: false,
          text: `Only ${percent(share("action"))} of the story is what you did. Aim for about 60%.`,
        },
    share("situation") <= 0.25
      ? { id: "setup-share", ok: true, text: `The setup is ${percent(share("situation"))} of the story.` }
      : {
          id: "setup-share",
          ok: false,
          text: `The setup is ${percent(share("situation"))} of the story. Keep it near 15%.`,
        },
    i >= we
      ? { id: "i-we", ok: true, text: `Your actions say "I" ${i} times and "we" ${we} times.` }
      : {
          id: "i-we",
          ok: false,
          text: `Your actions say "we" ${we} times and "I" ${i} times. Say what you did yourself.`,
        },
    /\d/.test(story.result)
      ? { id: "result-number", ok: true, text: "The result has a number." }
      : { id: "result-number", ok: false, text: "The result has no number. Say what moved, and by how much." },
    wordCount(story.learning) >= 5
      ? { id: "learning", ok: true, text: "The story ends with what you learned." }
      : { id: "learning", ok: false, text: "Add what you learned and what you do differently now." },
  ];
}

// ── Coverage and merging ──────────────────────────────────────────────────────────────────────────

/** The slugs of `wanted` that no story covers. */
export function gaps(stories: readonly Pick<Story, "covers">[], wanted: readonly string[]): string[] {
  const covered = new Set(stories.flatMap((s) => s.covers));
  return wanted.filter((slug) => !covered.has(slug));
}

/**
 * Combines this browser's stories with the account's. For a story both sides have, the newer edit wins. A story
 * only the account has is new here. A story only this browser has is uploaded when it was never synced, and
 * dropped when it was: it has been deleted on another device.
 */
export function mergeStories(local: readonly Story[], remote: readonly Story[]): { stories: Story[]; upload: Story[] } {
  const remoteById = new Map(remote.map((s) => [s.id, s]));
  const stories: Story[] = [];
  const upload: Story[] = [];
  for (const mine of local) {
    const theirs = remoteById.get(mine.id);
    remoteById.delete(mine.id);
    if (!theirs) {
      if (mine.synced) continue;
      stories.push(mine);
      upload.push(mine);
    } else if (Date.parse(mine.updatedAt) > Date.parse(theirs.updatedAt)) {
      stories.push(mine);
      upload.push(mine);
    } else {
      stories.push({ ...theirs, synced: true });
    }
  }
  for (const theirs of remoteById.values()) stories.push({ ...theirs, synced: true });
  return { stories: stories.slice(0, STORY_LIMITS.stories), upload };
}
