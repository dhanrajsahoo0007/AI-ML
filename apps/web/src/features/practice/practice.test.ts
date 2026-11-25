import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { testDatabaseAvailable } from "@/server/db/testing";
import { call, setupAuthTestEnv, testLoginAs } from "@/features/auth/test-helpers";
import { isKnownQuestionId } from "./question-ids";
import { questionIdSchema, ratingItemSchema, storySchema } from "./schema";

// The story routes are behind a switch that is off outside `local` (content/features.yaml). Here it is on.
vi.mock("@/config/features", () => ({
  features: {},
  isFeatureOn: (flag: string) => flag === "practiceStories",
}));

const IDS = ["story-conflict-with-a-peer", "lp-ownership-outside-your-area"];
const withIds = (ids: string[] = IDS) => {
  process.env.PRACTICE_IDS = JSON.stringify(ids);
};

const story = (over: Record<string, unknown> = {}) => ({
  id: "s-abcdef123456",
  title: "Checkout latency",
  situation: "p99 was 900 ms.",
  action: "I profiled the read path.",
  result: "p99 fell to 120 ms.",
  learning: "Measure first.",
  covers: ["delivery", "lp-dive-deep"],
  updatedAt: "2026-11-10T10:00:00.000Z",
  ...over,
});

describe("question ids must name a question of the build", () => {
  afterEach(() => {
    delete process.env.PRACTICE_IDS;
    (process.env as Record<string, string>).NODE_ENV = "test";
  });

  it("accepts ids in the list and refuses everything else", () => {
    withIds();
    expect(isKnownQuestionId(IDS[0])).toBe(true);
    expect(questionIdSchema.safeParse("not-a-real-question").success).toBe(false);
  });

  it("fails closed in a production bundle without a list, and passes well-formed ids in dev and tests", () => {
    expect(isKnownQuestionId("anything-well-formed")).toBe(true);
    (process.env as Record<string, string>).NODE_ENV = "production";
    expect(isKnownQuestionId(IDS[0])).toBe(false);
  });

  it("accepts only lowercase ids with dashes", () => {
    for (const bad of ["", "UPPER", "a b", "../x", "a/b", "x".repeat(201)]) {
      expect(questionIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("practice bodies", () => {
  it("accepts a rating item and refuses bad ratings, counts, dates and extra fields", () => {
    const item = { questionId: IDS[0], rating: 4, times: 2, at: "2026-11-10T10:00:00.000Z" };
    expect(ratingItemSchema.safeParse(item).success).toBe(true);
    for (const bad of [
      { ...item, rating: 0 },
      { ...item, rating: 6 },
      { ...item, rating: 2.5 },
      { ...item, times: 0 },
      { ...item, at: "yesterday" },
      { ...item, userId: "someone-else" },
    ]) {
      expect(ratingItemSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("accepts a story and refuses text over the limits, bad ids, bad covers and extra fields", () => {
    expect(storySchema.safeParse(story()).success).toBe(true);
    for (const bad of [
      story({ id: "x" }),
      story({ title: "t".repeat(121) }),
      story({ action: "a".repeat(4001) }),
      story({ result: "r".repeat(1501) }),
      story({ covers: ["Not A Slug"] }),
      story({ covers: Array.from({ length: 41 }, (_, i) => `slug-${i}`) }),
      story({ updatedAt: "2026-11-10" }),
      story({ synced: true }),
      story({ userId: "someone-else" }),
    ]) {
      expect(storySchema.safeParse(bad).success).toBe(false);
    }
  });
});

const available = await testDatabaseAvailable();

describe.skipIf(!available)("practice API (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  let cookie: string;
  let other: string;
  beforeAll(async () => {
    env = await setupAuthTestEnv();
    cookie = await testLoginAs("pro_monthly");
    other = await testLoginAs("free");
    withIds();
  });
  afterAll(async () => {
    delete process.env.PRACTICE_IDS;
    await env?.teardown();
  });

  type Data = {
    ratings: Record<string, { rating: number; times: number; at: string }>;
    stories: { id: string; title: string; updatedAt: string }[] | null;
  };
  const get = async (as = cookie) => {
    const { GET } = await import("@/app/api/practice/route");
    return (await (await call(GET, "/api/practice", { cookie: as })).json()) as Data;
  };
  const post = async (path: "ratings" | "merge" | "stories", body: unknown, as = cookie) => {
    const mod = (await import(`@/app/api/practice/${path}/route`)) as { POST: Parameters<typeof call>[0] };
    return call(mod.POST, `/api/practice/${path}`, { method: "POST", body, cookie: as });
  };

  it("needs a session", async () => {
    const { GET } = await import("@/app/api/practice/route");
    expect((await call(GET, "/api/practice", {})).status).toBe(401);
    expect((await post("ratings", { questionId: IDS[0], rating: 3 }, "")).status).toBe(401);
  });

  it("records a rating and counts repeat practices", async () => {
    expect((await post("ratings", { questionId: IDS[0], rating: 2 })).status).toBe(200);
    expect((await post("ratings", { questionId: IDS[0], rating: 4 })).status).toBe(200);
    expect((await get()).ratings[IDS[0]]).toMatchObject({ rating: 4, times: 2 });
  });

  it("refuses unknown questions, bad ratings and someone else's user id", async () => {
    for (const body of [
      { questionId: "not-a-real-question", rating: 3 },
      { questionId: IDS[0], rating: 9 },
      { questionId: IDS[0], rating: 3, userId: env.ids.admin },
    ]) {
      expect((await post("ratings", body)).status).toBe(400);
    }
  });

  it("merges browser ratings: the later practice wins, the larger count is kept, future dates are clamped", async () => {
    const res = await post("merge", {
      ratings: [
        { questionId: IDS[0], rating: 1, times: 7, at: "2020-01-01T00:00:00.000Z" },
        { questionId: IDS[1], rating: 5, times: 3, at: "2999-01-01T00:00:00.000Z" },
      ],
    });
    expect(res.status).toBe(200);
    const { ratings } = await get();
    expect(ratings[IDS[0]]).toMatchObject({ rating: 4, times: 7 });
    expect(ratings[IDS[1]]).toMatchObject({ rating: 5, times: 3 });
    expect(new Date(ratings[IDS[1]].at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("saves, updates and deletes a story, and keeps the newer copy", async () => {
    expect((await post("stories", { story: story() })).status).toBe(200);
    expect(
      (await post("stories", { story: story({ title: "Newer", updatedAt: "2026-11-12T10:00:00.000Z" }) })).status
    ).toBe(200);
    // An older copy from another device does not replace it.
    expect(
      (await post("stories", { story: story({ title: "Older", updatedAt: "2026-11-01T10:00:00.000Z" }) })).status
    ).toBe(200);
    expect((await get()).stories?.map((s) => s.title)).toEqual(["Newer"]);

    const { DELETE } = await import("@/app/api/practice/stories/route");
    const gone = await call(DELETE, "/api/practice/stories", { method: "DELETE", body: { id: story().id }, cookie });
    expect(gone.status).toBe(200);
    expect((await get()).stories).toEqual([]);
  });

  it("keeps each user's data apart", async () => {
    await post("stories", { story: story({ id: "s-mine-0000001" }) });
    const theirs = await get(other);
    expect(theirs.stories).toEqual([]);
    expect(theirs.ratings).toEqual({});
  });

  it("refuses a story over the account's limit", async () => {
    for (let i = 0; i < 31; i++) {
      const res = await post("stories", { story: story({ id: `s-limit-${String(i).padStart(6, "0")}` }) }, other);
      expect(res.status).toBe(i < 30 ? 200 : 409);
    }
  });

  it("removes practice data with the account and includes it in the export", async () => {
    const { exportUserData } = await import("@/features/account");
    const data = await exportUserData(env.tdb.db, env.ids.pro_monthly);
    expect(data?.practice.ratings.map((r) => r.questionId).sort()).toEqual([...IDS].sort());
    expect(data?.practice.stories.map((s) => s.id)).toEqual(["s-mine-0000001"]);
  });
});
