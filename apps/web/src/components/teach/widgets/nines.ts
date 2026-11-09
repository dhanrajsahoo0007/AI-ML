// Availability "nines" and the downtime each one allows.

export const NINES = [99, 99.5, 99.9, 99.95, 99.99, 99.999] as const;
export type Nines = (typeof NINES)[number];

export const NINES_LABEL: Record<Nines, string> = {
  99: "two nines",
  99.5: "two and a half nines",
  99.9: "three nines",
  99.95: "three and a half nines",
  99.99: "four nines",
  99.999: "five nines",
};

interface Downtime {
  /** Allowed downtime in seconds per period. Month = 30 days, year = 365 days. */
  perDay: number;
  perWeek: number;
  perMonth: number;
  perYear: number;
}

export function downtimeFor(availabilityPercent: number): Downtime {
  const unavailable = 1 - availabilityPercent / 100;
  const day = 86_400 * unavailable;
  return { perDay: day, perWeek: day * 7, perMonth: day * 30, perYear: day * 365 };
}

/** How many times less downtime `b` allows than `a`. 1 when equal. */
export function downtimeRatio(a: number, b: number): number {
  const ua = 100 - a;
  const ub = 100 - b;
  if (ub === 0) return Infinity;
  return ua / ub;
}

/** Typical cost/complexity note per level, for the comparison table. */
export function ninesHint(n: Nines): string {
  switch (n) {
    case 99:
      return "A single server with monitoring and quick manual recovery.";
    case 99.5:
      return "Single region, automated restarts, a tested backup.";
    case 99.9:
      return "Redundant servers behind a load balancer, automated failover.";
    case 99.95:
      return "Multi-AZ, health checks, deploys that roll back on their own.";
    case 99.99:
      return "Multi-region or active-active, no single human in the recovery path.";
    case 99.999:
      return "Everything above plus fault-injection practice; most products do not need this.";
  }
}

/** Closest supported level to an arbitrary percentage, so a prop like 99.9 maps to a table row. */
export function nearestNines(p: number): Nines {
  let best: Nines = NINES[0];
  for (const n of NINES) if (Math.abs(n - p) < Math.abs(best - p)) best = n;
  return best;
}
