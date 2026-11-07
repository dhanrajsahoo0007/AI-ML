// Formatting for the admin pages. Pure, no React.

export const NO_DATA = "no data yet";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function formatUsdMinor(minor: number): string {
  return usd.format(minor / 100);
}

export function formatPercent(rate: number | null, digits = 1): string {
  return rate === null ? NO_DATA : `${(rate * 100).toFixed(digits)}%`;
}

export function formatDateTime(d: Date | null): string {
  if (!d) return "never";
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** "3 min ago", "2 h ago", "4 d ago". */
export function formatAge(d: Date | null, now = Date.now()): string {
  if (!d) return "never";
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * SVG polyline points for a sparkline of `values` in a `width` × `height` box (y grows downwards). The scale
 * always includes 0, so an all-zero series lies on the baseline and a flat positive one along the top.
 */
export function sparklinePoints(values: readonly number[], width: number, height: number, pad = 2): string {
  if (values.length === 0) return "";
  const maxV = Math.max(...values, 0);
  const minV = Math.min(...values, 0);
  const span = maxV - minV || 1;
  const step = values.length > 1 ? (width - 2 * pad) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * step;
      const y = height - pad - ((v - minV) / span) * (height - 2 * pad);
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

const round = (n: number) => Math.round(n * 10) / 10;
