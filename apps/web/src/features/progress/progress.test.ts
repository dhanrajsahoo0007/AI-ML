import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { testDatabaseAvailable } from "@/server/db/testing";
import { call, setupAuthTestEnv, testLoginAs } from "@/features/auth/test-helpers";
import { contentKeySchema, isKnownContentKey } from "./content-key";

// The page list a build inlines (next.config.ts SEARCH_INDEX); tests set their own.
const PAGES = ["system-design/caching/cdn", "cloud/aws/s3", "cloud/aws/ec2"];
const withPages = (keys: string[] = PAGES) => {
  process.env.SEARCH_INDEX = JSON.stringify(keys.map((k) => ({ t: k, h: `/${k}`, s: "x" })));
};

describe("content keys must name a page of the build (security review M7)", () => {
  afterEach(() => {
    delete process.env.SEARCH_INDEX;
    (process.env as Record<string, string>).NODE_ENV = "test";
  });

  it("accepts pages in the index and refuses everything else", () => {
    withPages();
    expect(isKnownContentKey("system-design/caching/cdn")).toBe(true);
    expect(contentKeySchema.safeParse("zzz/not-a-real-article-123").success).toBe(false);
    expect(contentKeySchema.safeParse("system-design/caching").success).toBe(false);
  });

  it("fails closed in a production bundle without an index, and passes well-formed keys in dev and tests", () => {
    expect(isKnownContentKey("anything/well-formed")).toBe(true);
    (process.env as Record<string, string>).NODE_ENV = "production";
    expect(isKnownContentKey("system-design/caching/cdn")).toBe(false);
  });
});

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
    withPages();
  });
  afterAll(async () => {
    delete process.env.SEARCH_INDEX;
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

  it("refuses keys of pages that don't exist with 400, in POST, DELETE and merge (M7)", async () => {
    const { POST, DELETE } = await api();
    const body = { contentKey: "zzz/not-a-real-article-123", kind: "complete" };
    expect((await call(POST, "/api/progress", { method: "POST", body, cookie })).status).toBe(400);
    expect((await call(DELETE, "/api/progress", { method: "DELETE", body, cookie })).status).toBe(400);
    const merged = await call(await merge(), "/api/progress/merge", {
      method: "POST",
      cookie,
      body: {
        items: [{ contentKey: "cloud/aws/s3" }, { contentKey: "zzz/junk-1", completedAt: "2026-01-01T00:00:00.000Z" }],
      },
    });
    expect(merged.status).toBe(400);
    // The island drops the refused items by index and sends the rest again.
    expect((await merged.json()).error.details).toEqual([expect.objectContaining({ path: "items.1.contentKey" })]);
    const state = await list();
    expect(state.progress.map((p) => p.contentKey)).not.toContain("zzz/not-a-real-article-123");
    expect(state.progress.map((p) => p.contentKey)).not.toContain("zzz/junk-1");
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
