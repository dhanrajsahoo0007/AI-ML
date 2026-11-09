"use client";

import { useMemo, useState } from "react";
import {
  INDEX_COLUMNS,
  buildIndex,
  generateUsers,
  parseQueryValue,
  runQuery,
  sampleValue,
  type IndexColumn,
} from "./index-playground";
import { formatInt } from "./format";
import { Segmented, Stat, WidgetFrame, toneColor, ScrollX } from "./shared.client";

interface IndexPlaygroundProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Column queried on first render. */
  column: IndexColumn;
  /** Whether that column starts with an index (the id column always has one). */
  indexed: boolean;
}

// Built once per page: the generator is seeded, so the server and the browser get the same 1,000 rows.
const ROWS = generateUsers();
const BLOCK = 10;
const BLOCKS = Math.ceil(ROWS.length / BLOCK);
const PREVIEW = 5;

// `SELECT * FROM users WHERE <column> = <value>`, with and without an index. The grid has one cell per 10 rows
// and lights up every block the query had to read.
export function IndexPlayground({
  idBase,
  title,
  column: initialColumn,
  indexed: initialIndexed,
}: IndexPlaygroundProps) {
  const valueId = `${idBase}-valueId`;
  const indexId = `${idBase}-indexId`;
  const [column, setColumn] = useState<IndexColumn>(initialColumn);
  const [indexed, setIndexed] = useState<Record<IndexColumn, boolean>>({
    id: true,
    email: false,
    country: false,
    age: false,
    [initialColumn]: initialColumn === "id" || initialIndexed,
  });
  const [text, setText] = useState(() => sampleValue(ROWS, initialColumn));
  const hasIndex = column === "id" || indexed[column];
  const index = useMemo(() => (hasIndex ? buildIndex(ROWS, column) : null), [hasIndex, column]);
  const value = parseQueryValue(column, text);
  const result = value === null ? null : runQuery(ROWS, column, value, index);
  const read = new Set<number>();
  if (result) {
    if (result.usedIndex) for (const r of result.matches) read.add(Math.floor((r.id - 1) / BLOCK));
    else for (let b = 0; b < BLOCKS; b++) read.add(b);
  }
  const hint = INDEX_COLUMNS.find((c) => c.value === column)?.hint;
  const literal = value === null ? "?" : typeof value === "number" ? String(value) : `'${value}'`;

  return (
    <WidgetFrame
      label="Index playground"
      title={title ?? "Full scan or index lookup?"}
      intro={`A users table with ${formatInt(ROWS.length)} rows. Query one column, then add an index on it and compare how many rows the database reads.`}
      footer="The index is a sorted list of (value, row id), searched by halving, like the top levels of a B-tree. Each grid cell is 10 rows."
    >
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="mb-1 text-sm font-medium text-ink">Column</div>
          <Segmented
            label="Column"
            value={column}
            options={INDEX_COLUMNS}
            onChange={(c) => {
              setColumn(c);
              setText(sampleValue(ROWS, c));
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={valueId} className="text-sm font-medium text-ink">
            Value
          </label>
          <input
            id={valueId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-hairline bg-paper px-2 py-1 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <label htmlFor={indexId} className="flex items-center gap-2 pb-1 text-sm font-medium text-ink">
          <input
            id={indexId}
            type="checkbox"
            checked={hasIndex}
            disabled={column === "id"}
            onChange={(e) => setIndexed((cur) => ({ ...cur, [column]: e.target.checked }))}
            className="size-4 accent-[var(--dg-blue)]"
          />
          Index on {column}
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>

      <pre className="mt-3 whitespace-pre-wrap break-all rounded-md bg-paper-2 px-3 py-2 font-mono text-xs text-ink">
        SELECT * FROM users WHERE {column} = {literal};
      </pre>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
        <Stat
          label="Rows read"
          value={result ? formatInt(result.rowsScanned) : "–"}
          tone={result?.usedIndex ? "green" : "red"}
        />
        <Stat
          label="Index steps"
          value={result ? result.indexSteps : "–"}
          hint={result?.usedIndex ? "binary search" : "no index used"}
          tone="blue"
        />
        <Stat label="Matches" value={result ? formatInt(result.matches.length) : "–"} tone="violet" />
        <Stat label="Plan" value={result ? (result.usedIndex ? "Index seek" : "Full scan") : "–"} tone="neutral" />
      </div>

      <div
        className="mt-4 grid grid-cols-[repeat(25,minmax(0,1fr))] gap-0.5"
        role="img"
        aria-label={`${read.size} of ${BLOCKS} blocks of rows read`}
      >
        {Array.from({ length: BLOCKS }, (_, b) => (
          <span
            key={b}
            className="aspect-square rounded-[2px]"
            style={{ background: read.has(b) ? toneColor(result?.usedIndex ? "green" : "red") : "var(--paper-2)" }}
          />
        ))}
      </div>

      {result && result.matches.length > 0 && (
        <ScrollX label="Matching rows">
          <table className="w-full min-w-[420px] text-sm">
            <caption className="mb-1 text-left text-xs text-muted-foreground">
              {result.matches.length > PREVIEW
                ? `First ${PREVIEW} of ${formatInt(result.matches.length)} matching rows`
                : "Matching rows"}
            </caption>
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-muted-foreground">
                {(["id", "email", "country", "age"] as const).map((c) => (
                  <th key={c} scope="col" className="py-1 pr-3 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.matches.slice(0, PREVIEW).map((r) => (
                <tr key={r.id} className="border-b border-hairline/60 last:border-0">
                  <td className="py-1 pr-3 tabular-nums">{r.id}</td>
                  <td className="py-1 pr-3 font-mono text-xs">{r.email}</td>
                  <td className="py-1 pr-3">{r.country}</td>
                  <td className="py-1 tabular-nums">{r.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      )}
      {result && result.matches.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No rows match.</p>}
      {!result && <p className="mt-3 text-sm text-muted-foreground">Enter a whole number for {column}.</p>}
    </WidgetFrame>
  );
}
