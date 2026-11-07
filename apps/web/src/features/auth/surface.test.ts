import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { authConfig } from "./config";
import { createAuth } from "./server";

// Security review L1: Better Auth endpoints the app doesn't use are off. list-sessions handed every session token to
// page scripts, and get-access-token / refresh-token handed out Google tokens. Disabled paths answer 404 before any
// session or database work, so no database is needed here.

const auth = createAuth({} as Db, authConfig({ BETTER_AUTH_URL: "http://localhost:3001" }, "local"));

const DISABLED: [method: "GET" | "POST", path: string][] = [
  ["GET", "/list-sessions"],
  ["POST", "/revoke-session"],
  ["POST", "/revoke-sessions"],
  ["POST", "/revoke-other-sessions"],
  ["POST", "/get-access-token"],
  ["POST", "/refresh-token"],
  ["GET", "/account-info"],
  ["GET", "/list-accounts"],
  ["POST", "/update-user"],
  ["POST", "/delete-user"],
];

describe("Better Auth surface", () => {
  it.each(DISABLED)("%s /api/auth%s answers 404", async (method, path) => {
    const res = await auth.handler(
      new Request(`http://localhost:3001/api/auth${path}`, {
        method,
        headers: { origin: "http://localhost:3001", "content-type": "application/json" },
        body: method === "POST" ? "{}" : undefined,
      })
    );
    expect(res.status).toBe(404);
  });
});
