"use client";

import { useState } from "react";
import { estimate, type EstimateInput } from "./estimate";
import { formatBytes, formatCompact } from "./format";
import { NumberField, Stat, WidgetFrame, ScrollX } from "./shared.client";

interface EstimateCalculatorProps extends EstimateInput {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
}

const FIELDS: readonly {
  key: keyof EstimateInput;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}[] = [
  { key: "dau", label: "Daily active users", min: 1, max: 1e10, step: 1_000_000 },
  { key: "actionsPerUser", label: "Requests per user per day", min: 1, max: 1e5, step: 1 },
  { key: "peakFactor", label: "Peak / average", min: 1, max: 100, step: 0.5, suffix: "×" },
  { key: "payloadBytes", label: "Payload per write", min: 1, max: 1e10, step: 100, suffix: "bytes" },
  { key: "retentionDays", label: "Retention", min: 1, max: 36_500, step: 30, suffix: "days" },
  { key: "readWriteRatio", label: "Reads per write", min: 0, max: 1e4, step: 1, suffix: ": 1" },
];

// Back-of-the-envelope calculator. The working is printed next to every result, as a candidate would write it.
export function EstimateCalculator({ idBase, title, ...initial }: EstimateCalculatorProps) {
  const idPrefix = `${idBase}-idPrefix`;
  const [input, setInput] = useState<EstimateInput>(initial);
  const r = estimate(input);

  return (
    <WidgetFrame
      label="Estimate calculator"
      title={title ?? "Back-of-the-envelope numbers"}
      intro="Change any input; every result shows the arithmetic behind it. Round freely: the order of magnitude is what matters."
      footer="1 day = 86,400 s (round to 100,000 on a whiteboard). Bytes use decimal units: 1 kB = 1,000 B."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <NumberField
            key={f.key}
            id={`${idPrefix}-${f.key}`}
            label={f.label}
            value={input[f.key]}
            min={f.min}
            max={f.max}
            step={f.step}
            suffix={f.suffix}
            onChange={(v) => setInput((cur) => ({ ...cur, [f.key]: v }))}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Average QPS" value={formatCompact(r.avgQps)} tone="blue" />
        <Stat label="Peak QPS" value={formatCompact(r.peakQps)} tone="orange" />
        <Stat label="Storage / year" value={formatBytes(r.storagePerYear)} tone="violet" />
        <Stat label="Read bandwidth" value={`${formatBytes(r.egressBps)}/s`} tone="teal" />
      </div>

      <ScrollX label="Estimates with their working">
        <table className="w-full min-w-[480px] text-sm">
          <caption className="sr-only">Estimates with their working</caption>
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Quantity
              </th>
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Working
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={l.label} className="border-b border-hairline/60 last:border-0">
                <th scope="row" className="py-1.5 pr-3 text-left font-medium text-ink">
                  {l.label}
                </th>
                <td className="py-1.5 pr-3 font-mono text-xs text-ink-2">{l.formula}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-ink">{l.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </WidgetFrame>
  );
}
