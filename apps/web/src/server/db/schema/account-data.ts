import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, tz } from "./columns";
import { newsletterSubscriber } from "./newsletter";

// Consent, progress, bookmarks, practice data and the audit log (plan §8.2, §8.3).

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

// Practice data (features/practice): how the learner rated their own answer to an interview question, and the
// interview stories they wrote in the story builder. The limits mirror src/lib/stories.ts (STORY_LIMITS) and the
// zod schemas in features/practice/schema.ts; change all three together (new migration).

export const practiceRating = pgTable(
  "practice_rating",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** A question id of the interview bank, e.g. `company-meta-conflict-with-colleague`. */
    questionId: text("question_id").notNull(),
    rating: smallint("rating").notNull(),
    times: integer("times").notNull().default(1),
    practisedAt: tz("practised_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "practice_rating_pkey", columns: [t.userId, t.questionId] }),
    check("practice_rating_question_id_check", sql.raw(`question_id ~ '^[a-z0-9][a-z0-9-]{0,199}$'`)),
    check("practice_rating_rating_check", sql.raw("rating between 1 and 5")),
    check("practice_rating_times_check", sql.raw("times between 1 and 100000")),
  ]
);

export const practiceStory = pgTable(
  "practice_story",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Made in the browser (src/lib/stories.ts newStoryId), so a story keeps its id across devices. */
    id: text("id").notNull(),
    title: text("title").notNull().default(""),
    situation: text("situation").notNull().default(""),
    action: text("action").notNull().default(""),
    result: text("result").notNull().default(""),
    learning: text("learning").notNull().default(""),
    /** Signal slugs (content/question-bank/signals.yaml) the story can answer. */
    covers: jsonb("covers").$type<string[]>().notNull().default([]),
    updatedAt: tz("updated_at").notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "practice_story_pkey", columns: [t.userId, t.id] }),
    check("practice_story_id_check", sql.raw(`id ~ '^[a-z0-9][a-z0-9-]{5,39}$'`)),
    check(
      "practice_story_length_check",
      sql.raw(
        "char_length(title) <= 120 and char_length(situation) <= 1500 and char_length(action) <= 4000 and char_length(result) <= 1500 and char_length(learning) <= 1500"
      )
    ),
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
