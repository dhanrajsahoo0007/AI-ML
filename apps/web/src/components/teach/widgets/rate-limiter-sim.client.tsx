"use client";

import { useState } from "react";
import { cx } from "./cx";
import {
  LIMITER_ALGORITHMS,
  TIMELINE_MS,
  generateArrivals,
  peakAcceptedPerSecond,
  runLimiter,
  tally,
  type LimiterAlgorithm,
  type LimiterConfig,
} from "./rate-limiter";
import { RangeField, ScrollX, Segmented, Stat, WidgetFrame, toneColor } from "./shared.client";

interface RateLimiterSimProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  algorithm: LimiterAlgorithm;
  /** Requests allowed per second (1–10); also the token refill rate. */
  limit: number;
  /** Token bucket capacity (1–20). */
  bucketSize: number;
  /** Steady background traffic in requests per second (0–10). */
  steadyRps: number;
  /** Extra requests packed into 200 ms just before the 2 s mark (0–30). */
  burst: number;
}

const W = 640;
const H = 96;
const PAD = 12;
const x = (t: number) => PAD + (t / TIMELINE_MS) * (W - 2 * PAD);

// Same arrivals, three limiters. The timeline shows accepted requests on the top lane and rejected ones on
// the bottom lane; dashed lines are the fixed-window boundaries.
export function RateLimiterSim({
  idBase,
  title,
  algorithm: initialAlgo,
  limit: initialLimit,
  bucketSize: initialBucket,
  steadyRps: initialSteady,
  burst: initialBurst,
}: RateLimiterSimProps) {
  const ids = {
    limit: `${idBase}-limit`,
    bucket: `${idBase}-bucket`,
    steady: `${idBase}-steady`,
    burst: `${idBase}-burst`,
  };
  const [algorithm, setAlgorithm] = useState<LimiterAlgorithm>(initialAlgo);
  const [limit, setLimit] = useState(initialLimit);
  const [bucketSize, setBucketSize] = useState(initialBucket);
  const [steady, setSteady] = useState(initialSteady);
  const [burst, setBurst] = useState(initialBurst);
  const config: LimiterConfig = { limit, windowMs: 1000, bucketSize };
  const arrivals = generateArrivals(steady, burst, 1900);
  const decisions = runLimiter(algorithm, config, arrivals);
  const t = tally(decisions);
  const summary = LIMITER_ALGORITHMS.find((a) => a.value === algorithm)?.summary;

  return (
    <WidgetFrame
      label="Rate limiter"
      title={title ?? "Which requests get through?"}
      intro={summary}
      footer="Four seconds of traffic. The burst lands just before the 2 s boundary, where a fixed window is weakest."
    >
      <Segmented label="Algorithm" value={algorithm} options={LIMITER_ALGORITHMS} onChange={setAlgorithm} />

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <RangeField id={ids.limit} label="Limit / s" value={limit} min={1} max={10} onChange={setLimit} />
        <div className={cx(algorithm !== "token-bucket" && "opacity-50")}>
          <RangeField
            id={ids.bucket}
            label="Bucket size"
            value={bucketSize}
            min={1}
            max={20}
            onChange={setBucketSize}
          />
        </div>
        <RangeField id={ids.steady} label="Steady req / s" value={steady} min={0} max={10} onChange={setSteady} />
        <RangeField id={ids.burst} label="Burst size" value={burst} min={0} max={30} onChange={setBurst} />
      </div>

      {/* Below sm the timeline keeps its 640-unit width and scrolls sideways: scaled to a phone column, the 10–11px
          labels would render at about 5px and the request ticks under 1px. */}
      <ScrollX label="Request timeline">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[640px] sm:min-w-0"
          role="img"
          aria-label={`Timeline of ${decisions.length} requests over 4 seconds: ${t.accepted} accepted, ${t.rejected} rejected.`}
        >
          {[0, 1000, 2000, 3000, 4000].map((ms) => (
            <g key={ms}>
              <line x1={x(ms)} x2={x(ms)} y1={4} y2={H - 18} stroke="var(--hairline)" strokeDasharray="3 3" />
              <text x={x(ms)} y={H - 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {ms / 1000} s
              </text>
            </g>
          ))}
          <text x={PAD} y={14} className="fill-muted-foreground text-[10px]">
            accepted
          </text>
          <text x={PAD} y={H - 24} className="fill-muted-foreground text-[10px]">
            rejected
          </text>
          {decisions.map((d, i) =>
            d.accepted ? (
              <line key={i} x1={x(d.t)} x2={x(d.t)} y1={20} y2={40} stroke={toneColor("green")} strokeWidth={2}>
                <title>{`${d.t} ms: accepted, ${d.detail}`}</title>
              </line>
            ) : (
              <line key={i} x1={x(d.t)} x2={x(d.t)} y1={46} y2={66} stroke={toneColor("red")} strokeWidth={2}>
                <title>{`${d.t} ms: rejected, ${d.detail}`}</title>
              </line>
            )
          )}
        </svg>
      </ScrollX>

      <div className="mt-3 grid grid-cols-3 gap-2" aria-live="polite">
        <Stat label="Accepted" value={t.accepted} tone="green" />
        <Stat label="Rejected" value={t.rejected} tone="red" />
        <Stat label="Peak in any 1 s" value={peakAcceptedPerSecond(decisions)} hint={`limit ${limit}`} tone="orange" />
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="mb-1 text-left text-xs text-muted-foreground">Same traffic through each algorithm</caption>
        <thead>
          <tr className="border-b border-hairline text-left text-xs text-muted-foreground">
            <th scope="col" className="py-1 pr-3 font-semibold">
              Algorithm
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-semibold">
              Accepted
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-semibold">
              Rejected
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              Peak / 1 s
            </th>
          </tr>
        </thead>
        <tbody>
          {LIMITER_ALGORITHMS.map((a) => {
            const ds = runLimiter(a.value, config, arrivals);
            const r = tally(ds);
            return (
              <tr
                key={a.value}
                className={cx("border-b border-hairline/60 last:border-0", a.value === algorithm && "font-semibold")}
              >
                <th scope="row" className="py-1 pr-3 text-left font-medium text-ink">
                  {a.label}
                </th>
                <td className="py-1 pr-3 text-right tabular-nums">{r.accepted}</td>
                <td className="py-1 pr-3 text-right tabular-nums">{r.rejected}</td>
                <td className="py-1 text-right tabular-nums">{peakAcceptedPerSecond(ds)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WidgetFrame>
  );
}
