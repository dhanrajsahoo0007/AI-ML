"use client";

import { useEffect, useRef, useState } from "react";
import {
  assignKeys,
  assignModulo,
  buildRing,
  countPerServer,
  focusAfterRemove,
  hashAngle,
  makeKeys,
  movedKeys,
  serverName,
} from "./consistent-hash";
import { hash32 } from "./hash";
import { ActionButton, RangeField, Stat, WidgetFrame, toneAt, toneColor } from "./shared.client";

interface ConsistentHashRingProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Servers on the ring at first render (1–8). */
  servers: number;
  /** Virtual nodes per server (1–16). */
  vnodes: number;
  /** Number of keys placed on the ring (4–48). */
  keys: number;
  /** Also show how many keys `hash mod N` would have moved. */
  showModulo: boolean;
}

const MAX_SERVERS = 8;
const SIZE = 260;
const C = SIZE / 2;
const RING_R = 100;

// Rounded to 0.01 units: Math.sin/cos may differ in the last bit between Node and the browser, which would make the
// server-rendered SVG attributes differ from the hydrated ones.
const round2 = (v: number) => Math.round(v * 100) / 100;

function point(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: round2(C + r * Math.sin(rad)), y: round2(C - r * Math.cos(rad)) };
}

interface Layout {
  servers: string[];
  vnodes: number;
}

// Servers and keys hash onto one ring; a key belongs to the next server point clockwise. Adding or removing a
// server moves only the keys next to its points; the moved keys get a ring around them.
export function ConsistentHashRing({
  idBase,
  title,
  servers: initialServers,
  vnodes: initialVnodes,
  keys: keyCount,
  showModulo,
}: ConsistentHashRingProps) {
  const vnodeId = `${idBase}-vnodeId`;
  const initial: Layout = {
    servers: Array.from({ length: initialServers }, (_, i) => serverName(i)),
    vnodes: initialVnodes,
  };
  const [layout, setLayout] = useState<Layout>(initial);
  const [prev, setPrev] = useState<Layout | null>(null);
  const { servers, vnodes } = layout;

  const keys = makeKeys(keyCount);
  const ring = buildRing(servers, vnodes);
  const now = assignKeys(ring, keys);
  const counts = countPerServer(now, servers);
  const before = prev ? assignKeys(buildRing(prev.servers, prev.vnodes), keys) : null;
  const moved = new Set(before ? movedKeys(before, now) : []);
  const modMoved =
    prev && prev.servers.length !== servers.length
      ? movedKeys(assignModulo(prev.servers, keys), assignModulo(servers, keys)).length
      : null;

  // A server keeps its color while it exists: the color follows its number, not its position in the list.
  const toneOf = (s: string) => toneAt(Number(s.slice(1)) - 1);

  const change = (next: Layout) => {
    setPrev(layout);
    setLayout(next);
  };
  const add = () => {
    let i = 0;
    while (servers.includes(serverName(i))) i++;
    change({ servers: [...servers, serverName(i)].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))), vnodes });
  };
  // Removing a server unmounts its row and the focused Remove button; move focus to a neighbouring row's
  // button (or Undo) once the new list has rendered, so keyboard users stay in the widget.
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const undoButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    (target === "undo" ? undoButton.current : removeButtons.current.get(target))?.focus();
  }, [layout]);
  const remove = (s: string) => {
    focusNext.current = focusAfterRemove(servers, s);
    change({ servers: servers.filter((x) => x !== s), vnodes });
  };

  return (
    <WidgetFrame
      label="Consistent hashing"
      title={title ?? "Add a server, watch which keys move"}
      intro="Each server owns the arc before each of its points. Add or remove a server: only the keys on the affected arcs move."
      footer="Keys and server points use the same 32-bit hash. Points on the ring are server#0, server#1, … for each virtual node."
    >
      <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto w-full max-w-[280px]"
          role="img"
          aria-label={`Hash ring with ${servers.length} servers, ${vnodes} virtual nodes each, and ${keyCount} keys. ${moved.size} keys moved in the last change.`}
        >
          <circle cx={C} cy={C} r={RING_R} fill="none" stroke="var(--hairline)" strokeWidth={10} />
          {ring.map((p, i) => {
            const a = point(hashAngle(p.hash), RING_R);
            return (
              <rect
                key={`${p.server}-${i}`}
                x={a.x - 4}
                y={a.y - 4}
                width={8}
                height={8}
                rx={1.5}
                fill={toneColor(toneOf(p.server))}
                stroke="var(--paper)"
                strokeWidth={1.5}
              />
            );
          })}
          {keys.map((k) => {
            const owner = now[k];
            const a = point(hashAngle(hash32(k)), RING_R - 22);
            const m = moved.has(k);
            return (
              <g key={k}>
                {m && <circle cx={a.x} cy={a.y} r={7} fill="none" stroke="var(--ink)" strokeWidth={1.5} />}
                <circle
                  cx={a.x}
                  cy={a.y}
                  r={4}
                  fill={owner ? toneColor(toneOf(owner)) : "var(--hairline)"}
                  style={{ transition: "fill 300ms" }}
                />
              </g>
            );
          })}
          <text x={C} y={C - 4} textAnchor="middle" className="fill-ink text-[13px] font-semibold">
            {servers.length} server{servers.length === 1 ? "" : "s"}
          </text>
          <text x={C} y={C + 14} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            {keyCount} keys
          </text>
        </svg>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <ActionButton onClick={add} primary disabled={servers.length >= MAX_SERVERS}>
              Add server
            </ActionButton>
            {prev && (
              <ActionButton onClick={() => change(prev)} ariaLabel="Undo the last change" buttonRef={undoButton}>
                Undo
              </ActionButton>
            )}
          </div>
          <RangeField
            id={vnodeId}
            label="Virtual nodes per server"
            value={vnodes}
            min={1}
            max={16}
            onChange={(v) => change({ servers, vnodes: v })}
          />

          <ul className="space-y-1.5" aria-label="Keys per server">
            {servers.map((s) => {
              const n = counts[s] ?? 0;
              return (
                <li key={s} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ background: toneColor(toneOf(s)) }}
                    aria-hidden
                  />
                  <span className="w-7 font-medium text-ink">{s}</span>
                  <span className="h-2 flex-1 rounded-sm bg-paper-2" aria-hidden>
                    <span
                      className="block h-full rounded-sm transition-[width]"
                      style={{ width: `${(n / keyCount) * 100}%`, background: toneColor(toneOf(s)) }}
                    />
                  </span>
                  <span className="w-14 text-right tabular-nums text-ink-2">{n} keys</span>
                  <button
                    ref={(el) => {
                      if (el) removeButtons.current.set(s, el);
                      else removeButtons.current.delete(s);
                    }}
                    type="button"
                    onClick={() => remove(s)}
                    disabled={servers.length <= 1}
                    aria-label={`Remove ${s}`}
                    className="rounded px-1.5 text-xs text-muted-foreground hover:text-ink focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="grid grid-cols-2 gap-2" aria-live="polite">
            <Stat
              label="Keys moved"
              value={prev ? `${moved.size} / ${keyCount}` : "–"}
              hint={prev ? "with consistent hashing" : "make a change"}
              tone="green"
            />
            {showModulo && (
              <Stat
                label="With hash mod N"
                value={modMoved === null ? "–" : `${modMoved} / ${keyCount}`}
                hint={modMoved === null ? "add or remove a server" : "keys that would move"}
                tone="red"
              />
            )}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
