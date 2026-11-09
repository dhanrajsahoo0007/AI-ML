"use client";

import { useState } from "react";
import { cx } from "./cx";
import { LATENCY_ROWS, LATENCY_ROW_BY_ID, compareRows, fitIn, logFraction } from "./latency-ladder";
import { formatCompact, formatNs } from "./format";
import { WidgetFrame, toneColor } from "./shared.client";

// Grid lines at 10 ns, 100 ns, … 100 ms.
const DECADES = [1, 2, 3, 4, 5, 6, 7, 8];

interface LatencyLadderProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Row id every other row is compared against. */
  compareTo: string;
  /** Row id selected on first render. */
  highlight: string;
  /** Window for the "fit in" column, in ms. */
  windowMs: number;
}

// Log-scale ladder. Hovering or focusing a row compares it with the reference row; clicking pins it.
export function LatencyLadder({ idBase, title, compareTo, highlight, windowMs }: LatencyLadderProps) {
  const selectId = `${idBase}-selectId`;
  const [against, setAgainst] = useState(compareTo);
  const [pinned, setPinned] = useState(highlight);
  const [hover, setHover] = useState<string | null>(null);
  const active = LATENCY_ROW_BY_ID[hover ?? pinned] ?? LATENCY_ROWS[0];
  const ref = LATENCY_ROW_BY_ID[against] ?? LATENCY_ROWS[0];
  const fits = fitIn(windowMs, active.ns);

  return (
    <WidgetFrame
      label="Latency ladder"
      title={title ?? "How slow is slow?"}
      intro="Bars use a log scale: each grid line is 10× slower than the one before. Hover, focus or click a row to compare it."
      footer="Typical figures for current hardware, rounded to orders of magnitude. The gaps between rows matter more than the exact numbers."
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={selectId} className="text-muted-foreground">
          Compare against
        </label>
        <select
          id={selectId}
          value={against}
          onChange={(e) => setAgainst(e.target.value)}
          className="rounded-md border border-hairline bg-paper px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-ring"
        >
          {LATENCY_ROWS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div
        aria-live="polite"
        className="mt-3 rounded-lg border-l-2 bg-paper-2/60 px-3 py-2"
        style={{ borderColor: toneColor(active.tone) }}
      >
        <div className="font-medium text-ink">{compareRows(active, ref)}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {active.note} In {windowMs} ms you can do {fits >= 1 ? formatCompact(fits) : "less than one"} of these.
        </div>
      </div>

      <ul className="mt-4 space-y-1" onMouseLeave={() => setHover(null)}>
        {LATENCY_ROWS.map((r) => {
          const on = r.id === active.id;
          const n = fitIn(windowMs, r.ns);
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={r.id === pinned}
                onClick={() => setPinned(r.id)}
                onMouseEnter={() => setHover(r.id)}
                onFocus={() => setHover(r.id)}
                onBlur={() => setHover(null)}
                className={cx(
                  "grid w-full grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-x-2 gap-y-1 rounded-md px-2 py-1 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4.5rem_5rem]",
                  on ? "bg-paper-2" : "hover:bg-paper-2/60",
                  r.id === against && "font-semibold"
                )}
              >
                <span className="truncate text-ink">{r.label}</span>
                <span className="relative order-last col-span-2 h-3 sm:order-none sm:col-span-1">
                  {DECADES.map((d) => (
                    <span
                      key={d}
                      className="absolute inset-y-0 w-px bg-hairline"
                      style={{ left: `${logFraction(10 ** d) * 100}%` }}
                    />
                  ))}
                  <span
                    className="absolute inset-y-0 left-0 rounded-sm transition-[width]"
                    style={{
                      width: `${Math.max(1.5, logFraction(r.ns) * 100)}%`,
                      background: toneColor(r.tone),
                      opacity: on ? 1 : 0.7,
                    }}
                  />
                </span>
                <span className="text-right tabular-nums text-ink-2">{formatNs(r.ns)}</span>
                <span className="hidden text-right tabular-nums text-muted-foreground sm:block">
                  {n >= 1 ? formatCompact(n) : "<1"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-1 hidden grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4.5rem_5rem] gap-2 px-2 text-[11px] text-muted-foreground sm:grid">
        <span />
        <span>1 ns → 150 ms</span>
        <span className="text-right">latency</span>
        <span className="text-right">fit in {windowMs} ms</span>
      </div>
    </WidgetFrame>
  );
}
