import { lcg, randInt } from "./hash";

// A small "users" table and a B-tree-like index (a sorted array of [value, row id]) over one column, so the
// reader can compare a full table scan with an index lookup. Rows come from a seeded generator, so the
// server and the browser build the same table.

interface UserRow {
  id: number;
  email: string;
  country: string;
  age: number;
}

export type IndexColumn = "id" | "email" | "country" | "age";

export const INDEX_COLUMNS: readonly { value: IndexColumn; label: string; hint: string }[] = [
  { value: "id", label: "id", hint: "Primary key: unique, always indexed." },
  { value: "email", label: "email", hint: "Unique per user: an index finds one row." },
  { value: "country", label: "country", hint: "Few distinct values: even with an index, many rows match." },
  { value: "age", label: "age", hint: "About 50 distinct values: an index narrows to a few dozen rows." },
];

const COUNTRIES = ["IN", "US", "BR", "DE", "GB", "JP", "NG", "FR", "ID", "MX", "CA", "AU"] as const;
const NAMES = ["asha", "ben", "chen", "dara", "eli", "fatima", "gus", "hana", "ivan", "jade", "kofi", "lena"] as const;

const TABLE_SIZE = 1000;

export function generateUsers(n: number = TABLE_SIZE, seed = 7): UserRow[] {
  const next = lcg(seed);
  return Array.from({ length: n }, (_, i) => {
    const id = i + 1;
    return {
      id,
      email: `${NAMES[randInt(next, 0, NAMES.length - 1)]}${id}@example.com`,
      country: COUNTRIES[randInt(next, 0, COUNTRIES.length - 1)],
      age: randInt(next, 18, 67),
    };
  });
}

type IndexEntry = readonly [value: string | number, rowId: number];

/** The index: entries sorted by value, then row id. */
export function buildIndex(rows: readonly UserRow[], column: IndexColumn): IndexEntry[] {
  return rows.map((r): IndexEntry => [r[column], r.id]).sort((a, b) => compare(a[0], b[0]) || a[1] - b[1]);
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** Coerces the text the reader typed to the column's type: numbers for id and age. */
export function parseQueryValue(column: IndexColumn, text: string): string | number | null {
  const t = text.trim();
  if (t === "") return null;
  if (column === "id" || column === "age") {
    const n = Number(t);
    return Number.isInteger(n) ? n : null;
  }
  return column === "country" ? t.toUpperCase() : t.toLowerCase();
}

interface QueryResult {
  matches: UserRow[];
  /** Table rows read: every row for a scan, only the matches for an index lookup. */
  rowsScanned: number;
  /** Comparisons inside the index to find the first match (binary search). 0 for a scan. */
  indexSteps: number;
  usedIndex: boolean;
}

/** `SELECT * FROM users WHERE column = value`, with or without an index on that column. */
export function runQuery(
  rows: readonly UserRow[],
  column: IndexColumn,
  value: string | number,
  index: readonly IndexEntry[] | null
): QueryResult {
  if (!index) {
    const matches = rows.filter((r) => r[column] === value);
    return { matches, rowsScanned: rows.length, indexSteps: 0, usedIndex: false };
  }
  let lo = 0;
  let hi = index.length;
  let steps = 0;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    steps++;
    if (compare(index[mid][0], value) < 0) lo = mid + 1;
    else hi = mid;
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  const matches: UserRow[] = [];
  for (let i = lo; i < index.length && compare(index[i][0], value) === 0; i++) {
    const row = byId.get(index[i][1]);
    if (row) matches.push(row);
  }
  return { matches, rowsScanned: matches.length, indexSteps: steps, usedIndex: true };
}

/** A value that exists in the table for this column, to prefill the query box. */
export function sampleValue(rows: readonly UserRow[], column: IndexColumn): string {
  const row = rows[Math.min(rows.length - 1, 420)];
  return row ? String(row[column]) : "";
}
