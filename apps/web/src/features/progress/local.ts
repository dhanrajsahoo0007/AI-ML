// No zod here: this file ships to the browser (the merge island), the API validates what it sends.
import type { MergeItem } from "./content-key";

/** Cap on how many signed-out entries are merged at sign-in. */
export const MAX_MERGE_ITEMS = 500;

// Signed-out progress lives in this browser's localStorage (never tokens or personal data) until the learner
// signs in; then /sign-in/complete merges it into the account and clears it.

const LOCAL_PROGRESS_KEY = "oa_progress_v1";

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

function read(): LocalProgress {
  try {
    const raw = window.localStorage.getItem(LOCAL_PROGRESS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as LocalProgress) : {};
  } catch {
    return {};
  }
}

/** The stored entries as merge items (invalid ones are dropped by the API's schema check). */
export function readLocalProgress(): MergeItem[] {
  const { completed = {}, bookmarks = {} } = read();
  const keys = new Set([...Object.keys(completed), ...Object.keys(bookmarks)]);
  return [...keys].slice(0, MAX_MERGE_ITEMS).map((contentKey) => ({
    contentKey,
    ...(typeof completed[contentKey] === "string" ? { completedAt: completed[contentKey] } : {}),
    ...(typeof bookmarks[contentKey] === "string" ? { bookmarkedAt: bookmarks[contentKey] } : {}),
  }));
}

/** Every content key this browser has marked complete. */
export function completedKeys(): string[] {
  return Object.keys(read().completed ?? {});
}

/** Whether this browser has `contentKey` marked complete / bookmarked. */
export function localProgressState(contentKey: string): { complete: boolean; bookmark: boolean } {
  const { completed = {}, bookmarks = {} } = read();
  return { complete: contentKey in completed, bookmark: contentKey in bookmarks };
}

/** Records (or removes) a completion or bookmark in this browser; merged into the account at sign-in. */
export function setLocalProgress(contentKey: string, kind: "complete" | "bookmark", on: boolean): void {
  const data = read();
  const field = kind === "complete" ? "completed" : "bookmarks";
  const entries = { ...(data[field] ?? {}) };
  if (on) entries[contentKey] = new Date().toISOString();
  else delete entries[contentKey];
  try {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify({ ...data, [field]: entries }));
    announce();
  } catch {
    // Storage blocked (private mode): the account copy, if signed in, still has it.
  }
}

export function clearLocalProgress(): void {
  try {
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
    announce();
  } catch {
    // Storage blocked: nothing to clear.
  }
}
