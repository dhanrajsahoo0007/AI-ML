import { sql } from "drizzle-orm";
import { char, check, index, jsonb, pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, tz } from "./columns";
import { newsletterSubscriber } from "./newsletter";

// Consent, progress, bookmarks and the audit log (plan §8.2, §8.3).

export const consentKind = pgEnum("consent_kind", [
  "age_confirmation",
  "terms",
  "privacy",
  "eu_withdrawal_waiver",
  // Newsletter double opt-in confirmed (plan §15.2). Suffixed so the value is not a section-key literal.
  "newsletter_opt_in",
]);

// Proof of consent. Newsletter consent can come from someone without an account, so either `user_id` or
// `subscriber_id` is set.
export const consentLog = pgTable(
  "consent_log",
  {
    id: id(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id").references(() => newsletterSubscriber.id, { onDelete: "cascade" }),
    kind: consentKind("kind").notNull(),
    textVersion: text("text_version").notNull(),
    country: char("country", { length: 2 }),
    at: tz("at").notNull().defaultNow(),
  },
  (t) => [
    index("consent_log_user_kind_idx").on(t.userId, t.kind),
    index("consent_log_subscriber_id_idx").on(t.subscriberId),
    check("consent_log_subject_check", sql`${t.userId} is not null or ${t.subscriberId} is not null`),
  ]
);

/** `content_key` is `section/slug` (for example `system-design/caching/cdn`). */
const contentKeyCheck = (col: string) => sql.raw(`${col} ~ '^[a-z0-9][a-z0-9/_-]{0,199}$'`);

export const progress = pgTable(
  "progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentKey: text("content_key").notNull(),
    completedAt: tz("completed_at"),
    lastReadAt: tz("last_read_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "progress_pkey", columns: [t.userId, t.contentKey] }),
    check("progress_content_key_check", contentKeyCheck("content_key")),
  ]
);

export const bookmark = pgTable(
  "bookmark",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentKey: text("content_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "bookmark_pkey", columns: [t.userId, t.contentKey] }),
    check("bookmark_content_key_check", contentKeyCheck("content_key")),
  ]
);

// Admin and billing actions. No foreign keys: entries outlive the rows they describe. `actor` is a user id,
// `system`, or `webhook:<provider>`.
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    meta: jsonb("meta"),
    at: tz("at").notNull().defaultNow(),
  },
  (t) => [index("audit_log_target_idx").on(t.target), index("audit_log_at_idx").on(t.at)]
);
