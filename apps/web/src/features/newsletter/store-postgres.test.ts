import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe } from "vitest";
import { createTestDatabase, testDatabaseAvailable, type TestDatabase } from "@/server/db/testing";
import { describeStoreContract } from "./store.contract";
import { PostgresNewsletterStore } from "./store-postgres";

// The NewsletterStore contract against Docker Postgres (`npm run db:up -w web`); skipped without it.

const available = await testDatabaseAvailable();

describe.skipIf(!available)("PostgresNewsletterStore (integration)", () => {
  let tdb: TestDatabase;
  beforeAll(async () => {
    tdb = await createTestDatabase();
    // The contract's user IDs must exist for the user_id foreign key.
    await tdb.db.execute(sql`
      insert into "user" (id, name, email, email_verified) values
        ('0190f0f0-0000-7000-8000-000000000001', 'Contract One', 'one@users.origins.test', true),
        ('0190f0f0-0000-7000-8000-000000000002', 'Contract Two', 'two@users.origins.test', true)`);
  });
  afterAll(async () => {
    await tdb?.drop();
  });
  beforeEach(async () => {
    await tdb.db.execute(sql`truncate newsletter_subscriber cascade`);
  });

  describeStoreContract("PostgresNewsletterStore", () => new PostgresNewsletterStore(tdb.db));
});
