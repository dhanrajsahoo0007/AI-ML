"use client";

import { useState } from "react";
import { cx } from "./cx";
import {
  DEFAULT_WEIGHTS,
  LB_ALGORITHMS,
  makeRequests,
  openConnections,
  simulateLb,
  type LbAlgorithm,
} from "./load-balancer";
import {
  ActionButton,
  RangeField,
  Segmented,
  Transport,
  WidgetFrame,
  toneAt,
  toneColor,
  toneSoft,
  usePlayback,
} from "./shared.client";

interface LoadBalancerSimProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Servers at first render (3–6). */
  servers: number;
  algorithm: LbAlgorithm;
  /** Requests in the replay (10–40). */
  requests: number;
  /** Weights for the weighted algorithm, one per server (1–5 each). Missing entries default to 3, 2, 1, 1, 1, 1. */
  weights?: number[];
}

// A fixed stream of requests from six clients replayed through the chosen algorithm. Long requests (the
// chips with a border) stay open for several arrivals, which is what least-connections reacts to.
export function LoadBalancerSim({
  idBase,
  title,
  servers: initialServers,
  algorithm: initialAlgo,
  requests: count,
  weights: initialWeights,
}: LoadBalancerSimProps) {
  const serversId = `${idBase}-serversId`;
  const [servers, setServers] = useState(initialServers);
  const [algorithm, setAlgorithm] = useState<LbAlgorithm>(initialAlgo);
  const [weights, setWeights] = useState<number[]>(DEFAULT_WEIGHTS.map((w, i) => initialWeights?.[i] ?? w));
  const requests = makeRequests(count);
  const active = weights.slice(0, servers);
  const { assignments } = simulateLb(algorithm, active, requests);
  const pb = usePlayback(requests.length, 380);
  const shown = assignments.slice(0, pb.at);
  const counts = Array.from({ length: servers }, (_, s) => shown.filter((x) => x === s).length);
  const open = openConnections(assignments, requests, servers, pb.at);
  const next = requests[pb.at];
  const max = Math.max(1, ...counts);
  const summary = LB_ALGORITHMS.find((a) => a.value === algorithm)?.summary;

  const setWeight = (i: number, d: number) =>
    setWeights((w) => w.map((x, j) => (j === i ? Math.min(5, Math.max(1, x + d)) : x)));

  return (
    <WidgetFrame
      label="Load balancer"
      title={title ?? "Where does each request go?"}
      intro={summary}
      footer="Requests arrive one per tick from six clients. A chip with a solid border is a slow request that stays open for 5–9 ticks."
    >
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Algorithm"
          value={algorithm}
          options={LB_ALGORITHMS}
          onChange={(v) => {
            setAlgorithm(v);
            pb.showAll();
          }}
        />
        <div className="w-40">
          <RangeField
            id={serversId}
            label="Servers"
            value={servers}
            min={3}
            max={6}
            onChange={(v) => {
              setServers(v);
              pb.showAll();
            }}
          />
        </div>
        <Transport playing={pb.playing} atEnd={pb.atEnd} onPlay={pb.play} onStep={pb.step} onReset={pb.reset} />
      </div>

      <div className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {next ? (
          <>
            Next: request <span className="font-semibold text-ink">#{next.id}</span> from {next.clientIp}
            {next.durationTicks > 2 ? " (slow)" : ""}
          </>
        ) : (
          <>All {requests.length} requests placed.</>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {counts.map((c, s) => {
          const tone = toneAt(s);
          return (
            <li key={s} className="rounded-lg border border-hairline p-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-ink">Server {s + 1}</span>
                {algorithm === "weighted" && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ActionButton
                      onClick={() => setWeight(s, -1)}
                      disabled={weights[s] <= 1}
                      ariaLabel={`Lower weight of server ${s + 1}`}
                    >
                      −
                    </ActionButton>
                    weight {weights[s]}
                    <ActionButton
                      onClick={() => setWeight(s, 1)}
                      disabled={weights[s] >= 5}
                      ariaLabel={`Raise weight of server ${s + 1}`}
                    >
                      +
                    </ActionButton>
                  </span>
                )}
                {algorithm === "least-connections" && (
                  <span className="text-xs text-muted-foreground">{open[s]} open</span>
                )}
                <span className="ml-auto flex w-28 items-center gap-1.5 text-xs tabular-nums text-ink-2">
                  <span className="h-2 flex-1 rounded-sm bg-paper-2" aria-hidden>
                    <span
                      className="block h-full rounded-sm transition-[width]"
                      style={{ width: `${(c / max) * 100}%`, background: toneColor(tone) }}
                    />
                  </span>
                  {c}
                </span>
              </div>
              <ol className="mt-1.5 flex min-h-6 flex-wrap gap-1" aria-label={`Requests on server ${s + 1}`}>
                {shown.map((srv, j) =>
                  srv === s ? (
                    <li
                      key={j}
                      title={`#${requests[j].id} from ${requests[j].clientIp}`}
                      className={cx(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded border-2 px-1 text-[11px] tabular-nums text-ink",
                        j === pb.at - 1 && "ring-2 ring-ink"
                      )}
                      style={{
                        background: toneSoft(tone),
                        borderColor: requests[j].durationTicks > 2 ? toneColor(tone) : "transparent",
                      }}
                    >
                      {requests[j].id}
                      {requests[j].durationTicks > 2 && <span className="sr-only"> (slow)</span>}
                    </li>
                  ) : null
                )}
              </ol>
            </li>
          );
        })}
      </ul>
    </WidgetFrame>
  );
}
