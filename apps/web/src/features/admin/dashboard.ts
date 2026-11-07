import "server-only";
import type { Db } from "@/server/db/client";
import {
  dailyRevenue,
  liveSubscriptions,
  paymentWindowStats,
  recentWebhookErrors,
  staleWebhookCount,
  subscriberCounts,
  subscriptionMovement,
  webhookHealth,
} from "@/server/db/admin-queries";
import { computeChurn, computeMrr, computePaymentRates, dailySeries, noRecentPayments } from "./kpi";

// Loads and computes what each admin page shows. Queries run one after another: a page holds a single
// one-connection pool (server/db/client.ts).

const WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

export async function loadKpis(db: Db, now = Date.now()) {
  const since = new Date(now - WINDOW_DAYS * DAY_MS);
  const live = await liveSubscriptions(db);
  const movement = await subscriptionMovement(db, since);
  const payments = await paymentWindowStats(db, since);
  const revenue = await dailyRevenue(db, since);
  const mailingList = await subscriberCounts(db);

  const mrr = computeMrr(live);
  return {
    windowDays: WINDOW_DAYS,
    mrr,
    churn: computeChurn(movement, live.length),
    payments: {
      ...computePaymentRates(payments.byStatus),
      guaranteeRefunds: payments.guaranteeRefunds,
      lastSucceededAt: payments.lastSucceededAt,
      noRecentPayments: noRecentPayments(payments.lastSucceededAt, mrr.subscribers, now),
    },
    revenue: {
      series: dailySeries(
        revenue.map((r) => ({ day: r.day, value: r.usdMinor })),
        WINDOW_DAYS,
        now
      ),
      totalUsdMinor: revenue.reduce((n, r) => n + r.usdMinor, 0),
      payments: revenue.reduce((n, r) => n + r.payments, 0),
      unconverted: revenue.reduce((n, r) => n + r.unconverted, 0),
    },
    mailingList: {
      active: mailingList.active ?? 0,
      pending: mailingList.pending ?? 0,
      unsubscribed: mailingList.unsubscribed ?? 0,
      bounced: (mailingList.bounced ?? 0) + (mailingList.complained ?? 0),
    },
  };
}

/** The webhook SLO (plan §10.6): processed within one minute. */
const WEBHOOK_SLO_MS = 60_000;

export async function loadWebhooks(db: Db, now = Date.now()) {
  return {
    providers: await webhookHealth(db),
    stale: await staleWebhookCount(db, new Date(now - WEBHOOK_SLO_MS)),
    errors: await recentWebhookErrors(db, 25),
  };
}
