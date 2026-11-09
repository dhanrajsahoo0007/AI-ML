"use client";

import { useState } from "react";
import { cx } from "./cx";
import {
  REPLICA_LABEL,
  followerLags,
  msUntilApplied,
  readFrom,
  versionAt,
  type ReadResult,
  type ReplicaId,
  type ReplicaWrite,
} from "./replication";
import { ActionButton, RangeField, WidgetFrame, toneColor, toneSoft } from "./shared.client";

interface ReplicationLagDemoProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Replication lag of follower 1 in ms (0–3000); follower 2 lags twice as much. */
  lagMs: number;
  /** Start with read-your-writes on. */
  readYourWrites: boolean;
}

const WAIT_MS = 250;
const FOLLOWERS = ["follower-1", "follower-2"] as const;

interface State {
  now: number;
  writes: ReplicaWrite[];
  /** The client's own latest write. */
  mine: number;
  last: (ReadResult & { target: ReplicaId }) | null;
}

// A simulated clock that moves only when you press "Wait", so you can write, then read from a follower before
// it has caught up.
export function ReplicationLagDemo({
  idBase,
  title,
  lagMs: initialLag,
  readYourWrites: initialRyw,
}: ReplicationLagDemoProps) {
  const lagId = `${idBase}-lagId`;
  const rywId = `${idBase}-rywId`;
  const [lag, setLag] = useState(initialLag);
  const [ryw, setRyw] = useState(initialRyw);
  const [s, setS] = useState<State>({ now: 0, writes: [{ version: 1, at: 0 }], mine: 1, last: null });
  const lags = followerLags(lag);

  const write = () =>
    setS((c) => {
      const version = c.writes.length + 1;
      return { ...c, writes: [...c.writes, { version, at: c.now }], mine: version, last: null };
    });
  const wait = () => setS((c) => ({ ...c, now: c.now + WAIT_MS }));
  const read = (target: ReplicaId) =>
    setS((c) => ({ ...c, last: { ...readFrom(c.writes, lag, c.now, target, c.mine, ryw), target } }));
  const reset = () => setS({ now: 0, writes: [{ version: 1, at: 0 }], mine: 1, last: null });

  const nodes: { id: ReplicaId; lag: number }[] = [
    { id: "leader", lag: 0 },
    ...FOLLOWERS.map((id) => ({ id, lag: lags[id] })),
  ];

  return (
    <WidgetFrame
      label="Replication lag"
      title={title ?? "Write, then read from a follower"}
      intro="The leader takes every write and ships it to two followers. Follower 2 lags twice as much as follower 1. Write, then read before the followers catch up."
      footer={`Simulated time: the clock moves ${WAIT_MS} ms each time you press Wait. With read-your-writes on, a follower that is behind your last write passes the read to the leader.`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <RangeField
          id={lagId}
          label="Follower 1 lag"
          value={lag}
          min={0}
          max={3000}
          step={100}
          display={`${lag} ms`}
          onChange={setLag}
        />
        <label htmlFor={rywId} className="flex items-center gap-2 self-end text-sm font-medium text-ink">
          <input
            id={rywId}
            type="checkbox"
            checked={ryw}
            onChange={(e) => setRyw(e.target.checked)}
            className="size-4 accent-[var(--dg-blue)]"
          />
          Read-your-writes
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {nodes.map((n) => {
          const v = versionAt(s.writes, n.lag, s.now);
          const behind = s.writes.length - v;
          const served = s.last?.servedBy === n.id;
          const tone = n.id === "leader" ? "blue" : behind > 0 ? "orange" : "green";
          return (
            <div
              key={n.id}
              className={cx("rounded-lg border-2 p-3", served && "ring-2 ring-ink ring-offset-2 ring-offset-paper")}
              style={{ borderColor: toneColor(tone), background: toneSoft(tone) }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">{REPLICA_LABEL[n.id]}</span>
                <span className="text-xs text-muted-foreground">
                  {n.id === "leader" ? "takes writes" : `lag ${n.lag} ms`}
                </span>
              </div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">v{v}</div>
              <div className="text-xs text-ink-2">
                {n.id === "leader" || behind === 0
                  ? "up to date"
                  : `${behind} behind, v${s.writes.length} in ${msUntilApplied(s.writes, n.lag, s.now, s.writes.length)} ms`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <ActionButton onClick={write} primary>
          Write v{s.writes.length + 1}
        </ActionButton>
        <ActionButton onClick={() => read("follower-1")}>Read from follower 1</ActionButton>
        <ActionButton onClick={() => read("follower-2")}>Read from follower 2</ActionButton>
        <ActionButton onClick={wait}>Wait {WAIT_MS} ms</ActionButton>
        <ActionButton onClick={reset}>Reset</ActionButton>
      </div>

      <div
        className="mt-3 rounded-lg border-l-2 bg-paper-2/60 px-3 py-2 text-sm"
        style={{ borderColor: toneColor(s.last ? (s.last.stale ? "red" : "green") : "neutral") }}
        aria-live="polite"
      >
        <div className="text-xs text-muted-foreground">
          t = {s.now} ms · your last write: v{s.mine}
        </div>
        <div className="mt-0.5 text-ink">
          {s.last
            ? `Asked ${REPLICA_LABEL[s.last.target].toLowerCase()}, answered by ${REPLICA_LABEL[s.last.servedBy].toLowerCase()}: v${s.last.version}. ${s.last.note}`
            : "Press Write, then read from a follower before pressing Wait."}
        </div>
      </div>
    </WidgetFrame>
  );
}
