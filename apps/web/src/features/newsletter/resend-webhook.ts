import "server-only";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/server/db/client";
import { newsletterEvent, webhookEvent } from "@/server/db/schema";
import { normalizeEmail, type SuppressReason } from "./store";
import { PostgresNewsletterStore, subscribersByEmail } from "./store-postgres";

// Resend webhook events → `newsletter_event` rows, and the suppression list (plan §15.2 "Deliverability"):
//
//   email.delivered | email.opened | email.clicked   → an event row for each known subscriber among the recipients
//   email.bounced (hard) | email.complained          → suppress the address (creating it if unknown), then the row
//   anything else (email.sent, email.delivery_delayed, contact.*, …) → stored for idempotency, otherwise ignored
//
// Idempotent like billing (plan §9.3): `webhook_event` (provider `resend`, event_id = svix-id) is claimed with
// INSERT … ON CONFLICT DO NOTHING in the same transaction as the effects, so a retry after a failure re-runs the
// whole event and a duplicate delivery changes nothing. The stored payload has no addresses or subjects.

export const RESEND_PROVIDER = "resend";

const EVENT_TYPES = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
} as const satisfies Record<string, "delivered" | "opened" | "clicked" | SuppressReason>;

const tagsSchema = z.union([
  z.record(z.string(), z.string()),
  z.array(z.object({ name: z.string(), value: z.string() })).transform((list) =>
    Object.fromEntries(list.map((t) => [t.name, t.value]))
  ),
]);

export const resendEventSchema = z.object({
  type: z.string().min(1).max(100),
  created_at: z.string().max(64).optional(),
  data: z
    .object({
      email_id: z.string().max(200).optional(),
      broadcast_id: z.string().max(200).optional(),
      created_at: z.string().max(64).optional(),
      to: z.union([z.array(z.string().max(320)).max(100), z.string().max(320)]).optional(),
      tags: tagsSchema.optional(),
      bounce: z.object({ type: z.string().max(64).optional(), subType: z.string().max(64).optional() }).optional(),
    })
    .default({}),
});

export type ResendEvent = z.infer<typeof resendEventSchema>;

export type ProcessResult = "processed" | "duplicate" | "ignored";

const SLUG_MAX = 200;

/**
 * Which issue an event belongs to: the `issue` tag (set on issue sends), else the broadcast, else the template
 * tag ResendEmailSender puts on transactional mail (confirm, welcome).
 */
export function issueSlugOf(event: ResendEvent): string {
  const tags = event.data.tags ?? {};
  const slug = tags.issue
    ? tags.issue
    : event.data.broadcast_id
      ? `broadcast:${event.data.broadcast_id}`
      : tags.template
        ? `template:${tags.template}`
        : "unknown";
  return slug.slice(0, SLUG_MAX);
}

function recipients(event: ResendEvent): string[] {
  const to = event.data.to;
  const list = Array.isArray(to) ? to : to ? [to] : [];
  // "Name <a@b>" → a@b
  const emails = list.map((t) => normalizeEmail(/<([^>]+)>/.exec(t)?.[1] ?? t)).filter((e) => /^[^@\s]+@[^@\s]+$/.test(e));
  return [...new Set(emails)];
}

function eventTime(event: ResendEvent): Date {
  for (const text of [event.data.created_at, event.created_at]) {
    const d = text ? new Date(text) : null;
    if (d && !Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** A transient (soft) bounce is recorded but doesn't suppress the address. */
const isHardBounce = (event: ResendEvent) => event.data.bounce?.type?.toLowerCase() !== "transient";

/** What webhook_event keeps: enough to debug and replay the effects, nothing personal. */
function trimmed(event: ResendEvent) {
  return {
    type: event.type,
    created_at: event.created_at ?? null,
    email_id: event.data.email_id ?? null,
    broadcast_id: event.data.broadcast_id ?? null,
    tags: event.data.tags ?? null,
    bounce: event.data.bounce ?? null,
    recipients: recipients(event).length,
  };
}

export async function processResendEvent(db: Db, input: { eventId: string; event: ResendEvent }): Promise<ProcessResult> {
  const { eventId, event } = input;
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(webhookEvent)
      .values({ provider: RESEND_PROVIDER, eventId, type: event.type, payload: trimmed(event) })
      .onConflictDoNothing({ target: [webhookEvent.provider, webhookEvent.eventId] })
      .returning({ id: webhookEvent.id });
    if (!claimed) return "duplicate";

    const markProcessed = () =>
      tx
        .update(webhookEvent)
        .set({ processedAt: new Date() })
        .where(and(eq(webhookEvent.provider, RESEND_PROVIDER), eq(webhookEvent.eventId, eventId)));

    const type = EVENT_TYPES[event.type as keyof typeof EVENT_TYPES];
    if (!type) {
      await markProcessed();
      return "ignored";
    }

    const emails = recipients(event);
    const store = new PostgresNewsletterStore(tx);
    const suppress = type === "complained" || (type === "bounced" && isHardBounce(event));
    const subscriberIds: string[] = [];
    if (suppress) {
      for (const email of emails) subscriberIds.push((await store.suppress(email, type as SuppressReason)).id);
    } else {
      for (const s of await subscribersByEmail(tx, emails)) subscriberIds.push(s.id);
    }

    if (subscriberIds.length > 0) {
      const issueSlug = issueSlugOf(event);
      const at = eventTime(event);
      await tx.insert(newsletterEvent).values(subscriberIds.map((subscriberId) => ({ subscriberId, issueSlug, type, at })));
    }
    await markProcessed();
    return "processed";
  });
}
