import type { LiveSubscriptionRow, PaymentStatus, SubscriptionMovement } from "@/server/db/admin-queries";

// KPI math for /admin (plan §10.5). Pure functions over the typed rows from server/db/admin-queries.ts, so the
// numbers are unit-tested with fixtures. Money stays in integer-ish minor units until it is formatted.

/** Refund rate target (plan §9.8): above it, look at onboarding, pricing copy and the guarantee wording. */
export const REFUND_RATE_TARGET = 0.05;
/** Dispute rate alert (plan §10.5): card networks start penalising merchants around 0.75%. */
export const DISPUTE_RATE_ALERT = 0.0075;
/** No succeeded payment for this long, while there are paying subscribers, may mean a provider pause (§10.5). */
const NO_PAYMENT_ALERT_MS = 6 * 60 * 60 * 1000;

// ── Currency ──────────────────────────────────────────────────────────────────────────────────────────────────

const exponents = new Map<string, number>();

/** Digits after the decimal point for an ISO 4217 currency (USD 2, JPY 0, KWD 3), from the runtime's ICU data. */
export function currencyExponent(currency: string): number {
  let e = exponents.get(currency);
  if (e === undefined) {
    try {
      e = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      e = 2;
    }
    exponents.set(currency, e);
  }
  return e;
}

/** A plan's price per month in the subscription's own minor units (yearly plans spread over 12 months). */
export function monthlyMinor(row: Pick<LiveSubscriptionRow, "plan" | "amountMinor">): number {
  return row.plan === "pro_yearly" ? row.amountMinor / 12 : row.amountMinor;
}

/**
 * Converts an amount in `currency` minor units to US cents. Prefers the rate the provider settled the
 * subscription's own payments at, then the daily `fx_rate`; null when neither exists (shown as unconverted,
 * never guessed).
 */
export function toUsdMinor(
  amountMinor: number,
  currency: string,
  rates: Pick<LiveSubscriptionRow, "paymentUsdPerMinor" | "fxUsdRate">
): number | null {
  if (currency === "USD") return amountMinor;
  if (rates.paymentUsdPerMinor !== null && Number.isFinite(rates.paymentUsdPerMinor)) {
    return amountMinor * rates.paymentUsdPerMinor;
  }
  if (rates.fxUsdRate !== null && Number.isFinite(rates.fxUsdRate)) {
    return (amountMinor / 10 ** currencyExponent(currency)) * rates.fxUsdRate * 100;
  }
  return null;
}

// ── MRR / ARR ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface Breakdown {
  key: string;
  subscribers: number;
  mrrUsdMinor: number;
  /** Share of the converted MRR, 0..1. */
  share: number;
}

interface MrrSummary {
  /** Active subscriptions only; on_hold is reported separately as at risk. */
  mrrUsdMinor: number;
  arrUsdMinor: number;
  subscribers: number;
  atRisk: { subscribers: number; mrrUsdMinor: number };
  /** Active subscriptions with no USD rate: left out of the totals, listed by currency. */
  unconverted: { subscribers: number; currencies: string[] };
  by: Record<"country" | "currency" | "priceTier" | "provider", Breakdown[]>;
}

const UNKNOWN = "unknown";

function breakdown(items: { key: string; usd: number }[], total: number): Breakdown[] {
  const map = new Map<string, { subscribers: number; mrrUsdMinor: number }>();
  for (const { key, usd } of items) {
    const b = map.get(key) ?? { subscribers: 0, mrrUsdMinor: 0 };
    b.subscribers += 1;
    b.mrrUsdMinor += usd;
    map.set(key, b);
  }
  return [...map.entries()]
    .map(([key, b]) => ({
      key,
      subscribers: b.subscribers,
      mrrUsdMinor: Math.round(b.mrrUsdMinor),
      share: total > 0 ? b.mrrUsdMinor / total : 0,
    }))
    .sort((a, b) => b.mrrUsdMinor - a.mrrUsdMinor || b.subscribers - a.subscribers || a.key.localeCompare(b.key));
}

