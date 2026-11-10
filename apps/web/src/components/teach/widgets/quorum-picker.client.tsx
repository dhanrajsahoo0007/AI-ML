"use client";

import { useState } from "react";
import { cx } from "./cx";
import {
  MAX_REPLICAS,
  QUORUM_PRESETS,
  analyzeQuorum,
  quorumHints,
  quorumVerdict,
  worstReadSet,
  writeSet,
} from "./quorum";
import { ActionButton, RangeField, Stat, WidgetFrame, toneColor, toneSoft } from "./shared.client";

interface QuorumPickerProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Replicas, N (1–7). */
  n: number;
  /** Replicas a read waits for, R (1–N). */
  r: number;
  /** Replicas a write waits for, W (1–N). */
  w: number;
}

// N/R/W sliders. The row of replicas shows the latest write on the first W and the worst-case read on the
// last R; any replica in both is the overlap that makes the read see the write.
export function QuorumPicker({ idBase, title, n: initialN, r: initialR, w: initialW }: QuorumPickerProps) {
  const ids = { n: `${idBase}-n`, r: `${idBase}-r`, w: `${idBase}-w` };
  const [q, setQ] = useState({ n: initialN, r: initialR, w: initialW });
  const a = analyzeQuorum(q.n, q.r, q.w);
  const writes = new Set(writeSet(a.n, a.w));
  const reads = new Set(worstReadSet(a.n, a.r));
  const setN = (n: number) => setQ((c) => ({ n, r: Math.min(c.r, n), w: Math.min(c.w, n) }));

  return (
    <WidgetFrame
      label="Quorum picker"
      title={title ?? "Will this read see the latest write?"}
      intro="A write waits for W of N replicas; a read asks R of them. If R + W > N, every read set shares a replica with every write set."
      footer="Latency figures are illustrative: the k-th fastest of N replicas answering in 4, 6, 9, 14, 25, 45 and 120 ms."
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
        {QUORUM_PRESETS.map((p) => (
          <ActionButton
            key={p.label}
            onClick={() => setQ({ n: p.n, r: p.r, w: p.w })}
            pressed={p.n === a.n && p.r === a.r && p.w === a.w}
          >
            {p.label}
          </ActionButton>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <RangeField id={ids.n} label="Replicas (N)" value={a.n} min={1} max={MAX_REPLICAS} onChange={setN} />
        <RangeField
          id={ids.w}
          label="Write quorum (W)"
          value={a.w}
          min={1}
          max={a.n}
          onChange={(w) => setQ((c) => ({ ...c, w }))}
        />
        <RangeField
          id={ids.r}
          label="Read quorum (R)"
          value={a.r}
          min={1}
          max={a.n}
          onChange={(r) => setQ((c) => ({ ...c, r }))}
        />
      </div>

      <ol className="mt-5 flex flex-wrap justify-center gap-3" aria-label="Replicas">
        {Array.from({ length: a.n }, (_, i) => {
          const wr = writes.has(i);
          const rd = reads.has(i);
          const tone = wr && rd ? "green" : wr ? "blue" : rd ? "orange" : "neutral";
          const label =
            wr && rd ? "has the write, read here" : wr ? "has the write" : rd ? "read here, old value" : "not involved";
          return (
            <li key={i} className="flex w-16 flex-col items-center gap-1 text-center">
              <span
                className={cx(
                  "flex size-12 items-center justify-center rounded-full border-2 font-semibold text-ink",
                  rd && "border-dashed"
                )}
                style={{ borderColor: toneColor(tone), background: wr ? toneSoft(tone) : "transparent" }}
              >
                R{i + 1}
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
            </li>
          );
        })}
      </ol>

      <p
        className="mt-4 rounded-lg border-l-2 bg-paper-2/60 px-3 py-2 text-sm text-ink"
        style={{ borderColor: toneColor(a.strong ? "green" : "red") }}
        aria-live="polite"
      >
        {quorumVerdict(a)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Write latency" value={`${a.writeLatencyMs} ms`} hint={`wait for ${a.w} of ${a.n}`} tone="blue" />
        <Stat label="Read latency" value={`${a.readLatencyMs} ms`} hint={`wait for ${a.r} of ${a.n}`} tone="orange" />
        <Stat label="Writes survive" value={`${a.writeTolerates} down`} tone="violet" />
        <Stat label="Reads survive" value={`${a.readTolerates} down`} tone="teal" />
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {quorumHints(a).map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
