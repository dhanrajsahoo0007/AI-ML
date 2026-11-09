import { formatBytes, formatCompact, formatInt } from "./format";

// Back-of-the-envelope estimation, the way an interview candidate does it on a whiteboard: a handful of
// inputs, one line of working per result.

export interface EstimateInput {
  /** Daily active users. */
  dau: number;
  /** Requests each active user makes per day (reads and writes together). */
  actionsPerUser: number;
  /** Peak traffic divided by average traffic; 2–3 is common for consumer apps. */
  peakFactor: number;
  /** Average payload per write, in bytes. */
  payloadBytes: number;
  /** How long written data is kept. */
  retentionDays: number;
  /** Reads per write, e.g. 10 for a read-heavy feed. */
  readWriteRatio: number;
}

interface EstimateLine {
  label: string;
  /** Working shown to the reader, e.g. "10M × 10 / 86,400". */
  formula: string;
  value: string;
}

interface EstimateResult {
  requestsPerDay: number;
  avgQps: number;
  peakQps: number;
  writesPerDay: number;
  writeQps: number;
  readQps: number;
  storagePerDay: number;
  storagePerYear: number;
  storageRetained: number;
  /** Write ingress in bytes per second (average). */
  ingressBps: number;
  /** Read egress in bytes per second (average), assuming a read returns one payload. */
  egressBps: number;
  lines: EstimateLine[];
}

const SECONDS_PER_DAY = 86_400;

export const DEFAULT_ESTIMATE: EstimateInput = {
  dau: 10_000_000,
  actionsPerUser: 10,
  peakFactor: 3,
  payloadBytes: 1_000,
  retentionDays: 365 * 5,
  readWriteRatio: 10,
};

export function estimate(i: EstimateInput): EstimateResult {
  const requestsPerDay = i.dau * i.actionsPerUser;
  const avgQps = requestsPerDay / SECONDS_PER_DAY;
  const peakQps = avgQps * i.peakFactor;
  const writeShare = 1 / (i.readWriteRatio + 1);
  const writesPerDay = requestsPerDay * writeShare;
  const writeQps = avgQps * writeShare;
  const readQps = avgQps - writeQps;
  const storagePerDay = writesPerDay * i.payloadBytes;
  const storagePerYear = storagePerDay * 365;
  const storageRetained = storagePerDay * i.retentionDays;
  const ingressBps = writeQps * i.payloadBytes;
  const egressBps = readQps * i.payloadBytes;

  const lines: EstimateLine[] = [
    {
      label: "Requests per day",
      formula: `${formatCompact(i.dau)} users × ${formatCompact(i.actionsPerUser)} actions`,
      value: formatCompact(requestsPerDay),
    },
    {
      label: "Average QPS",
      formula: `${formatCompact(requestsPerDay)} / 86,400 s`,
      value: formatCompact(avgQps),
    },
    {
      label: "Peak QPS",
      formula: `${formatCompact(avgQps)} × ${formatCompact(i.peakFactor)}`,
      value: formatCompact(peakQps),
    },
    {
      label: "Write QPS",
      formula: `${formatCompact(avgQps)} × 1 / (${formatCompact(i.readWriteRatio)} + 1)`,
      value: formatCompact(writeQps),
    },
    {
      label: "Read QPS",
      formula: `${formatCompact(avgQps)} − ${formatCompact(writeQps)}`,
      value: formatCompact(readQps),
    },
    {
      label: "Storage per day",
      formula: `${formatCompact(writesPerDay)} writes × ${formatBytes(i.payloadBytes)}`,
      value: formatBytes(storagePerDay),
    },
    {
      label: "Storage per year",
      formula: `${formatBytes(storagePerDay)} × 365`,
      value: formatBytes(storagePerYear),
    },
    {
      label: `Storage kept (${formatInt(i.retentionDays)} days)`,
      formula: `${formatBytes(storagePerDay)} × ${formatInt(i.retentionDays)}`,
      value: formatBytes(storageRetained),
    },
    {
      label: "Write bandwidth (avg)",
      formula: `${formatCompact(writeQps)} writes/s × ${formatBytes(i.payloadBytes)}`,
      value: `${formatBytes(ingressBps)}/s`,
    },
    {
      label: "Read bandwidth (avg)",
      formula: `${formatCompact(readQps)} reads/s × ${formatBytes(i.payloadBytes)}`,
      value: `${formatBytes(egressBps)}/s`,
    },
  ];

  return {
    requestsPerDay,
    avgQps,
    peakQps,
    writesPerDay,
    writeQps,
    readQps,
    storagePerDay,
    storagePerYear,
    storageRetained,
    ingressBps,
    egressBps,
    lines,
  };
}
