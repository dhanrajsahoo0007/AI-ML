// Ticks on a <PrepChecklist>: which items of which list this browser has marked done.
// Kept in localStorage only (never tokens or personal data); the lists themselves are in the page.
// No zod here: this file ships to the browser, and what was stored is shape-checked by hand.

const CHECKLIST_KEY = "tts_checklist_v1";

/** Fired on `window` after this page changes the stored ticks. */
export const CHECKLIST_EVENT = "tts-checklist";

type Ticks = Record<string, string[]>;

export function parseTicks(raw: string | null): Ticks {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Ticks = {};
  for (const [list, items] of Object.entries(parsed as Record<string, unknown>)) {
    if (Array.isArray(items)) out[list] = [...new Set(items.filter((i): i is string => typeof i === "string"))];
  }
  return out;
}

/** The ticks with `item` of `list` set to `done`. */
export function withTick(ticks: Ticks, list: string, item: string, done: boolean): Ticks {
  const rest = (ticks[list] ?? []).filter((i) => i !== item);
  return { ...ticks, [list]: done ? [...rest, item] : rest };
}

function read(): Ticks {
  try {
    return parseTicks(window.localStorage.getItem(CHECKLIST_KEY));
  } catch {
    return {};
  }
}

function write(ticks: Ticks) {
  try {
    window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(ticks));
    window.dispatchEvent(new Event(CHECKLIST_EVENT));
  } catch {
    // Storage is full or blocked: the ticks still show for this visit.
  }
}

/** The ids of the items of `list` that are ticked in this browser. */
export const readTicks = (list: string): string[] => read()[list] ?? [];

export function setTick(list: string, item: string, done: boolean): string[] {
  const next = withTick(read(), list, item, done);
  write(next);
  return next[list];
}

export function clearTicks(list: string): void {
  const { [list]: _gone, ...rest } = read();
  void _gone;
  write(rest);
}
