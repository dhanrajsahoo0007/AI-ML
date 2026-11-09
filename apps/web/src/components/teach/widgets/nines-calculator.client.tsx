"use client";

import { useState } from "react";
import { NINES, NINES_LABEL, downtimeFor, downtimeRatio, ninesHint, type Nines } from "./nines";
import { formatRatio, formatSeconds } from "./format";
import { Segmented, WidgetFrame, toneColor, ScrollX } from "./shared.client";

interface NinesCalculatorProps {
  /** Id prefix every widget island gets from its server wrapper; this one has no labelled inputs that need it. */
  idBase: string;
  title?: string;
  /** First availability target, in percent. */
  a: Nines;
  /** Second availability target, in percent. */
  b: Nines;
}

const OPTIONS = NINES.map((n) => ({ value: String(n), label: `${n}%` }));
const PERIODS = [
  { key: "perDay", label: "Per day" },
  { key: "perWeek", label: "Per week" },
  { key: "perMonth", label: "Per month (30 d)" },
  { key: "perYear", label: "Per year" },
] as const;

// Two availability targets side by side, with the downtime each allows.
export function NinesCalculator({ title, a: initialA, b: initialB }: NinesCalculatorProps) {
  const [a, setA] = useState<Nines>(initialA);
  const [b, setB] = useState<Nines>(initialB);
  const da = downtimeFor(a);
  const db = downtimeFor(b);
  const yearMax = Math.max(da.perYear, db.perYear) || 1;
  const ratio = downtimeRatio(a, b);
  const pick = (v: string) => NINES.find((n) => String(n) === v) ?? NINES[0];

  return (
    <WidgetFrame
      label="Nines calculator"
      title={title ?? "What does each extra nine cost?"}
      intro="Pick two availability targets and compare the downtime each one allows."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { id: "A", v: a, set: setA, tone: "blue" as const },
          { id: "B", v: b, set: setB, tone: "violet" as const },
        ].map((s) => (
          <div key={s.id}>
            <div className="mb-1 text-sm font-medium text-ink">
              Target {s.id}: <span style={{ color: toneColor(s.tone) }}>{s.v}%</span>{" "}
              <span className="font-normal text-muted-foreground">({NINES_LABEL[s.v]})</span>
            </div>
            <Segmented
              label={`Target ${s.id}`}
              value={String(s.v)}
              options={OPTIONS}
              onChange={(v) => s.set(pick(v))}
            />
          </div>
        ))}
      </div>

      <ScrollX label="Allowed downtime">
        <table className="w-full min-w-[360px] text-sm">
          <caption className="sr-only">Allowed downtime per period</caption>
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Allowed downtime
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                {a}%
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                {b}%
              </th>
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p.key} className="border-b border-hairline/60 last:border-0">
                <th scope="row" className="py-1.5 pr-3 text-left font-medium text-ink">
                  {p.label}
                </th>
                <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{formatSeconds(da[p.key])}</td>
                <td className="py-1.5 text-right tabular-nums text-ink">{formatSeconds(db[p.key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>

      <div className="mt-4 space-y-2" aria-hidden>
        {[
          { v: a, d: da, tone: "blue" as const },
          { v: b, d: db, tone: "violet" as const },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 tabular-nums text-muted-foreground">{s.v}%</span>
            <span className="h-2.5 flex-1 rounded-sm bg-paper-2">
              <span
                className="block h-full rounded-sm transition-[width]"
                style={{ width: `${Math.max(0.5, (s.d.perYear / yearMax) * 100)}%`, background: toneColor(s.tone) }}
              />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-ink-2">{formatSeconds(s.d.perYear)}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink" aria-live="polite">
        {a === b
          ? "Both targets are the same."
          : ratio > 1
            ? `${b}% allows ${formatRatio(ratio)} less downtime than ${a}%.`
            : `${a}% allows ${formatRatio(1 / ratio)} less downtime than ${b}%.`}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-ink">{a}%:</span> {ninesHint(a)}
        </li>
        {b !== a && (
          <li>
            <span className="font-medium text-ink">{b}%:</span> {ninesHint(b)}
          </li>
        )}
      </ul>
    </WidgetFrame>
  );
}
