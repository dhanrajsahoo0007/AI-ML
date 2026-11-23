import { describe, expect, it } from "vitest";
import {
  countIAndWe,
  emptyStory,
  gaps,
  mergeStories,
  newStoryId,
  parseStories,
  speakingSeconds,
  storyChecks,
  storyTiming,
  STORY_LIMITS,
  toStory,
  withStory,
  wordCount,
  type Story,
} from "./stories";

const NOW = new Date("2026-11-14T10:00:00.000Z");
const story = (over: Partial<Story> = {}): Story => ({ ...emptyStory("s-abcdef123456", NOW), ...over });
const words = (n: number, word = "word") => Array.from({ length: n }, () => word).join(" ");

describe("ids and parsing", () => {
  it("makes ids the parser accepts", () => {
    const id = newStoryId(() => 0.5);
    expect(id).toBe("s-iiiiiiiiiiii");
    expect(toStory({ ...story(), id })?.id).toBe(id);
  });

  it("drops entries that are not stories and repeats of an id", () => {
    const raw = JSON.stringify([
      story(),
      { id: "x" },
      null,
      story({ title: "again" }),
      { ...story(), id: "s-other-12345" },
    ]);
    expect(parseStories(raw).map((s) => s.id)).toEqual(["s-abcdef123456", "s-other-12345"]);
    expect(parseStories("not json")).toEqual([]);
    expect(parseStories(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseStories(null)).toEqual([]);
  });

  it("cuts text to the limits and keeps only well-formed covers", () => {
    const s = toStory({
      ...story(),
      title: "t".repeat(500),
      action: "a".repeat(9000),
      covers: ["conflict", "conflict", "Not A Slug", 4, "lp-ownership"],
      synced: "yes",
    })!;
    expect(s.title).toHaveLength(STORY_LIMITS.title);
    expect(s.action).toHaveLength(STORY_LIMITS.part.action);
    expect(s.covers).toEqual(["conflict", "lp-ownership"]);
    expect(s.synced).toBeUndefined();
  });

  it("refuses a bad date and caps the number of stories", () => {
    expect(toStory({ ...story(), updatedAt: "yesterday" })).toBeNull();
    const many = Array.from({ length: 40 }, (_, i) => story({ id: `s-story-${String(i).padStart(4, "0")}` }));
    expect(parseStories(JSON.stringify(many))).toHaveLength(STORY_LIMITS.stories);
  });

  it("adds a new story first and replaces one with the same id", () => {
    const a = story();
    const b = story({ id: "s-second-00001" });
    expect(withStory([a], b).map((s) => s.id)).toEqual([b.id, a.id]);
    expect(withStory([a, b], { ...a, title: "new" })[0].title).toBe("new");
  });
});

describe("timing", () => {
  it("counts words and speaking time", () => {
    expect(wordCount("  one  two\nthree ")).toBe(3);
    expect(wordCount("   ")).toBe(0);
    expect(speakingSeconds(140)).toBe(60);
  });

  it("gives each part its share and its target", () => {
    const t = storyTiming(story({ situation: words(30), action: words(120), result: words(30), learning: words(20) }));
    expect(t.words).toBe(200);
    expect(t.parts.map((p) => p.share)).toEqual([0.15, 0.6, 0.15, 0.1]);
    expect(t.parts.map((p) => p.target)).toEqual([0.15, 0.6, 0.15, 0.1]);
    expect(storyTiming(story()).parts.every((p) => p.share === 0)).toBe(true);
  });

  it("counts I and we", () => {
    expect(countIAndWe("I profiled it. We agreed, and I'm sure we're done. In India.")).toEqual({ i: 2, we: 2 });
  });
});

describe("storyChecks", () => {
  const good = story({
    situation: words(30),
    action: `${words(110)} I did this and I did that`,
    result: "Latency fell from 900 ms to 120 ms and " + words(20),
    learning: "Now I measure before I change anything " + words(12),
  });

  it("says nothing until there is enough text", () => {
    expect(storyChecks(story({ action: "I fixed it." }))).toEqual([]);
  });

  it("passes a balanced story", () => {
    expect(storyChecks(good).filter((c) => !c.ok)).toEqual([]);
  });

  it("flags a long setup, few actions, we over I, no number and no learning", () => {
    const weak = story({
      situation: words(150),
      action: "we rebuilt it and we shipped it " + words(30),
      result: "It went well for everyone involved in the end",
      learning: "",
    });
    const failed = storyChecks(weak)
      .filter((c) => !c.ok)
      .map((c) => c.id);
    expect(failed).toEqual(["action-share", "setup-share", "i-we", "result-number", "learning"]);
  });

  it("flags a story that runs long or short", () => {
    const long = storyChecks(story({ ...good, action: words(500, "I") })).find((c) => c.id === "length")!;
    expect(long.ok).toBe(false);
    expect(long.text).toMatch(/Cut it to two minutes/);
    const short = storyChecks(story({ action: words(60, "I") })).find((c) => c.id === "length")!;
    expect(short.text).toMatch(/Add detail/);
  });
});

describe("gaps and mergeStories", () => {
  it("lists what no story covers", () => {
    const stories = [story({ covers: ["conflict"] }), story({ covers: ["ownership", "conflict"] })];
    expect(gaps(stories, ["conflict", "feedback", "ownership", "failure"])).toEqual(["feedback", "failure"]);
  });

  it("keeps the newer copy, takes new remote stories, uploads unsynced ones and drops ones deleted elsewhere", () => {
    const older = "2026-11-10T00:00:00.000Z";
    const newer = "2026-11-12T00:00:00.000Z";
    const local = [
      story({ id: "s-local-newer1", title: "mine", updatedAt: newer, synced: true }),
      story({ id: "s-remote-newer", title: "mine", updatedAt: older, synced: true }),
      story({ id: "s-never-synced", title: "draft" }),
      story({ id: "s-deleted-else", title: "gone", synced: true }),
    ];
    const remote = [
      story({ id: "s-local-newer1", title: "theirs", updatedAt: older }),
      story({ id: "s-remote-newer", title: "theirs", updatedAt: newer }),
      story({ id: "s-only-remote1", title: "from phone" }),
    ];
    const { stories, upload } = mergeStories(local, remote);
    expect(stories.map((s) => [s.id, s.title])).toEqual([
      ["s-local-newer1", "mine"],
      ["s-remote-newer", "theirs"],
      ["s-never-synced", "draft"],
      ["s-only-remote1", "from phone"],
    ]);
    expect(upload.map((s) => s.id)).toEqual(["s-local-newer1", "s-never-synced"]);
    expect(stories.find((s) => s.id === "s-only-remote1")?.synced).toBe(true);
  });
});
