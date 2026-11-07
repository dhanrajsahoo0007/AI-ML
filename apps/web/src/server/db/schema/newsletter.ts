import { sql } from "drizzle-orm";
import { char, check, index, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, tz } from "./columns";

// Newsletter (plan §15.2). Stream P owns the behaviour (`NewsletterStore` port in features/newsletter); these
// are only the tables. Subscribing doesn't need an account: `user_id` is set when a signed-in user subscribes,
// and the row is deleted with the account.

export const newsletterStatus = pgEnum("newsletter_status", [
  "pending",
  "active",
  "unsubscribed",
  "bounced",
  "complained",
]);
export const newsletterEventType = pgEnum("newsletter_event_type", [
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
]);

export const newsletterSubscriber = pgTable(
  "newsletter_subscriber",
  {
    id: id(),
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    status: newsletterStatus("status").notNull().default("pending"),
    source: text("source"),
    country: char("country", { length: 2 }),
    createdAt: createdAt(),
    confirmedAt: tz("confirmed_at"),
    unsubscribedAt: tz("unsubscribed_at"),
    // Double opt-in emails sent to this address (security review H2): the last one, and how many in the run that
    // ended with it (reset when the last one is over 24 hours old). The store refuses to send more often.
    confirmationSentAt: tz("confirmation_sent_at"),
    confirmationCount: integer("confirmation_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("newsletter_subscriber_email_key").on(t.email),
    index("newsletter_subscriber_user_id_idx").on(t.userId),
    check("newsletter_subscriber_email_lower_check", sql`${t.email} = lower(${t.email})`),
  ]
);

export const newsletterEvent = pgTable(
  "newsletter_event",
  {
    id: id(),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => newsletterSubscriber.id, { onDelete: "cascade" }),
    issueSlug: text("issue_slug").notNull(),
    type: newsletterEventType("type").notNull(),
    at: tz("at").notNull().defaultNow(),
  },
  (t) => [
    index("newsletter_event_subscriber_id_idx").on(t.subscriberId),
    index("newsletter_event_issue_idx").on(t.issueSlug, t.type),
  ]
);
