import { MAX_MERGE_ITEMS, type MergeItem } from "./content-key";

// Signed-out progress lives in this browser's localStorage (never tokens or personal data) until the learner
// signs in; then /sign-in/complete merges it into the account and clears it.

export const LOCAL_PROGRESS_KEY = "oa_progress_v1";

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

export function clearLocalProgress(): void {
  try {
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}
