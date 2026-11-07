import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "../uuid";

// Shared column builders: UUIDv7 primary keys generated in the app (`gen_random_uuid()` is only the
// database-side fallback for hand-written SQL) and `timestamptz` everywhere (plan §8.2).
export const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .$defaultFn(() => uuidv7());

export const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const createdAt = () => tz("created_at").notNull().defaultNow();

export const updatedAt = () =>
  tz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
