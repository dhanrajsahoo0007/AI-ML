// Number formatting shared by the teaching widgets. Always en-US so the server and the browser print the same
// string (a locale-dependent format would cause a hydration mismatch).

const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 1234567 -> "1,234,567". */
export function formatInt(n: number): string {
  return int.format(Math.round(n));
}

/** Short number with a suffix: 1234 -> "1.23K", 2_500_000 -> "2.5M". Below 1000 the number is printed as is. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return trim(n, abs < 10 ? 2 : abs < 100 ? 1 : 0);
  const units = ["K", "M", "B", "T", "P"];
  let v = n;
  let i = -1;
  while (Math.abs(v) >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${trim(v, Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0)}${units[i]}`;
}

/** Decimal byte units (1 kB = 1000 B), the convention cloud bills and disks use. */
export function formatBytes(bytes: number): string {
  const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB"];
  let v = bytes;
  let i = 0;
  while (Math.abs(v) >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${trim(v, i === 0 ? 0 : Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0)} ${units[i]}`;
}

/** Nanoseconds -> the largest unit that keeps the number readable: "1 ns", "2 µs", "10 ms", "1.5 s". */
export function formatNs(ns: number): string {
  if (ns < 1e3) return `${trim(ns, 0)} ns`;
  if (ns < 1e6) return `${trim(ns / 1e3, 1)} µs`;
  if (ns < 1e9) return `${trim(ns / 1e6, 1)} ms`;
  return `${trim(ns / 1e9, 2)} s`;
}

/** Seconds -> "0 s", "52.6 s", "4m 23s", "8h 46m", "3d 15h". */
export function formatSeconds(s: number): string {
  if (s < 60) return `${trim(s, s < 10 ? 2 : 1)} s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${pad(Math.round(s % 60))}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

/** 0.1234 -> "12.3%". `digits` defaults to 1. */
export function formatPercent(fraction: number, digits = 1): string {
  return `${trim(fraction * 100, digits)}%`;
}

/** Ratio with a multiplication sign: 10000 -> "10,000×", 0.001 -> "1/1,000". */
export function formatRatio(r: number): string {
  if (r >= 1) return `${r >= 100 ? formatInt(r) : trim(r, r >= 10 ? 1 : 2)}×`;
  const inv = 1 / r;
  return `1/${inv >= 100 ? formatInt(inv) : trim(inv, inv >= 10 ? 1 : 2)}`;
}

/** Fixed decimals without trailing zeros: trim(2.50, 2) -> "2.5". */
function trim(n: number, digits: number): string {
  const s = n.toFixed(digits);
  return digits > 0 ? s.replace(/\.?0+$/, "") : s;
}

const pad = (n: number) => String(n).padStart(2, "0");
