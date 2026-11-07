// Compares a solution's return value with a test's expected value (plan §15.1 stage B). Values are compared
// as JSON data: arrays by position, objects by key regardless of order, numbers by value (so 1 and 1.0 match),
// and `undefined` is treated as `null`. Pure: shared by the JS worker, the page and the unit tests.

/** Converts a returned value to plain JSON data, or throws for values JSON can't hold (functions, cycles). */
export function toJsonValue(value: unknown): unknown {
  if (value === undefined) return null;
  const text = JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === "bigint") return Number(v);
    if (v instanceof Map) return Object.fromEntries(v);
    if (v instanceof Set) return [...v];
    return v;
  });
  return text === undefined ? null : JSON.parse(text);
}

export function sameValue(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (actual === null || expected === null || typeof actual !== "object" || typeof expected !== "object") {
    return typeof actual === "number" && typeof expected === "number" && Number.isNaN(actual) && Number.isNaN(expected);
  }
  if (Array.isArray(actual) !== Array.isArray(expected)) return false;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((v, i) => sameValue(v, expected[i]));
  }
  const a = actual as Record<string, unknown>;
  const e = expected as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(e).length && keys.every((k) => Object.hasOwn(e, k) && sameValue(a[k], e[k]));
}

/** Short JSON text for showing a value in the results panel. */
export function formatValue(value: unknown, max = 300): string {
  let text: string;
  try {
    text = JSON.stringify(value) ?? "undefined";
  } catch {
    text = String(value);
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
