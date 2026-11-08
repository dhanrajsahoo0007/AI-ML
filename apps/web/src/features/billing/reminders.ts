import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { auditLog, subscription, user } from "@/server/db/schema";
import { enqueueEmail, type EmailQueueProducer } from "@/features/email/queue";
import type { EmailSender } from "@/features/email/sender";
import { formatMoney } from "./plans";

// The T-7 annual renewal reminder (plan §9.7) as a scheduling hook: `sendRenewalReminders(db, sender)` emails
// every yearly subscription renewing 7 to 8 days from now, once per renewal date (audit_log remembers), so it can
// run daily from a script or, later, the Worker's Cron Trigger. The email goes through enqueueEmail(): on the
// Queue when `options.queue` is the EMAIL_QUEUE binding (a Cron Trigger would pass env.EMAIL_QUEUE), inline through
// `sender` otherwise (the script). The idempotency key is the renewal itself, so a retry never sends two.

const REMINDER_DAYS = 7;
const DAY = 86_400_000;
const ACTION = "billing.renewal_reminder";

export async function sendRenewalReminders(
  db: Db,
  sender: EmailSender,
  options: { now?: Date; siteUrl: string; queue?: EmailQueueProducer | null }
): Promise<{ sent: number }> {
  const now = options.now ?? new Date();
  const from = new Date(now.getTime() + REMINDER_DAYS * DAY);
  const to = new Date(from.getTime() + DAY);
  const due = await db
    .select({
      id: subscription.id,
      periodEnd: subscription.currentPeriodEnd,
      currency: subscription.currency,
      amountMinor: subscription.amountMinor,
      email: user.email,
      name: user.name,
    })
    .from(subscription)
    .innerJoin(user, eq(user.id, subscription.userId))
    .where(
      and(
        eq(subscription.plan, "pro_yearly"),
        eq(subscription.status, "active"),
        eq(subscription.cancelAtPeriodEnd, false),
        gte(subscription.currentPeriodEnd, from),
        lt(subscription.currentPeriodEnd, to)
      )
    );

  let sent = 0;
  for (const sub of due) {
    const periodEnd = sub.periodEnd!.toISOString();
    const [already] = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, ACTION),
          eq(auditLog.target, `subscription:${sub.id}`),
          sql`${auditLog.meta}->>'periodEnd' = ${periodEnd}`
        )
      )
      .limit(1);
    if (already) continue;
    const renewsOn = sub.periodEnd!.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    await enqueueEmail(
      {
        kind: "billing.renewal-reminder",
        to: sub.email,
        data: {
          name: sub.name,
          renewsOn,
          price: formatMoney(sub.amountMinor, sub.currency),
          manageUrl: `${options.siteUrl}/account/billing`,
        },
        idempotencyKey: `billing.renewal-reminder:${sub.id}:${sub.periodEnd!.getTime()}`,
      },
      { queue: options.queue, sender }
    );
    await db
      .insert(auditLog)
      .values({ actor: "system:reminders", action: ACTION, target: `subscription:${sub.id}`, meta: { periodEnd } });
    sent++;
  }
  return { sent };
}
