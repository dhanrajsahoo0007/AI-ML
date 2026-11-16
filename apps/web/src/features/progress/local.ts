// No zod here: this file ships to the browser (the merge island), the API validates what it sends.
import type { MergeItem } from "./content-key";

/** Cap on how many signed-out entries are merged at sign-in. */
export const MAX_MERGE_ITEMS = 500;

// Signed-out progress lives in `tts_progress_v1` (never tokens or personal data) until the learner signs in;
// then /sign-in/complete merges it into the account, clears `tts_progress_v1`, and hydrates the account's
// saved progress into `tts_progress_cache_v1` so sidebar checkmarks and section percentages stay visible across
// devices without querying the database on content page loads.

const LOCAL_PROGRESS_KEY = "tts_progress_v1";
const SYNCED_PROGRESS_KEY = "tts_progress_cache_v1";

/** Fired on `window` after this page changes the stored progress, so progress marks elsewhere on it can update. */
export const PROGRESS_EVENT = "oa-progress";

function announce() {
  try {
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  } catch {
    // No window (never the case in the browser): nothing to tell.
  }
}

interface LocalProgress {
  completed?: Record<string, string>;
  bookmarks?: Record<string, string>;
}

function readSlot(storageKey: string): LocalProgress {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as LocalProgress) : {};
  } catch {
    return {};
  }
}

function readPending(): LocalProgress {
  return readSlot(LOCAL_PROGRESS_KEY);
}

function readSynced(): LocalProgress {
  return readSlot(SYNCED_PROGRESS_KEY);
}

function mergedView(): { completed: Record<string, string>; bookmarks: Record<string, string> } {
  const synced = readSynced();
  const pending = readPending();
  return {
    completed: { ...(synced.completed ?? {}), ...(pending.completed ?? {}) },
    bookmarks: { ...(synced.bookmarks ?? {}), ...(pending.bookmarks ?? {}) },
  };
}

/** The stored signed-out entries as merge items (invalid ones are dropped by the API's schema check). */
export function readLocalProgress(): MergeItem[] {
  const { completed = {}, bookmarks = {} } = readPending();
  const keys = new Set([...Object.keys(completed), ...Object.keys(bookmarks)]);
  return [...keys].slice(0, MAX_MERGE_ITEMS).map((contentKey) => ({
    contentKey,
    ...(typeof completed[contentKey] === "string" ? { completedAt: completed[contentKey] } : {}),
    ...(typeof bookmarks[contentKey] === "string" ? { bookmarkedAt: bookmarks[contentKey] } : {}),
  }));
}

/** Every content key this browser knows is marked complete (pending signed-out + synced account cache). */
export function completedKeys(): string[] {
  return Object.keys(mergedView().completed);
}

/** Whether this browser has `contentKey` marked complete / bookmarked. */
export function localProgressState(contentKey: string): { complete: boolean; bookmark: boolean } {
  const { completed, bookmarks } = mergedView();
  return { complete: contentKey in completed, bookmark: contentKey in bookmarks };
}

/**
 * Records (or removes) a completion or bookmark in this browser. Writes to the pending queue (`tts_progress_v1`)
 * when `pending` is true (default), and always updates the active cache (`tts_progress_cache_v1`).
 */
export function setLocalProgress(
  contentKey: string,
  kind: "complete" | "bookmark",
  on: boolean,
  options?: { pending?: boolean }
): void {
  const field = kind === "complete" ? "completed" : "bookmarks";
  const now = new Date().toISOString();
  const writePending = options?.pending ?? true;

  try {
    if (writePending) {
      const pending = readPending();
      const pendingEntries = { ...(pending[field] ?? {}) };
      if (on) pendingEntries[contentKey] = now;
      else delete pendingEntries[contentKey];
      window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify({ ...pending, [field]: pendingEntries }));
    }

    const synced = readSynced();
    const syncedEntries = { ...(synced[field] ?? {}) };
    if (on) syncedEntries[contentKey] = now;
    else delete syncedEntries[contentKey];
    window.localStorage.setItem(SYNCED_PROGRESS_KEY, JSON.stringify({ ...synced, [field]: syncedEntries }));

    announce();
  } catch {
    // Storage blocked (private mode): the account copy, if signed in, still has it.
  }
}

/** Clears a single entry from the signed-out pending queue once the account has accepted it. */
export function clearPendingProgressEntry(contentKey: string, kind: "complete" | "bookmark"): void {
  const field = kind === "complete" ? "completed" : "bookmarks";
  try {
    const pending = readPending();
    const entries = { ...(pending[field] ?? {}) };
    if (!(contentKey in entries)) return;
    delete entries[contentKey];
    const next: LocalProgress = { ...pending, [field]: entries };
    const hasCompleted = Object.keys(next.completed ?? {}).length > 0;
    const hasBookmarks = Object.keys(next.bookmarks ?? {}).length > 0;
    if (!hasCompleted && !hasBookmarks) window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
    else window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Hydrates the browser's synced progress cache from the user's account rows. */
export function hydrateLocalProgress(
  completedKeysList: readonly string[],
  bookmarkKeysList: readonly string[] = []
): void {
  const now = new Date().toISOString();
  const prev = readSynced();
  const completed: Record<string, string> = {};
  for (const key of completedKeysList) {
    completed[key] = prev.completed?.[key] ?? now;
  }
  const bookmarks: Record<string, string> = {};
  for (const key of bookmarkKeysList) {
    bookmarks[key] = prev.bookmarks?.[key] ?? now;
  }
  try {
    window.localStorage.setItem(SYNCED_PROGRESS_KEY, JSON.stringify({ completed, bookmarks }));
    announce();
  } catch {
    // Storage blocked.
  }
}

/** Clears the signed-out pending merge queue (`tts_progress_v1`). */
export function clearLocalProgress(): void {
  try {
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
    announce();
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Clears both the pending queue and the synced account cache (called on sign-out). */
export function clearAllLocalProgress(): void {
  try {
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
    window.localStorage.removeItem(SYNCED_PROGRESS_KEY);
    announce();
  } catch {
    // Storage blocked: nothing to clear.
  }
}
