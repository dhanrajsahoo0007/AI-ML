// Pure layout for sequence diagrams (no React): lane positions, row order, phases and packet timing.

import { phaseOf, type Phase } from "./build-view";
import type { SequenceLane, SequenceMessage, SequenceNote, SequenceSpec } from "./types";

export const SEQ = {
  marginX: 20,
  /** Top of the lane header boxes. */
  headerY: 20,
  headerH: 56,
  /** Minimum column width per lane and the default per-lane width when the spec sets none. */
  minColW: 120,
  colW: 180,
  /** y of the first row and the distance between rows. */
  firstRowY: 118,
  rowH: 46,
  bottomPad: 28,
  /** Default seconds for one packet trip. */
  duration: 1.2,
} as const;

export interface LaneView extends SequenceLane {
  x: number;
}

type RowView =
  | { kind: "message"; message: SequenceMessage; y: number; phase: Phase; index: number }
  | { kind: "note"; note: SequenceNote; y: number; phase: Phase; index: number };

export interface MessageTiming {
  /** Seconds after the cycle starts when this packet leaves. */
  begin: number;
  /** Seconds the packet travels. */
  duration: number;
}

interface SequenceView {
  width: number;
  height: number;
  lanes: LaneView[];
  laneX: Map<string, number>;
  rows: RowView[];
  /** Timing per message row index (only rows whose packet moves), and the length of one full cycle. */
  timing: Map<number, MessageTiming>;
  cycle: number;
}

/** Width the spec needs when it does not set one. */
export function sequenceWidth(spec: SequenceSpec) {
  return spec.width ?? Math.max(SEQ.minColW, SEQ.colW) * spec.lanes.length + SEQ.marginX * 2;
}

/**
 * Row order: messages and notes sorted by `at` (default: a message's array index; a note's default comes after every
 * message). The sort is stable, so items with equal `at` keep their array order.
 */
export function orderRows(spec: SequenceSpec): { kind: "message" | "note"; index: number; order: number }[] {
  const n = spec.messages.length;
  const items = [
    ...spec.messages.map((m, index) => ({ kind: "message" as const, index, order: m.at ?? index })),
    ...(spec.notes ?? []).map((note, index) => ({ kind: "note" as const, index, order: note.at ?? n + index })),
  ];
  return items.sort((a, b) => a.order - b.order);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function layoutSequence(spec: SequenceSpec, step: number | undefined): SequenceView {
  const width = sequenceWidth(spec);
  const colW = (width - SEQ.marginX * 2) / Math.max(1, spec.lanes.length);
  const lanes = spec.lanes.map((lane, i) => ({ ...lane, x: SEQ.marginX + colW * (i + 0.5) }));
  const laneX = new Map(lanes.map((l) => [l.id, l.x]));

  // Rows keep their place in every step view (later rows are left blank), so stepping never moves an arrow.
  const rows: RowView[] = orderRows(spec).flatMap((item, rowIndex): RowView[] => {
    const y = SEQ.firstRowY + rowIndex * SEQ.rowH;
    if (item.kind === "message") {
      const message = spec.messages[item.index];
      const s = message.step ?? 1;
      return step !== undefined && s > step
        ? []
        : [{ kind: "message", message, y, phase: phaseOf(s, step), index: item.index }];
    }
    const note = (spec.notes ?? [])[item.index];
    const s = note.step ?? 1;
    return step !== undefined && s > step
      ? []
      : [{ kind: "note", note, y, phase: phaseOf(s, step), index: item.index }];
  });

  // Packets run one after another down the page. In a step view only the step's new messages move, so the
  // story restarts from them; old rows stay static.
  const timing = new Map<number, MessageTiming>();
  let t = 0;
  for (const row of rows) {
    if (row.kind !== "message" || row.phase === "old" || row.message.kind === "note") continue;
    const duration = row.message.duration ?? SEQ.duration;
    // Rounded so the SMIL begin values stay short and free of float noise.
    t = round(t + (row.message.delay ?? 0));
    timing.set(row.index, { begin: t, duration });
    t = round(t + duration);
  }

  const rowCount = spec.messages.length + (spec.notes?.length ?? 0);
  const height = SEQ.firstRowY + Math.max(1, rowCount) * SEQ.rowH + SEQ.bottomPad;
  return { width, height, lanes, laneX, rows, timing, cycle: t };
}
