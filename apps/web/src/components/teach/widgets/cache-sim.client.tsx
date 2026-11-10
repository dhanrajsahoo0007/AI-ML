"use client";

import { useState } from "react";
import { cx } from "./cx";
import { CACHE_POLICIES, DEFAULT_SEQUENCE, hitRatio, parseSequence, runCache, type CachePolicy } from "./cache-sim";
import { formatPercent } from "./format";
import { RangeField, Segmented, Stat, Transport, WidgetFrame, toneColor, toneSoft, usePlayback } from "./shared.client";

interface CacheSimProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  policy: CachePolicy;
  /** Cache slots (4–8). */
  capacity: number;
  /** Request sequence, keys separated by spaces or commas. */
  sequence?: string;
}

// Replays a request sequence through one eviction policy, step by step, and compares the final hit ratio of
// all three policies on the same sequence.
export function CacheSim({
  idBase,
  title,
  policy: initialPolicy,
  capacity: initialCapacity,
  sequence: initialSequence,
}: CacheSimProps) {
  const capId = `${idBase}-capId`;
  const seqId = `${idBase}-seqId`;
  const [policy, setPolicy] = useState<CachePolicy>(initialPolicy);
  const [capacity, setCapacity] = useState(initialCapacity);
  const [text, setText] = useState(initialSequence ?? DEFAULT_SEQUENCE);
  const seq = parseSequence(text);
  const steps = runCache(policy, capacity, seq);
  const pb = usePlayback(steps.length, 550);
  const cur = pb.at > 0 ? steps[pb.at - 1] : null;
  const slots = Array.from({ length: capacity }, (_, i) => cur?.contents[i] ?? null);
  const summary = CACHE_POLICIES.find((p) => p.value === policy)?.summary;

  return (
    <WidgetFrame
      label="Cache eviction"
      title={title ?? "LRU, LFU or FIFO?"}
      intro={summary}
      footer="Slots are listed in eviction order: the leftmost key is the next one out. LFU shows each key's use count."
    >
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Eviction policy"
          value={policy}
          options={CACHE_POLICIES}
          onChange={(v) => {
            setPolicy(v);
            pb.showAll();
          }}
        />
        <div className="w-40">
          <RangeField
            id={capId}
            label="Capacity"
            value={capacity}
            min={4}
            max={8}
            onChange={(v) => {
              setCapacity(v);
              pb.showAll();
            }}
          />
        </div>
        <Transport playing={pb.playing} atEnd={pb.atEnd} onPlay={pb.play} onStep={pb.step} onReset={pb.reset} />
      </div>

      <div className="mt-3">
        <label htmlFor={seqId} className="text-sm font-medium text-ink">
          Requests (edit me)
        </label>
        <input
          id={seqId}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            pb.showAll();
          }}
          spellCheck={false}
          className="mt-1 w-full rounded-md border border-hairline bg-paper px-2 py-1 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>

      <ol className="mt-3 flex flex-wrap gap-1" aria-label="Request sequence">
        {seq.map((k, i) => {
          const done = i < pb.at;
          const hit = done && steps[i].hit;
          return (
            <li
              key={i}
              className={cx(
                "inline-flex h-7 min-w-7 items-center justify-center rounded border px-1 font-mono text-xs text-ink",
                i === pb.at - 1 && "ring-2 ring-ink"
              )}
              style={{
                background: done ? toneSoft(hit ? "green" : "red") : "transparent",
                borderColor: done ? toneColor(hit ? "green" : "red") : "var(--hairline)",
              }}
            >
              {k}
              {done && <span className="sr-only">{hit ? " hit" : " miss"}</span>}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {slots.map((k, i) => (
          <div
            key={i}
            className={cx(
              "flex h-12 w-12 flex-col items-center justify-center rounded-lg border-2 font-mono text-base font-semibold text-ink",
              k ? "border-[var(--dg-blue)] bg-[var(--dg-blue-soft)]" : "border-dashed border-hairline"
            )}
          >
            {k ?? <span className="sr-only">empty</span>}
            {k && policy === "lfu" && cur && (
              <span className="text-[10px] font-normal text-muted-foreground">×{cur.counts[k]}</span>
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">
          {cur
            ? cur.hit
              ? `${cur.key}: hit`
              : `${cur.key}: miss${cur.evicted ? `, evicted ${cur.evicted}` : ""}`
            : "Empty cache"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Hits" value={cur?.hits ?? 0} tone="green" />
        <Stat label="Misses" value={cur?.misses ?? 0} tone="red" />
        <Stat label="Hit ratio" value={formatPercent(hitRatio(steps, pb.at))} tone="blue" />
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="mb-1 text-left text-xs text-muted-foreground">
          Same sequence, capacity {capacity}, all policies
        </caption>
        <tbody>
          {CACHE_POLICIES.map((p) => {
            const r = hitRatio(runCache(p.value, capacity, seq));
            return (
              <tr
                key={p.value}
                className={cx("border-b border-hairline/60 last:border-0", p.value === policy && "font-semibold")}
              >
                <th scope="row" className="py-1 pr-3 text-left font-medium text-ink">
                  {p.label}
                </th>
                <td className="w-full py-1 pr-3" aria-hidden>
                  <span className="block h-2 rounded-sm bg-paper-2">
                    <span
                      className="block h-full rounded-sm"
                      style={{ width: `${r * 100}%`, background: toneColor("blue") }}
                    />
                  </span>
                </td>
                <td className="py-1 text-right tabular-nums text-ink">{formatPercent(r)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WidgetFrame>
  );
}
