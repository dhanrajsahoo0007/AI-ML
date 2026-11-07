import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { currentEntitlement, payment, subscription } from "@/server/db/schema";

// What /account/billing shows (plan §9.3): the latest subscription, the effective entitlement and recent payments.

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
    })
    .from(payment)
    .where(eq(payment.userId, userId))
    .orderBy(desc(payment.createdAt))
    .limit(12);
  return { subscription: sub ?? null, tier: ent?.tier ?? "free", validUntil: ent?.validUntil ?? null, payments };
}