export function computeMrr(rows: readonly LiveSubscriptionRow[]): MrrSummary {
  const converted: { row: LiveSubscriptionRow; usd: number }[] = [];
  const unconverted = new Set<string>();
  let unconvertedCount = 0;
  const atRisk = { subscribers: 0, mrrUsdMinor: 0 };

  for (const row of rows) {
    const usd = toUsdMinor(monthlyMinor(row), row.currency, row);
    if (row.status === "on_hold") {
      atRisk.subscribers += 1;
      atRisk.mrrUsdMinor += usd ?? 0;
      continue;
    }
    if (usd === null) {
      unconvertedCount += 1;
      unconverted.add(row.currency);
      continue;
    }
    converted.push({ row, usd });
  }

  const mrr = converted.reduce((n, c) => n + c.usd, 0);
  const by = (pick: (r: LiveSubscriptionRow) => string | null) =>
    breakdown(
      converted.map((c) => ({ key: pick(c.row) ?? UNKNOWN, usd: c.usd })),
      mrr
    );
  return {
    mrrUsdMinor: Math.round(mrr),
    arrUsdMinor: Math.round(mrr * 12),
    subscribers: converted.length + unconvertedCount,
    atRisk: { subscribers: atRisk.subscribers, mrrUsdMinor: Math.round(atRisk.mrrUsdMinor) },
    unconverted: { subscribers: unconvertedCount, currencies: [...unconverted].sort() },
    by: {
      country: by((r) => r.country),
      currency: by((r) => r.currency),
      priceTier: by((r) => r.priceTier),
      provider: by((r) => r.provider),
    },
  };
}

// ── Churn ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface ChurnSummary {
  created: number;
  churned: number;
  /** Cancelled by the subscriber (cancelled, or expired at the end of a cancelled period). */
  voluntary: number;
  /** Renewal failed after the on_hold grace period (on_hold → failed). */
  involuntary: number;
  /**
   * Churned ÷ subscribers at the start of the window, estimated as live now + churned − created. Null when
   * there was nobody to churn.
   */
  rate: number | null;
}

export function computeChurn(movement: SubscriptionMovement, liveNow: number): ChurnSummary {
  const voluntary = movement.ended.cancelled + movement.ended.expired;
  const involuntary = movement.ended.failed;
  const churned = voluntary + involuntary;
  const atStart = Math.max(liveNow + churned - movement.created, 0);
  return {
    created: movement.created,
    churned,
    voluntary,
    involuntary,
    rate: atStart > 0 ? churned / atStart : null,
  };
}

// ── Refunds and disputes ──────────────────────────────────────────────────────────────────────────────────────

const CHARGED: readonly PaymentStatus[] = [
  "succeeded",
  "refunded",
  "partially_refunded",
  "disputed",
  "dispute_won",
  "dispute_lost",
];
const REFUNDED: readonly PaymentStatus[] = ["refunded", "partially_refunded"];
const DISPUTED: readonly PaymentStatus[] = ["disputed", "dispute_won", "dispute_lost"];

interface PaymentRates {
  /** Payments that took money (everything but `failed`). */
  charged: number;
  failed: number;
  refunds: number;
  disputes: number;
  refundRate: number | null;
  disputeRate: number | null;
  refundAboveTarget: boolean;
  disputeAlert: boolean;
}

export function computePaymentRates(byStatus: Partial<Record<PaymentStatus, number>>): PaymentRates {
  const sum = (statuses: readonly PaymentStatus[]) => statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0);
  const charged = sum(CHARGED);
  const refunds = sum(REFUNDED);
  const disputes = sum(DISPUTED);
  const refundRate = charged > 0 ? refunds / charged : null;
  const disputeRate = charged > 0 ? disputes / charged : null;
  return {
    charged,
    failed: byStatus.failed ?? 0,
    refunds,
    disputes,
    refundRate,
    disputeRate,
    refundAboveTarget: refundRate !== null && refundRate >= REFUND_RATE_TARGET,
    disputeAlert: disputeRate !== null && disputeRate > DISPUTE_RATE_ALERT,
  };
}

/** True when paying subscribers exist but nothing succeeded for 6 hours (plan §10.5 revenue alert). */
export function noRecentPayments(lastSucceededAt: Date | null, payingSubscribers: number, now = Date.now()): boolean {
  if (payingSubscribers === 0 || lastSucceededAt === null) return false;
  return now - lastSucceededAt.getTime() > NO_PAYMENT_ALERT_MS;
}

// ── Series ────────────────────────────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** One value per UTC day for the `days` days ending today, zero where `rows` has no entry. */
export function dailySeries(
  rows: readonly { day: string; value: number }[],
  days: number,
  now = Date.now()
): { day: string; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.value]));
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    return { day, value: byDay.get(day) ?? 0 };
  });
}
