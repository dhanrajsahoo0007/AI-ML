import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDatabaseAvailable } from "@/server/db/testing";
import { call, setupAuthTestEnv, testLoginAs } from "@/features/auth/test-helpers";
import { contentKeySchema } from "./content-key";

describe("content keys", () => {
  it("accept section/slug paths only", () => {
    expect(contentKeySchema.safeParse("system-design/caching/cdn").success).toBe(true);
    for (const bad of ["", "/abs", "../x", "UPPER/case", "a b", "x".repeat(201)]) {
      expect(contentKeySchema.safeParse(bad).success).toBe(false);
    }
  });
});

const available = await testDatabaseAvailable();

describe.skipIf(!available)("progress API (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  let cookie: string;
  beforeAll(async () => {
    env = await setupAuthTestEnv();
    cookie = await testLoginAs("pro_monthly");
  });
  afterAll(async () => {
    await env?.teardown();
  });

  const api = async () => import("@/app/api/progress/route");
  const merge = async () => (await import("@/app/api/progress/merge/route")).POST;
  const list = async () => {
    const { GET } = await api();
    return (await (await call(GET, "/api/progress", { cookie })).json()) as {
      progress: { contentKey: string; completedAt: string | null }[];
      bookmarks: { contentKey: string }[];
    };
  };

  it("marks complete, bookmarks and undoes both", async () => {
    const { POST, DELETE } = await api();
    const key = "system-design/caching/cdn";
    expect(
      (await call(POST, "/api/progress", { method: "POST", body: { contentKey: key, kind: "complete" }, cookie }))
        .status
    ).toBe(200);
    expect(
      (await call(POST, "/api/progress", { method: "POST", body: { contentKey: key, kind: "bookmark" }, cookie }))
        .status
    ).toBe(200);
    let state = await list();
    expect(state.progress.find((p) => p.contentKey === key)?.completedAt).toBeTruthy();
    expect(state.bookmarks.map((b) => b.contentKey)).toContain(key);

    await call(DELETE, "/api/progress", { method: "DELETE", body: { contentKey: key, kind: "complete" }, cookie });
    await call(DELETE, "/api/progress", { method: "DELETE", body: { contentKey: key, kind: "bookmark" }, cookie });
    state = await list();
    expect(state.progress.find((p) => p.contentKey === key)?.completedAt).toBeNull();
    expect(state.bookmarks.map((b) => b.contentKey)).not.toContain(key);
  });

  it("rejects bad content keys and unknown kinds", async () => {
    const { POST } = await api();
    for (const body of [
      { contentKey: "../../etc", kind: "complete" },
      { contentKey: "a/b", kind: "delete-everything" },
      { contentKey: "a/b", kind: "complete", userId: env.ids.admin },
    ]) {
      expect((await call(POST, "/api/progress", { method: "POST", body, cookie })).status).toBe(400);
    }
  });

  it("merges signed-out progress, keeping the earliest completion and clamping future dates", async () => {
    const POST = await merge();
    const early = "2026-01-01T00:00:00.000Z";
    const res = await call(POST, "/api/progress/merge", {
      method: "POST",
      cookie,
      body: {
        items: [
          { contentKey: "cloud/aws/s3", completedAt: early, bookmarkedAt: early },
          { contentKey: "cloud/aws/ec2", completedAt: "2999-01-01T00:00:00.000Z" },
        ],
      },
    });
    expect(res.status).toBe(200);
    // Merging a later completion again doesn't move it forward.
    await call(POST, "/api/progress/merge", {
      method: "POST",
      cookie,
      body: { items: [{ contentKey: "cloud/aws/s3", completedAt: "2026-06-01T00:00:00.000Z" }] },
    });
    const state = await list();
    expect(state.progress.find((p) => p.contentKey === "cloud/aws/s3")?.completedAt).toBe(early);
    const future = state.progress.find((p) => p.contentKey === "cloud/aws/ec2")?.completedAt;
    expect(new Date(future!).getTime()).toBeLessThanOrEqual(Date.now());
    expect(state.bookmarks.map((b) => b.contentKey)).toContain("cloud/aws/s3");
  });

  it("needs a session", async () => {
    const { GET } = await api();
    expect((await call(GET, "/api/progress")).status).toBe(401);
  });
});
