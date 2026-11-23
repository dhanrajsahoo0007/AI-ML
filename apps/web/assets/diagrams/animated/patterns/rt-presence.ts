import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// What presence costs: heartbeats in, status changes out (realtime-gateways-and-presence, Core concepts).
// Three steps: 1 heartbeats: 500,000 sockets, one heartbeat each every 30 s, refresh a 60 s TTL in the presence
// store; a heartbeat is never pushed to anyone · 2 every status change to every watcher: only transitions (online to
// offline and back) leave the store, but each one goes to 50 watchers · 3 throttled: push only to watchers that have
// the person on screen (5 of 50), so the pushes fall tenfold.
// Working (illustrative values marked):
//   Heartbeats: 500,000 ÷ 30 s = 16,667 a second (FLASH_SALE.shoppers; 30 s from fundamentals/websockets).
//   Sessions last 10 minutes on average (illustrative): 500,000 ÷ 600 s = 833 connects and 833 disconnects a second,
//     1,667 status changes a second.
//   Each person is watched by 50 others (illustrative): 1,667 × 50 = 83,333 pushes a second.
//   5 of the 50 have the person on screen (illustrative): 1,667 × 5 = 8,333 pushes a second.
// Layout (880 × 330): row labels at x 10; three columns of boxes at x 135, 425 and 700 (gaps of 125 and 110 for the arrow labels); one row per step.
// Colours (PATTERN_TONE): heartbeats and status changes blue (data in motion), the presence store violet (store), the
// unthrottled fan-out red (overload), the throttle and its result green (the pattern); the socket count neutral.
// Fact check (2026-11-16, Slack Engineering "Real-time Messaging", 2023): Slack clients receive presence updates
// only for users visible on screen.

const SOCKETS = FLASH_SALE.shoppers;
const HB_S = 30;
const SESSION_S = 600; // illustrative
const WATCHERS = 50; // illustrative
const ON_SCREEN = 5; // illustrative
const heartbeats = Math.round(SOCKETS / HB_S); // 16,667
const changes = Math.round((2 * SOCKETS) / SESSION_S); // 1,667
const naive = Math.round(((2 * SOCKETS) / SESSION_S) * WATCHERS); // 83,333
const throttled = Math.round(((2 * SOCKETS) / SESSION_S) * ON_SCREEN); // 8,333

const COL = [135, 425, 700];
const BW = [165, 165, 170];
const ROW = [30, 140, 250];
const BH = 56;

const box = (
  id: string,
  col: number,
  row: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col],
  y: ROW[row],
  w: BW[col],
  h: BH,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  ...extra,
});

const rowLabel = (id: string, row: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 10,
  y: ROW[row],
  w: 115,
  h: BH,
  label,
  tone: PATTERN_TONE.infra,
  step,
  quiet: true,
});

const arrow = (id: string, from: string, to: string, label: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
});

const shapes: LayoutShape[] = [
  rowLabel("l1", 0, "Heartbeats in", 1),
  box("sockets", 0, 0, `${n(SOCKETS)} sockets`, "one beat every 30 s", PATTERN_TONE.infra, 1),
  box("beats", 1, 0, `${n(heartbeats)} beats/s`, "refresh a TTL only", PATTERN_TONE.data, 1),
  box("store", 2, 0, "Presence store", "TTL 60 s, no push", PATTERN_TONE.store, 1),
  arrow("a1", "sockets", "beats", `÷ ${HB_S} s`, 1),
  arrow("a2", "beats", "store", "write", 1),

  rowLabel("l2", 1, "Every change,\nevery watcher", 2),
  box("changes", 0, 1, `${n(changes)} changes/s`, "10 min sessions", PATTERN_TONE.data, 2),
  box("naive", 1, 1, `${n(naive)} pushes/s`, "most never looked at", PATTERN_TONE.fail, 2, { fill: "soft" }),
  arrow("a3", "changes", "naive", `× ${WATCHERS} watchers`, 2),

  rowLabel("l3", 2, "Watchers with\nit on screen", 3),
  box("filter", 0, 2, "On screen only", `${ON_SCREEN} of ${WATCHERS} watchers`, PATTERN_TONE.pattern, 3),
  box("throttled", 1, 2, `${n(throttled)} pushes/s`, "10 × fewer", PATTERN_TONE.pattern, 3, { highlight: true }),
  arrow("a4", "filter", "throttled", `× ${n(changes)}/s`, 3),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Presence: heartbeats in, status changes out",
  width: 880,
  height: 330,
  shapes,
  steps: [
    { title: "Heartbeats refresh a TTL" },
    { title: "Every change to every watcher" },
    { title: "Only watchers who can see it" },
  ],
};

export default spec;
