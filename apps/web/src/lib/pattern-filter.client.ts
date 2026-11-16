"use client";

import { useSyncExternalStore } from "react";

// The pattern hub's highlight state, shared between the explorer (<PatternUseCaseExplorer />, which writes it) and
// the small islands inside each server-rendered <ModelCard> (which read it). Module-level, so the explorer must
// reset it to null on unmount, or the next hub would open dimmed. It does not import the catalog: the islands
// render on every hub and stay idle there.

interface PatternFilterMatch {
  role: "core" | "edge";
  note: string;
}

type State = ReadonlyMap<string, PatternFilterMatch> | null;

let state: State = null;
const listeners = new Set<() => void>();

export function setPatternFilter(next: State) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

const getState = () => state;
const getServerState = (): State => null;

/** "idle" when no filter is on, "dim" when the card is filtered out, else its match. */
export function usePatternMatch(href: string): "idle" | "dim" | PatternFilterMatch {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  if (!s) return "idle";
  return s.get(href) ?? "dim";
}

/** How many of these cards match, or null when no filter is on. */
export function usePatternMatchCount(hrefs: readonly string[]): number | null {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  if (!s) return null;
  return hrefs.reduce((n, h) => n + (s.has(h) ? 1 : 0), 0);
}
