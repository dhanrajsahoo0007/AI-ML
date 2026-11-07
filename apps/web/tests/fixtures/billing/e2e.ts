import type { APIRequestContext } from "@playwright/test";
import { Client } from "pg";
import { testUserEmail, type TestUserKey } from "../../../src/server/db/test-users";
import { envelope, signedHeaders } from "./dodo";

// Helpers for the webhook-driven e2e specs: post signed fixture webhooks to the server under test and read
// back the rows they wrote. The webhook secret is the server's DODO_WEBHOOK_SECRET (same shell environment).

export const webhookSecret = () => process.env.DODO_WEBHOOK_SECRET ?? "";

export async function postWebhook(
  request: APIRequestContext,
  type: string,
  data: unknown,
  options: { at?: Date; id?: string; secret?: string; timestamp?: number } = {}
) {
  const body = envelope(type, data, options.at);
  const headers = await signedHeaders(options.secret ?? webhookSecret(), body, {
    id: options.id,
    timestamp: options.timestamp,
  });
  return request.post("/api/billing/webhook/dodo", { data: body, headers });
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

export async function userId(key: TestUserKey): Promise<string> {
  const [row] = await query<{ id: string }>(`select id from "user" where email = $1`, [testUserEmail(key)]);
  if (!row) throw new Error(`seed user ${key} missing`);
  return row.id;
}
