import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import {
  account,
  auditLog,
  bookmark,
  consentLog,
  customer,
  entitlement,
  newsletterEvent,
  newsletterSubscriber,
  payment,
  progress,
  session,
  subscription,
  user,
} from "@/server/db/schema";

// The user's own data: the account page overview, the JSON export (GDPR art. 15/20, India DPDP) and account
// deletion. Every query is filtered by the signed-in user's id; nothing else is ever selected.

export const EXPORT_FORMAT = "origins-ai-learn/account-export@1";

export async function exportUserData(db: Db, userId: string, now = new Date()) {
  const [profile] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId));
  if (!profile) return null;

  const subscribers = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.userId, userId));
  const subscriberIds = subscribers.map((s) => s.id);

  const [
    accounts,
    sessions,
    consents,
    progressRows,
    bookmarks,
    customers,
    subscriptions,
    entitlements,
    payments,
    events,
  ] = await Promise.all([
    // Never tokens: only which provider is connected and when.
    db
      .select({
        providerId: account.providerId,
        accountId: account.accountId,
        scope: account.scope,
        createdAt: account.createdAt,
      })
      .from(account)
      .where(eq(account.userId, userId)),
    db
      .select({
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.createdAt)),
    db
      .select({
        kind: consentLog.kind,
        textVersion: consentLog.textVersion,
        country: consentLog.country,
        at: consentLog.at,
      })
      .from(consentLog)
      .where(eq(consentLog.userId, userId)),
    db
      .select({ contentKey: progress.contentKey, completedAt: progress.completedAt, lastReadAt: progress.lastReadAt })
      .from(progress)
      .where(eq(progress.userId, userId)),
    db
      .select({ contentKey: bookmark.contentKey, createdAt: bookmark.createdAt })
      .from(bookmark)
      .where(eq(bookmark.userId, userId)),
    db
      .select({
        provider: customer.provider,
        providerCustomerId: customer.providerCustomerId,
        createdAt: customer.createdAt,
      })
      .from(customer)
      .where(eq(customer.userId, userId)),
    db.select().from(subscription).where(eq(subscription.userId, userId)),
    db.select().from(entitlement).where(eq(entitlement.userId, userId)),
    db.select().from(payment).where(eq(payment.userId, userId)),
    subscriberIds.length
      ? db.select().from(newsletterEvent).where(inArray(newsletterEvent.subscriberId, subscriberIds))
      : Promise.resolve([]),
  ]);

  return {
    format: EXPORT_FORMAT,
    exportedAt: now.toISOString(),
    profile,
    connectedAccounts: accounts,
    sessions,
    consents,
    progress: progressRows,
    bookmarks,
    billing: { customers, subscriptions, entitlement: entitlements[0] ?? null, payments },
    newsletter: { subscriptions: subscribers, events },
  };
}

export type AccountExport = NonNullable<Awaited<ReturnType<typeof exportUserData>>>;

/** What /account shows. */
export async function accountOverview(db: Db, userId: string) {
  const [profile, accounts, sessions, ent, completed, bookmarks] = await Promise.all([
    db
      .select({ name: user.name, email: user.email, image: user.image, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, userId))
      .then((r) => r[0] ?? null),
    db
      .select({ providerId: account.providerId, createdAt: account.createdAt })
      .from(account)
      .where(eq(account.userId, userId)),
    db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.createdAt)),
    db
      .select({ tier: entitlement.tier, validUntil: entitlement.validUntil })
      .from(entitlement)
      .where(eq(entitlement.userId, userId))
      .then((r) => r[0] ?? null),
    db
      .select({ contentKey: progress.contentKey, completedAt: progress.completedAt })
      .from(progress)
      .where(eq(progress.userId, userId))
      .orderBy(desc(progress.lastReadAt))
      .limit(200),
    db
      .select({ contentKey: bookmark.contentKey })
      .from(bookmark)
      .where(eq(bookmark.userId, userId))
      .orderBy(desc(bookmark.createdAt))
      .limit(200),
  ]);
  if (!profile) return null;
  const proActive = ent?.tier === "pro" && (!ent.validUntil || ent.validUntil.getTime() > Date.now());
  return {
    profile,
    accounts,
    sessions,
    plan: proActive ? ("pro" as const) : ("free" as const),
    completed: completed.filter((p) => p.completedAt).map((p) => p.contentKey),
    bookmarks: bookmarks.map((b) => b.contentKey),
  };
}

export type AccountOverview = NonNullable<Awaited<ReturnType<typeof accountOverview>>>;

// ── Deletion ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface LiveSubscription {
  id: string;
  provider: string;
  providerSubscriptionId: string;
}

/**
 * Cancels a live subscription with the payment provider before the account is deleted.
 * TODO(stream L, billing): register the provider-backed canceller (`PaymentProvider.cancel(subId)`, plan §9.3)
 * with setSubscriptionCanceller. Until then a live subscription blocks deletion, so nobody is deleted while
 * still being charged.
 */
export type SubscriptionCanceller = (sub: LiveSubscription) => Promise<void>;

let canceller: SubscriptionCanceller | null = null;

export function setSubscriptionCanceller(fn: SubscriptionCanceller | null): void {
  canceller = fn;
}

export class LiveSubscriptionError extends Error {
  override name = "LiveSubscriptionError";
}

/**
 * Deletes the user. Every user-owned row goes with it (ON DELETE CASCADE): sessions, accounts, consent,
 * progress, bookmarks, subscriptions, entitlement, customers, newsletter subscriptions. Payments stay for revenue
 * reporting with `user_id` set to NULL. The deletion itself is written to audit_log without personal data.
 */
export async function deleteAccount(db: Db, userId: string): Promise<{ cancelled: number }> {
  const live = await db
    .select({
      id: subscription.id,
      provider: subscription.provider,
      providerSubscriptionId: subscription.providerSubscriptionId,
    })
    .from(subscription)
    .where(and(eq(subscription.userId, userId), inArray(subscription.status, ["active", "on_hold"])));
  if (live.length && !canceller) {
    throw new LiveSubscriptionError("Cancel your subscription before deleting your account");
  }
  for (const sub of live) await canceller!(sub);

  await db.transaction(async (tx) => {
    await tx.delete(user).where(eq(user.id, userId));
    await tx.insert(auditLog).values({
      actor: userId,
      action: "account.delete",
      target: `user:${userId}`,
      meta: { cancelledSubscriptions: live.length },
    });
  });
  return { cancelled: live.length };
}
