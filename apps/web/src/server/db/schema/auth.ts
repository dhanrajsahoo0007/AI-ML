import { boolean, index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tz, updatedAt } from "./columns";

// Better Auth's four core tables (user, session, account, verification), hand-written to match what
// `@better-auth/cli generate` emits for the drizzle adapter, plus `user.role`. The JS keys are Better Auth's
// field names (the adapter maps by key); the SQL names are snake_case. Ids are UUIDv7 strings that Better Auth
// generates through `advanced.database.generateId` (features/auth/server.ts).

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const user = pgTable(
  "user",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRole("role").notNull().default("user"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("user_email_key").on(t.email)]
);

export const session = pgTable(
  "session",
  {
    id: id(),
    expiresAt: tz("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("session_token_key").on(t.token), index("session_user_id_idx").on(t.userId, t.createdAt)]
);

export const account = pgTable(
  "account",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // OAuth tokens are encrypted by Better Auth before they are stored (`account.encryptOAuthTokens`).
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tz("access_token_expires_at"),
    refreshTokenExpiresAt: tz("refresh_token_expires_at"),
    scope: text("scope"),
    // Unused (Google only, no passwords: plan §11.2); kept because Better Auth's model has it.
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("account_provider_account_key").on(t.providerId, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);
