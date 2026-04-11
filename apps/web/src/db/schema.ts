import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const learningPaths = pgTable(
  "learning_paths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
    title: varchar("title", { length: 256 }).notNull(),
    summary: text("summary"),
    topic: varchar("topic", { length: 64 }).notNull(),
    sortOrder: varchar("sort_order", { length: 8 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("learning_paths_topic_idx").on(t.topic)]
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 128 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    summary: text("summary"),
    sortOrder: varchar("sort_order", { length: 8 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("modules_path_id_idx").on(t.pathId),
    index("modules_path_slug_idx").on(t.pathId, t.slug),
    uniqueIndex("modules_path_slug_uid").on(t.pathId, t.slug),
  ]
);

export const learners = pgTable("learners", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalKey: varchar("external_key", { length: 128 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("module_progress_learner_idx").on(t.learnerId),
    index("module_progress_module_idx").on(t.moduleId),
    uniqueIndex("module_progress_learner_module_uid").on(
      t.learnerId,
      t.moduleId
    ),
  ]
);
