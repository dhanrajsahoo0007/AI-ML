// Copies practice data between this browser and the reader's account: the ratings from practice mode
// (lib/practice.ts) and, when the account allows it, the stories from the story builder (lib/stories.ts).
//
// The browser is written first, so every tool works signed out. Signed in, each change is also sent to
// /api/practice/*, and the first tool on a page pulls the account's copy and merges the two (a new device gets
// the account's data; anything written signed out is uploaded). A failed request is never an error for the
// reader: the data stays in the browser and is sent again on the next visit.
// No zod here: this file ships to the browser. The API validates what it receives, and what comes back is
// shape-checked by hand before it is stored.

import { mergePracticeLogs, parsePracticeLog, readPracticeLog, writePracticeLog, type Rating } from "./practice";
import { mergeStories, readStories, storyBody, toStory, writeStories, type Story } from "./stories";

/** Where the reader's practice data is kept: this browser only, or the account as well. */
export type SyncState = "browser" | "account";

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function send(path: string, method: string, body: unknown): Promise<boolean> {
  try {
    return (await fetch(path, json(method, body))).ok;
  } catch {
    return false;
  }
}

let started: Promise<SyncState> | null = null;
/** Whether the account stores story text (off until the site owner turns the switch on). */
let storySync = false;

async function pull(): Promise<SyncState> {
  let data: { ratings?: unknown; stories?: unknown };
  try {
    const res = await fetch("/api/practice");
    if (!res.ok) return "browser";
    data = (await res.json()) as typeof data;
  } catch {
    return "browser";
  }

  const remoteLog = parsePracticeLog(JSON.stringify(data.ratings ?? {}));
  const ratings = mergePracticeLogs(readPracticeLog(), remoteLog);
  const changed = JSON.stringify(ratings.log) !== JSON.stringify(readPracticeLog());
  if (changed) writePracticeLog(ratings.log);

  storySync = Array.isArray(data.stories);
  let upload: Story[] = [];
  if (storySync) {
    const remote = (data.stories as unknown[]).flatMap((s) => toStory(s) ?? []);
    const local = readStories();
    const merged = mergeStories(local, remote);
    upload = merged.upload;
    if (JSON.stringify(merged.stories) !== JSON.stringify(local)) writeStories(merged.stories);
  }

  const ratingItems = Object.entries(ratings.upload).map(([questionId, e]) => ({ questionId, ...e }));
  if (ratingItems.length || upload.length) {
    const stories = upload.map(storyBody);
    const ok = await send("/api/practice/merge", "POST", { ratings: ratingItems, stories });
    if (ok && upload.length) markSynced(upload.map((s) => s.id));
  }
  return "account";
}

function markSynced(ids: readonly string[]) {
  const done = new Set(ids);
  const stories = readStories();
  if (stories.some((s) => done.has(s.id) && !s.synced)) {
    writeStories(stories.map((s) => (done.has(s.id) ? { ...s, synced: true } : s)));
  }
}

/** Merges this browser's practice data with the account's, once per page load. */
export function syncPractice(): Promise<SyncState> {
  started ??= pull();
  return started;
}

/** Sends one rating to the account. Resolves to where it is now kept. */
export async function pushRating(questionId: string, rating: Rating): Promise<SyncState> {
  return (await send("/api/practice/ratings", "POST", { questionId, rating })) ? "account" : "browser";
}

/** Sends one story to the account, if the account stores stories. */
export async function pushStory(story: Story): Promise<SyncState> {
  if ((await syncPractice()) !== "account" || !storySync) return "browser";
  if (!(await send("/api/practice/stories", "POST", { story: storyBody(story) }))) return "browser";
  // Only mark the copy that was sent: the reader may have typed more since.
  const current = readStories().find((s) => s.id === story.id);
  if (current && current.updatedAt === story.updatedAt) markSynced([story.id]);
  return "account";
}

/** Removes one story from the account, if the account stores stories. */
export async function pushStoryDelete(id: string): Promise<SyncState> {
  if ((await syncPractice()) !== "account" || !storySync) return "browser";
  return (await send("/api/practice/stories", "DELETE", { id })) ? "account" : "browser";
}
