import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { currentEntitlement, payment, subscription } from "@/server/db/schema";
import { isGuaranteeEligible } from "./guarantee";

// What /account/billing shows (plan §9.3): the latest subscription, the effective entitlement, recent payments and
// whether the 7-day money-back guarantee can still be requested.

export async function billingOverview(db: Db, userId: string) {
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.updatedAt))
    .limit(1);
  const [ent] = await db
    .select({ tier: currentEntitlement.tier, validUntil: currentEntitlement.validUntil })
    .from(currentEntitlement)
    .where(eq(currentEntitlement.userId, userId))
    .limit(1);
  const payments = await db
    .select({
      id: payment.id,
      status: payment.status,
      currency: payment.currency,
      amountMinor: payment.amountMinor,
      createdAt: payment.createdAt,
      plan: subscription.plan,
    })
    .from(payment)
    .leftJoin(subscription, eq(subscription.id, payment.subscriptionId))
    .where(eq(payment.userId, userId))
    .orderBy(desc(payment.createdAt))
    .limit(50);
  return {
    subscription: sub ?? null,
    tier: ent?.tier ?? "free",
    validUntil: ent?.validUntil ?? null,
    payments: payments.slice(0, 12),
    guarantee: isGuaranteeEligible(payments),
  };
}
