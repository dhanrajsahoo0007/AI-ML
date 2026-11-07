import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { auditLog, subscription } from "@/server/db/schema";
import { applySubscriptionSnapshot } from "./apply";
import type { SubscriptionSnapshot } from "./events";
import type { PaymentProvider } from "./port";

// Reconciliation (plan §9.3): the provider is the source of truth. Every live subscription it lists is compared
// with ours, and every subscription we think is live but it doesn't list is fetched; each difference is applied
// through the same state machine as a webhook and written to audit_log. Callable from scripts/billing-reconcile.ts;
// a daily Cron Trigger in the Worker entry is deferred until the Worker has one.

export interface ReconcileReport {
  provider: string;
  checked: number;
  corrected: { providerSubscriptionId: string; fields: string[] }[];
  /** corrected / checked; plan §9.3 alerts above 0.5%. */
  driftRatio: number;
}

type Row = typeof subscription.$inferSelect;

function differences(row: Row | undefined, snap: SubscriptionSnapshot): string[] {
  if (!row) return ["missing"];
  const out: string[] = [];
  if (snap.status !== "pending" && row.status !== snap.status) out.push("status");
  if ((row.currentPeriodEnd?.getTime() ?? null) !== (snap.currentPeriodEnd?.getTime() ?? null)) out.push("currentPeriodEnd");
  if (row.cancelAtPeriodEnd !== snap.cancelAtPeriodEnd) out.push("cancelAtPeriodEnd");
  if (snap.plan && row.plan !== snap.plan) out.push("plan");
  return out;
}

export async function reconcile(db: Db, provider: PaymentProvider, now: Date = new Date()): Promise<ReconcileReport> {
  const seen = new Set<string>();
  const corrected: ReconcileReport["corrected"] = [];
  let checked = 0;
  const ctx = { provider: provider.id, actor: "system:reconcile", now, ignoreOrdering: true };

  async function check(snap: SubscriptionSnapshot) {
    checked++;
    seen.add(snap.providerSubscriptionId);
    const [row] = await db
      .select()
      .from(subscription)
      .where(and(eq(subscription.provider, provider.id), eq(subscription.providerSubscriptionId, snap.providerSubscriptionId)))
      .limit(1);
    const fields = differences(row, snap);
    if (fields.length === 0 || snap.status === "pending") return;
    const type = snap.status === "active" ? "renewed" : snap.status;
    const result = await db.transaction((tx) =>
      applySubscriptionSnapshot(tx, ctx, {
        kind: "subscription",
        type,
        id: `reconcile:${snap.providerSubscriptionId}:${now.toISOString()}`,
        occurredAt: now,
        subscription: snap,
      })
    );
    if (result.applied) corrected.push({ providerSubscriptionId: snap.providerSubscriptionId, fields });
  }

  let cursor: string | undefined;
  do {
    const page = await provider.listActiveSubscriptions(cursor);
    for (const snap of page.items) await check(snap);
    cursor = page.next;
  } while (cursor);

  const ours = await db
    .select({ id: subscription.providerSubscriptionId })
    .from(subscription)
    .where(and(eq(subscription.provider, provider.id), inArray(subscription.status, ["active", "on_hold"])));
  for (const { id } of ours) {
    if (!seen.has(id)) await check(await provider.getSubscription(id));
  }

  const report = { provider: provider.id, checked, corrected, driftRatio: checked ? corrected.length / checked : 0 };
  await db.insert(auditLog).values({
    actor: "system:reconcile",
    action: "billing.reconcile",
    target: `provider:${provider.id}`,
    meta: { checked, corrected: corrected.length, driftRatio: report.driftRatio },
  });
  return report;
}
