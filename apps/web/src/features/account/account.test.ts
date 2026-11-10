import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import * as t from "@/server/db/schema";
import { testDatabaseAvailable } from "@/server/db/testing";
import { call, cookieHeader, setupAuthTestEnv, testLoginAs } from "@/features/auth/test-helpers";
import { setSubscriptionCanceller } from "./data";

// Export and delete (plan §8.3, §11.2): only your own rows, re-auth within 10 minutes, cascading delete.
const available = await testDatabaseAvailable();

describe.skipIf(!available)("account data (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  beforeAll(async () => {
    env = await setupAuthTestEnv();
  });
  afterAll(async () => {
    await env?.teardown();
  });
  afterEach(() => setSubscriptionCanceller(null));

  const routes = async () => ({
    exportRoute: (await import("@/app/api/account/export/route")).GET,
    deleteRoute: (await import("@/app/api/account/delete/route")).POST,
    sessionsRoute: (await import("@/app/api/account/sessions/route")).DELETE,
    progressRoute: (await import("@/app/api/progress/route")).POST,
  });

  /** Ages every session of the user so it is no longer "fresh". */
  const ageSessions = (userId: string, minutes: number) =>
    env.tdb.db
      .update(t.session)
      .set({ createdAt: sql`now() - make_interval(mins => ${minutes})` })
      .where(eq(t.session.userId, userId));

  it("exports the user's own rows and nothing of anyone else's", async () => {
    const { exportRoute, progressRoute } = await routes();
    const mine = await testLoginAs("pro_monthly");
    const theirs = await testLoginAs("pro_yearly");
    await call(progressRoute, "/api/progress", {
      method: "POST",
      body: { contentKey: "system-design/caching/cdn", kind: "complete" },
      cookie: mine,
    });
    await call(progressRoute, "/api/progress", {
      method: "POST",
      body: { contentKey: "cloud/aws/secret-other-user", kind: "bookmark" },
      cookie: theirs,
    });

    const res = await call(exportRoute, "/api/account/export", { cookie: mine });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="tokenstoscale-export-/);
    const text = await res.text();
    const data = JSON.parse(text);
    expect(data.profile.email).toBe("pro-monthly@users.tokenstoscale.test");
    expect(data.progress.map((p: { contentKey: string }) => p.contentKey)).toEqual(["system-design/caching/cdn"]);
    expect(data.billing.subscriptions).toHaveLength(1);
    expect(data.consents[0].kind).toBe("age_confirmation");
    // Nothing that identifies another user, and no secrets.
    for (const key of ["free", "pro_yearly", "pro_expired", "on_hold", "admin"] as const) {
      expect(text).not.toContain(env.ids[key]);
    }
    expect(text).not.toContain("pro-yearly@");
    expect(text).not.toContain("secret-other-user");
    expect(text).not.toMatch(/"token"|accessToken|refreshToken|idToken/);
  });

  it("requires a sign-in within the last 10 minutes for export and delete", async () => {
    const { exportRoute, deleteRoute } = await routes();
    const cookie = await testLoginAs("pro_expired");
    await ageSessions(env.ids.pro_expired, 11);
    const exp = await call(exportRoute, "/api/account/export", { cookie });
    expect(exp.status).toBe(403);
    expect(((await exp.json()) as { error: { code: string } }).error.code).toBe("reauth_required");
    const del = await call(deleteRoute, "/api/account/delete", { method: "POST", body: { confirm: "DELETE" }, cookie });
    expect(del.status).toBe(403);
    const [still] = await env.tdb.db.select().from(t.user).where(eq(t.user.id, env.ids.pro_expired));
    expect(still).toBeDefined();
  });

  it("needs the typed confirmation", async () => {
    const { deleteRoute } = await routes();
    const cookie = await testLoginAs("free");
    const res = await call(deleteRoute, "/api/account/delete", { method: "POST", body: { confirm: "yes" }, cookie });
    expect(res.status).toBe(400);
  });

  it("deletes the account, cascades, clears cookies and keeps an anonymous audit entry", async () => {
    const { deleteRoute, progressRoute, exportRoute } = await routes();
    const userId = env.ids.free;
    const cookie = await testLoginAs("free");
    await call(progressRoute, "/api/progress", {
      method: "POST",
      body: { contentKey: "ai-system-design/rag/basics", kind: "bookmark" },
      cookie,
    });
    const res = await call(deleteRoute, "/api/account/delete", { method: "POST", body: { confirm: "DELETE" }, cookie });
    expect(res.status).toBe(200);
    expect(cookieHeader(res, cookie)).not.toMatch(/oa\.session_token/);

    for (const table of [t.session, t.account, t.consentLog, t.progress, t.bookmark, t.entitlement, t.subscription]) {
      expect(await env.tdb.db.select().from(table).where(eq(table.userId, userId))).toEqual([]);
    }
    expect(await env.tdb.db.select().from(t.user).where(eq(t.user.id, userId))).toEqual([]);
    const audit = await env.tdb.db
      .select()
      .from(t.auditLog)
      .where(eq(t.auditLog.target, `user:${userId}`));
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain("@");
    // The old cookie is dead.
    expect((await call(exportRoute, "/api/account/export", { cookie })).status).toBe(401);
  });

  it("won't delete an account with a live subscription until billing can cancel it", async () => {
    const { deleteRoute } = await routes();
    const cookie = await testLoginAs("on_hold");
    const blocked = await call(deleteRoute, "/api/account/delete", {
      method: "POST",
      body: { confirm: "DELETE" },
      cookie,
    });
    expect(blocked.status).toBe(409);

    const cancelled: string[] = [];
    setSubscriptionCanceller(async (sub) => {
      cancelled.push(sub.providerSubscriptionId);
    });
    const ok = await call(deleteRoute, "/api/account/delete", { method: "POST", body: { confirm: "DELETE" }, cookie });
    expect(ok.status).toBe(200);
    expect(cancelled).toEqual(["sub_test_on_hold"]);
  });

  it("signs out everywhere", async () => {
    const { sessionsRoute, exportRoute } = await routes();
    const a = await testLoginAs("admin");
    const b = await testLoginAs("admin");
    const res = await call(sessionsRoute, "/api/account/sessions", { method: "DELETE", cookie: a });
    expect(res.status).toBe(200);
    expect(await env.tdb.db.select().from(t.session).where(eq(t.session.userId, env.ids.admin))).toEqual([]);
    expect((await call(exportRoute, "/api/account/export", { cookie: b })).status).toBe(401);
  });
});
