// The text a reader types into a NumberField, read as a number. Kept apart from the component so the rules
// are unit-tested: an empty or partial entry ("", "-", "1e") is not a value yet, and nothing is clamped while
// the reader is still typing (clamping "" to min turned a retyped "5" into "15").

/** The typed value when it is a finite number inside [min, max]; otherwise null (keep the last good value). */
export function parseDraft(draft: string, min: number, max: number): number | null {
  const t = draft.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** The value to keep when the field loses focus: the draft clamped into range, or `fallback` if it is not a number. */
export function commitDraft(draft: string, min: number, max: number, fallback: number): number {
  const t = draft.trim();
  const n = t === "" ? Number.NaN : Number(t);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
