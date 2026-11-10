import type { Tone } from "@/components/diagrams/types";
import { formatInt, formatRatio } from "./format";

// "Latency numbers every programmer should know", kept as orders of magnitude for modern hardware. The
// exact figures vary by machine; what matters for design is the gap between rows.

interface LatencyRow {
  id: string;
  label: string;
  /** Typical latency in nanoseconds. */
  ns: number;
  /** One line a reader should remember about this row. */
  note: string;
  tone: Tone;
}

export const LATENCY_ROWS: readonly LatencyRow[] = [
  { id: "l1", label: "L1 cache reference", ns: 1, note: "Inside the CPU core. Free, in practice.", tone: "green" },
  {
    id: "branch",
    label: "Branch mispredict",
    ns: 3,
    note: "The CPU guessed wrong and throws away work.",
    tone: "green",
  },
  {
    id: "l2",
    label: "L2 cache reference",
    ns: 4,
    note: "Still on the chip, a few times slower than L1.",
    tone: "green",
  },
  {
    id: "mutex",
    label: "Mutex lock / unlock",
    ns: 17,
    note: "Uncontended. Contention makes it far worse.",
    tone: "green",
  },
  {
    id: "memory",
    label: "Main memory reference",
    ns: 100,
    note: "RAM. The unit most people compare against.",
    tone: "teal",
  },
  {
    id: "snappy",
    label: "Compress 1 kB (Snappy)",
    ns: 2_000,
    note: "Compression is cheap next to any I/O.",
    tone: "teal",
  },
  {
    id: "mem-1mb",
    label: "Read 1 MB sequentially from memory",
    ns: 10_000,
    note: "Sequential beats random by a wide margin.",
    tone: "teal",
  },
  {
    id: "net-1kb",
    label: "Send 1 kB over a 1 Gbps link",
    ns: 10_000,
    note: "Transmission time only, no round trip.",
    tone: "blue",
  },
  {
    id: "ssd-random",
    label: "SSD random read (4 kB)",
    ns: 100_000,
    note: "1,000× slower than RAM. Index pages live here.",
    tone: "blue",
  },
  {
    id: "ssd-1mb",
    label: "Read 1 MB sequentially from SSD",
    ns: 200_000,
    note: "Why scans prefer sequential layouts.",
    tone: "blue",
  },
  {
    id: "dc-rtt",
    label: "Round trip inside a datacenter",
    ns: 500_000,
    note: "One service call, best case.",
    tone: "violet",
  },
  {
    id: "disk-1mb",
    label: "Read 1 MB sequentially from HDD",
    ns: 2_000_000,
    note: "Spinning disks stream well, seek badly.",
    tone: "orange",
  },
  {
    id: "disk-seek",
    label: "HDD disk seek",
    ns: 10_000_000,
    note: "The head moves. Avoid random reads on disk.",
    tone: "orange",
  },
  {
    id: "cross-continent",
    label: "Round trip across a continent",
    ns: 150_000_000,
    note: "Speed of light plus routing. Cannot be optimised away.",
    tone: "red",
  },
];

export const LATENCY_ROW_BY_ID: Record<string, LatencyRow> = Object.fromEntries(LATENCY_ROWS.map((r) => [r.id, r]));

/** Position on a log scale, 0 for 1 ns up to 1 for the slowest row. */
export function logFraction(ns: number, maxNs: number = LATENCY_ROWS[LATENCY_ROWS.length - 1].ns): number {
  if (ns <= 1) return 0;
  return Math.min(1, Math.log10(ns) / Math.log10(maxNs));
}

/** How many operations of `ns` fit in a window of `windowMs` milliseconds. */
export function fitIn(windowMs: number, ns: number): number {
  return Math.floor((windowMs * 1e6) / ns);
}

/** Lower-case the first letter unless the word is an acronym or a code: "Main memory" -> "main memory", "HDD" stays. */
function lowerFirst(label: string): string {
  return /^[A-Z][A-Z0-9]/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

/** "One HDD disk seek = 100,000× a main memory reference". */
export function compareRows(row: LatencyRow, against: LatencyRow): string {
  if (row.id === against.id) return "The row you are comparing against.";
  const r = row.ns / against.ns;
  if (r >= 1) return `One ${lowerFirst(row.label)} = ${formatRatio(r)} ${lowerFirst(against.label)}`;
  return `${formatInt(1 / r)} of these fit in one ${lowerFirst(against.label)}`;
}
