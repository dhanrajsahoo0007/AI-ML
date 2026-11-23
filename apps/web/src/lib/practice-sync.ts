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

/** The same number as MAX_MERGE_RATINGS in features/practice/schema.ts. */
const RATINGS_PER_REQUEST = 200;

let started: Promise<SyncState> | null = null;
/** Whether the account stores story text (off until the site owner turns the switch on). */
let storySync = false;

// A signed-out visitor is asked once per tab, not on every page: the 401 is remembered here. The readable
// entitlement hint cookie (features/entitlements/hint.ts, set at sign-in) lifts it again.
const SIGNED_OUT_KEY = "tts_practice_signed_out";
const HINT_COOKIE = "tts_ent_hint";

function knownSignedOut(): boolean {
  try {
    if (document.cookie.split(/;\s*/).some((c) => c.startsWith(`${HINT_COOKIE}=`))) return false;
    return window.sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSignedOut(signedOut: boolean) {
  try {
    if (signedOut) window.sessionStorage.setItem(SIGNED_OUT_KEY, "1");
    else window.sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    // Storage blocked: the next page asks again.
  }
}

async function pull(): Promise<SyncState> {
  if (knownSignedOut()) return "browser";
  let data: { ratings?: unknown; stories?: unknown };
  try {
    const res = await fetch("/api/practice");
    if (res.status === 401) rememberSignedOut(true);
    if (!res.ok) return "browser";
    rememberSignedOut(false);
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

  // Requests stay under the API's body limit: ratings in batches, stories one at a time.
  const ratingItems = Object.entries(ratings.upload).map(([questionId, e]) => ({ questionId, ...e }));
  for (let i = 0; i < ratingItems.length; i += RATINGS_PER_REQUEST) {
    await send("/api/practice/merge", "POST", { ratings: ratingItems.slice(i, i + RATINGS_PER_REQUEST) });
  }
  const sent: string[] = [];
  for (const story of upload) {
    if (await send("/api/practice/stories", "POST", { story: storyBody(story) })) sent.push(story.id);
  }
  if (sent.length) markSynced(sent);
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
  if ((await syncPractice()) !== "account") return "browser";
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
